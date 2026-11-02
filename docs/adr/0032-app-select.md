# ADR-0032 — Menu delle select in stile applicazione

**Stato:** Accettato; implementato e distribuito in produzione il 1° novembre 2026 (build `index-CQ3fLr-I.js` / `index-Cmj_upjM.css`)
**Data:** 1 novembre 2026
**Relazione:** sostituisce il menu nativo del componente `Select`; non cambia formule, `engineVersion`, schema dati, backup o sync

## Contesto

Il controllo `Select` aveva già la geometria e il chevron coerenti con il design system, ma il menu aperto restava quello nativo del sistema operativo. Su macOS compare una lista di sistema con evidenziazione viola, angoli e spaziatura diversi dall'app; su Windows e Linux cambia ancora. La differenza si vede in ogni form: Calcolatore, Preventivi, Stampanti, Materiali, Tariffe, Extra, Confronto, Import `.3mf`, Suggerimenti e Impostazioni.

Il committente ha chiesto un menu dell'applicazione, coerente con la superficie, il bordo, il raggio e l'accento dei menu già presenti. La lista nativa non è stilizzabile in modo affidabile, quindi la scelta è un listbox interno.

## Decisione

1. **Combobox proprietario.** `Select` diventa un pulsante controllato con `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` e `aria-activedescendant`. Il focus resta sul pulsante; le opzioni non ricevono focus. Il valore è controllato con `value` e `onValueChange`.

2. **Listbox portale.** Il menu è un `listbox` montato in `document.body` con `position: fixed`, così non viene tagliato da card, modali o contenitori con `overflow`. Si allinea al campo, usa `min-width` pari al trigger, cresce fino a `max-content` con tetto di 352 px, si apre verso l'alto quando sotto manca spazio e resta dentro il viewport. Si riposiziona allo scroll e al resize; si chiude su click esterno, Esc e Tab.

3. **Stile.** Superficie `--color-surface`, bordo `--color-line`, raggio `--radius-card`, ombra `--shadow-overlay`, padding 4 px. Opzione attiva `bg-raised`; opzione scelta in `font-medium` con check `text-data`; opzioni disabilitate `text-muted`. Le opzioni sono 36 px su desktop e 44 px su touch. Il trigger aperto ha bordo `--color-data` e il chevron ruota di 180°.

4. **Tastiera e type-ahead.** Frecce su/giù, Home/End, Enter/Spazio, Esc, Tab e ricerca per prefisso con reset dopo 600 ms. Esc chiude solo il menu e non propaga l'evento al modale. Le opzioni disabilitate vengono saltate.

5. **Form e compatibilità.** Il chiamante continua a passare `<option value disabled>` come figli, quindi i punti di utilizzo restano leggibili e `SelectField` non cambia API. Un input nascosto conserva `name` e valore per i form esistenti. `onChange(event)` diventa `onValueChange(value)` nei pochi chiamanti diretti.

6. **Nessuna dipendenza esterna.** Posizionamento, navigazione e type-ahead sono interni. Non si introducono Radix, Headless UI o simili.

7. **Mobile.** Anche su iOS e Android si usa lo stesso listbox, con opzioni da 44 px e pannello dentro il viewport. Non si apre il picker nativo, così l'aspetto resta coerente; il comportamento touch resta supportato da `onClick` e dal riposizionamento.

8. **Accessibilità.** Label associata dal `Field` al pulsante, `aria-describedby`/`aria-invalid` ereditati dal contesto, `aria-selected` sulle opzioni, `aria-disabled` sulle opzioni non selezionabili, lista non renderizzata quando non ci sono opzioni. Il valore corrente resta leggibile come contenuto del combobox.

9. **Budget.** Il componente aggiunge **2,2 KB gzip** al bundle iniziale (da 230,0 a 232,2 KB). Il limite iniziale passa da **232 KB a 236 KB**; il totale iniziale misurato è 299,5 KB su 350 KB. La motivazione è la sostituzione di un controllo trasversale, usato in tutte le schermate, con un widget accessibile e senza dipendenze.

10. **Nessun impatto sul dominio.** Non cambiano formule, `engineVersion`, snapshot, `AppData`, schema locale, sync, backup o chiamate di rete.

## Alternative considerate

- **Mantenere il menu nativo e stilizzare le `<option>`.** Funziona in parte su Windows/Linux, ma macOS e iOS ignorano lo stile: non risolve il problema segnalato. Scartata.
- **Usare una libreria headless (Radix, Headless UI).** Riduce il codice applicativo, ma aggiunge una dipendenza, peso e una superficie da mantenere; il progetto non ne usa per i controlli. Scartata.
- **Tenere un `<select>` nascosto e un pulsante sopra.** Si otterrebbe il valore nativo, ma due controlli sovrapposti confondono tastiera, screen reader e click. Scartata.
- **Bottom sheet solo su mobile.** Sarebbe più vicino alle convenzioni mobile, ma aggiunge un secondo layout e test; il listbox compatto resta leggibile a 375 px. Rimandata.
- **Filtro di ricerca dentro la select.** Utile per liste molto lunghe, ma nessuna select attuale supera poche decine di voci e il type-ahead copre la tastiera. Rimandata.

## Conseguenze

- Nuovo `src/components/select.tsx`; `src/components/ui.tsx` lo riesporta, quindi gli import esistenti non cambiano.
- Aggiornati i chiamanti diretti (`SelectField`, import `.3mf`, righe di stampa, Suggerimenti) a `onValueChange`.
- Nuovi test E2E per apertura, navigazione da tastiera, Escape, click esterno, type-ahead, axe e layout del menu; aggiornati i test di import, sconti, Suggerimenti e design system.
- Le baseline visive cambiano in tutte le schermate con select e sono state rigenerate su Linux il 1° novembre 2026: 16 screenshot aggiornati.
- Rollback applicativo: ripristinare il componente `Select` nativo; nessun dato utente o schema è coinvolto.

## Riferimenti

- `docs/design/design-system.md` §3.4
- `docs/design/directions.md` §3.6
- `src/components/select.tsx`
- `tests/e2e/select.spec.ts`
- `scripts/check-budget.mjs`
