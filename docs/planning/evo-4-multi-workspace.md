# EVO-4 — Spazi separati (multi-workspace)

**Stato:** implementato e verificato in locale il 30/10/2026; deploy in produzione da fare
**ADR:** `docs/adr/0028-multi-workspace.md`
**Relazione:** supersede in parte ADR-0024 (un solo workspace condiviso); non cambia formule, `engineVersion`, snapshot economici, schema locale v4 o dominio
**Stima:** 5–7 giorni

---

## 1. Obiettivo

Ogni utente ha uno spazio personale; più utenti possono condividere uno spazio. L'utente sceglie lo spazio attivo, vede solo i dati di quello spazio e può crearne di nuovi o accettare un invito.

Casi d'uso:

1. Nuovo utente accede per la prima volta → trova uno spazio personale già pronto con il seed.
2. Utente esistente accede → resta su `ws-doublelayer` e vede in più il proprio spazio.
3. Owner crea un codice invito → un'altra persona lo riscatta → entra nello spazio con il ruolo scelto.
4. Utente passa da uno spazio all'altro → dati, cache e coda di sync cambiano insieme.
5. Utente senza account continua a usare l'archivio locale, senza cloud.

## 2. Non-obiettivi

- signup pubblico o inviti via email;
- realtime, ACL per singolo preventivo, portale cliente;
- cancellazione fisica di uno spazio dalla UI;
- fatturazione, analytics, tracciamento;
- import automatico dell'archivio locale in uno spazio cloud;
- modifica di formule, `engineVersion`, snapshot o schema locale v4.

## 3. Scelte

| Tema            | Scelta                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Tenancy         | Utente ↔ workspace molti-a-molti; uno spazio attivo per sessione       |
| Tipi di spazio  | `workspaces.kind`: `personal` automatico, `shared` creato dall'utente  |
| Spazio personale| Creato alla prima autenticazione se l'utente non ne ha già uno          |
| Dati esistenti  | `ws-doublelayer` resta condiviso; nessun dato si sposta                |
| Chiavi          | PK `(workspace_id, id)`; FK `(workspace_id, ref_id)`                   |
| Inviti          | Codice monouso, hash a riposo, consegna manuale, nessun SMTP           |
| Account invitato| Creato dall'amministratore, come oggi                                  |
| Cache           | `layercost:cloud-cache:<workspaceId>`                                  |
| Sync            | `layercost:sync-state:<workspaceId>` + coda offline per spazio         |
| Spazio attivo   | `layercost:active-workspace`, letto/scritto solo da `src/data/`        |
| Limiti          | 10 spazi posseduti per utente, 20 membri per spazio (hardcoded)        |
| Condivisione    | Link compresso invariato: contiene il preventivo, non lo spazio        |
| Membri          | Lista visibile a tutti i membri; email visibile solo agli owner        |

## 4. Schema database

Migrazione `supabase/migrations/20261030120000_multi_workspace.sql`. Backup prima dell'applicazione.

### 4.1 Chiavi composte

Tabelle interessate: `energy_tariffs`, `printers`, `materials`, `extras`, `quotes`.

```sql
alter table public.printers drop constraint printers_pkey;
alter table public.printers add primary key (workspace_id, id);
-- idem per energy_tariffs, materials, extras, quotes
```

- `energy_tariffs_workspace_id_id_key` diventa ridondante: si elimina dopo la PK, quando la FK di `printers` è soddisfatta dalla nuova PK.
- La FK `printers (workspace_id, energy_tariff_id) → energy_tariffs (workspace_id, id)` resta invariata.
- `settings` ha già `workspace_id` come PK.
- `workspaces` riceve `kind` (`personal`/`shared`): il personale è automatico e non consuma il tetto dei 10 spazi condivisi.
- Gli indici esistenti sono già prefissati da `workspace_id` e restano validi.
- I preventivi mantengono UUID generati dall'app: il link condiviso resta univoco.

### 4.2 `workspace_invites`

```sql
create table public.workspace_invites (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('owner', 'editor')),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  used_count integer not null default 0 check (used_count >= 0),
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index workspace_invites_workspace_idx
  on public.workspace_invites (workspace_id, created_at desc);
```

- `token_hash = sha256(token)`; il token in chiaro non è mai salvato né rileggibile.
- RLS: `select`/`insert`/`update` solo owner dello spazio; nessuna `delete` (revoca = `revoked_at`).
- Scadenza predefinita 7 giorni, intervallo 1–30.

### 4.3 RPC (`security definer`, `search_path = ''`)

| Funzione | Firma | Comportamento |
| --- | --- | --- |
| `create_workspace` | `(p_name text) returns text` | Crea workspace `ws-<uuid>`, membership `owner`, rispetta il tetto di 10 spazi posseduti. Nome obbligatorio, massimo 80 caratteri. |
| `ensure_personal_workspace` | `() returns text` | Se l'utente ha già uno spazio `kind = 'personal'` restituisce `null`; altrimenti crea "Spazio di \<local-part email\>" e lo restituisce. Idempotente. |
| `create_invite` | `(p_workspace_id text, p_role text, p_days integer) returns text` | Solo owner. Genera 16 byte casuali, salva l'hash, restituisce il token in chiaro una sola volta. Tetto membri 20. |
| `revoke_invite` | `(p_invite_id text) returns void` | Solo owner. Imposta `revoked_at`. |
| `redeem_invite` | `(p_token text) returns text` | Utente autenticato. Verifica hash, scadenza, revoca, usi e tetto membri; crea la membership `on conflict do nothing`; incrementa `used_count` sotto advisory lock; restituisce `workspace_id`. |
| `list_workspace_members` | `(p_workspace_id text) returns table (user_id uuid, role text, email text, joined_at timestamptz)` | Membri dello spazio. `email` valorizzata solo se il chiamante è owner, altrimenti `null`. |
| `leave_workspace` | `(p_workspace_id text) returns void` | Rimuove la propria membership. Blocca se è l'ultimo owner (`last_owner`). |

Codici errore: `workspace_limit`, `member_limit`, `invite_invalid`, `invite_expired`, `invite_revoked`, `invite_exhausted`, `last_owner`, `not_owner`, `42501`.

### 4.4 Trigger e invarianti

- `protect_last_owner` resta valido su `workspace_members`.
- `set_audit_fields` resta per tabella, invariato.
- Nessuna modifica ai trigger dei preventivi (`quote_locked`, `quote_metadata_locked`).
- `workspace_members_insert_owner` resta per l'aggiunta manuale da SQL; l'invito passa dalla RPC.

## 5. Client

### 5.1 Dati

- `src/data/cloud/gateway.ts`: `resolveWorkspace()` sostituito da `listWorkspaces()`, `ensurePersonalWorkspace()`, `createWorkspace()`, `createInvite()`, `revokeInvite()`, `redeemInvite()`, `listMembers()`, `leaveWorkspace()`. `pull`/`push` ricevono già `workspaceId`.
- `src/data/cloud/sync-state.ts`: chiave `layercost:sync-state:<workspaceId>`; migrazione della chiave legacy verso `ws-doublelayer`.
- `src/data/cloud-cache.ts`: chiave `layercost:cloud-cache:<workspaceId>`; migrazione della chiave legacy verso `ws-doublelayer`; nessuna cancellazione di cache di altri spazi.
- `src/data/workspace-preference.ts`: `layercost:active-workspace`, con validazione contro le membership note.
- `src/data/storage.ts`: invariato; `layercost:data` resta l'archivio locale anonimo.

### 5.2 Stato

- `auth-store`: dopo `authenticated` chiama `ensurePersonalWorkspace()` (solo se l'utente non ha membership), poi `listWorkspaces()` e sceglie lo spazio attivo dalla preferenza o dal primo per `created_at`.
- `sync-store`: stato per spazio (`workspaces`, `activeWorkspaceId`, `switching`, `workspaceError`), azione `switchWorkspace(id)` che esegue flush della coda, invalida il pull in corso con un contatore di generazione, carica la cache del target, idrata lo store e avvia il pull.
- Cambio spazio con scritture pendenti: la coda resta nello spazio di origine e viene riprodotta al ritorno; nessuna operazione viene spostata.
- Offline: lo spazio attivo resta utilizzabile dalla cache; creazione spazi, inviti e riscatto richiedono rete e mostrano un errore dedicato.

### 5.3 UI

- **Selettore spazio** in cima alla sidebar e nel menu mobile: spazio attivo, ruolo, elenco spazi, "Nuovo spazio", "Hai un codice invito?".
- **Pagina Spazio** in Impostazioni: nome (owner), ruolo, membri con ruolo e data, inviti attivi con scadenza e revoca, creazione invito con scelta ruolo e durata, uscita dallo spazio.
- **Dialogo codice invito**: campo token, riscatto, messaggio di errore per codice non valido, scaduto, revocato o esaurito.
- **Primo accesso**: nessuno stato vuoto; lo spazio personale è già creato e popolato.
- **Empty state** per uno spazio senza preventivi: invito a calcolare il primo, senza suggerire di importare dati di altri spazi.
- Tutte le stringhe in `src/i18n/it/` e `src/i18n/en/`; nessun testo inline.
- Se il bundle iniziale si avvicina al limite, la pagina Spazio e i dialoghi diventano un chunk lazy.

### 5.4 Seed di un nuovo spazio

Il seed resta nel client (`src/data/seed.ts`) per non duplicarlo in SQL.

1. `create_workspace` / `ensure_personal_workspace` creano solo workspace e membership.
2. Il client marca lo spazio in `layercost:pending-seed` e, al primo pull, invia il seed con il normale percorso di push.
3. Il seed usa gli ID fissi esistenti, ora validi per spazio; le upsert lo rendono idempotente.
4. Se il seed si interrompe, il marker sopravvive e al login successivo viene ripreso.
5. Cambiare spazio non apre mai il dialogo "primo accesso": i dati dello spazio precedente non vengono proposti come dati locali.

## 6. Migrazione e rilascio

1. Backup `pg_dump` e JSON di produzione (`docs/engineering/backup-restore.md`).
2. Applicare la migrazione in locale, `npm run db:reset`, `npm run db:test`.
3. Applicare in produzione **prima** del client: è retrocompatibile, il client precedente continua a usare `ws-doublelayer` e `resolveWorkspace()` restituisce la membership più vecchia.
4. Deploy del client, verifica manuale con tre account e `npm run smoke:production`.
5. Comunicare ai due utenti attuali: `ws-doublelayer` resta, compare lo spazio personale.

Rollback:

- Migrazione one-way: non si ripristinano le PK globali dopo la creazione di nuovi spazi.
- Rollback applicativo al deploy precedente, che resta funzionante su `ws-doublelayer`.
- Ripristino dati solo dal backup, con perdita degli spazi creati dopo il backup.
- Gli inviti si revocano senza eliminare membri.

## 7. Test

### pgTAP (`supabase/tests/multi_workspace.test.sql`)

41 asserzioni, tutte verdi:

- Due workspace con gli stessi ID di seed: nessuna collisione, isolamento in lettura e scrittura.
- `ensure_personal_workspace`: crea una volta sola, anche per chi ha già spazi condivisi.
- `create_workspace`: tetto 10, nome vuoto rifiutato, membership owner creata.
- `create_invite` / `redeem_invite`: valido, scaduto, revocato, esaurito, token errato, utente già membro, tetto 20.
- `leave_workspace`: consentito a editor e owner non ultimo; `last_owner` sull'ultimo.
- `list_workspace_members`: email solo per owner.
- RLS: un membro di A non vede né scrive in B; `anon` negato.
- Trigger esistenti ancora verdi (33 asserzioni in `rls.test.sql`).

### Unit

- Chiavi di cache e sync per workspace, migrazione delle chiavi legacy.
- Preferenza dello spazio attivo: valida, mancante, riferita a uno spazio non più accessibile.
- `switchWorkspace`: flush, invalidazione del pull, caricamento cache, errore di rete.
- Seed idempotente su spazio vuoto e non ripetuto su spazio con sole righe soft-deleted.

### E2E

- Primo login di un terzo utente: spazio personale creato e seed visibile.
- Creazione invito, riscatto da un secondo contesto, dati condivisi.
- Cambio spazio: i preventivi di A non compaiono in B.
- Uscita da uno spazio e ritorno allo spazio personale.
- Isolamento audit: "un altro membro" resta corretto dentro lo spazio.
- axe su selettore, pagina Spazio e dialogo invito a 375/1440 px.

## 8. Criteri di accettazione

- [x] Un utente nuovo trova uno spazio personale già popolato, senza intervento admin.
- [x] I due account attuali vedono `ws-doublelayer` con tutti i dati e uno spazio personale vuoto.
- [x] Due spazi possono avere gli stessi ID di seed senza collisioni.
- [x] Un invito valido aggiunge la membership; uno scaduto, revocato o esaurito no.
- [x] Cambiando spazio non si vedono dati dell'altro e la coda di sync non si mescola.
- [x] La modalità locale senza account resta invariata.
- [x] `npm run check`, `npm run db:test`, `npm run test:e2e`, `npm run test:e2e:auth`, `npm run test:e2e:sync` verdi.
- [ ] Documentazione e runbook aggiornati; nessun segreto o token nei log.
- [ ] Deploy in produzione: migrazione prima del client, backup, smoke.

## 9. Task

| Task | Contenuto | Stato |
| --- | --- | --- |
| EVO-4.1 | Migrazione PK composte + backup e test pgTAP esistenti | Fatto |
| EVO-4.2 | `workspace_invites`, RPC e relative policy | Fatto |
| EVO-4.3 | Gateway, chiavi per workspace, preferenza spazio attivo | Fatto |
| EVO-4.4 | `auth-store` e `sync-store`: lista spazi, switch, flush, generazione | Fatto |
| EVO-4.5 | Seed idempotente del nuovo spazio | Fatto |
| EVO-4.6 | Selettore spazio, pagina Spazio, dialogo invito, i18n | Fatto |
| EVO-4.7 | Test pgTAP, unitari, E2E, axe e budget | Fatto |
| EVO-4.8 | Runbook, data model, STATUS, TASKS, CHANGELOG; deploy e smoke | Documenti fatti; deploy da fare |

## 10. Rischi

| Rischio | Mitigazione |
| --- | --- |
| Migrazione PK irreversibile | Backup prima; migrazione in produzione prima del client |
| Sync che mescola spazi | Chiavi per workspace e generazione sul pull; test E2E dedicati |
| Cache di uno spazio sovrascritta | Una chiave per workspace; nessuna scrittura cross-space |
| Tetto membri troppo basso | 20 hardcoded, configurabile con EVO-2 |
| Codice invito condiviso male | Monouso, scadenza, revoca, hash a riposo, nessun dato economico nel codice |
| Budget JS oltre 230 KB | Pagina Spazio e dialoghi in chunk lazy |
| Runbook non aggiornato | EVO-4.8 obbligatorio prima del deploy |

## 11. Riferimenti

- `docs/adr/0028-multi-workspace.md`
- `docs/adr/0024-supabase-auth-workspace.md`
- `docs/planning/evolutive.md` §5
- `docs/engineering/workspace-runbook.md`
- `docs/engineering/backup-restore.md`
- `docs/domain/data-model.md` §7
- `supabase/migrations/20261028120000_init.sql`
- `supabase/tests/rls.test.sql`
