# ADR-0013 — oxlint al posto di ESLint in v0.1

**Stato:** Accettato
**Data:** 23 ottobre 2026

## Contesto

Il piano iniziale prevedeva ESLint + Prettier. Lo scaffold Vite 8 ha incluso **oxlint** con una configurazione minima già funzionante. Il progetto è piccolo, TypeScript strict e i test coprono il dominio.

## Decisione

Usare **oxlint** per il lint e Prettier per la formattazione. Non installare ESLint in v0.1.

## Alternative considerate

- **ESLint + plugin React/a11y:** più ecosistema, ma più configurazione e dipendenze.
- **Biome:** unico tool, ma meno integrato nello scaffold attuale.
- **Nessun lint:** inaccettabile.

## Conseguenze

- Lint più veloce e meno dipendenze.
- Le regole di accessibilità non sono automatizzate; la checklist UI resta manuale.
- Se il progetto cresce o serve una regola specifica, si può aggiungere ESLint con un nuovo ADR.
