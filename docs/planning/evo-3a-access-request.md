# EVO-3a — Pagina “Richiedi accesso” con Formspree Free

**Stato:** implementazione completata il 29/10/2026 (PR #26, CI verde); form Formspree reale e verifica live da configurare
**Data:** 29 ottobre 2026
**ADR:** `docs/adr/0026-request-access-formspree.md`
**Runbook:** `docs/engineering/access-requests.md`
**Branch:** `feat/evo-3a-request-access`

---

## 1. Contesto

Il cloud è live su https://layercost.vercel.app con Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), workspace `ws-doublelayer`, due account `owner` e signup pubblico disabilitato. Google login (EVO-1, ADR-0025) è disponibile per gli account esistenti.

Chi non ha un account non ha un modo per chiedere l’accesso. Serve una pagina pubblica, dentro l’app, che raccolga una richiesta e la faccia arrivare all’amministratore senza creare utenti, account o membership. Il costo deve restare €0 e non si introduce un backend.

Questo task è **solo** la pagina di richiesta. Non implementa tetti (EVO-2), allowlist/Auth Hook (EVO-3b), tabella DB, Edge Function, Brevo, admin UI o multi-workspace (EVO-4).

---

## 2. Decisioni

1. **Formspree, piano Free.** L’endpoint è pubblico, non è un segreto.
2. **Route in-app `/#/request-access`**, raggiungibile senza login.
3. **Nessuna approvazione automatica** e nessun utente/account/membership creato dalla richiesta.
4. **Nessuna autoresponse.** Formspree Free non include le risposte automatiche: il richiedente non riceve un’email. Riceve una conferma in pagina. L’email di notifica arriva solo all’amministratore; `_replyto` contiene l’email del richiedente per rispondere manualmente. Non si implementa un’email al richiedente (sarebbe Formspree Professional o EVO-3b).
5. **Privacy.** Email obbligatoria (max 254), nome opzionale (max 80), messaggio opzionale (max 500), checkbox di consenso obbligatoria. Formspree è il processore (USA), archivio 30 giorni. L’email dell’amministratore va cancellata dopo la decisione o entro 12 mesi. Nessun analytics, nessun cookie first-party, nessuna newsletter.
6. **Pagina lazy.** Le stringhe i18n centrali possono superare il budget di 205 KB: il limite JS iniziale è stato alzato a **210 KB** (misurato 206,6 KB) con motivazione in ADR-0026 e `STATUS.md`.
7. **Nessuna modifica** a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync. Nessuna migrazione Supabase.
8. **ADR-0026** per questa pagina. EVO-2 passa ad **ADR-0027**, EVO-4 ad **ADR-0028**.
9. **Nessuna nuova dipendenza.** `fetch` nativo, `Accept: application/json`, JSON.

---

## 3. Scope

### Dentro

- Route lazy `/#/request-access` in `src/App.tsx`.
- Feature `src/features/access/` con pagina, validazione, payload, endpoint e mapping errori.
- i18n IT/EN in `src/i18n/{it,en}/access.ts` e inventario aggiornato.
- Link da `LoginPage` (“Non hai un account? Richiedi accesso”) e da `SyncSettings` nello stato non connesso.
- Form: email, nome, messaggio, consenso privacy, honeypot.
- Stati: `idle`, `submitting`, `success`, `error`, endpoint mancante.
- Accessibilità: label, limiti, errori `aria-describedby`, focus visibile, 375/1440, axe.
- Test unitari, E2E, i18n parity, budget.
- Documentazione: ADR, piano, runbook, deployment, testing, STATUS, TASKS, CHANGELOG.

### Fuori

- Tetti utenti/preventivi (EVO-2).
- Allowlist, Auth Hook `before-user-created`, tabella `signup_allowlist` (EVO-3b).
- Edge Function, Brevo/Resend, email automatica al richiedente (EVO-3b).
- Admin UI per approvare o creare utenti.
- Multi-workspace (EVO-4).
- Modifiche a formule, `engineVersion`, snapshot, schema locale, auth, RLS o sync.
- Analytics, cookie di tracciamento, newsletter, captcha.

---

## 4. Route e UX

| Stato                      | Comportamento                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint configurato, idle | Form attivo; email/nome/messaggio/consenso; honeypot nascosto                                                                     |
| submitting                 | Pulsante “Invio…” disabilitato, `aria-busy` sul form                                                                              |
| success                    | Card “Richiesta inviata” con `role="status"`, focus sul titolo, link “Torna al calcolatore”; nessuna promessa di email automatica |
| error                      | `role="alert"`, messaggio mappato, campi conservati, pulsante “Riprova”                                                           |
| endpoint mancante          | “Il modulo non è disponibile in questa build. Contatta l’amministratore.” Form e pulsante disabilitati                            |

La pagina non è nella sidebar. I link compaiono solo dove servono: login e sezione Sincronizzazione non connessa.

### Microcopy

- La conferma dice che l’amministratore esaminerà la richiesta e risponderà all’indirizzo indicato.
- La conferma dice esplicitamente che **non** arriverà un’email automatica.
- La nota privacy dice che i dati vanno a Formspree (USA), che l’archivio è di 30 giorni, che l’email dell’amministratore viene cancellata dopo la decisione o entro 12 mesi e che non ci sono analytics, cookie first-party o newsletter.

---

## 5. Dati e payload

Campi del form:

| Campo     | Obbligatorio | Limite | Note                                               |
| --------- | ------------ | ------ | -------------------------------------------------- |
| `email`   | sì           | 254    | trim, validazione forma, usata anche in `_replyto` |
| `name`    | no           | 80     | trim                                               |
| `message` | no           | 500    | trim                                               |
| `privacy` | sì           | —      | checkbox; il payload contiene il booleano          |
| `_gotcha` | no           | —      | honeypot nascosto; se compilato non si invia nulla |

Payload JSON:

```json
{
  "email": "mario@example.com",
  "name": "Mario",
  "message": "Vorrei usare il cloud condiviso.",
  "privacy": true,
  "_subject": "LayerCost — richiesta accesso cloud",
  "_replyto": "mario@example.com",
  "_gotcha": ""
}
```

Errori di validazione: `emailRequired`, `emailInvalid`, `emailTooLong`, `nameTooLong`, `messageTooLong`, `privacyRequired`.

Errori di trasporto: `notConfigured`, `network`, `rateLimited` (429), `server` (5xx), `rejected` (4xx), `unknown`.

Endpoint: solo `https://formspree.io/f/<id>` (https, dominio Formspree). Un valore assente o non valido equivale a endpoint mancante.

---

## 6. Privacy e retention

- **Titolare:** l’amministratore del workspace LayerCost.
- **Processore:** Formspree (USA) per la consegna del modulo.
- **Dati inviati:** solo i campi del modulo. Nessun dato economico, preventivo, configurazione o identificatore dell’app.
- **Consenso:** checkbox obbligatoria; senza consenso il form non invia.
- **Retention Formspree:** 30 giorni (piano Free).
- **Retention email amministratore:** cancellazione dopo la decisione o entro 12 mesi.
- **Nessun analytics, cookie first-party o newsletter.**
- **Nessuna creazione automatica di utenti/account/membership.**
- **Diritti:** il richiedente può scrivere all’amministratore per accesso, rettifica o cancellazione; la procedura è nel runbook.

---

## 7. Setup manuale Formspree

Questa parte richiede un account Formspree e non può essere eseguita dal codice:

1. Creare un form **Free** per la produzione e uno separato per i test locali.
2. Verificare l’email dell’amministratore e attivare la notifica a ogni submission.
3. Verificare che l’oggetto sia `LayerCost — richiesta accesso cloud` e che `_replyto` sia l’email del richiedente.
4. Impostare **Restrict to domain = `layercost.vercel.app`** sul form di produzione.
5. Inviare una submission di prova e controllare notifica, reply-to, spam e archivio.
6. Mettere l’endpoint di produzione in `VITE_ACCESS_REQUEST_ENDPOINT` su Vercel (Production e Preview) e, se serve, in `.env.local` per il form di test.
7. Controllare il limite di 50 invii/mese e l’archivio di 30 giorni.

Procedura operativa completa: `docs/engineering/access-requests.md`.

---

## 8. Env e deploy

- `VITE_ACCESS_REQUEST_ENDPOINT` è **pubblica**: nessun secret nel repository, nel bundle o su Vercel.
- Se manca o non è valida, la pagina mostra lo stato “modulo non disponibile” e non chiama la rete.
- In locale usare un form di test separato; non inviare test al form di produzione.
- In produzione il form reale è ristretto al dominio `layercost.vercel.app`.
- Rollback: rimuovere la env su Vercel o impostarla a vuoto. Il form si disabilita senza modifiche al codice. In alternativa disabilitare il form nel dashboard Formspree.

---

## 9. Accessibilità

- Label esplicite e associate; unità/limiti visibili.
- Errori con `aria-describedby` e `aria-invalid`; focus sul primo campo errato.
- Focus visibile; heading di successo focalizzato con `tabIndex={-1}`.
- `role="status"` per la conferma, `role="alert"` per l’errore.
- Honeypot fuori schermo, `tabIndex={-1}`, `aria-hidden` sul contenitore.
- Layout verificato a 375 e 1440 px, in italiano e inglese.
- axe WCAG 2.2 AA su pagina attiva e pagina senza endpoint.

---

## 10. Test

### Unitari

`src/features/access/request-access.test.ts` (17 test):

- validazione email (obbligatoria, forma, limite 254);
- limiti nome 80 e messaggio 500 dopo trim;
- consenso obbligatorio e più errori insieme;
- payload completo con `_subject`, `_replyto`, `_gotcha`;
- endpoint valido/non valido/assente;
- mapping 429/5xx/4xx/unknown;
- invio con `Accept`, `Content-Type`, `credentials: 'omit'`;
- errore di rete, endpoint mancante, honeypot senza rete.

### E2E

`tests/e2e/access.spec.ts` (5 test, richiede una build con endpoint):

- invio con Formspree mockato, payload esatto, conferma, focus, nessuna scrittura auth/rest;
- errore 500, campi conservati, riprova e successo;
- validazione senza chiamate di rete;
- honeypot compilato: conferma senza invio;
- axe a 375/1440 in italiano e inglese.

`tests/e2e/access-missing.spec.ts` (1 test, richiede una build senza endpoint):

- messaggio “Il modulo non è disponibile in questa build”, form disabilitato, axe a 375/1440 in italiano e inglese.

`npm run test:e2e` usa `scripts/test-e2e.mjs` e costruisce due volte: prima con endpoint di test, poi senza endpoint, per coprire entrambi gli stati senza hook di runtime.

### Altri

- `src/i18n/i18n.test.ts`: parità IT/EN e aree senza duplicati (36 chiavi `access.*`).
- `npm run budget`: JS iniziale 206,6/210 KB, chunk lazy 55,8/80 KB, totale 271,5/350 KB.
- `tests/e2e/a11y.spec.ts`: route `/#/request-access` inclusa nelle scansioni.
- `tests/e2e/release.spec.ts`: la pagina non chiama servizi esterni al caricamento.

---

## 11. File

```text
src/App.tsx                                  route lazy + Suspense
src/features/access/RequestAccessPage.tsx     pagina e stati
src/features/access/request-access.ts         validazione, payload, endpoint, errori
src/features/access/request-access.test.ts    unit
src/i18n/it/access.ts                         dizionario IT
src/i18n/en/access.ts                         dizionario EN
src/i18n/{it,en}.ts                           aggregazione dizionari
src/i18n/i18n.test.ts                         parità aree
src/features/auth/LoginPage.tsx               link “Richiedi accesso”
src/features/settings/SyncSettings.tsx        link nello stato non connesso
src/vite-env.d.ts                             tipo env
.env.example                                  env documentata
scripts/test-e2e.mjs                          doppia build E2E
scripts/check-budget.mjs                      limite 210 KB motivato
tests/e2e/access.spec.ts                      E2E con endpoint
tests/e2e/access-missing.spec.ts              E2E senza endpoint
tests/e2e/auth.spec.ts                        link da login e sync
tests/e2e/a11y.spec.ts                        route nella suite axe
tests/e2e/release.spec.ts                     nessuna chiamata al caricamento
docs/adr/0026-request-access-formspree.md     decisione
docs/engineering/access-requests.md           runbook amministratore
docs/planning/evo-3a-access-request.md        questo piano
```

---

## 12. Acceptance

- [x] `/#/request-access` accessibile senza login.
- [x] Form valido, invio Formspree con endpoint pubblico e mock E2E.
- [ ] Notifica reale all’amministratore e submission di prova sul form Formspree di produzione. _(manuale: richiede l’account Formspree)_
- [x] Conferma in pagina; nessuna email al richiedente su Free (documentato in UI, ADR e runbook).
- [x] Nessun utente/account/membership creato.
- [x] Endpoint pubblico, nessun secret.
- [x] Nessun analytics/cookie first-party.
- [x] IT/EN, axe, 375/1440, focus e label.
- [x] Route lazy; budget verde (JS iniziale 206,6/210 KB).
- [x] ADR-0026, runbook, deployment env, STATUS/TASKS/CHANGELOG/testing.
- [x] `npm run check`, `npm run test:e2e`, `npm run test:e2e:auth`, `npm run test:e2e:sync`, `npm run db:test` verdi.
- [ ] Deploy di produzione e smoke, solo dopo aver impostato `VITE_ACCESS_REQUEST_ENDPOINT` su Vercel.

---

## 13. Rischi

| Rischio                                | Mitigazione                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Spam o bot                             | Honeypot `_gotcha`, Restrict to domain, filtri Formspree; niente captcha              |
| Limite 50 invii/mese                   | Monitorare il dashboard; il form mostra errore 429; valutare EVO-3b/Pro solo se serve |
| Formspree down                         | Errore `network`/`server`, campi conservati, riprova                                  |
| Endpoint dimenticato in produzione     | La pagina mostra “modulo non disponibile”; deploy checklist                           |
| Dati personali oltre la retention      | Runbook: cancellare submission e email dopo decisione o entro 12 mesi                 |
| Endpoint sbagliato                     | Validazione solo `https://formspree.io/f/...`; test E2E                               |
| Aspettativa di un’email di conferma    | Microcopy esplicita: nessuna email automatica                                         |
| Aspettativa di approvazione automatica | Microcopy e runbook: l’amministratore crea l’utente manualmente                       |
| Budget                                 | Pagina lazy; solo le stringhe restano nel bundle iniziale; limite 210 KB motivato     |

---

## 14. Gate

```bash
npm run check
npm run test:e2e
npm run test:e2e:auth
npm run test:e2e:sync   # solo Supabase locale, mai produzione
npm run db:test
```

`npm run smoke:production` solo dopo un deploy. `test:e2e:sync` non va eseguito contro la produzione.

---

## 15. Riferimenti

- `docs/adr/0026-request-access-formspree.md`
- `docs/engineering/access-requests.md`
- `docs/engineering/deployment.md` §1.1
- `docs/engineering/testing.md`
- `docs/planning/evolutive.md`
- `docs/planning/i18n-inventory.md`
- `docs/adr/0024-supabase-auth-workspace.md`
- `docs/adr/0025-google-oauth.md`
- Formspree: https://formspree.io/plans
