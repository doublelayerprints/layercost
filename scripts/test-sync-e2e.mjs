import { spawnSync } from 'node:child_process'

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function readEnv(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
  const values = {}
  for (const line of result.stdout.split('\n')) {
    const separator = line.indexOf('=')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    if (!/^[A-Z0-9_]+$/.test(key)) continue
    values[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
  }
  return values
}

const local = readEnv('npx', ['supabase', 'status', '-o', 'env'])
const url = local.API_URL
const publishableKey = local.PUBLISHABLE_KEY ?? local.ANON_KEY
const serviceRoleKey = local.SERVICE_ROLE_KEY
const dbUrl = local.DB_URL

if (!url || !publishableKey || !serviceRoleKey || !dbUrl) {
  console.error('Supabase locale non configurato: avvia `npm run db:start`.')
  process.exit(1)
}

// The sync E2E creates a throwaway workspace with the seed IDs. Resetting the
// local database first prevents collisions between runs; it never touches a
// remote project.
console.log('Reset del database locale...')
run('npx', ['supabase', 'db', 'reset'])

console.log('Build con Supabase locale...')
run('npm', ['run', 'build'], {
  ...process.env,
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
})

console.log('E2E sync con Supabase locale...')
run('npx', ['playwright', 'test', 'tests/e2e/sync.spec.ts', '--project=chromium'], {
  ...process.env,
  E2E_SYNC: '1',
  SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_DB_URL: dbUrl,
})
