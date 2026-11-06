# ADR-0038 — Rimedi dell'audit di sicurezza del 06/11/2026

**Data:** 06/11/2026 · **Stato:** accettato · **Collegati:** ADR-0024 (auth e workspace), ADR-0025 (Google OAuth), ADR-0027 (signup e tetti), ADR-0031 (nomi visibili), ADR-0037 (recupero password)

---

## 1. Contesto

Il 06/11/2026 è stato eseguito un audit di sicurezza su autenticazione, recupero password, schema Supabase, storage locale, import/export, dipendenze e hosting. L'audit ha prodotto un report con undici findings. Questo ADR registra i rimedi applicati subito (punti 2, 3 e 6 del report) e motiva le scelte che hanno escluso alcune correzioni apparentemente ovvie.

I findings 1 (auto-confirm + auto-link), 4 (CAPTCHA), 5 (integrità del preventivo inviato), 7 (tetto), 8 (password compromesse), 9 (audit log) e 11 (dipendenze) sono trattati separatamente o restano aperti: §6 di questo ADR spiega perché.

## 2. Decisione

### 2.1 Il link condiviso non contiene più dati interni

**Problema.** `encodeSharedQuote` rimuoveva solo `createdBy`/`updatedBy` e conservava `snapshot` e `result`. Chi riceveva un link poteva decomprimere il payload (`?d=` è LZString) e leggere costo pieno, margine, prezzo d'acquisto delle stampanti, tariffa oraria e nomi dei fornitori. La separazione interno/cliente esisteva solo a schermo.

**Decisione.** Il link porta una **proiezione cliente** (`src/lib/share-projection.ts`) con i soli campi renderizzati:

- `SharedQuote`: id, nome, data, cliente, lingua, righe, lavoro, prezzi. Niente `snapshot`, niente `createdBy`/`updatedBy`, niente `status`.
- `SharedQuoteResult`: totali di prezzo e, per riga, prezzo, sconto, durata, quantità e **nomi** dei materiali con i grammi. Niente costi, margine, watt, tariffa.

I nomi dei materiali servono alla vista cliente e restano; i **costi** dei materiali no. Il tipo proiettato non ha i campi interni, quindi `QuoteOverview`/`QuotePrint` non possono più leggerli per errore: TypeScript lo impedisce.

Il preventivo **importato** da un link viene ricalcolato con la configurazione locale (`importSharedQuote` azzera `result` e `engineVersion`). Prima ereditava i risultati del workspace di origine, che ora non esistono più nel payload; il ricalcolo è anche più corretto, perché i costi sono quelli di chi importa.

**Compatibilità.** I link già condivisi contengono il preventivo completo. `decodeSharedQuote` li riconosce e li **riproietta** al volo, quindi non si rompono e non mostrano dati interni.

### 2.2 CSP e anti-framing

`vercel.json` aggiunge `Content-Security-Policy` e `X-Frame-Options: DENY`.

- `script-src 'self' 'sha256-…'`: l'unico script inline è il JSON-LD di `index.html`; il suo hash è fissato nella policy.
- `style-src 'self' 'unsafe-inline'`: React scrive attributi `style` (barre del costo, colori filamento) e la landing ha `style="width:…"` statici. Eliminare `unsafe-inline` richiederebbe di riscrivere quei punti, senza un guadagno proporzionato.
- `connect-src`: solo il progetto Supabase (`https://*.supabase.co`, `wss://*.supabase.co`) e Formspree. Nessun `https:` generico.
- `frame-ancestors 'none'` più `X-Frame-Options` per i browser che non supportano il primo.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://formspree.io`.

Un test (`tests/config/csp.test.ts`) ricalcola l'hash da `index.html` e fallisce se la policy non lo autorizza: senza, una modifica al JSON-LD avrebbe bloccato lo script in produzione senza rompere la build.

### 2.3 `created_by` non è più falsificabile

Un trigger `before insert` (`set_created_fields`) imposta `created_by = auth.uid()` per i ruoli applicativi. Prima un membro poteva inserire un preventivo attribuendolo a un altro utente, rendendo i tag "Creato da …" (ADR-0031) non probanti.

**`created_at` resta scrivibile.** Il primo accesso importa i preventivi locali con le loro date originali: forzare `now()` avrebbe riscritto la storia e l'ordine della lista. Il compromesso è deliberato: la data di creazione non è un dato di sicurezza, l'attribuzione sì.

### 2.4 Un preventivo inviato non cambia più collocazione

`protect_locked_quote` blocca ora anche `workspace_id` e `schema_version` quando lo stato è `sent` o `completed`.

**Archiviazione e cancellazione restano permesse.** Il report suggeriva di bloccarle, ma la UI le offre per ogni stato (`QuoteDetailPage`) e AGENTS.md §9 impone "archivia invece di cancellare". Bloccarle avrebbe rotto una funzione esistente. Non cambiano il documento né i suoi importi: il rischio che il finding intendeva chiudere — un preventivo inviato che si sposta in un altro spazio dove l'utente ha permessi diversi — è coperto dal blocco su `workspace_id`.

### 2.5 Il tetto preventivi vale anche per gli spostamenti

`enforce_workspace_quote_cap` esceva subito per gli `UPDATE`, salvo il ripristino di un tombstone. Uno spostamento verso un workspace pieno passava. Ora la condizione include `new.workspace_id is distinct from old.workspace_id`: lo spostamento è trattato come un inserimento nella destinazione.

### 2.6 La conferma email è obbligatoria (finding 1)

**Problema confermato.** Letto il codice di GoTrue v2.197.0, la stessa versione in produzione (`/auth/v1/health`), e riprodotto sul backend locale:

1. `DetermineAccountLinking` tratta un'email come verificata quando `email.Verified || config.Mailer.Autoconfirm`. Con auto-confirm **ogni** indirizzo è "verificato".
2. Il signup nasce quindi con `IsConfirmed() = true`.
3. In `createAccountFromExternalIdentity` la protezione anti-takeover è dentro `if hasEmails && !user.IsConfirmed()`: con l'utente già confermato **non viene eseguita**. Niente `RemoveUnconfirmedIdentities`, niente azzeramento della password lasciata dall'attaccante.
4. Prova empirica: l'attaccante registra l'email della vittima, arriva l'identità Google della vittima, l'attaccante rientra con email+password → **accesso riuscito**.

**Decisione.** `mailer_autoconfirm = false` in produzione e in `supabase/config.toml`. La conferma email era stata disattivata in EVO-2 perché l'SMTP non funzionava; dal 06/11/2026 funziona (ADR-0037 §3.1), quindi l'ostacolo è caduto.

**Conseguenza sul codice.** Con la conferma attiva `signUp` non restituisce una sessione. Prima il gateway trattava l'assenza di sessione come `emailNotConfirmed`, cioè un errore; ora restituisce `{ session, needsConfirmation }` e lo store espone `SignUpOutcome = 'signedIn' | 'confirmEmail' | 'failed'`. La pagina di accesso mostra «Controlla la posta» con l'indirizzo, il suggerimento di guardare lo spam e un pulsante verso l'accesso, al posto del calcolatore. Google non è toccato: le email Google arrivano già verificate.

**Verifica.** La registrazione lascia l'utente `NON CONFERMATA` e il login prima della conferma risponde `email_not_confirmed`; il link reale da Mailpit conferma l'account e apre la sessione. Due test unitari nuovi bloccano la regressione: `confirmEmail` non deve autenticare.

### 2.7 Membership e identità del workspace (finding 10)

Un owner poteva inserire una membership arbitraria con un `INSERT` diretto, aggirando inviti (scadenza, revoca, `max_uses`) e pre-check del tetto, e riscrivere `kind` e `created_by` del workspace, eludendo il tetto dei 10 spazi condivisi e falsificando l'audit.

Revocati `INSERT`/`UPDATE`/`DELETE` generici su `workspace_members`; restano `SELECT`, `UPDATE (role)` e `DELETE`, che coprono ciò che la UI fa davvero. Le RPC `create_workspace`, `ensure_personal_workspace` e `redeem_invite` sono `SECURITY DEFINER` e continuano a funzionare. Su `workspaces` un trigger blocca la modifica di `id`, `kind`, `created_by` e `created_at`; `renameWorkspace` tocca solo `name` e continua a funzionare.

### 2.8 Dipendenze (finding 11)

`.github/dependabot.yml` con aggiornamenti npm settimanali raggruppati e GitHub Actions mensili; il job `check` esegue `npm audit --omit=dev --audit-level=moderate` prima di `npm run check`. Le advisory sulle sole dipendenze di sviluppo restano non bloccanti: si correggono con Dependabot senza fermare una release.

### 2.9 Finding non chiudibili dal progetto (8 e 9)

- **Password compromesse (8).** `PATCH /config/auth` con `password_hibp_enabled: true` risponde **`402 Payment Required`**: «Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up». Non è una scelta di implementazione: sul piano Free la funzione non esiste. Resta il minimo di 12 caratteri, allineato tra UI e backend.
- **Audit log (9).** `audit_log_disable_postgres` è `true` e il Management API ignora il valore inviato (la risposta lo riporta invariato). `auth.audit_log_entries` resta vuoto. Va verificato dalla dashboard o sbloccato con il piano Pro.

Entrambi sono documentati come limiti di piano, non come debito tecnico del codice.

### 2.10 CAPTCHA sul signup (finding 4)

Richiede un sito hCaptcha o Cloudflare Turnstile (chiavi pubbliche e segrete) e il widget nel form. Non è stato attivato: senza una secret valida il flag `security_captcha_enabled` **blocca tutte le registrazioni**. L'ordine corretto è nel runbook §19.

## 3. Conseguenze

- `vercel.json` non è più solo tre header: la CSP va aggiornata se cambia l'hash del JSON-LD (il test lo ricorda) o se si aggiunge un host di rete.
- `QuoteOverview` e `QuotePrint` accettano `Quote | SharedQuote`: le figure interne sono raggiungibili solo tramite `internalResult`, che esiste solo quando l'audience è `internal` e il risultato è quello completo.
- Migrazione `20261106120000_security_hardening.sql`: cinque trigger `before insert`, due funzioni ridefinite (`protect_locked_quote`, `enforce_workspace_quote_cap`). Nessuna tabella nuova, nessuna RLS modificata, nessun dato riscritto.
- 338 unitari (+10: sei su link e proiezione, quattro sulla CSP, due sul signup con conferma), 164 pgTAP (+17 su `hardening.test.sql`, 22 su `caps.test.sql` dopo la rimozione degli insert diretti), 5 E2E auth con il nuovo flusso di conferma reale da Mailpit.
- Nessun cambio a formule, `engineVersion`, snapshot economici, schema locale v4 o sync.

## 4. Alternative considerate

- **Rimuovere solo `snapshot` lasciando `result`.** Sarebbe bastato per i fornitori, ma `result` contiene comunque costo pieno e margine. Scartato: la proiezione costa poco di più ed è verificabile.
- **Filtrare lato UI invece che nel payload.** È ciò che si faceva prima, ed è il motivo per cui il problema esisteva. Scartato.
- **Bloccare archiviazione e cancellazione dei preventivi inviati.** Rompeva la UI e il principio "archivia, non cancellare". Scartato, vedi §2.4.
- **`style-src` senza `unsafe-inline`.** Richiede di eliminare ogni attributo `style` da React e dalla landing statica. Rimandato: rischio di regressione visiva alto, guadagno marginale.
- **Forzare anche `created_at`.** Avrebbe riscritto le date all'import. Scartato, vedi §2.3.

## 5. Verifiche

- `npm run check` verde: 336 unitari, typecheck, lint, build, budget (241,5/243 KB iniziali, 308,9/350 totali).
- `npm run db:test`: 159 pgTAP su sei file, incluso il nuovo `hardening.test.sql` che prova forgiatura di `created_by`, blocco dello spostamento di un inviato, archiviazione e soft-delete ancora permessi, spostamento rifiutato a tetto pieno e accettato dopo un soft-delete.
- `tests/config/csp.test.ts`: hash allineato a `index.html`, `frame-ancestors 'none'`, nessun `unsafe-inline` negli script, `connect-src` limitato alle origini usate.

## 6. Cosa resta aperto

| Finding | Stato | Perché non qui |
| --- | --- | --- |
| 1. Auto-confirm + auto-link | **confermato e corretto** | §2.6 |
| 4. CAPTCHA sul signup | aperto | Richiede un sito hCaptcha/Turnstile e la sua secret; il flag da solo blocca le registrazioni (§2.10) |
| 5. Integrità dell'inviato | parziale, per scelta | Chiusa la collocazione; archiviazione e cancellazione restano permesse (§2.4) |
| 8. Password compromesse | **non applicabile al piano Free** | L'API risponde `402`: HIBP è riservato ai piani Pro. Resta il minimo di 12 caratteri (§2.9) |
| 9. Audit log auth | **non configurabile via API** | `audit_log_disable_postgres` resta `true` e non è scrivibile dal Management API (§2.9) |
| 11. Dipendenze | **chiuso** | Dependabot settimanale e `npm audit --omit=dev` in CI (§2.8) |

## 7. Riferimenti

- `docs/engineering/security-audit-2026-11-06.md` — report completo con evidenze.
- `docs/engineering/workspace-runbook.md` — operazioni e rollback.
- `docs/domain/data-model.md` §6 — privacy e sicurezza.