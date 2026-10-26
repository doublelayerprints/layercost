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

I valori Kobra X sono stime: non esiste una misura media pubblica affidabile. Devono essere marcati “stimato” e verificati con una presa intelligente.

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
  - **Dati usati:** Free: 500 MB DB, 50.000 MAU, 5 GB egress, 1 GB storage, pausa dopo una settimana di inattività, 2 progetti attivi.
  - **Confidenza:** alta (fonte ufficiale, consultata il 26/10/2026); i limiti possono cambiare.
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
