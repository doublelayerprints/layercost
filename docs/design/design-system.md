# Design system — Strato

**Stato:** T4.3, T4.4, T4.5, T4.7 e T4.6 completati; v1.0.0 rilasciata
**Data:** 24 ottobre 2026
**Direzione:** A — Strato (`achromatic-ledger`), ADR-0015 · tema scuro ADR-0016
**Ambito:** token, tipografia, componenti, accessibilità e stampa. La composizione delle schermate è stata applicata in T4.4.

---

## 1. Principi

1. **Token prima di tutto.** Colori, font, raggi, ombre e dimensioni del denaro sono token in `src/index.css`. I componenti non contengono hex.
2. **Superfici piatte.** Nessuna ombra a riposo; l'unica eccezione è il dialogo, che flotta davvero.
3. **Un solo blu di dato.** Il chrome è ink e grigio; `--color-data` segna la banda più grande dello stack e il focus.
4. **Una scala tipografica di cinque passi.** 34 / 24 / 16 / 14 / 12 px. Source Serif 4 solo per il denaro e il documento.
5. **Focus immediato.** Anello 2 px `--color-data`, offset 2 px, nessuna transizione sull'outline.
6. **Due temi, movimento minimo.** Tema chiaro e scuro (ADR-0016), con preferenza Sistema/Chiaro/Scuro; la stampa resta sempre chiara. Solo feedback; nessuna animazione d'ingresso; `prefers-reduced-motion` rispettato.
7. **La stampa è un output di prima classe.** A4, niente chrome, testi e bordi leggibili in bianco e nero.
8. **Semantica e accessibilità.** HTML semantico, label associate, errori con `aria-describedby`, target 44 px su touch.

---

## 2. Token

### 2.1 Colore

| Token                      | Valore                | Utility principali           | Uso                                                    |
| -------------------------- | --------------------- | ---------------------------- | ------------------------------------------------------ |
| `--color-ground`           | `#f4f3f1`             | `bg-ground`                  | sfondo pagina, pietra calda a bassa croma              |
| `--color-surface`          | `#ffffff`             | `bg-surface`                 | card, campi, pannello risultato                        |
| `--color-raised`           | `#efeeeb`             | `bg-raised`                  | superfici secondarie, hover, voce attiva               |
| `--color-line`             | `#e3e1dc`             | `border-line`, `divide-line` | bordi non interattivi, separatori                      |
| `--color-rule`             | `#eeede9`             | `border-rule`                | righe di tabella                                       |
| `--color-control`          | `#8a8a8a`             | `border-control`             | bordo dei campi interattivi (3,45:1 su bianco)         |
| `--color-ink`              | `#0a0a0a`             | `text-ink`, `bg-ink`         | testo, numeri, azione primaria                         |
| `--color-muted`            | `#6b6b6b`             | `text-muted`                 | etichette, unità, testo secondario                     |
| `--color-data`             | `#1d5fbf`             | `text-data`, `bg-data`       | banda più grande dello stack, focus, stato informativo |
| `--color-selection`        | `#c7d8f1`             | `::selection`                | selezione del testo                                    |
| `--color-positive`         | `#2e7d32`             | `text-positive`              | successo, delta favorevole                             |
| `--color-negative`         | `#c4242a`             | `text-negative`              | errore, delta sfavorevole, azione distruttiva          |
| `--color-warning`          | `#92400e`             | `text-warning`               | stime, avvisi                                          |
| `--color-scrim`            | `rgb(10 10 10 / 0.4)` | `bg-scrim`                   | velo del dialogo                                       |
| `--color-pill-neutral-bg`  | `#eeeeee`             | `bg-pill-neutral-bg`         | badge neutro                                           |
| `--color-pill-neutral-ink` | `#3d3d3d`             | `text-pill-neutral-ink`      | testo badge neutro                                     |
| `--color-pill-success-bg`  | `#dcfae5`             | `bg-pill-success-bg`         | badge di successo                                      |
| `--color-pill-success-ink` | `#04250e`             | `text-pill-success-ink`      | testo badge di successo                                |
| `--color-pill-info-bg`     | `#e8f0fb`             | `bg-pill-info-bg`            | badge informativo                                      |
| `--color-pill-info-ink`    | `#1d5fbf`             | `text-pill-info-ink`         | testo badge informativo                                |
| `--color-pill-warning-bg`  | `#fffbeb`             | `bg-pill-warning-bg`         | badge di avviso                                        |
| `--color-pill-warning-ink` | `#92400e`             | `text-pill-warning-ink`      | testo badge di avviso                                  |
| `--color-pill-danger-bg`   | `#ffedea`             | `bg-pill-danger-bg`          | badge di errore                                        |
| `--color-pill-danger-ink`  | `#831c1e`             | `text-pill-danger-ink`       | testo badge di errore                                  |

### 2.1.1 Tema scuro

Il tema scuro è un **grafite caldo**, non nero puro: conserva la famiglia cromatica della pietra. Si attiva con `data-theme="dark"` sull'elemento `html`; `color-scheme` passa a `dark` per i controlli nativi.

| Token                      | Valore scuro       | Note                                     |
| -------------------------- | ------------------ | ---------------------------------------- |
| `--color-ground`           | `#141413`          | canvas, sidebar, sfondo pagina           |
| `--color-surface`          | `#1c1c1a`          | card, campi, pannello risultato          |
| `--color-raised`           | `#262624`          | hover, voce attiva, superfici secondarie |
| `--color-line`             | `#3a3a35`          | bordi non interattivi                    |
| `--color-rule`             | `#2b2b28`          | righe di tabella                         |
| `--color-control`          | `#75756f`          | bordo dei campi (3,68:1 su surface)      |
| `--color-ink`              | `#f3f2ef`          | testo, numeri, azione primaria invertita |
| `--color-muted`            | `#a8a7a0`          | etichette e testo secondario             |
| `--color-data`             | `#4f8fe0`          | dato, focus, link (5,15:1 su surface)    |
| `--color-selection`        | `#2c4a75`          | selezione del testo                      |
| `--color-positive`         | `#74c98a`          | successo e delta favorevoli              |
| `--color-negative`         | `#ef8a85`          | errore e azioni distruttive              |
| `--color-warning`          | `#e5b06a`          | stime e avvisi                           |
| `--color-scrim`            | `rgb(0 0 0 / 0.7)` | velo del dialogo                         |
| `--color-pill-neutral-bg`  | `#2c2c29`          | badge neutro                             |
| `--color-pill-neutral-ink` | `#dedcd6`          | testo badge neutro                       |
| `--color-pill-success-bg`  | `#17301d`          | badge di successo                        |
| `--color-pill-success-ink` | `#a3dfae`          | testo badge di successo                  |
| `--color-pill-info-bg`     | `#182a42`          | badge informativo                        |
| `--color-pill-info-ink`    | `#a9c9f2`          | testo badge informativo                  |
| `--color-pill-warning-bg`  | `#33260f`          | badge di avviso                          |
| `--color-pill-warning-ink` | `#f2c98a`          | testo badge di avviso                    |
| `--color-pill-danger-bg`   | `#351a1a`          | badge di errore                          |
| `--color-pill-danger-ink`  | `#f4aaa7`          | testo badge di errore                    |

- `--shadow-overlay` passa a `0 24px 64px rgb(0 0 0 / 0.6)`.
- Il fondo del canvas è dipinto già prima del bundle per chi ha il sistema scuro (`@media (prefers-color-scheme: dark)` su `html`), così non c'è un lampo bianco.
- `main.tsx` risolve la preferenza prima del primo render; `ThemeController` segue i cambi di `prefers-color-scheme` e aggiorna `<meta name="theme-color">` leggendo `--color-ground`.

### 2.2 Tipografia

| Ruolo                  | Font           | Peso / dimensione / interlinea              |
| ---------------------- | -------------- | ------------------------------------------- |
| Prezzo totale          | Source Serif 4 | 600 · 34 px (30 px mobile) · 1,05 · tabular |
| Titolo pagina          | Archivo        | 600 · 24 px · 1,2 · tracking −0,02 em       |
| Sezione                | Archivo        | 600 · 16 px · 1,35                          |
| Corpo, campi, tabelle  | Archivo        | 400/500 · 14 px · 1,45                      |
| Costo pieno            | Archivo        | 500 · 24 px · 1,2 · tabular                 |
| Etichette, unità, note | Archivo        | 400/500 · 12 px · 1,4                       |

- Font self-hosted: `src/assets/fonts/archivo-latin-var.woff2` (variabile 400–600, ~24 KB) e `source-serif-4-600-latin.woff2` (statica 600, ~35 KB). Licenze OFL 1.1 in `public/fonts/`.
- `font-display: swap`; preload in `index.html`; nessun CDN.
- Cifre tabulari su ogni numero che si allinea o si aggiorna (`tabular-nums`).
- Il sheet dealava Geist: è stato **ridisegnato** in Archivo + Source Serif 4 perché Geist è il volto stock citato dalla guida app-screens e perché il denaro chiede un serif con cifre tabulari. Il gate `inspect.mjs` si esegue con `--allow font-not-dealt`.

### 2.3 Spazio, raggi, ombre

| Token / classe            | Valore                             | Uso                               |
| ------------------------- | ---------------------------------- | --------------------------------- |
| `--radius-card`           | `8px`                              | card, pannello risultato, dialogo |
| `--radius-control`        | `6px`                              | pulsanti, campi, tab              |
| `--shadow-overlay`        | `0 24px 64px rgb(10 10 10 / 0.18)` | solo dialogo                      |
| gap orizzontale/verticale | `12px` (Tailwind `gap-3`)          | blocchi interni                   |
| spazio tra sezioni        | `24–32px`                          | ritmo delle schermate             |
| padding pagina            | `16px` mobile, `24–32px` desktop   | `main`                            |
| touch target              | `44px` sotto 640 px                | campi, pulsanti, menu             |

### 2.4 Utility del design system

- `text-price` / `text-price-sm`: 34/30 px con interlinea.
- `tracking-price`, `tracking-title`: −0,01 / −0,02 em.
- `font-serif`: Source Serif 4.
- `transition-feedback`: transizione di 150 ms su colori e bordi, **senza** `outline-color`. Non usare `transition-colors` sui controlli: animerebbe l'anello di focus.
- `tabular-nums`: cifre allineate.

### 2.5 Eccezioni ammesse

- `src/index.css`: definizione dei token e i colori `#fff`/`#000` della stampa.
- `public/favicon.svg`: colore statico dell'asset, fuori dai componenti. `<meta name="theme-color">` parte da un valore statico in `index.html` e viene aggiornato leggendo `--color-ground`.
- `QuotePrint`: dimensioni in `pt` e lockup del wordmark.
- `LineColorSwatch` / `LineColorField`: il colore del filamento è **dato dell'utente** (`#rrggbb`), non un token di design; usa uno stile inline solo per lo swatch. Non entra nei calcoli e non sostituisce il colore come informazione: il nome della stampa resta leggibile.
- Nessun'altra eccezione: i componenti e le schermate usano solo token.

---

## 3. Componenti

Tutti in `src/components/ui.tsx`, tranne `src/components/logo.tsx`, `src/components/cost-stack.tsx` e il contesto dei campi in `src/components/field-context.ts`.

### 3.1 Button

- Varianti: `primary` (ink), `secondary` (raised), `ghost` (testo muted), `danger` (negative), `subtle` (testo data).
- Taglie: `sm` 32 px, `md` 36 px, `lg` 40 px; su mobile `sm` 40, `md`/`lg` 44.
- Un solo `primary` per schermata. Niente ombre. Disabilitato: opacità 50% e cursore `not-allowed`.

### 3.2 Card

`rounded-card border border-line bg-surface`, nessuna ombra. Non annidare card per decorazione: una superficie per sezione, non una griglia di card.

### 3.3 Badge

Toni: `neutral`, `success`, `warning`, `info`, `danger`. Pill 20 px, testo 12 px. Il tono non è l'unica informazione: il testo dice lo stato ("Salvato", "Archiviato", "Stimato").

### 3.4 Field, Input, Select, Textarea, Toggle

- `Field` genera `labelId`, `hintId`, `errorId` e li passa via contesto; `Input`, `Select` e `Textarea` aggiungono automaticamente `aria-describedby` e `aria-invalid`.
- Errori: 12 px `text-negative`, `role="alert"`, associati al campo. Non usare il solo bordo rosso.
- Campi: 36 px desktop / 44 px touch; bordo 1 px `--color-control`; raggio 6; focus anello 2 px `--color-data`.
- `DurationField` usa `aria-labelledby` sul gruppo; i due input hanno label "Ore" e "Minuti".
- `Toggle`: traccia `--color-control` spenta, `--color-ink` accesa; focus visibile sulla traccia.

### 3.5 Alert

Bordo da 1 px `--color-line` e barra sinistra da 4 px nel tono (`info` data, `warning` warning, `danger` negative, `success` positive). Titolo e corpo in ink; il tono non sostituisce il testo.

### 3.6 Modal

- Portale su `document.body`, overlay `bg-ink/40`, pannello `rounded-card` e `shadow-overlay`.
- Focus trap: il primo elemento riceve il focus, Tab cicla, Esc chiude, il focus torna all'elemento precedente.
- Un solo livello di dialogo; niente modali annidati.
- Conferme distruttive e sostituzione della bozza usano `Modal`, non `window.confirm`: titolo esplicito, conseguenza nel corpo, azione pericolosa in `danger`, annullamento come prima scelta.

### 3.7 EmptyState

Superficie bianca con bordo `--color-line`, titolo 16/600, descrizione 14 muted, azione. Nessuna illustrazione, nessun riquadro tratteggiato. Ogni vuoto che nasce da un filtro o da una configurazione mancante offre la prossima azione: azzera la ricerca, mostra gli archiviati, vai alle stampanti o ai materiali.

### 3.8 Stat e Price

- `Stat`: etichetta 12 muted, valore 24/500 tabular, hint 12 muted. Usare `tone="warning"` solo per un margine negativo.
- `Price`: Source Serif 4 600, 34 px (30 mobile), con hint IVA. È il numero più grande della schermata; non duplicarlo altrove.

### 3.9 PageHeader

Titolo `h1` 24/600, descrizione 14 muted, azioni a destra. Niente eyebrow: l'etichetta sopra il titolo è stata rimossa.

### 3.10 Table

`Table` avvolge la tabella in `overflow-x-auto`. Header 12 muted sentence case, righe 14, numeri a destra, `tabular-nums`, nessuna zebra. Su mobile la tabella scorre dentro il contenitore, non fa scorrere la pagina.

### 3.11 Tabs

`Tabs` è un `tablist` con roving tabindex, frecce, Home/End, `aria-selected` e `aria-controls`. Il chiamante rende i pannelli con `role="tabpanel"`, `id="panel-<id>"` e `aria-labelledby="tab-<id>"`.

### 3.12 CostStack

- Quattro bande: Materiale, Macchina (energia + ammortamento + manutenzione), Lavoro ed extra (manodopera e extra di riga e di lavoro), Rischio (riserva guasti). La somma è esattamente il costo pieno.
- Le bande a zero non compaiono; le bande sotto il 3% si accorpano in "Altro". La tabella dettaglio resta completa.
- Larghezze proporzionali agli importi in µ€, pixel con resto più grande; la banda più grande è blu, le altre ink/grigio.
- `role="img"` con `aria-label` e legenda `<dl>` con nome e importo. Il colore non è l'unica informazione.

### 3.13 Logo

Marchio a tre strati sfalsati, 28 × 28, `currentColor`; wordmark Archivo 600 con tracking del titolo. La favicon usa la stessa forma con il primo strato blu.

### 3.14 InfoDot

Cerchio da 20 px, bordo `--color-control`, testo 12 muted, `aria-label` con la spiegazione. Non introdurre tooltip custom.

### 3.15 Selettore del tema

In Impostazioni → Aspetto: un `fieldset` con `legend` ("Tema dell'interfaccia") e tre radio native — Sistema, Chiaro, Scuro — dentro etichette-card. La radio è visibile e usa `accent-data`; la card selezionata ha bordo `--color-data` e fondo `--color-raised`. Il focus è quello nativo del controllo, quindi resta visibile anche senza classi aggiuntive. Non usare un toggle a due stati: la terza opzione "Sistema" è necessaria.

### 3.16 Preferenze rapide nella sidebar

In fondo alla sidebar desktop e nel menu mobile, `QuickPreferences` offre due gruppi compatti:

- **Tema**: Sistema / Chiaro / Scuro.
- **Lingua**: IT / EN, con nome accessibile esteso.

Sono radio native coperte da un'etichetta-pulsantino, non toggle a due stati. L'input invisibile occupa l'intera etichetta (opacità 0) così il click funziona su tutto il pulsantino e il focus ring compare sul contenitore tramite `focus-within`. L'opzione selezionata ha fondo `--color-surface` e testo `--color-ink`; le altre restano muted. Su mobile il target è 44 px. Le preferenze sono le stesse di Impostazioni: nessuna duplicazione di stato.

### 3.17 Colore del filamento

`LineColorField` è un quadratino stondato con bordo `--color-control`; vuoto mostra un bordo tratteggiato e un “+”, pieno mostra il colore scelto. Il picker è un `<input type="color">` nativo, accessibile da tastiera; “Rimuovi colore” compare solo quando c'è un colore. `LineColorSwatch` è la versione di sola lettura usata accanto al nome della stampa nel calcolatore, nel dettaglio, nella tabella costi e in stampa. Il colore è un dato, non un token: non è mai l'unica informazione e non entra nei calcoli.

---

## 4. Accessibilità

### 4.1 Contrasti verificati

| Coppia                                   | Rapporto | Esito  |
| ---------------------------------------- | -------- | ------ |
| ink su ground                            | 17,85:1  | AA/AAA |
| ink su surface                           | 19,80:1  | AA/AAA |
| muted su ground                          | 4,81:1   | AA     |
| muted su surface                         | 5,33:1   | AA     |
| data su surface                          | 6,10:1   | AA     |
| data su ground                           | 5,50:1   | AA     |
| positive su surface                      | 5,13:1   | AA     |
| negative su surface                      | 5,78:1   | AA     |
| warning su surface                       | 7,09:1   | AA     |
| bordo campo `--color-control` su surface | 3,45:1   | 1.4.11 |
| badge success (ink su bg)                | 14,77:1  | AA/AAA |
| badge danger (ink su bg)                 | 8,63:1   | AA/AAA |
| badge warning (ink su bg)                | 6,84:1   | AA     |
| badge info (ink su bg)                   | 5,31:1   | AA     |
| badge neutral (ink su bg)                | 9,36:1   | AA/AAA |

**Tema scuro (ADR-0016).**

| Coppia                                   | Rapporto | Esito  |
| ---------------------------------------- | -------- | ------ |
| ink su ground                            | 16,47:1  | AA/AAA |
| ink su surface                           | 15,25:1  | AA/AAA |
| muted su ground                          | 7,64:1   | AA/AAA |
| muted su surface                         | 7,07:1   | AA/AAA |
| data su surface                          | 5,15:1   | AA     |
| data su ground                           | 5,56:1   | AA     |
| positive su surface                      | 8,50:1   | AA/AAA |
| negative su surface                      | 7,03:1   | AA/AAA |
| warning su surface                       | 8,74:1   | AA/AAA |
| bordo campo `--color-control` su surface | 3,68:1   | 1.4.11 |
| badge success (ink su bg)                | 9,29:1   | AA/AAA |
| badge danger (ink su bg)                 | 8,49:1   | AA/AAA |
| badge warning (ink su bg)                | 9,47:1   | AA/AAA |
| badge info (ink su bg)                   | 8,51:1   | AA/AAA |
| badge neutral (ink su bg)                | 10,21:1  | AA/AAA |
| ink su selection                         | 8,00:1   | AA/AAA |

- `--color-border` e `--color-rule` sono separatori non informativi: non devono raggiungere 3:1.
- Il bordo dei campi è stato corretto rispetto al sheet (`#d4d4d4` → `#8a8a8a`) per WCAG 1.4.11.
- Il focus ring è `--color-data` con offset 2 px; su ink/surface il contrasto è ≥ 5,5:1.

### 4.2 Regole

- Ogni campo ha label visibile e unità; errori e hint sono associati via `aria-describedby`.
- Focus visibile su link, pulsanti, campi, tab e toggle. Non usare `outline-none` senza un anello sostitutivo.
- Target touch 44 px sotto 640 px.
- `prefers-reduced-motion` riduce transizioni e animazioni; non ci sono animazioni d'ingresso.
- Zero e valori mancanti sono onesti: `0` e `—`, non celle vuote.
- Le tabelle larghe scorrono dentro `Table`, non fanno scorrere la pagina.
- Il colore non è mai l'unica informazione: stati con testo, stack con legenda, delta con segno.
- Il tema scuro non è un filtro: usa token propri, mantiene i contrasti e non dipende dal colore per comunicare lo stato. La scelta del tema è esplicita e non cambia mai i dati.

---

## 5. Stampa

- A4, margini 14 mm, corpo 11 pt, piccolo 9 pt, totale 18 pt. Il layout stampa è in `QuotePrint`; il wrapper di `Layout` ha `print:pl-0` per togliere il rientro della sidebar.
- Niente sidebar, header, pulsanti, ombre o sfondi colorati. Font Archivo per il testo; Source Serif 4 per il totale/titolo del documento dove previsto.
- I colori diventano neri/grigi: lo stack usa toni di grigio + legenda con importi; nessuna informazione affidata al colore.
- La stampa è sempre chiara, anche con tema scuro: `@media print` riporta i token ai valori chiari (`ink` nero, `muted` `#525252`, `surface` bianco, `data` nero) prima di stampare.
- `print:hidden` e `.no-print` nascondono la UI; `break-inside: avoid` protegge le righe.
- Le dimensioni in `pt` sono l'unica eccezione alla scala in `px`: appartengono al mezzo stampa.

---

## 6. Movimento

- Solo feedback: hover, focus, pressione, apertura di menu/dialogo.
- `transition-feedback` 150 ms su colori e bordi; l'outline non è animato.
- Nessuna animazione d'ingresso o decorativa.
- `prefers-reduced-motion` porta le transizioni a 0,01 ms e disattiva lo scroll smooth.

---

## 7. Test e verifiche

### 7.1 Automatizzati

- `src/lib/theme.test.ts` — 3 test: valori ammessi, risoluzione di sistema, scelta esplicita che vince sulla preferenza del dispositivo.
- `src/data/theme.test.ts` — 4 test: default, valore non valido, roundtrip della preferenza, storage bloccato.
- `src/lib/draft.test.ts` — 7 test: bozza vuota, nome/cliente, tempo/grammi/quantità/extra/colore, costi di lavoro/note, modifica di prezzo, righe aggiuntive e override.
- `src/lib/color.test.ts` — 2 test: hex `#rrggbb` valido e rifiuto di nomi, forme brevi e valori non testuali.
- `src/lib/cost-bands.test.ts` — 6 test: somma esatta delle bande, moltiplicazione per la quantità, ordine, lavoro, zero, accorpamento sotto il 3%.
- `src/lib/cost-details.test.ts` — 4 test: componenti che sommano al costo diretto, costo pieno da diretto + quota fissa, totali di colonna, prezzo allocato.
- `src/lib/format.test.ts` — 3 test: arrotondamento dei centesimi simmetrico, roundtrip dei centesimi interi (property test), formattazione it-IT.
- `tests/e2e/design-system.spec.ts` — 2 test:
  1. token e font caricati (`--color-ground`, `--color-data`, `--color-control`, Archivo, Source Serif 4);
  2. a 375 px: bordo campo 1 px `#8a8a8a`, altezza 44 px, focus 2 px `#1d5fbf`, primario ink senza ombra, nessun overflow orizzontale, menu mobile che apre e chiude e mostra le preferenze rapide.
- `tests/e2e/theme.spec.ts` — 1 test: tema scuro dalla sidebar, sincronizzazione con Impostazioni, token e `meta theme-color` aggiornati, persistenza al reload, ritorno a chiaro, “Sistema” che segue `emulateMedia`, screenshot dark a 1440 px.
- `tests/e2e/locale.spec.ts` — 1 test: cambio lingua dalla sidebar, sincronizzazione con Impostazioni, `<html lang>`, titolo, persistenza al reload, salvataggio in inglese e stampa inglese anche con UI italiana.
- `tests/e2e/quote-lifecycle.spec.ts` — 1 test: azioni in alto prima del prezzo, modifica in place con lo stesso id e snapshot congelato, blocco dopo invio e completamento, duplicazione ancora disponibile.
- `tests/e2e/line-color.spec.ts` — 1 test: colore impostato, visibile nel dettaglio e in stampa, persistito nel preventivo, ricaricato in modifica e rimosso.
- `tests/e2e/states.spec.ts` — 2 test: conferma prima di scartare la bozza (Esc, focus restituito, annulla e conferma) e sostituzione della bozza dal dettaglio preventivo.
- I test allegano screenshot di base a 1440 e 375 px al report Playwright. Totale oggi: **112 unitari/dati, 35 E2E** (29 eseguiti + 6 visual su CI).

### 7.2 Manuali

- Screenshot a 1440, 768 e 390 px del calcolatore vuoto e compilato, del menu mobile, del dettaglio preventivo, del confronto, delle anagrafiche, delle impostazioni e della stampa.
- Tema scuro: screenshot di calcolatore, preventivi, impostazioni, materiali e confronto a 1440/768/390 px; nessuno scroll orizzontale a 390 px; `color-scheme: dark` sui controlli nativi; PDF A4 generato con tema scuro e token di stampa riportati al chiaro.
- Stati T4.5: modale “Iniziare un nuovo preventivo?” a 1440 e 390 px; vuoto della ricerca preventivi; confronto senza due stampanti attive; alert “Preventivo salvato” sul dettaglio. Esc chiude la modale e il focus torna a “Nuovo”.
- `inspect.mjs --app` a 1440/768/390: **0 FAIL, 1 WARN** in tema chiaro (T4.4) e **0 FAIL, 1 WARN** con il sistema in tema scuro (T4.7). Il WARN è `ragged-row`: il pannello risultato è una rail sticky alta meno del form, come da wireframe §3.4 della direzione. Non è una coppia di card affiancate da bilanciare: mentre si scorre, il pannello resta in vista.
- Tastiera: skip link con anello da 2 px `#1d5fbf`; apertura e chiusura con Esc del dialogo di condivisione; focus restituito al pulsante che l’ha aperto.
- A 390 px nessuna delle route (calcolatore, preventivi, dettaglio, stampanti, materiali, tariffe, extra, impostazioni, confronto, link condiviso) produce scroll orizzontale della pagina. Le tabelle larghe scorrono dentro il proprio contenitore (`relative overflow-x-auto`).
- Stampa: PDF A4 generato da Chrome con `@page` 14 mm, stack in toni di grigio, totali allineati, footer presente. Safari non era verificato in T4.4; la release 1.0 copre l'engine WebKit e il PDF A4, mentre una prova su stampante fisica resta manuale.
- Produzione Vercel: deploy `759ed0f` (T4.5) verificato su https://layercost.vercel.app con lo stesso gate (0 FAIL, 1 WARN); prezzo 3,70 € con il nuovo seed, conferma della bozza e alert di salvataggio verificati. Le preview deployment sono protette da SSO; la produzione è pubblica.
- `font-not-dealt` è un redraw documentato (Geist → Archivo + Source Serif 4); il gate si esegue con `--allow font-not-dealt`.

### 7.3 Comandi

```bash
npm run check
npm run test:e2e
```

---

## 8. T4.4 — esito

### 8.1 Cosa è stato applicato

- **Shell.** Open plane: sidebar da 256 px sulla pietra, hairline, righe da ~34 px, voce attiva con pill neutra. Barra mobile da 56 px con wordmark e menu; il menu porta i due gruppi di navigazione e il backup.
- **Calcolatore.** Griglia 7/12 + 5/12 con pannello risultato sticky a ≥1024 px, `max-height` a viewport meno 48 px e scroll interno su schermi bassi. Il form è una superficie bianca unica, con sezioni separate da regole da 1 px (intestazione, stampe, costi di lavoro, prezzo); le righe sono `<fieldset>` con testata editabile e non card annidate. `Price` 34 px serif, costo pieno e margine a 24 px, `CostStack`, frase del risultato e link al dettaglio.
- **Confronto rapido.** Nel pannello risultato, due stati con le stampanti attive: scegliendo l’altra si legge il costo ipotetico e il delta rispetto al preventivo corrente. La bozza non viene mai mutata.
- **Preventivi e dettaglio.** Lista tabellare con identity, stato, righe, costo, prezzo e una sola azione di riga; su mobile righe a due linee. Dettaglio con prezzo + stack, righe (tabella su desktop, card su mobile), snapshot con “Aggiorna ai prezzi correnti” e gestione (duplica, archivia, elimina) separata; una sola azione primaria per schermata.
- **Anagrafiche.** Stampanti a righe con costo orario in evidenza; materiali, extra e tariffe in tabelle con importi allineati a destra e liste a due linee su mobile. Tariffa corrente in una striscia con barra dati.
- **Impostazioni.** Colonna etichetta + pannello, sezioni separate da regole, anteprima reale del prezzo con `calculatePricing`, riepilogo dei valori correnti e azioni distruttive in fondo.
- **Condivisione.** Vista read-only con prezzo, stack, righe e dettaglio; import nel proprio archivio come azione primaria.
- **Stampa.** A4 con intestazione, meta, righe, composizione in grigi, totali e note; prezzo di riga etichettato come quota del totale; footer “Generato con LayerCost il gg/mm/aaaa”.
- **Correzioni di visualizzazione (non del motore).** Le bande dello stack moltiplicano i componenti di riga per la quantità; gli importi della legenda sono allocati in centesimi con resto più grande, così la somma coincide con il costo pieno mostrato. La tabella dettaglio alloca le sei componenti al costo diretto della riga, così righe e totali di colonna tornano al centesimo. I grammi totali includono la quantità. `formatCurrency` arrotonda i centesimi con aritmetica intera per evitare il mezzo centesimo instabile. `engineVersion`, formule, snapshot e persistenza non sono cambiati.

### 8.2 Critique (round 1 → round 2)

```text
ROUND 1
Seen in one second: un preventivo sul banco: prezzo serif a destra, form a sinistra, stack blu.
Idea: gli strati della stampa diventano gli strati del costo; il prezzo è la somma di ciò che si vede.
Live thing: prezzo e stack si aggiornano mentre si digita; il confronto rapido mostra il delta senza toccare la bozza.
Layout words by screen: calcolatore=form 7/12 + rail 5/12 / preventivi=tabella / dettaglio=prezzo+stack, righe, dettaglio / confronto=delta + tabella a due colonne / anagrafiche=righe o tabelle / impostazioni=etichetta + pannello.
Scores: design 7.5 · usability 8 · creativity 8 · content 8.5 → 7.9
Caps applied: nessuno.
Top three problems:
1. Lo stack mostrava il 43% di materiale su un lavoro da 2 pezzi: le bande non moltiplicavano per la quantità (visibile nel riquadro risultato).
2. Il nome della riga sembrava un titolo, non un campo: nessuna affordance a riposo (calcolatore, desktop e mobile).
3. Il riepilogo ripeteva lo stesso importo quando l’IVA è assente (“9,10 € netto · nessuna IVA” sotto “9,10 €”).
```

```text
ROUND 2
Seen in one second: prezzo e composizione sono la cosa più grande; il form è il passo che li produce.
Idea: invariata.
Live thing: invariato.
Layout words by screen: invariati.
Scores: design 8 · usability 8.5 · creativity 8 · content 8.5 → 8.2
Caps applied: nessuno. Il WARN ragged-row è la rail sticky, non una coppia di card.
Top three problems: nessuno dei tre del round 1 è più visibile; resta il residuo Safari/axe in §8.3.
```

**Merge:** PR #1, squash `42e60b7`; deploy di produzione verificato il 24/10/2026 (0 FAIL, 1 WARN sulla homepage pubblica).

### 8.3 Residui chiusi dalla v1.0.0

- **Safari e stampa (T3.8).** Il flusso critico gira su WebKit; la stampa è verificata con `@media print` su WebKit e con un PDF A4 su Chromium, anche partendo dal tema scuro.
- **Accessibilità (T3.11).** `@axe-core/playwright` esegue 25 scansioni su tutte le route in chiaro e scuro, menu mobile e modali inclusi: 0 violazioni WCAG 2.2 AA. Le tabelle con scroll orizzontale hanno `role="region"`, nome accessibile e `tabIndex={0}`.
- **Regressione visiva (T3.12).** 15 screenshot a 1440/768/390 px con baseline Linux; i test girano in CI e sono saltati su macOS.
- **Resta manuale:** prova su stampante fisica e con screen reader reale.
- Nessun cambio a token, formule, unità, snapshot o persistenza senza un nuovo ADR/test.

### 8.4 Dark mode — esito (T4.7)

- Preferenza **Sistema / Chiaro / Scuro** in Impostazioni → Aspetto; default “Sistema”. La scelta è salvata in `layercost:theme`, separata da `layercost:data`.
- Palette grafite calda con token dedicati, scrim nero al 70%, pill scure, ombra del dialogo più profonda. Gli stessi componenti funzionano nei due temi senza varianti `dark:` sparse.
- Applicazione prima del primo render e fallback CSS per il sistema scuro; `ThemeController` segue `prefers-color-scheme`; `<meta name="theme-color">` si aggiorna dal token.
- Stampa sempre chiara: in `@media print` i token tornano a nero su bianco, anche partendo dal tema scuro.
- Verifiche: 36 unitari/dati e 6 E2E al momento di T4.7 (oggi 42/17), gate visivo scuro 0 FAIL/1 WARN, contrasti AA, PDF A4 scuro verificato. Nessun cambiamento a formule, `engineVersion`, snapshot o schema (v1).
- **Merge:** PR #2, squash `a0960d3`; deploy di produzione verificato il 24/10/2026 con tema scuro persistito e gate 0 FAIL/1 WARN.

### 8.5 Stati e rifiniture — esito (T4.5)

- **Bozza.** L'header del calcolatore dice che la bozza si salva da sola ma entra nello storico solo con “Salva preventivo”. `NewDraftButton` confronta la bozza con una vuota (`draftHasContent`) e chiede conferma con un `Modal`; “Duplica nel calcolatore” e “Aggiorna ai prezzi correnti” usano la stessa conferma. Nessun finto banner “modifiche non salvate”: la bozza è persistita, ma non è un preventivo archiviato.
- **Eliminazioni.** Preventivo e tariffa usano un `Modal` con conseguenze esplicite; l'ultima tariffa non è eliminabile e la nota lo dice. `window.confirm` non è più usato.
- **Successo.** Dopo il salvataggio e dopo l'import di un link compare un alert “Preventivo salvato”, dismissibile. Lo stato di navigazione viene rimosso dalla history, quindi un reload non ripete il messaggio.
- **Vuoti.** La ricerca preventivi senza risultati offre “Azzera la ricerca”; se ci sono solo archiviati, “Mostra archiviati”. Il confronto con meno di due stampanti attive porta alle stampanti; senza materiali porta ai materiali.
- **Archiviati e disabilitati.** Badge testuali e azioni di ripristino restano; le entità referenziate non si cancellano. I pulsanti disabilitati hanno il motivo nel contesto (dati incompleti, ultima tariffa).
- **Loading e movimento.** Nessuna operazione asincrona oltre a import/export locali: nessuno spinner decorativo. Solo feedback; `prefers-reduced-motion` invariato.
- **Verifiche.** 42 unitari/dati, 8 E2E al momento di T4.5 (oggi 42/18), gate 0 FAIL/1 WARN, nessun overflow a 390 px. Nessun cambiamento a dominio, formule, `engineVersion`, snapshot o schema.
- **Merge:** PR #3, squash `759ed0f`; deploy di produzione verificato il 24/10/2026 con prezzo 3,70 €, conferma della bozza e alert di salvataggio.

### 8.6 Release v1.0.0 — esito (T4.6)

- **Verifiche.** 42 unitari, 18 E2E (Chromium + WebKit, 3 visual su CI), 25 scansioni axe con 0 violazioni, PDF A4 valido, nessuna richiesta esterna, budget 206 KB gzip su 350 KB.
- **Correzione.** I contenitori di tabella scrollabili sono raggiungibili da tastiera e hanno un nome accessibile, anche a 390 px.
- **Documentazione.** Checklist e risultati in `docs/engineering/release.md`; changelog in `CHANGELOG.md`; stato in `STATUS.md`.
- **Deploy.** Tag `v1.0.0` su `cc949b3` e produzione Vercel verificata con la build `index-C_5bQZYu.js`; gate visivo 0 FAIL, 1 WARN (`ragged-row`, rail sticky), prezzo 3,70 €, tema scuro persistente e PDF A4 chiaro.

### 8.7 Import `.3mf` — esito (T5.3.4)

- **Ingresso.** “Importa .3mf” nella testata del calcolatore e nella sezione Stampe, accanto ad “Aggiungi riga”. La sezione Stampe è una drop zone: durante il drag mostra un outline tratteggiato `data` e l’overlay “Rilascia il file qui”.
- **Dialogo.** Un solo `Modal` (`xl`) con file/slicer, stampante, piatti selezionabili, tempo, grammi, filamenti, colore, select materiale per filamento e avvisi globali/per piatto. I piatti incompleti sono disabilitati con motivazione; il footer spiega perché l’import è disabilitato.
- **Conferma.** Se la bozza ha contenuto, lo stesso dialogo passa allo step “Aggiungere o sostituire?”: “Indietro” secondario, “Aggiungi alla bozza” primario, “Sostituisci le righe” pericoloso. Nessun modale annidato. Nome, cliente, costi di lavoro e prezzo restano invariati.
- **Esito.** Alert di caricamento/errore/successo con `role`; focus sul nome della prima riga importata. Il pulsante primario riceve il focus quando cambia lo step.
- **Responsive e accessibilità.** A 375 px il footer va a capo, il dialogo non crea overflow e i controlli restano a 44 px; a 1440 px il dialogo resta centrato. Esc, focus trap e focus restituito usano il `Modal` esistente. Axe WCAG 2.2 AA passa anche sul modale in tema scuro.
- **Dati dinamici.** Il colore del filamento è mostrato con uno swatch solo se è un esadecimale valido; è un dato dello slicer, non un token di design, e non entra nel prezzo.

### 8.8 Rifiniture T5.15–T5.17 — esito (26/10/2026)

- **Preferenze rapide (T5.15).** `QuickPreferences` in fondo alla sidebar e nel menu mobile: tre radio per il tema e due per la lingua, sincronizzate con Impostazioni e persistenti fuori da `AppData`. L'input invisibile copre l'etichetta, quindi il click è su tutto il pulsantino; il focus ring è sul contenitore. La lingua adotta la bozza vuota e non tocca i preventivi salvati.
- **Azioni del preventivo (T5.16).** “Gestione del preventivo” è passata subito sotto testata e avvisi, prima di prezzo e righe; “Stampa / PDF” è secondaria. Il ciclo di vita e le conferme restano invariati.
- **Colore filamento (T5.17).** `PrintLine.color?: string` (`#rrggbb`) è un dato opzionale di presentazione, senza migrazione e senza impatto su formule, `engineVersion` o snapshot. Swatch nel calcolatore (picker nativo + rimozione), nel dettaglio, nella tabella costi e in stampa A4.
- **Verifiche.** `npm run check` verde (112 unitari, build, budget 284,6 KB totali su 350 KB); 35 E2E (29 eseguiti + 6 visual) verdi in locale; axe invariato a 40 scansioni con 0 violazioni. Le baseline visive a 1440/768/390 px vanno rigenerate in CI perché cambiano sidebar, dettaglio, impostazioni e preventivi (T5.15–T5.17 e T5.12).

---

## 9. Mappa dei file

| File                                              | Contenuto                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.css`                                   | `@font-face`, `@theme`, palette scura, base, focus, `transition-feedback`, stampa                                                                 |
| `src/lib/theme.ts`                                | tipi della preferenza e risoluzione sistema/chiaro/scuro                                                                                          |
| `src/lib/draft.ts`                                | rileva se la bozza contiene lavoro da non perdere                                                                                                 |
| `src/features/calculator/NewDraftButton.tsx`      | conferma accessibile prima di scartare la bozza                                                                                                   |
| `src/features/calculator/use-three-mf-import.ts`  | file input, drag & drop, parsing in worker e stati dell’import                                                                                    |
| `src/features/calculator/ThreeMfImportDialog.tsx` | anteprima piatti, mappatura stampante/materiali e conferma append/replace                                                                         |
| `src/data/theme.ts`                               | chiave `layercost:theme`, load/save fuori da `AppData`                                                                                            |
| `src/state/theme-store.ts`                        | stato Zustand della preferenza                                                                                                                    |
| `src/app/theme.ts`                                | applicazione del tema e `meta theme-color`                                                                                                        |
| `src/app/ThemeController.tsx`                     | sincronizzazione con `prefers-color-scheme`                                                                                                       |
| `src/app/QuickPreferences.tsx`                    | tema e lingua compatti in sidebar e menu mobile                                                                                                   |
| `src/features/settings/SettingsPage.tsx`          | sezione Aspetto con le tre radio                                                                                                                  |
| `src/components/line-color.tsx`                   | swatch di lettura e color picker del filamento                                                                                                    |
| `src/lib/color.ts`                                | validazione `#rrggbb` condivisa da schema e UI                                                                                                    |
| `src/components/ui.tsx`                           | Button, Card, Badge, Field, Input, Select, Textarea, Toggle, Alert, Modal, EmptyState, Stat, Price, PageHeader, InfoDot, TableScroll, Table, Tabs |
| `src/components/field-context.ts`                 | id di label/hint/error condivisi                                                                                                                  |
| `src/components/cost-stack.tsx`                   | stack dei costi                                                                                                                                   |
| `src/lib/cost-bands.ts`                           | raggruppamento delle bande e test                                                                                                                 |
| `src/lib/cost-details.ts`                         | componenti per riga in centesimi, allineati al costo diretto mostrato                                                                             |
| `src/lib/format.ts`                               | formattazione it-IT e arrotondamento dei centesimi                                                                                                |
| `src/lib/format.test.ts`                          | test dei centesimi e della formattazione                                                                                                          |
| `src/components/logo.tsx`                         | marchio a tre strati                                                                                                                              |
| `src/assets/fonts/`                               | WOFF2 self-hosted                                                                                                                                 |
| `public/fonts/`                                   | licenze OFL                                                                                                                                       |
| `tests/e2e/design-system.spec.ts`                 | token, focus, responsive, menu                                                                                                                    |
| `tests/e2e/theme.spec.ts`                         | preferenza, persistenza, sistema, screenshot scuro                                                                                                |
| `tests/e2e/states.spec.ts`                        | conferma della bozza, sostituzione dal dettaglio                                                                                                  |
| `tests/e2e/import.spec.ts`                        | import `.3mf`, drag & drop, mappatura, conferma e overflow                                                                                        |
| `tests/e2e/a11y.spec.ts`                          | axe WCAG 2.2 AA su tutte le route, chiaro/scuro, menu, modali e import                                                                            |
| `tests/e2e/webkit.spec.ts`                        | flusso critico e link condiviso su WebKit                                                                                                         |
| `tests/e2e/release.spec.ts`                       | PDF A4 chiaro da tema scuro, nessuna richiesta esterna                                                                                            |
| `tests/e2e/visual.spec.ts`                        | 15 screenshot di regressione a 1440/768/390 px                                                                                                    |
| `scripts/check-budget.mjs`                        | budget gzip di JS, CSS, font, HTML e totale                                                                                                       |
| `docs/engineering/release.md`                     | checklist e verifiche della v1.0.0                                                                                                                |
