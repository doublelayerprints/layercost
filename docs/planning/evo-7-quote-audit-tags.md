# EVO-7 — Nomi visibili e tag attività dei preventivi

**Stato:** implementato e verificato in locale il 31/10/2026; deploy da fare
**ADR:** `docs/adr/0031-display-names-and-quote-audit.md`
**Relazione:** estende l'audit cloud di T5.4.5 e ADR-0024/ADR-0028; non cambia formule, `engineVersion`, snapshot economici, schema locale v4, auth o RLS dei dati esistenti

---

## 1. Obiettivo

Negli spazi condivisi ogni preventivo deve mostrare chi lo ha creato e chi lo ha modificato per ultimo, con data visibile, così che i membri capiscano subito l'attribuzione del lavoro.

Casi d'uso:

1. Marco apre **Preventivi** nello spazio condiviso e vede `Creato da Giulia · 30 ott` e `Ultima modifica di Marco · 31 ott`.
2. Giulia apre lo stesso spazio e vede `Creato da te` e `Ultima modifica di Marco`.
3. Un membro cambia il proprio nome visibile in **Impostazioni → Profilo**; i tag dei preventivi esistenti mostrano il nome nuovo.
4. Un utente nello spazio personale o in modalità ospite non vede tag superflui.
5. Un utente offline o senza directory caricata vede `un altro membro` come fallback, senza perdere creatore, editor o date.

## 2. Non-obiettivi

- avatar o iniziali nei tag della lista;
- nomi diversi per spazio condiviso;
- filtro o ricerca “creati da”;
- cronologia completa delle modifiche;
- notifiche, commenti o menzioni;
- modifica di formule, `engineVersion`, snapshot economici o schema locale v4;
- esposizione dell'email a editor o a tutti i membri.

## 3. Scelte

| Tema         | Scelta                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Identità     | Nome visibile unico per utente, modificabile in Impostazioni → Profilo                |
| Storage      | Tabella cloud `profiles`, separata da `auth.users`                                    |
| Backfill     | Nome Google, poi `full_name`, poi parte locale dell'email, poi `Membro`               |
| Nuovi utenti | Creazione lazy alla prima chiamata `get_my_profile` con lo stesso criterio            |
| Validazione  | 1–40 caratteri dopo trim e normalizzazione degli spazi                                |
| Directory    | `list_workspace_members` restituisce anche `display_name`                             |
| Spazi        | `list_my_workspaces` restituisce `kind` (`personal`/`shared`)                         |
| Tag          | Solo modalità cloud, spazio attivo `shared`, se esiste il metadato                    |
| Proprio nome | Nei tag si usa “te”, come nel dettaglio attuale                                       |
| Nome altrui  | Nome visibile; fallback “un altro membro”                                             |
| Date         | `<time dateTime>` con `dateOnly` nella lista e `dateTime` nel dettaglio               |
| Privacy      | Nome visibile ai membri dello spazio; email resta visibile solo agli owner            |
| Cambio nome  | Aggiorna anche i tag storici (nome dinamico, non congelato)                           |
| Offline      | Nessun blocco: tag nascosti o “un altro membro” finché la directory non è disponibile |

## 4. Schema database

Nuova migrazione `supabase/migrations/20261031120000_profiles.sql`.

### 4.1 Tabella `profiles`

```sql
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant all on table public.profiles to service_role;
```

Nessun accesso diretto dal client: lettura e scrittura passano da RPC `security definer`.

### 4.2 Backfill e creazione lazy

- Backfill una tantum di tutti gli utenti esistenti con lo stesso `coalesce`.
- Nessun trigger applicativo su `auth.users`: il profilo dei nuovi utenti viene creato alla prima chiamata `get_my_profile`, così il restore data-only di `auth.users` seguito da `public` non duplica le righe.
- Normalizzazione: `btrim`, spazi multipli collassati, `left(..., 40)`.
- Precedenza: `display_name` nei metadati (utile ai test), `full_name`, `name`, parte prima della `@`, `Membro`.

### 4.3 RPC

| Funzione                 | Firma                                | Comportamento                                                          |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| `get_my_profile`         | `() returns text`                    | Crea il profilo se manca e restituisce il nome dell'utente autenticato |
| `set_my_profile`         | `(p_display_name text) returns text` | Valida, normalizza e salva il nome dell'utente                         |
| `list_workspace_members` | `(p_workspace_id text)`              | Aggiunge `display_name`; email solo per owner                          |
| `list_my_workspaces`     | `()`                                 | Aggiunge `kind` (`personal`/`shared`)                                  |

Le funzioni esistenti con cambio di tipo di ritorno vengono ricreate con `drop function` nella stessa migrazione. Grant `execute` solo ad `authenticated`; revoca da `public`.

### 4.4 Test pgTAP

Nuovo `supabase/tests/profiles.test.sql`:

- la prima chiamata `get_my_profile` crea il profilo dal nome Google, dal metadato o dalla parte locale dell'email;
- la derivazione normalizza gli spazi;
- `set_my_profile` salva, normalizza e rifiuta nomi vuoti o oltre 40 caratteri;
- un editor vede `display_name` dei membri ma non l'email;
- un owner vede nome ed email;
- un estraneo non può leggere la directory;
- `list_my_workspaces` restituisce `kind`.

## 5. Client

### 5.1 Gateway e tipi

- `WorkspaceSummary.kind: 'personal' | 'shared'`.
- `WorkspaceMember.displayName?: string`.
- `CloudGateway.getProfile(): Promise<string | null>`.
- `CloudGateway.saveProfile(displayName: string): Promise<string>`.
- `database.types.ts` rigenerato da Supabase locale, o aggiornato a mano se il DB non è disponibile.
- `listWorkspaces` e `listMembers` mappano i nuovi campi con fallback difensivo.

### 5.2 Workspace store

- Stato `profileStatus`, `profileName`, `profileError`.
- Azioni `loadProfile`, `saveProfile`.
- Caricamento profilo dopo l'autenticazione; caricamento membri per lo spazio attivo condiviso.
- `saveProfile` aggiorna il nome del profilo; la directory si aggiorna al sync successivo.
- `reset` azzera profilo e directory.
- Protezione dalle risposte obsolete dopo logout o cambio spazio.

### 5.3 Risoluzione del nome

Nuova utility pura `src/features/quotes/quote-audit.ts`:

```ts
quoteMemberName(userId, currentUserId, members, t): string | undefined
```

- `userId` assente → `undefined`;
- utente corrente → `quote.audit.you`;
- membro trovato con `displayName` → nome;
- membro trovato senza nome o directory non caricata → `quote.audit.member`.

### 5.4 UI

- `QuoteAuditTags`: due badge con `Creato da …` e `Ultima modifica di …`, `<time>` e formattazione locale.
- Lista preventivi: tag nella cella del nome (desktop) e sotto lo stato (mobile).
- Dettaglio: la sezione “Workspace condiviso” usa `quoteMemberName`; email mai mostrata.
- Impostazioni: nuova sezione **Profilo** prima di Spazio e Sincronizzazione.
  - visibile solo con cloud configurato e sessione autenticata;
  - campo `Nome visibile`, max 40, hint sulla visibilità;
  - salvataggio, stato di caricamento, errore e conferma;
  - il nome è precompilato dal profilo.
- Messaggi IT/EN e nessun colore come unica informazione.

## 6. Test applicativi

- Unit `workspace-store.test.ts`: caricamento, salvataggio, reset, risposta obsoleta.
- Unit `quote-audit.test.ts`: te, nome, fallback, ID assente.
- Unit `mappers.test.ts` o gateway test: `kind` e `displayName`.
- E2E sync:
  - i due account hanno nomi visibili impostati dai metadati;
  - la lista del secondo account mostra creatore ed editor;
  - il dettaglio mostra il nome reale al posto di “un altro membro”;
  - axe su lista e dettaglio.
- `npm run check`, `npm run db:test`, `npm run test:e2e:sync` verdi.

## 7. Documentazione

- Nuova ADR-0031 con decisione, alternative, privacy, backfill, rollback.
- `docs/domain/data-model.md` §7: tabella `profiles`, RPC, audit con nomi.
- `docs/engineering/workspace-runbook.md` §7 e checklist: nomi visibili, query di audit, verifica UI.
- `docs/planning/evo-7-quote-audit-tags.md` (questo file), `TASKS.md`, `STATUS.md`, `CHANGELOG.md`.
- `docs/planning/i18n-inventory.md` per le nuove chiavi.
- Nota esplicita: la precompilazione da email espone ai membri la parte prima della `@` finché l'utente non cambia nome.

## 8. Rollout e rollback

- Migrazione additiva; i dati esistenti e i preventivi non vengono toccati.
- Ordine di deploy: migrazione Supabase, poi app. L'app vecchia ignora i campi in più; l'app nuova usa i fallback se la migrazione non è ancora applicata.
- Rollback app: si torna a “un altro membro”; i tag spariscono.
- Rollback database: si possono eliminare le RPC e la tabella `profiles`; `quotes.created_by`/`updated_by` restano intatti. Si perdono solo i nomi scelti.

## 9. Rischi noti

- **Email nel nome:** la parte prima della `@` è un dato derivato dall'email. Scelta esplicita dell'utente; documentata e reversibile cambiando il nome.
- **Nomi duplicati:** due membri possono scegliere lo stesso nome. Non è un problema di sicurezza; i tag non mostrano email o ruolo.
- **Directory non disponibile:** offline o errore RPC → fallback “un altro membro”. Gli UUID restano e i tag tornano appena la directory è disponibile.
- **Cambio nome:** i preventivi storici mostrano il nome corrente, non quello al momento della modifica. È coerente con “chi è questa persona oggi”; una cronologia congelata resta fuori scope.
- **Costo all'avvio:** una RPC profilo e una directory per spazio condiviso. Payload piccolo, nessun impatto sul budget del bundle oltre al componente e alle stringhe.

## 10. Accettazione

- [x] In uno spazio condiviso la lista mostra creatore e ultima modifica con nome e data.
- [x] “te” identifica l'utente corrente; gli altri membri vedono il nome visibile.
- [x] Il dettaglio usa il nome reale e mantiene le date.
- [x] Spazi personali, modalità ospite e preventivi senza audit non mostrano tag.
- [x] Il nome si modifica da Impostazioni → Profilo, con validazione 1–40.
- [x] Gli account esistenti sono precompilati da Google o dalla parte locale dell'email.
- [x] Email non esposta nei tag né agli editor.
- [x] `npm run check`, `npm run db:test` e `npm run test:e2e:sync` verdi.
- [x] Documentazione e ADR aggiornati.
- [ ] Deploy di produzione e verifica con i due account.
