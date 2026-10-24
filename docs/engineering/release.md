# Release v1.0.0

**Data:** 24 ottobre 2026
**Stato:** rilasciata
**Tag:** `v1.0.0`
**Commit di release:** `cc949b3`
**Deploy:** https://layercost.vercel.app

---

## 1. Scope

LayerCost 1.0 è la prima release stabile: SPA statica e local-first per calcolare costo e prezzo di stampe 3D singole o a lotti, con due stampanti reali (Kobra 3 e Kobra X con ACE 2 Pro).

Include:

- motore di costo e prezzo con unità intere e formule documentate;
- calcolatore singola stampa/lotto, confronto stampanti, storico con snapshot;
- configurazione di stampanti, materiali, tariffe energia, extra e impostazioni;
- export/import JSON, link condivisibile, stampa/PDF;
- direzione visiva **Strato** (ADR-0015) e design system;
- tema Sistema/Chiaro/Scuro (ADR-0016), stampa sempre chiara;
- stati completi: bozza protetta, eliminazioni con modale, alert di successo, vuoti con azione.

Non include, per scelta di scope: backend, account, sincronizzazione, analytics, import diretto da slicer, magazzino bobine, PWA e interfaccia in inglese.

---

## 2. Checklist di release

- [x] `npm run check` verde (typecheck, lint, 42 test, build, budget).
- [x] `npm run test:e2e` verde (18 test Playwright, WebKit incluso).
- [x] Audit `axe` WCAG 2.2 AA su tutte le route, tema chiaro e scuro.
- [x] Verifica cross-browser su WebKit: calcolo, salvataggio, reload, link condiviso, tema.
- [x] Stampa/PDF A4 verificata su Chromium, anche partendo dal tema scuro.
- [x] Regressione visiva con baseline Linux a 1440, 768 e 390 px.
- [x] Budget del bundle rispettato e nessuna richiesta esterna.
- [x] `CHANGELOG.md` aggiornato alla versione 1.0.0.
- [x] `TASKS.md`, `STATUS.md` e `PLAN.md` aggiornati.
- [x] Versione `package.json` portata a 1.0.0.
- [x] Tag `v1.0.0` creato e pushato.
- [x] Deploy Vercel di produzione verificato.
- [ ] Prova manuale su una stampante fisica (consigliata, non bloccante).

---

## 3. Verifiche eseguite

| Verifica            | Comando / strumento         | Esito                                  |
| ------------------- | --------------------------- | -------------------------------------- |
| TypeScript strict   | `npm run typecheck`         | verde                                  |
| Lint                | `npm run lint`              | verde                                  |
| Test unitari e dati | `npm run test`              | 42 superati                            |
| Build produzione    | `npm run build`             | ~509 KB JS, ~34 KB CSS, ~58 KB font    |
| Budget bundle       | `npm run budget`            | 206 KB gzip totali su 350 KB           |
| E2E Chromium        | `npx playwright test`       | 16 test (3 visual inclusi)             |
| E2E WebKit          | progetto `webkit`           | 2 test                                 |
| Accessibilità       | `@axe-core/playwright`      | 25 scansioni, 0 violazioni             |
| Stampa/PDF          | `tests/e2e/release.spec.ts` | PDF A4 valido, token chiari            |
| Richieste esterne   | `tests/e2e/release.spec.ts` | nessuna                                |
| Regressione visiva  | `tests/e2e/visual.spec.ts`  | 15 screenshot, baseline Linux          |
| Gate visivo         | `inspect.mjs --app`         | 0 FAIL, 1 WARN motivato (`ragged-row`) |
| Deploy              | Vercel produzione           | HTTP 200, build `index-C_5bQZYu.js`    |

### Deploy di produzione (24/10/2026)

- URL: https://layercost.vercel.app; commit `cc949b3`, tag `v1.0.0`.
- Asset serviti: `index-C_5bQZYu.js` e `index-BGmXv2w6.css`, identici alla build locale.
- Prezzo verificato con 10 h e 100 g di PLA: **3,70 €**.
- Salvataggio: alert “Preventivo salvato” presente, assente dopo reload.
- Tema scuro: `data-theme="dark"` prima e dopo il reload.
- Stampa: PDF A4 di 99 KB, fondo bianco e testo nero anche partendo dal tema scuro.
- Errori JavaScript durante la verifica: nessuno.

---

## 4. Accessibilità

L'audit `axe` copre le route:

- calcolatore, preventivi, dettaglio preventivo;
- condivisione non valida, pagina non trovata;
- stampanti, materiali, tariffe, extra, impostazioni, confronto;
- menu mobile aperto e modali di conferma (bozza e reset).

Tag verificati: WCAG 2.0 A/AA, WCAG 2.1 A/AA, WCAG 2.2 AA. Zero violazioni in tema chiaro e scuro.

Correzione inclusa nella release: i contenitori di tabella con scroll orizzontale hanno `role="region"`, un nome accessibile e `tabIndex={0}`, così sono raggiungibili da tastiera anche a 390 px.

Restano verifiche manuali consigliate con uno screen reader reale (VoiceOver/NVDA), non automatizzabili in modo affidabile.

---

## 5. Cross-browser e stampa

- **Chromium:** flusso completo, PDF A4, token di stampa chiari anche con tema scuro.
- **WebKit:** calcolo, salvataggio, reload, link condiviso, cambio tema e `@media print`.
- **Safari reale e stampante fisica:** non automatizzati. La release è verificata sull'engine WebKit e sul PDF; una prova su carta resta consigliata.

La stampa usa sempre fondo bianco e testo nero, nasconde la navigazione e mantiene la composizione del costo in grigi.

---

## 6. Performance

Budget automatico in `scripts/check-budget.mjs`, eseguito da `npm run check`:

| Voce       | Misura        | Limite |
| ---------- | ------------- | ------ |
| JavaScript | 141,9 KB gzip | 200 KB |
| CSS        | 7,3 KB gzip   | 20 KB  |
| Font WOFF2 | 56,8 KB gzip  | 120 KB |
| HTML       | 0,5 KB gzip   | 4 KB   |
| Totale     | 206,0 KB gzip | 350 KB |

La build Vite riporta ~146,6 KB gzip per il JS e ~7,6 KB per il CSS: la differenza è dovuta al metodo di compressione dello script di budget. Entrambe le misure restano sotto i limiti.

Nessuna richiesta di rete oltre agli asset statici same-origin: il test `l'app non chiama servizi esterni` fallisce se compare un host diverso da `127.0.0.1`.

---

## 7. Limiti noti

- Nessuna sincronizzazione cloud, account o backup remoto.
- Nessun import diretto da slicer o da presa intelligente.
- Nessun magazzino bobine né confronto actual/estimated.
- Migrazioni schema minime: le versioni future vengono rifiutate.
- Baseline visuali generate su Linux: i test visuali girano in CI, non su macOS.
- Prova manuale su stampante fisica e screen reader reale consigliata.

---

## 8. Procedura di rilascio

```bash
npm run check
npm run test:e2e
npm version 1.0.0 --no-git-tag-version   # solo se la versione cambia
git add -A
git commit -m "chore(release): prepare v1.0.0"
git push origin main
git tag -a v1.0.0 -m "LayerCost v1.0.0"
git push origin v1.0.0
```

Dopo il deploy:

1. aprire https://layercost.vercel.app e verificare la home;
2. calcolare 10 h + 100 g di PLA e controllare il prezzo (3,70 € con il seed);
3. salvare, ricaricare e verificare che l'alert non si ripeta;
4. aprire un link condiviso in una finestra privata;
5. stampare o salvare in PDF dal dettaglio;
6. controllare che il tema scuro resti tale al reload e che la stampa sia chiara.

Per le baseline visuali:

```bash
gh workflow run visual-baselines.yml --ref main
# scaricare l'artifact e committare tests/e2e/visual.spec.ts-snapshots/
```

---

## 9. Rollback

- **Vercel:** promuovere a produzione il deployment precedente dalla dashboard.
- **Git:** `git revert` del commit di release o checkout del tag precedente.
- **Dati:** importare il backup JSON esportato prima dell'aggiornamento. La release non cambia schema, `engineVersion` o semantica dei preventivi.

---

## 10. Dopo la release

- Raccogliere feedback reale sulle due stampanti e sui valori di seed.
- Pianificare il backlog di fase 5 con un ADR per ogni voce.
- Valutare un audit con screen reader e una prova su stampante fisica.
- Aggiornare le baseline visuali solo con una modifica intenzionale dell'interfaccia.
