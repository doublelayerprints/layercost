# ADR-0024 — Cloud opzionale con Supabase, account email/password e workspace condiviso

**Stato:** Accettato; supersede in parte ADR-0018 (auth e tenancy)
**Data:** 28 ottobre 2026

## Contesto

LayerCost è una SPA statica local-first. La v1.0.0 non ha backend, account o sincronizzazione: i dati vivono in `localStorage` e l'export JSON è l'unica copia esterna completa.

Il 26/10/2026 il committente ha chiesto di aggiungere utenti, login, un database e **preventivi comuni** tra due persone, mantenendo il costo a **€0**. L'ADR-0018 aveva scelto **Supabase Free** con **magic link**, due utenti pre-creati e un workspace condiviso con RLS per "household".

Dopo la verifica dei limiti free e dei flussi UI sono emersi tre problemi concreti:

1. Il servizio email integrato di Supabase ha un limite di **2 email/ora**: il magic link non è affidabile nemmeno per due persone, soprattutto su un nuovo dispositivo o dopo una sessione scaduta.
2. Il callback del magic link interferisce con `HashRouter`, perché il token arriva nel fragment dell'URL. Servirebbe un passaggio PKCE dedicato prima del router.
3. Il modello "household" hardcoded non regge se domani si aggiunge una terza persona o si vuole condividere un singolo preventivo.

## Decisione

1. **Provider.** Si usa **Supabase Free**, regione EU, con Postgres, Auth e RLS. Il cloud è **opzionale**: l'app resta completamente usabile senza account e senza rete.
2. **Autenticazione.** Si usa **email + password**, con signup pubblico disabilitato. I due utenti sono creati manualmente dal dashboard con auto-confirm. Non si usa SMTP nella prima iterazione: il reset password è un'operazione amministrativa documentata. Il magic link è rimandato; se servirà il reset self-service si aggiungerà un SMTP gratuito (Brevo/Resend) senza cambiare schema.
3. **Tenancy.** Il modello è **`workspaces` + `workspace_members`**, non "household". Entrambi gli utenti sono `owner` dello stesso workspace. Le policy RLS verificano la membership; nessun dato è leggibile senza appartenenza al workspace. La creazione di workspace e membership è amministrativa nella prima iterazione: niente inviti self-service.
4. **Dati.** La configurazione è normalizzata per entità (`settings`, `energy_tariffs`, `printers`, `materials`, `extras`). I preventivi sono una riga per preventivo con `lines`, `job`, `pricing`, `snapshot` e `result` in JSONB; lo snapshot economico resta la fonte dei prezzi. La bozza resta **locale**; nel database entrano solo preventivi `saved`, `sent` e `completed`.
5. **Sincronizzazione.** Configurazione e preventivi si sincronizzano; bozza, tema, lingua e onboarding restano locali. Le scritture sono ottimistiche e usano `updated_at` lato server per il controllo di concorrenza. Le modifiche offline finiscono in una coda locale (outbox) e vengono riprodotte al ritorno della rete. I conflitti sono visibili e non si sovrascrivono in silenzio. Niente realtime nella prima iterazione: sync all'avvio, al focus, dopo una scrittura e con "Sincronizza ora".
6. **Invarianti nel database.** Un trigger impedisce modifiche economiche ai preventivi `sent` e `completed` e le transizioni di stato all'indietro. Le entità non si cancellano fisicamente: si usano `archived_at` e `deleted_at` (tombstone).
7. **Identificatori.** Gli ID delle entità restano `text`, non UUID, per preservare gli ID di seed e rendere l'import locale idempotente. I preventivi usano gli ID generati dall'app.
8. **Sicurezza.** Nel client va solo la chiave pubblicabile/anon; nessuna service role key. RLS attiva su ogni tabella, TLS, regione EU. La cifratura end-to-end non è un requisito della prima iterazione.
9. **Free tier.** Un keep-alive giornaliero evita la pausa per inattività. Un backup settimanale `pg_dump` compensa l'assenza di backup automatici sul piano Free. L'export JSON resta sempre disponibile.
10. **Bundle.** `@supabase/supabase-js` viene caricato in modo lazy solo quando si apre login/sync, per non sforare il budget JavaScript e per non penalizzare chi usa l'app in locale.
11. **Fuori scope.** Registrazione pubblica, portale cliente, ACL per singolo preventivo, realtime, cifratura end-to-end, multi-workspace UI, fatturazione. Il link compresso read-only esistente resta il modo per condividere un preventivo con chi non ha un account.

## Alternative considerate

- **Magic link con SMTP gratuito.** Più comodo, ma aggiunge un servizio esterno e dipende dalla consegna email; il limite integrato di 2 email/ora rende il primo login fragile. Rimandato.
- **Account condiviso.** Un'unica email/password per entrambi eviterebbe la gestione di due utenti, ma elimina l'audit, rende il reset più caotico e non è un vero modello multiutente. Scartato.
- **Cloudflare Workers + D1.** Nessuna pausa e limiti generosi, ma auth e API andrebbero scritte e mantenute. Per due utenti non conviene.
- **Firebase Spark.** Auth e realtime pronti, ma Firestore è NoSQL e il lock-in è maggiore. Scartato.
- **PocketBase self-hosted.** Il software è gratuito, ma serve un host: non è "totalmente gratuito" senza un server già disponibile.
- **Neon + Auth.js.** Postgres ottimo, ma serve un layer applicativo e più colla. Scartato per questa fase.

## Conseguenze

- Refactor async di `DataRepository` e dello store, con test di contratto.
- Nuove tabelle, migrazioni, RLS, trigger e tipi generati; test RLS con due utenti.
- Nuove schermate: login, stato sync, conflitti, primo accesso.
- Variabili d'ambiente pubbliche su Vercel; nessuna funzione server.
- Nuovi workflow GitHub Actions per keep-alive e backup.
- Nuova documentazione: piano T5.4, architettura, persistenza, deployment, testing, privacy.
- La v1.0.0 resta local-only: questa decisione vale per la fase 5 e non cambia formule, `engineVersion`, snapshot o schema dei preventivi.
- Il piano resta €0 finché Supabase Free, Vercel Hobby e GitHub Actions restano nei limiti. Se i limiti cambiano, l'app torna local-only e i dati restano esportabili.

## Rapporto con ADR-0018

ADR-0018 resta valido per: provider Supabase Free, cloud opzionale, solo piani gratuiti, backup prima del primo sync, nessuna service role nel client. Questa ADR supersede:

- il metodo di autenticazione (magic link → email/password);
- il modello di tenancy ("household" → workspace con membership);
- l'operatività free (keep-alive giornaliero e backup `pg_dump`, invece del solo keep-alive ogni 2–3 giorni);
- l'esclusione del realtime nella prima iterazione.

Il piano operativo dettagliato è in `docs/planning/t5.4-cloud-sync.md`.
