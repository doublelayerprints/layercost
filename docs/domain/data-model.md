# Modello dati

**Stato:** implementazione v1.0.0
**Codice:** `src/domain/types.ts`, `src/data/schemas.ts`, `src/data/storage.ts`

> Fase 5: il modello cloud è implementato in T5.4.2 (`supabase/migrations/20261028120000_init.sql`). Il dominio locale resta invariato; vedi §7 per le tabelle cloud.

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
| `discount`                | `DiscountRule?`                                         | Sconto sulla riga, dopo il ricarico     |
| `color`                   | string?                                                  | Filamento `#rrggbb`, solo presentazione |
| `notes`                   | string?                                                  |                                         |

`DiscountRule` è un'unione discriminata:

```ts
type DiscountRule =
  | { mode: 'percent'; valueBp: BasisPoints } // 0–90%
  | { mode: 'amount'; amount: MicroEur }     // importo fisso, limitato al prezzo
```

Un importo fisso di riga si applica al totale della riga, non a ogni pezzo. Lo sconto è commerciale: non entra nel costo, nello snapshot economico o nella riserva guasti.

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

`QuotePricing`: `{ mode, markupBp, marginBp, roundingStep, roundingMode, discount?: DiscountRule, vatMode, vatRateBp }`.

> **Sconti (ADR-0023):** `PrintLine.discount` e `QuotePricing.discount` sono opzionali; l'assenza equivale a nessuno sconto. Lo sconto del preventivo si applica dopo quelli di riga. Lo schema passa a **v4**: la migrazione v3 → v4 converte `discountBp` positivi in `{ mode: 'percent', valueBp }`, tratta `0` come nessuno sconto e conserva il raw in `layercost:backup:schema-3`. I link condivisi pre-v4 vengono normalizzati in lettura.

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
- `rawPrice`, `lineDiscountTotal`, `quoteDiscount`, `discount` (somma dei due);
- `netPriceCents`, `vatCents`, `grossPriceCents`;
- `effectiveMarginBp`;
- dettagli di setup/design ed extra;
- `engineVersion`, `quoteDate`.

`LineResult` contiene i componenti (`material`, `energy`, `depreciation`, `maintenance`, `labor`, `extras`, `failure`), i costi diretti, la quota fissa, il costo pieno, lo sconto di riga applicato (`discount`), il prezzo allocato e i dettagli materiali/extra.

---

## 3. `AppData`

```ts
interface AppData {
  schemaVersion: 4
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
  "schemaVersion": 4,
  "exportedAt": "2026-10-23T12:00:00.000Z",
  "data": {
    "schemaVersion": 4,
    "config": {},
    "quotes": [],
    "draft": { "locale": "it" }
  }
}
```

L'import accetta anche un `AppData` diretto. Dopo la validazione, i preventivi vengono ricalcolati dallo snapshot; se il ricalcolo fallisce, il preventivo resta senza risultato e la UI lo segnala.

---

## 4. Invarianti

1. `schemaVersion` è `4`: la catena v1 → v2 → v3 → v4 aggiunge `locale: 'it'`, gli stati del preventivo e converte `discountBp` in regola percentuale; salva un backup raw prima di applicarla.
2. Ogni import viene validato con Zod prima di sostituire i dati.
3. Un preventivo `saved` è modificabile in place usando lo snapshot; `sent` e `completed` sono bloccati. “Aggiorna prezzi” e la duplicazione creano una copia.
4. Un'entità con `archived = true` non è selezionabile per nuove righe, ma resta nello snapshot storico.
5. Le entità referenziate non si cancellano definitivamente.
6. Le tariffe sono selezionate per data; la data del preventivo è la chiave.
7. I prezzi di riga sono un'allocazione del prezzo netto totale, non prezzi indipendenti.
8. Il risultato non contiene `NaN`, `Infinity` o valori negativi (tranne il margine effettivo, che può essere negativo).

---

## 5. Migrazioni

- La versione corrente è `4`.
- `migrateAppData` rifiuta versioni future e versioni non numeriche.
- v1 → v2: `locale: 'it'` a preventivi e bozza.
- v2 → v3: abilita gli stati `draft | saved | sent | completed`.
- v3 → v4: `QuotePricing.discountBp` positivo diventa `discount: { mode: 'percent', valueBp }`; `0` diventa nessuno sconto e `PrintLine.discount` resta assente. Backup raw in `layercost:backup:schema-3`.
- In futuro: aggiungere una funzione per ogni versione e un fixture di test.
- Prima di una migrazione distruttiva, l'app deve conservare un backup raw.

---

## 6. Privacy e sicurezza

- In modalità ospite i dati restano nel browser; nessun backend.
- Con account, configurazione e preventivi sono su Supabase in regione EU; bozza, tema e lingua restano locali.
- I link condivisi contengono una copia compressa del preventivo nell'URL.
- L'import non esegue codice: JSON + validazione Zod.
- Nessun `eval`, nessun `dangerouslySetInnerHTML`.
- Svuotare i dati del browser cancella i dati: il backup JSON è l'unica copia esterna.
- L'export `.xlsx` è locale e di sola lettura: serve per analisi e non sostituisce il backup JSON.

---

## 7. Schema cloud (T5.4.2)

Il modello cloud è in `supabase/migrations/20261028120000_init.sql`; i tipi sono generati in `src/data/cloud/database.types.ts` e i mapper in `src/data/cloud/mappers.ts`.

Gli account (email, password, sessione) sono gestiti da **Supabase Auth** in `auth.users`; l'app non ha una tabella utenti propria. Le membership collegano `auth.users` ai workspace. La sessione è un token tecnico nel browser, non un dato economico e non entra nei backup.

| Tabella | Contenuto |
| --- | --- |
| `workspaces` | Spazio condiviso; ID `text` stabile |
| `workspace_members` | Membership `owner`/`editor`; PK `(workspace_id, user_id)`, FK a `auth.users` |
| `settings` | Una riga per workspace, campi scalari di `Settings` |
| `energy_tariffs` | Tariffe energia con `effective_from` |
| `printers` | Stampanti, profili potenza JSONB, `archived_at` |
| `materials` | Materiali, famiglia, prezzo al kg, `archived_at` |
| `extras` | Extra `perUnit`/`perJob`, `archived_at` |
| `quotes` | Preventivi `saved`/`sent`/`completed`; righe, lavoro, prezzo, snapshot e risultato in JSONB |

Invarianti cloud:

1. Le bozze restano locali: `quotes.status` ammette solo `saved`, `sent` e `completed`.
2. RLS su ogni tabella; l'accesso è consentito solo ai membri del workspace tramite `is_workspace_member`.
3. `workspace_members` è gestito solo dagli owner; l'ultimo owner non può essere rimosso.
4. I preventivi `sent`/`completed` non cambiano i campi economici; un trigger blocca anche le transizioni all'indietro.
5. La cancellazione fisica non è concessa: si usano `archived_at` e `deleted_at`.
6. `updated_at`/`updated_by` sono impostati dal database; il client non li usa per i calcoli.
7. I soldi restano interi in micro-euro, le percentuali in basis point, il tempo in secondi e la massa in centigrammi.

Test: `supabase/tests/rls.test.sql` (22 asserzioni pgTAP) e `src/data/cloud/mappers.test.ts`.

**Dati tecnici del sync (fuori da `AppData`):**

- `layercost:cloud-cache` — copia di lavoro della modalità connessa; non sovrascrive `layercost:data`.
- `layercost:sync-state` — outbox, metadati `updated_at` per entità, `workspaceId` e ultimo sync. Se il workspace cambia, cache e outbox vengono scartati prima di riusarli.
- La sessione Supabase è nella chiave `sb-<project-ref>-auth-token` gestita da `supabase-js`; non entra nei backup.

**Amministrazione:** `service_role` ha grant completi sulle tabelle solo per script admin (bootstrap, E2E, backup) e non viene usato dal client. `protect_last_owner` protegge gli utenti autenticati ma consente alle richieste senza subject JWT (service role/SQL) di rimuovere l'ultimo owner, così la cancellazione di un workspace può fare cascade. Il cleanup di test usa `delete from workspaces` con le FK attive.

**Limite noto:** gli ID delle entità sono primary key globali (`text`). Il deployment previsto ha un solo workspace condiviso; due workspace nello stesso database con gli stessi ID seed colliderebbero. Una multi-tenancy piena richiederebbe PK `(workspace_id, id)` e un adeguamento dei mapper.
