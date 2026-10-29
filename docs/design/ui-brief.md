# UI brief — fase design

**Stato:** requisiti per la fase 4, non stile visivo
**Uso:** input per la skill di design. Non contiene colori, font o moodboard definitivi.

---

## 1. Obiettivo

Rendere LayerCost veloce da usare mentre si è davanti allo slicer: inserire tempo e grammi, vedere subito costo e prezzo, salvare e condividere. La UI attuale è funzionale ma volutamente semplice; la fase design può rifarla senza toccare dominio, store o formule.

## 2. Utenti

- **Tancredi** — Kobra 3, senza multicolore, hobby e piccoli lotti.
- **La sua amorosa** — Kobra X con ACE 2 Pro, stampe multicolore.
- **Futuro uso commerciale** — preventivi con margine e IVA.

## 3. Flussi principali

1. **Primo avvio** — capire che i dati sono stime, aprire stampanti/tariffa/materiali, completare la guida.
2. **Calcolo singolo** — scegliere stampante e materiale, inserire tempo e grammi, leggere il risultato.
3. **Lotto** — aggiungere righe, duplicare, cambiare quantità, vedere costo pieno e prezzo.
4. **Preventivo** — impostare ricarico/sconto/IVA, salvare, stampare o condividere.
5. **Archivio** — cercare, aprire, duplicare, aggiornare prezzi, archiviare.
6. **Confronto** — stesso lavoro su Kobra 3 e Kobra X, con delta.
7. **Configurazione** — modificare stampanti, materiali, tariffe, extra, default.

## 4. Schermate

| Schermata            | Contenuto essenziale                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| Calcolatore          | Meta preventivo, righe, materiali, costi di lavoro, prezzo, riepilogo, dettaglio |
| Preventivi           | Ricerca, stato, totali, azioni                                                   |
| Dettaglio preventivo | Riepilogo, righe, componenti, snapshot, azioni                                   |
| Condivisione         | Preventivo read-only, import, stampa                                             |
| Stampanti            | Schede con prezzo, vita, potenza, manutenzione                                   |
| Materiali            | Prezzo/kg, peso bobina, tasso guasti                                             |
| Tariffe              | Storico e tariffa corrente                                                       |
| Extra                | Per pezzo / per lavoro                                                           |
| Impostazioni         | Manodopera, rischio, prezzo, backup, tema                                        |
| Richiesta accesso    | Email, nome, messaggio, nota privacy, consenso, invio, conferma, errore          |
| Confronto            | Due colonne e delta                                                              |

## 5. Stati obbligatori

- Vuoto (nessuna riga, nessun preventivo, nessun materiale).
- Incompleto (tempo o grammi a zero).
- Calcolato.
- Salvato.
- Archiviato.
- Non ricalcolabile.
- Errore di salvataggio.
- Import in corso / riuscito / fallito.
- Link condiviso invalido.
- Unsaved changes (quando si cambia preventivo).
- Richiesta accesso: idle, invio, conferma, errore, endpoint mancante.

## 6. Dati e gerarchia

- Il **prezzo totale** è il numero più importante.
- Il **costo totale** è il secondo.
- Il **margine effettivo** deve essere visibile ma non dominante.
- Il dettaglio per componente deve essere consultabile, non rumoroso.
- Le voci stimate devono essere riconoscibili (badge o nota).
- I prezzi di riga sono un'allocazione: non far credere che siano indipendenti.

## 7. Interazione

- Inserimento numerico veloce, con virgola e punto.
- Durata in ore/minuti.
- Grammi con 2 decimali.
- Duplicazione riga e preventivo a portata di mano.
- Salvataggio automatico della bozza.
- Conferme solo per azioni distruttive.
- Nessun modale annidato.
- Tastiera: Tab, Invio, Esc; focus visibile.
- Su mobile: azioni principali raggiungibili con il pollice.

## 8. Accessibilità

- WCAG 2.1 AA come obiettivo.
- Label esplicite e unità.
- Errori associati ai campi.
- Contrasto adeguato.
- Non usare il colore come unica informazione.
- Tabelle con header e scroll controllato.
- `prefers-reduced-motion`.

## 9. Responsive

- 375 px: una colonna, riepilogo non sticky o in fondo.
- 768 px: due colonne dove ha senso.
- 1440 px: calcolatore + riepilogo laterale sticky.
- Nessuno scroll orizzontale indesiderato nei form.
- Tabelle larghe: scroll orizzontale controllato.

## 10. Microcopy

- Italiano, diretto, senza gergo inutile.
- “Tempo slicer”, “Grammi totali”, “Costo pieno”, “Prezzo netto”.
- “I grammi includono supporti, brim, purge e prime tower.”
- “Il prezzo di riga è una quota del totale.”
- “I dati sono salvati solo su questo browser.”
- “Esporta un backup prima di cambiare dispositivo.”

## 11. Cosa non cambiare

- Significato di costo, prezzo, margine, sconto, IVA.
- Unità e arrotondamenti.
- Snapshot e versioning.
- Separazione dominio/UI.
- Flusso di import/export.
- Hash routing e portabilità statica.

## 12. Criteri di successo

- Un utente nuovo calcola un preventivo in meno di 2 minuti.
- Un lotto di 5 righe è leggibile senza perdersi.
- Il prezzo totale è chiaro a colpo d'occhio.
- Le azioni pericolose sono difficili da fare per sbaglio.
- La UI funziona da tastiera e da telefono.
- Nessuna regressione nei test di dominio e E2E.
