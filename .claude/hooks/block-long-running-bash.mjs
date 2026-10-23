#!/usr/bin/env node
// PreToolUse hook (Bash) — actively BLOCKS commands that don't terminate on their own
// when run by the agent, instead of relying only on the textual convention in the
// root CLAUDE.md ("Claude Code can't run this app... don't start the dev server").
//
// WHY THIS EXISTS
// The agent's Bash tool has a timeout and will eventually kill a hung call, but the
// kill signal isn't guaranteed to propagate cleanly through a multi-process chain
// (shell -> npm -> next dev). A SIGKILL from that timeout can leave `next dev` and the
// workers it spawns running/orphaned — occupying port 3000 and destabilizing the
// Docker Desktop/WSL2 VM for later sessions. Denying these commands before they ever
// start removes that failure mode entirely.
//
// Reads the PreToolUse JSON payload from stdin, inspects `tool_input.command`, and
// exits 2 (block, stderr shown to the agent) if it matches a known long-running /
// interactive shape. Exits 0 (allow) for everything else, including
// `npm run dev:next` alone and read-only docker inspection commands.

import { readFileSync } from 'node:fs'

let payload
try {
  payload = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  // Malformed input isn't this hook's problem to enforce — let it through.
  process.exit(0)
}

const command = payload?.tool_input?.command
if (typeof command !== 'string' || command.trim() === '') {
  process.exit(0)
}

/** @type {Array<{ test: (cmd: string) => boolean, reason: string }>} */
const rules = [
  {
    test: (cmd) => /\bnpm\s+run\s+dev\b(?!:)/.test(cmd),
    reason:
      'npm run dev starts the dev server in the foreground and never returns on its own. ' +
      'Per CLAUDE.md, the agent cannot run this app — use `npm run test`, `npx tsc --noEmit`, ' +
      'and `npm run lint` to verify instead, and ask the human to check it in their own environment.',
  },
  {
    test: (cmd) => /\bnext\s+dev\b/.test(cmd),
    reason:
      'next dev is a foreground dev server and never returns on its own. The agent cannot run this app.',
  },
  {
    test: (cmd) =>
      /\bdocker(?:\s+compose|-compose)\b[^&|;\n]*\bup\b/.test(cmd) && !/--wait\b/.test(cmd),
    reason:
      'docker compose up without --wait streams container logs in the foreground and never ' +
      'returns. Add --wait, or use `docker compose up -d`.',
  },
  {
    test: (cmd) =>
      /\bdocker(?:\s+compose|-compose)\b[^&|;\n]*\blogs\b[^&|;\n]*(-f\b|--follow\b)/.test(cmd),
    reason: 'docker compose logs -f/--follow tails forever and never returns on its own.',
  },
  {
    test: (cmd) =>
      /\bdocker\s+exec\b[^&|;\n]*(-it\b|-ti\b|-i\b|-t\b|--interactive\b|--tty\b)/.test(cmd),
    reason:
      'docker exec with an interactive/tty flag waits on a terminal the agent does not have and never returns.',
  },
]

const hit = rules.find((rule) => rule.test(command))
if (hit) {
  console.error(`[block-long-running-bash] blocked: ${hit.reason}`)
  process.exit(2)
}

process.exit(0)
