import { spawnSync } from 'node:child_process'

const ACCESS_TEST_ENDPOINT = 'https://formspree.io/f/layercost-e2e'

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// The page has two meaningful build states: with a public Formspree endpoint
// and without one. Running both builds keeps the success/error flow and the
// "form unavailable" state covered without a runtime test hook.
console.log('Build con endpoint Formspree di test...')
run('npm', ['run', 'build'], {
  ...process.env,
  VITE_ACCESS_REQUEST_ENDPOINT: ACCESS_TEST_ENDPOINT,
})

console.log('E2E con endpoint Formspree di test...')
run('npx', ['playwright', 'test'], {
  ...process.env,
  E2E_ACCESS: '1',
  E2E_FRESH: '1',
})

console.log('Build senza endpoint per lo stato "modulo non disponibile"...')
run('npm', ['run', 'build'], {
  ...process.env,
  VITE_ACCESS_REQUEST_ENDPOINT: '',
})

console.log('E2E dello stato "modulo non disponibile"...')
run('npx', ['playwright', 'test', 'tests/e2e/access-missing.spec.ts'], {
  ...process.env,
  E2E_ACCESS: '',
  E2E_FRESH: '1',
})
