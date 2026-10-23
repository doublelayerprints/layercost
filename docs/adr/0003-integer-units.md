# ADR-0003 — Unità intere e arrotondamenti deterministici

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

I costi si sommano, si moltiplicano per percentuali e si arrotondano. Usare float per il denaro produce differenze di centesimi difficili da spiegare e da testare.

### Decisione

Nel dominio:

- denaro in micro-euro interi (µ€);
- percentuali in basis point interi (bp);
- tempo in secondi interi;
- massa in centigrammi interi (cg);
- potenza in watt interi;
- prezzi energia in µ€/kWh interi;
- prezzi materiale in µ€/kg interi.

Arrotondamento `roundHalfUp`; componenti arrotondati al µ€ prima della somma; prezzo finale arrotondato a un passo in centesimi; allocazioni con il metodo dei resti più grandi. Le formule sono in `docs/domain/cost-model.md`.

### Alternative considerate

- **Float:** semplice ma non deterministico.
- **`decimal.js`:** corretto, ma dipendenza e API più pesanti del necessario.
- **Dinero.js:** ottimo per il denaro, meno per grammi e secondi; aggiunge un modello non necessario.

### Conseguenze

- Risultati riproducibili e testabili al µ€.
- La UI deve convertire input/output; serve disciplina.
- I limiti di validazione evitano overflow.
- Ogni nuova formula deve dichiarare l'ordine di arrotondamento.

---
