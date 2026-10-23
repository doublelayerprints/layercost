# ADR-0008 — Archiviare, non cancellare, le entità referenziate

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Materiali e stampanti cambiano nel tempo. Cancellare un materiale usato da un preventivo storico romperebbe la possibilità di modificare o comprendere quel preventivo, anche se lo snapshot contiene i dati.

### Decisione

Le entità hanno un flag `archived`. Le entità archiviate:

- non compaiono nelle nuove selezioni;
- restano visibili nei preventivi storici;
- possono essere riattivate.

La cancellazione definitiva è consentita solo se l'entità non è referenziata da nessun preventivo. In caso contrario, la UI propone l'archiviazione.

### Alternative considerate

- **Cancellazione a cascata:** distrugge storia.
- **Solo snapshot, cancellazione libera:** i preventivi funzionano, ma la gestione diventa confusa.

### Conseguenze

- Più disciplina nella UI (filtri “mostra archiviati”).
- Storage leggermente più grande.
- I preventivi restano comprensibili.

---
