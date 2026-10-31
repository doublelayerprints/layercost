# ADR-0031 — Nomi visibili e tag di audit dei preventivi

**Stato:** Accettato
**Data:** 31 ottobre 2026
**Piano:** `docs/planning/evo-7-quote-audit-tags.md`
**Relazione:** estende l'audit cloud di T5.4.5, ADR-0024 e ADR-0028; non cambia formule, `engineVersion`, snapshot economici, schema locale v4 o auth

## Contesto

In uno spazio condiviso i preventivi mostrano già `created_by`/`updated_by` nel dettaglio, ma l'interfaccia li traduce in “te” oppure “un altro membro”. Con due soli owner la distinzione basta; con più membri non dice **chi** ha creato o modificato un preventivo. La lista **Preventivi** non mostra alcun metadato di audit.

Il committente ha chiesto due tag nella sezione Preventivi: chi ha creato il preventivo e chi lo ha modificato per ultimo, con la data. Ha scelto un **nome visibile unico per utente**, precompilato dal nome Google o dalla parte locale dell'email, modificabile in Impostazioni.

L'email resta volutamente visibile solo agli owner (ADR-0028): il nome visibile è il dato che può essere mostrato a tutti i membri.

## Decisione

1. **Una tabella `profiles`.** Ogni utente ha una riga `profiles (user_id, display_name)`. Il nome è globale, non per workspace, lungo 1–40 caratteri, normalizzato (trim e spazi multipli collassati). La tabella ha RLS attiva e nessun grant diretto ad `anon`/`authenticated`: si legge e si scrive solo tramite RPC `security definer`.

2. **Backfill e creazione lazy.** La migrazione inserisce i profili mancanti degli utenti esistenti. I nuovi account ricevono il profilo alla prima chiamata `get_my_profile` (l'app la esegue al login): nessun trigger applicativo su `auth.users`, così un restore data-only di `auth.users` seguito da `public` non duplica le righe di `profiles`. La precedenza è: `display_name` nei metadati, `full_name`, `name`, parte prima della `@`, `Membro`. La parte locale dell'email è quindi un nome iniziale, non un'esposizione dell'indirizzo completo.

3. **RPC.** `get_my_profile()` restituisce il nome dell'utente autenticato; `set_my_profile(p_display_name)` valida e salva il nome. `list_workspace_members()` aggiunge `display_name` alla directory; `list_my_workspaces()` aggiunge `kind` (`personal`/`shared`) per distinguere gli spazi. Le email restano `null` per gli editor.

4. **Risoluzione dinamica.** I preventivi continuano a salvare solo `created_by`/`updated_by` UUID. La UI risolve il nome corrente dalla directory: se una persona cambia nome, i tag storici mostrano il nome nuovo. Non si duplicano nomi nei preventivi e non si congela un dato personale nello snapshot.

5. **Tag solo dove servono.** I tag compaiono nella lista Preventivi (tabella desktop e card mobile) solo in modalità cloud, con spazio attivo `shared` e metadati presenti. In modalità ospite, spazi personali o preventivi senza audit non cambiano. Nel dettaglio la sezione “Workspace condiviso” usa gli stessi nomi.

6. **“Te” per l'utente corrente.** Il proprio nome non viene mostrato nei tag: si usa “te”, come già nel dettaglio. Per gli altri si usa il nome visibile; se la directory o il profilo non sono disponibili, “un altro membro”. Nessun fallback all'email.

7. **Profilo in Impostazioni.** Nuova sezione **Profilo** visibile solo con cloud configurato e sessione autenticata. Campo `Nome visibile`, max 40, hint sulla visibilità, salvataggio con stato, errore associato al campo e conferma `role="status"`.

8. **Aggiornamento della directory.** La directory viene caricata quando lo spazio attivo è condiviso e ricaricata dopo ogni sincronizzazione riuscita, così un cambio nome fatto da un altro dispositivo converge senza reload. Se la rete non è disponibile, i tag restano leggibili con il fallback e tornano appena possibile.

9. **Nessun impatto sul dominio.** Non cambiano formule, `engineVersion`, snapshot, `AppData`, schema locale v4, `created_at` dei preventivi, RLS delle tabelle dati, sync o backup. La migrazione è additiva; i preventivi non vengono toccati.

10. **Budget.** I tag, il profilo e le stringhe IT/EN aggiungono **1,6 KB gzip** al bundle iniziale (da 228,3 a 229,9 KB). Il limite iniziale passa da **230 KB a 232 KB** per lasciare margine a una feature UI trasversale; il totale resta ampiamente sotto 350 KB.

## Alternative considerate

- **Solo “te” / “un altro membro” anche nella lista.** Zero migrazioni, ma non soddisfa “chi ha fatto quale preventivo” con più di due membri. Scartata dopo la scelta del committente.
- **Email nei tag.** Immediata per gli owner, ma non disponibile agli editor e contraria alla privacy attuale. Scartata.
- **Nome nei metadati `auth.users`.** Meno schema, ma i metadati auth non sono dati applicativi: validazione debole, percorso di modifica legato al provider e test meno puliti. Scartata.
- **Nome copiato su ogni preventivo.** Funziona offline e conserva il nome storico, ma duplica dati, non si aggiorna al cambio nome e richiede modifiche ai mapper e al sync. Scartata.
- **Nome diverso per workspace.** Più flessibile, ma moltiplica la UI e la gestione; il committente ha scelto un nome unico. Rimandata.
- **Avatar e iniziali nei tag.** Aggiungono rumore visivo e non servono a identificare meglio di un nome univoco. Rimandata.
- **Cronologia completa delle modifiche.** Utile in futuro, ma richiede una tabella eventi e una UI dedicata; fuori scope.

## Conseguenze

- Nuova migrazione `20261031120000_profiles.sql` con tabella, backfill, creazione lazy, RPC e modifiche a `list_my_workspaces`/`list_workspace_members`.
- Nuovi test pgTAP in `supabase/tests/profiles.test.sql`.
- Nuovi tipi in `database.types.ts`, campi in `WorkspaceSummary`/`WorkspaceMember`, metodi `getProfile`/`saveProfile` nel gateway.
- Nuovo stato profilo nello workspace store, caricamento della directory per gli spazi condivisi e refresh dopo il sync.
- Nuovo componente `QuoteAuditTags`, helper `quoteMemberName`, sezione `ProfileSettings`, chiavi i18n IT/EN.
- Aggiornamento di `docs/domain/data-model.md` §7, `workspace-runbook.md`, `TASKS.md`, `STATUS.md`, `CHANGELOG.md`, `i18n-inventory.md` e `scripts/check-budget.mjs`.
- Il nome visibile è un dato personale condiviso con i membri degli spazi: la precompilazione da email è documentata e l'utente può cambiarla. L'email completa resta owner-only.
- Rollback applicativo: l'app precedente ignora i nuovi campi e torna a “un altro membro”; i preventivi restano intatti. Rollback database: si possono eliminare le RPC e `profiles`, perdendo solo i nomi scelti.

## Riferimenti

- `docs/planning/evo-7-quote-audit-tags.md`
- `docs/adr/0024-supabase-auth-workspace.md`
- `docs/adr/0028-multi-workspace.md`
- `docs/domain/data-model.md` §7
- `docs/engineering/workspace-runbook.md` §7
- `docs/planning/i18n-inventory.md`
- `scripts/check-budget.mjs`
