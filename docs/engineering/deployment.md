# Deployment

**Stato:** v0.1 — Vercel, build statica

---

## 1. Vercel

1. Crea un repository GitHub con il progetto.
2. Importalo in Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Node: 22.x.
7. Nessuna variabile d'ambiente obbligatoria.

Il routing è **hash-based**: non servono rewrite per le SPA. La build è statica e portabile.

## 2. Header

`vercel.json` imposta:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Robots-Tag: noindex`

Nessun CSP restrittivo in v0.1 per non bloccare gli asset Vite; da valutare in una fase successiva.

## 3. Base path

Vite usa `VITE_BASE` (default `/`).

- Vercel: `/`.
- GitHub Pages con sottocartella: `/nome-repo/`.
- Hash routing: nessun rewrite.

## 4. Preview

Ogni pull request può avere una preview Vercel. Per i task UI, verificare:

- layout desktop 1440 px;
- mobile 375 px;
- percorso da tastiera;
- link condiviso;
- stampa/PDF.

## 5. GitHub Pages (alternativa)

1. Imposta `VITE_BASE=/nome-repo/`.
2. Build con `npm run build`.
3. Pubblica `dist` con `actions/deploy-pages`.
4. Hash routing: nessun 404.

## 6. Netlify / Cloudflare Pages (alternative)

- Build: `npm run build`.
- Output: `dist`.
- Nessun rewrite.
- Netlify e Cloudflare hanno piani gratuiti più permissivi di Vercel Hobby per uso commerciale.

## 7. Nota sui piani gratuiti

Vercel Hobby è pensato per uso personale. Se LayerCost diventa parte di un'attività commerciale, valutare Cloudflare Pages, Netlify o un piano adeguato. Il build non cambia.

## 8. CI

`.github/workflows/ci.yml` esegue typecheck, lint, test, build ed E2E su push e pull request.

## 9. Release checklist

- [ ] `npm run check` verde.
- [ ] `npm run test:e2e` verde.
- [ ] `CHANGELOG.md` aggiornato.
- [ ] `TASKS.md` aggiornato.
- [ ] Backup di prova esportato e reimportato.
- [ ] Link condiviso provato in una finestra privata.
- [ ] Stampa/PDF provata.
- [ ] Deploy Vercel verificato.
- [ ] Tag `vX.Y.Z` (quando si inizia a versionare le release).

## 10. Rollback

- Vercel: “Promote to Production” su un deployment precedente.
- GitHub Pages: rieseguire il workflow su un commit precedente.
- Dati: importare il backup JSON scaricato prima della release.

## 11. Stato attuale

- Repository locale: `3dCosts` (nome directory).
- Nome prodotto: **LayerCost**.
- Repo suggerito: `layercost`.
- Nessun deploy Vercel è stato ancora creato da questo ambiente.
