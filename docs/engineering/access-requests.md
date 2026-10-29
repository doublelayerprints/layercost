# Richieste di accesso — runbook amministratore

**Stato:** EVO-3a implementato e configurato il 29/10/2026
**Ambito:** lettura delle richieste, creazione manuale dell’utente, retention, cancellazione e troubleshooting
**Decisione:** `docs/adr/0026-request-access-formspree.md`
**Piano:** `docs/planning/evo-3a-access-request.md`

**Stato configurazione (29/10/2026):** form Formspree di produzione e test creati; endpoint impostati in `.env.local` e su Vercel (Production/Preview/Development); notifica email all’amministratore verificata; progetti separati; **Restrict to Domain = `layercost.vercel.app`** sul progetto di produzione. Pagina distribuita in produzione (`index-B6Cg37Ap.js`), submission reale e smoke verdi. Resta la pulizia delle submission di prova.

Questo runbook è la procedura per gestire le richieste che arrivano dalla pagina pubblica `/#/request-access`. Non contiene endpoint reali, email o credenziali: i valori tra `<...>` vanno sostituiti al momento dell’esecuzione e non vanno committati.

---

## 1. Come funziona

1. La persona apre `https://layercost.vercel.app/#/request-access`.
2. Compila email (obbligatoria), nome e messaggio (opzionali), accetta la nota privacy e invia.
3. Il browser invia un `POST` JSON a Formspree con `_subject = "LayerCost — richiesta accesso cloud"` e `_replyto = email del richiedente`.
4. Formspree manda una notifica all’amministratore. Il richiedente **non** riceve un’email automatica: la conferma è nella pagina.
5. L’amministratore legge la richiesta, decide e, se accoglie, crea l’utente con la procedura di `docs/engineering/workspace-runbook.md`.
6. La richiesta non crea utenti, account, membership o workspace. Non esiste un’approvazione automatica.

---

## 2. Setup del form Formspree

### 2.1 Produzione

1. Accedere a Formspree e creare un form **Free** dedicato alla produzione.
2. Verificare l’email dell’amministratore e attivare la notifica per ogni submission.
3. Aprire le impostazioni del **progetto** (non del singolo form) e verificare:
   - **Restrict to Domain**: `layercost.vercel.app` (senza `https://`);
   - notifica all’email dell’amministratore;
   - `_subject` e `_replyto` accettati;
   - filtro spam attivo.
4. Inviare una submission di prova dal sito di produzione o dal preview e verificare:
   - arrivo della notifica;
   - oggetto `LayerCost — richiesta accesso cloud`;
   - reply-to uguale all’email inserita;
   - nome e messaggio visibili;
   - nessuna autoresponse al richiedente.
5. Copiare l’endpoint pubblico (`https://formspree.io/f/<id>`) e impostarlo su Vercel:
   - **Production**: endpoint di produzione;
   - **Preview** e **Development**: endpoint di test.
6. Rideployare o promuovere un deployment che includa la variabile. La variabile è pubblica: non è un segreto.

> **Restrict to Domain è un’impostazione di progetto**, non del singolo form. Se il form di test è nello stesso progetto, la restrizione vale anche per lui e le submission da `localhost` o dalle preview finiscono in spam. Sposta il form di test in un **progetto separato** (Form Settings → Move Form) e applica la restrizione solo al progetto di produzione. La restrizione usa il `Referer`: il header Vercel `strict-origin-when-cross-origin` è compatibile; Brave può ometterlo e finire in spam.

### 2.2 Locale

1. Creare un **secondo form** Formspree di test, separato da quello di produzione.
2. Se il progetto di produzione usa **Restrict to Domain**, mettere il form di test in un **progetto separato** senza restrizione: l’impostazione è di progetto e altrimenti bloccherebbe `localhost` e le preview.
3. Mettere il suo endpoint in `.env.local` (gitignored):
   ```bash
   VITE_ACCESS_REQUEST_ENDPOINT=https://formspree.io/f/<id-test>
   ```
4. Non usare il form di produzione per i test locali.
5. Se l’endpoint manca, la pagina mostra “Il modulo non è disponibile in questa build” e il form è disabilitato: è il comportamento atteso, non un bug.

### 2.3 Limiti Free

- **50 invii/mese** per form.
- Archivio submission **30 giorni**.
- Nessun export.
- Nessuna autoresponse.
- Se il limite viene raggiunto, Formspree può rifiutare le submission: l’app mostra un errore e invita a riprovare. Monitorare il dashboard, soprattutto dopo un annuncio pubblico.
- Se servono più invii o autoresponse, valutare Formspree Professional o EVO-3b (Edge Function + Brevo/Resend). Non cambiare piano senza una decisione esplicita.

---

## 3. Lettura e gestione di una richiesta

1. Aprire la notifica Formspree o il dashboard **Submissions**.
2. Controllare:
   - email del richiedente (e `_replyto`);
   - nome e messaggio;
   - data e ora;
   - eventuale segnalazione spam.
3. Rispondere manualmente all’indirizzo del richiedente, se serve. Non usare la funzione “reply” del servizio se non è configurata: usare il client email dell’amministratore.
4. Decidere se accogliere la richiesta. Criteri suggeriti:
   - persona conosciuta o presentata;
   - uso coerente con il workspace condiviso;
   - disponibilità a condividere lo stesso archivio;
   - nessun rischio di spam o abuso.
5. Se la richiesta è accolta, creare l’utente **manualmente** con `docs/engineering/workspace-runbook.md` (sezione utenti/membership). Non creare utenti dalla pagina di richiesta: non è previsto.
6. Se la richiesta è rifiutata, rispondere all’indirizzo indicato, se ritenuto opportuno, e cancellare la submission e l’email secondo la retention.
7. Non inserire nelle note della richiesta dati economici, preventivi o informazioni del workspace.

---

## 4. Creazione manuale dell’utente

La richiesta non crea l’account. Dopo l’approvazione:

1. Aprire il dashboard Supabase del progetto `layercost-prod`.
2. Creare l’utente con **Authentication → Users → Add user**, email confermata e password robusta generata dal password manager.
3. Assegnare la membership al workspace `ws-doublelayer` con il ruolo concordato (`owner` o `editor`) seguendo `docs/engineering/workspace-runbook.md`.
4. Comunicare le credenziali in modo sicuro, fuori dall’email di notifica Formspree.
5. Se l’utente userà Google, seguire la sezione Google del runbook workspace (auto-link o “Collega Google”).
6. Verificare il primo login e il sync con lo smoke o una prova manuale.

---

## 5. Retention e cancellazione

| Dato                | Dove                         | Retention                         | Azione                                                             |
| ------------------- | ---------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Submission del form | Formspree                    | 30 giorni (Free)                  | Si cancella automaticamente; si può cancellare prima dal dashboard |
| Email di notifica   | Casella dell’amministratore  | Fino alla decisione o max 12 mesi | Cancellare dopo la decisione o entro 12 mesi                       |
| Risposta manuale    | Casella dell’amministratore  | Come sopra                        | Cancellare insieme alla richiesta                                  |
| Utente creato       | Supabase `auth.users`        | Finché l’account è attivo         | Offboarding secondo `workspace-runbook.md`                         |
| Membership          | Supabase `workspace_members` | Finché l’account è attivo         | Rimuovere in offboarding                                           |

Regole:

- Non conservare le richieste in fogli di calcolo o backup non necessari.
- Se la richiesta è stata rifiutata, cancellare submission ed email appena possibile.
- Se la richiesta è stata accolta, conservare solo il minimo necessario per l’account e cancellare l’email di richiesta dopo la decisione o entro 12 mesi.
- Formspree Free non offre export: non costruire un archivio parallelo.
- La cancellazione di un utente o di una membership segue il runbook workspace; non cancellare dati referenziati senza backup.

---

## 6. Privacy

- **Titolare:** l’amministratore del workspace LayerCost.
- **Processore:** Formspree (USA) per la consegna del modulo.
- **Dati:** solo email, nome e messaggio inseriti nel form. Nessun dato dell’app, preventivo, configurazione o credenziale.
- **Consenso:** obbligatorio; senza consenso il form non invia.
- **Nessun analytics, cookie first-party o newsletter.**
- **Nessuna email automatica al richiedente** con il piano Free.
- **Nessuna approvazione automatica** e nessuna creazione di utenti/account/membership.
- Per richieste di accesso, rettifica o cancellazione, rispondere all’email del richiedente e applicare la retention.

---

## 7. Troubleshooting

| Sintomo                                       | Causa probabile                                            | Azione                                                               |
| --------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| “Il modulo non è disponibile in questa build” | `VITE_ACCESS_REQUEST_ENDPOINT` mancante o non valida       | Impostare la env su Vercel/local e rideployare                       |
| Errore di rete                                | Offline, ad blocker, CORS o Formspree irraggiungibile      | Controllare connessione, riprovare; verificare il form nel dashboard |
| Errore 429                                    | Limite Free o troppe richieste                             | Attendere, controllare il dashboard; valutare piano/EVO-3b           |
| Errore 5xx                                    | Formspree down                                             | Riprovare più tardi; i campi restano compilati                       |
| La submission non arriva                      | Restrict to domain, filtro spam o email di notifica errata | Controllare impostazioni del form e spam                             |
| Il richiedente non riceve email               | Comportamento atteso su Free                               | Spiegare che la conferma è in pagina; rispondere manualmente         |
| Il richiedente pensa di avere un account      | La richiesta non crea account                              | Spiegare la procedura manuale e i tempi                              |
| L’endpoint è nel bundle                       | È pubblico per decisione                                   | Non è un segreto; non metterci dati sensibili                        |
| Honeypot compilato                            | Bot o autofill                                             | La pagina mostra la conferma ma non invia; controllare il traffico   |

---

## 8. Checklist

### Dopo il deploy

- [ ] `VITE_ACCESS_REQUEST_ENDPOINT` impostata su Production e Preview.
- [ ] Form di produzione con Restrict to domain `layercost.vercel.app`.
- [ ] Notifica all’amministratore verificata.
- [ ] `_subject` e `_replyto` verificati.
- [ ] Submission di prova ricevuta e leggibile.
- [ ] Nessuna autoresponse al richiedente.
- [ ] Form disabilitato se la env manca (prova su build locale senza env).
- [ ] Link da login e da SyncSettings funzionanti.
- [ ] 375/1440 px, tastiera, focus, axe.
- [ ] Limite 50/mese e archivio 30 giorni annotati.

### Dopo una richiesta

- [ ] Letta la submission e verificato il reply-to.
- [ ] Risposta manuale inviata, se serve.
- [ ] Decisione presa.
- [ ] Utente creato manualmente solo se accolto.
- [ ] Submission/email cancellate secondo la retention.
- [ ] Nessun dato economico o del workspace copiato nella richiesta.

---

## 9. Riferimenti

- `docs/adr/0026-request-access-formspree.md`
- `docs/planning/evo-3a-access-request.md`
- `docs/engineering/workspace-runbook.md` — utenti, membership, reset, offboarding, Google
- `docs/engineering/deployment.md` §1.1 — env Vercel
- `docs/engineering/testing.md` — test E2E e budget
- Formspree: https://formspree.io/plans
