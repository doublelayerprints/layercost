# ADR-0025 — Google OAuth come provider aggiuntivo

**Stato:** Accettato
**Data:** 29 ottobre 2026
**Piano:** `docs/planning/evolutive.md` §3
**Relazione:** estende ADR-0024 (auth email/password e workspace condiviso); non cambia RLS, schema o sync

## Contesto

Il cloud di LayerCost è live dal 28/10/2026 con Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), un workspace condiviso (`ws-doublelayer`), due account `owner` creati a mano e signup pubblico disabilitato. L'autenticazione è email/password; non c'è SMTP e il reset è amministrativo.

I due utenti vogliono accedere anche con Google, senza perdere la password come fallback. Il requisito nasce da un vincolo pratico: due persone, account già esistenti, nessun self-service, costo €0.

L'app ha `HashRouter` e il client Supabase è creato con `detectSessionInUrl: false`. Il flusso OAuth non deve interferire con il fragment del router, non deve introdurre un backend e non deve esporre il Client Secret.

## Decisione

1. **Provider aggiuntivo, non sostitutivo.** Google si affianca a email/password. Il provider email resta abilitato, il signup pubblico resta disabilitato e gli account continuano a essere creati dall'amministratore. Non esiste una registrazione self-service.
2. **PKCE con scambio manuale del codice.** Il client Supabase usa `flowType: 'pkce'` e mantiene `detectSessionInUrl: false`. `signInWithOAuth` riceve `redirectTo = window.location.origin + '/'`; al ritorno il codice arriva nel **query string** (`?code=...`), viene letto prima di `getSession`, scambiato con `exchangeCodeForSession`, e i parametri OAuth vengono rimossi dall'URL. Il fragment resta libero per `HashRouter`: nessuna route di callback dedicata, nessun rewrite Vercel, nessuna modifica al routing.
3. **Account esistenti: auto-link, con fallback esplicito.** Supabase collega automaticamente un'identità Google a un utente con la stessa email verificata. Poiché l'auto-link dipende dalla configurazione del progetto e dal provider, l'app offre anche **“Collega Google”** in Impostazioni → Sincronizzazione, basato su `linkIdentity` mentre l'utente è già autenticato con email/password. Il collegamento manuale va abilitato in Supabase Auth; è la via deterministica per i due account esistenti.
4. **Signup disabilitato anche con Google.** Un'email Google senza utente pre-creato viene rifiutata con un messaggio che rimanda all'amministratore. L'app non crea utenti, membership o workspace.
5. **Segreti.** Il **Client ID** è pubblico e vive solo nella configurazione del provider Supabase. Il **Client Secret** vive solo nel dashboard Supabase (produzione) e in una variabile d'ambiente locale non committata (sviluppo). Non entra mai nel repository, nel bundle, in `.env.example`, nei log o nelle env Vercel. L'app espone solo il flag pubblico `VITE_AUTH_GOOGLE_ENABLED`, che mostra o nasconde il pulsante e serve anche da rollback rapido.
6. **Errori espliciti e accessibili.** Gli errori OAuth sono mappati per codice (`oauthCancelled`, `oauthProviderDisabled`, `oauthSignupDisabled`, `oauthIdentityExists`, `oauthCallback`, `manualLinkingDisabled`) e tradotti in italiano e inglese. Nessun redirect silenzioso, nessun loop: un errore nel callback porta alla pagina di accesso con un avviso `role="alert"`.
7. **Azzeramento dell'identità non richiesto.** Non si richiedono scope Google oltre `openid`, `email` e `profile`; non si salvano token Google, non si accede a Drive/Gmail e non si aggiunge un servizio esterno oltre Google e Supabase.
8. **Nessun impatto su dati e dominio.** Non cambiano formule, `engineVersion`, snapshot, schema locale v4, RLS, tabelle cloud, sync, backup o keep-alive. Il provider cambia solo il modo di ottenere una sessione Supabase.
9. **Rollout controllato.** Il pulsante è visibile solo con `VITE_AUTH_GOOGLE_ENABLED=true`. L'ordine è: creare l'OAuth client, configurare Supabase, verificare il login su locale/staging, impostare il flag in produzione, smoke test. Rollback: disabilitare Google nel dashboard Supabase e rimuovere il flag; email/password resta operativo.

## Alternative considerate

- **Flusso implicito.** Restituisce i token nel fragment, che `HashRouter` usa per la route. Avrebbe richiesto di leggere il fragment prima del router e di gestire token nell'URL. Scartato.
- **Route `/auth/callback` dedicata.** Più esplicita, ma richiede un rewrite Vercel e un passaggio prima del router. La strategia con redirect alla root e scambio manuale è più piccola e non tocca l'hosting.
- **Solo auto-link.** Meno codice, ma dipende da un comportamento non garantito in ogni configurazione e non lascia una via di recupero se il collegamento automatico fallisce. Il fallback manuale costa poco ed è verificabile.
- **Google come unico metodo.** Ridurrebbe la superficie, ma se l'account Google viene perso o il provider è down non resta un accesso amministrativo. Contrario al requisito di fallback.
- **Magic link o SMTP gratuito.** Il servizio email integrato ha un limite di 2 email/ora e il magic link ha già creato problemi con `HashRouter` (ADR-0024). Rimandato.
- **Custom domain Supabase per il consent screen.** Migliora la percezione del brand, ma è un costo mensile e non serve per due utenti. Rinviato.

## Conseguenze

- Nuovo modulo puro `src/data/cloud/oauth.ts` per parsing del callback, mapping degli errori e costruzione del redirect; test unitari dedicati.
- `src/data/cloud/auth.ts` espone `signInWithOAuth`, `linkIdentity` e `exchangeCodeForSession`; `AuthUser` include i provider collegati.
- `src/state/auth-store.ts` gestisce lo stato OAuth e il callback all'avvio; `src/App.tsx` sposta gli errori del callback sulla pagina di accesso.
- Login con “Continua con Google”, avvisi accessibili e i18n IT/EN; Impostazioni → Sincronizzazione mostra “Collega Google” o “Google collegato”.
- Nuova variabile pubblica opzionale `VITE_AUTH_GOOGLE_ENABLED`; nessuna nuova dipendenza.
- Runbook aggiornato con creazione OAuth client, redirect URI, configurazione Supabase, test, rollback e troubleshooting.
- La sessione resta in `localStorage` come prima; il code verifier PKCE è gestito da `supabase-js` nella stessa area tecnica e non entra nei backup dell'app.
- Il consenso Google mostra il dominio Supabase finché non si configura un custom domain; per due utenti è accettabile.
- Se in futuro l'app si apre a più utenti, servirà una decisione separata su verifica Google, allowlist/tetti (EVO-2/EVO-3) e custom domain.
