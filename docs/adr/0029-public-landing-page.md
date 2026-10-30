# ADR-0029 — Landing page pubblica, routing `/calculator` e pre-render SEO

**Stato:** Accettato e distribuito
**Data:** 29 ottobre 2026
**Deploy:** 30 ottobre 2026, build `index-mbP2OUSu.js` / `index-DYXu1jt6.css`, smoke di produzione verde
**Piano:** `docs/planning/evo-5-landing-page.md`
**Relazione:** non cambia formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync

## Contesto

LayerCost è una SPA local-first con hash routing. Fino alla v1.0.0 la root `/#/` apriva direttamente il calcolatore, la build serviva `X-Robots-Tag: noindex`, `robots.txt` bloccava tutto e non esisteva una pagina pubblica che spiegasse il prodotto. Chi non conosceva l’app non aveva un punto di ingresso: la prima schermata era un form denso, pensato per chi aveva già configurato stampanti, materiali e tariffe.

Servono tre cose insieme:

1. una landing pubblica in italiano e inglese, con header, hero, funzionalità, come funziona, privacy/local-first, cloud opzionale, FAQ, CTA e footer;
2. un routing che continui a portare gli utenti esistenti e gli utenti autenticati al calcolatore, senza far comparire la landing a ogni apertura;
3. una root indicizzabile, con canonical, Open Graph, Twitter, sitemap e HTML iniziale che contenga solo contenuto pubblico.

La landing non deve creare `layercost:data`, non deve montare `HydrationGate`, `SyncController` o i dialoghi cloud e non deve introdurre backend, account obbligatori, analytics o nuove dipendenze runtime.

## Decisione

1. **Tre route pubbliche e un confine netto.**
   - `/#/` è la landing pubblica. Un visitatore nuovo la vede; chi ha dati locali, il marker `layercost:hasVisited` o una sessione autenticata viene reindirizzato a `/#/calculator`.
   - `/#/calculator` è il calcolatore e l’ingresso all’app. Il resto delle route dell’app resta invariato (`quotes`, `printers`, `settings`, …).
   - `/#/welcome` è la landing forzata, raggiungibile anche dalla voce **Panoramica** della sidebar dell’app. Serve a rivedere la pagina senza cancellare dati o marker.

2. **`PublicLayout` fuori dalla shell dell’app.** La landing usa un layout pubblico con skip link, header, `main` e footer, senza sidebar. `HydrationGate`, `SyncController`, `FirstLoginDialog`, `SyncConflictDialog` e `Layout` vivono in `AppShell`, montato solo dalle route dell’app. La landing non chiama `hydrate()` e non scrive `layercost:data`; il marker di visita viene scritto solo entrando nell’app. `/#/welcome` non viene reindirizzata.

3. **Contenuti completi in italiano e inglese.** La landing include header pubblico con logo, Funzionalità, Come funziona, Privacy, FAQ e CTA; hero con headline, sottotitolo, CTA “Apri il calcolatore” e “Richiedi accesso”; sei funzionalità in una tabella di confronto con un foglio di calcolo; tre passi con un esempio dal vivo che usa il motore reale; sezione local-first/privacy; sezione cloud con richiesta, approvazione manuale, Google/email e workspace condiviso; cinque FAQ; CTA finale e footer con login, richiesta accesso, versione motore, nota privacy, lingua e tema. I testi sono nell’area i18n `landing`, con parità IT/EN.

4. **Immagini reali del prodotto, nessun mockup finto.** La hero e i passi usano screenshot reali dell’app (calcolatore, dettaglio preventivo, vista condivisa, import `.3mf`), generati con `npm run capture:landing` e serviti da `public/landing/`. L’esempio “Prova con i tuoi numeri” non è un’immagine: usa gli stessi tipi e lo stesso motore del calcolatore, con valori di partenza dichiarati e senza toccare lo storage.

5. **Pre-render statico italiano dentro `index.html`.** Un plugin Vite legge `src/features/landing/landing-static.html` e inietta il contenuto completo in `#root` solo in build. Crawler e visitatori senza JavaScript vedono la landing italiana; React prende il controllo al primo render. Il file statico è uno snapshot del renderer `static-render.ts`, tenuto allineato da un test Vitest (`toMatchFileSnapshot`) e rigenerabile con `npx vitest run src/features/landing/static-render.test.ts -u`. Nell’HTML iniziale non ci sono dati privati, preventivi, configurazione o sessione.

6. **SEO.** `index.html` espone title e description italiani, canonical `https://layercost.vercel.app/`, Open Graph, Twitter `summary_large_image`, `og:image` 1200×630, `robots: index,follow` e JSON-LD `SoftwareApplication`. `public/robots.txt` passa da `Disallow: /` a `Allow: /` con la sitemap; `public/sitemap.xml` contiene la root; `vercel.json` rimuove `X-Robots-Tag: noindex`. L’app condivide la root e diventa crawlable, ma il primo HTML resta pubblico e leggero. L’inglese è disponibile nell’interfaccia; un’indicizzazione inglese separata richiederebbe una route o un parametro dedicato ed è rimandata.

7. **Accessibilità e movimento.** 375/768/1440 px, tema chiaro e scuro, `prefers-reduced-motion`, focus visibile, target touch, tabelle responsive, FAQ native `<details>`, nomi accessibili e axe WCAG 2.2 AA. La landing aggiunge un’animazione d’ingresso progressiva e un drift della hero immagine; chi preferisce meno movimento vede tutto subito. La regola “solo feedback” resta valida per le schermate dell’app.

8. **Nessuna nuova dipendenza runtime o di componenti.** Solo React, React Router, Tailwind, i componenti interni e gli asset self-hosted già presenti. Il pulsante-link usa `buttonClassName` condiviso; niente shadcn/Radix/MUI.

9. **Budget misurato.** La landing sta nell chunk iniziale perché è la prima schermata: JS iniziale **218,0 KB gzip** su un nuovo limite di **230 KB**, HTML statico **6,2 KB gzip** su un nuovo limite di **10 KB**. Lazy 55,8/80 KB, CSS 9,5/20 KB, totale iniziale 284,4/350 KB. Il limite HTML era 4 KB e viene alzato per il pre-render; il limite JS era 210 KB e viene alzato di 20 KB con questa motivazione. Il chunk raw supera la soglia di avviso Vite, portata a 860 KB.

10. **Routing e test.** Tutti i link interni al calcolatore passano da `/` a `/calculator`, inclusi login, callback OAuth, link condivisi, 404, richiesta accesso, smoke ed E2E. La pagina Panoramica è in sidebar. Unit: decisione di redirect, anteprima del motore, meta/SEO e parità i18n. E2E: prima visita, CTA, redirect per marker e dati, `/#/welcome`, link login/richiesta accesso, lingua, tema, 375/1440, axe e nessuna richiesta esterna. Visual: landing a 1440/768/390 in IT/EN. Le baseline Linux sono nel repository.

11. **Documentazione e stato.** Nuovo piano `docs/planning/evo-5-landing-page.md`, questo ADR, aggiornamenti a `TASKS.md`, `STATUS.md`, `README.md`, deployment, testing, i18n inventory e design system. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale, auth, RLS o sync.

## Alternative considerate

- **Tenere la root sul calcolatore e aggiungere una landing separata.** Sarebbe un secondo sito da mantenere, con un design system duplicato e link incoerenti. La route pubblica nello stesso bundle usa gli stessi token, font e componenti. Scartato.
- **Continuare con `noindex` e una landing non indicizzabile.** La pagina esisterebbe solo per chi la conosce già, cioè il contrario dello scopo. Scartato.
- **SSR o generatore statico completo.** Introdurrebbe un runtime Node o un passo di build più complesso per una sola pagina. Il plugin Vite con un partial italiano è sufficiente e resta una build statica portabile. Scartato.
- **Landing inglese su `/en`.** Utile per la SEO internazionale, ma richiede una seconda indicizzazione, canonical e contenuti duplicati; il prodotto non ha ancora una domanda inglese misurata. Rimandato.
- **Video di prodotto nella hero.** Un clip registrato dell’app sarebbe onesto ma pesante, duplicherebbe l’esempio dal vivo e aggiungerebbe un asset difficile da mantenere. La hero usa uno screenshot reale e la sezione “Come funziona” un esempio interattivo. Scartato.
- **Nuova libreria di componenti o icone.** Contraddice ADR-0012 e il design system. Scartato.

## Conseguenze

- `src/app/PublicLayout.tsx`, `src/app/AppShell.tsx`, `src/features/landing/` e `src/data/visit.ts`.
- `src/App.tsx` separa route pubbliche e route dell’app; `HydrationGate`, sync e dialoghi cloud non montano sulla landing.
- `src/app/Layout.tsx` aggiunge **Panoramica** e porta il logo e il calcolatore a `/calculator`.
- `index.html`, `vercel.json`, `robots.txt`, `sitemap.xml` e `og-image.jpg` cambiano per SEO.
- `scripts/check-budget.mjs` alza i limiti JS e HTML; `vite.config.ts` aggiunge il plugin di pre-render.
- Nuovo script `npm run capture:landing` per rigenerare gli screenshot reali.
- Test: 249 unitari (+12), 68 E2E (50 default incl. 11 landing + 12 visual + 3 auth + 3 sync), 42 screenshot visuali (+6), 68 scansioni axe (+8).
- Deploy: la landing è verificata in locale; il deploy di produzione resta un passo separato. Rollback SEO: ripristinare `X-Robots-Tag`, `robots.txt` e la root sul calcolatore; il codice della landing può restare inert.
- Limiti noti: indicizzazione inglese non separata; screenshot in tema chiaro anche con UI scura; il marker `layercost:hasVisited` non è un dato dell’app e non entra nei backup.

## Riferimenti

- `docs/planning/evo-5-landing-page.md`
- `docs/design/design-system.md` §8.13
- `docs/engineering/deployment.md` §2 e §13
- `docs/engineering/testing.md`
- `docs/planning/i18n-inventory.md`
- `docs/adr/0007-hash-routing.md`
- `docs/adr/0015-direzione-visiva.md`
- `docs/adr/0026-request-access-formspree.md`
