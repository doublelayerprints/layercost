# ADR-0037 — Recupero password self-service con SMTP gratuito

**Data:** 06/11/2026 · **Stato:** accettato · **Collegati:** ADR-0024 (auth email/password), ADR-0025 (Google OAuth), ADR-0027 (signup a tetto)

---

## 1. Contesto

Finora il recupero password era **amministrativo** (runbook §6.4): l'owner generava una
password temporanea dall'Admin API e la comunicava a voce. Con due utenti funzionava, ma
è un collo di bottiglia: chi perde la password dipende da te, e la password viaggia su
un canale esterno all'app.

Supabase Free include **3 email all'ora** con l'SMTP integrato: sufficiente per un
progetto con un tetto di 1000 utenti e un uso reale di poche richieste al mese.
Il provider Google resta la via consigliata (`auth.forgotPasswordGoogle` lo dice
esplicitamente), ma serve un fallback per gli account con password.

## 2. Decisione

1. **Flusso self-service standard, PKCE, dentro l'app.**
   `resetPasswordForEmail(email, { redirectTo })` → email con link → `/auth/v1/verify`
   → redirect alla root con `?code=…` → `exchangeCodeForSession` → schermata
   «Scegli una nuova password» → `updateUser({ password })`.
2. **La distinzione recovery arriva dal risultato dello scambio, non dall'URL.**
   Verificato sul campo: con PKCE il redirect contiene solo `?code=…`, senza
   `type=recovery`. Il gateway legge `data.redirectType` di
   `exchangeCodeForSession` (presente a runtime, assente dai tipi pubblicati) e lo
   espone come `{ session, recovery }`. Questo evita di indovinare dal parametro URL,
   che cambia tra flussi implicit e PKCE.
3. **Pagina dedicata e lazy** (`/#/reset-password`): form email, conferma neutra
   («se esiste un account…»), form nuova password con ripetizione, conferma finale.
   Fuori dal chunk iniziale (la pagina pesa 1,4 KB gzip) perché è una schermata rara.
4. **Nessun enumerazione degli account.** La conferma è identica per email esistenti e
   inesistenti, e `resetPasswordForEmail` non rivela nulla. Supabase applica già il
   rate limit sugli invii.
5. **Requisiti password allineati al server.** Il minimo della UI passa da **6 a 12**
   caratteri (il valore che il progetto ha già in `supabase/config.toml` e che
   l'Admin API impone): prima la UI accettava password che il backend avrebbe poi
   rifiutato.
6. **SMTP = servizio integrato di Supabase Free** (2 email/ora, non 3). ~~Nessun
   provider esterno, nessun secret in più, nessun costo.~~ **Superato il 06/11/2026:**
   quel servizio consegna solo agli indirizzi dell'organizzazione e non è utilizzabile
   per utenti reali; è stato inoltre bloccato per bounce rate. Il flusso in-app resta
   valido, ma richiede un **SMTP custom**: dal 06/11/2026 è attivo Gmail SMTP
   (`smtp.gmail.com:587`, mittente `doublelayerprints@gmail.com`), documentato nel
   runbook §6.4.1. L'ADR-0037 resta corretto sul codice e sbagliato sulla premessa
   infrastrutturale.
7. **La pagina pubblica di reset non è indicizzabile e non tocca i dati dell'app**:
   è dentro `AppShell` come il login, non crea `layercost:data`, non chiama il sync.

## 3. Conseguenze

- **Positivi:** recupero autonomo; password mai trasmessa a voce; meno lavoro per
  l'owner; il runbook §6.4 diventa il fallback amministrativo, non la via normale.
- **Costi:** +23 chiavi i18n IT/EN (`auth.recovery.*`, `auth.passwordRule`,
  `auth.error.weakPassword`); il JS iniziale sale a 241,1 KB (limite 243) e il lazy a
  80,5 KB (limite 82) — aumenti motivati in `scripts/check-budget.mjs`.
- **Sicurezza:** flusso PKCE, token monouso con scadenza (1 ora di default), nessuna
  enumerazione, rate limit server-side, password minima 12 sia nella UI sia nel
  backend. Chi ha Google può evitare del tutto la password.
- **Non preso ora:** cambio password dalla pagina Impostazioni per chi è già
  autenticato (utile, ma separato: oggi si passa dal link email), 2FA, passkeys.

## 3.1 Aggiornamento del 06/11/2026 — SMTP custom obbligatorio

Verificato sul progetto di produzione:

- L'SMTP integrato consegna **solo agli indirizzi dei membri dell'organizzazione**
  Supabase: gli utenti reali ricevono `Email address not authorized`.
- Il limite è **2 email/ora** (`rate_limit_email_sent = 2`), non 3 come scritto sopra e
  nel runbook.
- Il 06/11/2026 Supabase ha **bloccato l'invio** dal servizio integrato per bounce rate
  elevato: nessun flusso email funziona finché non si configura un SMTP custom.

Il flusso applicativo (PKCE, `exchangeCodeForSession`, `redirectType`, pagina lazy,
minimo 12) non cambia: cambia solo la configurazione del progetto. Le opzioni valutate
sono tre. **Gmail SMTP** (attiva dal 06/11/2026) funziona subito a costo zero, con
mittente reale `@gmail.com` e il tetto di ~500 destinatari/giorno di Google. **Brevo con
mittente Gmail** è stata scartata: non fornisce caselle e riscrive il mittente in
`...@<id>.t-sender-sib.com`. **Dominio proprio + Brevo/Resend** (~10–15 €/anno) resta la
scelta definitiva per un mittente `no-reply@` con SPF/DKIM/DMARC corretti. Procedura
completa nel runbook §6.4.1.

**Correzione collegata:** la UI diceva «Almeno 6 caratteri» mentre il minimo reale era
12. Messaggio allineato in IT/EN e nell'E2E auth.

## 4. Riferimenti

- `docs/planning/evo-11-password-reset.md` — piano operativo ed esiti.
- `docs/engineering/workspace-runbook.md` §6.4 — reset amministrativo (fallback).
- Supabase: `resetPasswordForEmail`, `exchangeCodeForSession`, `updateUser`.