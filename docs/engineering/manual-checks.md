# Verifiche manuali post-release

**Release:** v1.0.0 (`cc949b3`)
**Quando:** dopo il deploy di produzione, su un Mac con Safari e VoiceOver.
**Tempo stimato:** 10–15 minuti.

Le verifiche automatiche coprono già axe, WebKit, PDF A4, regressione visiva e budget. Questa checklist serve a confermare i due punti che richiedono un dispositivo e un lettore di schermo reali.

---

## 1. Safari reale

Ambiente: macOS 27, Safari 27, https://layercost.vercel.app.

- [ ] Apri la produzione in una **finestra privata** di Safari.
- [ ] La home mostra “Nuovo preventivo”, la guida “Configura LayerCost” e nessuno scroll orizzontale a larghezza normale.
- [ ] Attiva **Sviluppo → Modalità responsive design** e controlla 390 px: nessun taglio, menu “Menu” apribile e chiudibile.
- [ ] Inserisci **10 h** e **100 g** di PLA: il prezzo totale è **3,70 €**.
- [ ] Il campo Data mostra il formato italiano (`24/10/2026`) e non quello americano.
- [ ] Tab da tastiera: nome, data, cliente, stampante, quantità, tempo, grammi, extra, “Salva preventivo”; il focus è sempre visibile.
- [ ] Salva: si apre il dettaglio, compare “Preventivo salvato”.
- [ ] Ricarica: il preventivo resta, l’alert non si ripete.
- [ ] Impostazioni → Aspetto → **Scuro**: il tema cambia subito e resta dopo il reload; torna a **Chiaro**.
- [ ] Dettaglio preventivo → **Cmd+P**: l’anteprima è **fondo bianco e testo nero**, senza sidebar né pulsanti; intestazione, righe, composizione del costo, totali e note sono leggibili.
- [ ] Salva il PDF e controlla che non ci siano righe tagliate o colonne sovrapposte.
- [ ] Apri “Condividi”, copia il link, aprilo in una finestra privata: il preventivo si vede e “Importa nel mio archivio” funziona.
- [ ] **Sviluppo → Mostra console JavaScript**: nessun errore rosso durante il flusso.

### Prova su carta (opzionale)

- [ ] Stampa il PDF su A4.
- [ ] Il testo piccolo (8–9 pt) è leggibile; i grigi dello stack distinguono le voci; i totali sono allineati.
- [ ] Non mancano note o footer.

---

## 2. VoiceOver

Ambiente: macOS 27, Safari, VoiceOver attivo con **Cmd+F5**.

- [ ] Attiva VoiceOver e apri la produzione in Safari.
- [ ] **VO+U** → Rotore **Titoli**: l’ordine è sensato e parte da “Nuovo preventivo” / “Configura LayerCost”.
- [ ] Rotore **Punti di riferimento**: “Navigazione principale” e “Contenuto principale” sono annunciati una sola volta.
- [ ] Rotore **Controlli modulo**: ogni campo ha un nome comprensibile; non ci sono “campo di testo” senza etichetta.
- [ ] Tab: il primo elemento è “Vai al contenuto”; poi sidebar, titolo, campi del preventivo, pulsanti. Shift+Tab torna indietro nello stesso ordine.
- [ ] Su un campo numerico VoiceOver legge **etichetta, valore e unità** (es. “Grammi materiale 1, 100, grammi”).
- [ ] Con il tempo a 0, “Salva preventivo” è annunciato come non disponibile/dimmed; inserendo 10 h diventa disponibile.
- [ ] Con grammi > 0, premi “Nuovo”: VoiceOver annuncia **“Iniziare un nuovo preventivo?”**, la descrizione e i pulsanti; **Esc** chiude e il focus torna su “Nuovo”.
- [ ] Nel dettaglio, la tabella delle righe viene annunciata con le intestazioni di colonna; il prezzo totale e la composizione sono comprensibili.
- [ ] In tema scuro etichette, focus e ordine restano corretti; l’anteprima di stampa resta chiara.
- [ ] Annota ogni annuncio confuso, duplicato o controllo senza nome, indicando schermata ed elemento.

---

## 3. Esito

Compila e allega alla PR o a una nota in `STATUS.md`:

| Prova                         | Esito | Note |
| ----------------------------- | ----- | ---- |
| Safari: calcolo e salvataggio |       |      |
| Safari: tema scuro            |       |      |
| Safari: stampa/PDF            |       |      |
| Safari: link condiviso        |       |      |
| VoiceOver: titoli e landmark  |       |      |
| VoiceOver: form e tab order   |       |      |
| VoiceOver: modale bozza       |       |      |
| Stampa fisica (opzionale)     |       |      |

Se qualcosa fallisce, apri una issue con:

- versione di macOS e Safari;
- schermata e elemento;
- passi per riprodurre;
- cosa annuncia VoiceOver e cosa ti aspettavi.

Le prove automatiche restano la fonte principale: 42 unitari, 18 E2E, 25 scansioni axe, PDF A4 valido e regressione visiva su 15 schermate.
