# Verifiche manuali post-release

**Release:** v1.0.0 (`cc949b3`)
**Quando:** dopo il deploy di produzione, su un Mac con Safari e VoiceOver.
**Tempo stimato:** 10–15 minuti.
**Stato:** Safari e VoiceOver eseguiti il 02/11/2026. Restano facoltative la stampa fisica e la prova con NVDA; Google e profilo/tag sono già verificati in produzione.

Le verifiche automatiche coprono già axe, WebKit, PDF A4, regressione visiva e budget. Questa checklist serve a confermare i due punti che richiedono un dispositivo e un lettore di schermo reali.

---

## 1. Safari reale

Ambiente: macOS 27, Safari 27, https://layercost.vercel.app.

- [x] Apri la produzione in una **finestra privata** di Safari.
- [x] La home mostra “Nuovo preventivo”, la guida “Configura LayerCost” e nessuno scroll orizzontale a larghezza normale.
- [x] Attiva **Sviluppo → Modalità responsive design** e controlla 390 px: nessun taglio, menu “Menu” apribile e chiudibile.
- [x] Inserisci **10 h** e **100 g** di PLA: il prezzo totale è **3,70 €**.
- [x] Il campo Data mostra il formato italiano (`24/10/2026`) e non quello americano.
- [x] Tab da tastiera: nome, data, cliente, stampante, quantità, tempo, grammi, extra, “Salva preventivo”; il focus è sempre visibile.
- [x] Salva: si apre il dettaglio, compare “Preventivo salvato”.
- [x] Ricarica: il preventivo resta, l’alert non si ripete.
- [x] Impostazioni → Aspetto → **Scuro**: il tema cambia subito e resta dopo il reload; torna a **Chiaro**.
- [x] Dettaglio preventivo → **Cmd+P**: l’anteprima è **fondo bianco e testo nero**, senza sidebar né pulsanti; intestazione, righe, composizione del costo, totali e note sono leggibili.
- [x] Salva il PDF e controlla che non ci siano righe tagliate o colonne sovrapposte.
- [x] Apri “Condividi”, copia il link, aprilo in una finestra privata: il preventivo si vede e “Importa nel mio archivio” funziona.
- [x] **Sviluppo → Mostra console JavaScript**: nessun errore rosso durante il flusso.

### Prova su carta (opzionale)

- [ ] Stampa il PDF su A4.
- [ ] Il testo piccolo (8–9 pt) è leggibile; i grigi dello stack distinguono le voci; i totali sono allineati.
- [ ] Non mancano note o footer.

---

## 2. VoiceOver

Ambiente: macOS 27, Safari, VoiceOver attivo con **Cmd+F5**.

- [x] Attiva VoiceOver e apri la produzione in Safari.
- [x] **VO+U** → Rotore **Titoli**: l’ordine è sensato e parte da “Nuovo preventivo” / “Configura LayerCost”.
- [x] Rotore **Punti di riferimento**: “Navigazione principale” e “Contenuto principale” sono annunciati una sola volta.
- [x] Rotore **Controlli modulo**: ogni campo ha un nome comprensibile; non ci sono “campo di testo” senza etichetta.
- [x] Tab: il primo elemento è “Vai al contenuto”; poi sidebar, titolo, campi del preventivo, pulsanti. Shift+Tab torna indietro nello stesso ordine.
- [x] Su un campo numerico VoiceOver legge **etichetta, valore e unità** (es. “Grammi materiale 1, 100, grammi”).
- [x] Con il tempo a 0, “Salva preventivo” è annunciato come non disponibile/dimmed; inserendo 10 h diventa disponibile.
- [x] Con grammi > 0, premi “Nuovo”: VoiceOver annuncia **“Iniziare un nuovo preventivo?”**, la descrizione e i pulsanti; **Esc** chiude e il focus torna su “Nuovo”.
- [x] Nel dettaglio, la tabella delle righe viene annunciata con le intestazioni di colonna; il prezzo totale e la composizione sono comprensibili.
- [x] In tema scuro etichette, focus e ordine restano corretti; l’anteprima di stampa resta chiara.
- [x] Annota ogni annuncio confuso, duplicato o controllo senza nome, indicando schermata ed elemento.

---

## 3. Google OAuth (EVO-1)

Da eseguire solo dopo aver configurato Google in Supabase e impostato `VITE_AUTH_GOOGLE_ENABLED=true`. Usare account di test o i due account reali **solo per un login non distruttivo**.

- [x] La pagina `/#/login` mostra “Continua con Google” sopra il form email/password.
- [x] Il click porta al consenso Google; l'URL di ritorno è `https://layercost.vercel.app/?code=...` (query string, non fragment).
- [x] Dopo il consenso si torna all'app, la sessione è attiva e il workspace mostra gli stessi preventivi.
- [x] Ricarica: la sessione resta; “Esci” funziona e riporta al login.
- [x] Email/password continua a funzionare con lo stesso account.
- [x] Impostazioni → Sincronizzazione mostra “Google collegato” se l'identità è presente; altrimenti “Collega Google” funziona.
- [x] Un'email Google non pre-creata viene rifiutata con il messaggio “Questo account Google non è autorizzato…” e non crea utenti.
- [x] Annullando il consenso si torna al login con “Accesso con Google annullato.”
- [x] La console non mostra errori e non ci sono richieste oltre a Supabase e Google.

---

## 4. Profilo e tag attività (EVO-7)

Da eseguire in uno spazio condiviso con due account.

- [x] **Impostazioni → Profilo** mostra `Nome visibile` con il nome precompilato da Google o dalla parte locale dell’email.
- [x] Salva un nome nuovo: compare “Nome aggiornato.” e il campo conserva il valore dopo il reload.
- [x] Nella lista **Preventivi** ogni riga mostra “Creato da …” e “Ultima modifica di …” con la data.
- [x] Per l’utente corrente i tag mostrano “te”; per l’altro membro mostrano il nome visibile.
- [x] Il dettaglio del preventivo mostra il nome visibile nella sezione **Workspace condiviso**.
- [x] Dopo una modifica dell’altro account e un sync, il nome nei tag si aggiorna senza ricaricare l’app.
- [x] In uno spazio personale o in modalità ospite i tag non compaiono.
- [x] L’email completa non compare nei tag; resta visibile solo agli owner nella gestione dello spazio.

---

## 5. Esito

Compila e allega alla PR o a una nota in `STATUS.md`:

| Prova                         | Esito | Note |
| ----------------------------- | ----- | ---- |
| Safari: calcolo e salvataggio | OK    | 02/11/2026 |
| Safari: tema scuro            | OK    | 02/11/2026 |
| Safari: stampa/PDF            | OK    | 02/11/2026 |
| Safari: link condiviso        | OK    | 02/11/2026 |
| Google: login e reload        | OK    | verificato in produzione |
| Google: fallback email        | OK    | E2E e verifica di produzione |
| Google: annullamento/errore   | OK    | E2E |
| Profilo: salvataggio nome     | OK    | verificato in produzione |
| Tag attività in lista/dettaglio | OK  | verificato in produzione |
| Sync nome tra due account     | OK    | E2E sync e verifica di produzione |
| VoiceOver: titoli e landmark  | OK    | 02/11/2026 |
| VoiceOver: form e tab order   | OK    | 02/11/2026 |
| VoiceOver: modale bozza       | OK    | 02/11/2026 |
| Stampa fisica (opzionale)     |       | non eseguita |

Se qualcosa fallisce, apri una issue con:

- versione di macOS e Safari;
- schermata e elemento;
- passi per riprodurre;
- cosa annuncia VoiceOver e cosa ti aspettavi.

Le prove automatiche restano la fonte principale: 298 unitari, 90 E2E (68 passati, 22 saltati) più 2 nello stato senza endpoint, 91 asserzioni pgTAP, axe su tutte le route, PDF A4 valido e regressione visiva su 42 schermate.
