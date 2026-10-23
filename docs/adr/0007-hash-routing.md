# ADR-0007 — Hash routing e build statica portabile

**Stato:** Accettato
**Data:** 2026-10-23

### Contesto

Il deploy iniziale è Vercel, ma il progetto deve poter migrare su GitHub Pages, Netlify o Cloudflare Pages senza modifiche. Il routing con path assoluti richiede rewrite server su alcuni hosting.

### Decisione

Usare `HashRouter`. La build Vite usa un `base` configurabile, default `/`. Nessun rewrite server necessario. Vercel è il deploy principale; gli altri restano possibili.

### Alternative considerate

- **History routing + rewrite:** URL più belli, ma configurazione per hosting e rischio di 404.
- **Next.js routing:** non necessario.

### Conseguenze

- URL con `#`, accettabile per un'app privata.
- Portabilità completa.
- Nessun problema di refresh o link diretti.
- SEO non rilevante.

---
