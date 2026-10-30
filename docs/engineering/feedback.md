# Suggerimenti — configurazione e gestione

**Stato:** form Formspree di produzione e test creati, `VITE_FEEDBACK_ENDPOINT` configurata in `.env.local` e su Vercel (Production/Preview/Development), submission reale sul form di test verificata il 30/10/2026; deploy dell'app da fare
**ADR:** `docs/adr/0030-docs-and-feedback.md`
**Piano:** `docs/planning/evo-6-docs-feedback.md`
**Pagina:** `/#/feedback`

Questa pagina riceve miglioramenti, segnalazioni di problemi e messaggi generici. Non crea account, non modifica il workspace e non invia dati dell’app.

---

## 1. Cosa contiene il messaggio

| Campo Formspree | Obbligatorio | Note                                                                                                          |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `type`          | sì           | `improvement`, `bug` o `other`                                                                                |
| `area`          | sì           | calcolatore, preventivi, stampanti, materiali, tariffe, extra, import, confronto, impostazioni, cloud o altro |
| `title`         | sì           | massimo 120 caratteri, dopo il trim                                                                           |
| `description`   | sì           | massimo 2000 caratteri, dopo il trim                                                                          |
| `email`         | no           | massimo 254 caratteri; se presente diventa `_replyto`                                                         |
| `privacy`       | sì           | consenso esplicito                                                                                            |
| `_subject`      | automatico   | `LayerCost — suggerimento`                                                                                    |
| `_replyto`      | se c’è email | indirizzo del mittente                                                                                        |
| `_gotcha`       | no           | honeypot; se compilato non parte alcuna richiesta                                                             |

Non vengono inviati preventivi, configurazione, bozza, backup, sessione o altri dati dell’app.

## 2. Creare i form Formspree

Servono **due progetti/form separati**:

1. **Produzione** — form reale, con **Restrict to Domain = `layercost.vercel.app`**.
2. **Test** — form separato, senza restrizione, usato da `localhost` e dalle preview. Non usare il form di produzione in locale: finirebbe spam e mescolerebbe le submission.

I due form sono già stati creati il 30/10/2026. Gli endpoint sono configurati in `.env.local` (test) e su Vercel: **Production** usa il form reale, **Preview/Development** il form di test. La submission reale sul form di test è stata verificata dall'app; resta da verificare quella di produzione dopo il deploy e da cancellare la submission di test.

Per ogni form:

1. Apri Formspree e crea un nuovo form.
2. Copia l’endpoint `https://formspree.io/f/<id>`.
3. Imposta la notifica email all’amministratore.
4. Aggiungi i campi `type`, `area`, `title`, `description`, `email`, `privacy` e `_gotcha` (Formspree li accetta dal payload JSON; non serve ricrearli a mano).
5. Nel progetto di produzione attiva **Restrict to Domain** con `layercost.vercel.app`.
6. Verifica la prima submission dal form di test e poi da produzione.

## 3. Configurare l’app

In `.env.local` (non committato), endpoint del form di test già impostato:

```bash
VITE_FEEDBACK_ENDPOINT=https://formspree.io/f/xljjwrlw
```

Su Vercel la variabile è già impostata:

- **Production:** endpoint del form reale;
- **Preview e Development:** endpoint del form di test.

L’endpoint è pubblico e finisce nel bundle: non è un segreto. Se manca o non è un URL Formspree valido, la pagina mostra “Modulo non disponibile” e disabilita il form.

## 4. Privacy e retention

- Formspree è il processore (USA) e conserva le submission per **30 giorni**.
- Non c’è autoresponse: la conferma è in pagina; l’amministratore risponde manualmente se l’email è presente.
- Il piano Free include **50 invii/mese** e nessun export.
- Non ci sono analytics, cookie first-party, newsletter o tracciamento.
- Non inserire dati personali o sensibili nella descrizione; la pagina lo ricorda prima dell’invio.
- Dopo la gestione, cancella la submission dal dashboard Formspree secondo la retention.

## 5. Verifica

```bash
npm run test:e2e
```

`scripts/test-e2e.mjs` costruisce con `VITE_FEEDBACK_ENDPOINT=https://formspree.io/f/layercost-feedback-e2e`, esegue `tests/e2e/feedback.spec.ts` con Formspree mockato e poi ricostruisce senza endpoint per `tests/e2e/feedback-missing.spec.ts`.

Verifica manuale dopo il deploy:

1. Apri `/#/feedback`.
2. Invia un messaggio reale con email e consenso.
3. Controlla la notifica e il `_replyto`.
4. Controlla che non ci siano scritture Supabase.
5. Cancella la submission di prova.

La submission sul form di test è già stata verificata: la pagina ha mostrato “Suggerimento inviato” e la notifica è arrivata. La submission di test va cancellata dal dashboard Formspree. La submission sul form di produzione va fatta solo dopo il deploy, quando Vercel userà l’endpoint di produzione.

## 6. Rollback

- Rimuovi `VITE_FEEDBACK_ENDPOINT` da Vercel o impostala a vuoto: la pagina resta raggiungibile ma il form è disabilitato.
- In alternativa disabilita il form dal dashboard Formspree.
- La documentazione non dipende dal form e può restare.

## 7. Troubleshooting

| Sintomo                          | Causa probabile                            | Azione                                                      |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| “Modulo non disponibile”         | env assente o URL non Formspree            | Controlla la env e ricostruisci                             |
| Errore di rete                   | adblock, rete o CORS                       | Riprova; il form usa `fetch` con `Accept: application/json` |
| 429                              | troppe richieste                           | Attendi e riprova                                           |
| 4xx                              | payload rifiutato o dominio non consentito | Controlla Restrict to Domain e i campi                      |
| Nessuna email                    | notifica Formspree non configurata         | Controlla il dashboard del form                             |
| Submission di test in produzione | form sbagliato nella env                   | Usa il form di test per Preview/Development                 |
