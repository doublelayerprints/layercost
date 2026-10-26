# Modello di costo — specifica normativa

**Stato:** bozza normativa v1
**Data:** 23 ottobre 2026
**Autorità:** questo documento è la fonte di verità per il calcolo. Se il codice non concorda, il codice è sbagliato.

---

## 1. Scopo

Definire in modo non ambiguo:

- quali voci compongono il costo di una stampa;
- come si combinano in un lotto;
- come si passa dal costo al prezzo;
- come si arrotondano i numeri;
- come si conservano i risultati nel tempo.

Il documento è accompagnato da esempi svolti e da casi di test. Ogni formula ha almeno un test di riferimento.

---

## 2. Unità e rappresentazione

Tutti i valori economici e fisici sono **interi** nel dominio. La UI converte da/serve decimali, ma il motore lavora solo con interi.

| Grandezza        | Unità interna | Simbolo | Esempio             |
| ---------------- | ------------- | ------- | ------------------- |
| Denaro           | micro-euro    | µ€      | €1 = 1.000.000 µ€   |
| Percentuale      | basis point   | bp      | 30% = 3.000 bp      |
| Tempo            | secondo       | s       | 10 h = 36.000 s     |
| Massa            | centigrammo   | cg      | 100 g = 10.000 cg   |
| Potenza          | watt          | W       | 190 W               |
| Prezzo energia   | µ€ per kWh    | µ€/kWh  | €0,25/kWh = 250.000 |
| Prezzo materiale | µ€ per kg     | µ€/kg   | €20/kg = 20.000.000 |
| Energia misurata | wattora       | Wh      | 1,8 kWh = 1.800 Wh  |

**Regola:** nessun `float` rappresenta denaro, percentuali, grammi o tempo nel dominio. I `float` sono ammessi solo come passaggio intermedio dentro una funzione di conversione, immediatamente arrotondata.

### 2.1 Limiti di validazione

I limiti servono anche a garantire che i prodotti intermedi restino entro `Number.MAX_SAFE_INTEGER` (9.007.199.254.740.991).

| Campo                |   Min |         Max | Note                    |
| -------------------- | ----: | ----------: | ----------------------- |
| Grammi per materiale |     0 |    10.000 g | 10 kg                   |
| Tempo slicer         |   1 s | 3.600.000 s | 1.000 h                 |
| Quantità             |     1 |      10.000 |                         |
| Potenza media        |   1 W |     5.000 W |                         |
| Prezzo energia       |     0 |     €10/kWh |                         |
| Prezzo materiale     |     0 |  €10.000/kg |                         |
| Prezzo stampante     |     0 |    €100.000 |                         |
| Vita utile           |   1 h |   100.000 h |                         |
| Manutenzione         |     0 |      €100/h |                         |
| Manodopera           |     0 |      €500/h |                         |
| Tasso guasti         |     0 |         50% |                         |
| Maggiorazione tempo  |     0 |        100% |                         |
| Ricarico             |     0 |      1.000% |                         |
| Margine              |     0 |         99% |                         |
| Sconto               |     0 |         90% |                         |
| IVA                  |     0 |         30% |                         |
| Passo arrotondamento | €0,01 |      €10,00 | multiplo di 1 centesimo |

Valori fuori range: errore bloccante. Valori insoliti ma validi (es. 15% guasti, 80% ricarico): avviso non bloccante.

I limiti sono individuali: combinazioni estreme possono comunque superare il limite sicuro di `Number`. Il motore verifica ogni prodotto intermedio con un guard e restituisce un errore di validazione, invece di produrre un numero impreciso.

---

## 3. Arrotondamenti

### 3.1 Arrotondamento base

I costi sono non negativi; il margine effettivo può essere negativo. Per questo `roundHalfUp` è definito con il segno:

```text
roundHalfUp(x) = sign(x) × floor(|x| + 0,5)
```

Per `x ≥ 0` coincide con `floor(x + 0,5)`.

Esempi: `roundHalfUp(2,4) = 2`; `roundHalfUp(2,5) = 3`; `roundHalfUp(2,6) = 3`; `roundHalfUp(-2,5) = -3`.

### 3.2 Arrotondamento a passo

```text
roundToStep(x, step, mode):
  up      -> ceil(x / step) × step
  nearest -> floor(x / step + 0,5) × step
  down    -> floor(x / step) × step
```

`step` è in µ€ ed è sempre un multiplo di 10.000 µ€ (1 centesimo).

### 3.3 Ordine di arrotondamento

1. Ogni componente di costo viene calcolato e arrotondato **al µ€**.
2. I componenti arrotondati vengono sommati: la somma è esatta in µ€.
3. La riserva guasti viene calcolata sulla somma e arrotondata al µ€.
4. Il costo totale del preventivo è la somma di valori interi: nessun arrotondamento aggiuntivo.
5. Il prezzo viene calcolato sul costo totale, poi scontato, poi arrotondato al passo scelto.
6. L'IVA viene calcolata sul prezzo arrotondato, in centesimi.
7. L'allocazione di costi fissi e prezzi usa il metodo dei resti più grandi, così le somme tornano esattamente.

**Perché:** l'ordine è parte della formula. Due implementazioni che arrotondano in punti diversi ottengono risultati diversi di qualche µ€. Il test di riferimento fissa l'ordine.

### 3.4 Precisione e overflow

Le formule sono scritte per **dividere prima di moltiplicare** quando il prodotto intermedio potrebbe superare il limite sicuro. Esempio: l'energia si calcola prima in Wh, poi si moltiplica per il prezzo.

```text
energyWh = watts × seconds / 3600          // massimo 5.000 × 1.000 = 5.000.000 Wh
cost     = energyWh × priceµ€PerKWh / 1000 // massimo 5e6 × 1e7 / 1e3 = 5e10
```

---

## 4. Input del calcolo

### 4.1 Entità coinvolte

- `Printer`: prezzo, valore residuo, vita utile, manutenzione, profili di potenza, avvio, tariffa override.
- `Material`: famiglia, prezzo €/kg, eventuale tasso guasti override.
- `EnergyTariff`: prezzo µ€/kWh, data di decorrenza.
- `Settings`: manodopera, tasso guasti, maggiorazione tempo, prezzo, arrotondamento, IVA.
- `PrintLine`: stampante, tempo slicer, materiali e grammi, quantità, finitura, extra, override.
- `Quote`: righe, costi di lavoro, extra di lavoro, data, sconto, override di prezzo.

### 4.2 Risoluzione delle tariffe

Per ogni riga:

1. **Tariffa energia**: se la stampante ha `energyTariffId`, usa quella; altrimenti usa la tariffa globale corrente alla data del preventivo. La tariffa corrente è quella con `effectiveFrom` più recente e ≤ data del preventivo. A parità di data, vince quella creata dopo.
2. **Prezzo materiale**: `pricePerKg` inserito nella UI. Il peso netto della bobina è informativo; la UI mostra la formula `prezzo bobina ÷ peso netto × 1000` per ricavare il prezzo al kg.
3. **Potenza media**: profilo della stampante per la famiglia del materiale; fallback al default della stampante. Se manca anche il default, errore.
4. **Tasso guasti**: override di riga, altrimenti il massimo tra gli override dei materiali della riga, altrimenti il valore globale.
5. **Manodopera**: tariffa globale; nel preventivo salvato viene congelata.
6. **Extra**: importi correnti; nel preventivo salvato vengono congelati.

### 4.3 Tempo effettivo

```text
effectiveSeconds =
  roundHalfUp(slicerSeconds × (10.000 + timeOverheadBp) / 10.000)
  + startupSeconds
```

- La maggiorazione si applica solo al tempo dello slicer.
- I minuti di avvio si aggiungono dopo.
- `startupSeconds = startupMinutes × 60`.
- L'energia di avvio è approssimata alla potenza media di stampa. È un'approssimazione documentata: il picco di riscaldamento è più alto, ma dura pochi minuti e l'errore è di pochi centesimi.

---

## 5. Componenti di costo

### 5.1 Materiale

```text
grams_m = grams_cg_m / 100
materialCost = Σ_m roundHalfUp(grams_m × pricePerKgµ€_m / 1000)
```

- `grams` è il **totale riportato dallo slicer**, comprensivo di supporti, brim, purge/flush e prime tower.
- Non si aggiunge una percentuale di spurgo per AMS/ACE: sarebbe un doppio conteggio.
- Una riga può avere più materiali. I grammi si sommano ai fini della validazione, ma il costo si calcola per materiale.
- La voce materiale con 0 g viene ignorata nel totale, ma resta visibile in UI.

**Esempio:** 100 g di PLA a €20/kg → `100 × 20.000.000 / 1000 = 2.000.000 µ€ = €2,00`.

### 5.2 Energia

```text
Se energyOverrideWh è presente:
  energyWh = energyOverrideWh
Altrimenti:
  avgWatts = powerOverrideW della riga, se presente
             altrimenti potenza media della famiglia con potenza più alta nella riga
  energyWh = avgWatts × effectiveSeconds / 3600

energyCost = roundHalfUp(energyWh × pricePerKWhµ€ / 1000)
```

**Regola multi-materiale:** si usa la potenza della famiglia con il valore più alto, non la somma. Il letto è uno solo e la temperatura dominante è quella del materiale più esigente. Sommare le potenze dei materiali double-counta la stampante.

**Override:** `energyOverrideWh` è pensato per chi misura i consumi con una presa intelligente. Se presente, bypassa il modello di potenza ma non il tempo effettivo, che serve per usura e manodopera. `powerOverrideW` è utile quando si conosce la potenza media ma non i kWh totali: sostituisce il profilo, senza bypassare il tempo.

**Mai la potenza nominale.** La potenza nominale è solo informativa nel profilo stampante.

### 5.3 Usura

```text
residualValue = roundHalfUp(purchasePriceµ€ × residualBp / 10.000)
depreciation  = roundHalfUp((purchasePriceµ€ − residualValue) × effectiveSeconds / (lifeHours × 3600))
maintenance   = roundHalfUp(maintenanceµ€PerHour × effectiveSeconds / 3600)
wearCost      = depreciation + maintenance
```

- L'ammortamento è **per ore di stampa**, non per calendario.
- Il valore residuo è una percentuale del prezzo di acquisto (default 20% nel seed attuale; 0% nella configurazione di test dei golden case).
- La manutenzione è una riserva €/h per ugelli, piatti, cinghie, lubrificante.
- Non modella l'usura differenziale per materiale: è una media dichiarata.
- Se il prezzo di acquisto è 0, l'ammortamento è 0 e la UI mostra un avviso.

### 5.4 Manodopera

```text
lineLabor = roundHalfUp(finishingSecondsPerUnit × laborRateµ€PerHour / 3600)
jobLabor  = roundHalfUp((setupSeconds + designSeconds) × laborRateµ€PerHour / 3600)
```

- `lineLabor` è per unità e viene moltiplicata per la quantità.
- `jobLabor` è una sola volta per preventivo.
- Tariffa default €0/h: il campo esiste, ma per hobby non incide.
- La riserva guasti include la manodopera di riga, non quella di lavoro.

### 5.5 Extra

- `lineExtras` = somma degli extra di riga, **per unità**. Vengono moltiplicati per la quantità.
- `jobExtras` = somma degli extra di lavoro, una sola volta.
- Un extra di tipo `perJob` non può essere attaccato a una riga: la validazione lo impedisce.
- Un extra personalizzato del preventivo vive solo nel preventivo, non nel catalogo.

### 5.6 Riserva guasti

```text
failureBase    = materialCost + energyCost + wearCost + lineLabor
failureReserve = roundHalfUp(failureBase × failureBp / (10.000 − failureBp))
```

- `failureBp` è la probabilità che una stampa fallisca e debba essere rifatta.
- Il valore atteso dei tentativi è `1 / (1 − p)`, quindi il costo aggiuntivo atteso è `base × p / (1 − p)`.
- Con p = 5% la maggiorazione effettiva è 5,2632%, non 5%.
- Base: materiale, energia, usura, manodopera di riga. Esclusi extra e costi di lavoro.
- `0 ≤ failureBp < 10.000`; il limite di validazione v1 è 50%. Oltre, il modello lineare è troppo ottimistico e va trattato come caso eccezionale.
- La riserva è per unità, prima della moltiplicazione per quantità.

**Perché non `base × p`:** sottostima il numero atteso di tentativi. La differenza è piccola ma la formula corretta è semplice.

### 5.7 Costo di riga

```text
directUnitCost =
  materialCost
+ energyCost
+ wearCost
+ lineLabor
+ lineExtras
+ failureReserve

lineDirectCost = directUnitCost × quantity
```

Tutti i termini sono interi in µ€. La moltiplicazione per quantità è esatta entro i limiti di validazione.

---

## 6. Costo del preventivo

### 6.1 Totali

```text
directTotal   = Σ lineDirectCost
jobLaborTotal = setupLabor + designLabor
jobExtrasTotal = Σ jobExtras
jobFixedTotal = jobLaborTotal + jobExtrasTotal
totalCost     = directTotal + jobFixedTotal
```

- La spedizione è un extra di lavoro.
- Se non ci sono righe valide, il preventivo non è calcolabile.
- I costi fissi non vengono moltiplicati per la quantità.

### 6.2 Ripartizione dei costi fissi

Due modalità:

- **`proportional`** (default): peso = `lineDirectCost`.
- **`equalPerUnit`**: peso = `quantity`.

Algoritmo dei resti più grandi, in µ€:

1. Calcola la quota esatta di ogni riga: `jobFixedTotal × weight / totalWeight`.
2. Prendi la parte intera (floor) di ogni quota.
3. Somma le parti intere; la differenza rispetto a `jobFixedTotal` è il numero di µ€ da distribuire.
4. Assegna un µ€ alla volta alle righe con il resto frazionario più grande.
5. A parità di resto: peso maggiore, poi ordine stabile della riga.

Risultato:

```text
allocatedFixed_line = quota intera + eventuale resto
fullyLoadedLineCost = lineDirectCost + allocatedFixed_line
```

La somma delle quote è **esattamente** `jobFixedTotal`.

Per la visualizzazione:

```text
fullyLoadedUnitCost = fullyLoadedLineCost / quantity
```

Se la divisione non è esatta, la UI mostra 3 decimali o un valore medio dichiarato. Il dato canonico è il costo della riga.

### 6.3 Se il peso totale è zero

Se tutte le righe hanno costo 0, ripartisci in parti uguali per riga. È un caso limite, ma non deve produrre `NaN`.

---

## 7. Prezzo, sconto e IVA

### 7.1 Modalità

- **Ricarico (markup):** percentuale sul costo.
- **Margine (margin):** percentuale sul prezzo.

```text
markup: rawPrice = totalCost × (10.000 + markupBp) / 10.000
margin: rawPrice = totalCost × 10.000 / (10.000 − marginBp)
```

`marginBp` deve essere < 10.000 (100%). Un margine del 100% è invalido.

### 7.2 Sconto

Lo sconto è commerciale: riduce il prezzo, non il costo.

```text
discountedRawPrice = rawPrice × (10.000 − discountBp) / 10.000
```

Lo sconto si applica **prima** dell'arrotondamento finale.

### 7.3 Arrotondamento finale

```text
finalPriceµ€ = roundToStep(discountedRawPrice, stepµ€, mode)
```

Il prezzo finale è un multiplo di 1 centesimo. Il passo default è €0,10 per eccesso.

### 7.4 IVA

Tre modalità:

- **`none`**: nessuna IVA.
- **`excluded`**: il prezzo calcolato è netto; l'IVA si aggiunge.
- **`included`**: il prezzo calcolato è lordo; l'IVA si estrae.

```text
excluded:
  netPriceCents = finalPriceµ€ / 10.000
  vatCents      = roundHalfUp(netPriceCents × vatBp / 10.000)
  grossCents    = netPriceCents + vatCents

included:
  grossCents = finalPriceµ€ / 10.000
  netCents   = roundHalfUp(grossCents × 10.000 / (10.000 + vatBp))
  vatCents   = grossCents − netCents
```

Default: `none`, aliquota pronta al 22%.

### 7.5 Margine effettivo

```text
effectiveMarginBp = roundHalfUp((netPrice − totalCost) × 10.000 / netPrice)
```

Se `netPrice = 0`, il margine non è definito e la UI mostra `—`. Se lo sconto è alto, il margine effettivo può essere negativo: la UI lo mostra con il segno, non lo nasconde.

### 7.6 Prezzo per riga

Il prezzo canonico è quello **totale** del preventivo. Per mostrare un prezzo per riga:

1. Prendi `netPriceCents` (sempre al netto dell'IVA).
2. Ripartiscilo tra le righe in proporzione a `fullyLoadedLineCost`, usando i resti più grandi, **in centesimi**.
3. La somma dei prezzi di riga è esattamente il prezzo netto totale.
4. Il prezzo unitario è `prezzoRigaCents / quantity`; se non è un numero intero di centesimi, mostralo come media con 3 decimali e dichiaralo.

L'IVA è mostrata a parte sul totale: i prezzi di riga non la includono.

Questa è un'allocazione, non un prezzo calcolato indipendentemente. Evita che la somma delle righe differisca dal totale di qualche centesimo. Il margine effettivo si calcola sempre sul totale del preventivo, non sulle singole righe allocate.

### 7.7 Ordine completo

```text
costo totale
→ ricarico o margine
→ sconto
→ arrotondamento al passo
→ IVA
→ allocazione del prezzo alle righe (solo display)
```

---

## 8. Snapshot e riproducibilità

### 8.1 Cosa contiene un preventivo salvato

- `engineVersion`
- `quoteDate`
- righe con input:
  - nome e ID stampante/materiali;
  - grammi, tempo slicer, quantità, finitura, extra;
- costi di lavoro;
- impostazioni di prezzo: modalità, ricarico/margine, passo, modo, sconto, IVA;
- **snapshot completo della configurazione risolta**: `{ config, capturedAt, engineVersion }`, dove `config` contiene stampanti, materiali, extra e impostazioni con le tariffe del momento;
- risultato calcolato: componenti, totali, prezzo, margine effettivo;
- timestamp di creazione e aggiornamento.

`schemaVersion` è a livello di archivio (`AppData`), non del singolo preventivo. Le tariffe per riga sono quelle risolte dalla configurazione contenuta nello snapshot.

### 8.2 Regole

- Un preventivo salvato **non cambia** quando cambiano materiali, stampanti o tariffe.
- "Aggiorna ai prezzi correnti" crea una **copia**: l'originale resta storico.
- Se un'entità referenziata viene archiviata, il preventivo continua a funzionare dallo snapshot.
- La cancellazione definitiva di un'entità referenziata è vietata.
- Se `engineVersion` del preventivo è diversa da quella corrente, la UI mostra un avviso e permette il ricalcolo in una copia.

### 8.3 Versione del motore

SemVer:

- **major**: cambia la struttura dei risultati o il significato di un campo;
- **minor**: cambia una formula in modo che i risultati possano cambiare;
- **patch**: correzione che non cambia i risultati attesi.

Ogni cambio di formula aggiorna `cost-model.md`, i golden test e la versione.

---

## 9. Esempi svolti

### 9.1 Esempio 1 — stampa singola

> Configurazione di test: i valori €0,25/kWh e €0,03/h servono a verificare le formule. Non sono i default del seed attuale (€0,20/kWh e €0,01/h).

**Input**

| Campo               | Valore              |
| ------------------- | ------------------- |
| Stampante           | Kobra 3             |
| Materiale           | PLA, €20/kg         |
| Grammi              | 100 g               |
| Tempo slicer        | 10 h = 36.000 s     |
| Avvio               | 5 min = 300 s       |
| Maggiorazione tempo | 0%                  |
| Potenza media       | 190 W               |
| Tariffa energia     | €0,25/kWh           |
| Prezzo stampante    | €300                |
| Valore residuo      | 0%                  |
| Vita utile          | 3.000 h             |
| Manutenzione        | €0,03/h             |
| Manodopera          | €0/h                |
| Extra               | 0                   |
| Tasso guasti        | 5%                  |
| Prezzo              | Ricarico 30%        |
| Arrotondamento      | Per eccesso a €0,10 |
| IVA                 | Nessuna             |
| Quantità            | 1                   |

**Calcolo**

| Voce                | Calcolo                                              |            µ€ |            € |
| ------------------- | ---------------------------------------------------- | ------------: | -----------: |
| Materiale           | 100 × 20.000.000 / 1000                              |     2.000.000 |     2,000000 |
| Tempo effettivo     | 36.000 + 300                                         |      36.300 s |  10,083333 h |
| Energia             | 190 × 36.300 / 3600 = 1.915,833 Wh; × 250.000 / 1000 |       478.958 |     0,478958 |
| Ammortamento        | 300.000.000 × 36.300 / (3.000 × 3600)                |     1.008.333 |     1,008333 |
| Manutenzione        | 30.000 × 36.300 / 3600                               |       302.500 |     0,302500 |
| Manodopera          | 0                                                    |             0 |            0 |
| Extra               | 0                                                    |             0 |            0 |
| **Costo variabile** | somma                                                | **3.789.791** | **3,789791** |
| Riserva guasti 5%   | 3.789.791 × 500 / 9.500                              |       199.463 |     0,199463 |
| **Costo diretto**   |                                                      | **3.989.254** | **3,989254** |
| Prezzo +30%         | 3.989.254 × 13.000 / 10.000                          |     5.186.030 |     5,186030 |
| Arrotondamento      | per eccesso a €0,10                                  |     5.200.000 |     **5,20** |
| Margine effettivo   | (5,20 − 3,989254) / 5,20                             |               |   **23,28%** |

Nota: i valori mostrati in euro sono arrotondati per leggibilità; i calcoli usano i µ€.

### 9.2 Esempio 2 — lotto con costi fissi

**Input**

| Riga | Costo diretto/unità | Quantità | Costo diretto riga |
| ---- | ------------------: | -------: | -----------------: |
| A    |               €2,00 |        2 |              €4,00 |
| B    |               €5,00 |        1 |              €5,00 |

Costi fissi: setup €1,00 + spedizione €5,00 = €6,00.
Ripartizione: proporzionale al costo diretto. Prezzo: ricarico 30%, arrotondamento per eccesso a €0,10.

**Calcolo**

```text
directTotal = 4,00 + 5,00 = 9,00 €
totalCost   = 9,00 + 6,00 = 15,00 €

Quote costi fissi (peso = costo diretto):
  A: 6,00 × 4/9 = 2,666667 € → 2.666.667 µ€
  B: 6,00 × 5/9 = 3,333333 € → 3.333.333 µ€
  somma = 6.000.000 µ€

Costi pieni:
  A: 4.000.000 + 2.666.667 = 6.666.667 µ€
  B: 5.000.000 + 3.333.333 = 8.333.333 µ€
  totale = 15.000.000 µ€

Prezzo:
  15.000.000 × 13.000 / 10.000 = 19.500.000 µ€
  arrotondamento a €0,10 → 19.500.000 µ€ = 19,50 €

Allocazione prezzo (in centesimi, pesi = costo pieno):
  A: 1.950 × 6.666.667 / 15.000.000 = 866,66671 → 867 cent
  B: 1.950 × 8.333.333 / 15.000.000 = 1.083,33329 → 1.083 cent
  somma = 1.950 cent = 19,50 €

Prezzo unitario medio:
  A: 867 / 2 = 433,5 cent → €4,335 medio
  B: 1.083 cent → €10,83
```

La somma dei prezzi di riga è esattamente €19,50. Il prezzo unitario di A è mostrato come media perché 8,67 € diviso 2 non è un numero intero di centesimi.

### 9.3 Esempio 3 — margine, sconto e IVA

**Input:** costo €10,00; margine 25%; sconto 10%; IVA 22% esclusa; arrotondamento al €0,10 più vicino.

```text
rawPrice        = 10,00 × 10.000 / (10.000 − 2.500) = 13,333333 €
discountedRaw   = 13,333333 × 0,90 = 12,000000 €
finalNet        = 12,00 € (già multiplo di 0,10)
IVA             = 12,00 × 22% = 2,64 €
gross           = 14,64 €
margine effettivo = (12,00 − 10,00) / 12,00 = 16,67%
```

Lo sconto riduce il margine effettivo, non il costo. La UI mostra entrambi.

---

## 10. Casi limite e validazione

| Caso                                              | Comportamento                                           |
| ------------------------------------------------- | ------------------------------------------------------- |
| Riga senza materiali o con 0 g totali             | Errore bloccante                                        |
| Tempo 0                                           | Errore bloccante                                        |
| Quantità 0                                        | Errore bloccante (le bozze incompleta non si calcolano) |
| Materiale senza potenza e stampante senza default | Errore bloccante con messaggio chiaro                   |
| Tariffa mancante o non valida alla data           | Errore bloccante                                        |
| Prezzo stampante 0                                | Ammortamento 0 + avviso                                 |
| Vita utile 0                                      | Errore bloccante                                        |
| Tasso guasti 0                                    | Nessuna riserva                                         |
| Tasso guasti ≥ 100%                               | Errore bloccante                                        |
| Sconto 100%                                       | Errore (max 90%)                                        |
| Margine 100%                                      | Errore                                                  |
| Arrotondamento con passo 0                        | Errore                                                  |
| Entità archiviata in un preventivo                | Lo snapshot continua a funzionare                       |
| Entità archiviata in una nuova riga               | Non selezionabile                                       |
| Import con schema più nuovo                       | Rifiutato con messaggio                                 |
| Import corrotto                                   | Rifiutato, dati correnti intatti                        |
| Migrazione fallita                                | Backup conservato, errore, nessun overwrite             |
| Prezzo finale 0                                   | Consentito solo con sconto estremo; avviso              |
| Valori fuori range                                | Errore con campo evidenziato                            |

---

## 11. Casi di test di riferimento

Ogni caso è un test automatico. I fixture sono condivisi tra documentazione e test.

| ID   | Caso                      | Verifica                                                                                  |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------- |
| G-01 | Esempio 1                 | Costo 3.989.254 µ€; prezzo 5.200.000 µ€; margine 23,28%                                   |
| G-02 | Esempio 2                 | Costi fissi ripartiti 2.666.667 + 3.333.333; prezzo 19.500.000 µ€; righe 867 + 1.083 cent |
| G-03 | Esempio 3                 | Prezzo netto 12,00 €; IVA 2,64 €; lordo 14,64 €; margine 16,67%                           |
| G-04 | Guasti 0%                 | Nessuna riserva                                                                           |
| G-05 | Guasti 20%                | Riserva = base × 0,25                                                                     |
| G-06 | Due materiali             | Somma grammi e costo per materiale; potenza max                                           |
| G-07 | Override kWh              | Energia = Wh × tariffa / 1000; usura invariata                                            |
| G-08 | Quantità 3                | Costi variabili ×3; costi fissi una volta                                                 |
| G-09 | Ripartizione equalPerUnit | Pesi = quantità; somma esatta                                                             |
| G-10 | Margine 50%               | Prezzo = costo × 2                                                                        |
| G-11 | Sconto 10%                | Prezzo scontato prima dell'arrotondamento                                                 |
| G-12 | IVA inclusa               | Netto estratto dal lordo; somma netto + IVA = lordo                                       |
| G-13 | Arrotondamento nearest    | 5,04 → 5,00; 5,05 → 5,10                                                                  |
| G-14 | Arrotondamento down       | 5,09 → 5,00                                                                               |
| G-15 | Tariffa storica           | Preventivo del 2025 usa la tariffa 2025 anche dopo un cambio                              |
| G-16 | Entità archiviata         | Snapshot calcola ancora; nuova riga non la vede                                           |
| G-17 | Valori massimi            | Nessun overflow, risultato coerente                                                       |
| G-18 | Preventivo senza righe    | Errore, non 0 € silenzioso                                                                |

### 11.1 Proprietà

- Aumentare grammi non diminuisce il costo del materiale.
- Aumentare tempo non diminuisce energia e usura.
- Con ricarico ≥ 0, prezzo ≥ costo.
- Con margine in [0, 100), prezzo ≥ costo.
- La somma delle quote fisse è esattamente il totale.
- La somma dei prezzi di riga è esattamente il prezzo totale.
- Un preventivo salvato non cambia dopo la modifica delle tariffe.
- Nessun risultato è `NaN`, `Infinity` o negativo.

---

## 12. Invarianti

1. Tutti gli importi sono interi in µ€.
2. Tutte le percentuali sono intere in bp.
3. Il dominio non usa `Date.now()`, `crypto.randomUUID()` o `localStorage` direttamente: riceve `now` e `id` dall'esterno.
4. La potenza nominale non entra mai nel costo.
5. I grammi dello slicer non vengono maggiorati per purge/AMS.
6. Un preventivo è modificabile finché è `saved`; usa lo snapshot e non cambia i prezzi. Dopo invio/completamento è bloccato.
7. Le entità referenziate non si cancellano.
8. Ogni formula ha un test di riferimento.
9. Un cambio di formula aggiorna documentazione, test e versione del motore.
10. Il costo è separato dal prezzo.

---

## 13. Approssimazioni dichiarate

- La potenza media per famiglia è una stima; l'override kWh è il modo per migliorarla.
- L'energia di avvio usa la potenza media, non il picco di riscaldamento.
- L'usura è lineare nelle ore e non dipende dal materiale.
- Il tasso guasti è una probabilità uniforme e indipendente per stampa.
- L'ammortamento è per ore di stampa, non per obsolescenza calendario.
- La manodopera non include contributi, overhead o costi aziendali.
- Non ci sono costi finanziari, inflazione o tassi di cambio.
- La tariffa energia è il costo marginale al kWh, non il costo medio della bolletta.
- La spedizione è un importo fisso, non calcolata dal corriere.
- L'energia di asciugatura del filamento e il consumo standby dell'ACE non sono inclusi; se servono, si aggiungono come extra.
- Il consumo del sistema multicolore durante la stampa è incluso nella potenza media della stampante, non modellato a parte.
- Il ricarico si applica a tutti i costi, inclusi extra e spedizione. Un pass-through per la spedizione è un'evoluzione futura.
- La modalità IVA è uno strumento di presentazione, non una consulenza fiscale.

Se una di queste approssimazioni non basta, si aggiunge un campo configurabile e un ADR, non una formula nascosta.
