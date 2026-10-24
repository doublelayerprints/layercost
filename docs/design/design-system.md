# Design system — Strato

**Stato:** T4.3 e T4.4 implementati; T4.5 da fare
**Data:** 24 ottobre 2026
**Direzione:** A — Strato (`achromatic-ledger`), ADR-0015
**Ambito:** token, tipografia, componenti, accessibilità e stampa. La composizione delle schermate è stata applicata in T4.4.

---

## 1. Principi

1. **Token prima di tutto.** Colori, font, raggi, ombre e dimensioni del denaro sono token in `src/index.css`. I componenti non contengono hex.
2. **Superfici piatte.** Nessuna ombra a riposo; l'unica eccezione è il dialogo, che flotta davvero.
3. **Un solo blu di dato.** Il chrome è ink e grigio; `--color-data` segna la banda più grande dello stack e il focus.
4. **Una scala tipografica di cinque passi.** 34 / 24 / 16 / 14 / 12 px. Source Serif 4 solo per il denaro e il documento.
5. **Focus immediato.** Anello 2 px `--color-data`, offset 2 px, nessuna transizione sull'outline.
6. **Base chiara, movimento minimo.** Solo feedback; nessuna animazione d'ingresso; `prefers-reduced-motion` rispettato.
7. **La stampa è un output di prima classe.** A4, niente chrome, testi e bordi leggibili in bianco e nero.
8. **Semantica e accessibilità.** HTML semantico, label associate, errori con `aria-describedby`, target 44 px su touch.

---

## 2. Token

### 2.1 Colore

| Token                      | Valore    | Utility principali           | Uso                                                    |
| -------------------------- | --------- | ---------------------------- | ------------------------------------------------------ |
| `--color-ground`           | `#f4f3f1` | `bg-ground`                  | sfondo pagina, pietra calda a bassa croma              |
| `--color-surface`          | `#ffffff` | `bg-surface`                 | card, campi, pannello risultato                        |
| `--color-raised`           | `#efeeeb` | `bg-raised`                  | superfici secondarie, hover, voce attiva               |
| `--color-line`             | `#e3e1dc` | `border-line`, `divide-line` | bordi non interattivi, separatori                      |
| `--color-rule`             | `#eeede9` | `border-rule`                | righe di tabella                                       |
| `--color-control`          | `#8a8a8a` | `border-control`             | bordo dei campi interattivi (3,45:1 su bianco)         |
| `--color-ink`              | `#0a0a0a` | `text-ink`, `bg-ink`         | testo, numeri, azione primaria                         |
| `--color-muted`            | `#6b6b6b` | `text-muted`                 | etichette, unità, testo secondario                     |
| `--color-data`             | `#1d5fbf` | `text-data`, `bg-data`       | banda più grande dello stack, focus, stato informativo |
| `--color-selection`        | `#c7d8f1` | `::selection`                | selezione del testo                                    |
| `--color-positive`         | `#2e7d32` | `text-positive`              | successo, delta favorevole                             |
| `--color-negative`         | `#c4242a` | `text-negative`              | errore, delta sfavorevole, azione distruttiva          |
| `--color-warning`          | `#92400e` | `text-warning`               | stime, avvisi                                          |
| `--color-pill-neutral-bg`  | `#eeeeee` | `bg-pill-neutral-bg`         | badge neutro                                           |
| `--color-pill-neutral-ink` | `#3d3d3d` | `text-pill-neutral-ink`      | testo badge neutro                                     |
| `--color-pill-success-bg`  | `#dcfae5` | `bg-pill-success-bg`         | badge di successo                                      |
| `--color-pill-success-ink` | `#04250e` | `text-pill-success-ink`      | testo badge di successo                                |
| `--color-pill-info-bg`     | `#e8f0fb` | `bg-pill-info-bg`            | badge informativo                                      |
| `--color-pill-info-ink`    | `#1d5fbf` | `text-pill-info-ink`         | testo badge informativo                                |
| `--color-pill-warning-bg`  | `#fffbeb` | `bg-pill-warning-bg`         | badge di avviso                                        |
| `--color-pill-warning-ink` | `#92400e` | `text-pill-warning-ink`      | testo badge di avviso                                  |
| `--color-pill-danger-bg`   | `#ffedea` | `bg-pill-danger-bg`          | badge di errore                                        |
| `--color-pill-danger-ink`  | `#831c1e` | `text-pill-danger-ink`       | testo badge di errore                                  |

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
- `public/favicon.svg` e `<meta name="theme-color">`: colori statici dell'asset, fuori dai componenti.
- `QuotePrint`: dimensioni in `pt` e lockup del wordmark.
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

### 3.7 EmptyState

Superficie bianca con bordo `--color-line`, titolo 16/600, descrizione 14 muted, azione. Nessuna illustrazione, nessun riquadro tratteggiato.

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

---

## 5. Stampa

- A4, margini 14 mm, corpo 11 pt, piccolo 9 pt, totale 18 pt. Il layout stampa è in `QuotePrint`; il wrapper di `Layout` ha `print:pl-0` per togliere il rientro della sidebar.
- Niente sidebar, header, pulsanti, ombre o sfondi colorati. Font Archivo per il testo; Source Serif 4 per il totale/titolo del documento dove previsto.
- I colori diventano neri/grigi: lo stack usa toni di grigio + legenda con importi; nessuna informazione affidata al colore.
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

- `src/lib/cost-bands.test.ts` — 6 test: somma esatta delle bande, moltiplicazione per la quantità, ordine, lavoro, zero, accorpamento sotto il 3%.
- `src/lib/cost-details.test.ts` — 4 test: componenti che sommano al costo diretto, costo pieno da diretto + quota fissa, totali di colonna, prezzo allocato.
- `src/lib/format.test.ts` — 3 test: arrotondamento dei centesimi simmetrico, roundtrip dei centesimi interi (property test), formattazione it-IT.
- `tests/e2e/design-system.spec.ts` — 2 test:
  1. token e font caricati (`--color-ground`, `--color-data`, `--color-control`, Archivo, Source Serif 4);
  2. a 375 px: bordo campo 1 px `#8a8a8a`, altezza 44 px, focus 2 px `#1d5fbf`, primario ink senza ombra, nessun overflow orizzontale, menu mobile che apre e chiude.
- I test allegano screenshot di base a 1440 e 375 px al report Playwright.

### 7.2 Manuali

- Screenshot a 1440, 768 e 390 px del calcolatore vuoto e compilato, del menu mobile, del dettaglio preventivo, del confronto, delle anagrafiche, delle impostazioni e della stampa.
- `inspect.mjs --app` a 1440/768/390: **0 FAIL, 1 WARN**. Il WARN è `ragged-row`: il pannello risultato è una rail sticky alta meno del form, come da wireframe §3.4 della direzione. Non è una coppia di card affiancate da bilanciare: mentre si scorre, il pannello resta in vista.
- Tastiera: skip link con anello da 2 px `#1d5fbf`; apertura e chiusura con Esc del dialogo di condivisione; focus restituito al pulsante che l’ha aperto.
- A 390 px nessuna delle route (calcolatore, preventivi, dettaglio, stampanti, materiali, tariffe, extra, impostazioni, confronto, link condiviso) produce scroll orizzontale della pagina. Le tabelle larghe scorrono dentro il proprio contenitore (`relative overflow-x-auto`).
- Stampa: PDF A4 generato da Chrome con `@page` 14 mm, stack in toni di grigio, totali allineati, footer presente. Safari non è stato verificato in questa sessione (nessun binario WebKit locale): resta il residuo di T3.8.
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

### 8.3 Resta per T4.5/T4.6

- Safari e stampa reale su più browser (T3.8 resta `[~]`).
- Audit automatico `axe` e percorso completo da tastiera sulle schermate secondarie (T3.11 resta `[~]`).
- Stati vuoti/errore/caricamento e rifiniture di microcopy (T4.5).
- Test visuali di regressione e preview Vercel (T4.6).
- Nessun cambio a token, formule, unità, snapshot o persistenza senza un nuovo ADR/test.

---

## 9. Mappa dei file

| File                              | Contenuto                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.css`                   | `@font-face`, `@theme`, base, focus, `transition-feedback`, stampa                                                                   |
| `src/components/ui.tsx`           | Button, Card, Badge, Field, Input, Select, Textarea, Toggle, Alert, Modal, EmptyState, Stat, Price, PageHeader, InfoDot, Table, Tabs |
| `src/components/field-context.ts` | id di label/hint/error condivisi                                                                                                     |
| `src/components/cost-stack.tsx`   | stack dei costi                                                                                                                      |
| `src/lib/cost-bands.ts`           | raggruppamento delle bande e test                                                                                                    |
| `src/lib/cost-details.ts`         | componenti per riga in centesimi, allineati al costo diretto mostrato                                                                |
| `src/lib/format.ts`               | formattazione it-IT e arrotondamento dei centesimi                                                                                   |
| `src/lib/format.test.ts`          | test dei centesimi e della formattazione                                                                                             |
| `src/components/logo.tsx`         | marchio a tre strati                                                                                                                 |
| `src/assets/fonts/`               | WOFF2 self-hosted                                                                                                                    |
| `public/fonts/`                   | licenze OFL                                                                                                                          |
| `tests/e2e/design-system.spec.ts` | token, focus, responsive, menu                                                                                                       |
