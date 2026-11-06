# Workspace condiviso — runbook operativo

**Stato:** T5.4.5 chiuso il 28/10/2026; spazi separati (EVO-4/ADR-0028) dal 30/10/2026; **EVO-2 (ADR-0027) dal 03/11/2026**: signup aperto a tetto numerico con Auth Hook, tetti per workspace configurabili; **EVO-8 (ADR-0034) console admin dal 04/11/2026**: `profiles.is_admin`, RPC admin e modifica tetti via `/#/admin` (§17)
**Ambito:** creazione e manutenzione degli spazi Supabase, utenti, membership, inviti, audit, isolamento, tetti e signup
**Decisione:** ADR-0024, ADR-0027, ADR-0028
**Piano:** `docs/planning/t5.4-cloud-sync.md` §11, `docs/planning/evo-4-multi-workspace.md`, `docs/planning/evo-2-user-quote-caps.md`

Questo runbook è la procedura amministrativa per il cloud opzionale di LayerCost. Non contiene password, chiavi o UUID reali: i valori tra `<...>` vanno sostituiti al momento dell'esecuzione e non vanno committati.

**Stato produzione (2/11/2026):** progetto `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account `owner` nello spazio condiviso `ws-doublelayer`, signup pubblico disabilitato, deploy https://layercost.vercel.app con cloud attivo, keep-alive e backup verificati. **EVO-2 (ADR-0027) attivo in produzione dal 03/11/2026** (PR #62, squash `e50c719`, build `index-izqyKv9M.js` / `index-DMAw7o4c.css`, verifica pubblica a 375/768/1440 verde): migrazione `20261102120000_signup_cap_and_workspace_limits` applicata, hook `before-user-created` collegato, Email signup ON con auto-confirm e `VITE_ACCESS_REQUEST_ENDPOINT` rimossa da Vercel; dettagli e esiti in §16.3. **EVO-4 distribuito il 30/10/2026** (build `index-eT8g6H47.js`): ogni utente ha anche uno spazio personale automatico e può appartenere a più spazi condivisi. **EVO-7 distribuito il 31/10/2026** (build `index-C3vr3Bvd.js` / `index-bKgv1cL8.css`): tabella `profiles`, nome visibile in **Impostazioni → Profilo**, tag creatore/ultima modifica nella lista Preventivi e nomi nel dettaglio; entrambi gli account hanno il nome backfillato da Google. **Rifiniture post-EVO-7 (1–2/11/2026):** select applicativa (ADR-0032), tag audit in colonna e nomi lunghi nelle card; build di produzione `index-CQ3fLr-I.js` / `index-Cmj_upjM.css`. Le email dei membri non sono nel repository. Dal 29/10/2026 è attivo anche il provider Google (EVO-1, ADR-0025), controllato dal flag pubblico `VITE_AUTH_GOOGLE_ENABLED`; email/password resta il fallback.

---

## 1. Quando usarlo

- Primo setup del progetto Supabase di produzione.
- Creazione dei due account e del workspace condiviso.
- Aggiunta, rimozione o cambio ruolo di un membro.
- Reset password amministrativo.
- Configurazione o troubleshooting del login Google (EVO-1).
- Verifica dell'isolamento tra workspace.
- Offboarding di una persona.
- Configurazione o verifica del signup aperto e del tetto utenti (EVO-2).
- Modifica dei tetti per workspace (`max_members`, `max_quotes`) dalla console admin `/#/admin` (EVO-8) o via SQL (EVO-2).
- Verifica o revoca del flag admin (`profiles.is_admin`, EVO-8).
- Diagnosi di errori `noWorkspace`, `last_owner`, `42501`, `quote_locked`, `signup_limit_reached`, `member_limit_reached`, `quote_limit_reached` o `not_admin`.

Il setup del progetto cloud, delle env Vercel e del deploy è pianificato in **T5.4.6**. Questo documento copre le operazioni sul database e sull'autenticazione.

---

## 2. Prerequisiti

- Progetto **Supabase Free** in regione **EU** (Frankfurt), senza carta e senza upgrade automatico.
- Accesso amministrativo al dashboard Supabase e allo SQL editor.
- CLI Supabase installata (`npx supabase`) per il database locale e le migrazioni.
- Due persone con un indirizzo email ciascuna e un password manager condiviso.
- Migrazioni applicate: `20261028120000_init`, `20261028130000_service_role_grants`, `20261028140000_admin_last_owner`, `20261030120000_multi_workspace`, `20261031120000_profiles`, `20261102120000_signup_cap_and_workspace_limits`.
- Nessuna service role key nel repository, nel bundle o nelle env Vercel.

---

## 3. Setup iniziale del progetto cloud

1. Creare il progetto `layercost-prod` su Supabase, regione **EU (Frankfurt)**, piano **Free**.
2. In **Authentication → Sign In / Up**:
   - provider email **abilitato**;
   - **Allow new users to sign up** attivato (EVO-2: il signup è aperto a tetto numerico);
   - conferma email disattivata (auto-confirm): il signup crea la sessione subito, senza SMTP;
   - i due account storici restano pre-creati con auto-confirm e password robusta generata dal password manager.
3. In **Authentication → Hooks → Before user created** selezionare `public.handle_before_user_created` (EVO-2, tetto utenti; vedi §17).
4. In **Authentication → URL Configuration**:
   - Site URL: `https://layercost.vercel.app`;
   - redirect URL: `https://layercost.vercel.app/**` e, per lo sviluppo, `http://localhost:5173/**`.
4. Creare i due utenti da **Authentication → Users → Add user**, con auto-confirm e password robusta generata dal password manager.
5. Copiare gli UUID degli utenti dalla pagina dell'utente o con `select id, email from auth.users;` nello SQL editor. Non vanno committati.
6. Eseguire il bootstrap SQL del §4 nello **SQL editor**.
7. Applicare le migrazioni con la CLI (`npx supabase link --project-ref <ref>` e poi `npx supabase db push`) o con lo SQL editor, se il progetto è stato creato manualmente.
8. Impostare su Vercel `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` per Production e Preview. La service role key non entra in Vercel.
9. Eseguire lo smoke test del §8.

> **Trappola locale:** in `supabase/config.toml`, `[auth].enable_signup` è `true` da EVO-2 (il tetto è applicato dall'hook `before_user_created`, non disabilitando il signup). `[auth.email].enable_signup` deve restare `true`, altrimenti il login email risponde `email_provider_disabled`. Nel progetto cloud il provider email e il signup si abilitano dal dashboard (§16.3).

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
- La creazione di workspace condivisi e membership è **solo amministrativa o via codice invito**. Non esiste una registrazione pubblica.
- Il workspace condiviso ha `kind = 'shared'`; ogni utente riceve inoltre uno spazio personale `kind = 'personal'` al primo accesso autenticato.
- Gli ID delle entità sono **PK `(workspace_id, id)`**: ogni spazio può riusare gli stessi ID di seed senza collisioni.
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

Procedura normale, dalla UI:

1. L'admin crea l'utente in `auth.users` (vedi §4.4 di `docs/engineering/access-requests.md`).
2. Un `owner` apre **Impostazioni → Spazio → Inviti**, sceglie ruolo e durata, genera il codice.
3. Consegna il codice a voce o con un canale sicuro: è monouso e scade.
4. La persona accede con l'account creato e inserisce il codice dal **menu dello spazio nella topbar → Hai un codice invito?**.
5. La RPC `redeem_invite` crea la membership. Se l'utente era già membro, il riscatto è idempotente e non consuma il codice.

Fallback SQL, se la UI non è disponibile:

```sql
insert into public.workspace_members (workspace_id, user_id, role)
values ('ws-doublelayer', '<uuid-nuovo-utente>', 'editor')
on conflict (workspace_id, user_id) do update set role = 'editor';
```

Il ruolo può essere `owner` o `editor`. Il nuovo utente deve esistere in `auth.users` ed essere già confermato. Il tetto membri è configurabile in `workspace_limits` (default 20, vedi §17); il codice invito si revoca dalla stessa pagina o con `select public.revoke_invite('<id-invito>');`.

Con EVO-2 la pagina pubblica `/#/request-access` è stata **ritirata** (ADR-0026 superseded): il signup è aperto a tetto numerico e chi vuole entrare si registra da solo o riceve un invito. Il runbook `docs/engineering/access-requests.md` resta come riferimento storico.### 6.2 Rimuovere un membro

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

### 6.4 Reset password

**Self-service (via normale, EVO-11 / ADR-0037).** L'utente apre `/#/reset-password`
(link «Password dimenticata?» nella login), inserisce l'email e riceve un link valido
un'ora. Il link apre la schermata «Scegli una nuova password»; al salvataggio la sessione
è già attiva. Non serve l'intervento dell'owner.

- L'email parte da un **SMTP custom** (vedi §6.4.1). L'SMTP integrato di Supabase **non è
  utilizzabile**: consegna solo agli indirizzi dell'organizzazione (2 email/ora) e dal
  06/11/2026 è bloccato per bounce rate. Non riattivarlo.
- La conferma a schermo è neutra («se esiste un account…»): non rivela se l'indirizzo è
  registrato.
- Requisito password: **12 caratteri** (UI e backend allineati).
- Chi ha Google può evitare del tutto la password e accedere da lì.

#### 6.4.1 Configurare l'SMTP custom (una-tantum)

> **Vincolo verificato il 06/11/2026.** Un mittente `@gmail.com` non è autenticabile con
> SPF/DKIM propri: Brevo ne riscrive il dominio e Gmail/Yahoo dal 2024 richiedono
> allineamento. Resend accetta solo il proprio indirizzo di test
> (`onboarding@resend.dev`) verso la casella dell'account. Le due vie praticabili sono
> quindi **Gmail SMTP** (mittente reale, nessuna autenticazione da configurare) o un
> **dominio proprio** con Brevo/Resend. Lo stack attuale usa Gmail SMTP.

Indirizzi di riscrittura Brevo, dalla guida ufficiale *Comply with Gmail, Yahoo, and
Microsoft's requirements*: marketing `mittente@<id>.brevosend.com`, transazionale/SMTP
`mittente@<id>.t-sender-sib.com`. Brevo lo descrive come misura temporanea e avverte che
i destinatari possono non riconoscere il mittente e segnare l'email come spam: per un
link di reset password è la combinazione peggiore.

| Opzione | Costo | Mittente visibile | Pronta |
| --- | --- | --- | --- |
| Gmail SMTP | 0 € | `doublelayerprints@gmail.com` (reale) | subito |
| Brevo con mittente Gmail | 0 € | `...@<id>.t-sender-sib.com` (riscritto) | sconsigliata |
| Dominio proprio + Brevo/Resend | ~10–15 €/anno | `no-reply@<dominio>` | dopo il DNS |

Gmail SMTP è preferibile a Brevo quando il mittente è Gmail: l'invio Gmail→Gmail è
autenticato nativamente da Google, senza riscritture, e il destinatario riconosce
l'indirizzo.

**Opzione A — dominio proprio (definitiva, ~10–15 €/anno).** È l'unica che dà un mittente
`no-reply@` con SPF/DKIM/DMARC propri.

1. Registrare un dominio. `doublelayerprints.com` e `layercost.it` sono **liberi**
   (verificato il 06/11/2026); `doublelayerprints.it` è libero su NIC.it.
2. Creare un account Brevo Free (300 email/giorno) o Resend Free (100/giorno).
3. Autenticare il dominio nel provider: record **SPF**, **DKIM** e **DMARC**
   (`v=DMARC1; p=none; rua=mailto:...` per iniziare, poi `p=quarantine`).
4. In Supabase: **Authentication → Emails → SMTP Settings** → *Enable Custom SMTP*.

   | Campo | Valore |
   | --- | --- |
   | Sender email | `no-reply@<dominio>` (deve stare sul dominio autenticato) |
   | Sender name | `LayerCost` |
   | Host | `smtp-relay.brevo.com` (Brevo) o `smtp.resend.com` (Resend) |
   | Port | `587` (STARTTLS) |
   | Username | login SMTP Brevo / `resend` per Resend |
   | Password | chiave SMTP Brevo / API key `re_...` per Resend |

5. Alzare il limite in **Authentication → Rate Limits → Emails per hour** (default 2,
   limitato solo dal servizio integrato) a un valore adeguato, per esempio **30**.
6. Verificare con un invio reale: `/#/reset-password` → indirizzo dell'owner → link
   ricevuto → nuova password → login. Controllare che `recovery_sent_at` sia valorizzato
   e che l'email non finisca in spam.

**Opzione B — Gmail SMTP (attiva dal 06/11/2026).** Il flusso funziona, ma il mittente
resta `@gmail.com` e il limite è di ~500 destinatari/giorno.

Configurazione applicata in produzione (via Management API):

| Campo | Valore |
| --- | --- |
| Sender email | `doublelayerprints@gmail.com` |
| Sender name | `LayerCost` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `doublelayerprints@gmail.com` |
| Password | password per le app Google (16 caratteri), nel password manager |
| Emails per hour | `20` (max 480/giorno, sotto il tetto Gmail di 500) |

Prerequisito: **verifica in due passaggi** attiva sull'account Google e password per le
app generata da `myaccount.google.com/apppasswords` (Google l'ha rimossa dalla pagina
Sicurezza). Se si cambia la password dell'account Google, tutte le password per le app
vengono revocate e l'invio si ferma: va generata una nuova password e reimmessa in
Supabase.

**Nota.** `doublelayerprints@gmail.com` è il mittente, **non** un account dell'app: gli
account utente sono altri indirizzi. Non inviare richieste di reset verso il mittente
stesso, non esiste come utente.

**Rollback:** disattivare *Enable Custom SMTP*. Con l'SMTP integrato bloccato il recupero
torna al fallback amministrativo qui sotto.

**Verifica tecnica senza inviare email** (solo lettura della configurazione):

```bash
curl -s "https://api.supabase.com/v1/projects/<ref>/config/auth" \
  -H "Authorization: Bearer <access-token>" \
  | jq '{smtp_host, smtp_port, smtp_admin_email, rate_limit_email_sent}'
```

`smtp_host` nullo significa che l'SMTP custom non è attivo.

**Fallback amministrativo** (solo se l'email non arriva o l'account non ha accesso alla
casella):

1. Generare una password temporanea robusta nel password manager.
2. Aggiornarla con la Admin API di Supabase, da una macchina amministrativa e con la
   service role key in una variabile d'ambiente non salvata nel repository:

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<uuid-utente>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password":"<password-temporanea>"}'
```

3. Comunicare la password temporanea per un canale sicuro e invitare l'utente a
   impostarne una propria dal link «Password dimenticata?» quando l'SMTP è configurato.
   Finché non lo è, la password temporanea resta quella in uso e va conservata nel
   password manager.
4. Non usare lo SQL editor per modificare `auth.users.encrypted_password`.

**Nota del 06/11/2026.** Il flusso self-service è stato attivato lo stesso giorno con
Gmail SMTP (§6.4.1). Prima di quella configurazione `/auth/v1/recover` rispondeva `200`
neutro senza inviare nulla, quindi l'app mostrava «Controlla la posta» a vuoto: se
l'SMTP custom viene disattivato, il reset torna amministrativo.

**Verifica in locale:** le email finiscono in Mailpit (`http://127.0.0.1:54324`); la
suite `npm run test:e2e:auth` segue il link reale dall'inbox e copre il flusso completo.

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
3. Se serve eliminare l'account, usare **Authentication → Users → Delete user**. I riferimenti `created_by`/`updated_by` diventano `null` per effetto di `on delete set null`; i preventivi degli spazi condivisi restano.
4. Lo spazio personale dell'utente non si cancella con l'account: dopo il backup, eliminarlo dal SQL editor se non serve più. Non cancellare lo spazio condiviso di produzione: archiviare o esportare i dati.
5. La cancellazione fisica di uno spazio è riservata ai workspace di test o allo spazio personale di un account rimosso.

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

I preventivi espongono `createdBy`/`updatedBy` come metadati opzionali nel dettaglio, solo in modalità cloud. Negli spazi condivisi la lista **Preventivi** mostra due tag con creatore e ultima modifica, con data. L'interfaccia usa “te” per l'utente corrente e il **nome visibile** del profilo per gli altri; se la directory non è disponibile usa “un altro membro”. L'email completa resta visibile solo agli owner. I metadati non entrano nello snapshot economico, non cambiano `engineVersion` e vengono rimossi dai link condivisi.

Il nome visibile è in `public.profiles` (uno per utente, 1–40 caratteri). Viene creato alla prima chiamata `get_my_profile` (l'app la esegue al login) e si modifica da **Impostazioni → Profilo** tramite `set_my_profile`. Non ci sono trigger applicativi su `auth.users`: il restore data-only di auth seguito da public non duplica i profili. La directory dei membri (`list_workspace_members`) espone `display_name` a tutti i membri, mentre `email` resta `null` per gli editor. La precompilazione usa, nell'ordine, `display_name`, `full_name`, `name`, la parte prima della `@` e infine `Membro`: la parte locale dell'email è quindi visibile ai membri finché l'utente non sceglie un nome diverso.

Query di audit:

```sql
select q.id,
       q.name,
       q.status,
       creator.email as created_by_email,
       coalesce(creator_profile.display_name, creator.email) as created_by_name,
       editor.email  as updated_by_email,
       coalesce(editor_profile.display_name, editor.email) as updated_by_name,
       q.created_at,
       q.updated_at
from public.quotes q
left join auth.users creator on creator.id = q.created_by
left join public.profiles creator_profile on creator_profile.user_id = q.created_by
left join auth.users editor  on editor.id  = q.updated_by
left join public.profiles editor_profile on editor_profile.user_id = q.updated_by
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
6. Aprire **Impostazioni → Profilo**, verificare il nome precompilato e salvarlo.
7. Aprire il dettaglio: la sezione **Workspace condiviso** mostra “Creato da” e “Ultima modifica” con “te” o il nome visibile dell'altro membro.
8. Aprire **Preventivi**: ogni riga mostra i tag “Creato da …” e “Ultima modifica di …” con la data.
9. Creare un terzo utente senza membership e verificare il messaggio “Questo account non è associato a un workspace”.
10. Creare un workspace separato per un quarto utente, con dati e ID propri (non il seed), e verificare che non veda il preventivo del workspace condiviso.

Automatico: `npm run smoke:production` con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PROD_URL` crea un utente/workspace temporanei, verifica login, sync e salvataggio di un preventivo, poi pulisce. Dettagli in `docs/engineering/deployment.md` §13.

---

## 9. Risultati attesi della RLS

| Soggetto                         | Workspace visibili                 | Preventivi visibili        | Scrittura                   |
| -------------------------------- | ---------------------------------- | -------------------------- | --------------------------- |
| Owner A del workspace condiviso  | `ws-doublelayer` + personale       | Tutti quelli del workspace | Consentita                  |
| Owner B dello stesso workspace   | `ws-doublelayer` + personale       | Gli stessi di A            | Consentita                  |
| Utente con solo spazio personale | Solo il proprio personale          | Solo i propri              | Consentita solo nel proprio |
| Owner C di un altro workspace    | Solo i propri                      | Solo i propri              | Consentita solo nel proprio |
| Utente senza membership          | Nessuno (la RPC crea il personale) | Nessuno                    | Negata (`42501`)            |
| `anon`                           | Nessuno                            | Nessuno                    | Negata, salvo `keepalive()` |

La verifica automatica è `npm run db:test`: 33 asserzioni su quote condivise, audit, isolamento e ultimo owner, 41 asserzioni su PK composte, spazio personale, inviti, tetti ed email dei membri, più 17 asserzioni su profili, creazione lazy, backfill, nomi visibili e directory e 23 asserzioni su signup cap, `workspace_limits`, trigger membri/preventivi e `workspace_usage` (EVO-2).

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
npm run db:test          # 148 asserzioni pgTAP/RLS (tetti EVO-2 e admin EVO-8 inclusi)
npm run test:e2e:auth    # login, reload, impostazioni, logout
npm run test:e2e:sync    # spazi, inviti, offline, conflitto, isolamento
```

`npm run test:e2e:sync` **azzera il database Supabase locale** e richiede `psql` nel PATH. Non va eseguito contro un progetto remoto.

---

## 11. Troubleshooting

| Sintomo                           | Causa probabile                                 | Azione                                                                   |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `email_provider_disabled`         | Provider email disattivato                      | Nel cloud abilitare Email; in locale `[auth.email].enable_signup = true` |
| `noWorkspace`                     | RPC `ensure_personal_workspace` non applicata   | Applicare la migrazione `20261030120000_multi_workspace`                 |
| `workspace_limit`                 | 10 spazi condivisi posseduti                    | Archiviare o eliminare uno spazio condiviso                              |
| `member_limit` / `member_limit_reached` | Tetto membri dello spazio raggiunto (default 20) | Rimuovere un membro o alzare `max_members` via SQL (§16.2)               |
| `signup_limit_reached`            | Tetto utenti globale raggiunto (1000)           | Alzare `max_users()` via SQL o ri-chiudere il signup (§16.5)              |
| `not_admin`                       | RPC admin chiamata senza il flag `profiles.is_admin` | Verificare il flag con §17.2; la console resta nascosta per i non-admin |
| `quote_limit_reached`             | Tetto preventivi dello spazio raggiunto (500)   | Esportare o eliminare preventivi; l'archiviazione non libera il posto; alzare `max_quotes` via SQL (§16.2) |
| `invite_invalid` / `invite_expired` | Codice errato, scaduto o mai esistito         | Generare un nuovo codice dalla pagina Spazio                             |
| `invite_revoked` / `invite_exhausted` | Codice revocato o già usato                  | Generare un nuovo codice                                                 |
| `last_owner`                      | Rimozione o uscita dell'ultimo owner            | Aggiungere un altro owner o usare la pulizia admin                       |
| `42501` su insert/update          | RLS: workspace diverso o membership assente     | Verificare `workspace_id` e `workspace_members`                          |
| `quote_locked`                    | Preventivo `sent` o `completed`                 | Duplicare il preventivo, non modificarlo                                 |
| `quote_metadata_locked`           | Tentativo di cambiare `created_at`/`created_by` | Non inviare questi campi nelle update                                    |
| Sync “Errore di connessione”      | Rete, progetto in pausa o chiave errata         | Verificare connessione, progetto e env                                   |
| Sync “Troppe richieste”           | Rate limit Supabase                             | Attendere e riprovare                                                    |
| Il secondo utente non vede i dati | Membership assente o workspace diverso          | Eseguire le query del §5                                                 |
| Il progetto è in pausa            | Nessuna attività per 7 giorni                   | Riattivarlo dal dashboard; il keep-alive è in T5.4.6                     |

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
- [ ] Signup aperto a tetto numerico (EVO-2): Email signup attivo, Confirm email OFF, hook `before-user-created` collegato (§16.3).
- [ ] Due utenti creati con auto-confirm e password nel password manager.
- [ ] Workspace `ws-doublelayer` (`kind = 'shared'`) e due membership `owner`.
- [ ] Ogni account ha uno spazio personale automatico, creato al primo accesso.
- [ ] Entrambi gli utenti vedono e modificano lo stesso preventivo.
- [ ] Un utente senza membership riceve il personale e non vede i dati condivisi.
- [ ] Un invito valido aggiunge un membro; uno scaduto o revocato no.
- [ ] Un utente di un altro workspace non vede i dati condivisi.
- [ ] `created_by`/`updated_by` popolati; dettaglio con “Workspace condiviso” e nome visibile.
- [ ] **Impostazioni → Profilo** salva il nome; la lista Preventivi mostra i due tag di audit.
- [ ] `npm run db:test` verde (148 asserzioni, tetti e admin inclusi).
- [ ] `npm run test:e2e:sync` verde (8 test: 6 sync + 2 console admin).
- [ ] Nessun segreto nel repository o nelle env Vercel.
- [ ] Backup e keep-alive pianificati in T5.4.6.
- [ ] Impostazioni → Spazio mostra “Membri” e “Preventivi” con i valori di `workspace_usage` (EVO-2).
- [ ] L'account admin ha `profiles.is_admin = true` e la console `/#/admin` mostra overview, utenti e spazi (EVO-8).

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

## 15. Google OAuth (EVO-1, ADR-0025)

Il login Google è un provider **aggiuntivo**: email/password resta sempre disponibile. Con EVO-2 anche la registrazione email/password è aperta; gli utenti Google nuovi creano l'account al primo accesso, sotto il tetto utenti.

### 15.1 Google Cloud

1. Aprire [Google Cloud Console](https://console.cloud.google.com/) e selezionare o creare un progetto.
2. In **Google Auth Platform → Audience** scegliere **External**. In fase di test aggiungere i due account come **test users**; pubblicare solo quando l'apertura è decisa.
3. In **Data Access (Scopes)** verificare `openid` (da aggiungere manualmente), `.../auth/userinfo.email` e `.../auth/userinfo.profile`. Non aggiungere altri scope.
4. Creare **OAuth Client ID → Web application**.
5. **Authorized JavaScript origins:**
   - `https://layercost.vercel.app`
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
6. **Authorized redirect URIs:**
   - `https://jcxkfhjgstdgrjazlnpq.supabase.co/auth/v1/callback`
   - `http://127.0.0.1:54321/auth/v1/callback`
   - per un eventuale progetto Supabase di staging, la sua callback `/auth/v1/callback`.
7. Salvare **Client ID** e **Client Secret** nel password manager. Il Client ID è pubblico; il **Client Secret** va solo nel dashboard Supabase e, per lo sviluppo locale, in una variabile d'ambiente non committata. Non va mai nel repository, nel bundle, in `.env.example`, nei log o su Vercel.

> La redirect URI autorizzata su Google è la **callback di Supabase**, non l'URL dell'app. L'app riceve il codice dal query string dopo che Supabase ha completato lo scambio con Google.

### 15.2 Supabase

1. **Authentication → Providers → Google**: abilitare il provider e incollare Client ID e Client Secret.
2. Lasciare **Skip nonce check** disattivato nel progetto hosted. Nel `supabase/config.toml` locale è `true` perché è richiesto dal flusso locale.
3. **Authentication → URL Configuration**:
   - Site URL: `https://layercost.vercel.app`;
   - redirect: `https://layercost.vercel.app/**`, `http://localhost:5173/**` e, se serve, `http://127.0.0.1:5173/**`.
4. In **Authentication → Providers** abilitare **Allow manual linking**: serve al fallback “Collega Google” per gli account già esistenti.
5. Da EVO-2 il signup è aperto (§16): **Allow new users to sign up** resta attivo e il tetto è applicato dall'hook `before-user-created`. Il provider email deve restare abilitato.
6. Impostare su Vercel, per Production e Preview, la variabile **pubblica** `VITE_AUTH_GOOGLE_ENABLED=true` solo dopo aver verificato il provider. Senza il flag il pulsante Google non compare e la UI resta invariata.

### 15.3 Sviluppo locale

1. Esportare il secret nella shell, senza salvarlo nel repository:
   ```bash
   export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET='<client-secret>'
   ```
2. In `supabase/config.toml`, sezione `[auth.external.google]`, impostare `enabled = true` e `client_id = '<web-client-id>'` **solo in locale**; non committare questi valori. Il secret resta `env(...)`.
3. `npm run db:start` e `npm run dev`.
4. In `.env.local` aggiungere `VITE_AUTH_GOOGLE_ENABLED=true`.
5. Aprire `http://localhost:5173/#/login` e provare “Continua con Google” con un utente di test già presente in `auth.users`.
6. Prima di committare, riportare `enabled = false` e `client_id = ""` in `supabase/config.toml`.

### 15.4 Verifica

**Stato verifica (29/10/2026):** login Google riuscito per entrambi gli account in locale contro il backend di produzione e in produzione; il database riporta **2 identità Google su 2 account**. Il secondo owner ha completato il collegamento il 29/10/2026 dopo la correzione dell’email.

Con un account esistente:

1. Accedere con email/password e verificare che **Impostazioni → Sincronizzazione** mostri l'email.
2. Se l'auto-link non è ancora avvenuto, usare **Collega Google**. Se il collegamento manuale non è abilitato, l'app mostra un errore dedicato.
3. Uscire e rientrare con **Continua con Google**: la sessione deve essere persistente, il workspace e i preventivi devono essere gli stessi, il logout deve funzionare.
4. Provare un'email Google **non** presente in `auth.users`: deve comparire “Questo account Google non è autorizzato…”, senza creare utenti.
5. Verificare che email/password continui a funzionare.
6. Controllare le identità col SQL editor:
   ```sql
   select u.email, i.provider, i.email as identity_email, i.created_at
   from auth.users u
   join auth.identities i on i.user_id = u.id
   where u.email in ('<email-1>', '<email-2>')
   order by u.email, i.provider;
   ```
7. Eseguire `npm run test:e2e:auth` (test OAuth mockato, senza Google) e lo smoke di produzione. Lo smoke usa email/password e non dipende da Google.

### 15.5 Troubleshooting

| Sintomo                                                       | Causa probabile                                                         | Azione                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `provider_disabled` / “L'accesso con Google non è abilitato”  | Provider Google spento in Supabase                                      | Abilitarlo in **Authentication → Providers → Google**                     |
| `redirect_uri_mismatch` / “Configurazione Google non valida”  | La redirect URI su Google non è la callback Supabase                    | Aggiungere `https://<ref>.supabase.co/auth/v1/callback`                   |
| `signup_disabled` / “Questo account Google non è autorizzato” | Email Google senza utente pre-creato                                    | Creare l'utente dall'amministratore; non abilitare il signup              |
| `manual_linking_disabled`                                     | “Allow manual linking” spento                                           | Abilitarlo e riprovare “Collega Google”                                   |
| `bad_oauth_state`, `bad_code_verifier`, `flow_state_expired`  | Codice scaduto, URL aperto in un altro browser o doppio reload          | Ripetere l'accesso dalla pagina di login                                  |
| `access_denied`                                               | L'utente ha annullato il consenso                                       | Nessuna azione; email/password resta disponibile                          |
| Consenso Google con dominio Supabase                          | Custom domain non configurato                                           | Accettabile per due utenti; valutare il custom domain solo per l'apertura |
| Pulsante Google assente                                       | `VITE_AUTH_GOOGLE_ENABLED` non è `true` o manca la configurazione cloud | Impostare il flag e rifare il deploy                                      |
| Il client Secret è stato esposto                              | Errore di configurazione                                                | Ruotarlo su Google Cloud, aggiornare Supabase, non inserirlo altrove      |

### 15.6 Rollback

1. **Authentication → Providers → Google**: disabilitare il provider. Email/password continua a funzionare.
2. Rimuovere `VITE_AUTH_GOOGLE_ENABLED` da Vercel o impostarlo a `false` e rifare il deploy: il pulsante sparisce.
3. Non serve alcuna migrazione: nessuna tabella, RLS, formula o snapshot cambia. Le identità Google già collegate restano in `auth.identities` e non impediscono l'accesso con password.
4. Se un'identità va rimossa, usare la dashboard/Admin API di Supabase; non modificare `auth.identities` a mano.

---

## 16. Signup aperto, tetto utenti e tetti per workspace (EVO-2, ADR-0027)

Dal 03/11/2026 il signup è **aperto** con un tetto numerico globale e ogni workspace ha tetti configurabili. Il database è la fonte di verità: trigger con advisory lock; la UI mostra solo l'uso.

### 16.1 Come funziona

- **Tetto utenti globale**: `public.max_users()` restituisce `1000`; l'Auth Hook Postgres `before-user-created` (`public.handle_before_user_created`) rifiuta il signup con `signup_limit_reached` quando `auth.users` raggiunge il tetto. Il lock `pg_advisory_xact_lock(hashtext('users:signup'))` evita le race sul conteggio.
- **Tetti per workspace**: tabella `workspace_limits` con `max_members` (default **20**) e `max_quotes` (default **500**). I trigger `workspace_members_cap` e `quotes_cap` rifiutano insert/ripristini oltre tetto con `member_limit_reached` / `quote_limit_reached`. I preventivi archiviati contano; i soft-deleted no; il ripristino di un tombstone riverifica il tetto.
- **RPC pre-check**: `create_invite` e `redeem_invite` leggono il limite da `workspace_limits` (fallback 20) e rifiutano in anticipo con `member_limit`; il trigger resta la fonte di verità.
- **Uso in UI**: la RPC `workspace_usage` alimenta le righe “Membri” e “Preventivi” in **Impostazioni → Spazio**; il client ha solo `select` su `workspace_limits`.

### 16.2 Modifica dei limiti (via UI dalla console admin, SQL come fallback)

Dal 4 novembre 2026 la via normale è la **console admin** (`/#/admin` → Spazi → Dettagli → Tetti dello spazio), riservata al flag `profiles.is_admin` (EVO-8, ADR-0034, §17): valida i valori, registra `updated_by` e non richiede l'accesso al SQL editor.

Il fallback SQL resta valido e ha lo stesso effetto immediato:

```sql
-- Tetto utenti globale (prossimi signup)
create or replace function public.max_users()
returns integer language sql immutable as $$
  select 1000;
$$;

-- Tetti di uno spazio (membri, preventivi attivi)
update public.workspace_limits
set max_members = 30, max_quotes = 800, updated_by = '<uuid-admin>', updated_at = now()
where workspace_id = 'ws-doublelayer';

-- Spazio senza riga in workspace_limits: default 20/500
insert into public.workspace_limits (workspace_id, max_members, max_quotes)
values ('<workspace>', 20, 500)
on conflict (workspace_id) do update set max_members = 20, max_quotes = 500;
```

Il valore è attivo immediatamente: nessun riavvio, nessun deploy. La modifica va registrata nella descrizione del commit del runbook o nel ticket operativo; la prima iterazione non aveva UI (scelta ADR-0027), la console admin la aggiunge con EVO-8 (ADR-0034).

### 16.3 Configurazione su Supabase (eseguita il 03/11/2026)

**Esito (03/11/2026):** backup di produzione eseguito con il workflow `Supabase backup` e verificato (checksum SHA-256 OK, decifratura AES-256 OK, `pg_restore --list` con le 10 tabelle public e le 2 auth); migrazione `20261102120000_signup_cap_and_workspace_limits.sql` applicata con `supabase db push` (`max_users()` = 1000, 3 righe `workspace_limits` backfillate, trigger e funzioni presenti); auth config aggiornata via Management API (Email signup ON con `disable_signup = false`, Confirm email OFF con `mailer_autoconfirm = true`, hook `before-user-created` collegato a `pg-functions://postgres/public/handle_before_user_created`); `VITE_ACCESS_REQUEST_ENDPOINT` rimossa dai tre target Vercel e da `.env.local`, production redeploy verde; account di prova verificato (signup con sessione immediata, spazio personale, `workspace_usage` = 1/20 e 0/500, tetto negativo con `max_users()` temporaneamente basso → `signup_limit_reached`, poi ripristinato a 1000), cleanup completo e smoke di produzione verde.

1. **Backup di produzione verificato** (checksum + `pg_restore --list`, vedi `docs/engineering/backup-restore.md`), poi applicare `supabase/migrations/20261102120000_signup_cap_and_workspace_limits.sql`.
2. **Authentication → Sign In / Up**: abilitare **Email signup** e impostare **Confirm email = OFF** (auto-confirm).
3. **Authentication → Hooks → Before user created**: selezionare `public.handle_before_user_created`.
4. Provider Google: invariato (§15).
5. Vercel: rimuovere `VITE_ACCESS_REQUEST_ENDPOINT` da Production, Preview e Development e rifare il deploy.
6. **Verifica**: creare un account di prova, controllare lo spazio personale automatico e le righe “Membri: x/20” / “Preventivi: x/500” in Impostazioni → Spazio; (opzionale) test del tetto con `max_users()` temporaneamente basso via SQL, poi ripristinare 1000.

### 16.4 Verifica locale

```bash
npm run db:start
npm run db:reset   # applica la migrazione e collega l'hook in supabase/config.toml
npm run db:test    # 148 asserzioni pgTAP, incluse 23 sui tetti e 34 sulla console admin
npm run test:e2e:auth   # signup felice, validazione, quota in Spazio
```

Il signup di prova via API risponde con `{"code":"P0001","message":"signup_limit_reached"}` quando il tetto è raggiunto.

### 16.5 Rollback

- **Chiudere il signup**: in **Sign In / Up** disattivare Email signup (o riportare `max_users()` al valore attuale per bloccare i nuovi ingressi): nessun dato cambia.
- **Disattivare l'hook**: Dashboard → Hooks, oppure `drop function public.handle_before_user_created(jsonb)`.
- **Tetti**: i trigger possono restare; per disattivarli `drop trigger quotes_cap on public.quotes;` e `drop trigger workspace_members_cap on public.workspace_members;`. La tabella `workspace_limits` può restare anche senza trigger.
- La pagina “Richiedi accesso” **non** si ripristina: il ritiro è definitivo (ADR-0026 superseded).

---

## 17. Console admin (EVO-8, ADR-0034)

Dal 4 novembre 2026 l'app ha una console di amministrazione su `/#/admin`, visibile solo all'account con `profiles.is_admin = true` (unico admin: Tancredi Bosi). Perimetro: **monitoraggio + modifica tetti** — panoramica (utenti vs tetto 1000, spazi per tipo, preventivi attivi), lista utenti (email, nome visibile, provider, creato, ultimo accesso, n. spazi), lista spazi con uso vs tetti, membri per spazio, modifica `max_members`/`max_quotes`. Nessuna azione distruttiva: cancellazione/disattivazione account resta su dashboard/Admin API (§6.6), gestione inviti resta agli owner nella pagina Spazio.

### 17.1 Come funziona

- Il flag vive in `profiles.is_admin` (default `false`): nessun ruolo nuovo, nessuna policy RLS nuova o modificata.
- Sei RPC `security definer` con guardia `is_app_admin()`: rifiutano i non-admin con `not_admin` (42501); `admin_update_workspace_limits` valida `> 0` (`invalid_limit`, 22023) e registra `updated_by`/`updated_at` in `workspace_limits`. I trigger dei tetti restano la fonte di verità: un valore sotto l'uso attuale è ammesso e vale solo per i nuovi ingressi/ripristini.
- La UI è a difesa in profondità: voce in sidebar e route utili solo col flag, RPC che rifiutano comunque.
- Decrementare un tetto sotto l'uso non rimuove nulla: la UI avvisa prima del salvataggio.

### 17.2 Attivazione (una-tantum, dopo il deploy della migrazione)

**Esito (04/11/2026):** workflow `Supabase backup` eseguito con successo in 47s, artifact `supabase-backup-41813531489` scaricato e verificato (checksum SHA-256 OK, decifratura AES-256 OK, `pg_restore --list` con le 11 tabelle public incluse `profiles`/`workspace_limits` e `users`/`identities`); migrazione `20261104000000_admin_console.sql` applicata con `supabase db push` (dry-run prima: solo la nuova migrazione in coda); flag impostato via SQL editor sul profilo `Tancredi` (un solo admin, `is_admin = true`); PR #63 mergiata con squash `8cfe37c` dopo CI verde (check + database + e2e); produzione aggiornata a `index-D6ixFw48.js` / `index-DMAw7o4c.css`; `npm run smoke:production` verde; verifica reale della console con account temporaneo flaggato via SQL (voce Amministrazione in sidebar, overview 3 utenti/tetto 1000, lista utenti con provider Email+Google, spazi con uso vs tetti e `ws-doublelayer` a 2/20 e 4/500, screenshot salvato), cleanup completo (utente, profilo e spazio temporanei rimossi; residui 0).

1. Backup di produzione verificato (checksum + `pg_restore --list`).
2. Applicare `supabase/migrations/20261104000000_admin_console.sql` con `supabase db push`.
3. Impostare il flag con lo SQL editor (UUID mai nel repository; la riga profilo esiste già per gli account EVO-7, l'`on conflict` copre anche i profili mancanti):
   ```sql
   insert into public.profiles (user_id, display_name, is_admin)
   values ('<uuid-admin>', '<nome visibile>', true)
   on conflict (user_id) do update set is_admin = true, updated_at = now();
   ```
4. Accedere con l'account, verificare la voce **Console admin** in sidebar, l'overview e la modifica di un tetto (riflessa subito in Impostazioni → Spazio). Eseguire lo smoke di produzione.
5. Un secondo admin (se mai servisse) è la stessa SQL con il suo UUID.

### 17.3 Rollback

- **Revoca admin**: `update public.profiles set is_admin = false where user_id = '<uuid-admin>';` — voce e route spariscono, nessun dato cambia.
- **Ritiro console**: `drop function` delle sei RPC (o della sola `admin_update_workspace_limits` per renderla di sola lettura); la colonna `is_admin` può restare senza effetti.

---

## 18. Riferimenti

- `docs/adr/0024-supabase-auth-workspace.md` — auth email/password, workspace e operazioni free.
- `docs/adr/0025-google-oauth.md` — provider Google, PKCE, link manuale, segreti e rollback.
- `docs/planning/t5.4-cloud-sync.md` — piano completo, schema, RLS, test e rollback.
- `docs/engineering/deployment.md` §1.1 — Supabase locale, env e comandi.
- `docs/engineering/backup-restore.md` — backup settimanale cifrato e restore verificato.
- `.github/workflows/keepalive.yml` e `.github/workflows/backup.yml` — operazioni automatiche.
- `docs/domain/data-model.md` §7 — schema cloud, audit e limite degli ID globali.
- `supabase/migrations/20261028120000_init.sql` — tabelle, RLS, trigger e `keepalive`.
- `supabase/tests/rls.test.sql` — 33 asserzioni di isolamento e audit.
- `supabase/tests/profiles.test.sql` — 17 asserzioni su creazione lazy, backfill, nome visibile, validazione e directory.
- `supabase/migrations/20261102120000_signup_cap_and_workspace_limits.sql` — tetto utenti, hook, `workspace_limits`, trigger e `workspace_usage` (EVO-2).
- `supabase/tests/caps.test.sql` — 23 asserzioni sui tetti (EVO-2).
- `supabase/tests/admin.test.sql` — 34 asserzioni sulla console admin (EVO-8).
- `docs/adr/0027-signup-cap-and-workspace-limits.md` e `docs/planning/evo-2-user-quote-caps.md` — decisioni e spec.
- `docs/adr/0034-admin-console.md` e `docs/planning/evo-8-admin-console.md` — console admin: flag `is_admin`, RPC e perimetro.
- `docs/adr/0038-security-audit-remediation.md` e `docs/engineering/security-audit-2026-11-06.md` — audit di sicurezza: rimedi applicati e finding aperti.
- `supabase/migrations/20261106140000_close_audit_findings.sql` e `supabase/tests/hardening.test.sql` — grant delle membership, immutabilità identità del workspace, `created_by`, cap sugli spostamenti.

## 19. Stato dei finding dell'audit (06/11/2026)

Riferimento: `docs/engineering/security-audit-2026-11-06.md`. Stato al 06/11/2026.

| # | Finding | Stato |
| --- | --- | --- |
| 1 | Auto-confirm + auto-link | **chiuso**: `mailer_autoconfirm = false`; la UI mostra «Controlla la posta» |
| 2 | Link condivisi con snapshot e margini | **chiuso**: proiezione cliente |
| 3 | CSP e anti-framing | **chiuso**: `vercel.json` |
| 5 | Integrità preventivo inviato | **parziale, per scelta**: `workspace_id` e `schema_version` bloccati; archiviazione e soft-delete restano permessi (UI e AGENTS.md §9) |
| 6 | `created_by` falsificabile | **chiuso**: trigger `set_created_fields` |
| 7 | Tetto aggirabile con lo spostamento | **chiuso**: il cap vale anche per i movimenti |
| 10 | Poteri dell'owner oltre il documentato | **chiuso**: niente `INSERT` diretto sulle membership, identità del workspace immutabile |
| 11 | Dipendenze | **chiuso**: Dependabot + `npm audit --omit=dev` in CI |
| 8 | Password compromesse | **non applicabile al piano Free**: l'API risponde `402` («available on Pro Plans and up»). Restano minimo 12 caratteri |
| 9 | Audit log auth | **non configurabile via API**: `audit_log_disable_postgres` resta `true` e non è scrivibile dal Management API. Da valutare in dashboard o con il piano Pro |
| 4 | CAPTCHA sul signup | **gestito senza CAPTCHA** (decisione dell'owner): conferma email obbligatoria + pulizia automatica degli account non confermati |

### 19.1 Pulizia degli account non confermati (finding 4)

Con la conferma email attiva un account nasce solo se l'email di conferma parte (l'invio è nella stessa transazione del signup). Resta il caso di indirizzi reali mai confermati, che consumano il tetto globale di 1000 utenti.

Job `pg_cron` **`layercost-cleanup-unconfirmed`**, ogni giorno alle **03:41 UTC**:

```sql
select * from public.delete_unconfirmed_users(48, 500, true);   -- dry run
select * from public.delete_unconfirmed_users(48, 500, false);  -- esegue
```

Cancella solo utenti con `email_confirmed_at is null`, più vecchi di **48 ore**, mai entrati e **senza tracce** (membership, profilo, preventivi, workspace). La funzione è `SECURITY DEFINER` e hanno il grant solo `service_role`, `postgres` e `supabase_admin`: `anon` e `authenticated` non possono chiamarla.

Monitoraggio:

```sql
select jobid, jobname, schedule, active from cron.job;
select jobname, status, start_time, return_message
from cron.job_run_details order by start_time desc limit 10;
```

Se il tetto utenti si avvicina a 1000, il dry run dice quanti candidati ci sono prima di qualunque cancellazione. Non è stata adottata alcuna misura anti-CAPTCHA: né rate limit più stretto (resta 20 email/ora) né blocco dei domini usa-e-getta.
