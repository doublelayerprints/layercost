# ADR-0002 — React + Vite + TypeScript

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Serve una SPA statica, veloce da sviluppare, con una UI che verrà ridisegnata in una fase successiva. Il codice deve essere manutenibile da un agente e testabile.

### Decisione

React 19 + TypeScript strict + Vite. Tailwind CSS per la UI funzionale. Nessun framework full-stack.

### Alternative considerate

- **Next.js:** SSR e routing server non necessari; aggiunge complessità e lock-in.
- **SvelteKit:** ottimo, ma ecosistema e familiarità inferiori per questo progetto.
- **Vanilla JS:** troppo facile da degradare senza tipi e componenti.

### Conseguenze

- Build statica e deploy immediato.
- TypeScript strict come rete di sicurezza.
- La UI può essere rifatta senza toccare il dominio.
- Vite e React evolvono rapidamente: lockfile e aggiornamenti periodici.

---
