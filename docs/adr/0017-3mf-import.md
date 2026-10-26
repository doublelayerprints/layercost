# ADR-0017 — Import diretto da slicer: il `.3mf` è il formato di riferimento

**Stato:** Accettato (implementazione non iniziata)
**Data:** 26 ottobre 2026

## Contesto

Oggi tempo e grammi si inseriscono a mano. Il committente vuole che un file `.3mf` prodotto dallo slicer possa generare direttamente il preventivo. Il `.3mf` non è un formato unico: è un contenitore ZIP basato su OPC, e ogni slicer aggiunge metadati propri.

I file rilevanti per LayerCost sono due:

- **progetto non slicato** (`.3mf`, `.project.3mf`): contiene geometria e impostazioni, ma non un tempo di stampa o un consumo di filamento affidabili;
- **file slicato** (`.gcode.3mf`): contiene il G-code e, per OrcaSlicer, Bambu Studio e Anycubic Slicer Next (basato su Orca), `Metadata/slice_info.config` con `prediction` in secondi e `used_g` per filamento.

La regola di dominio resta ADR-0006: i grammi sono il totale dello slicer, senza supplementi automatici per purge, flush o prime tower.

## Decisione

1. **Il `.3mf` è l'unico import diretto della fase 5.** CSV, JSON e incolla manuale restano fallback separati, non il percorso principale.
2. **Si importano file già slicati.** Il percorso supportato è `.gcode.3mf` di OrcaSlicer, Bambu Studio e Anycubic Slicer Next. Un `.3mf` di solo modello o progetto viene rifiutato con un messaggio che chiede di slicare ed esportare il file completo.
3. **Estrazione locale.** Il file viene letto nel browser, senza upload e senza backend. Il parsing sta nel layer `data`; la trasformazione in `PrintLine` è una funzione pura nel dominio.
4. **Tempo e grammi dallo slicer.** `slice_info.config` fornisce `prediction` (secondi) e `used_g` per ogni filamento. Se `slice_info.config` manca, si può leggere l'intestazione del G-code incorporato; se manca anche quella, l'import si ferma con un errore azionabile.
5. **Piatti multipli.** Ogni piatto selezionato diventa una riga del preventivo, con il proprio tempo e i propri materiali. La quantità resta 1: il file descrive già il numero di pezzi.
6. **Mappatura esplicita.** La stampante viene proposta dal `printer_model_id`/`printer_model`; il materiale viene mappato per tipo (`PLA`, `PETG`, …). Se non c'è corrispondenza, l'utente sceglie senza creare entità in modo silenzioso.
7. **Nessun cambio al motore.** Formule, unità, `engineVersion`, snapshot e schema dei preventivi non cambiano. L'import produce solo input per le righe esistenti.
8. **Nessun supplemento AMS/ACE.** I grammi importati sono già comprensivi di purge e prime tower (ADR-0006).

## Alternative considerate

- **Solo CSV/JSON o incolla manuale.** Semplice, ma non è “import diretto” e resta un passaggio manuale.
- **Solo G-code.** Più universale, ma richiede di gestire formati e header diversi e non sfrutta i metadati strutturati del `.3mf`.
- **Cloud slicing.** Richiede un servizio esterno, non è offline e non è gratuito in modo affidabile.
- **Importare anche progetti non slicati.** Non c'è un tempo/grammi affidabile: si potrebbe importare solo la geometria, che non serve al costo.
- **Aggiungere una percentuale per AMS/ACE.** Vietato da ADR-0006: i grammi dello slicer sono già totali.

## Conseguenze

- Nuovo modulo di import nel layer `data` con un parser ZIP/XML e limiti di sicurezza.
- Nuova funzione pura di mapping `ThreeMfSummary → PrintLine[]` nel dominio, con test.
- Nuova UI di import con anteprima, mappatura e gestione errori.
- Nuova dipendenza per lo ZIP (da scegliere con un ADR o una nota tecnica): `fflate` è il candidato per peso e streaming; `jszip` è l'alternativa più nota.
- Fixture di test da file reali di Anycubic Slicer Next, OrcaSlicer e Bambu Studio.
- Il piano operativo e le domande aperte sono in `docs/planning/phase-5.md` §2.
