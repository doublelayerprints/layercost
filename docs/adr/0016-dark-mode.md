# ADR-0016 — Dark mode in v1

**Stato:** Accettato; il blu del punto 3 è superato da ADR-0021
**Data:** 24 ottobre 2026

## Contesto

ADR-0015, punto 6, escludeva la dark mode dalla v1: la direzione Strato è nata su una base chiara, e il tema scuro era rimandato. Dopo T4.4 il prodotto è completo nella sua parte funzionale e il committente ha chiesto esplicitamente la dark mode prima della release.

Il design system usa già token CSS in `src/index.css`: cambiare i valori sotto un attributo sul documento non richiede di toccare componenti, dominio o formule. La richiesta però cambia lo scope della v1 e va registrata con un ADR che supera il punto 6 di ADR-0015.

## Decisione

1. **Tre preferenze, non due.** L'utente sceglie **Sistema**, **Chiaro** o **Scuro** in Impostazioni → Aspetto. Il valore iniziale è `system`: segue `prefers-color-scheme` e si aggiorna quando il dispositivo cambia.
2. **Palette calda, non nera.** Il tema scuro è un grafite caldo (`#141413` di fondo, `#1c1c1a` di superficie) per restare coerente con la pietra di Strato. I token semantici restano gli stessi: `ground`, `surface`, `raised`, `line`, `ink`, `muted`, `data`, `positive`, `negative`, `warning` e le pill.
3. **Contrasti verificati.** Testo e dati superano AA sul fondo scuro; il bordo dei campi supera 3:1; il focus usa un blu più chiaro (`#4f8fe0`) leggibile sul grafite. Lo scrim del dialogo diventa nero al 70%, non ink chiaro.
4. **La preferenza è un dato di interfaccia, non di dominio.** Vive in `localStorage` sotto `layercost:theme`, separata da `layercost:data`. Non entra in `AppData`, negli snapshot dei preventivi, nei backup o nelle migrazioni; `schemaVersion` resta 1. “Ripristina dati iniziali” non cambia il tema.
5. **Nessun lampo di tema sbagliato.** `main.tsx` applica il tema risolto prima del primo render; un fallback CSS dipinge il canvas scuro per chi preferisce il tema scuro di sistema prima che il bundle sia eseguito. `ThemeController` tiene sincronizzati attributo, `prefers-color-scheme` e `<meta name="theme-color">`.
6. **La stampa resta chiara.** In `@media print` i token tornano ai valori chiari, anche se lo schermo è scuro: A4 è sempre nero su bianco.
7. **Nessun cambio al motore.** Formule, unità, `engineVersion`, snapshot e schema di persistenza non cambiano.

## Alternative considerate

- **Solo `prefers-color-scheme`, senza scelta esplicita.** Meno UI, ma non permette di stampare o lavorare in chiaro su un sistema scuro, né di forzare il tema scuro su un sistema chiaro. Scartata.
- **Tema dentro `Settings`/`CostConfig`.** Sarebbe finito negli snapshot dei preventivi e nei backup, mescolando una preferenza del browser con dati economici. Scartata.
- **`light-dark()` per evitare due blocchi di token.** Elegante, ma richiede un browser baseline 2024 e non aggiunge nulla rispetto a un attributo esplicito, che serve comunque per la scelta manuale. Scartata.
- **Dark mode dopo la v1.** Era il piano di ADR-0015; il committente ha chiesto di anticiparla. Superata da questa decisione.

## Conseguenze

- `src/lib/theme.ts` (tipi e risoluzione pura), `src/data/theme.ts` (persistenza), `src/state/theme-store.ts`, `src/app/theme.ts` e `src/app/ThemeController.tsx` sono i nuovi punti; `src/index.css` contiene la palette scura e l'override di stampa.
- Impostazioni ha una sezione **Aspetto** con tre radio; il resto della UI non cambia.
- Test: 7 unitari in più (risoluzione e persistenza) e 1 E2E sul tema; il gate visivo è stato eseguito anche in tema scuro.
- ADR-0015 resta valido per direzione, tipografia, stack e shell; il solo punto 6 è superato.
- Il tema non è incluso nell'export: su un altro dispositivo si riparte da “Sistema”. È una scelta deliberata, documentata in `docs/engineering/persistence.md`.
