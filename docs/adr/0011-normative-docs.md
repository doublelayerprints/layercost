# ADR-0011 — Documentazione normativa e ADR

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Il progetto sarà sviluppato in più sessioni da agenti diversi. Senza una fonte di verità, le formule e le decisioni si disallineano.

### Decisione

- `docs/domain/cost-model.md` è **normativo**: codice e test devono corrispondere.
- Ogni formula ha un golden case nella documentazione e nei test.
- Ogni decisione importante ha un ADR.
- `PLAN.md`, `TASKS.md` e `AGENTS.md` sono aggiornati insieme al codice.
- Se codice e documentazione divergono, è un bug.

### Alternative considerate

- **Solo commenti nel codice:** insufficienti per un agente e per le decisioni.
- **Wiki esterna:** rischio di divergenza e lock-in.

### Conseguenze

- Più lavoro di documentazione, ma meno ambiguità.
- Le modifiche alle formule sono più lente e sicure.
- Un nuovo agente può orientarsi leggendo pochi file.

---
