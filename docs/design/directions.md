# Direzioni di design — LayerCost

**Stato:** T4.2 — direzione scelta: **A — Strato** (ADR-0015); accent aggiornato da ADR-0021
**Data:** 24 ottobre 2026
**Task:** T4.2 — Direzioni di design
**Input:** `docs/design/ui-brief.md`, `PLAN.md`, `AGENTS.md`, `TASKS.md`, `references/app-screens.md` della skill `design-taste-frontend`, skill `frontend-design`
**Vincoli:** fase 4; base chiara; font self-hosted; solo specifiche e wireframe; nessuna modifica a dominio, formule, snapshot o persistenza.

---

## 1. Metodo

### 1.1 Deal

La skill `design-taste-frontend` è stata usata nel percorso **app screen**, non in quello per landing page. Il deal è stato fatto con:

```bash
node <skill>/scripts/draw.mjs --app \
  --kind commerce \
  --brief "LayerCost: local-first calculator of 3D printing cost and price, quotes, printers, materials, energy tariffs" \
  --screens overview,list,detail,settings \
  --theme light \
  --options 3
```

`commerce` è il kind più vicino: un back office di piccola attività con un catalogo (stampanti, materiali), dei costi e dei preventivi. Non è `finance` (LayerCost non tiene conti o saldi) e non è `smb-admin` (non ci sono piani, trial o growth nudge).

Il deal ha restituito **due** direzioni, non tre:

| Direzione        | Stile               | Seed        | Tema  |
| ---------------- | ------------------- | ----------- | ----- |
| **A — Strato**   | `achromatic-ledger` | `924240909` | light |
| **B — Commessa** | `framed-sheet`      | `251014707` | light |

T4.2 accetta 2–3 direzioni. La libreria ne deala due quando solo due stili sono adatti al kind e al tema; non ho forzato una terza direzione con un kind che non descrive il prodotto. Le altre due provate e scartate sono documentate in §1.3.

### 1.2 Perché solo specifiche

La scelta del formato è stata fatta in conversazione: **specifiche scritte + wireframe ASCII**, senza mockup HTML. Di conseguenza:

- T4.2 verifica: coerenza con `ui-brief.md`, gerarchia dei dati, contrasti WCAG calcolati, token, wireframe, rischi.
- T4.2 **non** esegue il gate visivo della skill (`inspect.mjs`, screenshot 1440/768/390, critique). Quel gate si esegue in **T4.4**, quando le schermate esistono.
- I mockup non sono un deliverable: i wireframe qui sotto servono a decidere la direzione, non a stimare pixel.

### 1.3 Direzioni scartate

| Stile             | Perché non è una direzione                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pastel-consumer` | Nato per wallet e budgeting: tinte pastello per categoria, raggio 20 px, tono consumer. Non regge un form denso, una tabella di breakdown e la stampa A4. |
| `accent-ladder`   | Il suo movimento è fatto per piani, trial, badge e growth nudge. LayerCost non ha piani né progress track: le tinte d'area diventerebbero decorazione.    |

Restano nell'ADR come alternative considerate, non come direzioni da sviluppare.

### 1.4 Cosa non cambia

- Dominio, formule, unità, arrotondamenti, `engineVersion`.
- Snapshot economico, modificabilità fino all’invio (ADR-0020), export/import, migrazioni.
- Hash routing e build statica.
- Nessun backend, account, analytics o cookie.
- Dark mode aggiunta in T4.7 con ADR-0016; nessuna animazione oltre il feedback.
- Nessuna libreria di componenti o di grafici.
- I font sono self-hosted: niente CDN di Google Fonts.

---

## 2. Inventario

### 2.1 Dati e grandezze

| Oggetto         | Campi che contano nella UI                                                                                        | Grandezza tipica                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Stampante       | nome, prezzo, residuo, vita in ore, manutenzione €/h, potenza media per famiglia, avvio, multicolore, volume      | 2 macchine; 15.000–20.000 h; €299–€449 |
| Materiale       | famiglia, prezzo €/kg, peso netto, fornitore, colore, override guasti                                             | 8 materiali; €20–€60/kg                |
| Tariffa energia | etichetta, €/kWh, decorrenza, override per stampante                                                              | 1 tariffa attiva; €0,20–€0,35/kWh      |
| Extra           | nome, importo, per unità o per lavoro                                                                             | 5 voci; €0,03–€6,00                    |
| Impostazioni    | manodopera €/h, guasti, maggiorazione tempo, modalità prezzo, ricarico/margine, arrotondamento, IVA, ripartizione | 0–30%; 0–22% IVA                       |
| Riga            | stampante, materiali + grammi, tempo slicer, quantità, finitura, override, extra                                  | 20–800 g; 1–12 h; 1–20 pezzi           |
| Preventivo      | nome, data, cliente, stato, righe, costi di lavoro, snapshot, risultato                                           | 1–10 righe; €2–€80                     |
| Archivio        | preventivi salvati e archiviati, ricerca per nome                                                                 | 0–100 preventivi                       |

I numeri dei wireframe sono **illustrativi**, non golden case: servono a mostrare la gerarchia e a verificare che le quote si sommino. I golden case restano in `docs/domain/golden-cases.md`.

### 2.2 Persone e lavoro

- **Tancredi** — Kobra 3, hobby e piccoli lotti. Apre l'app davanti allo slicer, spesso da telefono: inserisce tempo e grammi, legge il prezzo, salva.
- **La sua amorosa** — Kobra X con ACE 2 Pro, stampe multicolore. Stesso flusso, con più materiali per riga e il dubbio "quanto è costato davvero questo colore?".
- **Futuro uso commerciale** — preventivi con margine e IVA, da stampare o condividere.

Il job più frequente è **calcolare e leggere il prezzo**; il secondo è **salvare e condividere**. La configurazione è un job periodico, non quotidiano.

### 2.3 Domanda unica per schermata

| Schermata                               | Domanda                                                  | Cosa è più grande                                        |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Calcolatore                             | Quanto costa e quanto devo chiedere per questo lavoro?   | Prezzo totale, poi costo pieno e margine                 |
| Preventivi                              | Quale preventivo devo aprire, duplicare o aggiornare?    | La lista, con il totale di ogni preventivo               |
| Dettaglio preventivo                    | Da cosa è composto questo prezzo e posso condividerlo?   | Prezzo totale + composizione del costo                   |
| Confronto                               | Quale stampante conviene su questo lavoro?               | Il delta tra le due stampanti                            |
| Stampanti / Materiali / Tariffe / Extra | I valori su cui calcolo sono corretti?                   | Il valore che guida il costo (prezzo, vita, €/kg, €/kWh) |
| Impostazioni                            | Le regole di prezzo sono quelle che voglio?              | Le regole, con l'anteprima dell'effetto                  |
| Condivisione                            | Cosa vede chi riceve il link?                            | Prezzo totale e preventivo in sola lettura               |
| Onboarding                              | Quali stime devo confermare prima di fidarmi dei numeri? | La checklist delle stime                                 |

### 2.4 Elementi comuni alle due direzioni

- **Marchio.** Simbolo di 5 strati sovrapposti, 24 × 24, con fessure di 2 px; lo strato superiore è sfalsato di 2 px a destra. È il nome che diventa forma: LayerCost = strati di costo. Wordmark "LayerCost" in 600, tracking −0,02 em. Il marchio non cambia con la direzione; cambia solo il colore (ink in A, ink/teal in B).
- **Il risultato è vivo.** Prezzo, costo pieno, margine e composizione si aggiornano mentre si digita. Un controllo a due stati "Kobra 3 / Kobra X" nel riquadro risultato ricalcola e mostra il delta in place, senza cambiare dominio: usa il confronto già esistente.
- **La frase del risultato.** Una riga sotto il totale dice il fatto che conta: "L'86% del costo è materiale" oppure "La Kobra X costa €0,42 in più". Non è una statistica decorativa: cambia con i dati e serve a capire dove intervenire.
- **Stati onesti.** Zero stampato come zero; valore mancante come "—"; preventivo archiviato con etichetta testuale; nessun colore come unica informazione.
- **Nessuna animazione d'ingresso.** Solo feedback: hover, focus, pressione, apertura di un menu o di un dialogo. `prefers-reduced-motion` rispettato.

---

## 3. Direzione A — Strato

> **Aggiornamento 28/10/2026.** L'accent blu di questa specifica T4.2 è stato sostituito dal viola di ADR-0021 (`#5b21b6` chiaro, `#9d7bf5` scuro). I valori sotto restano la documentazione della direzione originale; per i token correnti vale `docs/design/design-system.md`.

**Stile:** `achromatic-ledger` (seed `924240909`), adattato con una faccia scelta dal brief.
**Idea:** _In questa app, gli strati di una stampa diventano gli strati del costo: il preventivo è una sezione trasversale e il prezzo è la somma di ciò che si vede._

### 3.1 Faccia

- **Terreno in pietra** `#f4f3f1`, una tinta calda a bassa croma: il banco di lavoro, non il bianco di un template. Le superfici sono bianche.
- **Chrome senza colore.** Sidebar, titoli, pulsanti secondari e tabelle sono ink e grigi. L'unico blu `#1d5fbf` è il dato: la banda più grande dello stack e il focus.
- **Tipografia con due voci.** Archivo per l'interfaccia, Source Serif 4 per il denaro e per il documento. Il prezzo è l'unico numero in serif: è la cifra che si legge da lontano.
- **Marchio.** Stack di 5 strati in ink, senza colore nel chrome.

### 3.2 Palette

| Token        | Hex       | Ruolo                                | Contrasto verificato               |
| ------------ | --------- | ------------------------------------ | ---------------------------------- |
| `--ground`   | `#f4f3f1` | sfondo pietra                        | —                                  |
| `--surface`  | `#ffffff` | superfici, campi, pannello risultato | testo 19,80:1                      |
| `--raised`   | `#efeeeb` | superficie secondaria, hover di riga | muted 4,68:1                       |
| `--text`     | `#0a0a0a` | testo e numeri                       | 17,85:1 su ground                  |
| `--muted`    | `#6b6b6b` | etichette, unità, testo secondario   | 4,81:1 su ground; 5,33:1 su bianco |
| `--data`     | `#1d5fbf` | banda principale dello stack, focus  | 6,10:1 su bianco; 5,50:1 su ground |
| `--accent`   | `#141414` | azione primaria                      | 18,42:1 su bianco                  |
| `--positive` | `#2e7d32` | delta positivo                       | 5,13:1 su bianco                   |
| `--negative` | `#c4242a` | delta negativo, errori               | 5,78:1 su bianco                   |
| `--warning`  | `#92400e` | stime, avvisi                        | 7,09:1 su bianco                   |
| `--border`   | `#e3e1dc` | bordi non interattivi, separatori    | 1,2:1 (solo separazione)           |
| `--control`  | `#8a8a8a` | bordo dei campi interattivi          | 3,45:1 su bianco                   |
| `--rule`     | `#eeede9` | righe di tabella                     | 1,1:1 (solo separazione)           |

**Correzione di accessibilità al sheet.** Il token `--control` del sheet è `#d4d4d4` (1,48:1 su bianco): non passa WCAG 1.4.11 per il confine di un campo. In T4.3 si usa `#8a8a8a` (3,45:1) per i bordi dei campi; `--border` resta chiaro per i separatori non interattivi.

**Bande dello stack.** Quattro toni, tutti ≥ 3:1 sul bianco:

| Banda            | Tono      | Note                                                  |
| ---------------- | --------- | ----------------------------------------------------- |
| Banda più grande | `#1d5fbf` | il dato; cambia con i dati, non è sempre il materiale |
| Seconda          | `#0a0a0a` | ink                                                   |
| Terza            | `#6b6b6b` | grigio scuro                                          |
| Quarta / Altro   | `#8a8a8a` | grigio medio; le bande < 3% si accorpano in "Altro"   |

Fessure di 2 px in `--surface` tra le bande. La legenda ripete nome e importo; il colore non è l'unica informazione.

### 3.3 Tipografia

| Ruolo                        | Font           | Peso / dimensione / interlinea                     |
| ---------------------------- | -------------- | -------------------------------------------------- |
| Prezzo totale                | Source Serif 4 | 600 · 34 px desktop / 30 px mobile · 1,05 · `tnum` |
| Titolo pagina                | Archivo        | 600 · 24 px · 1,2 · tracking −0,02 em              |
| Sezione                      | Archivo        | 600 · 16 px · 1,35                                 |
| Corpo, campi, tabelle        | Archivo        | 400/500 · 14 px · 1,45                             |
| Costo pieno (secondo numero) | Archivo        | 500 · 24 px · 1,2 · `tnum`                         |
| Margine, unità, note         | Archivo        | 400/500 · 12–14 px · 1,4                           |
| Intestazioni tabella         | Archivo        | 500 · 12 px · 1,4 · sentence case                  |

- Cinque dimensioni: 34 / 24 / 16 / 14 / 12. Niente altri livelli.
- `font-variant-numeric: tabular-nums` su ogni numero che si aggiorna o si allinea; Source Serif 4 e Archivo hanno `tnum`.
- Niente maiuscoletto spaziato; niente monospace fuori dal codice.
- Font self-hosted, WOFF2, subset latin, `font-display: swap`, preload del serif e dell'UI. I file stanno in `src/assets/fonts/` (Vite li riscrive con il base path), le licenze OFL 1.1 in `public/fonts/`. Source Serif 4 è un'istanza statica 600 (subset latin, ~35 KB); Archivo è variabile 400–600 (~24 KB).

### 3.4 Layout

**Griglia.** Sidebar 256 px; canvas massimo 1200 px, padding 24 px; gap 12 px tra blocchi, 32 px tra sezioni; input 7/12, risultato 5/12 con gap 24 px. A 1440: `1440 − 256 − 48 = 1136`; `7/12 × (1136 − 24) ≈ 648` e `5/12 ≈ 464`. Il pannello risultato è sticky a ≥ 1024 px, con `max-height: calc(100vh − 48px)` e scroll interno solo se serve.

**Wireframe 1440 — Calcolatore**

```text
┌──────────────┬────────────────────────────────────────────────────────────┐
│ LayerCost    │ Calcolatore                    Bozza, 24/10/2026           │
│ ▦ stack      │                                                            │
│              │ ┌──────────────────────────────────┐ ┌───────────────────┐ │
│ Lavoro       │ │ Stampa                           │ │ Prezzo            │ │
│  Calcolatore │ │ Stampante   [Kobra 3        ▾]   │ │ € 9,10            │ │
│  Preventivi  │ │ Materiali                        │ │ Costo pieno € 6,98│ │
│  Confronto   │ │  PLA nero        300 g      [x]  │ │ Margine eff. 23,3%│ │
│              │ │  + Aggiungi materiale            │ │ ───────────────── │ │
│ Configuraz.  │ │ Tempo slicer  [4 h 12 min]       │ │ ██████████▓▓▒     │ │
│  Stampanti   │ │ Quantità      [2]                │ │ Materiale   86%   │ │
│  Materiali   │ │ Finitura      [0] min/pezzo      │ │ Macchina     9%   │ │
│  Tariffe     │ │ Override ▸                       │ │ Rischio      5%   │ │
│  Extra       │ └──────────────────────────────────┘ │ ───────────────── │ │
│  Impostaz.   │ ┌──────────────────────────────────┐ │ Dettaglio ▸       │ │
│              │ │ Costi di lavoro                  │ │ [Salva preventivo]│ │
│              │ │ Setup [0 min]   Extra [—]        │ │ [Stampa]          │ │
│              │ └──────────────────────────────────┘ └───────────────────┘ │
│ Dati solo su │                                      sticky a ≥ 1024      │
│ questo browser                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
```

Il pannello risultato è l'unico blocco con una superficie bianca piena; il form è una superficie bianca unica, non una griglia di card. Le sezioni del form sono separate da 32 px, non da card annidate.

**Wireframe 375 — Calcolatore**

```text
┌───────────────────────────────┐
│ ☰  Calcolatore         [Salva]│
├───────────────────────────────┤
│ Bozza, 24/10/2026             │
│                               │
│ Stampa                        │
│ Stampante  [Kobra 3       ▾]  │
│ Materiali                     │
│  PLA nero        300 g    [x] │
│  + Aggiungi materiale         │
│ Tempo slicer [4 h 12 min]     │
│ Quantità [2]                  │
│ Finitura [0] min/pezzo        │
│ Override ▸                    │
│                               │
│ Costi di lavoro               │
│ Setup [0 min]                 │
│ Extra [—]                     │
│                               │
│ ───────────────────────────── │
│ Riepilogo                     │
│ € 9,10                        │
│ Costo pieno € 6,98            │
│ Margine effettivo 23,3%       │
│ ██████████▓▓▒                 │
│ Materiale   86%    € 6,00     │
│ Macchina     9%    € 0,63     │
│ Rischio      5%    € 0,35     │
│ Dettaglio ▸                   │
│ [Salva preventivo]            │
│ [Stampa]                      │
└───────────────────────────────┘
```

A 375 px il riepilogo è **in fondo alla colonna, non sticky**, come chiede il brief. Il totale compare una sola volta: il blocco in fondo è l'unico risultato. Le azioni sono a 44 px di altezza.

**Wireframe 1440 — Dettaglio preventivo**

```text
┌──────────────┬────────────────────────────────────────────────────────────┐
│ LayerCost    │ ‹ Preventivi   Vaso a spirale                 [Stampa]     │
│              │ 24/10/2026  Bozza  Cliente: —                              │
│ Lavoro       │ ┌──────────────────────────────────────────────────────────┐│
│  Calcolatore │ │ € 9,10          Costo pieno € 6,98     Margine 23,3%     ││
│  Preventivi  │ │ ██████████▓▓▒  Materiale 86% · Macchina 9% · Rischio 5%  ││
│  Confronto   │ └──────────────────────────────────────────────────────────┘│
│              │ ┌───────────────────────────────┐ ┌────────────────────────┐│
│ Configuraz.  │ │ Righe                         │ │ Snapshot               ││
│  Stampanti   │ │ 1  Vaso a spirale   2 pz      │ │ Motore v1              ││
│  Materiali   │ │    Kobra 3, PLA nero 300 g    │ │ Tariffe del 24/10/2026 ││
│  Tariffe     │ │    4 h 12 min · € 9,10        │ │ [Aggiorna su copia]    ││
│  Extra       │ │    Quota del totale           │ │                        ││
│  Impostaz.   │ └───────────────────────────────┘ └────────────────────────┘│
│              │ ┌──────────────────────────────────────────────────────────┐│
│              │ │ Dettaglio costi                                          ││
│              │ │ Materiale €6,00 · Energia €0,16 · Ammortamento €0,43 ... ││
│              │ └──────────────────────────────────────────────────────────┘│
└──────────────┴────────────────────────────────────────────────────────────┘
```

### 3.5 Firma: lo stack dei costi

Lo stack è il pezzo che appartiene solo a LayerCost: il nome e il modello di costo diventano la stessa forma.

- **Cosa mostra.** Quattro bande: Materiale; Macchina (energia + ammortamento + manutenzione); Lavoro ed extra (manodopera e extra di riga e di lavoro); Rischio (riserva guasti). È una sintesi, non il dettaglio: la tabella completa resta sotto. Le quattro bande sommano esattamente al costo pieno.
- **Come si calcola.** Le larghezze sono proporzionali agli importi in µ€; i pixel si arrotondano con il resto più grande, così la somma delle bande coincide con la larghezza totale. Nessun float per il denaro.
- **Bande piccole.** Le bande sotto il 3% si accorpano in "Altro"; la tabella dettaglio le elenca tutte. Una banda a zero non ha stub: compare solo nella tabella, in grigio.
- **La banda più grande prende il blu.** Se il materiale è l'86% del costo, è blu; se un lavoro è a forte manodopera, il blu passa sulla manodopera. Il colore dice "dove pesa il costo", non "materiale".
- **Accessibilità.** `role="img"` con `aria-label` che riassume le quote; la legenda è una `<dl>` con nome e importo; la tabella dettaglio è la fonte completa. In stampa le bande hanno toni di grigio e la legenda con gli importi: nessuna informazione affidata al solo colore.
- **Dove appare.** Nel pannello risultato del calcolatore, nel dettaglio del preventivo e nella stampa. Nella lista dei preventivi non appare: una riga non deve sembrare un preventivo completo.

### 3.6 Componenti e stati

- **Pulsanti.** Primario: `#141414`, testo bianco, 36 px, raggio 6, 500 14 px. Secondario: riempimento `#efeeeb`, testo ink, nessun bordo. Distruttivo: testo `--negative`, nessun riempimento, conferma. Un solo primario per schermata.
- **Campi.** 36 px desktop / 44 px touch, bordo 1 px `#8a8a8a`, raggio 6, label sopra 14/500, unità 12 muted. Focus: outline 2 px `--data`, offset 2 px. Errore: 12 px `--negative`, `aria-describedby`; nessun errore solo col bordo rosso.
- **Select.** Stessa geometria dei campi; nessun bordo pesante; chevron a 16 px.
- **Tabelle.** Nessuna card intorno; header 12 px muted, sentence case, nessuna banda di riempimento; righe 44 px; numeri a destra, tabular; colonna identità più larga; stato con testo + simbolo, non solo colore.
- **Badge.** Solo per stato: Bozza, Salvato, Archiviato, Non ricalcolabile, Stimato. Pill 20 px, 12 px, con testo; "Stimato" usa il warning con un triangolo e la parola.
- **Vuoti.** "Nessun preventivo. Salva il primo dal calcolatore." con link; nessuna illustrazione.
- **Unsaved changes.** Banner testuale in cima al form: "Modifiche non salvate" + "Salva" / "Scarta". Nessun modale automatico.
- **Archiviati.** Filtro "Mostra archiviati"; badge muted; nessuna cancellazione.
- **Dialoghi.** Solo per azioni distruttive o import; un solo livello; focus trap; Esc; ombra ammessa solo perché il dialogo flotta.
- **Stampa.** Vedi §3.7; il bottone "Stampa" è secondario.

### 3.7 Stampa e PDF

- A4, margini 14 mm, corpo 11 pt, piccolo 9 pt, totale 18 pt. Source Serif 4 per il titolo del documento e il totale; Archivo per il resto.
- Nessun chrome, nessuna sidebar, nessun bottone, nessuna ombra. Intestazione: LayerCost, "Preventivo", numero, data, cliente. Righe, totali e note. La stampa standard è per il cliente: non mostra costo pieno, utile, margine o composizione del costo. La stampa interna, scelta dal dettaglio, aggiunge la composizione in grigi con gli importi e i totali economici, ed è marcata "Uso interno". Footer: "Generato con LayerCost il gg/mm/aaaa".
- Lo stato "Bozza" è testo nell'intestazione, non una filigrana.
- I prezzi di riga hanno la nota "Quota del totale" per non far credere che siano indipendenti.
- Il foglio è bianco e nero; la stampa non dipende dal colore.

### 3.8 Accessibilità e movimento

- Contrasti della tabella §3.2; il testo muted non scende sotto 12 px.
- Focus visibile su ogni controllo, 2 px `--data` con offset 2 px; il pannello sticky non intrappola il focus.
- Ordine di tabulazione: titolo → form → risultato → azioni. A 375 px il risultato è dopo il form.
- Touch target ≥ 44 px sotto 768 px.
- `prefers-reduced-motion`: transizioni di feedback a 120 ms, trasformazioni rimosse; nessuna animazione d'ingresso.
- Lo stack non è l'unica fonte: legenda + tabella dettaglio.

### 3.9 Rischi

| Rischio                                                 | Mitigazione                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| La direzione può sembrare austera                       | Il serif del prezzo, la pietra calda e lo stack danno carattere; il resto resta quieto         |
| Lo stack può sembrare un grafico decorativo             | È ancorato al breakdown, ha legenda e tabella; le bande piccole si accorpano, non si inventano |
| Il pannello sticky può traboccare su schermi bassi      | `max-height` + scroll interno; il dettaglio è un disclosure, non tutto aperto                  |
| Due font aumentano il peso                              | Solo due famiglie, WOFF2 subset, preload; misura del bundle in T4.3                            |
| Il "no colore nel chrome" può rendere gli stati ambigui | Stati con testo + simbolo; il blu resta al dato e al focus                                     |

---

## 4. Direzione B — Commessa

**Stile:** `framed-sheet` (seed `251014707`), adattato con una faccia scelta dal brief.
**Idea:** _In questa app, il preventivo è una scheda di lavoro: il chrome è il banco, il foglio bianco è la scheda che si stampa e si consegna._
**Nota sul nome:** "Commessa" è il nome interno della direzione. Nell'interfaccia si continua a dire **Preventivo**: "commessa" non è un termine del dominio e non entra nel glossario.

### 4.1 Faccia

- **Telaio tinted** `#f2f5f7` (blu-grigio freddo) per sidebar e top bar; il foglio di lavoro è bianco, inset 8 px dal bordo destro e inferiore, raggio 16, bordo 1 px, nessuna ombra.
- **Brand sotto il 3%.** Il teal `#1b6c80` sta sul marchio e sulla tab attiva; il resto del chrome è ink e grigio. Il primario è near-black.
- **Una sola voce tipografica.** IBM Plex Sans, tecnica e leggibile, con cifre tabulari per default. Il denaro è in 600; le etichette in 500.
- **Marchio.** Stack di 5 strati in ink/teal, come in A.
- **Firma.** La scheda preventivo: la stessa struttura sullo schermo e sulla carta.

### 4.2 Palette

| Token        | Hex       | Ruolo                           | Contrasto verificato               |
| ------------ | --------- | ------------------------------- | ---------------------------------- |
| `--ground`   | `#f2f5f7` | telaio L, top bar               | testo 16,83:1; muted 5,86:1        |
| `--surface`  | `#ffffff` | foglio, scheda                  | testo 18,43:1                      |
| `--raised`   | `#f7f9fa` | pannelli interni, hover         | muted 6,1:1                        |
| `--active`   | `#e6ebee` | voce attiva della sidebar       | testo 14,9:1                       |
| `--text`     | `#131416` | testo e numeri                  | 16,83:1 su ground                  |
| `--muted`    | `#5d5f60` | etichette, unità, meta          | 5,86:1 su ground; 6,42:1 su bianco |
| `--accent`   | `#1b6c80` | marchio, tab attiva, focus      | 5,99:1 su bianco; 5,47:1 su ground |
| `--positive` | `#1e7b4f` | delta positivo                  | 5,25:1 su bianco                   |
| `--negative` | `#c4242a` | delta negativo, errori          | 5,78:1 su bianco                   |
| `--warning`  | `#92400e` | stime, avvisi                   | 7,09:1 su bianco                   |
| `--border`   | `#e1e6e9` | bordo del foglio e della scheda | 1,2:1 (solo separazione)           |
| `--control`  | `#8a8f93` | bordo dei campi interattivi     | 3,26:1 su bianco                   |
| `--rule`     | `#edf1f3` | righe di tabella                | 1,1:1 (solo separazione)           |

**Correzione di accessibilità al sheet.** `--control` del sheet è `#cdced1` (1,6:1 su bianco): non passa WCAG 1.4.11. In T4.3 si usa `#8a8f93` (3,26:1) per i bordi dei campi.

### 4.3 Tipografia

| Ruolo                        | Font          | Peso / dimensione / interlinea                    |
| ---------------------------- | ------------- | ------------------------------------------------- |
| Totale scheda                | IBM Plex Sans | 600 · 32 px desktop / 28 px mobile · 1,1 · `tnum` |
| Titolo pagina                | IBM Plex Sans | 600 · 22 px · 1,25                                |
| Sezione                      | IBM Plex Sans | 500 · 16 px · 1,35                                |
| Corpo, campi, tabelle        | IBM Plex Sans | 400 · 14 px · 1,45                                |
| Costo pieno (secondo numero) | IBM Plex Sans | 500 · 22 px · 1,2 · `tnum`                        |
| Meta della scheda            | IBM Plex Sans | 400/500 · 12–14 px · 1,4                          |
| Intestazioni tabella         | IBM Plex Sans | 500 · 12 px · 1,4 · sentence case                 |

- Cinque dimensioni: 32 / 22 / 16 / 14 / 12.
- IBM Plex Sans ha cifre tabulari per default (larghezza 600 unità per tutte le cifre): non serve attivare `tnum`, ma si dichiara comunque `font-variant-numeric: tabular-nums`.
- Una sola famiglia; niente monospace fuori dal codice.
- Font self-hosted, WOFF2, subset latin, `font-display: swap`, preload. Licenza OFL 1.1.

### 4.4 Layout

**Griglia.** Telaio 228 px di sidebar + 48 px di top bar; foglio inset 8 px a destra e in basso; padding interno 24 px; gap 24 px; input 7/12, scheda 5/12. A 1440: `1440 − 228 − 8 = 1204`; `1204 − 48 = 1156`; `7/12 × (1156 − 24) ≈ 660` e `5/12 ≈ 472`.

**Wireframe 1440 — Calcolatore**

```text
┌──────────────┬────────────────────────────────────────────────────────────┐
│ LayerCost    │ Calcolatore                    [Salva] [Stampa] [Condividi]│
├──────────────┴────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌─────────────────────────────────────┐ │
│ │ Stampa                        │  │ Preventivo LC-024                   │ │
│ │ Stampante [Kobra 3       ▾]   │  │ 24/10/2026   Bozza                  │ │
│ │ Materiali                     │  │ ─────────────────────────────────── │ │
│ │  PLA nero       300 g     [x] │  │ Stampante   Kobra 3                 │ │
│ │  + Aggiungi materiale         │  │ Materiale   PLA nero 300 g          │ │
│ │ Tempo slicer [4 h 12 min]     │  │ Tempo       4 h 12 min              │ │
│ │ Quantità     [2]              │  │ Pezzi       2                       │ │
│ │ Finitura     [0] min/pezzo    │  │ ─────────────────────────────────── │ │
│ │ Override ▸                    │  │ Materiale                 € 6,00    │ │
│ │                               │  │ Energia e macchina        € 0,63    │ │
│ │ Costi di lavoro               │  │ Manodopera e extra        € 0,00    │ │
│ │ Setup [0 min]  Extra [—]      │  │ Rischio e fissi           € 0,35    │ │
│ └───────────────────────────────┘  │ ─────────────────────────────────── │ │
│                                    │ Totale                    € 9,10   │ │
│                                    │ Costo pieno € 6,98                 │ │
│                                    │ Margine effettivo 23,3%            │ │
│                                    │ [Salva] [Stampa] [Condividi]       │ │
│                                    └─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Il foglio bianco è lo spazio di lavoro; la scheda è un documento con bordo 1 px e raggio 8, non una card con ombra. La scheda è il risultato: non c'è un secondo pannello "risultati".

**Wireframe 375 — Calcolatore**

```text
┌───────────────────────────────┐
│ ☰  Calcolatore         [Salva]│
├───────────────────────────────┤
│ Stampa                        │
│ Stampante  [Kobra 3       ▾]  │
│ Materiali                     │
│  PLA nero        300 g    [x] │
│  + Aggiungi materiale         │
│ Tempo slicer [4 h 12 min]     │
│ Quantità [2]                  │
│ Finitura [0] min/pezzo        │
│ Override ▸                    │
│                               │
│ Costi di lavoro               │
│ Setup [0 min]                 │
│ Extra [—]                     │
│                               │
│ Preventivo LC-024             │
│ Bozza, 24/10/2026             │
│ ───────────────────────────── │
│ Materiale          € 6,00     │
│ Energia e macchina € 0,63     │
│ Manodopera e extra € 0,00     │
│ Rischio e fissi    € 0,35     │
│ ───────────────────────────── │
│ Totale             € 9,10     │
│ Costo pieno € 6,98            │
│ Margine effettivo 23,3%       │
│ [Salva] [Stampa]              │
└───────────────────────────────┘
```

A 375 px il telaio scompare, il foglio è lo schermo, la scheda segue il form. Le azioni sono a 44 px.

**Wireframe A4 — Scheda preventivo (stampa)**

```text
┌──────────────────────────────────────────────┐
│ LayerCost                          Preventivo│
│                                    LC-024    │
│ Vaso a spirale                               │
│ 24/10/2026   Bozza                           │
│ ──────────────────────────────────────────── │
│ Stampante   Kobra 3                          │
│ Materiale   PLA nero, 300 g                  │
│ Tempo       4 h 12 min                       │
│ Pezzi       2                                │
│ Finitura    0 min/pezzo                      │
│ ──────────────────────────────────────────── │
│ Materiale                          € 6,00    │
│ Energia e macchina                 € 0,63    │
│ Manodopera e extra                 € 0,00    │
│ Rischio e fissi                    € 0,35    │
│ ──────────────────────────────────────────── │
│ Totale                            € 9,10     │
│ Costo pieno € 6,98                           │
│ Margine effettivo 23,3%                      │
│                                              │
│ Note                                         │
│                                              │
│ Generato con LayerCost il 24/10/2026         │
└──────────────────────────────────────────────┘
```

### 4.5 Firma: la scheda preventivo

- **Una sola struttura, due supporti.** La scheda sullo schermo e la scheda stampata hanno gli stessi blocchi: intestazione, meta, righe, totali, note. La stampa toglie solo bordo, sfondo, azioni e chrome.
- **Il totale è il numero più grande della scheda** (32 px, 600); costo pieno e margine stanno sotto, a 14 px. Non ci sono altri numeri più grandi.
- **La scheda è il risultato del calcolatore.** Si aggiorna mentre si digita; "Salva", "Stampa" e "Condividi" sono nella scheda e nella title row, ma un solo primario per schermata.
- **Stato e freschezza.** "Bozza, 24/10/2026" nell'intestazione; dopo il salvataggio "Salvato, 24/10/2026, 18:42". Nessun badge decorativo.
- **Snapshot.** Nel dettaglio, un blocco separato dice "Tariffe del 24/10/2026 · Motore v1" e offre "Aggiorna su copia"; l'originale non cambia.
- **Accessibilità.** La scheda è un `<article>` con heading; le righe sono una `<table>` con header; i totali sono in un `<dl>`; i pulsanti sono reali, non div.

### 4.6 Componenti e stati

- **Pulsanti.** Primario near-black `#131416`, testo bianco, 36 px, raggio 6; secondario outlined 1 px `#8a8f93`, testo ink; distruttivo testo `--negative`. Un solo primario.
- **Campi.** 32 px desktop / 44 px touch; bordo 1 px `#8a8f93`; raggio 6; label 14/500; unità 12 muted; focus 2 px `--accent` con offset 2 px.
- **Tabelle.** Header 12 muted, sentence case, nessuna banda; righe 48 px; numeri a destra tabular; righe della scheda 14 px con totale 32 px.
- **Badge.** Bozza, Salvato, Archiviato, Non ricalcolabile, Stimato; pill 20 px con testo; "Stimato" con triangolo.
- **Vuoti.** "Nessun preventivo. Il primo si salva dal calcolatore." con link.
- **Unsaved changes.** Banner "Modifiche non salvate" con "Salva" / "Scarta"; nessun modale automatico.
- **Archiviati.** Filtro "Mostra archiviati"; badge muted.
- **Dialoghi.** Un livello, focus trap, Esc; ombra ammessa solo per il dialogo.

### 4.7 Stampa e PDF

- A4, margini 14 mm, corpo 10,5 pt, totale 18 pt. IBM Plex Sans su tutto.
- La scheda stampata è la stessa dello schermo: intestazione, meta, righe, totali, note. Nessun chrome, nessun bordo, nessuna ombra, nessun colore come informazione.
- Footer: "Generato con LayerCost il gg/mm/aaaa". Lo stato "Bozza" è testo.
- Pagine lunghe: `break-inside: avoid` sulle righe; i totali si ripetono solo se la scheda supera una pagina (T4.4 decide se serve).

### 4.8 Accessibilità e movimento

- Contrasti della tabella §4.2; muted a 12 px passa 6,42:1 su bianco.
- Focus 2 px `--accent`, offset 2 px; la scheda non è un controllo, non entra nel tab order.
- Touch target ≥ 44 px sotto 768 px; i campi desktop a 32 px diventano 44 px su touch.
- `prefers-reduced-motion`: solo feedback a 120 ms; nessuna animazione d'ingresso.
- La scheda è leggibile da screen reader come articolo con tabella e definition list.

### 4.9 Rischi

| Rischio                                                 | Mitigazione                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Il telaio + foglio mangiano larghezza                   | A 1440 il canvas resta 1156 px; a < 1024 il telaio scompare                           |
| La scheda può dominare il calcolo                       | La scheda è il risultato, non un secondo form; il form resta a 7/12                   |
| Il pattern "foglio dentro telaio" è noto                | La scheda preventivo e la stampa sono la parte specifica; il telaio è solo la cornice |
| La scheda può sembrare burocratica                      | Tipografia Plex, meta brevi, totale grande, nessun timbro o filigrana                 |
| Il teal + i grigi possono somigliare a un template SaaS | Il teal resta sotto il 3%; la scheda e la stampa portano l'identità                   |

---

## 5. Confronto

| Criterio          | A — Strato                                  | B — Commessa                                      |
| ----------------- | ------------------------------------------- | ------------------------------------------------- |
| Idea              | Gli strati della stampa = strati del costo  | Il preventivo = scheda di lavoro                  |
| Shell             | Open plane, sidebar chiara, nessuna top bar | Telaio tinted, top bar 48 px, foglio bianco inset |
| Tipografia        | Archivo + Source Serif 4                    | IBM Plex Sans                                     |
| Colore            | Chrome ink; un solo blu sul dato            | Telaio blu-grigio; teal su marchio e tab          |
| Firma             | Stack dei costi a 4 bande                   | Scheda preventivo schermo + carta                 |
| Risposta          | Totale 34 px serif + stack                  | Totale 32 px nella scheda                         |
| Punto forte       | Trasparenza, calcolo, densità               | Documento, stampa, condivisione                   |
| Stampa            | Foglio ledger con stack in grigi            | La scheda stessa                                  |
| Rischio           | Austerità; lo stack va progettato bene      | Pattern noto; la scheda può dominare              |
| Sforzo            | Medio                                       | Medio-alto                                        |
| Aderenza al nome  | Alta: LayerCost = strati di costo           | Media: il documento, non il nome                  |
| Scenario migliore | Uso quotidiano davanti allo slicer          | Preventivi da consegnare o stampare               |

---

## 6. Raccomandazione

**Raccomando A — Strato.**

1. **Il nome diventa struttura.** "LayerCost" non è solo un wordmark: lo stack dei costi è il marchio, il risultato e il modo in cui si legge il breakdown. È l'elemento che un concorrente non può copiare senza cambiare nome.
2. **Il job principale è il calcolo, non l'emissione del documento.** L'utente apre l'app davanti allo slicer per sapere quanto è costato e quanto chiedere. A mette il risultato al centro; B mette al centro la scheda, che è il passo successivo.
3. **La trasparenza è il principio di prodotto.** Lo stack rende visibile "dove pesa il costo" senza aggiungere rumore; la tabella dettaglio resta la fonte completa. B è altrettanto onesta, ma la scheda racconta il preventivo, non la composizione del costo.
4. **La stampa resta forte.** A stampa un foglio ledger pulito, con lo stack in grigi e la legenda; B è più naturalmente stampabile, ma la stampa è un flusso secondario rispetto al calcolo.

**Quando B sarebbe la scelta giusta:** se il baricentro del prodotto si sposta sui preventivi da consegnare (clienti, listini, condivisione frequente) o se si vuole che il documento sia l'oggetto principale dell'app. In quel caso la scheda di B è più diretta.

---

## 7. Scelta

- [x] **A — Strato** (scelta)
- [ ] **B — Commessa** (alternativa documentata)

**Motivazione:** A vince perché il nome e il modello di costo diventano la stessa forma (lo stack), perché il job principale è il calcolo e non l'emissione del documento, e perché la trasparenza del breakdown è il principio di prodotto. B resta l'alternativa se il baricentro si sposta sui preventivi da consegnare; in quel caso serve un nuovo ADR che supera il 0015.

La decisione è registrata in `docs/adr/0015-direzione-visiva.md`. `TASKS.md` chiude T4.2 con l'ADR.

---

## 8. Conseguenze per T4.3 e T4.4

### 8.1 T4.3 — Design system

- Token della direzione scelta in `src/index.css` come CSS custom properties; Tailwind 4 usa `@theme` solo per le utility effettivamente consumate. Nessun hex arbitrario nei componenti.
- Font: solo quelli della direzione scelta, WOFF2 subset latin in `public/fonts/`, `@font-face` locale, preload, `font-display: swap`, `OFL.txt` accanto ai file. Nessun `<link>` a Google Fonts.
- Componenti: pulsanti, campi, select, tabelle, dialoghi, tab, badge, empty state, banner unsaved, scheda preventivo o stack (a seconda della scelta).
- Contrasto AA verificato su ogni coppia; bordo dei campi a 3:1; focus visibile; target 44 px su touch.
- Test: la utility che raggruppa le bande e alloca i pixel in µ€ ha un unit test (somma esatta, zero, bande < 3%); nessun test di dominio cambia.

### 8.2 T4.4 — Redesign schermate

- Applicare la direzione a calcolatore, dettaglio, preventivi, anagrafiche, impostazioni, confronto, condivisione, onboarding.
- Eseguire il gate visivo della skill: `inspect.mjs --app` a 1440/768/390, screenshot, critique, fix dei FAIL. Il gate non è eseguibile in T4.2.
- E2E verdi; stampa verificata su Chrome e Safari (chiude anche il residuo di T3.8); preview Vercel.
- Nessuna regressione nei calcoli: i numeri restano quelli del dominio e degli snapshot.

### 8.3 Cosa non entra in T4.3/T4.4 senza un nuovo task

- Animazioni d'ingresso, grafici di trend. La dark mode è stata aggiunta in T4.7 (ADR-0016).
- Nuove entità, campi, formule, migrazioni.
- Librerie UI o di grafici.
- Cambi al flusso di import/export o al routing.

---

## 9. Riferimenti

- `docs/design/ui-brief.md` — requisiti e criteri di successo.
- `PLAN.md` — principi di prodotto, scope, stack, roadmap.
- `AGENTS.md` — invarianti, regole UI, Definition of Done.
- `TASKS.md` — T4.2, T4.3, T4.4.
- `docs/domain/golden-cases.md` — i numeri normativi restano qui.
- `docs/adr/0012-no-ui-library.md` — nessuna libreria UI.
- Skill `design-taste-frontend`, `references/app-screens.md` — regole per le schermate applicative.
- Skill `frontend-design` — direzione artistica e critica.
