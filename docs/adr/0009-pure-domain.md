# ADR-0009 — Dominio puro e separato dalla UI

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

La UI verrà ridisegnata con una skill di design. Le formule devono restare stabili, testabili e indipendenti dal framework.

### Decisione

Il dominio:

- non importa React, Zustand, Zod, `localStorage` o `window`;
- riceve input validati e parametri espliciti (`now`, `id`);
- restituisce risultati puri e deterministici;
- è testato con Vitest e `fast-check`.

La validazione con Zod avviene ai confini (form, storage, import). L'application layer orchestra i casi d'uso.

### Alternative considerate

- **Logica nei componenti/hook:** veloce all'inizio, difficile da testare e da rifare.
- **Servizi con dipendenze globali:** meno deterministici.

### Conseguenze

- Più boilerplate iniziale.
- Test veloci e affidabili.
- La UI può cambiare senza toccare le formule.
- I confini sono espliciti.

---
