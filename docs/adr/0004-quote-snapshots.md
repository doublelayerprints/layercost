# ADR-0004 — Preventivi come snapshot immutabili

**Stato:** Accettato, parzialmente superato dall'ADR-0020 (modificabile finché `saved`, bloccato dopo invio/completamento)
**Data:** 2026-10-23

### Contesto

Tariffe elettriche, prezzi dei materiali e parametri delle stampanti cambiano. Un preventivo salvato deve poter essere ricaricato e mostrato con i numeri del giorno in cui è stato creato.

### Decisione

Ogni preventivo salvato contiene:

- input e tariffe risolte al momento del salvataggio;
- la versione del motore;
- il risultato calcolato.

Modificare la configurazione non altera i preventivi salvati. "Aggiorna ai prezzi correnti" crea una copia. Il preventivo originale non è modificabile nei prezzi.

### Alternative considerate

- **Riferimenti live a materiali/stampanti:** semplici, ma i vecchi preventivi cambierebbero.
- **Configurazioni versionate:** elegante, ma più complesso e con molti puntatori.
- **Nessuno storico:** inaccettabile per preventivi e confronti.

### Conseguenze

- Riproducibilità completa.
- Duplicazione di dati nello storage; accettabile per centinaia di preventivi.
- Le entità referenziate non si cancellano, si archiviano (ADR-0008).
- La versione del motore permette di spiegare eventuali differenze nei ricalcoli.

---
