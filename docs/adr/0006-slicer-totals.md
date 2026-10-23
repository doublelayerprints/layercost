# ADR-0006 — Grammi dello slicer = totale, nessun supplemento AMS automatico

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Lo slicer riporta il filamento totale usato, comprensivo di supporti, brim, purge/flush e prime tower. La Kobra X con ACE 2 Pro ha cambi colore con retrazione ridotta, ma il purge è comunque già contato dallo slicer. Aggiungere una percentuale automatica per AMS/ACE rischia di contare due volte lo stesso materiale.

### Decisione

L'input `grams` è il totale dello slicer, senza supplementi automatici. La UI lo dichiara esplicitamente. Non esiste una percentuale di purge automatica. Chi vuole aggiungere un margine può usare la riserva guasti o un extra, con consapevolezza.

### Alternative considerate

- **Stimare il purge separatamente:** richiede dati per materiale, colore e sistema; duplica ciò che lo slicer già sa.
- **Chiedere grammi “modello” e aggiungere il purge:** più errori possibili.

### Conseguenze

- Se l'utente inserisce i grammi corretti, il costo è corretto.
- La UI deve essere chiara: “usa il totale riportato dallo slicer”.
- I test golden assumono grammi totali.

---
