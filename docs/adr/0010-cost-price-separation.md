# ADR-0010 — Costo e prezzo separati; UI italiana

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

L'utente vuole prima il costo di produzione, ma anche la possibilità di ottenere un prezzo per hobby o vendita. Mescolare costo, margine e IVA rende i numeri opachi. L'utente e la documentazione sono italiani; il codice trae vantaggio da identificatori inglesi.

### Decisione

- Il motore calcola il **costo**.
- Un livello separato applica **ricarico o margine**, sconto, arrotondamento e IVA.
- La UI e la documentazione sono in italiano; codice, tipi, funzioni e commenti tecnici in inglese.
- I termini tecnici (markup, margin, flush, snapshot) restano in inglese quando sono più precisi.

### Alternative considerate

- **Solo costo:** non soddisfa l'uso commerciale futuro.
- **Prezzo euristico (3× materiale):** semplicistico e incoerente con l'usura.
- **UI inglese:** meno utile per l'utente principale.

### Conseguenze

- Due livelli con responsabilità chiare.
- Possibilità di mostrare costo e prezzo affiancati.
- Documentazione leggibile dall'utente, codice leggibile da un agente internazionale.
- Eventuale localizzazione futura richiede l'estrazione delle stringhe.

---
