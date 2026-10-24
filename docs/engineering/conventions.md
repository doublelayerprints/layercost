# Convenzioni

**Stato:** v1.0.0

---

## 1. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`.
- Nessun `any`.
- Preferire `type` a `interface` per le unioni, `interface` per gli oggetti estendibili.
- Import espliciti; `verbatimModuleSyntax` attivo: usare `import type` per i tipi.
- Alias `@/` per `src/`.

## 2. File e naming

- File in `kebab-case.ts` / `kebab-case.tsx`.
- Componenti in `PascalCase`.
- Hook con prefisso `use`.
- Costanti in `SCREAMING_SNAKE_CASE`.
- Un componente per file quando possibile.
- Test vicini al codice (`*.test.ts`) o in `tests/e2e`.

## 3. Dominio

- Funzioni pure, input/output espliciti.
- Unità intere: µ€, bp, secondi, cg, W, Wh.
- Niente React, Zustand, Zod, browser o storage.
- Arrotondamenti nell'ordine documentato.
- Errori con `DomainError` e messaggi in italiano.
- `now` e `id` non vengono creati nel dominio.

## 4. UI

- HTML semantico prima dei `div`.
- Ogni input ha label o `aria-label` e unità visibile.
- Errori vicini al campo.
- Focus visibile.
- Tabelle con scroll orizzontale controllato.
- Formattazione it-IT con `Intl`.
- Nessuna libreria di componenti prima della fase 4.
- Nessun colore come unica informazione.
- Rispettare `prefers-reduced-motion` per le animazioni future.

## 5. Stato

- Lo store orchestra; non calcola.
- Le azioni persistono dopo ogni modifica.
- Il draft è autosalvato.
- I preventivi salvati non si modificano: duplicazione o copia aggiornata.

## 6. Dati

- Repository astratto; storage solo in `data/`.
- Zod ai confini.
- Migrazioni versionate.
- Backup prima di import/reset.
- Archiviazione invece di cancellazione per le entità referenziate.

## 7. Formattazione e lint

```bash
npm run lint      # oxlint
npm run format    # Prettier
npm run typecheck
```

Prettier: niente punti e virgola, single quote, trailing comma, 100 colonne.

## 8. Git

Conventional Commits:

- `feat:` nuova funzionalità
- `fix:` correzione
- `docs:` documentazione
- `test:` test
- `refactor:` refactor senza cambio di comportamento
- `chore:` manutenzione

Un task = un commit o una PR piccola. Non fare force push su `main`. Non committare segreti, `node_modules`, `dist`, `test-results`.

## 9. Versioning

- `package.json`: `1.0.0` per la release stabile.
- `ENGINE_VERSION`: `0.1.0`; cambiare quando cambiano le formule.
- SemVer:
  - major: schema/risultati incompatibili;
  - minor: nuove funzionalità o formule;
  - patch: fix senza cambio di risultati.

## 10. Test

- Un test per ogni formula.
- Property test per invarianti.
- E2E per il flusso critico.
- Niente snapshot fragili sui numeri.
- Aggiornare i golden case insieme al codice.

## 11. Deviazioni consapevoli dal piano

- **oxlint** al posto di ESLint: già integrato, più veloce, sufficiente.
- **Application layer nello store**: non c'è ancora una cartella `application/`; se i casi d'uso crescono, estrarla.
- **Snapshot completo della configurazione** invece di un elenco di tariffe per riga: più semplice e altrettanto riproducibile.
- **Prezzi di riga al netto IVA**: l'IVA è mostrata sul totale.

Queste deviazioni sono documentate qui e non cambiano gli invarianti di dominio.
