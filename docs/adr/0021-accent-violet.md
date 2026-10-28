# ADR-0021 — Accento viola

**Stato:** Accettato; supera il punto 1 di ADR-0015 e il blu del punto 3 di ADR-0016
**Data:** 28 ottobre 2026

## Contesto

ADR-0015 ha scelto per Strato un solo blu di dato (`#1d5fbf`), declinato in tema scuro come `#4f8fe0` da ADR-0016. Dopo la v1.0.0 il committente ha chiesto di valutare due varianti di accento, viola e gialla, prima di fissare il colore definitivo. I vincoli restano quelli di Strato: un solo accent, chrome ink e grigio, WCAG 2.1 AA su testo, focus e confini dei controlli, stampa sempre in bianco e nero.

La variante gialla è stata provata e scartata. Un giallo pieno non raggiunge i contrasti AA per link, focus e testo; la versione ocra accessibile si avvicina troppo all'ambra semantica di `--color-warning`, rendendo ambigui gli avvisi informativi. La variante viola è stata scelta dopo due correzioni di densità: `#6d28d9` era troppo chiara, `#4c1d95` troppo scura nel tema chiaro.

## Decisione

1. **Un solo accent viola.** `--color-data` diventa `#5b21b6` nel tema chiaro e `#9d7bf5` nel tema scuro. Restano accent anche `--color-selection` (`#ddd6fe` / `#3b2a66`) e la pill informativa (`#f5f3ff` / `#5b21b6` in chiaro, `#2a1f45` / `#c4b5fd` in scuro).
2. **Il chrome non cambia.** Sidebar, titoli, tabelle e pulsanti secondari restano ink e grigi; l'azione primaria resta ink. Il viola marca il dato, il focus, i link e lo stato informativo.
3. **La barra “Completa i dati” usa l'accent.** Nel riepilogo del calcolatore l'avviso di dati incompleti passa da `tone="warning"` a `tone="info"`: la barra sinistra è viola, mentre il titolo e la pillola “Da completare” continuano a comunicare l'avviso. Il colore non è l'unica informazione.
4. **Semantica invariata.** `positive`, `negative` e `warning` mantengono i valori e i ruoli esistenti. La pillola “Da completare” resta ambra.
5. **Nessun cambio al motore.** Formule, unità, `engineVersion`, snapshot, schema di persistenza e dati salvati non cambiano.

## Contrasti verificati

| Coppia                | Chiaro  | Scuro   |
| --------------------- | ------- | ------- |
| accent su surface     | 8,98:1  | 5,35:1  |
| accent su ground      | 8,10:1  | 5,78:1  |
| pill info (ink su bg) | 8,19:1  | 8,24:1  |
| ink su selection      | 14,26:1 | 10,98:1 |

Il focus ring usa l'accent con offset 2 px; il contrasto resta sopra 5:1 su entrambi i temi. La stampa riporta `data` a nero.

## Alternative considerate

- **Blu originale `#1d5fbf` / `#4f8fe0`.** Direzione di ADR-0015/0016, superata dalla scelta del committente.
- **Viola `#6d28d9`.** Prima variante provata: leggibile, ma meno densa di quanto richiesto.
- **Viola `#4c1d95`.** Seconda variante: troppo scura nel tema chiaro, si avvicinava all'ink.
- **Giallo `#facc15` / ocra `#956300`.** Il giallo pieno non passa AA per testo e focus; l'ocra accessibile collide con `--color-warning`. Scartato.
- **Info blu separata dall'accent.** Non necessaria con il viola: info e dato restano lo stesso tono e la palette resta più semplice.

## Conseguenze

- `src/index.css` aggiorna i token chiari e scuri; `public/favicon.svg` usa il viola chiaro.
- `src/features/calculator/SummaryPanel.tsx` usa `tone="info"` per la barra “Completa i dati”; la pillola di stato resta `warning`.
- I test E2E `design-system.spec.ts` e `add-line.spec.ts` verificano il nuovo accent; `npm run check` resta verde.
- Le baseline visive Linux vanno rigenerate per tutti gli screenshot, perché l'accent compare in ogni schermata.
- `docs/design/design-system.md` e `docs/design/directions.md` sono aggiornati; ADR-0015 e ADR-0016 restano validi per il resto e sono superati solo nella parte blu.
- Nessun impatto su dominio, formule, `engineVersion`, schema, snapshot, export/import o privacy.
