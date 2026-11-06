# Audit di sicurezza — LayerCost

**Data:** 6 novembre 2026
**Scope:** autenticazione, recupero password, RLS e schema Supabase, storage locale, import/export, dipendenze, hosting
**Metodo:** lettura di codice e migrazioni, interrogazioni **in sola lettura** sul progetto di produzione, test RLS su stack Supabase locale, `npm audit`
**Escluso:** penetration test infrastrutturale, internals Supabase/Vercel, test su dispositivi reali

---

## 1. Sintesi

L'impianto è solido dove conta di più: RLS su tutte le 11 tabelle, nessun grant diretto a `profiles`/`workspace_invites`, `security definer` con `search_path = ''` su tutte le 31 funzioni, chiave service role assente dal bundle e dalla storia Git, nessun `eval`/`innerHTML`, import `.3mf` difeso da limiti anti-bomb. `npm audit --omit=dev`: **0 vulnerabilità**.

I problemi reali sono tre e uno è potenzialmente critico: la registrazione non verifica le email e questo si combina con l'auto-link Google; il link condiviso esponeva l'intera struttura dei costi; mancava una CSP.

| # | Gravità | Finding | Stato al 06/11/2026 |
| --- | --- | --- | --- |
| 1 | **Critico** | Auto-confirm email + auto-link Google | **confermato e corretto** (ADR-0038 §2.6) |
| 2 | Alto | Link condiviso con snapshot e margini | **corretto** (ADR-0038 §2.1) |
| 3 | Medio | Nessun CSP / anti-clickjacking | **corretto** (ADR-0038 §2.2) |
| 4 | Medio | Signup senza CAPTCHA e senza conferma email | aperto |
| 5 | Medio | Integrità del preventivo inviato incompleta | **parziale** (ADR-0038 §2.4) |
| 6 | Medio | `created_by` falsificabile all'inserimento | **corretto** (ADR-0038 §2.3) |
| 7 | Medio | Tetto preventivi aggirabile con lo spostamento | **corretto** (ADR-0038 §2.5) |
| 8 | Medio | Nessun controllo sulle password compromesse | aperto |
| 9 | Basso | `auth.audit_log_entries` vuoto | aperto |
| 10 | Basso | Poteri dell'owner oltre il documentato | aperto |
| 11 | Basso | Dipendenze dev vulnerabili, nessun Dependabot | aperto |

---

## 2. Finding 1 — Pre-account takeover via auto-confirm + auto-link

**Gravità:** critica. **Stato:** confermato e corretto il 06/11/2026 (ADR-0038 §2.6).

### Evidenza

Produzione: `mailer_autoconfirm = true`, `disable_signup = false`. Registrando un account con un indirizzo Gmail, il database riporta:

```
email_confirmed_at = 2026-11-06T09:48:46.764865Z   ← confermata senza alcun click
session             = attiva immediatamente
identities          = [("email", "…@gmail.com")]
```

Con auto-confirm Supabase marca l'email come verificata implicitamente. La documentazione Supabase afferma che l'auto-link scatta quando l'identità OAuth ha la stessa email verificata dell'utente esistente.

### Scenario

1. L'attaccante registra `vittima@gmail.com` con una password propria. Nessuna verifica: l'account nasce confermato.
2. La vittima accede con Google. Supabase trova l'utente con quell'email "verificata" e collega l'identità Google all'account dell'attaccante.
3. L'attaccante entra con email+password e vede i workspace della vittima.

### Perché è plausibile

Il signup è aperto a 1000 utenti e la conferma email è spenta proprio per non dipendere dall'SMTP, che però dal 06/11/2026 funziona.

### Verifica eseguita

Codice di GoTrue v2.197.0 — la stessa versione in produzione secondo `/auth/v1/health` — nel punto decisivo:

```go
if email.Verified || config.Mailer.Autoconfirm {
    verifiedEmails = append(verifiedEmails, strings.ToLower(email.Email))
}
...
if hasEmails && !user.IsConfirmed() {
    // ...to prevent pre-account takeover attacks from happening.
    user.RemoveUnconfirmedIdentities(tx, identity)
} else {
    // utente confermato: nessuna pulizia
}
```

Con `mailer_autoconfirm = true` l'utente nasce confermato, quindi la protezione non viene **mai** eseguita. Riprodotto sul backend locale: l'attaccante registra l'email della vittima, arriva l'identità Google, l'attaccante rientra con email+password → accesso riuscito.

### Rimedio applicato

`mailer_autoconfirm = false` in produzione e in `supabase/config.toml`; gateway e store distinguono `confirmEmail` da `signedIn`; la pagina di accesso mostra «Controlla la posta». Verificato: l'utente resta non confermato, il login prima della conferma risponde `email_not_confirmed`, il link reale da Mailpit conferma e apre la sessione. Due test unitari nuovi bloccano la regressione.

---

## 3. Finding 2 — Link condiviso con dati interni (corretto)

**Gravità:** alta. **Stato:** corretto.

### Evidenza

Il payload di un link conteneva:

```
chiavi: id, name, quoteDate, locale, status, lines, job, pricing,
        snapshot, result, createdAt, updatedAt
snapshot presente: true
result: {"totalCost":1234567,"suggestedPrice":1600000,"margin":365433}
materiale: "PLA fornitore ACME"
prezzo stampante µ€: 399000000
tariffa manodopera µ€/h: 2500000
```

`createdBy`/`updatedBy` erano rimossi; `snapshot` e `result` no. La vista `audience="customer"` li nascondeva solo a schermo, mentre il payload restava decodificabile da chiunque ricevesse il link.

### Rimedio applicato

Proiezione cliente in `src/lib/share-projection.ts`; il tipo `SharedQuote` non contiene i campi interni, quindi la fuga non può più avvenire per distrazione. Il preventivo importato viene ricalcolato con la configurazione locale. I link preesistenti vengono riproiettati in lettura. Dettagli e alternative in ADR-0038 §2.1. Sei test unitari nuovi, di cui uno ispeziona il payload compresso grezzo.

---

## 4. Finding 3 — CSP e anti-framing (corretto)

**Gravità:** media. **Stato:** corretto.

La produzione inviava `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, ma nessun `Content-Security-Policy` e nessun header anti-framing: il sito era incorniciabile (clickjacking su "Esci", cambio stato preventivo, import).

Applicati CSP e `X-Frame-Options: DENY`, con `script-src` basato sull'hash del JSON-LD e `connect-src` limitato a Supabase e Formspree. Un test ricalcola l'hash da `index.html` e fallisce se la policy non lo autorizza. Dettagli in ADR-0038 §2.2.

---

## 5. Finding 4 — Signup senza CAPTCHA e senza conferma (aperto)

**Gravità:** media. **Stato:** aperto.

Tetto 1000 utenti, `auth.captcha` non configurato, rate limit `sign_in_sign_ups = 30` per 5 minuti per IP. Un bot può esaurire il tetto in poche ore con indirizzi inventati, bloccando le registrazioni legittime (`signup_limit_reached`). Con auto-confirm non c'è nemmeno l'attrito dell'email.

**Rimedio:** Cloudflare Turnstile (gratuito), supportato nativamente da Supabase; richiede il widget nel form. In alternativa, abbassare il tetto e monitorarlo dalla console admin.

---

## 6. Finding 5 — Integrità del preventivo inviato (parziale)

**Gravità:** media. **Stato:** parziale.

Prima del rimedio un editor poteva, su un preventivo `sent`:

```
soft-delete      → UPDATE 1
archiviazione    → UPDATE 1
spostamento      → UPDATE 1 (workspace_id)
schema_version   → UPDATE 1 (999)
```

Il contenuto economico era già protetto (`quote_locked` su `lines`, `engine_version`, `name`).

**Applicato:** blocco di `workspace_id` e `schema_version` su `sent`/`completed`.

**Non applicato, per scelta:** archiviazione e soft-deletion restano permesse. La UI le offre per ogni stato e AGENTS.md §9 impone "archivia invece di cancellare"; bloccarle avrebbe rotto una funzione. Non modificano il documento né gli importi.

---

## 7. Finding 6 — `created_by` falsificabile (corretto)

**Gravità:** media. **Stato:** corretto.

Inserendo un preventivo con `created_by` uguale all'UUID di un altro utente, l'operazione riusciva. Il trigger bloccava la modifica di `created_by`, non la valorizzazione arbitraria in `INSERT`. I tag "Creato da …" non erano quindi probanti.

**Applicato:** trigger `set_created_fields` che imposta `created_by = auth.uid()` per i ruoli applicativi (service role e sessioni SQL senza JWT mantengono il controllo). `created_at` resta scrivibile perché il primo accesso importa i preventivi con le date originali: forzarlo avrebbe riscritto la storia e l'ordine della lista.

---

## 8. Finding 7 — Tetto preventivi aggirabile (corretto)

**Gravità:** media. **Stato:** corretto.

Workspace A con `max_quotes = 1` e un preventivo; workspace B libero. Lo spostamento da B ad A riusciva (`quote spostata in ws pieno: 2`): il trigger usciva presto per gli `UPDATE`.

**Applicato:** uno spostamento è trattato come un inserimento nella destinazione. Test: spostamento rifiutato a tetto pieno e accettato dopo un soft-delete che libera un posto.

---

## 9. Finding 8 — Nessun controllo sulle password compromesse (aperto)

**Gravità:** media. **Stato:** aperto.

`password_requirements` è vuoto e non c'è verifica sulle password violate: `aaaaaaaaaaaa` viene accettata, anche in fase di cambio password. Il minimo di 12 caratteri è allineato tra UI e backend (e il messaggio contraddittorio «6 caratteri» è stato corretto il 06/11/2026).

**Rimedio:** attivare in Supabase "Check for leaked passwords" (HaveIBeenPwned, integrato e gratuito). Nessun codice.

---

## 10. Finding 9–11 — Minori

**9. Nessun audit log.** `auth.audit_log_entries` contiene **0 righe** in produzione, nonostante decine di login. Nessuna traccia di tentativi falliti, reset o cambi password: in caso di incidente manca la forensic. Da verificare la configurazione e la retention in dashboard.

**10. Poteri dell'owner oltre il documentato.** Un owner può inserire un membro arbitrario senza passare da `create_invite` (aggirando scadenza, revoca e `max_uses`), cambiare `kind` da `shared` a `personal` (eludendo il tetto di 10 spazi) e riscrivere `created_by` del workspace. Impatto limitato al proprio spazio, ma smentisce invarianti di `data-model.md`.

**11. Dipendenze.** `npm audit --omit=dev`: 0. Dev: 2 moderate su `vitest`/`@vitest/mocker` (code injection via mock manuale, solo in test). Nessun Dependabot/Renovate attivo, nessun `npm audit` in CI.

---

## 11. Cosa è risultato solido

- **RLS completa** su 11 tabelle; `anon` non legge nulla (`HTTP 401` su tutte) e non esegue RPC (`42501`), verificato anche in produzione.
- **`profiles` e `workspace_invites` senza grant diretti**; auto-promozione ad admin via `profiles`: `permission denied`.
- **`security definer` con `search_path = ''`** su tutte le 31 funzioni.
- **Console admin fail-closed**: `not_admin` → stato riservato.
- **Nessuna enumerazione account**: `/auth/v1/recover` risponde `200 {}` identico per indirizzi esistenti e inesistenti; login con email sconosciuta e password errata restituiscono lo stesso `invalid_credentials`.
- **Nessun open redirect**: `redirect_to` fuori allow-list viene ignorato.
- **Il cambio password revoca le altre sessioni**: un refresh token di un secondo device muore dopo `updateUser({ password })`.
- **PKCE corretto**: `detectSessionInUrl: false`, scambio manuale, flag `recovery` dal `redirectType`.
- **Service role assente dal bundle**, cercata byte per byte in `dist/` e nella storia Git.
- **Import `.3mf`**: limiti compresso/decompresso/entry, path traversal rifiutato, ZIP cifrato e ZIP64 rifiutati, `DOCTYPE`/`ENTITY` rifiutati, parsing in Web Worker.
- **Nessun `dangerouslySetInnerHTML`, `eval`, `new Function`**; `xlsx` escapa l'XML; nessuna richiesta di rete oltre Supabase e Formspree.

---

## 12. Note di trasparenza

- Il blocco SMTP del 06/11/2026 è stato causato da due email di prova verso Gmail inesistenti inviate durante l'audit. L'episodio ha però fatto emergere che il recupero password non funzionava affatto.
- `.env.local` era leggibile da altri utenti della macchina (`644`) e conteneva service role key, password del database, chiave di backup e token OIDC Vercel. Portato a `600`. **Consigliata la rotazione** della service role key e di `BACKUP_ENCRYPTION_KEY` se la macchina è condivisa o è stata usata in contesti non fidati.
- I test RLS sono stati eseguiti sullo stack locale e annullati con `rollback`; in produzione sono state fatte solo letture di catalogo e configurazione, più richieste di reset verso indirizzi propri.