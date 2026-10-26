# Architettura

**Stato:** v1.0.0 — MVP funzionale

---

## 1. Livelli

```text
UI React (app/, features/, components/)
        │
        ▼
Stato applicativo (state/app-store.ts)
        │
        ▼
Dominio puro (domain/)
        │
        ▼
Dati (data/: repository, storage, schemi, seed)
```

- **`domain/`** — tipi, unità, formule, prezzi. Non importa React, Zustand, Zod, browser o storage.
- **`state/`** — azioni e stato UI. Per ora svolge anche il ruolo di application layer: orchestra dominio, repository e aggiornamenti.
- **`data/`** — adapter locale, schemi Zod, seed, migrazioni. È l'unico punto che tocca `localStorage`.
- **`features/`** — schermate e componenti di dominio UI.
- **`components/`** — primitivi riutilizzabili, senza logica di costo.
- **`lib/`** — formattazione, date, ID, condivisione, preferenza del tema, contenuto della bozza.
- **`app/`** — routing, layout, provider, applicazione del tema.

Se i casi d'uso cresceranno, le azioni dello store potranno essere estratte in `application/` senza cambiare il dominio.

---

## 2. Regole di dipendenza

- Il dominio non conosce la UI.
- La UI non calcola: chiama `calculateQuote`.
- Lo store non implementa formule: orchestra.
- Lo storage non conosce React.
- Le feature non accedono direttamente a `localStorage`.
- I componenti non conoscono il repository.
- La preferenza del tema vive in `layercost:theme`, fuori da `AppData`: `data/theme.ts` è l'unico punto che la legge e la scrive; `ThemeController` la applica al documento.

---

## 3. Flusso di calcolo

1. La UI modifica `draft` tramite le azioni dello store.
2. `CalculatorPage` chiama `calculateQuote(draft, config)` in `useMemo`.
3. Il dominio risolve stampante, materiali, extra, tariffa e impostazioni.
4. Il risultato viene mostrato nel riepilogo e nel dettaglio.
5. Al salvataggio, lo store crea uno snapshot completo di `config` e conserva il risultato.
6. Al reload, il preventivo usa lo snapshot, non la configurazione corrente.

---

## 4. Flusso dati

```text
localStorage
   │ load
   ▼
DataRepository ──► Zustand store ──► UI
   ▲                    │
   │ save               │ calculateQuote
   └────────────────────┘
```

L'interfaccia `DataRepository` è in `src/data/repository.ts`. L'adapter attuale è `localRepository`; un futuro adapter cloud potrà implementare la stessa interfaccia. Il sync è pianificato in ADR-0018 e richiede un refactor async dello store; non è parte della v1.0.0.

---

## 5. Snapshot

`QuoteSnapshot` contiene:

- `config`: copia completa di impostazioni, stampanti, materiali, extra;
- `capturedAt`;
- `engineVersion`.

Il risultato è memorizzato in `Quote.result`. Il ricalcolo usa lo snapshot; “Aggiorna prezzi” duplica il preventivo e usa la configurazione corrente.

---

## 6. Struttura

```text
src/
  app/            Layout, routing, theme
  components/     ui.tsx, number-fields.tsx
  data/           repository, storage, schemas, seed, theme, three-mf
  domain/         units, money, types, version, cost/, three-mf
  features/       calculator, quotes, printers, materials, tariffs, extras, settings, compare, onboarding
  i18n/           it.ts, en.ts, index.ts
  lib/            format, date, id, share, labels, cn, theme, draft
  state/          app-store, theme-store
```

---

## 7. Perché il dominio è puro

- Testabile senza browser.
- La UI può essere ridisegnata senza toccare le formule.
- Le stesse funzioni possono girare in un worker o in un futuro backend.
- I golden case sono indipendenti dal framework.

---

## 8. Cosa non appartiene al dominio

- Accesso a `localStorage`.
- Creazione di UUID o timestamp (ricevuti dall'esterno o creati nello store).
- Formattazione per la UI.
- Routing.
- Toast, modali, stati di caricamento.

---

## 9. Import `.3mf`

Il parser sta in `src/data/three-mf/` ed è collegato al calcolatore tramite `src/features/calculator/use-three-mf-import.ts` e `ThreeMfImportDialog.tsx` (T5.3.4). Il tipo normalizzato `ThreeMfSummary` vive in `src/domain/three-mf.ts`; il mapping puro vive in `src/domain/three-mf-mapping.ts`.

- `zip.ts` — legge l'indice centrale ZIP; rifiuta cifratura, path traversal, ZIP64, compressioni non supportate, duplicati e superamenti dei limiti; estrae solo i metadati necessari.
- `xml.ts` — rifiuta `<!DOCTYPE`/`<!ENTITY`. Nel thread principale usa il `DOMParser` nativo; nel Web Worker, dove `DOMParser` non è disponibile, passa a `@xmldom/xmldom` (dipendenza runtime usata anche nei test Node).
- `parse.ts` — normalizza `slice_info.config`, `project_settings.config`, `model_settings.config` e `3D/3dmodel.model`; se manca `slice_info.config` prova il fallback dal G-code.
- `three-mf.worker.ts` + `worker-client.ts` — parsing fuori dal thread principale; il buffer viene trasferito al worker.
- `three-mf-mapping.ts` — `proposeThreeMfMapping` propone stampante/materiali senza creare entità; `mapThreeMfToLines` converte i piatti selezionati in `PrintLine[]` con ID iniettati. I grammi si sommano per materiale scelto, senza supplementi AMS/ACE.
- **`fflate` 0.8.3** — dipendenza runtime per ZIP/DEFLATE, scelta per peso e API sincrona, senza dipendenze native. Nota tecnica richiesta da ADR-0017.

Limiti predefiniti: 100 MB compressi, 500 MB decompressi totali, 10.000 entry, 100 piatti, 10 MB per metadato, 64 MB per il fallback G-code. Il file non viene mai caricato e nessun dato esce dal browser.

Il parser non cambia `schemaVersion`, `engineVersion`, snapshot o `AppData`.

---

## 10. i18n

- `src/i18n/it.ts` e `src/i18n/en.ts` combinano i dizionari per area (`calculator`, `quotes`, `catalogs`, `settings`, `misc`); una chiave mancante o un'area con chiavi duplicate fallisce typecheck/test.
- `src/i18n/index.ts` espone `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `INTL_LOCALES`, `translate`, `t`, `plural` con `Intl.PluralRules` e `isLocale`.
- `src/app/I18nProvider.tsx` monta il contesto e aggiorna `<html lang>`/`dir`; `src/app/i18n-context.ts` espone `useI18n`.
- Tutte le schermate, i componenti condivisi, le etichette di dominio, la stampa e la guida usano i dizionari (T5.6.2); gli errori di import/share/save sono mappati per codice, mentre storage/schema e alcuni errori di dominio restano fallback tecnici.
- `Quote.locale` e la migrazione schema v2 sono in T5.6.3; la preferenza `layercost:locale`, la formattazione locale e il selettore in T5.6.3–T5.6.4.
- Nessuna libreria i18n runtime: dizionari statici, nessuna chiamata di rete.
- Inventario e regole in `docs/planning/i18n-inventory.md`.
