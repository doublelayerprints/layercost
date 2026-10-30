# Architettura

**Stato:** v1.0.0 — MVP funzionale; landing pubblica EVO-5 (ADR-0029); documentazione in-app e Suggerimenti EVO-6 (ADR-0030, in locale)

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
- **`app/`** — routing, layout pubblico e dell’app, provider, applicazione del tema.

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
4. Il prezzo applica ricarico/margine, gli sconti di riga, lo sconto del preventivo, l'arrotondamento e l'IVA; gli sconti di riga usano la quota di prezzo allocata alla riga (`DiscountRule`, ADR-0023).
5. Il risultato viene mostrato nel riepilogo e nel dettaglio.
6. Al salvataggio, lo store crea uno snapshot completo di `config` e conserva il risultato.
7. Al reload, il preventivo usa lo snapshot, non la configurazione corrente.

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

L'interfaccia `DataRepository` è in `src/data/repository.ts` ed è asincrona dalla T5.4.1. In modalità ospite l'adapter è `localRepository` (`layercost:data`); in modalità connessa è `cloudCacheRepository` (`layercost:cloud-cache`). Le scritture passano da una coda serializzata in `src/state/persist-queue.ts`. Il sync cloud opzionale segue `docs/planning/t5.4-cloud-sync.md` (ADR-0024): T5.4.2 ha aggiunto schema, RLS, trigger e mapper in `src/data/cloud/`; T5.4.3 ha aggiunto client Supabase lazy, gateway auth (`src/data/cloud/auth.ts`), store (`src/state/auth-store.ts`), login e SyncSettings; T5.4.4 ha aggiunto il gateway dati (`src/data/cloud/gateway.ts`), diff/outbox/metadati (`src/data/cloud/sync.ts`, `sync-state.ts`), lo store di sync e le schermate di primo login/conflitto. T5.4.5 chiude il workspace condiviso: runbook amministrativo in `docs/engineering/workspace-runbook.md`, audit `created_by`/`updated_by` nel dettaglio (solo cloud) e test di isolamento con due owner, un utente senza membership e un workspace separato. T5.4.6 completa le operazioni (keep-alive, backup cifrato, CI database, deploy) e porta il cloud in produzione dal 28/10/2026. EVO-1 (ADR-0025) aggiunge Google come provider opzionale: PKCE con redirect alla root, scambio manuale del `code` in `src/data/cloud/oauth.ts` e `auth-store`, fallback “Collega Google” e flag pubblico `VITE_AUTH_GOOGLE_ENABLED`. EVO-3a (ADR-0026) aggiunge la pagina pubblica “Richiedi accesso”: route lazy in `src/App.tsx`, logica pura in `src/features/access/request-access.ts` e invio esplicito a Formspree con `VITE_ACCESS_REQUEST_ENDPOINT`. È l’unica chiamata di rete oltre a Supabase e agli asset statici: non legge né scrive `AppData`, non crea utenti e non tocca auth, RLS o sync. EVO-5 (ADR-0029) separa la landing pubblica dall’app: `PublicLayout` e `LandingRoute` vivono fuori da `HydrationGate`, `SyncController` e dialoghi cloud; `AppShell` monta idratazione, sync, dialoghi e `Layout` solo per `/#/calculator` e le altre route dell’app. La landing non chiama `hydrate()` e non crea `layercost:data`; il marker `layercost:hasVisited` è separato e serve solo al redirect. La modalità ospite resta completa: il cloud non è obbligatorio. EVO-6 (ADR-0030) aggiunge due route lazy dentro `AppShell`: `features/docs/` (contenuti tipizzati, dizionario locale IT/EN, layout con indice e screenshot) e `features/feedback/` (secondo form Formspree con `VITE_FEEDBACK_ENDPOINT`, nessun account e nessun dato dell’app). I dizionari docs non sono nel dizionario globale, così la guida non entra nel bundle iniziale.

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
  app/            Layout, PublicLayout, AppShell, HydrationGate, routing, theme
  components/     ui.tsx, number-fields.tsx
  data/           repository, storage, cloud-cache, schemas, seed, theme, visit, three-mf, cloud/
  domain/         units, money, types, version, cost/, three-mf
  features/       calculator, quotes, printers, materials, tariffs, extras, settings, compare, onboarding, auth, sync, access, landing, docs, feedback
  i18n/           it.ts, en.ts, index.ts
  lib/            format, date, id, share, labels, cn, theme, draft, xlsx
  state/          app-store, auth-store, sync-store, workspace-store, persist-queue, theme-store, locale-store
```

Fase 5 (`docs/planning/t5.4-cloud-sync.md`): `data/cloud/` contiene `database.types.ts`, `mappers.ts`, `client.ts`, `auth.ts`, `oauth.ts`, `gateway.ts`, `sync.ts` e `sync-state.ts`; `data/cloud-cache.ts` implementa la cache connessa. `features/auth/LoginPage.tsx`, `features/auth/OAuthCallbackRedirect.tsx`, `features/settings/SyncSettings.tsx`, `features/sync/SyncController.tsx`, i dialoghi di primo login/conflitto, `state/auth-store.ts` e `state/sync-store.ts` sono implementati. Il dominio non cambia. T5.4.1 ha introdotto `state/persist-queue.ts` e `app/HydrationGate.tsx`. EVO-5 introduce `app/PublicLayout.tsx`, `app/AppShell.tsx`, `app/meta.ts`, `features/landing/` (componenti, contenuti, demo dal vivo, pre-render statico e test) e `data/visit.ts`. EVO-6 aggiunge `features/docs/` (contenuti, i18n locale, pagina e test) e `features/feedback/` (pagina, validazione/trasporto e test), più `public/docs/` e `scripts/capture-docs.mjs`. EVO-4 aggiunge `features/workspace/` (selettore, pagina Spazio, messaggi), `state/workspace-store.ts` e `data/workspace-preference.ts`.

Flusso connesso:

```text
Supabase (RLS) ⇄ CloudGateway ⇄ SyncStore ⇄ AppStore ⇄ UI
                      │             │
                      │             └── outbox + metadata per spazio (layercost:sync-state:<id>)
                      └── cache cloud per spazio (layercost:cloud-cache:<id>)
```

- Il pull completo è accettabile per pochi utenti; non c'è realtime.
- Il push usa `updated_at` come controllo ottimistico; un conflitto ferma la coda e apre un dialogo esplicito.
- Cache e outbox sono per workspace; il cambio spazio esegue il flush della coda attiva e non mescola le modifiche.
- La cache cloud non sovrascrive `layercost:data`; al logout l'app torna ai dati ospite.
- Gli script amministrativi usano il service role solo fuori dal browser (E2E, bootstrap, backup).

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

Limiti predefiniti: 250 MiB compressi, 1 GiB decompresso totale, 10.000 entry, 100 piatti, 10 MB per metadato, 64 MB per il fallback G-code. Il file non viene mai caricato e nessun dato esce dal browser.

Il parser non cambia `schemaVersion`, `engineVersion`, snapshot o `AppData`.

## 9.1 Export `.xlsx`

- `src/lib/xlsx.ts` è un writer XLSX minimale e puro: costruisce il pacchetto OPC/ZIP (`[Content_Types].xml`, relazioni, workbook, fogli, stili) e comprime con `fflate`, già presente per il parser `.3mf`. Non introduce dipendenze.
- Supporta testo inline, numeri, date Excel e formati per denaro, percentuale, grammi, ore, kWh e watt. Non usa la tabella `sharedStrings`.
- `src/features/quotes/export-xlsx.ts` mappa `Quote[]` e `CostConfig` in tre fogli (Preventivi, Righe, Materiali), usando lo snapshot del preventivo quando presente; i preventivi senza `result` restano esportabili con le colonne economiche vuote.
- `ExportXlsxButton.tsx` è montato in Preventivi e Impostazioni → Dati. Il download avviene con un Blob locale; nessun upload o richiesta di rete. Il nome è `layercost-quotes-YYYY-MM-DD.xlsx`.
- L'export non cambia schema, formule, `engineVersion`, snapshot o persistenza; il backup JSON resta l'unica copia esterna completa.

---

## 10. i18n

- `src/i18n/it.ts` e `src/i18n/en.ts` combinano i dizionari per area (`calculator`, `quotes`, `catalogs`, `settings`, `misc`, `xlsx`); una chiave mancante o un'area con chiavi duplicate fallisce typecheck/test.
- `src/i18n/index.ts` espone `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `INTL_LOCALES`, `translate`, `t`, `plural` con `Intl.PluralRules` e `isLocale`.
- `src/app/I18nProvider.tsx` monta il contesto e aggiorna `<html lang>`/`dir`; `src/app/i18n-context.ts` espone `useI18n`.
- Tutte le schermate, i componenti condivisi, le etichette di dominio, la stampa e la guida usano i dizionari (T5.6.2); gli errori di import/share/save sono mappati per codice, mentre storage/schema e alcuni errori di dominio restano fallback tecnici.
- `src/lib/format.ts` espone formattatori `Intl` per locale e `createFormatters`; `src/app/use-format.ts` li lega al contesto con `useFormat`. `parseLocaleNumber` accetta virgola e punto.
- `Quote.locale` e la migrazione schema v2 sono implementati in T5.6.3, con backup raw `layercost:backup:schema-1`. Stampa, dettaglio e link usano `quote.locale`; l'interfaccia usa la preferenza del dispositivo.
- **Ciclo di vita (ADR-0020):** `Quote.status` è `draft | saved | sent | completed`. `saved` è modificabile in place con lo snapshot congelato; `sent` e `completed` sono bloccati. Lo schema v3 aggiunge gli stati senza cambiare i dati esistenti. `editQuote` carica il preventivo nello stesso `id`; `saveDraft` aggiorna il documento e conserva `snapshot.capturedAt`.
- `src/data/locale.ts` + `src/state/locale-store.ts` salvano `layercost:locale` (default `it`) fuori da `AppData`; `I18nProvider` aggiorna `<html lang>`, titolo e meta description. Il selettore è in Impostazioni → Lingua (T5.6.4).
- Nessuna libreria i18n runtime: dizionari statici, nessuna chiamata di rete.
- Inventario e regole in `docs/planning/i18n-inventory.md`.
