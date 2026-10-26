# ADR-0018 — Sincronizzazione cloud opzionale e gratuita

**Stato:** Accettato; richiesto il 26/10/2026 (implementazione da iniziare)
**Data:** 26 ottobre 2026

## Contesto

La v1 è local-first: nessun backend, nessun account, dati in `localStorage`. Due utenti vorrebbero ritrovare gli stessi preventivi su dispositivi diversi, ma senza pagare un abbonamento e senza rendere il cloud obbligatorio.

Il committente ha chiesto di rimandare la sincronizzazione e di mantenerla **totalmente gratuita**. I piani free cambiano nel tempo: la decisione deve includere un fallback locale e un controllo periodico dei limiti.

Nota: l'interfaccia `DataRepository` descritta in ADR-0001 è oggi sincrona. Un adapter cloud richiede un refactor async dello store, da pianificare prima di scrivere codice.

## Decisione

1. **Il cloud è opzionale.** Local-only resta completo e utilizzabile senza account. La sincronizzazione si attiva solo se l'utente la configura.
2. **Solo piani gratuiti.** Nessuna carta di credito, nessun upgrade automatico, nessun costo ricorrente. Se il provider cambia limiti o mette in pausa il progetto, l'app continua in locale e avvisa.
3. **Richiesta.** Il committente ha chiesto il sync il 26/10/2026. Si implementa dopo import `.3mf`, interfaccia inglese ed export `.xlsx`. Provider scelto: **Supabase Free**; auth con **magic link** e due utenti pre-creati; **workspace condiviso** con RLS per household.
4. **Dati sincronizzati.** Configurazione e preventivi; la bozza corrente, il tema e la lingua restano locali. I preventivi sono modificabili finché `saved` (ADR-0020) e diventano immutabili dopo invio/completamento; si sincronizzano con tombstone per archiviazione/eliminazione.
5. **Conflitti espliciti.** Per le entità di configurazione si usa un timestamp per entità e, in caso di conflitto, una scelta visibile all'utente. Per i preventivi non si sovrascrive: si aggiunge.
6. **Sicurezza.** Solo chiave anonima nel client, RLS sul provider, TLS, nessuna service role key nel bundle. La cifratura end-to-end è una valutazione successiva, non un requisito del primo spike.
7. **Backup prima del primo sync.** L'export JSON resta sempre disponibile e viene proposto prima di attivare la sincronizzazione.
8. **Nessun backend in v1.** Questa decisione vale solo per la fase 5 e non cambia la v1 già rilasciata.

## Aggiornamento 26/10/2026

Il committente ha chiesto esplicitamente il sync cloud con login, database e tabelle. Decisioni prese:

- provider **Supabase Free**, con regione EU e RLS;
- **magic link**, due utenti pre-creati, signup pubblico disabilitato;
- **workspace condiviso**: entrambi gli utenti vedono la stessa configurazione e gli stessi preventivi;
- pausa del progetto free dopo 7 giorni di inattività da mitigare con un keep-alive GitHub Actions ogni 2–3 giorni;
- schema normalizzato per entità (stampanti, materiali, tariffe, extra, impostazioni, preventivi), non un unico documento JSON;
- implementazione non iniziata; restano aperti cifratura end-to-end, conflitti e tombstone.

## Alternative considerate

- **Supabase subito.** Auth, RLS e Postgres pronti; il piano free si mette in pausa dopo una settimana di inattività. Viable per due utenti con un keep-alive, ma da verificare.
- **Cloudflare Workers + D1.** Limiti gratuiti generosi e nessuna pausa; richiede auth e sincronizzazione scritti a mano.
- **Firebase Spark.** Firestore e Auth gratuiti entro limiti; buona integrazione, ma vendor lock-in e modello NoSQL.
- **PocketBase self-hosted.** Software gratuito, ma serve un host: non è “totalmente gratuito” senza un server già disponibile.
- **GitHub come database.** Scomodo, con rate limit e senza garanzie di concorrenza; scartato.
- **Sincronizzazione obbligatoria con account.** Contraria al local-first e al requisito di gratuità.

## Conseguenze

- Refactor async di `DataRepository`/store, da fare con test di contratto.
- Nuova UI Impostazioni → Sincronizzazione, con stato, invito, conflitti e disattivazione.
- Nuove tabelle/metadati di sync separati dal dominio, per non cambiare le entità esistenti.
- Test di conflitto, offline, quota esaurita e due dispositivi.
- Controllo annuale dei limiti free; se cambiano, si resta local-only o si cambia provider.
- Il piano operativo e il confronto dei provider sono in `docs/planning/phase-5.md` §4.
