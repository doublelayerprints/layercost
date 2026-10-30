# Persistenza e backup

**Stato:** v1.0.0 + ADR-0020 + ADR-0023 — local-first, schema v4; sync T5.4 pianificato (ADR-0024)

---

## 1. Dove vivono i dati

Tutto in `localStorage`, chiave:

```text
layercost:data
```

Contenuto: `AppData` con `schemaVersion`, `config`, `quotes`, `draft`.

La sessione Supabase, quando il cloud è configurato, è gestita da `supabase-js` in una chiave `sb-<project-ref>-auth-token` separata da `AppData`. Non contiene dati economici e non entra nei backup. Con Google OAuth (ADR-0025) il client usa PKCE: durante il redirect `supabase-js` conserva un code verifier temporaneo in `localStorage` (`sb-<project-ref>-auth-token-code-verifier`), consumato al ritorno dal callback. Anche questo valore è tecnico, non entra nei backup e non viene letto dall'app.

La preferenza del tema è un dato di interfaccia separato:

```text
layercost:theme
layercost:locale
```

Il tema vale `system` (default), `light`, `dark`; la lingua vale `it` (default) o `en`. Nessuno dei due entra in `AppData`, negli snapshot, nei backup o nelle migrazioni; “Ripristina dati iniziali” non li cancella.

In caso di dati non leggibili, il raw viene copiato in:

```text
layercost:corrupt:<timestamp>
```

Prima di una migrazione, il raw della versione precedente viene conservato in:

```text
layercost:backup:schema-<versione>
```

La chiave è stabile per versione di partenza (`layercost:backup:schema-1`, `schema-2` o `schema-3`), quindi il backup non cresce a ogni avvio.

## 2. Codice

| File                       | Ruolo                                                |
| -------------------------- | ---------------------------------------------------- |
| `src/data/storage.ts`      | Chiavi, load/save, export, import, reset, migrazione |
| `src/data/theme.ts`        | Preferenza del tema, separata dai dati               |
| `src/data/locale.ts`       | Preferenza della lingua, separata dai dati           |
| `src/data/repository.ts`   | Interfaccia `DataRepository` asincrona + adapter locale |
| `src/data/schemas.ts`      | Validazione Zod                                      |
| `src/data/seed.ts`         | Configurazione iniziale                              |
| `src/state/app-store.ts`   | Autosave, hydration e orchestrazione                 |
| `src/state/persist-queue.ts` | Coda serializzata delle scritture                  |
| `src/state/theme-store.ts` | Stato della preferenza del tema                      |

Lo storage è l'unico punto che tocca `localStorage`.

## 3. Schema e migrazioni

- `schemaVersion` corrente: **4**. `Quote.locale` è la lingua del documento (`it`/`en`), `Quote.status` è `draft | saved | sent | completed`, `PrintLine.discount` e `QuotePricing.discount` sono sconti opzionali percentuali o a importo fisso.
- La modifica di un preventivo `saved` usa lo snapshot e non cambia i prezzi; `sent` e `completed` sono bloccati (ADR-0020).
- `migrateAppData` rifiuta versioni future e versioni non numeriche; la catena v1 → v2 → v3 → v4 aggiunge `locale: 'it'`, abilita gli stati e converte `discountBp` in una regola percentuale, anche dentro un envelope di export.
- Prima di applicare la migrazione allo storage, il raw viene salvato in `layercost:backup:schema-1`, `schema-2` o `schema-3`.

## 4. Export

Pulsante “Esporta backup” in Impostazioni e nella pagina del preventivo (tramite link condiviso). Il file è JSON:

```json
{
  "app": "LayerCost",
  "schemaVersion": 4,
  "exportedAt": "2026-10-23T12:00:00.000Z",
  "data": { "...": "..." }
}
```

Nome file: `layercost-backup-YYYY-MM-DD.json`.

Il backup contiene solo `AppData`: la preferenza del tema non viene esportata, perché appartiene al dispositivo e non ai dati economici.

## 5. Import

1. L'utente sceglie un file JSON.
2. `parseImportFile` legge il testo.
3. `migrateAppData` verifica la versione.
4. `appDataSchema` valida la struttura.
5. L'utente conferma.
6. L'app scarica automaticamente un backup dei dati correnti.
7. `importData` sostituisce configurazione, preventivi e bozza.
8. I preventivi vengono ricalcolati dallo snapshot.

Se qualcosa fallisce, i dati correnti restano intatti.

## 6. Dati corrotti

- Load fallito → backup raw + configurazione iniziale + avviso.
- Import fallito → nessuna scrittura.
- Migrazione fallita → errore, nessun overwrite.

## 7. Limiti

- `localStorage` è tipicamente 5–10 MB per origine.
- Svuotare i dati del browser cancella tutto.
- I link condivisi contengono una copia del preventivo: non sono un backup completo.
- Non c'è sincronizzazione tra dispositivi in v1. La fase 5 aggiunge un sync cloud opzionale: la cache cloud usa `layercost:cloud-cache:<workspaceId>`, l'outbox `layercost:sync-state:<workspaceId>` e nessuna delle due sovrascrive `layercost:data`.

## 8. Privacy

- In modalità ospite nessuna chiamata di rete oltre agli asset statici.
- Con account, configurazione e preventivi sono su Supabase in regione EU; bozza, tema e lingua restano locali. L'account è opzionale (fase 5).
- Nessun analytics, nessun cookie di profilazione.
- Senza account i dati restano sul dispositivo; con account esiste una copia sul server.
- I link condivisi sono leggibili da chiunque abbia l'URL.

## 9. Sync cloud (fase 5, T5.4.5)

L'interfaccia `DataRepository` è astratta. In v1 era sincrona perché usava `localStorage`; il refactor async è completato in **T5.4.1**. La sincronizzazione cloud è un caso d'uso separato (`CloudGateway`) e non è accumulata dentro `DataRepository`:

```ts
interface DataRepository {
  load(): Promise<{ data: AppData; warning?: string }>
  save(data: AppData): Promise<void>
  export(data: AppData): Promise<void>
  import(file: File): Promise<AppData>
  reset(): Promise<AppData>
}

interface CloudGateway {
  listWorkspaces(): Promise<WorkspaceSummary[]>
  ensurePersonalWorkspace(): Promise<string | null>
  createWorkspace(name: string): Promise<string>
  pull(workspaceId: string): Promise<CloudSnapshot>
  push(workspaceId: string, operation: SyncOperation): Promise<PushResult>
  importAll(workspaceId: string, data: AppData): Promise<CloudSnapshot>
}
```

La decisione è in **ADR-0024** (Supabase Free, email/password, RLS per membership, nessun realtime) e **ADR-0028** (spazi separati, spazio personale automatico, inviti con codice, PK composte). **ADR-0025** aggiunge Google come provider opzionale (PKCE, auto-link e “Collega Google”), senza modificare la persistenza. Il piano operativo completo è in `docs/planning/t5.4-cloud-sync.md` e `docs/planning/evo-4-multi-workspace.md`. La procedura amministrativa è in `docs/engineering/workspace-runbook.md`.

Regole:

- Configurazione e preventivi `saved`/`sent`/`completed` si sincronizzano; bozza, tema, lingua e onboarding restano locali.
- Le scritture usano `updated_at` lato server per il controllo ottimistico; offline vanno in un outbox e vengono riprodotte al ritorno.
- I conflitti sono visibili; nessun overwrite silenzioso. I preventivi `sent`/`completed` sono bloccati anche da un trigger.
- `created_by`/`updated_by` sono audit del database; il client li mostra come “te”/“un altro membro”, non li riscrive nelle update e non li include nei link condivisi.
- La cache cloud usa `layercost:cloud-cache:<workspaceId>` e non sovrascrive `layercost:data`; al logout l'app torna ai dati ospite. La chiave legacy viene migrata una volta verso lo spazio attivo.
- L'outbox, i metadati `updated_at`, il workspace e l'ultimo sync vivono in `layercost:sync-state:<workspaceId>`. Ogni spazio ha cache e coda separate: cambiare spazio non mescola le modifiche in sospeso.
- Lo spazio attivo è in `layercost:active-workspace`; un nuovo spazio viene marcato in `layercost:pending-seed` e popolato con `createInitialData()` al primo pull, mai con i dati dello spazio precedente.
- Al logout con scritture in sospeso cache e outbox dello spazio attivo restano nel browser e riprendono al prossimo accesso; senza scritture in sospeso vengono rimosse. Gli altri spazi non vengono toccati.
- Prima del primo sync va esportato un backup JSON; sul database esiste un `pg_dump` settimanale.

La v1.0.0 resta local-only. La modalità ospite usa solo `localRepository`; il cloud è opzionale.

## 10. Backup consigliato

- Dopo ogni sessione di configurazione importante.
- Prima di cambiare dispositivo.
- Prima di un import o reset.
- Periodicamente, se i preventivi hanno valore.
