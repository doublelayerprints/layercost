# ADR-0005 — Energia da potenza media per famiglia, non da potenza nominale

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

La potenza nominale di una stampante è il massimo dei riscaldatori, non il consumo medio. La Kobra 3 è dichiarata 400 W ma in PLA misura ~180–205 W; in ASA a letto 100 °C sale verso ~400 W. La Kobra X è dichiarata 1450 W a 220 V. Usare la nominale gonfia il costo di 2–8 volte.

### Decisione

Ogni stampante ha profili di potenza media per famiglia di materiale, con un default. Per una riga multi-materiale si usa la potenza più alta tra le famiglie presenti, perché il letto è condiviso e la temperatura dominante è quella del materiale più esigente. È possibile inserire un override in Wh misurato con una presa intelligente.

La potenza nominale resta nel profilo solo come informazione.

### Alternative considerate

- **Potenza nominale:** semplice e sbagliata.
- **Un unico wattaggio per stampante:** ignora la differenza PLA/ABS.
- **Modello termico a componenti (letto, hotend, motori):** più preciso ma troppo complesso per la v1.

### Conseguenze

- Stime ragionevoli e migliorabili con misurazioni.
- La UI deve spiegare la differenza tra stimato e misurato.
- L'energia di avvio è approssimata alla potenza media.
- Un futuro import da presa intelligente può calibrare i profili.

---
