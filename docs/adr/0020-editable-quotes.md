# ADR-0020 — Preventivi modificabili fino all'invio

**Stato:** Accettato
**Data:** 26 ottobre 2026

## Contesto

L'ADR-0004 rendeva immutabile ogni preventivo salvato: per correggere un nome, una quantità o una riga bisognava duplicarlo e ricrearlo. Il committente vuole poter modificare un preventivo già salvato, ma non uno già inviato al cliente o completato.

Il vincolo economico resta: un preventivo non deve cambiare prezzo in modo silenzioso quando cambiano le tariffe.

## Decisione

1. **Quattro stati.** `Quote.status` diventa `'draft' | 'saved' | 'sent' | 'completed'`.
   - `saved`: salvato e modificabile.
   - `sent`: inviato al cliente, bloccato.
   - `completed`: completato/concluso, bloccato.
   - `draft` resta la bozza interna, fuori dallo storico.
2. **Modifica in place.** “Modifica preventivo” carica il preventivo nel calcolatore con lo stesso `id`. Salvare aggiorna il documento esistente invece di crearne uno nuovo.
3. **Prezzi congelati.** La modifica usa la configurazione dello snapshot originale. Il risultato viene ricalcolato con le stesse tariffe; `snapshot.capturedAt` non cambia. “Aggiorna ai prezzi correnti” resta l'azione separata che crea una copia con la configurazione attuale.
4. **Blocco dopo l'invio.** `sent` e `completed` non sono modificabili né riportabili a `saved`. Per correggerli si duplica il preventivo, ottenendo una nuova bozza.
5. **Transizioni in avanti.** `saved → sent`, `saved → completed`, `sent → completed`. Nessuna transizione all'indietro.
6. **Archivio separato.** `archived` resta un flag indipendente: archiviare non cancella e non sblocca. Un preventivo archiviato non è modificabile finché non viene ripristinato.
7. **Schema v3.** La migrazione v2 → v3 non cambia i dati: gli stati esistenti `draft` e `saved` restano validi. La catena v1 → v2 → v3 è applicata in sequenza e il raw viene salvato prima della migrazione.
8. **Nessuna cronologia delle versioni.** `updatedAt` registra l'ultima modifica; non viene conservata una copia di ogni revisione. Per conservare una versione si duplica.

## Alternative considerate

- **Immutabilità totale (ADR-0004).** Sicura ma scomoda per correzioni banali.
- **Modifica sempre consentita, anche dopo invio/completamento.** Rischiosa: il cliente potrebbe ricevere un documento diverso da quello inviato.
- **Modifica con prezzi correnti.** Semplice, ma cambierebbe il prezzo senza un'azione esplicita.
- **Versionamento completo di ogni modifica.** Utile in futuro, ma troppo costoso per la v1.

## Conseguenze

- La UI distingue chiaramente “Modifica” da “Duplica” e “Aggiorna ai prezzi correnti”.
- Lo snapshot continua a garantire la riproducibilità economica.
- Invio e completamento sono azioni irreversibili nella UI; per correggere si duplica.
- I link condivisi conservano lo stato del preventivo; l'import nel proprio archivio crea una copia `saved`.
- La regola “un preventivo salvato non si modifica” dell'ADR-0004 vale ora solo dopo `sent` o `completed`.
