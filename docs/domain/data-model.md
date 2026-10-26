# Modello dati

**Stato:** implementazione v1.0.0
**Codice:** `src/domain/types.ts`, `src/data/schemas.ts`, `src/data/storage.ts`

---

## 1. Principi

- Le entità persistite hanno ID stabili.
- Il dominio usa unità intere: µ€, bp, secondi, centigrammi, watt, Wh.
- I preventivi salvati sono **snapshot economici**: le modifiche usano le tariffe congelate e non cambiano i prezzi. Dopo invio/completamento sono bloccati.
- Le entità referenziate si archiviano, non si cancellano.
- Lo schema è versionato; l'import valida prima di sostituire.
- Il repository è astratto: in v1 è locale, in futuro potrà essere cloud.

---

## 2. Entità

### 2.1 `Settings`

| Campo                | Tipo                                 | Note                                 |
| -------------------- | ------------------------------------ | ------------------------------------ |
| `currency`           | `'EUR'`                              | Fisso in v1                          |
| `locale`             | `'it-IT'`                            | Formattazione                        |
| `tariffs`            | `EnergyTariff[]`                     | Storico tariffe                      |
| `laborRatePerHour`   | `MicroEur`                           | Default 0                            |
| `failureRateBp`      | `BasisPoints`                        | Default 5%                           |
| `timeOverheadBp`     | `BasisPoints`                        | Default 0%                           |
| `pricingMode`        | `'markup' \| 'margin'`               | Default markup                       |
| `markupBp`           | `BasisPoints`                        | Default 30%                          |
| `marginBp`           | `BasisPoints`                        | Default 25% (usato se mode = margin) |
| `roundingStep`       | `MicroEur`                           | Default €0,10                        |
| `roundingMode`       | `'up' \| 'nearest' \| 'down'`        | Default up                           |
| `vatMode`            | `'none' \| 'excluded' \| 'included'` | Default none                         |
| `vatRateBp`          | `BasisPoints`                        | Default 22%                          |
| `allocationMode`     | `'proportional' \| 'equalPerUnit'`   | Default proportional                 |
| `onboardingComplete` | `boolean`                            | Guida iniziale                       |

### 2.2 `EnergyTariff`

| Campo           | Tipo         | Note            |
| --------------- | ------------ | --------------- |
| `id`            | string       | UUID o seed     |
| `label`         | string       | Etichetta       |
| `pricePerKWh`   | `MicroEur`   | Costo marginale |
| `effectiveFrom` | `YYYY-MM-DD` | Decorrenza      |
| `notes`         | string?      |                 |

La tariffa corrente è quella con `effectiveFrom` più recente e ≤ data del preventivo. La stampante può avere `energyTariffId` per un contratto diverso.

### 2.3 `Printer`

| Campo                | Tipo                                            | Note                             |
| -------------------- | ----------------------------------------------- | -------------------------------- |
| `id`                 | string                                          |                                  |
| `name`, `model`      | string                                          |                                  |
| `purchasePrice`      | `MicroEur`                                      |                                  |
| `residualValueBp`    | `BasisPoints`                                   | 0–100%                           |
| `expectedLifeHours`  | number                                          | > 0                              |
| `maintenancePerHour` | `MicroEur`                                      |                                  |
| `startupMinutes`     | number                                          |                                  |
| `multicolor`         | boolean                                         | ACE/AMS                          |
| `buildVolumeMm`      | `[number, number, number]`                      |                                  |
| `ratedPowerW`        | number                                          | Informativa, non usata nel costo |
| `powerProfiles`      | `Partial<Record<MaterialFamily, PowerProfile>>` | W medi                           |
| `defaultAvgWatts`    | `Watts`                                         | Fallback                         |
| `energyTariffId`     | string?                                         | Override tariffa                 |
| `notes`              | string?                                         |                                  |
| `archived`           | boolean                                         |                                  |

`PowerProfile`: `{ avgWatts: Watts; source: 'measured' | 'estimated' | 'vendor'; note?: string }`.

### 2.4 `Material`

| Campo               | Tipo             | Note                        |
| ------------------- | ---------------- | --------------------------- |
| `id`                | string           |                             |
| `name`              | string           |                             |
| `family`            | `MaterialFamily` | PLA, PETG, ABS…             |
| `pricePerKg`        | `MicroEur`       |                             |
| `spoolNetWeightG`   | number           | Solo filamento; informativo |
| `supplier`, `color` | string?          |                             |
| `failureRateBp`     | `BasisPoints?`   | Override                    |
| `notes`             | string?          |                             |
| `archived`          | boolean          |                             |

### 2.5 `Extra`

| Campo      | Tipo                    | Note |
| ---------- | ----------------------- | ---- |
| `id`       | string                  |      |
| `name`     | string                  |      |
| `amount`   | `MicroEur`              |      |
| `unit`     | `'perUnit' \| 'perJob'` |      |
| `category` | string?                 |      |
| `archived` | boolean                 |      |

Un extra `perJob` non può essere attaccato a una riga; un extra `perUnit` non può essere attaccato al lavoro.

### 2.6 `PrintLine`

| Campo                     | Tipo                                                     | Note                                    |
| ------------------------- | -------------------------------------------------------- | --------------------------------------- |
| `id`                      | string                                                   |                                         |
| `name`                    | string                                                   |                                         |
| `printerId`               | string                                                   |                                         |
| `timeSeconds`             | `Seconds`                                                | Tempo slicer                            |
| `materials`               | `{ materialId, grams: Centigrams }[]`                    | Multi-materiale                         |
| `quantity`                | number                                                   | ≥ 1                                     |
| `finishingSecondsPerUnit` | `Seconds`                                                |                                         |
| `extraIds`                | string[]                                                 | Extra `perUnit`                         |
| `overrides`               | `{ powerOverrideW?, energyOverrideWh?, failureRateBp? }` |                                         |
| `color`                   | string?                                                  | Filamento `#rrggbb`, solo presentazione |
| `notes`                   | string?                                                  |                                         |

> **Import `.3mf` (T5.3.3):** il mapping produce solo `PrintLine` esistenti. Ogni piatto selezionato diventa una riga con `quantity: 1`, `finishingSecondsPerUnit: 0`, `extraIds: []` e `overrides: {}`. `timeSeconds` è il `prediction` dello slicer; i grammi sono la somma dei filamenti mappati sullo stesso materiale, in centigrammi. Nessun campo `source` e nessun supplemento AMS/ACE.
>
> **Colore filamento (T5.17):** `color` è un campo opzionale `#rrggbb` aggiunto in modo retrocompatibile; lo schema resta **v3** e i dati esistenti non richiedono migrazione. Non entra in formule, snapshot economico o `engineVersion`: serve solo a riconoscere la stampa in UI e in stampa.

### 2.7 `Quote`

| Campo                    | Tipo                                                | Note                         |
| ------------------------ | --------------------------------------------------- | ---------------------------- |
| `id`                     | string                                              |                              |
| `name`                   | string                                              |                              |
| `quoteDate`              | `YYYY-MM-DD`                                        | Usata per le tariffe         |
| `customer`               | string?                                             |                              |
| `locale`                 | `'it' \| 'en'`                                      | Lingua del documento         |
| `status`                 | `'draft' \| 'saved' \| 'sent' \| 'completed'`       | Modificabile solo `saved`    |
| `lines`                  | `PrintLine[]`                                       |                              |
| `job`                    | `{ setupSeconds, designSeconds, extraIds, notes? }` |                              |
| `pricing`                | `QuotePricing`                                      | Snapshot delle scelte prezzo |
| `snapshot`               | `QuoteSnapshot?`                                    | Solo salvati                 |
| `result`                 | `QuoteResult?`                                      | Solo salvati                 |
| `engineVersion`          | string?                                             |                              |
| `createdAt`, `updatedAt` | ISO string                                          |                              |
| `archived`               | boolean?                                            |                              |

`QuotePricing`: `{ mode, markupBp, marginBp, roundingStep, roundingMode, discountBp, vatMode, vatRateBp }`.

> **Fase 5 — implementato (T5.6.3):** ADR-0019 aggiunge `locale: 'it' | 'en'` a `Quote` e porta lo schema a **v2**. La migrazione v1 → v2 assegna `locale: 'it'` ai preventivi esistenti e alla bozza, anche dentro un envelope di export. La lingua non entra nello snapshot economico: è un metadato del documento.
>
> **Modifica (ADR-0020):** `saved` è modificabile in place. La modifica usa la configurazione dello snapshot e non cambia `capturedAt`; il risultato viene ricalcolato con le stesse tariffe. `sent` e `completed` sono bloccati e si correggono solo duplicando. Lo schema passa a **v3** senza cambiare i dati esistenti: `draft` e `saved` restano validi.

### 2.8 `QuoteSnapshot`

```ts
interface QuoteSnapshot {
  config: CostConfig // copia completa di settings, printers, materials, extras
  capturedAt: string
  engineVersion: string
}
```

La copia completa rende il preventivo indipendente dalle modifiche future. Il risultato è memorizzato in `Quote.result`; il ricalcolo usa lo snapshot.

### 2.9 `QuoteResult` e `LineResult`

`QuoteResult` contiene:

- `lines: LineResult[]`;
- `directTotal`, `jobLabor`, `jobExtras`, `jobFixedTotal`, `totalCost`;
- `rawPrice`, `discount`;
- `netPriceCents`, `vatCents`, `grossPriceCents`;
- `effectiveMarginBp`;
- dettagli di setup/design ed extra;
- `engineVersion`, `quoteDate`.

`LineResult` contiene i componenti (`material`, `energy`, `depreciation`, `maintenance`, `labor`, `extras`, `failure`), i costi diretti, la quota fissa, il costo pieno, il prezzo allocato e i dettagli materiali/extra.

---

## 3. `AppData`

```ts
interface AppData {
  schemaVersion: 3
  config: CostConfig
  quotes: Quote[]
  draft: Quote
}
```

- `config` contiene `settings`, `printers`, `materials`, `extras`.
- `draft` è il preventivo in corso; viene salvato automaticamente.
- `quotes` contiene i preventivi salvati.

### 3.1 Chiavi `localStorage`

| Chiave                          | Contenuto                         |
| ------------------------------- | --------------------------------- |
| `layercost:data`                | `AppData` serializzato            |
| `layercost:corrupt:<timestamp>` | Backup raw di dati non leggibili  |
| `layercost:backup:schema-<n>`   | Backup raw prima della migrazione |

Il backup di migrazione usa una chiave stabile per versione di partenza (`layercost:backup:schema-1`), così non cresce a ogni avvio.

### 3.2 Export

```json
{
  "app": "LayerCost",
  "schemaVersion": 3,
  "exportedAt": "2026-10-23T12:00:00.000Z",
  "data": {
    "schemaVersion": 3,
    "config": {},
    "quotes": [],
    "draft": { "locale": "it" }
  }
}
```

L'import accetta anche un `AppData` diretto. Dopo la validazione, i preventivi vengono ricalcolati dallo snapshot; se il ricalcolo fallisce, il preventivo resta senza risultato e la UI lo segnala.

---

## 4. Invarianti

1. `schemaVersion` è `3`: la catena v1 → v2 → v3 aggiunge `locale: 'it'` e salva un backup raw prima di applicarla.
2. Ogni import viene validato con Zod prima di sostituire i dati.
3. Un preventivo `saved` è modificabile in place usando lo snapshot; `sent` e `completed` sono bloccati. “Aggiorna prezzi” e la duplicazione creano una copia.
4. Un'entità con `archived = true` non è selezionabile per nuove righe, ma resta nello snapshot storico.
5. Le entità referenziate non si cancellano definitivamente.
6. Le tariffe sono selezionate per data; la data del preventivo è la chiave.
7. I prezzi di riga sono un'allocazione del prezzo netto totale, non prezzi indipendenti.
8. Il risultato non contiene `NaN`, `Infinity` o valori negativi (tranne il margine effettivo, che può essere negativo).

---

## 5. Migrazioni

- La versione corrente è `3`.
- `migrateAppData` rifiuta versioni future e versioni non numeriche.
- In futuro: aggiungere una funzione per ogni versione e un fixture di test.
- Prima di una migrazione distruttiva, l'app deve conservare un backup raw.

---

## 6. Privacy e sicurezza

- I dati restano nel browser; nessun backend.
- I link condivisi contengono una copia compressa del preventivo nell'URL.
- L'import non esegue codice: JSON + validazione Zod.
- Nessun `eval`, nessun `dangerouslySetInnerHTML`.
- Svuotare i dati del browser cancella i dati: il backup JSON è l'unica copia esterna.
