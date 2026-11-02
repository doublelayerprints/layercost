# Lista stampanti compatta — design

**Data:** 2 novembre 2026
**Stato:** approvato e implementato; verde in locale, preview/deploy da fare
**Ambito:** `/#/printers`, senza modifiche a dati, schema, formule o `engineVersion`

## Contesto

La pagina Stampanti mostrava ogni stampante come una sezione molto alta dentro un'unica card. Le due stampanti del seed condividevano il contenitore e un divisore, quindi non si leggevano come elementi separati; prezzi, vita utile, potenza e note erano tutti sempre visibili. Il catalogo era raggiungibile solo da un pulsante secondario nella testata.

## Decisione

1. **Tabella su desktop (≥ 1280 px).** Colonne: stampante (nome, modello, badge), prezzo, usura/h, volume, azioni e dettagli. Le righe hanno `py-3`, sono separate da `border-t border-rule` e non stanno dentro una card unica. La tabella usa `Table`/`TableScroll`, con caption accessibile e scroll orizzontale controllato.

2. **Card separate sotto 1280 px.** Ogni stampante è una card con bordo e raggio propri, separate da `gap-3`. La parte compressa mostra nome, modello, badge, usura/h, prezzo, volume e il pulsante Dettagli. Le azioni Modifica/Archivia e i dettagli stanno nel dropdown, per non affollare la card chiusa.

3. **Dettagli in un dropdown.** Il pulsante Dettagli è esplicito, con `aria-expanded` e `aria-controls`; non si apre cliccando l'intera riga. Contenuto: valore residuo, vita utile, manutenzione, avvio, tariffa energia, potenze per famiglia e note. Il chevron ruota e rispetta `prefers-reduced-motion`.

4. **Banda catalogo.** Sopra l'avviso sulle stime compare una card con accento `data`: eyebrow “Catalogo stampanti”, titolo “29 modelli pronti all'uso”, breve descrizione e pulsante “Sfoglia il catalogo”. Il link in testata resta come scorciatoia. La banda compare solo quando ci sono stampanti; lo stato vuoto mantiene il proprio pulsante catalogo.

5. **Nessun dato nuovo.** Il calcolo di usura/h resta quello attuale. Non cambiano repository, seed, snapshot, sync o `engineVersion`. Il catalogo resta lazy: la banda è solo un link e non importa `PRINTER_CATALOG`.

## Accessibilità

- Tabella semantica con `caption`, `scope="col"` e `scope="row"`.
- Pulsante Dettagli con nome accessibile “Espandi/Comprimi {nome}”, focus visibile e target touch da 40 px su mobile.
- Stato aperto/chiuso non affidato al solo colore: il chevron ruota e il contenuto appare/scompare.
- Nessun click globale sulla riga: le azioni restano indipendenti.
- Verifica axe sulla pagina con dettagli aperti, oltre alle scansioni esistenti.

## Test

- E2E desktop: tabella visibile a 1440 px, dettagli apribili e richiudibili, banda catalogo e link.
- E2E mobile: card visibile a 375 px, dettagli e azioni nel dropdown, nessun overflow orizzontale.
- E2E catalogo aggiornato: dopo l'aggiunta, le stampanti si trovano come rowheader nella tabella; la nota si legge aprendo i dettagli.
- Unit test: il titolo della banda cita il numero di preset del catalogo, così il copy resta allineato.
- `npm run check` e suite E2E complete prima del merge.

## Non obiettivi

- Filtri, ricerca o raggruppamento delle stampanti.
- Modifiche al form, al catalogo o ai dati persistiti.
- Nuove dipendenze o componenti condivisi.
