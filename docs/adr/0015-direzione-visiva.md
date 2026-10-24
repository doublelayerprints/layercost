# ADR-0015 — Direzione visiva: Strato

**Stato:** Accettato
**Data:** 24 ottobre 2026

## Contesto

La fase 4 parte da `docs/design/ui-brief.md`: UI italiana, base chiara, WCAG 2.1 AA, 375/1440 px, stampa/PDF, nessuna libreria di componenti, nessun cambiamento a dominio, formule, snapshot o persistenza.

T4.2 chiede 2–3 direzioni, una scelta motivata e un ADR. La skill `design-taste-frontend`, nel percorso per le schermate applicative, ha dealato due stili per il kind `commerce` e il tema light: `achromatic-ledger` (seed `924240909`) e `framed-sheet` (seed `251014707`). Le specifiche complete, con palette, tipografia e wireframe, sono in `docs/design/directions.md`.

## Decisione

Si adotta la direzione **A — Strato** (`achromatic-ledger`), con queste scelte:

1. **Chrome senza colore.** Sidebar, titoli, tabelle e pulsanti secondari in ink e grigi; il terreno è una pietra calda a bassa croma (`#f4f3f1`), le superfici sono bianche. L'unico blu (`#1d5fbf`) è il dato: la banda più grande dello stack dei costi e il focus.
2. **Due voci tipografiche.** Archivo per l'interfaccia e i numeri correnti; Source Serif 4 per il prezzo totale e per il documento stampato. Entrambi self-hosted in WOFF2, subset latin, licenza OFL 1.1, con `font-display: swap` e preload. Nessun CDN di Google Fonts. Il sheet dealava Geist: è stato ridisegnato (redraw del type) perché Geist è il volto stock citato dalla guida app-screens e perché il denaro chiede un serif con cifre tabulari. Archivo è variabile 400–600; Source Serif 4 è un'istanza statica 600.
3. **Firma: lo stack dei costi.** Quattro bande — Materiale; Macchina (energia, ammortamento, manutenzione); Lavoro ed extra (manodopera e extra di riga e di lavoro); Rischio (riserva guasti). Le larghezze sono proporzionali agli importi in µ€, i pixel si arrotondano con il resto più grande, le bande sotto il 3% si accorpano in "Altro". La banda più grande prende il blu. Legenda con nome e importo; la tabella dettaglio resta la fonte completa.
4. **Shell open plane.** Sidebar da 256 px, nessuna top bar; canvas massimo 1200 px, padding 24 px. Calcolatore a 7/12 input e 5/12 risultato, con risultato sticky a ≥ 1024 px e in fondo alla colonna a 375 px.
5. **Il risultato è vivo.** Prezzo, costo pieno, margine e stack si aggiornano mentre si digita; T4.4 aggiunge il controllo "Kobra 3 / Kobra X" nel riquadro risultato, che ricalcola e mostra il delta in place usando il confronto già esistente.
6. **Base chiara, movimento minimo.** Nessuna dark mode in v1; nessuna animazione d'ingresso, solo feedback; `prefers-reduced-motion` rispettato.
7. **Correzione di accessibilità al sheet.** Il bordo dei campi interattivi è `#8a8a8a` (3,45:1 su bianco) invece del `#d4d4d4` del sheet (1,48:1), che non passa WCAG 1.4.11. I separatori non interattivi restano chiari.

## Alternative considerate

- **B — Commessa** (`framed-sheet`, seed `251014707`): telaio tinted blu-grigio, foglio bianco inset, scheda preventivo identica su schermo e carta, IBM Plex Sans. È più forte sul documento e sulla stampa, ma il job principale è il calcolo e il nome LayerCost chiede una struttura di costo, non un documento. Resta documentata in `docs/design/directions.md`; un cambio futuro richiede un nuovo ADR che supera questo.
- **`pastel-consumer`**: nato per wallet e budgeting, con tinte pastello per categoria e raggio 20 px. Non regge form densi, tabelle di breakdown e stampa A4.
- **`accent-ladder`**: il suo movimento è pensato per piani, trial, badge e growth nudge; LayerCost non ha piani, quindi le tinte d'area sarebbero decorative.
- **Una terza direzione forzata**: non fatta. La libreria ne deala due per questo kind e tema; T4.2 accetta 2–3 direzioni e non è stato usato un kind che non descrive il prodotto solo per ottenere un terzo stile.

## Conseguenze

- T4.3 ha implementato i token e i componenti della direzione; T4.4 ridisegna le schermate ed esegue il gate visivo (`inspect.mjs --app`, screenshot 1440/768/390, critique).
- Due font self-hosted, 58 KB WOFF2 totali: subset latin, preload, licenze OFL accanto ai file.
- Lo stack è una utility di presentazione: raggruppa le bande e alloca i pixel in µ€ con il resto più grande; ha un test unitario per somma esatta, zero e bande sotto il 3%. Nessun cambio di dominio.
- Il gate visivo `inspect.mjs --app` segnala `font-not-dealt` perché il type è stato ridisegnato rispetto al sheet (Geist → Archivo + Source Serif 4). È un redraw motivato e documentato; il gate si esegue con `--allow font-not-dealt`.
- Il bordo dei campi e i contrasti sono già verificati; il gate visivo finale resta in T4.4.
- La stampa A4 è un requisito: A stampa un foglio ledger con lo stack in toni di grigio, legenda e importi.
- Nessun cambiamento a formule, unità, snapshot, persistenza, export/import o hash routing.
- Il design system e il redesign possono ancora cambiare dettagli, ma non la direzione senza un nuovo ADR.
