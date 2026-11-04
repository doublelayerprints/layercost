# ADR-0034 — Console admin in-app per utenti, spazi e tetti

**Stato:** Proposta (EVO-8, in pianificazione)
**Data:** 4 novembre 2026
**Relazione:** integra **ADR-0027** (tetti via SQL → aggiunta la via UI), **ADR-0028** (multi-workspace), **ADR-0031** (profili); non sostituisce nessun ADR

## Contesto

Dal 3 novembre 2026 il signup è aperto a tetto numerico (ADR-0027) e ogni spazio ha tetti membri/preventivi configurabili. Le operazioni globali — vedere l'uso reale di utenti e spazi, modificare i tetti per workspace — oggi passano tutte dal dashboard Supabase o dal SQL editor (runbook §16.2): nessuna visibilità di prodotto, ogni modifica è SQL manuale. Non esiste un concetto di admin globale: i ruoli sono solo per-workspace (`owner`/`editor`). Il client usa solo la chiave pubblicabile: la service role non può mai entrare nel bundle, quindi la cancellazione/disattivazione di un account resta fuori dal browser (Admin API/dashboard).

## Decisione

1. **Console admin in-app**, route lazy `/#/admin` con voce in sidebar visibile solo all'admin. Perimetro: **monitoraggio + modifica tetti** — panoramica (utenti vs tetto 1000, spazi per tipo, preventivi totali), lista utenti (email, nome visibile, provider, creato, ultimo accesso, n. spazi), lista spazi con uso vs tetti, membri per spazio, modifica `max_members`/`max_quotes`.
2. **Marker admin**: colonna **`profiles.is_admin boolean not null default false`**. Nessun ruolo nuovo, nessuna tabella nuova; il flag si imposta via SQL una-tantum al deploy per l'amministratore (Tancredi Bosi) e non entra nel repository, come il bootstrap del workspace. Estendibile a futuri admin con una riga SQL.
3. **Accesso solo via RPC security definer** con guardia `is_app_admin()` (stesso schema di `profiles`/ADR-0031: zero grant diretti alle tabelle, nessuna modifica alla RLS esistente). Sei funzioni: `is_app_admin()`, `admin_overview()`, `admin_list_users()`, `admin_list_workspaces()`, `admin_workspace_members(ws)`, `admin_update_workspace_limits(ws, mm, mq)`. Errori per codice: `not_admin` (42501), `invalid_limit` (22023), `workspace_not_found` (P0001).
4. **Nessuna azione distruttiva dalla console**: niente cancellazione di utenti, membri, spazi o preventivi; la disattivazione di un account resta un'operazione da dashboard/Admin API (service role), come documentato nel runbook §6.6. Il decremento di un tetto sotto l'uso attuale è ammesso (comportamento identico al SQL attuale) con avviso in UI.
5. **I dati esposti sono minimi e operativi**: email, nome visibile, provider, timestamp di account, conteggi. Nessun contenuto economico dei preventivi (solo conteggi per spazio), nessun dato nel bundle pubblico: tutto richiede sessione autenticata e flag admin.

## Alternative considerate

- **Tabella `app_admins` separata**: stessa cosa di `profiles.is_admin` con una tabella in più per un solo flag. Scartata.
- **Admin = owner del workspace condiviso `ws-doublelayer`**: zero migrazioni, ma renderebbe admin anche il secondo owner. Scartata: l'admin è una persona sola.
- **RPC aggregate in un'unica snapshot JSON**: meno round-trip, ma pgTAP scomodo e un errore perde l'intera snapshot. Scartata a favore di RPC per risorsa.
- **Viste `security_invoker` + policy RLS admin su ogni tabella**: richiede di toccare la RLS di tutte le tabelle esistenti per lo stesso risultato. Scartata: superficie di rischio inaccettabile.
- **UI admin per cancellare/disattivare utenti**: impossibile con la sola chiave pubblicabile (Admin API richiede service role). Fuori scope, resta il runbook.
- **Metriche dashboard (egress, DB size) nella console**: non leggibili via Postgres RPC, sono dati del piano. Restano nel dashboard Supabase (runbook/sources §6.2).

## Conseguenze

- Migrazione unica `20261104000000_admin_console.sql`: colonna `is_admin`, helper `is_app_admin()`, sei RPC con guardia e grant minimi a `authenticated`. Nessuna policy RLS nuova o modificata.
- SQL una-tantum al deploy (runbook) per impostare `is_admin = true` sull'account amministratore; rollback immediato con `is_admin = false` (la UI si nasconde da sola) oppure droppando le RPC.
- Data layer: sei metodi su `CloudGateway`, tipi `AdminOverview`/`AdminUser`/`AdminWorkspace`, codici `not_admin`/`invalid_limit` mappati; nuovo store `admin-store` con factory iniettata.
- UI: chunk lazy `features/admin/` (Panoramica, Utenti, Spazi con pannello membri ed editor tetti), area i18n `admin.*` IT/EN, axe 375/1440. Il bundle iniziale non cambia; il budget lazy va verificato dopo il build e alzato con motivazione se superato (precedenti: ADR-0026/0029/0031/0032).
- Runbook §16.2: la UI diventa la via normale per i tetti; il SQL resta il fallback documentato.
- Le RPC admin leggono `auth.users`/`auth.identities` in qualità di definer (già prassi per l'hook e le directory): nessuna grant nuova sullo schema auth.
- Limiti noti: nessuna paginazione (scala ≤ 1000 utenti), nessun filtro data, nessun grafico — valutabili in un'evolutiva futura se la scala cresce.

## Riferimenti

- `docs/planning/evo-8-admin-console.md` (spec operativa)
- `docs/adr/0027-signup-cap-and-workspace-limits.md` (tetti), `docs/adr/0028-multi-workspace.md` (spazi), `docs/adr/0031-display-names-and-quote-audit.md` (profili)
- `docs/engineering/workspace-runbook.md` (operazioni, §16 tetti, §6.6 offboarding)
- `supabase/migrations/20261031120000_profiles.sql` (pattern RPC-only), `supabase/migrations/20261102120000_signup_cap_and_workspace_limits.sql` (tetti e `workspace_usage`)
