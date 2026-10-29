# ADR-0026 — Pagina pubblica “Richiedi accesso” con Formspree Free

**Stato:** Accettato
**Data:** 29 ottobre 2026
**Piano:** `docs/planning/evo-3a-access-request.md`
**Relazione:** estende ADR-0024 (signup disabilitato e utenti creati dall’amministratore); non cambia auth, RLS, schema, sync o formule

## Contesto

LayerCost ha un cloud opzionale su Supabase Free con un workspace condiviso, due account `owner` e il signup pubblico disabilitato (ADR-0024). Le persone che non hanno un account non hanno un modo per chiedere l’accesso: l’unica strada è conoscere già l’amministratore e scrivergli fuori dall’app.

Serve una pagina pubblica, dentro l’app e raggiungibile senza login, che raccolga una richiesta e la faccia arrivare all’amministratore. Non serve un’approvazione automatica, non si vogliono creare utenti o membership dalla richiesta e non si vuole introdurre un backend nella v1. Il costo deve restare €0.

Il progetto ha già scelto di non usare analytics, cookie di tracciamento o servizi esterni per i dati dell’app. L’unica eccezione ammessa da questo ADR è l’invio esplicito del modulo, che contiene solo i dati inseriti dal richiedente.

## Decisione

1. **Pagina in-app, route pubblica e lazy.** La route è `/#/request-access`, dentro la shell dell’app ma fuori dalla sidebar. Il componente è caricato con `React.lazy` + `Suspense`, così il codice della pagina non entra nel bundle iniziale. La pagina è raggiungibile senza login e non crea sessione.
2. **Formspree Free come unico trasporto.** Il form invia un `POST` JSON all’endpoint pubblico di Formspree configurato con `VITE_ACCESS_REQUEST_ENDPOINT`. L’endpoint non è un segreto e può stare nel bundle. L’app non aggiunge dipendenze: usa `fetch` nativo con `Accept: application/json`, `Content-Type: application/json` e `credentials: 'omit'`.
3. **Nessuna approvazione automatica.** La richiesta non crea utenti, account, membership o workspace. Non viene chiamata l’Admin API di Supabase e non viene modificata alcuna tabella. L’amministratore legge la richiesta e, se decide di accogliere, crea l’utente con la procedura manuale del runbook.
4. **Nessuna autoresponse su Free.** Formspree Free non include le risposte automatiche. Il richiedente riceve una conferma in pagina; l’email di notifica arriva solo all’amministratore. Il campo `_replyto` contiene l’email del richiedente, così l’amministratore può rispondere manualmente. Non si implementa un’email al richiedente: richiederebbe Formspree Professional o un servizio/Edge Function in EVO-3b.
5. **Privacy e retention.** Email obbligatoria (max 254), nome opzionale (max 80), messaggio opzionale (max 500), consenso privacy obbligatorio. Formspree è il processore (USA) e conserva le submission per 30 giorni. L’email di notifica dell’amministratore viene cancellata dopo la decisione o entro 12 mesi. Nessun analytics, nessun cookie first-party, nessuna newsletter e nessun dato economico dell’app.
6. **Endpoint pubblico e configurabile.** In locale si usa un form Formspree di test separato; in produzione il form reale con **Restrict to domain = `layercost.vercel.app`**. L’endpoint è pubblico e non va trattato come un segreto. Se manca, la pagina mostra “Il modulo non è disponibile in questa build” e disabilita il form: la route resta raggiungibile, ma non può inviare nulla.
7. **Anti-spam minimo.** Campo honeypot `_gotcha` nascosto e non tabulabile; se compilato, la pagina mostra la conferma ma non chiama Formspree. La restrizione di dominio e i filtri Formspree restano la seconda barriera. Non si aggiunge captcha (sarebbe un’altra dipendenza/servizio e non serve per 50 invii/mese).
8. **Accessibilità e i18n.** Form con label, limiti visibili, errori associati con `aria-describedby`, focus visibile, stato di successo `role="status"` con focus sul titolo, errore `role="alert"`, layout verificato a 375 e 1440 px e axe WCAG 2.2 AA. Testi in italiano e inglese nei dizionari.
9. **Nessun impatto su dominio e dati.** Non cambiano formule, `engineVersion`, snapshot, schema locale v4, auth, RLS, sync, backup o keep-alive. La pagina non legge né scrive `AppData`.
10. **Budget.** La pagina è lazy, ma le stringhe IT/EN vivono nei dizionari centrali. Il bundle iniziale passa da 204,9 KB a 206,6 KB gzip; il limite iniziale viene alzato da 205 KB a 210 KB con questa motivazione. Il chunk lazy della pagina resta sotto i 3 KB gzip e il budget totale non cambia.
11. **Numerazione delle evolutive.** Questo ADR è 0026. EVO-2 (tetti utenti/preventivi) passa ad **ADR-0027** ed EVO-4 (multi-workspace) ad **ADR-0028**. La rinumerazione è registrata in `docs/planning/evolutive.md`, `TASKS.md` e nell’indice ADR.

## Alternative considerate

- **Google Forms o Microsoft Forms.** Sarebbe un modulo esterno, senza integrazione con l’app e con un’esperienza incoerente. La pagina in-app mantiene il controllo su microcopy, privacy e accessibilità. Scartato.
- **Link `mailto:`.** Espone l’indirizzo dell’amministratore, non funziona bene senza client email e non dà una conferma affidabile. Scartato.
- **Supabase Edge Function + Brevo/Resend.** Darebbe autoresponse e controllo server, ma introduce un backend, un segreto e un servizio esterno: è il perimetro di EVO-3b, non di questo task. Rinviato.
- **Formspree Professional.** Abilita le autoresponse, ma è un costo mensile non necessario per due persone e 50 richieste/mese. Rinviato.
- **Aprire il signup pubblico.** Sarebbe la strada più semplice, ma contraddice la decisione invite-only e aumenta superficie di abuso e spam. Scartato.
- **Pagina statica separata su un altro host.** Duplicherebbe il design system e la manutenzione. La route lazy dentro l’app usa gli stessi componenti e la stessa i18n. Scartato.
- **Endpoint hardcoded nel codice.** Impedisce di usare un form di test in locale e rende il rollback una modifica di codice. La env pubblica permette di spegnere il modulo senza deploy di codice. Scartato.

## Conseguenze

- Nuova feature `src/features/access/` con `RequestAccessPage.tsx`, `request-access.ts` e test unitari.
- Nuova route lazy in `src/App.tsx`; link da `LoginPage` e da `SyncSettings` nello stato non connesso.
- Nuova area i18n `src/i18n/{it,en}/access.ts`, con parità e inventario aggiornati.
- Nuova variabile pubblica opzionale `VITE_ACCESS_REQUEST_ENDPOINT`; nessun segreto nel repository, nel bundle o su Vercel.
- Nuovo runbook `docs/engineering/access-requests.md` per creazione del form, lettura delle richieste, creazione manuale dell’utente, retention, cancellazione e troubleshooting.
- Nuovo piano `docs/planning/evo-3a-access-request.md`.
- La pagina effettua una chiamata di rete solo dopo un invio esplicito. La regola “nessuna chiamata di rete oltre agli asset statici” resta valida per il resto dell’app e viene precisata in `AGENTS.md`, `PLAN.md` e `docs/engineering/architecture.md`.
- Test: unit su validazione/payload/endpoint/errori; E2E con Formspree mockato per successo, errore, validazione, honeypot, endpoint mancante e axe. `npm run test:e2e` costruisce due volte (con e senza endpoint) per coprire entrambi gli stati.
- Limiti noti: 50 invii/mese, archivio 30 giorni, niente export, niente autoresponse, dipendenza da Formspree e dalla sua disponibilità. Se il servizio è down, la pagina mostra un errore e i campi restano compilati.
- Rollback: rimuovere `VITE_ACCESS_REQUEST_ENDPOINT` da Vercel (o impostarla a vuoto) disabilita il form senza toccare il codice; in alternativa si può disabilitare il form nel dashboard Formspree. La route e i link possono restare.
- La creazione dell’utente resta manuale e fuori dall’app; nessun dato della richiesta viene importato nel database o nel workspace.

## Riferimenti

- `docs/planning/evo-3a-access-request.md`
- `docs/engineering/access-requests.md`
- `docs/engineering/deployment.md` §1.1
- `docs/engineering/testing.md`
- `docs/adr/0024-supabase-auth-workspace.md`
- `docs/adr/0025-google-oauth.md`
- Formspree, **Free plan** e **spam filtering** (consultati il 29/10/2026): https://formspree.io/plans e https://help.formspree.io/
