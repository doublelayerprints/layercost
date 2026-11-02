# ADR-0027 — Signup aperto a tetto numerico e tetti per workspace

**Stato:** Accettato il 2 novembre 2026; implementazione in EVO-2 (`docs/planning/evo-2-user-quote-caps.md`); da distribuire
**Data:** 2 novembre 2026
**Relazione:** supersede **ADR-0026** (Richiedi accesso, ritirata); integra **ADR-0028** (multi-workspace) con tetti configurabili; assorbe **EVO-3b** (allowlist, non più necessaria)

## Contesto

Il signup pubblico è disabilitato dal deploy del cloud (T5.4) e gli account sono due owner. Per aprire il servizio serviva decidere il modello di ingresso e i limiti. L’analisi dei limiti Supabase Free del 02/11/2026 mostra che gli utenti auth totali sono **illimitati** (50.000 MAU) e il vincolo fisico più vicino è il DB da **500 MB**: un tetto utenti non è richiesto dal piano, quindi è una scelta di prodotto. La pagina “Richiedi accesso” (ADR-0026) serviva proprio a compensare il signup chiuso; con il signup aperto perde lo scopo.

## Decisione

1. **Signup aperto** con email + password (**auto-confirm**, nessuna verifica email) e Google OAuth invariato. Ogni nuovo utente riceve lo spazio personale al primo login (ADR-0028).
2. **Tetto utenti numerico globale**, iniziale **1000**, configurabile via SQL (`public.max_users()`), applicato da un Auth Hook Postgres **`before-user-created`** (`public.handle_before_user_created`) con advisory lock globale e eccezione `signup_limit_reached`. Hook disponibile sul piano Free.
3. **Tetti per workspace** in una nuova tabella **`workspace_limits`**: `max_members` default **20** (il valore fisso delle RPC diventa configurabile) e `max_quotes` default **500**. I preventivi archiviati contano, i soft-deleted no; il ripristino di un tombstone riverifica il tetto.
4. **Il database è la fonte di verità**: trigger `before insert` su `workspace_members` e `before insert or update` su `quotes`, con advisory lock per workspace e eccezioni `member_limit_reached` / `quote_limit_reached`. I limiti si modificano via SQL/runbook (nessuna UI di amministrazione nella prima iterazione); il client ha solo `select` sulla tabella.
5. **“Richiedi accesso” ritirata**: rimozione di route, pagina, feature, chiavi i18n, link, endpoint Formspree accesso e test dedicati; ADR-0026 superseded. Il form Suggerimenti (ADR-0030) resta.
6. La UI mostra l’uso (“Membri: x/20”, “Preventivi: x/500” via RPC `workspace_usage`) e mappa i tre codici errore; i messaggi non fanno perdere dati.

## Alternative considerate

- **Invite-only** (signup chiuso, admin crea gli utenti): già lo stato attuale, non apre il servizio; nessun Auth Hook da mantenere, ma ogni ingresso è manuale. Scartata perché l’obiettivo era aprire.
- **Allowlist email con Auth Hook** (EVO-3b): utile per beta chiuse; aggiunge una tabella e un flusso in più senza benefici rispetto al tetto numerico. Assorbita/scartata.
- **Enforcement solo UI**: bypassabile, soggetto a race condition e incoerente con il sync. Scartato.
- **Auth Hook HTTP** invece che Postgres: richiederebbe un endpoint server; il hook Postgres è gratuito e più semplice. Scartato.
- **Tetto preventivi globale invece che per workspace**: i workspace sono i confini dei dati (ADR-0028); un tetto globale penalizzerebbe i possessori di più spazi. Scartato.

## Conseguenze

- Migrazione unica `20261102120000_signup_cap_and_workspace_limits.sql`: `max_users()`, hook, `workspace_limits` (RLS sola lettura + backfill), due trigger con advisory lock, pre-check nelle RPC `add_member`/`redeem_invite` letto dai limiti configurabili, RPC `workspace_usage`.
- Nuovo form **Registrati** nella login; chiavi i18n `auth.signup.*`; errori `signup_limit_reached`, `member_limit_reached`, `quote_limit_reached` mappati per codice.
- Parità i18n: **−36** chiavi `access.*` (1326) e **+~14** `auth.signup.*`; il form access e la sua env `VITE_ACCESS_REQUEST_ENDPOINT` cessano (Formspree chiuso il 02/11/2026: submission produzione fatta, test pulite).
- Budget: il margine iniziale è 1,3 KB (234,7/236 KB); se il form signup supera il limite, alzo a **240 KB** con motivazione qui e in `scripts/check-budget.mjs`.
- Niente backup automatici sul Free: il runbook di backup manuale resta obbligatorio prima della migrazione.
- Monitoraggio: egress Supabase dopo l’apertura; il tetto 1000 è la guardia principale.
- Rollback: ri-chiudere il signup nel dashboard (nessun dato cambia); disattivare hook e trigger è sicuro; “Richiedi accesso” non si ripristina.

## Riferimenti

- `docs/planning/evo-2-user-quote-caps.md` (spec operativa)
- `docs/planning/evolutive.md` §4 (analisi storica)
- `docs/adr/0026-request-access-formspree.md` (superseded), `docs/adr/0028-multi-workspace.md`, `docs/adr/0030-docs-and-feedback.md`
- `docs/engineering/workspace-runbook.md`, `docs/domain/sources.md` §6.2
