/**
 * @jest-environment node
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const HOOK = join(__dirname, 'block-long-running-bash.mjs')

/** Runs the hook the way Claude Code does: the PreToolUse payload on stdin, the verdict as exit code. */
function run(command: unknown) {
  const result = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  })
  return { status: result.status, stderr: result.stderr }
}

describe('block-long-running-bash hook', () => {
  it.each([
    'npm run dev',
    'cd app && npm run dev',
    'npx next dev',
    'docker compose up',
    'docker-compose up postgres',
    'docker compose logs -f app',
    'docker exec -it app_postgres psql',
  ])('blocks %s', (command) => {
    const { status, stderr } = run(command)

    expect(status).toBe(2)
    expect(stderr).toContain('[block-long-running-bash]')
  })

  it.each([
    'npm run test',
    'npx tsc --noEmit',
    'npm run lint',
    'npm run build',
    'docker compose up --wait',
    'docker compose up -d --wait',
    'docker compose ps',
    'git status',
  ])('lets %s through', (command) => {
    expect(run(command).status).toBe(0)
  })

  it('does not enforce anything on a malformed or empty payload', () => {
    expect(run('').status).toBe(0)
    expect(run(undefined).status).toBe(0)
    const malformed = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' })
    expect(malformed.status).toBe(0)
  })
})
