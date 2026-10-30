# EVO-6 — Documentazione in-app e pagina “Suggerimenti”

**Stato:** implementato e configurato in locale il 30/10/2026; form Formspree di produzione e test creati, env impostata in `.env.local` e su Vercel, submission di test verificata; deploy da fare
**ADR:** `docs/adr/0030-docs-and-feedback.md`
**Relazione:** estende il pattern Formspree di EVO-3a/ADR-0026; non cambia formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync

---

## 1. Obiettivo

Rendere LayerCost consultabile senza uscire dall’app e dare un canale semplice per proporre miglioramenti o segnalare problemi.

La documentazione deve rispondere alle domande pratiche:

- cosa configurare al primo avvio;
- come inserire stampanti, materiali, tariffe ed extra;
- come calcolare una stampa e importare un `.3mf`;
- come funzionano prezzo, sconti e IVA;
- come gestire, stampare e condividere i preventivi;
- cosa sono cloud, account e backup;
- dove inviare un suggerimento.

La pagina Suggerimenti deve inviare solo i campi del modulo, senza creare account, senza backend e senza dati dell’app.

## 2. Non-obiettivi

- ricerca full-text nella documentazione;
- versioning separato della guida;
- editor o CMS;
- commenti o ticket con stato;
- autoresponse al richiedente;
- analytics o tracciamento;
- modifiche a formule, dominio, schema, snapshot, auth, RLS o sync.

## 3. Scelte

| Tema           | Scelta                                                              |
| -------------- | ------------------------------------------------------------------- |
| Posizione      | Gruppo sidebar **Aiuto** con **Documentazione** e **Suggerimenti**  |
| Route docs     | `/#/docs` → `/#/docs/primi-passi`; sezioni profonde `/#/docs/<id>`  |
| Layout         | Indice sticky + articolo su desktop; indice orizzontale su mobile   |
| Contenuti      | Dati tipizzati + chiavi i18n IT/EN nel chunk lazy della guida       |
| Screenshot     | Asset reali in `public/landing/` e `public/docs/`                   |
| Route feedback | `/#/feedback`, lazy                                                 |
| Trasporto      | Formspree Free con `VITE_FEEDBACK_ENDPOINT`                         |
| Campi          | tipo, area, titolo, descrizione, email opzionale, privacy, honeypot |
| Errori         | endpoint mancante, rete, 429, 5xx, 4xx, sconosciuto                 |
| Accessibilità  | label, focus, `role="status"`, `role="alert"`, axe 375/1440         |
| Budget         | Nessun aumento del limite iniziale; docs e feedback sono chunk lazy |
| Deploy         | Variabile pubblica su Vercel; nessun segreto                        |

## 4. Task

### EVO-6.1 — Routing e navigazione

- [x] Route lazy `/#/docs` e `/#/docs/:section`.
- [x] Redirect di `/#/docs` e delle sezioni sconosciute alla prima sezione.
- [x] Route lazy `/#/feedback`.
- [x] Gruppo sidebar **Aiuto** con **Documentazione** e **Suggerimenti**.
- [x] `end` corretto per la voce Suggerimenti; Documentazione attiva sulle sezioni.
- [x] Focus sul titolo al cambio sezione e scroll in alto.

### EVO-6.2 — Layout e contenuti

- [x] Layout a tre zone su desktop, indice orizzontale su mobile.
- [x] Dieci sezioni: Primi passi, Stampanti, Materiali, Tariffe ed extra, Calcolare, Import `.3mf`, Prezzo e IVA, Preventivi, Cloud e backup, Suggerimenti.
- [x] Blocchi tipizzati: paragrafi, passi, elenchi, avvisi, figure.
- [x] Link utili, precedente/successiva e CTA finale verso Suggerimenti.
- [x] Testi IT/EN completi e allineati.
- [x] Screenshot reali con alt e caption.
- [x] `npm run capture:docs` per rigenerare `public/docs/*.jpg`.

### EVO-6.3 — Pagina Suggerimenti

- [x] Form con tipo, area, titolo, descrizione, email opzionale e consenso privacy.
- [x] Honeypot `_gotcha` e nessuna chiamata se compilato.
- [x] Validazione con limiti e messaggi associati ai campi.
- [x] Stati idle/submitting/success/error/endpoint mancante.
- [x] Conferma `role="status"` con focus sul titolo; errore `role="alert"` con campi conservati e riprova.
- [x] “Invia un altro suggerimento” azzera il form.
- [x] Payload con `_subject` e `_replyto` solo se l’email è presente.
- [x] Nessuna scrittura Supabase, nessun account, nessun dato dell’app.
- [x] i18n IT/EN e link alla documentazione.

### EVO-6.4 — Privacy e configurazione

- [x] `VITE_FEEDBACK_ENDPOINT` documentata in `.env.example`.
- [x] Endpoint pubblico, nessun segreto nel repository o su Vercel.
- [x] Testo privacy: Formspree, USA, 30 giorni, soli campi del modulo.
- [x] Endpoint mancante → modulo disabilitato con messaggio esplicito.
- [x] Creare il form Formspree di produzione e test, impostare la env su Vercel e verificare una submission sul form di test.
- [ ] Applicare **Restrict to Domain = `layercost.vercel.app`** al form di produzione.
- [ ] Verificare una submission reale sul form di produzione dopo il deploy.

### EVO-6.5 — Test e budget

- [x] Unit feedback: validazione, payload, endpoint, errori, honeypot.
- [x] Unit docs: id univoci, contenuti non vuoti, chiavi IT/EN, vicini.
- [x] E2E docs: sidebar, indice, deep link, redirect, mobile, inglese, screenshot.
- [x] E2E feedback: successo, email opzionale, errore/riprova, validazione, honeypot, axe.
- [x] E2E endpoint mancante per il feedback.
- [x] Route docs e feedback in `a11y.spec.ts`.
- [x] `scripts/test-e2e.mjs` costruisce con e senza entrambi gli endpoint.
- [x] Budget: iniziale 220,2/230 KB; lazy 73,0/80 KB; totale 286,9/350 KB.
- [ ] Aggiungere una baseline visual dedicata a docs e feedback (follow-up).

### EVO-6.6 — Documentazione e deploy

- [x] ADR-0030 e questo piano.
- [x] README, TASKS, STATUS, CHANGELOG, deployment, testing e i18n inventory.
- [x] `.env.example`.
- [ ] Deploy Vercel e verifica produzione (docs, feedback, smoke).
- [ ] Pulizia delle submission di prova dal form Formspree.

## 5. Accettazione

- [x] Dalla sidebar si apre la documentazione; l’indice cambia sezione e l’URL è condivisibile.
- [x] Una sezione sconosciuta non blocca l’app.
- [x] La guida è leggibile a 375 e 1440 px, in IT/EN, con screenshot e caption.
- [x] La pagina Suggerimenti invia a Formspree solo i campi compilati, con consenso e honeypot.
- [x] Senza endpoint il modulo è disabilitato e la pagina resta accessibile.
- [x] `npm run check` verde.
- [x] E2E docs/feedback e axe verdi.
- [ ] Deploy Vercel e verifica produzione (docs, feedback, smoke).
- [x] Configurazione Formspree di produzione/test e env Vercel.
- [x] Submission reale sul form di test.
- [ ] Submission reale sul form di produzione e deploy.

## 6. Comandi

```bash
npm run capture:docs                 # screenshot della guida (richiede Chrome)
npm run test:e2e                     # build con/senza endpoint + Playwright
npx playwright test tests/e2e/docs.spec.ts --project=chromium
npx playwright test tests/e2e/a11y.spec.ts --project=chromium
```

## 7. Rollback

- Feedback: rimuovere `VITE_FEEDBACK_ENDPOINT` da Vercel o impostarla a vuoto. La pagina mostra “Modulo non disponibile”; nessun dato viene inviato.
- Documentazione: nessuna dipendenza esterna; le route possono restare anche se il form viene spento.
- In caso di problema al chunk lazy, il resto dell’app non è coinvolto: le route sono separate e caricate solo su richiesta.
