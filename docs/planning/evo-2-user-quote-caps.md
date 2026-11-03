# EVO-2 — Tetti utenti e preventivi (signup aperto a tetto numerico)

**Stato:** implementata, distribuita e attiva in produzione il 3 novembre 2026 (PR #62, squash `e50c719`, build `index-izqyKv9M.js` / `index-DMAw7o4c.css`; operazioni §8 chiuse lo stesso giorno, esiti nel runbook §16.3)
**Data:** 2 novembre 2026
**ADR:** `docs/adr/0027-signup-cap-and-workspace-limits.md`
**Runbook:** `docs/engineering/workspace-runbook.md` (backup e migrazioni), `docs/engineering/feedback.md` (Formspree)
**Stima:** 1–2 giorni
**Branch suggerito:** `feat/evo-2-caps`

---

## 1. Obiettivo

Aprire il signup con un **tetto numerico globale** (1000 utenti, configurabile via SQL) e introdurre tetti **configurabili per workspace** (20 membri, 500 preventivi), con il database come fonte di verità e la UI che mostra l’uso e mappa gli errori. Contestualmente si ritira la pagina “Richiedi accesso” (EVO-3a), che perde lo scopo con il signup aperto.

**Non obiettivi:** UI admin per modificare i limiti (prima iterazione via SQL/runbook), allowlist email (EVO-3b è assorbita), tetti su storage o per utente, cambio del piano Supabase.

---

## 2. Decisioni prese il 02/11/2026

1. **Tetto utenti numerico globale**, valore iniziale **1000**, applicato con un Auth Hook Postgres `before-user-created`. Il valore è configurabile via SQL (`max_users()`).
2. **Signup riaperto**: email + password con **auto-confirm** (nessuna verifica email, niente SMTP da configurare) e Google OAuth invariato. Ogni nuovo utente riceve il proprio **spazio personale** al primo login (già implementato in EVO-4, ADR-0028).
3. **“Richiedi accesso” ritirata**: route, pagina, feature, chiavi i18n, link, endpoint Formspree accesso e test dedicati vengono rimossi. **ADR-0026** passa a superseded. Il form **Suggerimenti** (ADR-0030) resta invariato.
4. **`workspace_limits`**: `max_members` default **20** (il valore fisso attuale diventa configurabile, comportamento invariato) e `max_quotes` default **500**. Il database (trigger + advisory lock) è la fonte di verità; i limiti si modificano via SQL/runbook.
5. I preventivi **archiviati** contano per il tetto; i **soft-deleted** (`deleted_at` valorizzato) no. Il ripristino di un tombstone verifica di nuovo il tetto.
6. **Chiusura Formspree**: submission reale sul form di produzione eseguita e submission di test cancellate il 02/11/2026 (EVO-3a + EVO-6).

---

## 3. Limiti Supabase Free (verifica 02/11/2026)

Fonte: https://supabase.com/pricing (consultata il 02/11/2026); da registrare anche in `docs/domain/sources.md` §6.2.

| Risorsa                         | Limite Free                             | Conseguenza                                                                                              |
| ------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Utenti auth totali              | Illimitati                              | Nessuna necessità tecnica di tetto utenti: è una scelta di prodotto                                      |
| MAU                             | 50.000                                  | Irraggiungibile alla scala prevista                                                                      |
| Dimensione DB                   | 500 MB                                  | Vincolo fisico più vicino; snapshot preventivo ~5–15 KB → il tetto 500/workspace usa una frazione minima |
| Egress                          | 5 GB/mese (+5 GB cached)                | Rilevante solo con decine di utenti che sincronizzano spesso; monitorare con l’apertura                  |
| Storage file                    | 1 GB                                    | Non usato                                                                                                |
| Progetti attivi                 | 2; pausa dopo 1 settimana di inattività | Produzione usata regolarmente; nessun rischio                                                            |
| Backup automatici / PITR        | Non inclusi                             | Resta il runbook: backup manuale prima delle migrazioni                                                  |
| Log retention                   | 1 giorno (auth audit 1 ora)             | Troubleshooting più corto, non bloccante                                                                 |
| Auth Hook `before-user-created` | Disponibile sul Free                    | Già verificato il 29/10/2026                                                                             |
| Realtime / Edge Functions       | non usati                               | —                                                                                                        |

**Conclusione:** i tetti sono regole di prodotto. Con 1000 utenti MAU e sync periodico l’egress resta sotto i 5 GB/mese, ma è la metrica da tenere d’occhio dopo l’apertura.

---

## 4. Migrazione SQL

File: `supabase/migrations/20261102120000_signup_cap_and_workspace_limits.sql` (una sola migrazione; applicare in produzione solo dopo backup verificato, come da runbook).

### 4.1 Tetto utenti

```sql
create or replace function public.max_users()
returns integer
language sql
immutable
as $$
  select 1000;
$$;

create or replace function public.handle_before_user_created(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('users:signup')
  );

  select count(*) into v_count from auth.users;

  if v_count >= public.max_users() then
    raise exception 'signup_limit_reached' using errcode = 'P0001';
  end if;

  return payload;
end;
$$;

revoke all on function public.max_users() from public;
revoke all on function public.handle_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.max_users() to authenticated;
grant execute on function public.handle_before_user_created(jsonb) to supabase_auth_admin;
```

### 4.2 `workspace_limits`

```sql
create table public.workspace_limits (
  workspace_id text primary key references public.workspaces (id) on delete cascade,
  max_members integer not null default 20 check (max_members > 0),
  max_quotes integer not null default 500 check (max_quotes > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.workspace_limits enable row level security;

create policy "members read limits"
  on public.workspace_limits for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_limits.workspace_id
      and m.user_id = auth.uid()
  ));

insert into public.workspace_limits (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;
```

Nessuna policy di scrittura: il client **non può** modificare i limiti; si cambiano via SQL come `postgres`.

### 4.3 Trigger membri

```sql
create or replace function public.enforce_workspace_member_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('members:' || new.workspace_id)
  );

  select coalesce(max(l.max_members), 20) into v_max
  from public.workspace_limits l
  where l.workspace_id = new.workspace_id;

  select count(*) into v_count
  from public.workspace_members m
  where m.workspace_id = new.workspace_id;

  if v_count >= v_max then
    raise exception 'member_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger workspace_members_cap
  before insert on public.workspace_members
  for each row execute function public.enforce_workspace_member_cap();
```

Le RPC esistenti `add_member` e `redeem_invite` mantengono il pre-check anticipato ma leggono il limite da `workspace_limits` (fallback 20) invece della funzione fissa `max_workspace_members()`. Il trigger resta la fonte di verità.

### 4.4 Trigger preventivi

```sql
create or replace function public.enforce_workspace_quote_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
begin
  if tg_op = 'UPDATE'
     and (old.deleted_at is null or new.deleted_at is not null) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('quotes:' || new.workspace_id)
  );

  select coalesce(max(l.max_quotes), 500) into v_max
  from public.workspace_limits l
  where l.workspace_id = new.workspace_id;

  select count(*) into v_count
  from public.quotes q
  where q.workspace_id = new.workspace_id
    and q.deleted_at is null;

  if v_count >= v_max then
    raise exception 'quote_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger quotes_cap
  before insert or update on public.quotes
  for each row execute function public.enforce_workspace_quote_cap();
```

### 4.5 RPC `workspace_usage`

```sql
create or replace function public.workspace_usage(p_workspace_id text)
returns table (members integer, max_members integer, quotes integer, max_quotes integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  return query
    select
      (select count(*) from public.workspace_members m
        where m.workspace_id = p_workspace_id),
      (select coalesce(max(l.max_members), 20) from public.workspace_limits l
        where l.workspace_id = p_workspace_id),
      (select count(*) from public.quotes q
        where q.workspace_id = p_workspace_id and q.deleted_at is null),
      (select coalesce(max(l.max_quotes), 500) from public.workspace_limits l
        where l.workspace_id = p_workspace_id);
end;
$$;

grant execute on function public.workspace_usage(text) to authenticated;
```

---

## 5. Signup nella UI

- `LoginPage`: due modalità **Accedi / Registrati** (toggle o schede), con form Registrati = email + password (min 6, validazione IT/EN, `aria-describedby` per gli errori), submit su `auth.signUp`.
- Con auto-confirm la sessione parte subito: la catena esistente (HydrationGate, dialogo primo login, spazio personale automatico) non cambia.
- Il pulsante Google resta: per un utente nuovo crea l’account (sotto tetto) come oggi per gli esistenti.
- Errori mappati per codice: `signup_limit_reached` → “Posti esauriti”; errori auth esistenti restano.
- Chiavi i18n nuove nell’area `auth` (`auth.signup.*`, ~14 IT/EN).
- **Budget:** `LoginPage` è nel bundle iniziale; il margine è **1,3 KB** (234,7/236 KB). Il ritiro della feature access (chunk lazy −2,4 KB e −36 chiavi × 2 lingue nei dizionari) compensa in parte: **misurare dopo il build** e, se il limite è superato, alzarlo a **240 KB** con motivazione in ADR-0027 (precedente ADR-0026/0029/0031/0032) e commento in `scripts/check-budget.mjs`.

---

## 6. Ritiro “Richiedi accesso”

- Eliminare `src/features/access/` (pagina, `request-access.ts`, test) e la route lazy in `src/App.tsx`.
- Rimuovere i link da `LoginPage` e `SyncSettings`.
- Rimuovere le chiavi i18n `access.*` (**36 × 2 lingue**: la parità globale scende a **1326**) e l’area `access` dal test i18n.
- Rimuovere `tests/e2e/access.spec.ts` e `tests/e2e/access-missing.spec.ts`; rimuovere `/#/request-access` dalle scansioni axe in `a11y.spec.ts` e dal controllo richieste esterne in `release.spec.ts`.
- `scripts/test-e2e.mjs`: rimuovere `ACCESS_TEST_ENDPOINT` e il secondo significato collegato all’accesso (mantenere feedback).
- `VITE_ACCESS_REQUEST_ENDPOINT`: rimuovere da `.env.local` e Vercel (azione manuale, dopo il deploy).
- Docs: ADR-0026 → superseded da ADR-0027; `docs/engineering/access-requests.md` marcato storico; aggiornare README, STATUS, PLAN, TASKS, `testing.md` (conteggi) e `i18n-inventory.md`.
- Il form **Suggerimenti** (`VITE_FEEDBACK_ENDPOINT`, ADR-0030) **resta**.

---

## 7. UI quota e messaggi

- **Impostazioni → Spazio**: due righe “Membri: x/20” e “Preventivi: x/500” via RPC `workspace_usage`, caricate con i dati workspace e aggiornate dopo ogni scrittura.
- Salvataggio preventivo: l’errore `quote_limit_reached` produce un messaggio chiaro (“Hai raggiunto il limite di 500 preventivi. Esporta o elimina i vecchi preventivi; l’archiviazione non libera il posto.”) **senza perdere la bozza**.
- Inviti/membri: `member_limit_reached` → messaggio equivalente; l’errore esistente `workspace_limit` (spazi posseduti) resta.
- Errori DB già mappati per codice in `data/cloud/`: estendere il mapping esistente ai tre nuovi codici.

---

## 8. Config manuale su Supabase (dopo il deploy)

1. Backup di produzione verificato (runbook) → applicare la migrazione (`supabase db push` / `db reset` locale prima).
2. Dashboard → **Authentication → Sign In / Up**: abilitare **Email signup**, impostare **Confirm email = OFF** (auto-confirm).
3. Dashboard → **Authentication → Hooks → Before user created**: selezionare `public.handle_before_user_created`.
4. Google provider: invariato.
5. Vercel: rimuovere `VITE_ACCESS_REQUEST_ENDPOINT` (Production, Preview, Development).
6. Verifica: creare un account di prova, verificare spazio personale, quota in Impostazioni → Spazio e (opzionale) test del tetto con `max_users()` temporaneamente basso via SQL.

---

## 9. Ordine dei task

1. Migrazione SQL + pgTAP (`db:start`, `db:reset`, `db:test`).
2. Aggiornamento RPC (`add_member`, `redeem_invite`) + `workspace_usage`.
3. Data layer cloud: chiamata usage, mapping dei tre nuovi codici errore.
4. Signup UI + chiavi i18n.
5. UI quota in Impostazioni → Spazio.
6. Ritiro feature access (codice, i18n, test, env, docs).
7. Docs: runbook, ADR-0027 (stato → implementato), STATUS, PLAN, TASKS, CHANGELOG, `testing.md`, `i18n-inventory.md`, `sources.md` §6.2 (limiti Free ri-verificati).
8. `npm run check` + `npm run db:test` + `npm run test:e2e` + `npm run test:e2e:auth`.
9. PR, preview, deploy, migrazione produzione (dopo backup), config dashboard manuale.

---

## 10. Test e acceptance

- **pgTAP** (nuovo file, ~15 asserzioni): insert sotto il limite; insert al limite rifiutato (`member_limit_reached`, `quote_limit_reached`); soft-delete che libera un posto; ripristino tombstone bloccato a tetto pieno; `workspace_limits` non scrivibile dal client; update del limite via owner SQL visibile ai membri; hook `handle_before_user_created` rispetta `max_users()` (test diretto della funzione); workspace diverso non influenzato.
- **Unit**: mapping `signup_limit_reached` / `member_limit_reached` / `quote_limit_reached`; validazione form signup; uso workspace (parsing RPC).
- **E2E**: signup felice locale (`test:e2e:auth`), quota visibile in Spazio, errore tetto preventivi con limite abbassato via SQL locale, nessuna perdita di bozza; login esistente invariato; nessun residuo “Richiedi accesso”.
- **Gate:** `npm run check` verde, `db:test` verde, suite E2E complete, budget entro limite (o aumento motivato), **nessuna modifica** a formule, `engineVersion`, schema locale v4, snapshot o seed.

---

## 11. Rischi

| Rischio                               | Mitigazione                                                |
| ------------------------------------- | ---------------------------------------------------------- |
| Race condition sui conteggi           | Advisory lock per workspace + lock globale signup          |
| Tombstone ripristinato oltre il tetto | Trigger anche su UPDATE con cambio `deleted_at`            |
| Client aggiornato ma DB no            | Migrazione unica + pgTAP; il trigger decide                |
| UI mostra conteggi vecchi             | Refresh usage dopo ogni scrittura; il trigger è la verità  |
| Budget iniziale superato              | Misurare dopo il build; aumento motivato a 240 KB se serve |
| Egress con apertura larga             | Tetto 1000 + monitoraggio usage page Supabase              |
| Hook non configurato in produzione    | Checklist §8 e verifica con account di prova               |

---

## 12. Rollback

- Ripristinare il signup chiuso nel dashboard: il tetto resta ma nessuno entra; nessun dato cambia.
- Disattivare l’hook (Dashboard → Hooks) o `drop function public.handle_before_user_created(jsonb)`; i trigger sui tetti possono restare o essere droppati: nessun impatto sui dati.
- La tabella `workspace_limits` può restare anche senza trigger.
- La pagina “Richiedi accesso” non va ripristinata: il ritiro è definitivo (ADR-0026 superseded).

---

## 13. Riferimenti

- `docs/adr/0027-signup-cap-and-workspace-limits.md`
- `docs/adr/0026-request-access-formspree.md` (superseded), `docs/adr/0028-multi-workspace.md`, `docs/adr/0030-docs-and-feedback.md`
- `docs/planning/evolutive.md` §4 (proposta storica)
- `supabase/migrations/20261030120000_multi_workspace.sql` (RPC e lock esistenti)
- `docs/engineering/workspace-runbook.md` (backup, migrazioni, utenti)
- `docs/domain/sources.md` §6.2 (limiti Supabase)
