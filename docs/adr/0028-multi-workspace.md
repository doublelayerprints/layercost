# ADR-0028 — Spazi separati: multi-workspace con membership molti-a-molti

**Stato:** Accettato; supersede in parte ADR-0024 (tenancy)
**Data:** 30 ottobre 2026

## Contesto

ADR-0024 ha scelto un unico workspace condiviso (`ws-doublelayer`) con due account `owner`. La RLS è già per `workspace_id` e `workspace_members` è già una tabella molti-a-molti, ma il prodotto assume un solo spazio:

- `resolveWorkspace()` prende la prima membership e ignora le altre;
- non esiste un selettore di spazio né una UI per crearne uno;
- `workspace_members` si popola solo a mano dall'amministratore;
- il 30/10/2026 il committente ha chiesto **spazi separati**: ogni utente deve avere il proprio spazio e più utenti devono poter condividere uno spazio.

Il modello "stesso archivio per tutti" (opzione A di `docs/planning/evolutive.md` §5) non soddisfa più il requisito.

## Decisione

1. **Modello di tenancy.** Un utente può appartenere a **N workspace**; ogni workspace ha N membri con ruolo `owner` o `editor`. La sessione ha **uno spazio attivo** alla volta, scelto dall'utente e persistito. Non esiste un workspace "globale" implicito.
2. **Spazio personale automatico.** Al primo accesso autenticato, se l'utente non ha membership, viene creato uno spazio personale con membership `owner` tramite RPC atomica. Nessun intervento dell'amministratore. L'operazione è idempotente.
3. **Dati esistenti.** `ws-doublelayer` resta lo spazio condiviso dei due account attuali: nessun dato si sposta. I due utenti mantengono la ownership e ottengono in più uno spazio personale vuoto.
4. **Chiavi.** Le PK delle entità diventano **`(workspace_id, id)`** per `energy_tariffs`, `printers`, `materials`, `extras`, `quotes`. Gli ID di seed restano stabili e riutilizzabili in ogni workspace. Le FK diventano `(workspace_id, ref_id)`, così l'integrità referenziale resta confinata allo spazio. I preventivi continuano a usare UUID generati dall'app e a includere `workspace_id`.
5. **Inviti senza SMTP.** L'owner genera un **codice invito** monouso con scadenza; il codice è mostrato una sola volta e salvato solo come hash. La consegna è manuale, fuori dall'app. L'account della persona invitata è creato dall'amministratore (signup pubblico disabilitato), come già previsto da ADR-0026. Il codice viene riscattato dall'utente autenticato e crea la membership.
6. **Modalità locale invariata.** Chi non accede continua a usare `layercost:data` come archivio locale completo. Al login l'app passa agli spazi cloud; il locale resta nel browser e viene salvato un backup JSON, come oggi. Nessun import automatico del locale in un workspace.
7. **Cache e sync per workspace.** Cache cloud, stato di sincronizzazione e coda offline sono **per workspace** (`layercost:cloud-cache:<id>`, `layercost:sync-state:<id>`); le chiavi legacy migrano verso `ws-doublelayer`. Il cambio di spazio esegue il flush della coda, annulla il pull in corso e ricarica lo stato.
8. **Tetti nella prima iterazione.** Massimo **10 workspace posseduti per utente** e **20 membri per workspace**, applicati nelle RPC e nei trigger. I valori diventano configurabili con EVO-2/`workspace_limits`.
9. **Condivisione dei preventivi invariata.** Il link compresso contiene il preventivo, non lo spazio; resta leggibile senza account e non cambia con il multi-workspace.
10. **Fuori scope.** Signup pubblico, inviti via email, realtime, ACL per singolo preventivo, fatturazione, cancellazione fisica di un workspace dalla UI, portale cliente.

## Alternative considerate

- **Workspace 1:1 con l'utente e condivisione via duplicazione.** Semplice, ma duplica i dati e rende impossibile lavorare insieme sullo stesso archivio. Scartata.
- **Un profilo dati separato per utente nello stesso browser.** Non è multiutente e non risolve la condivisione. Scartata.
- **Creazione degli spazi solo dall'amministratore.** Meno codice, ma contraddice "ogni utente ha il suo spazio" e riporta l'onboarding manuale. Scartata.
- **Inviti via email con SMTP (Brevo/Resend) e Edge Function.** UX migliore, ma aggiunge un servizio esterno, un segreto e una funzione server. Rimandata.
- **ID globalmente unici generati per ogni workspace.** Evita la migrazione delle PK, ma rende il seed non riutilizzabile, rompe l'import idempotente e rende ambigui i riferimenti tra locale e cloud. Scartata.
- **Uno schema Postgres per workspace.** Isolamento forte ma migrazioni e connessioni moltiplicate, incompatibile con Supabase Free e con il client unico. Scartata.
- **Rinviare EVO-4 e restare con lo spazio unico.** Non soddisfa il requisito. Scartata.

## Conseguenze

- Migrazione `20261030120000_multi_workspace.sql` con PK composte, tabella `workspace_invites` e RPC `create_workspace`, `ensure_personal_workspace`, `create_invite`, `revoke_invite`, `redeem_invite`. Backup prima dell'applicazione.
- Refactor di `src/data/cloud/` (gateway, sync-state, cache), `src/state/auth-store.ts` e `src/state/sync-store.ts` per lo spazio attivo.
- Nuova UI: selettore spazio in sidebar e menu mobile, pagina **Spazio** con nome, membri, inviti e uscita, dialogo "Hai un codice invito?".
- Nuove chiavi i18n IT/EN, test pgTAP, unitari, E2E e axe.
- Aggiornamento di `docs/engineering/workspace-runbook.md`, `docs/domain/data-model.md` §7, `docs/planning/evolutive.md`, `TASKS.md`, `STATUS.md`.
- La migrazione è **one-way**: dopo la creazione di nuovi workspace le vecchie PK globali non sono più ricostruibili senza deduplica. Il rollback è applicativo (deploy precedente) e mantiene lo schema nuovo; il ripristino del database usa il backup.
- Non cambiano formule, `engineVersion`, snapshot economici, schema locale v4 o il dominio puro.

## Rapporto con ADR-0024

ADR-0024 resta valido per provider, auth email/password, RLS, audit, sync ottimistico, keep-alive, backup e assenza della service role nel client. Questa ADR supersede:

- il modello "un solo workspace condiviso" e la creazione amministrativa delle membership;
- il vincolo "multi-workspace UI fuori scope";
- l'assunzione di PK globali per le entità sincronizzate.

Il piano operativo è in `docs/planning/evo-4-multi-workspace.md`.
