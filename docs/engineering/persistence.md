# Persistenza e backup

**Stato:** v0.1 — local-first

---

## 1. Dove vivono i dati

Tutto in `localStorage`, chiave:

```text
layercost:data
```

Contenuto: `AppData` con `schemaVersion`, `config`, `quotes`, `draft`.

In caso di dati non leggibili, il raw viene copiato in:

```text
layercost:corrupt:<timestamp>
```

## 2. Codice

| File                     | Ruolo                                                |
| ------------------------ | ---------------------------------------------------- |
| `src/data/storage.ts`    | Chiavi, load/save, export, import, reset, migrazione |
| `src/data/repository.ts` | Interfaccia `DataRepository` + adapter locale        |
| `src/data/schemas.ts`    | Validazione Zod                                      |
| `src/data/seed.ts`       | Configurazione iniziale                              |
| `src/state/app-store.ts` | Autosave e orchestrazione                            |

Lo storage è l'unico punto che tocca `localStorage`.

## 3. Schema e migrazioni

- `schemaVersion` corrente: **1**.
- `migrateAppData` rifiuta versioni future e versioni non numeriche.
- In futuro: una funzione per ogni versione e un fixture di test.
- Prima di una migrazione distruttiva, conservare un backup raw.

## 4. Export

Pulsante “Esporta backup” in Impostazioni e nella pagina del preventivo (tramite link condiviso). Il file è JSON:

```json
{
  "app": "LayerCost",
  "schemaVersion": 1,
  "exportedAt": "2026-10-23T12:00:00.000Z",
  "data": { "...": "..." }
}
```

Nome file: `layercost-backup-YYYY-MM-DD.json`.

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
- Non c'è sincronizzazione tra dispositivi in v1.

## 8. Privacy

- Nessuna chiamata di rete oltre agli asset statici.
- Nessun analytics, cookie o account.
- I dati restano sul dispositivo.
- I link condivisi sono leggibili da chiunque abbia l'URL.

## 9. Sync futura

L'interfaccia `DataRepository` è astratta. In v1 è sincrona perché usa `localStorage`; un adapter cloud potrà esporre le stesse operazioni in forma asincrona, con un refactor dello store:

```ts
interface DataRepository {
  load(): { data: AppData; warning?: string }
  save(data: AppData): void
  export(data: AppData): void
  import(file: File): Promise<AppData>
  reset(): AppData
}
```

Un adapter Supabase dovrà gestire auth, RLS, conflitti e merge per ID. Richiede un ADR dedicato.

## 10. Backup consigliato

- Dopo ogni sessione di configurazione importante.
- Prima di cambiare dispositivo.
- Prima di un import o reset.
- Periodicamente, se i preventivi hanno valore.
