# EVO-8 — Console admin: utenti, spazi e tetti

**Stato:** implementata, distribuita e attiva in produzione il 4 novembre 2026 (PR #63, squash `8cfe37c`, build `index-D6ixFw48.js` / `index-DMAw7o4c.css`; operazioni §8 chiuse lo stesso giorno, esiti nel runbook §17.2)
**Data:** 4 novembre 2026
**ADR:** `docs/adr/0034-admin-console.md`
**Runbook:** `docs/engineering/workspace-runbook.md` (§16 tetti, offboarding §6.6)
**Stima:** 1–2 giorni
**Branch suggerito:** `feat/evo-8-admin-console`

---

## 1. Obiettivo

Dare all'amministratore (Tancredi Bosi, unico admin) una **console in-app** su `/#/admin` per monitorare il servizio dopo l'apertura del signup (ADR-0027) e gestire i tetti per workspace senza passare dal SQL editor: panoramica d'insieme, lista utenti con provider e ultimo accesso, lista spazi con uso vs tetti, membri per spazio e modifica `max_members`/`max_quotes`.

**Non obiettivi:** cancellazione o disattivazione di account (service role/Admin API, runbook §6.6); gestione inviti di spazi altrui (l'owner li gestisce dalla sua pagina Spazio); cambio ruoli dei membri; paginazione e filtri avanzati; metriche del piano Supabase (egress, DB size — solo dashboard, sources §6.2); grafici o storici.

---

## 2. Decisioni prese il 04/11/2026

1. **Perimetro**: monitoraggio + modifica tetti. Nessuna azione distruttiva dalla console.
2. **Identità admin**: colonna `profiles.is_admin boolean not null default false`, impostata via SQL una-tantum al deploy; estendibile con una riga SQL. Non esiste un ruolo admin globale in `workspace_members` e non lo si introduce.
3. **Collocamento**: route lazy `/#/admin` + gruppo sidebar **Amministrazione** visibile solo se `is_app_admin()`; senza flag né la voce né la pagina sono utili.
4. **Forma RPC**: sei funzioni dedicate (approccio A), pattern RPC-only di `profiles` (ADR-0031): zero grant diretti, nessuna modifica alla RLS esistente.
5. **Tetti modificabili dalla UI** per qualsiasi workspace (personale e condiviso), con validazione `> 0` e avviso se il nuovo valore è sotto l'uso attuale. Il decremento sotto l'uso è ammesso, come per il SQL attuale: i trigger agiscono solo su insert/ripristini.
6. **Dati esposti**: email, nome visibile, provider, timestamp di account, conteggi per workspace. Nessun contenuto economico dei preventivi.

---

## 3. Migrazione SQL

File: `supabase/migrations/20261104000000_admin_console.sql` (una sola migrazione; applicare in produzione solo dopo backup verificato, come da runbook).

### 3.1 Colonna admin

```sql
alter table public.profiles
  add column is_admin boolean not null default false;
```

`profiles` non ha grant diretti né policy (tutto via RPC): la colonna non richiede altre modifiche di accesso. Nessun backfill necessario: il default `false` copre tutti.

### 3.2 Helper

```sql
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;
```

L'utente senza sessione ottiene `false` (coalesce); il pattern è lo stesso di `get_my_profile`, che chiama `auth.uid()` con `search_path = ''`.

### 3.3 RPC di lettura

Tutte `security definer`, `search_path = ''`, le letture `stable` (la scrittura è volatile, vedi §3.4), con la stessa guardia; errori per codice come nelle migrazioni precedenti (`not_admin` → `42501`, `invalid_limit` → `22023`, `workspace_not_found` → `P0001`).

```sql
create or replace function public.admin_overview()
returns table (
  total_users bigint,
  max_users_limit integer,
  total_personal_workspaces bigint,
  total_shared_workspaces bigint,
  total_quotes bigint,
  total_memberships bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      (select count(*) from auth.users),
      public.max_users(),
      (select count(*) from public.workspaces w where w.kind = 'personal'),
      (select count(*) from public.workspaces w where w.kind = 'shared'),
      (select count(*) from public.quotes q where q.deleted_at is null),
      (select count(*) from public.workspace_members m);
end;
$$;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  providers text,
  workspace_count integer,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(
        p.display_name,
        public.profile_name_from_user(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.email::text
        )
      )::text,
      (
        select string_agg(distinct i.provider, ',')
        from auth.identities i
        where i.user_id = u.id
      ),
      (
        select count(*)::integer from public.workspace_members m
        where m.user_id = u.id
      ),
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    order by u.created_at desc, u.id;
end;
$$;

create or replace function public.admin_list_workspaces()
returns table (
  workspace_id text,
  name text,
  kind text,
  members integer,
  max_members integer,
  quotes integer,
  max_quotes integer,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      w.id,
      w.name,
      w.kind,
      (
        select count(*)::integer from public.workspace_members m
        where m.workspace_id = w.id
      ),
      (
        select coalesce(max(l.max_members), 20)
        from public.workspace_limits l where l.workspace_id = w.id
      ),
      (
        select count(*)::integer from public.quotes q
        where q.workspace_id = w.id and q.deleted_at is null
      ),
      (
        select coalesce(max(l.max_quotes), 500)
        from public.workspace_limits l where l.workspace_id = w.id
      ),
      w.created_at
    from public.workspaces w
    order by w.created_at desc, w.id;
end;
$$;

create or replace function public.admin_workspace_members(p_workspace_id text)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.workspaces w where w.id = p_workspace_id
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  return query
    select
      m.user_id,
      u.email::text,
      coalesce(
        p.display_name,
        public.profile_name_from_user(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.email::text
        )
      )::text,
      m.role,
      m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.workspace_id = p_workspace_id
    order by m.created_at, m.user_id;
end;
$$;
```

Note:

- I conteggi di preventivi seguono la stessa semantica del trigger `quotes_cap` (archiviati contano, soft-deleted no) e i tetti usano lo stesso fallback 20/500 del trigger e di `workspace_usage`.
- `display_name` usa la stessa catena di fallback di `list_workspace_members` (EVO-7).
- Le tabelle `auth.users`/`auth.identities` sono lette in qualità di definer, come già fanno l'auth hook e le directory: nessuna grant nuova sullo schema auth.

### 3.4 RPC di scrittura

```sql
create or replace function public.admin_update_workspace_limits(
  p_workspace_id text,
  p_max_members integer,
  p_max_quotes integer
)
returns table (max_members integer, max_quotes integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if p_max_members is null or p_max_members < 1
     or p_max_quotes is null or p_max_quotes < 1 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.workspaces w where w.id = p_workspace_id
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  insert into public.workspace_limits
    (workspace_id, max_members, max_quotes, updated_by, updated_at)
  values
    (p_workspace_id, p_max_members, p_max_quotes, auth.uid(), now())
  on conflict (workspace_id) do update
    set max_members = excluded.max_members,
        max_quotes = excluded.max_quotes,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return query
    select l.max_members, l.max_quotes
    from public.workspace_limits l
    where l.workspace_id = p_workspace_id;
end;
$$;
```

Volatili le sole funzioni di scrittura: `admin_update_workspace_limits` non è `stable` (esegue INSERT/UPDATE; il resto sono letture pure). I vincoli `check (> 0)` di `workspace_limits` restano come seconda rete. Nessuna policy di scrittura nuova: l'update passa dalla RPC definer, il client continua a non poter scrivere la tabella direttamente.

### 3.5 Grant

```sql
revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_list_workspaces() from public, anon;
revoke all on function public.admin_workspace_members(text) from public, anon;
revoke all on function public.admin_update_workspace_limits(text, integer, integer) from public, anon;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_workspaces() to authenticated;
grant execute on function public.admin_workspace_members(text) to authenticated;
grant execute on function public.admin_update_workspace_limits(text, integer, integer) to authenticated;
```

La guardia interna rifiuta i non-admin con `not_admin`: il grant a `authenticated` serve solo a far arrivare la richiesta alla funzione.

### 3.6 SQL una-tantum al deploy (runbook, mai nel repository)

```sql
insert into public.profiles (user_id, display_name, is_admin)
values ('<uuid-admin>', '<nome visibile>', true)
on conflict (user_id) do update
  set is_admin = true, updated_at = now();
```

---

## 4. Data layer e stato

- **`src/data/cloud/gateway.ts`**: sei nuovi metodi su `CloudGateway` — `isAdmin()`, `adminOverview()`, `adminListUsers()`, `adminListWorkspaces()`, `adminWorkspaceMembers(id)`, `adminUpdateWorkspaceLimits(id, maxMembers, maxQuotes)` — più i tipi `AdminOverview`, `AdminUser`, `AdminWorkspace`, `AdminWorkspaceMember`. Errori: aggiungere `not_admin` e `invalid_limit` all'unione `WorkspaceErrorCode` e al mapping esistente.
- **`src/data/cloud/database.types.ts`**: rigenerato con `npm run db:types` dopo la migrazione locale.
- **`src/state/admin-store.ts`**: nuovo store con factory iniettata (stesso pattern di `workspace-store`):
  - stato: `status`, `isAdmin`, `overview?`, `users?`, `workspaces?`, `selectedWorkspaceId?`, `members?`, `limitsStatus`, `error?`;
  - azioni: `checkAdmin()` (al bootstrap della sessione cloud, nello stesso punto del caricamento workspace), `load()` (overview + utenti + spazi), `selectWorkspace(id)` (membri), `updateLimits(id, mm, mq)` (salva, poi ricarica spazi e overview), `reset()` (al logout, insieme allo store workspace).
- **Sidebar** (`src/app/Layout.tsx`): gruppo **Amministrazione** con la voce Admin, renderizzato solo se `isAdmin`; su mobile nel menu corrispondente.

---

## 5. UI

- **`src/features/admin/AdminPage.tsx`** (lazy in `src/App.tsx`, route `/admin` dentro `AppShell`): se `isAdmin` è false → stato "Area riservata agli amministratori" (le RPC rifiutano comunque: difesa in profondità). Tre sezioni impilate in stile `SettingsPage`:
  - **Panoramica**: `dl` con Utenti x/1000, Spazi personali, Spazi condivisi, Preventivi totali (+ membership totali come nota).
  - **Utenti**: tabella ≥1280 px / card sotto (pattern lista stampanti PR #59): Email, Nome, Provider (pill Email/Google, `providers` dell'RPC), Spazi (n.), Creato, Ultimo accesso. Filtro client-side su email e nome (stessa UX di ricerca del catalogo). Ordinamento: creato desc (server).
  - **Spazi**: righe con pill tipo (Personale/Condiviso), uso "membri x/t · preventivi x/t" con evidenza quando a tetto, data creazione; pannello espandibile **Dettagli** (`aria-expanded`, come lista stampanti) con la lista membri (email, nome, ruolo, iscrizione) e l'**editor tetti**: due input numerici con parsing it-IT (`useFormat`), validazione intero `> 0` con `aria-describedby`, avviso visibile (non solo a colore) se il nuovo valore è sotto l'uso attuale, pulsante Salva con alert di esito e refresh di lista e overview.
- **i18n**: nuova area `admin.*` in `src/i18n/it/` e `src/i18n/en/` (fonte `it`, parità tipizzata), ~35–40 chiavi × 2; aggiornare `docs/planning/i18n-inventory.md`.
- **Accessibilità**: label e unità visibili, errori per campo, focus visibile, nessun colore come unica informazione, verifica axe a 375/1440 in IT e EN (stato riservato incluso).

---

## 6. Messaggi ed errori

| Codice            | Messaggio (it)                                                    | Dove                                    |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------- |
| `not_admin`       | "Area riservata agli amministratori."                             | pagina Admin, store                     |
| `invalid_limit`   | "I tetti devono essere numeri interi maggiori di zero."           | editor tetti                            |
| `workspace_not_found` | "Spazio non trovato." (già mappato)                           | pannello membri / editor                |
| errore di rete    | messaggio standard di sincronizzazione                             | tutte le sezioni                        |

La modifica dei tetti non deve mai perdere i valori inseriti in caso di errore: il form resta compilato con l'errore associato ai campi.

---

## 7. Ordine dei task

1. Migrazione SQL `20261104000000_admin_console.sql` + pgTAP (`db:start`, `db:reset`, `db:test`).
2. `npm run db:types`; gateway (tipi, metodi, mapping `not_admin`/`invalid_limit`).
3. `admin-store` + integrazione bootstrap sessione/logout; sidebar condizionale.
4. UI `features/admin/` (route lazy, Panoramica, Utenti, Spazi con membri ed editor tetti) + chiavi i18n IT/EN.
5. Test: unit store, E2E `admin.spec.ts` nella runner sync, axe su `/#/admin`, budget dopo build.
6. Docs: runbook (§16.2 via UI + nuova sezione EVO-8 con SQL admin e troubleshooting `not_admin`, checklist §13), ADR-0034 (stato → implementato), TASKS.md, `i18n-inventory.md`, `testing.md` (conteggi), README/STATUS/CHANGELOG alla chiusura.
7. `npm run check` + `npm run db:test` + `npm run test:e2e` + `npm run test:e2e:sync`.
8. PR, preview Vercel, deploy produzione: **backup verificato → migrazione → SQL `is_admin` → smoke** con verifica della console live.

---

## 8. Test e acceptance (esito 04/11/2026)

- **pgTAP** `supabase/tests/admin.test.sql`: **34 asserzioni** (148 totali) — `is_app_admin()` false di default; ogni RPC rifiuta il non-admin con `not_admin`; con fixture admin: conteggi `admin_overview()` corretti, `admin_list_users()` con email/provider/nome fallback, `admin_list_workspaces()` con fallback 20/500, `admin_workspace_members()` mostra email a un admin non membro, update tetti persiste con `updated_by`, valori `<= 0` rifiutati con `invalid_limit`, workspace inesistente rifiutato con `workspace_not_found`.
- **Unit**: 10 test sulla factory `admin-store` (checkAdmin fail-closed, load, selectWorkspace, updateLimits con refresh silenzioso, reset) e 1 sul mapping `not_admin`/`invalid_limit` nel gateway; **307 unitari totali**.
- **E2E** `tests/e2e/admin.spec.ts` nella runner sync: la console mostra overview, utenti e spazi, la modifica dei tetti si riflette in "Membri 1/30" e "Preventivi 2/800" in Impostazioni → Spazio; il non-admin non ha la voce in sidebar e `/#/admin` mostra lo stato riservato. Runner: **8 test verdi** (6 sync + 2 admin). Suite predefinita: 68 passati, 25 saltati (+2 admin) più 1 senza endpoint.
- **axe**: `/#/admin` (stato riservato) aggiunta alle scansioni a 375/1440 in IT/EN; **53 scansioni** totali, 0 violazioni.
- **Budget (esito reale)**: il bundle **iniziale** passa da 234,7 a **239,0 KB** gzip (chiavi `admin.*` nei dizionari eager + `admin-store` nel bootstrap) — limite alzato a **240 KB** con motivazione in ADR-0034; chunk admin lazy **3,8 KB gzip**, lazy totale **79,1/80 KB**, worker 37,7/40, CSS 10,6/20, HTML 6,0/10, totale 306,4/350.
- **Gate:** `npm run check` verde, `db:test` verde (148), suite E2E complete, **nessuna modifica** a formule, `engineVersion`, schema locale v4, snapshot, seed o RLS esistente.

---

## 9. Rischi

| Rischio                                        | Mitigazione                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Escalation di privilegi via RPC                | Guardia `is_app_admin()` in ogni funzione + pgTAP sul rifiuto               |
| Email di tutti gli utenti esposte              | Solo al flag admin; nessun contenuto economico; ADR-0034 §5                 |
| Decremento tetti sotto l'uso                   | Ammesso (come il SQL attuale), avviso esplicito in UI                       |
| Race tra update tetti e insert simultanei      | I trigger restano la fonte di verità; la UI aggiorna solo i numeri          |
| Budget iniziale superato                        | Misurato: 239,0 KB → limite alzato a 240 KB in ADR-0034                     |
| Fuga di dati in console per non-admin          | Route riservata + RPC che rifiutano; E2E dedicato con utente B              |
| `profiles` senza riga per l'admin al deploy    | SQL di deploy con `insert … on conflict do update`                          |

---

## 10. Rollback

- **Revoca admin**: `update public.profiles set is_admin = false where user_id = '<uuid-admin>';` — voce e route spariscono, nessun dato cambia.
- **Ritiro console**: `drop function` delle sei RPC (o solo della scrittura per rendere la console di sola lettura); la colonna `is_admin` può restare senza effetti.
- Nessun dato utente, preventivo o limite configurato viene toccato dal rollback.

---

## 11. Riferimenti

- `docs/adr/0034-admin-console.md`
- `docs/planning/evo-2-user-quote-caps.md` (tetti e `workspace_usage`), `docs/planning/evo-4-multi-workspace.md` (spazi), `docs/planning/evo-7-quote-audit-tags.md` (profili e directory)
- `docs/engineering/workspace-runbook.md` (§4 bootstrap, §16 tetti, §6.6 offboarding)
- `supabase/migrations/20261031120000_profiles.sql` (pattern RPC-only), `supabase/migrations/20261102120000_signup_cap_and_workspace_limits.sql` (tetti, fallback, errori)
- `docs/domain/sources.md` §6.2 (metriche del piano, monitoraggio post-apertura)
