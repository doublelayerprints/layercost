# Golden cases

**Stato:** allineati a `src/domain/cost.test.ts`
**Nota:** i valori sono in micro-euro (µ€), salvo dove indicato.

---

## G-01 — Stampa singola

**Input:** Kobra 3 di test, PLA €20/kg, 100 g, 10 h slicer, 5 min avvio, 0% maggiorazione tempo, 190 W, €0,25/kWh, stampante €300, vita 3.000 h, manutenzione €0,03/h, guasti 5%, ricarico 30%, arrotondamento per eccesso a €0,10, nessuna IVA.

| Voce                   |                    µ€ |
| ---------------------- | --------------------: |
| Materiale              |             2.000.000 |
| Energia                |               478.958 |
| Ammortamento           |             1.008.333 |
| Manutenzione           |               302.500 |
| Manodopera             |                     0 |
| Extra                  |                     0 |
| Costo variabile        |             3.789.791 |
| Riserva guasti 5%      |               199.463 |
| **Costo diretto**      |         **3.989.254** |
| Prezzo +30%            |             5.186.030 |
| **Prezzo arrotondato** | **5.200.000** (€5,20) |
| **Margine effettivo**  |            **23,28%** |

L'energia è calcolata su 1.915,833 Wh; il risultato mostra 1.916 Wh arrotondati per leggibilità, ma il costo usa il valore non arrotondato.

---

## G-02 — Lotto con costi fissi

**Input:** due righe con costo diretto €2,00 × 2 pezzi e €5,00 × 1 pezzo; setup €1,00; spedizione €5,00; ripartizione proporzionale; ricarico 30%; arrotondamento a €0,10.

| Voce                 |                 Valore |
| -------------------- | ---------------------: |
| Costo diretto totale |           9.000.000 µ€ |
| Manodopera setup     |           1.000.000 µ€ |
| Extra di lavoro      |           5.000.000 µ€ |
| Costi fissi          |           6.000.000 µ€ |
| Costo totale         |          15.000.000 µ€ |
| Prezzo               | 19.500.000 µ€ (€19,50) |
| Quota fissa riga A   |           2.666.667 µ€ |
| Quota fissa riga B   |           3.333.333 µ€ |
| Costo pieno riga A   |           6.666.667 µ€ |
| Costo pieno riga B   |           8.333.333 µ€ |
| Prezzo riga A        |       867 cent (€8,67) |
| Prezzo riga B        |    1.083 cent (€10,83) |

La somma dei prezzi di riga è esattamente €19,50. Il prezzo unitario di A è una media: 867 / 2 = 433,5 cent.

---

## G-03 — Margine, sconto e IVA

**Input:** costo €10,00; margine 25%; sconto 10%; IVA 22% esclusa; arrotondamento al €0,10 più vicino.

| Voce              |        Valore |
| ----------------- | ------------: |
| Prezzo raw        | 13.333.333 µ€ |
| Sconto            |  1.333.333 µ€ |
| Prezzo netto      |       12,00 € |
| IVA               |        2,64 € |
| Prezzo lordo      |       14,64 € |
| Margine effettivo |        16,67% |

---

## Altri casi coperti

- G-04: guasti 0% → nessuna riserva.
- G-05: guasti 20% → riserva = base × 0,25.
- G-06: due materiali → costo per materiale, potenza massima.
- G-07: override kWh → energia da Wh, usura invariata.
- G-08: quantità 3 → costi variabili ×3, costi fissi una volta.
- G-09: ripartizione uguale per pezzo.
- G-10: margine 50% → prezzo = costo × 2.
- G-11: sconto prima dell'arrotondamento.
- G-12: IVA inclusa → netto estratto dal lordo.
- G-13: arrotondamento nearest.
- G-14: arrotondamento down.
- G-15: tariffa storica.
- G-16: entità archiviata nello snapshot.
- G-17: valori massimi / guard.
- G-18: preventivo senza righe → errore.

I test eseguibili sono in `src/domain/cost.test.ts`. Se un valore cambia, cambiano nello stesso commit documento, test e `engineVersion`.
