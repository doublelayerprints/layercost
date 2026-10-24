# Changelog

## [Unreleased]

### Added

- Direzione visiva **A — Strato** (ADR-0015) e specifiche in `docs/design/directions.md`.
- Design system Strato: token, font Archivo + Source Serif 4 self-hosted, componenti, stack dei costi, focus e stampa.
- Test design: 21 unitari, 5 E2E, inspector 0 FAIL/1 WARN motivato.

### Changed

- Tariffa energia di default: **€0,20/kWh** (era €0,25/kWh).
- Manutenzione di default: **€0,01/h** per Kobra 3 e Kobra X (era €0,03/h).

Formato basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e [SemVer](https://semver.org/).

## [0.1.0] — 2026-10-23

### Added

- Motore di calcolo puro: materiale, energia, ammortamento, manutenzione, manodopera, extra, riserva guasti.
- Prezzo con ricarico/margine, sconto, arrotondamento e IVA opzionale.
- Allocazione dei costi fissi e dei prezzi di riga con resti più grandi.
- Configurazione di stampanti, materiali, tariffe energia con storico, extra e impostazioni.
- Seed per Anycubic Kobra 3 e Kobra X con ACE 2 Pro.
- Calcolatore singola stampa e lotto, con più materiali per riga e override.
- Confronto tra due stampanti.
- Preventivi salvati con snapshot completo, storico, duplicazione, aggiornamento prezzi e archiviazione.
- Export/import JSON, reset, backup automatico prima dell'import.
- Link condivisibile compresso, import nel proprio archivio.
- Stampa/PDF tramite stylesheet dedicato.
- Formattazione italiana, layout responsive, focus e label di base.
- Test: 16 unitari/dati + 3 E2E.
- CI GitHub Actions verde (`check` + `e2e`), configurazione Vercel, documentazione completa e 14 ADR.
- Repo GitHub `doublelayerprints/layercost` (privata).
- Deploy Vercel live su https://layercost.vercel.app.

### Known limitations

- Design definitivo non ancora realizzato.
- Nessuna sincronizzazione cloud.
- Nessun import diretto da slicer o presa intelligente.
- Nessun audit automatico di accessibilità.
