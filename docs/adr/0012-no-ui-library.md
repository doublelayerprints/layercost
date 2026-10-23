# ADR-0012 — Nessuna libreria di componenti prima del design

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

La UI funzionale serve per validare i flussi, ma il design verrà rifatto con una skill dedicata. Adottare ora shadcn/Radix/MUI creerebbe uno stile e un'API da smontare dopo.

### Decisione

Nella fase funzionale usare HTML semantico + Tailwind + pochi componenti interni. Nessuna libreria di componenti, nessun design system definitivo. La fase 4 introduce token e componenti dopo una direzione di design scelta.

### Alternative considerate

- **shadcn/Radix subito:** velocizza, ma vincola il design e aggiunge codice da rifare.
- **MUI/Ant:** stile difficile da personalizzare e bundle pesante.

### Conseguenze

- UI funzionale meno rifinita, ma onesta.
- La fase di design parte da zero senza debiti visivi.
- I componenti interni devono essere minimi e accessibili.

---

## Indice

| ADR  | Tema                                  |
| ---- | ------------------------------------- |
| 0001 | Static local-first, sync-ready        |
| 0002 | React + Vite + TypeScript             |
| 0003 | Unità intere e arrotondamenti         |
| 0004 | Preventivi come snapshot              |
| 0005 | Potenza media, non nominale           |
| 0006 | Grammi slicer totali, no doppio purge |
| 0007 | Hash routing e hosting portabile      |
| 0008 | Archiviare invece di cancellare       |
| 0009 | Dominio puro                          |
| 0010 | Costo/prezzo separati, UI italiana    |
| 0011 | Documentazione normativa              |
| 0012 | Nessuna libreria UI prima del design  |
