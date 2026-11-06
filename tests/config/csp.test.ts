import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Vercel serves `vercel.json` headers verbatim, so a stale hash in the CSP would
 * silently block the inline JSON-LD and take the structured data (and the
 * console) down in production without failing the build. This test keeps the
 * policy and `index.html` in sync.
 */

const html = readFileSync('index.html', 'utf8')
const policy = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

function header(name: string): string | undefined {
  for (const rule of policy.headers) {
    const match = rule.headers.find((entry) => entry.key === name)
    if (match) return match.value
  }
  return undefined
}

function inlineScriptHashes(source: string): string[] {
  const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  return scripts.map(
    (match) =>
      `sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}`,
  )
}

describe('Content-Security-Policy', () => {
  it('autorizza ogni script inline di index.html', () => {
    const csp = header('Content-Security-Policy')
    expect(csp).toBeDefined()
    const hashes = inlineScriptHashes(html)
    expect(hashes.length).toBeGreaterThan(0)
    for (const hash of hashes) {
      expect(csp).toContain(`'${hash}'`)
    }
  })

  it('blocca il framing e le risorse non previste', () => {
    const csp = header('Content-Security-Policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).not.toContain("unsafe-eval")
    // `unsafe-inline` is only acceptable for styles: the app sets inline styles
    // from the theme tokens and React writes style attributes.
    const scriptSrc = csp.split(';').find((part) => part.trim().startsWith('script-src')) ?? ''
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it('consente soltanto le origini di rete usate dall’app', () => {
    const csp = header('Content-Security-Policy') ?? ''
    const connect = csp.split(';').find((part) => part.trim().startsWith('connect-src')) ?? ''
    expect(connect).toContain('https://*.supabase.co')
    expect(connect).toContain('https://formspree.io')
    // Only the project wildcard is allowed: no bare `*` and no `https:` that
    // would let the bundle talk to any host.
    const sources = connect.replace('connect-src', '').trim().split(/\s+/)
    expect(sources).not.toContain('*')
    expect(sources).not.toContain('https:')
    for (const source of sources) {
      expect(source === "'self'" || /^https:\/\/[\w.*-]+$/.test(source) || /^wss:\/\/[\w.*-]+$/.test(source)).toBe(
        true,
      )
    }
  })

  it('imposta anche X-Frame-Options per i browser senza frame-ancestors', () => {
    expect(header('X-Frame-Options')).toBe('DENY')
  })
})