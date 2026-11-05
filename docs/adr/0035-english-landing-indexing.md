# ADR-0035 — Landing pubblica in inglese su `/en`, non via `?lang=en`

**Data:** 05/11/2026 · **Stato:** accettato · **Collegati:** ADR-0029 (landing + pre-render)

---

## 1. Contesto

L'app è bilingue (T5.6): ogni chiave i18n ha la versione inglese, anche tutta la
landing. Il pre-render (ADR-0029) però produce un solo file — `dist/index.html`
italiano. Google, anche eseguendo il JavaScript, vede una SPA che parte dall'URL
canonico `/`: non esiste una pagina inglese indicizzabile.

Il formato `layercost.vercel.app/?lang=en` non risolve il problema: Google consolida i
query param sull'URL canonico (la root) e il beneficio di indicizzazione è in pratica
zero.

## 2. Decisione

1. **Pagina separata `/en/`** (`en/index.html`), pre-renderizzata alla build con lo
   stesso meccanismo dell'italiano. Google la indicizza, entra nel sitemap con gli
   alternate, ed è servita dal filesystem di Vercel prima delle rewrite: zero runtime
   aggiuntivo.
2. **`hreflang` a tre vie su entrambe le pagine** (`it` → `/`, `en` → `/en/`,
   `x-default` → `/`) + alternate nel sitemap (`xmlns:xhtml`). Il canonical IT resta
   `/`; il canonical EN è `/en/`.
3. **L'URL vince sulla preferenza salvata.** Chi apre `/en/` riceve la sessione in
   inglese; la preferenza `layercost:locale` continua a valere altrove. Regola
   deterministica, testata in `initialLocale(pathname, stored)`.
4. **Zero nuove dipendenze e nessuno script post-build**: la pagina EN viene generata
   nel `closeBundle` del plugin esistente, con la mappa della testa (lang, canonical,
   hreflang, OG, Twitter, JSON-LD) in un modulo TS puro con test unitari. Vite compila
   la config e i suoi import con esbuild, quindi la stessa build vale per locale, CI e
   Vercel a qualsiasi versione di Node.
5. **Screenshot in inglese.** L'hero EN usa `landing/en/*.jpg` (prodotto in inglese) e
   la pagina EN usa `og-image-en.jpg`; la pagina IT mantiene gli artifact esistenti.

## 3. Conseguenze

- **Positivi:** esiste almeno una pagina anglofona indicizzabile; `hreflang`
  bidirezionale; nessun flash italiano su `/en/`; il capture script genera le
  schermate con la UI inglese.
- **Attenzione:** la testa EN è derivata dal template: `buildEnglishIndexHtml` fallisce
  se una stringa attesa manca (il drift del template smette di passare in silenzio).
- **Costi:** +1 file HTML nel dist (budget proprio 10 KB gzip, ADR-0035) e 5 JPEG
  in più, serviti solo a chi visita `/en/`; il capture script genera due lingue.
- **Non preso ora:** `/en` senza slash (Vercel reindirizza alla directory con slash),
  sottopercorsi `VITE_BASE` per la pagina EN, refresh della cache social delle
  og-image (il capture resta una procedura manuale).

## 4. Riferimenti

- `docs/planning/evo-9-landing-en.md` — piano operativo.
- `docs/adr/0029-public-landing-page.md` — pre-render, canonical e budget precedenti.
