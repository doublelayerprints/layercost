# ADR-0001 — App statica local-first, senza backend in v1

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Due utenti, uso personale, volontà di spendere zero e di non mantenere un server. I dati sono prezzi, stampanti, materiali e preventivi: non servono collaborazione in tempo reale né elaborazioni server. C'è però la possibilità futura di sincronizzare i dati tra due dispositivi.

### Decisione

La v1 è una SPA statica, senza backend e senza account. I dati vivono in `localStorage`, con export/import JSON e link condivisibili per i singoli preventivi. L'accesso ai dati passa da un'interfaccia `DataRepository` asincrona, così un adapter cloud potrà essere aggiunto senza toccare dominio e UI.

### Alternative considerate

- **Supabase subito:** sincronizzazione reale, ma auth, RLS, gestione conflitti, limiti del piano free e dipendenza esterna.
- **Server proprio:** costo e manutenzione non giustificati.
- **Foglio di calcolo:** semplice ma fragile, difficile da condividere e da versionare.

### Conseguenze

- Nessun costo di hosting oltre al piano gratuito.
- Privacy: i dati non lasciano il browser.
- Rischio di perdita dati: mitigato da export/import visibile e promemoria di backup.
- Niente collaborazione live; i link sono snapshot in sola lettura.
- La sincronizzazione futura richiederà un ADR dedicato su conflitti e merge.

---
