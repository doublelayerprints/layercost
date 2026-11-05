# EVO-9 — Indicizzazione inglese della landing (`/en`)

**Stato:** pianificato il 05/11/2026 · ADR-0035

---

## 1. Contesto

La landing pubblica è pre-renderizzata a build time dal plugin `landingPrerender()` in
`vite.config.ts`, che inietta `src/features/landing/landing-static.html` (completo, in
italiano) dentro `#root` di `dist/index.html`. Google indicizza solo l'italiano: la
versione inglese esiste nell'app (T5.6) ma è client-side. La pagina `?lang=en` darebbe
beneficio SEO ≈ zero (Google consolida i query param sull'URL canonico).

## 2. Obiettivo

Pubblicare la landing inglese pre-renderizzata su `https://layercost.vercel.app/en/`,
indicizzabile e dichiarata a Google con `hreflang`, senza cambiare nulla dei contenuti
della landing né dell'infrastruttura SEO esistente.

## 3. Perimetro

**In scope**

- `dist/en/index.html` pre-renderizzato: landing inglese completa, `lang="en"`,
  canonical `/en/`, `hreflang` a tre vie (it/en/x-default), OG/Twitter/JSON-LD in inglese.
- Boot dell'app in inglese quando l'URL è `/en/` (niente flash italiano).
- Screenshot landing in inglese (`public/landing/en/*.jpg`) e `og-image-en.jpg`.
- `sitemap.xml` con entrambe le URL e gli alternate `xhtml:link`.
- Voci budget: HTML inglese a 10 KB (ADR-0035).
- E2E smoke su `/en/` (meta, boot inglese, CTA) + test unitari.

**Out of scope**

- Copy della landing non cambia (le chiavi i18n EN esistono già dal T5.6).
- `?lang=en` non viene implementata (beneficio ≈ zero, ADR-0035).
- Nessuna nuova dipendenza; nessun cambio di routing dell'app.

## 4. Decisioni (ADR-0035)

1. **Pagina separata `/en/`**, non query param: URL dedicato indicizzabile, `hreflang`
   bidirezionale, `x-default` = root italiana.
2. **L'URL vince sulla preferenza salvata**: `initialLocale(pathname, stored)` — chi apre
   `/en/` chiede la pagina inglese; la preferenza salvata continua a valere sul resto
   del sito. Nessun cambio di rotte.
3. **Un solo sorgente per la testa EN**: tutto in un modulo TS puro
   (`src/features/landing/en-page.ts`) con test unitari; il plugin `closeBundle` di
   Vite compila i suoi import con esbuild a qualsiasi versione di Node, quindi la
   generazione avviene **dentro `npm run build`** senza script post-build né dipendenze.
4. **Golden statico EN committato** (`landing-static-en.html`), come per l'italiano:
   un artifact, un test che lo tiene aggiornato (`toMatchFileSnapshot`).
5. **Screenshot in inglese**: l'hero EN mostra il prodotto in inglese, non italiane;
   il capture script diventa bilingue (pref salvato `layercost:locale=en`) e genera
   `landing/en/` + `og-image-en.jpg`. L'og-image italiana resta alla pagina IT.

## 5. Task

| Task | Cosa | Accettazione |
|---|---|---|
| T9.1 | `renderStaticLanding(locale, assetBase)`; golden EN | snapshot EN; golden IT byte-identico |
| T9.2 | `buildEnglishIndexHtml()` + test | lang/canonical/hreflang/og/JSON-LD corretti; fallisce se la testa cambia inattesa |
| T9.3 | plugin Vite → `dist/en/index.html`; hreflang nel template | `npm run build` produce entrambe le pagine |
| T9.4 | `initialLocale` in `src/data/locale.ts` | boot `/en/` = inglese; test unitari |
| T9.5 | capture bilingue | `landing/en/*.jpg` + `og-image-en.jpg` prodotti |
| T9.6 | budget HTML EN | voce `HTML EN` 10 KB + blocco se manca la pagina |
| T9.7 | sitemap + robots | alternate `xhtml:link`; robots invariato |
| T9.8 | E2E `/en/` | meta EN, boot inglese, CTA → calcolatore |
| T9.9 | `npm run check` + docs + PR | verde; preview Vercel verificata |

## 6. Esiti

### §6.1 T9.1–T9.2 — 05/11/2026

- Golden EN generato (`landing-static-en.html`, 27,8 KB raw); golden italiano è
  risultato **byte-identico** dopo la generalizzazione (nessun churn).
- `buildEnglishIndexHtml`: 12 riscritture exact-replace (lang, canonical, title ×3,
  description ×3, JSON-LD url/description/inLanguage, og:url, og-image ×2, alt,
  og:locale e alternate); ogni mancanza fallisce con messaggio esplicito.
- Test: fixture sintetica con 20+ asserzioni, test di drift, test di sync della copia
  EN con `translate('en', …)`, test anti-ibrido sui due golden.

### §6.2 T9.3 — 05/11/2026

- `dist/en/index.html` generato nel `closeBundle` del plugin `landingPages` (verificato:
  lang/canonical/hreflang/title/og/locale/json-ld corretti, hero EN con
  `../landing/en/calculator.jpg`, pagina IT invariata).
- `hreflang` a tre vie nel template committato, quindi presente su entrambe le pagine.

### §6.3 T9.4–T9.5 — 05/11/2026

- `initialLocale` implementato e testato (path `/en/` e `/en`, falsi prefissi,
  preferenza salvata altrove).
- `public/landing/en/` (4 JPEG con UI inglese e nome preventivo «Layered keychain») +
  `public/og-image-en.jpg`; gli artifact IT non sono ritoccati (revert dei re-encode).

### §6.4 T9.6–T9.9 — 05/11/2026

- Budget: `HTML EN ok 5,9 KB / 10 KB`; se la build non produce la pagina il controllo
  fallisce con riga dedicata.
- Sitemap con `/en/` (priority 0.8) e alternate `xhtml:link`; robots invariato.
- Verifiche: 317 unitari (+10), `test:e2e` 70 passati (+2 su `/en/`), `npm run check`
  verde. Nota poi risolta con EVO-10 (ADR-0036, stesso giorno): i seed ora nascono
  nella lingua della sessione.
- **Merge e produzione (05/11/2026):** PR #66 mergiata (squash `4db1acd`, build
  `index-DQLqfdfo.js`) con CI verde; produzione verificata: `/en/` 200 con
  `lang="en"`, canonical `/en/`, hreflang a tre vie, JSON-LD `inLanguage: "en"`,
  hero inglese, `/en` senza slash 200, sitemap live con entrambe le URL,
  `og-image-en.jpg` e `landing/en/*.jpg` 200, root italiana invariata.
