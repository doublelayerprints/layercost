# EVO-10 — Seed localizzati

**Stato:** pianificato il 05/11/2026 · ADR-0036

---

## 1. Obiettivo

I dati di partenza (tariffa, stampanti, materiali, extra) nascono nella lingua della
sessione: un visitatore inglese vede «Zip bag», «Current tariff», fornitore «Generic».
IDs e valori economici sono identici in entrambe le lingue; i dati esistenti non
vengono mai rinominati.

## 2. Perimetro

- **In:** `createSeedConfig(locale)` con copy IT/EN (~20 stringhe), `createInitialData`
  e il boot dell'app passano la lingua di sessione, test unitari + 1 E2E, documenti.
- **Out:** `Settings.locale` resta `'it-IT'` (ADR-0036 §2.4); catalogo stampanti già
  localizzato (`LocalizedText`); nessuna migrazione, nessun rinominamento di dati
  esistenti, nessuna nuova chiave i18n (i nomi di seed sono dati, non copia).

## 3. Task

| Task | Cosa | Accettazione |
|---|---|---|
| T10.1 | `SEED_COPY` IT/EN in `seed.ts`; factories per lingua | valori e ID identici, nomi localizzati; default `'it'` |
| T10.2 | `createInitialData(locale = loadLocalePreference())`; boot app-store con lingua di sessione | nuovo workspace cloud/locale nasce nella lingua giusta |
| T10.3 | Test: IT invariato, EN localizzato, ID stabili, default di sessione | unitari verdi |
| T10.4 | E2E: sessione EN → pagina Extra mostra «Zip bag»/«Shipping» | e2e verde |
| T10.5 | `npm run check` + docs + PR | verde; merge e verifica |

## 4. Esiti

### §4.1 T10.1–T10.3 — 05/11/2026

- `seed.ts`: `SEED_COPY` (tariffa, note stampanti e profili potenza, note materiali,
  fornitore, nomi e categorie extra) in IT/EN; `createSeedConfig(locale = 'it')`;
  `seedIds` letterale con gli stessi ID; export `seedSettings` rimosso (nessun
  utilizzatore esterno).
- `createInitialData(locale = loadLocalePreference())` in `storage.ts`;
  `app-store` costruisce `initialData` con `loadLocalePreference()`.
- Test nuovi in `src/data/seed.test.ts`: default IT invariato, EN localizzato,
  ID stabili tra lingue, `createInitialData` onora la lingua.

### §4.2 T10.4–T10.5 — 05/11/2026

- E2E in `landing.spec.ts`: con preferenza `en` la pagina Extra mostra «Zip bag»,
  «Box», «Shipping» e non «Sacchetto zip».
- `npm run check` verde; PR, merge e verifica a seguire (§4.3).
