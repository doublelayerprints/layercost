# EVO-5 — Landing page pubblica

**Stato:** Implementata e verificata in locale il 29 ottobre 2026; deploy di produzione da fare
**Data:** 29 ottobre 2026
**ADR:** `docs/adr/0029-public-landing-page.md`
**Riferimenti:** `docs/planning/evolutive.md`, `docs/engineering/deployment.md`, `docs/engineering/testing.md`, `docs/planning/i18n-inventory.md`, `docs/design/design-system.md`

---

## 1. Obiettivo

Aprire LayerCost a chi non lo conosce con una pagina pubblica completa, in italiano e inglese, che spieghi cosa fa, come funziona e perché è local-first, senza creare dati locali e senza caricare la shell dell’app. La landing deve essere indicizzabile e deve continuare a mandare gli utenti esistenti al calcolatore.

### Non-obiettivi

- Backend, account o analytics nuovi.
- Modifiche a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.
- Una seconda indicizzazione inglese (`/en` o `?lang=en`): decisione futura.
- Video di prodotto o nuove dipendenze runtime.
- Deploy automatico: questa implementazione è verificata in locale.

---

## 2. Routing

| Route | Contenuto | Regola |
| --- | --- | --- |
| `/#/` | Landing pubblica | Visitatore nuovo: landing. Dati locali, `layercost:hasVisited` o sessione autenticata: redirect a `/#/calculator`. |
| `/#/calculator` | Calcolatore e resto dell’app | Ingresso dell’app; scrive il marker di visita. |
| `/#/welcome` | Landing forzata | Ignora il redirect, anche per utenti esistenti e autenticati. |

- `PublicLayout` (header, main, footer) sta fuori da `HydrationGate`, `SyncController`, `FirstLoginDialog` e `SyncConflictDialog`.
- `AppShell` monta idratazione, sync, dialoghi e `Layout` solo per le route dell’app.
- La landing non chiama `hydrate()` e non crea `layercost:data`; il marker `layercost:hasVisited` è separato e non entra nei backup.
- La sidebar dell’app ha la voce **Panoramica** verso `/#/welcome`.
- Tutti i link interni al calcolatore passano a `/#/calculator`: login, callback OAuth, condivisione, 404, richiesta accesso, smoke ed E2E.

---

## 3. Contenuti

La landing è in `src/features/landing/`, con testi in `src/i18n/it/landing.ts` e `src/i18n/en/landing.ts`.

1. **Header pubblico** con logo, Funzionalità, Come funziona, Privacy, FAQ e CTA “Apri il calcolatore”. Su mobile il menu contiene i link e la CTA.
2. **Hero** con headline “Il costo vero delle stampe 3D.”, sottotitolo, CTA “Apri il calcolatore” e “Richiedi accesso”, nota “Nessun account richiesto” e screenshot reale del calcolatore.
3. **Sei funzionalità** in una tabella di confronto con un foglio di calcolo: motore di costo, multi-materiale, preventivi, import `.3mf`, export `.xlsx`/PDF, confronto stampanti. Ogni risposta è in parole, non un simbolo.
4. **Dal calcolo al cliente**: preventivo reale con prezzi congelati, righe e composizione del costo.
5. **Come funziona** in tre passi: scegli, inserisci, leggi. Include l’esempio dal vivo “Prova con i tuoi numeri” con grammi e ore, costo pieno, prezzo netto e barra costo/guadagno, calcolati dal motore reale sui valori di partenza.
6. **Privacy/local-first**: nessun account obbligatorio, dati in `localStorage`, backup JSON, nessun analytics; cloud opzionale.
7. **Cloud**: richiesta gratuita, approvazione manuale, Google o email, workspace condiviso, note su piano Free e regione EU.
8. **FAQ** native in cinque domande: account, costo, dati, più dispositivi, richiesta di accesso.
9. **CTA finale** e **footer** con login, richiesta accesso, versione motore, nota privacy, lingua e tema.

Immagini: quattro screenshot reali in `public/landing/` (calcolatore, dettaglio, condivisione, import `.3mf`) e `public/og-image.jpg` 1200×630. Si rigenerano con `npm run capture:landing` (server di sviluppo temporaneo, JPEG quality 88).

---

## 4. SEO e pre-render

- `index.html`: title e description italiani, canonical root, Open Graph, Twitter `summary_large_image`, `og:image` 1200×630, `robots: index,follow,max-image-preview:large`, JSON-LD `SoftwareApplication`.
- Plugin Vite `landingPrerender` in `vite.config.ts`: in build legge `src/features/landing/landing-static.html` e lo inietta in `#root`.
- `landing-static.html` è lo snapshot del renderer `static-render.ts`, confrontato da `static-render.test.ts` con `toMatchFileSnapshot`. Per aggiornarlo:
  ```bash
  npx vitest run src/features/landing/static-render.test.ts -u
  ```
- `public/robots.txt`: `Allow: /` e sitemap.
- `public/sitemap.xml`: root.
- `vercel.json`: rimosso `X-Robots-Tag: noindex`; restano gli header di sicurezza.
- L’HTML iniziale contiene solo landing e asset: nessun dato privato, preventivo, configurazione o sessione.
- L’inglese è disponibile via interfaccia; l’indicizzazione inglese separata è rimandata.

---

## 5. Design e accessibilità

- Design system **Strato**: token, Archivo, Source Serif 4, card, pill, focus. La landing aggiunge solo la scala display (`.landing-display`, `.landing-h2`, `.landing-wordmark`) e il layout pubblico; i componenti dell’app restano invariati.
- `PublicLayout` senza sidebar; header sticky senza chrome; footer con wordmark, colonne e preferenze.
- Tema chiaro/scuro, `prefers-reduced-motion`, focus visibile, target 44 px su mobile, tabelle responsive, FAQ `<details name>`, contrasti AA.
- Movimento progressivo: reveal all’ingresso, drift della hero, hover/focus, FAQ, demo dal vivo. Il contenuto resta visibile senza JavaScript e con movimento ridotto.
- Verifica: 375/768/1440 px, axe WCAG 2.2 AA in IT/EN e chiaro/scuro, `inspect.mjs` 0 FAIL (solo il WARN `no-footage`, motivato: il prodotto è software e l’esempio è interattivo).

---

## 6. Test e budget

### Unit

- `src/features/landing/routing.test.ts` — 4 test sulla decisione landing/calcolatore e `/#/welcome`.
- `src/features/landing/preview.test.ts` — 3 test su costo/prezzo, monotonia e input non validi.
- `src/features/landing/static-render.test.ts` — allineamento dello snapshot statico.
- `src/features/landing/seo.test.ts` — 4 test su canonical, Open Graph, robots, sitemap e landing statica.
- `src/i18n/i18n.test.ts` — parità IT/EN e aree, area `landing` inclusa.

Totale: **249 unitari** (+12).

### E2E

- `tests/e2e/landing.spec.ts` — 11 test: prima visita e nessun dato creato, CTA, redirect per marker e dati, `/#/welcome`, Panoramica in sidebar, login/richiesta accesso, lingua, tema, axe 375/1440 IT/EN chiaro/scuro, nessuna richiesta esterna, pre-render statico.
- E2E esistenti aggiornati a `/#/calculator`; smoke di produzione aggiornato.
- Totale: **68 E2E** (50 default incl. 11 landing + 12 visual + 3 auth + 3 sync), **68 scansioni axe** (+8), **42 screenshot** (+6).

### Visual

- `tests/e2e/visual.spec.ts`: landing a 1440/768/390 in italiano e inglese, oltre alle 36 baseline esistenti.
- Baseline Linux generate con il workflow `visual-baselines.yml` o, in locale, con il container Playwright Linux; le baseline desktop dell’app sono state rigenerate per la voce **Panoramica**.

### Budget

| Voce | Misura | Limite |
| --- | --- | --- |
| JS iniziale | 218,0 KB gzip | 230 KB |
| HTML | 6,2 KB gzip | 10 KB |
| Chunk lazy | 55,8 KB | 80 KB |
| Worker `.3mf` | 37,7 KB | 40 KB |
| CSS | 9,5 KB | 20 KB |
| Font | 56,8 KB | 120 KB |
| Totale iniziale | 284,4 KB | 350 KB |

Il limite HTML passa da 4 KB a 10 KB per il pre-render; il limite JS da 210 KB a 230 KB per la landing (prima schermata, dizionari IT/EN e componenti). Il limite di avviso Vite sul chunk raw passa a 860 KB.

---

## 7. Task

| ID | Task | Stato |
| --- | --- | --- |
| EVO-5.1 | Routing pubblico, `PublicLayout`, `AppShell`, marker e redirect | `[x]` |
| EVO-5.2 | Contenuti IT/EN, componenti landing, demo dal vivo, screenshot reali | `[x]` |
| EVO-5.3 | SEO: pre-render, canonical, OG/Twitter, robots, sitemap, header | `[x]` |
| EVO-5.4 | Accessibilità, tema, reduced motion, responsive, axe | `[x]` |
| EVO-5.5 | Test unit/E2E/visual e budget | `[x]` |
| EVO-5.6 | Documentazione, inventario i18n, ADR-0029, deploy | `[~]` documentazione fatta; deploy da fare |

---

## 8. Acceptance

- [x] `/#/` mostra la landing a un visitatore nuovo e non crea `layercost:data`.
- [x] Dati locali, marker `layercost:hasVisited` o sessione autenticata portano a `/#/calculator`.
- [x] `/#/welcome` mostra la landing anche a utenti esistenti; la sidebar ha **Panoramica**.
- [x] La landing non monta `HydrationGate`, `SyncController` o i dialoghi cloud.
- [x] Header, hero, 6 funzionalità, 3 passi, privacy, cloud, 5 FAQ, CTA e footer sono in IT/EN.
- [x] Hero con screenshot reale; demo dal vivo con il motore reale; 4 immagini reali.
- [x] `index.html` pre-renderizzato in italiano, canonical, Open Graph, Twitter, robots e sitemap; nessun `noindex`.
- [x] 375/768/1440, chiaro/scuro, `prefers-reduced-motion`, axe WCAG 2.2 AA.
- [x] Parità i18n IT/EN e inventario aggiornato.
- [x] 249 unitari, 68 E2E, 42 screenshot, 68 scansioni axe.
- [x] `npm run check` verde; budget JS 218,0/230 KB e HTML 6,2/10 KB.
- [x] Documentazione e ADR-0029.
- [ ] Deploy Vercel e verifica della produzione (passo separato).

---

## 9. Critique

```text
ROUND 1
Seen in one second: una pagina prodotto chiara, con un calcolatore reale a destra e un titolo grande a sinistra. Il resto scorre come una spiegazione, non come una vetrina.
Idea (one sentence): gli strati della stampa diventano gli strati del prezzo: la pagina mostra il calcolatore al lavoro e poi ne spiega i numeri.
Live thing: "Prova con i tuoi numeri" calcola costo pieno, prezzo netto e guadagno con il motore reale, senza salvare nulla.
Layout words by section: hero=testo 5/12 + screenshot 7/12 / funzionalità=tabella di confronto 4/8 / showcase=immagine dominante / come funziona=widget sticky 5/12 + tre passi 7/12 / privacy=campo ink invertito / cloud=quattro passi in riga / FAQ=heading sticky 4/12 + accordion 8/12 / CTA=statement + azioni / footer=wordmark + colonne.
Scores: design 7.8 · usability 8.2 · creativity 7.8 · content 8.5 → 8.1
Caps applied: nessuno.
Top three problems:
1. Il wordmark del footer a 112 px usciva dalla colonna da 5/12 e si sovrapponeva a “Prodotto” (desktop-page-02). Portato a 88 px.
2. A 390 px l’header mostrava logo, CTA e Menu insieme, con la CTA che rubava spazio (mobile-fold). Nascosta sotto 640 px; la CTA resta nel menu e nella hero.
3. La scala tipografica usava 10 misure, un paragrafo arrivava a 93 caratteri per riga e la CTA finale lasciava 335 px vuoti a 768 px (inspect). Ridotte le misure a display/heading/lead/body/small, aggiunto `max-w-[60ch]` ai passi e alle FAQ, CTA finale a due colonne da `md`.

ROUND 2
Seen in one second: il prodotto è il protagonista; il prezzo, la composizione e il preventivo si leggono prima delle parole.
Idea: invariata.
Live thing: invariato.
Layout words by section: invariati, con header mobile pulito e footer allineato.
Scores: design 8.2 · usability 8.4 · creativity 8.0 · content 8.6 → 8.3
Caps applied: nessuno.
Top three problems:
1. In tema scuro lo screenshot resta chiaro: è un’immagine reale dell’app in tema chiaro, non un mockup. Lasciato come limite documentato, con la possibilità di una coppia di screenshot dark in una fase successiva.
2. Su mobile la tabella di confronto ripete “LayerCost” e “Un foglio di calcolo” in ogni blocco: è lunga ma accessibile e confrontabile; nessuna informazione affidata al colore.
3. `no-footage`: nessun video. La pagina ha una demo interattiva, quattro screenshot reali e un drift della hero; un clip dell’app duplicherebbe la demo e peserebbe sul budget. WARN motivato.

ROUND 3
Seen in one second: landing pubblica coerente con Strato, con un prodotto reale e un’azione chiara.
Idea: invariata.
Live thing: invariato.
Layout words by section: invariati.
Scores: design 8.2 · usability 8.4 · creativity 8.0 · content 8.6 → 8.3
Caps applied: nessuno. `inspect.mjs`: 0 FAIL, 1 WARN (`no-footage`). `lint.mjs` sulla landing: 0 FAIL, 1 WARN (em dash usati solo come placeholder “—”, coerenti con il design system).
Top three problems: nessun problema nuovo visibile a uno sconosciuto; restano i limiti motivati del punto 2.
```

## 10. Rischi e rollback

| Rischio | Mitigazione |
| --- | --- |
| Flash della landing per un utente esistente | Il marker e i dati locali sono letti prima del redirect; `/#/welcome` è esplicito. |
| Landing che crea dati | `PublicLayout` fuori da `HydrationGate`; E2E verifica `layercost:data` nullo. |
| HTML iniziale con dati privati | Il pre-render contiene solo la landing; nessuna sessione o configurazione. |
| Baseline visuali diverse su macOS/Linux | Baseline generate su Linux con il container Playwright; i test visuali girano in CI. |
| Pre-render non aggiornato | Test `static-render.test.ts` con `toMatchFileSnapshot`; update documentato. |
| Budget oltre i limiti | Misura in `npm run budget`; limiti motivati in ADR-0029. |
| Indicizzazione dell’app | L’HTML iniziale è pubblico; l’app condivide la root e non espone dati. |

**Rollback:** ripristinare `X-Robots-Tag`, `robots.txt` e la root sul calcolatore; la landing può restare raggiungibile da `/#/welcome` o essere rimossa. Nessun dato utente viene toccato.
