# ADR — Indice

Le decisioni architetturali di LayerCost. Un ADR accettato non si riscrive: se cambia la decisione, se ne aggiunge uno nuovo che supersede il precedente.

| ID   | Decisione                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 0001 | [App statica local-first, senza backend in v1](0001-static-local-first.md)                                      |
| 0002 | [React + Vite + TypeScript](0002-react-vite-typescript.md)                                                      |
| 0003 | [Unità intere e arrotondamenti deterministici](0003-integer-units.md)                                           |
| 0004 | [Preventivi come snapshot immutabili](0004-quote-snapshots.md)                                                  |
| 0005 | [Energia da potenza media per famiglia, non da potenza nominale](0005-average-power.md)                         |
| 0006 | [Grammi dello slicer = totale, nessun supplemento AMS automatico](0006-slicer-totals.md)                        |
| 0007 | [Hash routing e build statica portabile](0007-hash-routing.md)                                                  |
| 0008 | [Archiviare, non cancellare, le entità referenziate](0008-archive-instead-of-delete.md)                         |
| 0009 | [Dominio puro e separato dalla UI](0009-pure-domain.md)                                                         |
| 0010 | [Costo e prezzo separati; UI italiana](0010-cost-price-separation.md)                                           |
| 0011 | [Documentazione normativa e ADR](0011-normative-docs.md)                                                        |
| 0012 | [Nessuna libreria di componenti prima del design](0012-no-ui-library.md)                                        |
| 0013 | [oxlint al posto di ESLint in v0.1](0013-oxlint.md)                                                             |
| 0014 | [Snapshot completo e prezzi di riga al netto IVA](0014-full-snapshot-net-line-prices.md)                        |
| 0015 | [Direzione visiva: Strato](0015-direzione-visiva.md)                                                            |
| 0016 | [Dark mode in v1](0016-dark-mode.md)                                                                            |
| 0017 | [Import diretto da slicer: `.3mf`](0017-3mf-import.md)                                                          |
| 0018 | [Sincronizzazione cloud opzionale e gratuita, richiesta](0018-cloud-sync-free.md) — superseded in parte da 0024 |
| 0019 | [Interfaccia inglese con italiano predefinito](0019-english-ui.md)                                              |
| 0020 | [Preventivi modificabili fino all'invio](0020-editable-quotes.md)                                               |
| 0021 | [Accento viola](0021-accent-violet.md)                                                                          |
| 0022 | [Vista interna e vista cliente del preventivo](0022-internal-customer-quote-views.md)                           |
| 0023 | [Sconti di riga e di preventivo, percentuali o a importo fisso](0023-line-and-quote-discounts.md)               |
| 0024 | [Cloud opzionale con Supabase, account email/password e workspace condiviso](0024-supabase-auth-workspace.md)   |
| 0025 | [Google OAuth come provider aggiuntivo](0025-google-oauth.md)                                                   |
| 0026 | [Pagina pubblica “Richiedi accesso” con Formspree Free](0026-request-access-formspree.md)                       |
| 0027 | _(riservato a EVO-2 — tetti utenti/preventivi)_                                                                 |
| 0028 | [Spazi separati: multi-workspace con membership molti-a-molti](0028-multi-workspace.md)                         |
| 0029 | [Landing page pubblica, routing `/calculator` e pre-render SEO](0029-public-landing-page.md)                    |
| 0030 | [Documentazione in-app e pagina “Suggerimenti” con Formspree](0030-docs-and-feedback.md)                        |

> **EVO-4** (multi-workspace) è **ADR-0028**, **EVO-5** (landing pubblica) è **ADR-0029**, **EVO-6** (documentazione e suggerimenti) è **ADR-0030**. **EVO-2** (tetti utenti/preventivi) userà **ADR-0027**.

---

## Template

```md
# ADR-000X — Titolo

- Stato: Accettato | Superseded da ADR-000Y
- Data: YYYY-MM-DD
- Contesto
- Decisione
- Alternative considerate
- Conseguenze
```

## Quando scrivere un ADR

- La decisione è costosa da cambiare.
- Ha alternative reali.
- Tocca più parti del progetto.
- Riguarda sicurezza, dati, hosting, dipendenze o formule.

## Deviazioni v0.1

L'implementazione ha introdotto due deviazioni consapevoli dal piano:

- **oxlint** al posto di ESLint (ADR-0013).
- **Snapshot completo della configurazione** e **prezzi di riga al netto IVA** (ADR-0014).

Sono documentate separatamente per non riscrivere gli ADR originali.
