# LayerCost — Fonti e dati di partenza

**Data di accesso:** 23 ottobre 2026
**Uso:** alimentare `docs/domain/sources.md`, i seed e la guida alla misura dei consumi.
**Regola:** la potenza nominale è un dato informativo; non entra mai nel costo.

---

## 1. Anycubic Kobra X

### 1.1 FAQ ufficiale

- **URL:** https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x/faq
- **Dati usati:**
  - volume di stampa 260 × 260 × 260 mm;
  - ugello max 300 °C, letto max 100 °C;
  - potenza nominale 1450 W a 220 V / 50 Hz;
  - corrente media del letto ~6 A a 220 V prima del target, picco 8,4 A;
  - hotend ~1,5 A a 24 V prima del target, picco 3,2 A;
  - ACE 2 Pro: 4 colori nativi, fino a 19 con 4 unità.
- **Confidenza:** alta per le specifiche dichiarate; bassa per il consumo medio in stampa.
- **Note:** la potenza nominale non è il consumo medio. Il picco del letto spiega perché la nominale è molto più alta.

### 1.2 Pagina prodotto

- **URL:** https://us.anycubic3d.com/products/kobra-x
- **Dati usati:** 260 × 260 × 260 mm; 4 colori nativi, 19 massimo; 300 mm/s raccomandati, 600 mm/s massimi; letto PEI 100 °C; ugello in acciaio temprato 0,4 mm; materiali PLA/PETG/TPU/PVA/PLA-CF/PETG-CF/ASA.
- **Confidenza:** alta per le specifiche dichiarate.
- **Note:** il sistema multicolore è ACE 2 Pro, non “AMS” (termine Bambu Lab). Nel progetto si usa “sistema multicolore” come termine generico.

### 1.3 Manuale utente

- **URL:** https://wiki.anycubic.com/kobra-x/M02010203-Kobra%20X%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C-EN.pdf
- **Dati usati:** volume 260 × 260 × 260 mm; ugello 0,4 mm; letto 100 °C; ugello 300 °C; potenza 475 W a 110 V / 1450 W a 220 V; peso 10,2 kg.
- **Confidenza:** alta per le specifiche; la potenza è nominale.
- **Note:** il valore 475 W a 110 V è la variante a bassa tensione; in Europa vale 1450 W a 220 V.

### 1.4 Recensione 3DWork

- **URL:** https://3dwork.io/en/anycubic-kobra-x-review/
- **Dati usati:** 260 × 260 × 260 mm; 1450 W nominali; ACE Gen 2 integrato nella testina; retrazione per cambio colore ~30 mm contro ~160 mm della Kobra 3; letto DC più lento a scaldarsi; nessuna misura media di consumo pubblicata.
- **Confidenza:** media per le osservazioni, alta per il confronto tra i due sistemi di cambio colore.
- **Note:** il dato sui 30 mm è utile per capire perché il purge della Kobra X è diverso, ma i grammi dello slicer includono già tutto. Non si aggiunge una percentuale.

### 1.5 Printer Hub

- **URL:** https://printer-hub.ru/en/printers/anycubic-kobra-x
- **Dati usati:** 260 × 260 × 260 mm; 400 W di consumo dichiarato (probabilmente stampante sola a 110 V); anno 2025.
- **Confidenza:** bassa per il consumo; il valore contraddice la nominale 1450 W a 220 V del manuale.
- **Note:** non usare questo valore come media. È un esempio di quanto i dati online siano incoerenti.

---

## 2. Anycubic Kobra 3

### 2.1 Manuale utente

- **URL:** https://wiki.anycubic.com/k3/anycubic_kobra_3_user_manual-en-v1.3.pdf
- **Dati usati:** volume 250 × 250 × 260 mm; letto max 110 °C; ugello max 300 °C; potenza nominale 400 W; ugello 0,4 mm.
- **Confidenza:** alta per le specifiche dichiarate.
- **Note:** la potenza nominale è il massimo, non il consumo medio.

### 2.2 3D Print Pricing

- **URL:** https://3dprintpricing.pro/en/3d-printers/anycubic-kobra-3
- **Dati usati:** ~180 W in stampa PLA (220 °C ugello, 55 °C letto); ~8 W idle; picchi fino a 700 W durante il riscaldamento.
- **Confidenza:** media; misura indipendente, non ufficiale.
- **Note:** è la fonte principale per il profilo PLA della Kobra 3.

### 2.3 3D Calculators

- **URL:** https://3dcalculators.com/blog/3d-printer-power-consumption-by-model
- **Dati usati:** Kobra 3 nominale 400 W; media PLA 205 W; costo indicativo per ora.
- **Confidenza:** media; misure di terze parti, condizioni diverse.
- **Note:** 180–205 W è l'intervallo ragionevole per il PLA. Il seed usa 190 W come valore centrale.

### 2.4 Test YouTube Kobra 3 Combo in ASA

- **URL:** https://www.youtube.com/watch?v=EQelwiVYCJ8
- **Dati usati:** con letto a 100 °C e ASA, consumo medio intorno a 400 W; picco iniziale più alto; mantenimento del letto intorno a 360 W.
- **Confidenza:** media; test singolo, condizioni non standardizzate.
- **Note:** è la fonte per il profilo ABS/ASA della Kobra 3 (seed 380 W, conservativo).

### 2.5 Basic Tutorials — recensione Kobra 3 Combo

- **URL:** https://basic-tutorials.com/reviews/gadget-reviews/anycubic-kobra-3-combo/
- **Dati usati:** 250 × 250 × 260 mm; alimentatore 400 W; letto 110 °C; ugello 300 °C.
- **Confidenza:** alta per le specifiche.
- **Note:** conferma i dati del manuale.

---

## 3. Sintesi per i seed

| Stampante | Volume      | Nominale |   PLA |  PETG |   TPU | ABS/ASA | Default | Confidenza media |
| --------- | ----------- | -------- | ----: | ----: | ----: | ------: | ------: | ---------------- |
| Kobra 3   | 250×250×260 | 400 W    | 190 W | 200 W | 180 W |   380 W |   200 W | media            |
| Kobra X   | 260×260×260 | 1450 W   | 220 W | 230 W | 200 W |   420 W |   230 W | bassa            |

I valori Kobra X sono stime: non esiste una misura media pubblica affidabile. Devono essere marcati “stimato” e verificati con una presa intelligente. Il 02/11/2026 il committente ha confermato che i valori di seed delle due stampanti vanno bene per l'uso attuale; restano stime aggiornabili con misure reali.

---

## 4. Come misurare il consumo reale

Procedura consigliata:

1. Usa una presa intelligente con misurazione (Shelly Plug, Tapo P110, Eve Energy o simile).
2. Scegli un pezzo rappresentativo, con una durata di almeno 1 ora.
3. Azzera il contatore della presa, avvia la stampa e lascia scaldare fino all'inizio.
4. Registra i kWh totali e il tempo effettivo.
5. Calcola la potenza media: `W = Wh / ore`.
6. Inserisci il valore come override kWh nella riga, oppure aggiorna il profilo medio della stampante.
7. Ripeti per PLA e per ABS/ASA: la differenza è soprattutto nel letto.

**Attenzione:** la potenza nominale non è la media. Il picco di riscaldamento dura pochi minuti; il costo dipende dalle ore di mantenimento.

---

## 5. Dati che l'utente deve fornire

- Prezzo di acquisto effettivo delle due stampanti (e di eventuali accessori/ACE).
- Ore di vita stimate o percepite.
- Tariffa elettrica marginale €/kWh, con data di decorrenza.
- Prezzi reali delle bobine e peso netto.
- Costo della manodopera, se si vuole conteggiare.
- Eventuali extra di imballaggio/spedizione.

Questi dati non sono stimabili in modo affidabile da fonti esterne: il wizard iniziale serve a raccoglierli.

---

## 6. Software, formati e servizi (fase 5)

**Data di accesso:** 26 ottobre 2026.

### 6.1 Formato `.3mf`

- **3MF Consortium — Core Specification 1.4.0:** https://github.com/3MFConsortium/spec_core
  - **Dati usati:** il `.3mf` è un archivio ZIP/OPC; il modello è XML; gli slicer possono aggiungere parti proprietarie.
  - **Confidenza:** alta (specifica ufficiale).
- **Printago — 3MF File Format: How Bambu Studio and Orca Slicer Structure Your Prints** (13 aprile 2026): https://printago.io/blog/3mf-file-format
  - **Dati usati:** `Metadata/slice_info.config` con `prediction` in secondi e `used_g` per filamento; `Metadata/project_settings.config` con `printer_model` e `filament_type`; distinzione tra progetto non slicato e `.gcode.3mf`.
  - **Confidenza:** media. È una fonte terza, allineata al codice di OrcaSlicer, ma va verificata con file reali del committente.
- **OrcaSlicer — `src/libslic3r/Format/3mf.cpp`:** https://github.com/SoftFever/OrcaSlicer
  - **Dati usati:** nomi dei file di progetto e gestione dei metadati.
  - **Confidenza:** alta per la struttura del codice; il formato può cambiare tra versioni.
- **PrusaSlicer — `src/libslic3r/Format/3mf.cpp`:** https://github.com/prusa3d/PrusaSlicer
  - **Dati usati:** `Metadata/Slic3r_PE.config` per le impostazioni; i progetti non contengono tempo/grammi affidabili.
  - **Confidenza:** alta per la struttura; il supporto non è previsto nella prima iterazione.

### 6.2 Servizi gratuiti per il sync

- **Supabase — Pricing:** https://supabase.com/pricing
  - **Dati usati:** Free: 500 MB DB, 50.000 MAU, 5 GB egress (+5 GB cached), 1 GB storage, pausa dopo una settimana di inattività, 2 progetti attivi. Ri-verificato il 02/11/2026 per EVO-2 (ADR-0027): utenti auth totali **illimitati** sul Free, MAU 50.000, backup automatici/PITR non inclusi, log retention 1 giorno (auth audit 1 ora), Auth Hook Postgres `before-user-created` disponibile. Il tetto utenti 1000 è quindi una scelta di prodotto, non un limite del piano.
  - **Confidenza:** alta (fonte ufficiale, consultata il 26/10/2026 e ri-verificata il 02/11/2026); i limiti possono cambiare.
- **Cloudflare — Workers Pricing:** https://developers.cloudflare.com/workers/platform/pricing/
  - **Dati usati:** Free: 100.000 richieste/giorno, 10 ms CPU; D1 5 GB, 5M righe lette/giorno, 100k righe scritte/giorno; KV 1 GB, 100k letture/giorno, 1k scritture/giorno.
  - **Confidenza:** alta (fonte ufficiale, aggiornata il 2/10/2026).
- **Firebase — Pricing:** https://firebase.google.com/pricing
  - **Dati usati:** Spark: Firestore 1 GiB, 50k letture/giorno, 20k scritture/giorno, 20k delete/giorno; Auth 50k MAU.
  - **Confidenza:** alta (fonte ufficiale, consultata il 26/10/2026).

### 6.3 Internazionalizzazione

- **MDN — `Intl`:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
  - **Dati usati:** formattazione di prezzi, date, numeri e plurali per locale.
  - **Confidenza:** alta.

---

## 7. Catalogo stampanti (novembre 2026)

**Data di rilevazione:** 2 novembre 2026.
**Ambito:** 29 preset in `src/data/printer-catalog.ts`, esclusi Kobra 3 e Kobra X del seed.
**Regola:** prezzi indicativi IVA inclusa per la macchina base; potenza nominale informativa; consumi medi stimati e mai usati come nominale.

### 7.1 Bambu Lab

- **Store ufficiale EU — pagine prodotto:** https://eu.store.bambulab.com/products/{a1-mini,a1,p1s,p2s,x2d,a2l,h2d,h2s,h2c}
  - **Dati usati:** prezzo base, prezzo Combo, volume, potenza massima e nome del modello. Rilevati il 02/11/2026: A1 mini €179, A1 €239, P1S €349, P2S €449, X2D €549, A2L €349, H2D €1399, H2S €999, H2C €1799 (AMS Combo). Volumi verificati: H2S 340×320×340 mm, X2D 256×256×260 mm (ugello principale), H2C 330×320×325 mm; per gli altri modelli si usa il volume a ugello singolo.
  - **Confidenza:** alta per prezzi e specifiche; i prezzi cambiano con promozioni e bundle.
- **Bambu Lab Wiki — P1 e X1:** https://wiki.bambulab.com/en/p1 e https://wiki.bambulab.com/en/x1
  - **Dati usati:** specifiche di P1P e X1 Carbon, entrambe fuori listino.
  - **Confidenza:** alta per le specifiche; i prezzi €249 e €699 sono indicativi dell'usato e hanno confidenza bassa.
- **Note:** i profili di potenza sono stime, non misure. `multicolor` resta `false` quando l'AMS non è inclusa nella SKU base; H2C è l'unica voce con AMS Combo nella versione considerata.

### 7.2 Creality

- **Pagine prodotto ufficiali:** https://www.creality.com/products/creality-ender-3-v3-ke e catalogo Creality.
  - **Dati usati:** volume, potenza e specifiche di Ender-3 V2/V3 KE/S1 Pro, K1, K1 Max e K2 Plus.
  - **Confidenza:** media. Alcune pagine hanno risposto 404 o 429 durante il rilevamento; prezzi e specifiche sono integrati con listini UE e schede pubbliche.
- **Ender-3 e Ender-3 V2:** modelli fuori listino, prezzo indicativo dell'usato e confidenza bassa.
- **Note:** K2 Plus ha CFS opzionale, quindi `multicolor: false` con `multicolorReady: true`.

### 7.3 Anycubic

- **Pagine prodotto ufficiali:** https://www.anycubic.com/products/kobra-2-pro, `/kobra-3-max`, `/kobra-s1` (accesso parziale: 429 durante il rilevamento).
  - **Dati usati:** volume, potenza nominale e prezzo indicativo di Kobra 2 Pro, Kobra 3 Max e Kobra S1.
  - **Confidenza:** media. Le due Kobra del seed restano invariate e non sono nel catalogo.

### 7.4 Prusa Research

- **Pagine prodotto ufficiali:** https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer-kit/, https://www.prusa3d.com/product/prusa-core-one/ e catalogo Prusa MINI+.
  - **Dati usati:** prezzo del kit, volume, potenza e specifiche di MK4S, Core One e MINI+.
  - **Confidenza:** alta per le specifiche; il prezzo è quello del kit da assemblare, non della versione assemblata.

### 7.5 Elegoo, FLSUN, Sovol e QIDI

- **Pagine prodotto ufficiali:** https://eu.elegoo.com/products/neptune-4-pro, https://eu.elegoo.com/products/centauri-carbon, https://www.flsun3d.com/products/super-racer, https://www.sovol3d.com/products/sovol-sv08, https://qidi3d.com/products/plus4.
  - **Dati usati:** volume, potenza nominale, prezzo indicativo e presenza di sistemi multicolore opzionali.
  - **Confidenza:** media per Neptune 4 Pro, Centauri Carbon, SV08 e Plus4; bassa per Super Racer, fuori listino e con prezzo indicativo dell'usato.
- **Note:** le pagine hanno risposto 429 durante il rilevamento; i valori sono quindi indicativi e marcati come tali. Il volume della Super Racer è cilindrico (Ø260 × 330 mm) e nel modello viene rappresentato come 260 × 260 × 330 mm.

### 7.6 Sintesi del catalogo

| Marca     | Modelli | Fonte principale        | Confidenza prevalente |
| --------- | ------- | ----------------------- | --------------------- |
| Bambu Lab | 11      | Store EU ufficiale      | alta                  |
| Creality  | 7       | Sito ufficiale/lista UE | media                 |
| Anycubic  | 3       | Sito ufficiale          | media                 |
| Prusa     | 3       | Sito ufficiale          | alta                  |
| Elegoo    | 2       | Sito ufficiale          | media                 |
| FLSUN     | 1       | Scheda pubblica         | bassa                 |
| Sovol     | 1       | Sito ufficiale          | media                 |
| QIDI      | 1       | Sito ufficiale          | media                 |

Tutti i profili di potenza sono stime indicative: la fonte descrive la macchina, non il consumo medio in stampa. La verifica va fatta con una presa intelligente seguendo il §4.
