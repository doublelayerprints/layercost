# Workspace condiviso — runbook operativo

**Stato:** T5.4.5 chiuso il 28/10/2026
**Ambito:** creazione e manutenzione del workspace Supabase condiviso, utenti, membership, audit e isolamento
**Decisione:** ADR-0024
**Piano:** `docs/planning/t5.4-cloud-sync.md` §11

Questo runbook è la procedura amministrativa per il cloud opzionale di LayerCost. Non contiene password, chiavi o UUID reali: i valori tra `<...>` vanno sostituiti al momento dell'esecuzione e non vanno committati.

**Stato produzione (28/10/2026):** progetto `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account `owner` nello workspace `ws-doublelayer`, signup pubblico disabilitato, deploy https://layercost.vercel.app con cloud attivo, keep-alive e backup verificati. Le email dei membri non sono nel repository.

---

## 1. Quando usarlo

- Primo setup del progetto Supabase di produzione.
- Creazione dei due account e del workspace condiviso.
- Aggiunta, rimozione o cambio ruolo di un membro.
- Reset password amministrativo.
- Verifica dell'isolamento tra workspace.
- Offboarding di una persona.
- Diagnosi di errori `noWorkspace`, `last_owner`, `42501` o `quote_locked`.

Il setup del progetto cloud, delle env Vercel e del deploy è pianificato in **T5.4.6**. Questo documento copre le operazioni sul database e sull'autenticazione.

---

## 2. Prerequisiti

- Progetto **Supabase Free** in regione **EU** (Frankfurt), senza carta e senza upgrade automatico.
- Accesso amministrativo al dashboard Supabase e allo SQL editor.
- CLI Supabase installata (`npx supabase`) per il database locale e le migrazioni.
- Due persone con un indirizzo email ciascuna e un password manager condiviso.
- Migrazioni applicate: `20261028120000_init`, `20261028130000_service_role_grants`, `20261028140000_admin_last_owner`.
- Nessuna service role key nel repository, nel bundle o nelle env Vercel.

---

## 3. Setup iniziale del progetto cloud

1. Creare il progetto `layercost-prod` su Supabase, regione **EU (Frankfurt)**, piano **Free**.
2. In **Authentication → Providers → Email**:
   - provider email **abilitato**;
   - **Allow new users to sign up** disattivato;
   - conferma email disattivata: gli utenti vengono creati già confermati dall'amministratore.
3. In **Authentication → URL Configuration**:
   - Site URL: `https://layercost.vercel.app`;
   - redirect URL: `https://layercost.vercel.app/**` e, per lo sviluppo, `http://localhost:5173/**`.
4. Creare i due utenti da **Authentication → Users → Add user**, con auto-confirm e password robusta generata dal password manager.
5. Copiare gli UUID degli utenti dalla pagina dell'utente o con `select id, email from auth.users;` nello SQL editor. Non vanno committati.
6. Eseguire il bootstrap SQL del §4 nello **SQL editor**.
7. Applicare le migrazioni con la CLI (`npx supabase link --project-ref <ref>` e poi `npx supabase db push`) o con lo SQL editor, se il progetto è stato creato manualmente.
8. Impostare su Vercel `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` per Production e Preview. La service role key non entra in Vercel.
9. Eseguire lo smoke test del §8.

> **Trappola locale:** in `supabase/config.toml`, `[auth].enable_signup = false` blocca solo la registrazione pubblica. `[auth.email].enable_signup` deve restare `true`, altrimenti il login email risponde `email_provider_disabled`. Nel progetto cloud il provider email va abilitato dal dashboard.

---

## 4. Bootstrap SQL

Eseguire una volta nello SQL editor, sostituendo gli UUID. Il workspace ha un ID `text` stabile; le membership legano gli utenti di `auth.users` al workspace.

```sql
insert into public.workspaces (id, name)
values ('ws-doublelayer', 'DoubleLayeR Prints')
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('ws-doublelayer', '<uuid-utente-1>', 'owner'),
  ('ws-doublelayer', '<uuid-utente-2>', 'owner')
on conflict (workspace_id, user_id) do update set role = 'owner';
```

Regole:

- Entrambi gli utenti sono `owner`: possono leggere e modificare tutto l'archivio del workspace e gestire le membership.
- La creazione di workspace e membership è **solo amministrativa**. Non esiste una UI di inviti o di registrazione.
- Il workspace è uno solo. Gli ID delle entità sono primary key globali: due workspace nello stesso database con gli stessi ID seed colliderebbero (vedi `docs/domain/data-model.md` §7).
- Non inserire password, token o service role key nel repository, in un issue o in un messaggio.

---

## 5. Verifica dell'accesso condiviso

Dopo il bootstrap, entrambi gli utenti devono vedere lo stesso workspace e gli stessi dati. La verifica automatica è in `supabase/tests/rls.test.sql` (33 asserzioni): due owner dello stesso workspace, un utente di un altro workspace e un utente senza membership.

Query di ispezione da SQL editor (usa il ruolo amministrativo e **bypassa la RLS**: serve solo a controllare i dati, non a testare la sicurezza):

```sql
select w.id, w.name, count(m.user_id) as members
from public.workspaces w
left join public.workspace_members m on m.workspace_id = w.id
group by w.id, w.name
order by w.id;

select u.email, m.role, m.created_at
from public.workspace_members m
join auth.users u on u.id = m.user_id
where m.workspace_id = 'ws-doublelayer'
order by u.email;

select id, name, status, created_by, updated_by, updated_at
from public.quotes
where workspace_id = 'ws-doublelayer' and deleted_at is null
order by quote_date desc
limit 20;
```

Per verificare la RLS con un utente simulato, usare una transazione e **sempre** `rollback`:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-utente-1>","role":"authenticated"}';
select id from public.quotes order by quote_date desc;
rollback;
```

Ripetere con l'UUID dell'altro owner, con un utente di un altro workspace e con un utente senza membership. I risultati attesi sono nel §9.

---

## 6. Operazioni ricorrenti

### 6.1 Aggiungere un membro

```sql
insert into public.workspace_members (workspace_id, user_id, role)
values ('ws-doublelayer', '<uuid-nuovo-utente>', 'editor')
on conflict (workspace_id, user_id) do update set role = 'editor';
```

Il ruolo può essere `owner` o `editor`. Nella prima iterazione entrambi i membri sono `owner`; usare `editor` solo se in futuro si vuole limitare la gestione delle membership. Il nuovo utente deve esistere in `auth.users` ed essere già confermato.

### 6.2 Rimuovere un membro

```sql
delete from public.workspace_members
where workspace_id = 'ws-doublelayer'
  and user_id = '<uuid-utente>';
```

- L'ultimo `owner` non può essere rimosso: il trigger `protect_last_owner` restituisce `last_owner`.
- Prima di rimuovere l'ultimo owner, aggiungere un altro owner oppure usare la procedura amministrativa del §6.6.
- La rimozione della membership non cancella i dati creati dall'utente: `created_by` e `updated_by` restano finché l'utente esiste.

### 6.3 Cambiare ruolo

```sql
update public.workspace_members
set role = 'editor'
where workspace_id = 'ws-doublelayer'
  and user_id = '<uuid-utente>';
```

Non lasciare il workspace senza owner. Se l'update riguarda l'ultimo owner, il trigger blocca l'operazione.

### 6.4 Reset password amministrativo

Nella prima iterazione non c'è SMTP e non c'è un link “Password dimenticata”. Il reset è amministrativo:

1. Generare una password temporanea robusta nel password manager.
2. Aggiornarla con la Admin API di Supabase, da una macchina amministrativa e con la service role key in una variabile d'ambiente non salvata nel repository:

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<uuid-utente>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password":"<password-temporanea>"}'
```

3. Comunicare la password temporanea per un canale sicuro. Nella prima iterazione non c'è una UI di cambio password: se serve, l'amministratore la reimposta con lo stesso metodo.
4. Non usare lo SQL editor per modificare `auth.users.encrypted_password`.

Se in futuro servirà il reset self-service, si aggiungerà un SMTP gratuito (Brevo/Resend) senza cambiare schema o RLS.

### 6.5 Rinominare il workspace

```sql
update public.workspaces
set name = 'DoubleLayeR Prints'
where id = 'ws-doublelayer';
```

Il nome è visibile solo agli amministratori e all'app; non entra nei preventivi o negli snapshot.

### 6.6 Offboarding e cancellazione

1. Rimuovere la membership con il §6.2.
2. Esportare un backup JSON dall'app o con `pg_dump` (T5.4.6).
3. Se serve eliminare l'account, usare **Authentication → Users → Delete user**. I riferimenti `created_by`/`updated_by` diventano `null` per effetto di `on delete set null`; i preventivi restano.
4. Non cancellare il workspace di produzione: archiviare o esportare i dati. La cancellazione fisica è riservata ai workspace di test.

Per un workspace di test, dal SQL editor (richiesta senza subject JWT) è possibile:

```sql
delete from public.workspaces where id = '<workspace-di-test>';
```

Il trigger `protect_last_owner` consente alle richieste senza subject JWT di rimuovere l'ultimo owner, così il cascade delle foreign key completa la pulizia. Non disabilitare `session_replication_role` e non eliminare le righe figlie una per una.

---

## 7. Audit

Il database registra automaticamente:

- `created_by`: utente che ha inserito la riga (`default auth.uid()`);
- `updated_by`: ultimo utente che ha modificato la riga (trigger `set_audit_fields`);
- `created_at`/`updated_at`: timestamp del server.

I preventivi espongono `createdBy`/`updatedBy` come metadati opzionali nel dettaglio, solo in modalità cloud. L'interfaccia mostra “te” oppure “un altro membro”: con due owner, “un altro membro” identifica l'altra persona senza esporre l'email nel documento. I metadati non entrano nello snapshot economico, non cambiano `engineVersion` e vengono rimossi dai link condivisi.

Query di audit:

```sql
select q.id,
       q.name,
       q.status,
       creator.email as created_by_email,
       editor.email  as updated_by_email,
       q.created_at,
       q.updated_at
from public.quotes q
left join auth.users creator on creator.id = q.created_by
left join auth.users editor  on editor.id  = q.updated_by
where q.workspace_id = 'ws-doublelayer'
  and q.deleted_at is null
order by q.updated_at desc;
```

Se `created_by` o `updated_by` sono `null`, la riga è stata creata o modificata da uno script amministrativo senza JWT (import, test o manutenzione).

---

## 8. Smoke test dopo il setup

Con due browser o due profili distinti:

1. Accedere con il primo account a `/#/login`.
2. Aprire **Impostazioni → Sincronizzazione** e verificare lo stato “Sincronizzato”.
3. Creare e salvare un preventivo.
4. Accedere con il secondo account e verificare che il preventivo sia visibile.
5. Modificarlo dal secondo account e verificare che il primo lo riceva dopo “Sincronizza ora” o al focus.
6. Aprire il dettaglio: la sezione **Workspace condiviso** mostra “Creato da” e “Ultima modifica” con “te” o “un altro membro”.
7. Creare un terzo utente senza membership e verificare il messaggio “Questo account non è associato a un workspace”.
8. Creare un workspace separato per un quarto utente, con dati e ID propri (non il seed), e verificare che non veda il preventivo del workspace condiviso.

Automatico: `npm run smoke:production` con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PROD_URL` crea un utente/workspace temporanei, verifica login, sync e salvataggio di un preventivo, poi pulisce. Dettagli in `docs/engineering/deployment.md` §13.

---

## 9. Risultati attesi della RLS

| Soggetto | Workspace visibili | Preventivi visibili | Scrittura |
| --- | --- | --- | --- |
| Owner A del workspace condiviso | `ws-doublelayer` | Tutti quelli del workspace | Consentita |
| Owner B dello stesso workspace | `ws-doublelayer` | Gli stessi di A | Consentita |
| Owner C di un altro workspace | Solo il proprio | Solo i propri | Consentita solo nel proprio |
| Utente senza membership | Nessuno | Nessuno | Negata (`42501`) |
| `anon` | Nessuno | Nessuno | Negata, salvo `keepalive()` |

La verifica automatica è `npm run db:test`: 33 asserzioni pgTAP, incluse le quote condivise, l'audit, l'isolamento per workspace, l'utente senza membership, l'ultimo owner e il keep-alive.

---

## 10. Ambiente locale

```bash
npm run db:start
npx supabase status -o env
npm run db:reset
npm run db:test
```

1. Aprire lo Studio locale su `http://127.0.0.1:54323`.
2. Creare due utenti di test da **Authentication → Users → Add user** con auto-confirm.
3. Leggere gli UUID con `select id, email from auth.users;`.
4. Eseguire il bootstrap SQL del §4 con un ID workspace di test.
5. Mettere `API_URL` e `PUBLISHABLE_KEY` in `.env.local` e avviare `npm run dev`.
6. Aprire `/#/login`.

Comandi di verifica:

```bash
npm run db:test          # 33 asserzioni pgTAP/RLS
npm run test:e2e:auth    # login, reload, impostazioni, logout
npm run test:e2e:sync    # due contesti, offline, conflitto, isolamento
```

`npm run test:e2e:sync` **azzera il database Supabase locale** e richiede `psql` nel PATH. Non va eseguito contro un progetto remoto.

---

## 11. Troubleshooting

| Sintomo | Causa probabile | Azione |
| --- | --- | --- |
| `email_provider_disabled` | Provider email disattivato | Nel cloud abilitare Email; in locale `[auth.email].enable_signup = true` |
| `noWorkspace` | Utente senza membership | Inserire la membership con il §4 o §6.1 |
| `last_owner` | Rimozione dell'ultimo owner | Aggiungere un altro owner o usare la pulizia admin |
| `42501` su insert/update | RLS: workspace diverso o membership assente | Verificare `workspace_id` e `workspace_members` |
| `quote_locked` | Preventivo `sent` o `completed` | Duplicare il preventivo, non modificarlo |
| `quote_metadata_locked` | Tentativo di cambiare `created_at`/`created_by` | Non inviare questi campi nelle update |
| Sync “Errore di connessione” | Rete, progetto in pausa o chiave errata | Verificare connessione, progetto e env |
| Sync “Troppe richieste” | Rate limit Supabase | Attendere e riprovare |
| Il secondo utente non vede i dati | Membership assente o workspace diverso | Eseguire le query del §5 |
| Il progetto è in pausa | Nessuna attività per 7 giorni | Riattivarlo dal dashboard; il keep-alive è in T5.4.6 |

---

## 12. Sicurezza

- Solo la chiave **pubblicabile** sta nel client e su Vercel.
- La **service role** si usa solo da script amministrativi, mai nel browser, nel bundle o nelle env Vercel.
- Non disabilitare la RLS e non creare policy `using (true)`.
- Non usare `session_replication_role = replica` per aggirare i trigger.
- Non committare password, token, UUID reali o dump di produzione.
- Lo SQL editor bypassa la RLS: non usarlo per conclusioni sulla sicurezza.
- I backup JSON e `pg_dump` contengono dati economici: vanno cifrati e conservati fuori dal repository.
- La rotazione della chiave pubblicabile si fa dal dashboard e richiede un nuovo deploy; la service role non va mai condivisa.

---

## 13. Checklist di chiusura

- [ ] Progetto Free in regione EU, senza carta.
- [ ] Signup pubblico disattivato; provider email attivo.
- [ ] Due utenti creati con auto-confirm e password nel password manager.
- [ ] Workspace `ws-doublelayer` e due membership `owner`.
- [ ] Entrambi gli utenti vedono e modificano lo stesso preventivo.
- [ ] Un utente senza membership non vede nulla.
- [ ] Un utente di un altro workspace non vede i dati condivisi.
- [ ] `created_by`/`updated_by` popolati; dettaglio con “Workspace condiviso”.
- [ ] `npm run db:test` verde (33 asserzioni).
- [ ] `npm run test:e2e:sync` verde (3 test).
- [ ] Nessun segreto nel repository o nelle env Vercel.
- [ ] Backup e keep-alive pianificati in T5.4.6.

---

## 14. Keep-alive

Il progetto Free va in pausa dopo circa 7 giorni senza attività. Il workflow `.github/workflows/keepalive.yml` chiama ogni giorno alle 06:17 UTC la RPC `public.keepalive()` con la chiave pubblicabile:

```bash
curl --fail-with-body \
  -X POST "$SUPABASE_URL/rest/v1/rpc/keepalive" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Risposta attesa: `"ok"`.

- Secret GitHub: `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`.
- Se la chiamata fallisce, il workflow apre o aggiorna l'issue `[ops] Supabase keep-alive failed`; quando torna verde la chiude.
- Esecuzione manuale: **Actions → Supabase keep-alive → Run workflow**.
- Se il progetto è in pausa, riattivalo dal dashboard: l'app resta local-only nel frattempo.
- La RPC è `security definer`, `search_path = ''` e ha `grant execute` ad `anon`; non richiede service role.

---

## 15. Riferimenti

- `docs/adr/0024-supabase-auth-workspace.md` — auth email/password, workspace e operazioni free.
- `docs/planning/t5.4-cloud-sync.md` — piano completo, schema, RLS, test e rollback.
- `docs/engineering/deployment.md` §1.1 — Supabase locale, env e comandi.
- `docs/engineering/backup-restore.md` — backup settimanale cifrato e restore verificato.
- `.github/workflows/keepalive.yml` e `.github/workflows/backup.yml` — operazioni automatiche.
- `docs/domain/data-model.md` §7 — schema cloud, audit e limite degli ID globali.
- `supabase/migrations/20261028120000_init.sql` — tabelle, RLS, trigger e `keepalive`.
- `supabase/tests/rls.test.sql` — 33 asserzioni di isolamento e audit.
