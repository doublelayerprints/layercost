# Glossario

**Stato:** v1.0.0 + T5.20 + EVO-7

| Termine               | Significato                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Ammortamento**      | Quota del prezzo della stampante consumata dalle ore di stampa: `(prezzo − valore residuo) / ore di vita`. |
| **AMS / ACE**         | Sistemi multicolore. La Kobra X usa ACE 2 Pro; nel progetto “multicolore” è il termine generico.           |
| **Basis point (bp)**  | Centesimo di punto percentuale. 100% = 10.000 bp; 5% = 500 bp.                                             |
| **Brim**              | Bordo di adesione al piatto, già incluso nei grammi dello slicer.                                          |
| **Costo diretto**     | Materiale + energia + usura + manodopera di riga + extra + riserva guasti, per unità o per riga.           |
| **Costo pieno**       | Costo diretto più la quota di costi fissi (setup, design, spedizione) ripartita.                           |
| **Costo totale**      | Somma di tutti i costi diretti e fissi del preventivo.                                                     |
| **Directory membri**  | Elenco dei membri di uno spazio con ruolo e nome visibile; l’email completa resta solo agli owner.           |
| **Centigrammo (cg)**  | Un centesimo di grammo. 100 g = 10.000 cg.                                                                 |
| **Flush / purge**     | Filamento espulso durante i cambi colore. È già incluso nei grammi totali dello slicer.                    |
| **Grammi slicer**     | Totale di filamento riportato dallo slicer, comprensivo di supporti, brim, purge e prime tower.            |
| **Manutenzione**      | Riserva €/h per ugello, piatto, cinghie, lubrificante e altri consumabili.                                 |
| **Margine**           | Percentuale sul prezzo: `prezzo = costo / (1 − margine)`.                                                  |
| **Margine effettivo** | `(prezzo netto − costo totale) / prezzo netto`, dopo sconto e arrotondamento.                              |
| **Micro-euro (µ€)**   | Un milionesimo di euro. €1 = 1.000.000 µ€.                                                                 |
| **Nome visibile**     | Nome unico per utente (1–40 caratteri) salvato in `profiles`; lo vedono i membri degli spazi condivisi.     |
| **Profilo**           | Record `profiles` e sezione **Impostazioni → Profilo** dove l’utente sceglie il proprio nome visibile.      |
| **Preventivo**        | Documento salvato con righe, prezzi, snapshot e risultato.                                                 |
| **Prime tower**       | Torre di spurgo delle stampe multicolore, inclusa nei grammi dello slicer.                                 |
| **Ricarico (markup)** | Percentuale sul costo: `prezzo = costo × (1 + ricarico)`.                                                  |
| **Riserva guasti**    | Costo atteso dei rifacimenti: `base × p / (1 − p)`, con p = probabilità di guasto.                         |
| **Sconto di riga**    | Sconto commerciale sulla singola stampa, percentuale o a importo fisso sul totale della riga.               |
| **Sconto del preventivo** | Sconto commerciale sul totale, applicato dopo gli sconti di riga.                                       |
| **Snapshot**          | Copia della configurazione usata al momento del salvataggio di un preventivo.                              |
| **Slicer**            | Software che genera il G-code e stima tempo e filamento.                                                   |
| **Tag attività**      | Etichette “Creato da …” e “Ultima modifica di …” con data nella lista Preventivi degli spazi condivisi.     |
| **Tasso guasti**      | Probabilità che una stampa fallisca e debba essere rifatta.                                                |
| **Tariffa energia**   | Costo marginale al kWh, con decorrenza.                                                                    |
| **Tema**              | Preferenza dell'interfaccia: sistema, chiaro o scuro. Vive sul dispositivo, fuori dai dati del preventivo. |
| **Tempo effettivo**   | Tempo slicer maggiorato e sommato ai minuti di avvio.                                                      |
| **Usura**             | Ammortamento + manutenzione della stampante.                                                               |
| **Utile (guadagno)**  | Prezzo netto meno costo pieno, in euro. Valore di visualizzazione della vista interna; può essere negativo. |
| **Valore residuo**    | Valore della stampante a fine vita, in percentuale del prezzo di acquisto.                                 |
| **Vista cliente**     | Link condiviso e stampa/PDF standard: solo prezzi, IVA e note, senza costi o margine.                       |
| **Vista interna**     | Calcolatore e dettaglio: costo pieno, utile, margine effettivo e composizione del costo.                   |
| **Vita utile**        | Ore di stampa stimate prima della sostituzione della stampante.                                            |
| **Wh**                | Wattora. 1 kWh = 1.000 Wh.                                                                                 |
