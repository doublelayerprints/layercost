# ADR-0030 — Documentazione in-app e pagina “Suggerimenti” con Formspree

**Stato:** Accettato
**Data:** 30 ottobre 2026
**Piano:** `docs/planning/evo-6-docs-feedback.md`
**Relazione:** estende ADR-0026 (stesso provider e stesso pattern di modulo pubblico); non cambia formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync

## Contesto

LayerCost è cresciuto: il calcolatore, le stampanti, i materiali, le tariffe, gli extra, il prezzo, i preventivi, l’import `.3mf`, il cloud e i backup hanno molti parametri e flussi. La guida iniziale è una checklist, non una documentazione consultabile. Chi usa l’app per la seconda volta non ha un posto dove ritrovare “come si configura la stampante” o “cosa succede quando segno un preventivo come inviato”.

Serve una documentazione dentro l’app, raggiungibile dalla sidebar, con un indice delle sezioni e contenuti consultabili anche a link diretti. Gli screenshot aiutano a riconoscere le schermate, ma non devono diventare l’unica fonte: la guida deve restare leggibile da tastiera e da screen reader.

Serve anche un canale semplice per inviare miglioramenti e segnalazioni. Il progetto non ha un backend per i feedback e non vuole aggiungerne uno. Il pattern Formspree di “Richiedi accesso” (ADR-0026) è già collaudato, ha un piano Free sufficiente e non richiede dipendenze.

## Decisione

1. **Documentazione dentro la shell dell’app.** La documentazione è una route lazy `/#/docs/:section`, con `/#/docs` che reindirizza alla prima sezione. Ogni sezione ha un URL stabile e condivisibile. Una sezione sconosciuta torna alla prima senza errore bloccante. La voce **Documentazione** vive nel nuovo gruppo **Aiuto** della sidebar, dopo **Configurazione**.

2. **Tre zone su desktop, indice compatto su mobile.** Il layout è sidebar dell’app + indice delle sezioni sticky + articolo. Sotto `lg`, l’indice diventa una lista orizzontale scorrevole sopra il contenuto. La navigazione precedente/successiva e i link utili chiudono ogni sezione. Il focus si sposta sul titolo quando si cambia sezione, senza rubarlo al primo caricamento.

3. **Dieci sezioni.** Primi passi, Stampanti, Materiali, Tariffe ed extra, Calcolare, Import `.3mf`, Prezzo e IVA, Preventivi, Cloud e backup, Suggerimenti. Ogni sezione ha intro, paragrafi, passi o elenchi, un avviso quando serve, link alle schermate reali e, dove utile, uno screenshot con caption.

4. **Contenuti tipizzati e bilingui, fuori dal bundle iniziale.** Le sezioni sono dati tipizzati in `src/features/docs/content.ts`; ogni testo è una chiave di `src/i18n/{it,en}/docs.ts`. I due dizionari della guida sono caricati solo dal chunk lazy della documentazione, non dal dizionario globale. Così l’italiano e l’inglese restano allineati senza far pagare ~19 KB gzip all’avvio dell’app. La documentazione è disponibile in entrambe le lingue.

5. **Screenshot reali, non mockup.** La guida riusa gli screenshot reali della landing (calcolatore, import, dettaglio preventivo, condivisione) e aggiunge `public/docs/{printers,materials,tariffs,settings}.jpg`, generati con `npm run capture:docs`. Le immagini sono lazy, hanno `alt` e `figcaption` localizzati e non contengono dati personali.

6. **Pagina “Suggerimenti” lazy.** La route `/#/feedback` è caricata con `React.lazy` + `Suspense` e raggiungibile dalla sidebar e dalla fine della guida. Il form include:
   - tipo: miglioramento, problema o altro;
   - area dell’app: calcolatore, preventivi, stampanti, materiali, tariffe, extra, import, confronto, impostazioni, cloud o altro;
   - titolo obbligatorio (max 120);
   - descrizione obbligatoria (max 2000);
   - email opzionale (max 254), usata come `_replyto` solo se presente;
   - consenso privacy obbligatorio;
   - honeypot `_gotcha`.

7. **Nuovo form Formspree, stessa architettura di ADR-0026.** L’invio usa `fetch` nativo con `Accept: application/json`, `Content-Type: application/json` e `credentials: 'omit'` verso `VITE_FEEDBACK_ENDPOINT`. L’endpoint è pubblico e non è un segreto. Se manca o non è un URL Formspree valido, la pagina mostra “Modulo non disponibile” e disabilita il form. Non viene creata alcuna richiesta di accesso, account, utente o membership. Non c’è autoresponse su Free: la conferma è in pagina e l’amministratore risponde manualmente se serve.

8. **Privacy del feedback.** Formspree è il processore (USA) e conserva le submission per 30 giorni. Vengono inviati solo i campi del modulo, non preventivi, configurazione o altri dati dell’app. La pagina lo spiega prima del consenso. Nessun analytics, cookie first-party, newsletter o tracciamento.

9. **Nessun impatto su dominio e dati.** Non cambiano formule, `engineVersion`, snapshot, schema locale v4, `AppData`, auth, RLS, sync, backup o keep-alive. Documentazione e suggerimenti non leggono né scrivono `layercost:data`; la documentazione vive dentro `AppShell`, quindi può usare il tema e la lingua correnti.

10. **Budget.** La documentazione e il feedback sono chunk lazy. Dopo lo spostamento dei dizionari docs nel chunk, il bundle iniziale è **220,2 KB gzip / 230 KB**, i chunk lazy **73,0 KB / 80 KB** (docs 14,8 KB, feedback 2,9 KB), il totale iniziale **286,9 KB / 350 KB**. Non si alza il limite iniziale.

11. **Test e documentazione.** Unit: validazione/payload/endpoint/errori del feedback, contenuti docs, chiavi IT/EN, sezioni e vicini. E2E: navigazione, deep link, redirect, mobile, inglese, screenshot, invio/errore/validazione/honeypot del feedback, endpoint mancante, axe. `npm run test:e2e` costruisce con e senza i due endpoint. Nuovo piano `docs/planning/evo-6-docs-feedback.md`, aggiornamenti a TASKS, STATUS, README, deployment, testing, i18n inventory e CHANGELOG.

## Alternative considerate

- **Una sola pagina con tutte le sezioni e ancore.** Sarebbe più semplice, ma un documento lungo con 10 sezioni rende difficile il ritorno alla sezione e non permette link diretti puliti. Le route per sezione costano poco e migliorano la consultazione. Scartato.
- **Un sito di documentazione separato (VitePress, Docusaurus, GitBook).** Introdurrebbe una seconda build, un secondo design system e un secondo deploy per una guida che deve restare accanto all’app. Scartato.
- **Markdown renderizzato a runtime.** Aggiungerebbe un parser e una dipendenza, con rischio di HTML non sanificato e perdita del controllo tipografico. I contenuti tipizzati usano i componenti esistenti. Scartato.
- **Riusare il form “Richiedi accesso” anche per i suggerimenti.** Sarebbe immediato, ma mescolerebbe due flussi con destinatari e privacy diversi e renderebbe impossibile distinguere le richieste di accesso dai bug. Scartato.
- **Link `mailto:` per i suggerimenti.** Non dà conferma, non funziona senza client email e non permette di strutturare tipo e area. Scartato.
- **Backend o Edge Function per i feedback.** Aggiungerebbe un segreto, un servizio e una manutenzione non necessari per pochi messaggi al mese. Rimandato.
- **Captcha.** Non serve per 50 invii/mese; honeypot, Restrict to Domain e filtri Formspree sono sufficienti. Rimandato.
- **Screenshot rifatti a mano o mockup.** Sarebbero meno onesti e più difficili da mantenere. Gli screenshot reali sono generati da un comando. Scartato.

## Conseguenze

- Nuova feature `src/features/docs/` con `DocsPage.tsx`, `content.ts`, `i18n.ts` e test.
- Nuova feature `src/features/feedback/` con `FeedbackPage.tsx`, `feedback.ts` e test.
- Nuove route lazy in `src/App.tsx`; nuovo gruppo **Aiuto** in `src/app/Layout.tsx`.
- Nuova area i18n `docs` caricata dal chunk della guida e area `feedback` nei dizionari globali; parità IT/EN e inventario aggiornati.
- Nuova variabile pubblica opzionale `VITE_FEEDBACK_ENDPOINT`; nessun segreto nel repository, nel bundle o su Vercel.
- Nuovo script `npm run capture:docs`; nuovi asset `public/docs/*.jpg`.
- Nuovo piano `docs/planning/evo-6-docs-feedback.md` e questo ADR.
- Limiti noti: Formspree Free ha 50 invii/mese, archivio 30 giorni e nessun export; non c’è autoresponse. La documentazione non ha ricerca full-text né versioning separato: segue le release dell’app. Gli screenshot sono in italiano anche con UI inglese.
- Rollback: rimuovere `VITE_FEEDBACK_ENDPOINT` da Vercel disabilita il form senza toccare il codice; la pagina resta raggiungibile e mostra lo stato “modulo non disponibile”. La documentazione non ha dipendenze esterne e può restare.
- Nessun dato utente viene cancellato o migrato.

## Riferimenti

- `docs/planning/evo-6-docs-feedback.md`
- `docs/adr/0026-request-access-formspree.md`
- `docs/engineering/deployment.md` §1.1
- `docs/engineering/testing.md`
- `docs/design/design-system.md`
- `docs/planning/i18n-inventory.md`
- Formspree, **Free plan** e **spam filtering** (consultati il 30/10/2026): https://formspree.io/plans e https://help.formspree.io/
