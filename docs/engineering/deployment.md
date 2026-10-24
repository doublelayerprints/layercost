# Deployment

**Stato:** v1.0.0 — Vercel, build statica

---

## 1. Vercel

**Live:** https://layercost.vercel.app

Repo GitHub: **https://github.com/doublelayerprints/layercost** (privata).

1. Apri [vercel.com/new](https://vercel.com/new).
2. Importa `doublelayerprints/layercost`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Node: 22.x.
7. Nessuna variabile d'ambiente obbligatoria.
8. Deploy.

In alternativa, dal repository:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

Il deploy automatico su ogni push si ottiene collegando il repository GitHub al progetto Vercel.

Il routing è **hash-based**: non servono rewrite per le SPA. La build è statica e portabile.

## 2. Header

`vercel.json` imposta:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Robots-Tag: noindex`

Nessun CSP restrittivo in v1.0 per non bloccare gli asset Vite; da valutare in una fase successiva.

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

La checklist operativa e l'esito della v1.0.0 sono in `release.md`. In sintesi:

- [x] `npm run check` verde (typecheck, lint, 42 test, build, budget).
- [x] `npm run test:e2e` verde (18 test, Chromium + WebKit).
- [x] `CHANGELOG.md` aggiornato.
- [x] `TASKS.md` aggiornato.
- [x] Backup di prova esportato e reimportato.
- [x] Link condiviso provato in una finestra privata.
- [x] Stampa/PDF provata (Chromium e WebKit).
- [ ] Deploy Vercel verificato.
- [ ] Tag `v1.0.0` creato e pushato.

## 10. Rollback

- Vercel: “Promote to Production” su un deployment precedente.
- GitHub Pages: rieseguire il workflow su un commit precedente.
- Dati: importare il backup JSON scaricato prima della release.

## 11. Stato attuale

- Repository locale: `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`.
- Nome prodotto: **LayerCost**.
- Repo GitHub: `doublelayerprints/layercost` (privata, branch `main`).
- CI GitHub: verde (`check` + `e2e`) su `main`.
- Deploy Vercel: **live su https://layercost.vercel.app**.
- Release **v1.0.0** del 24/10/2026; deploy di produzione verificato con gate visivo 0 FAIL, 1 WARN (`ragged-row`, rail sticky), prezzo 3,70 €, bozza protetta, alert di salvataggio, tema scuro e stampa chiara.
- Progetto collegato alla repo; status check Vercel verde sull’ultimo commit.
- Le preview deployment sono protette da SSO Vercel; la produzione è pubblica.
- Header di sicurezza e `robots.txt` verificati.
- Deploy manuale disponibile con `npx vercel login && npx vercel link && npx vercel --prod`.

## 12. Baseline visive

Il workflow `.github/workflows/visual-baselines.yml` genera le baseline su Linux:

```bash
gh workflow run visual-baselines.yml --ref main
```

Scaricare l'artifact `visual-baselines`, scompattarlo in `tests/e2e/visual.spec.ts-snapshots/` e committare gli screenshot insieme alla modifica dell'interfaccia. Le baseline non vanno rigenerate per modifiche di solo contenuto o documentazione.
