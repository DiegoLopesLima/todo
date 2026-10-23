#!/usr/bin/env node
// Restore the Linux native binaries this repo's tooling needs when running inside
// the dev container.
//
// WHY THIS EXISTS
// The Windows host and the Linux dev container SHARE one bind-mounted
// `node_modules` (WSL2). Native packages (SWC, esbuild, the oxc/unrs resolvers,
// lightningcss, @parcel/watcher, biome, sharp, …) ship their compiled binary as a
// per-platform optional package (`*-win32-x64-msvc`, `*-linux-x64-gnu`, …). npm
// only installs the ONE matching the current OS, so when the user runs `npm i` on
// Windows, `node_modules` ends up with *win32* binaries only — and the container
// then fails to load them. Symptoms (all the same root cause):
//   • Jest: "Failed to parse the TypeScript config file jest.config.ts" →
//     "@parcel/watcher-linux-x64-glibc not found" / "Failed to load native binding"
//     (@swc/core), then even "jest.setup.ts not found" (the native resolver can't
//     resolve — @unrs/resolver binding is missing).
//   • `next dev`/`next build`: "Failed to load next.config.ts" → nested-route 404s.
//   • `biome`: MODULE_NOT_FOUND for @biomejs/cli-linux-x64.
//
// We CANNOT fix this with `npm install` in the container: a container install
// prunes the host's win32 binaries and writes Linux symlinks into `.bin` that later
// crash the host's `npm i`/`next dev`. So instead we fetch ONLY the missing Linux
// binary packages with `npm pack` (no dependency tree, no `.bin`, no pruning) and
// extract them into `node_modules`. The win32 dirs stay untouched, so the host
// keeps working; the napi loader just picks the matching binary per platform.
//
// Idempotent and safe to re-run. Recurs whenever the host regenerates
// `node_modules`, so just run `npm run fix:native` again in the container.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const NM = join(ROOT, 'node_modules')

if (process.platform !== 'linux') {
  console.log(
    `[restore-native-linux] platform is ${process.platform}, nothing to do (host keeps its own binaries).`
  )
  process.exit(0)
}

/** Turn an installed win32 native package dir name into its linux-x64 counterpart. */
function toLinuxName(win32Name) {
  // @parcel/watcher uses a `-glibc` (not `-gnu`) suffix on Linux.
  if (win32Name === '@parcel/watcher-win32-x64') return '@parcel/watcher-linux-x64-glibc'
  let name = win32Name.replace('win32', 'linux')
  // napi packages use `-msvc` on Windows and `-gnu` (glibc) on Linux.
  if (name.endsWith('-msvc')) name = name.replace(/-msvc$/, '-gnu')
  return name
}

/** Read `version` (and optionally deps) from an installed package's package.json. */
function readPkg(name) {
  const p = join(NM, name, 'package.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

/** List installed native binding dirs that are win32-only (top-level, incl. scopes). */
function findWin32Packages() {
  const found = []
  for (const entry of readdirSync(NM, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('@')) {
      const scope = entry.name
      for (const sub of readdirSync(join(NM, scope), { withFileTypes: true })) {
        if (sub.isDirectory() && sub.name.includes('win32')) found.push(`${scope}/${sub.name}`)
      }
    } else if (entry.name.includes('win32')) {
      found.push(entry.name)
    }
  }
  return found
}

const TMP = mkdtempSync(join(tmpdir(), 'native-linux-'))
let restored = 0
let skipped = 0
const failed = []

/** `npm pack name@version` into TMP and extract it into node_modules/<name>. */
function restore(name, version) {
  const dest = join(NM, name)
  // Already extracted (a host-pruned container simply won't have this dir)? Skip.
  if (existsSync(join(dest, 'package.json'))) {
    skipped++
    return true
  }
  const spec = `${name}@${version}`
  // `timeout` matters here: these are synchronous calls on the agent's dev-container
  // path (pretest / git push), so a single registry hiccup (DNS, firewall rules
  // re-arming, latency) would otherwise hang this process — and whatever invoked it
  // (npm, an agent's shell) — forever, with zero output (`stdio: 'ignore'`). Bounding
  // it turns a silent indefinite hang into a fast, clear failure added to `failed`.
  try {
    execFileSync('npm', ['pack', spec, '--pack-destination', TMP], {
      stdio: 'ignore',
      timeout: 30_000,
    })
  } catch {
    failed.push(spec)
    return false
  }
  // npm pack names the tarball `<name-without-@, / -> ->>-version.tgz`.
  const tgzBase = `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`
  const tgz = join(TMP, tgzBase)
  if (!existsSync(tgz)) {
    failed.push(spec)
    return false
  }
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  try {
    execFileSync('tar', ['-xzf', tgz, '-C', dest, '--strip-components=1'], {
      stdio: 'ignore',
      timeout: 30_000,
    })
  } catch {
    failed.push(spec)
    return false
  }
  console.log(`  restored ${spec}`)
  restored++
  return true
}

console.log('[restore-native-linux] restoring Linux native binaries…')
for (const win32 of findWin32Packages()) {
  const pkg = readPkg(win32)
  if (!pkg?.version) continue
  const linuxName = toLinuxName(win32)
  const ok = restore(linuxName, pkg.version)
  // Some platform packages pull a sibling binary (e.g. @img/sharp-linux-x64 →
  // @img/sharp-libvips-linux-x64), declared as a (usually optional) dependency.
  if (ok) {
    const linuxPkg = readPkg(linuxName)
    const deps = { ...(linuxPkg?.dependencies ?? {}), ...(linuxPkg?.optionalDependencies ?? {}) }
    for (const [dep, range] of Object.entries(deps)) {
      if (dep.includes('linux')) restore(dep, String(range).replace(/^[^\d]*/, ''))
    }
  }
}

rmSync(TMP, { recursive: true, force: true })
console.log(`[restore-native-linux] done — ${restored} restored, ${skipped} already present.`)
if (failed.length) {
  console.warn(
    `[restore-native-linux] could not fetch: ${failed.join(', ')} (check network/registry).`
  )
}
