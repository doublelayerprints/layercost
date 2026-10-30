import type { landingIt } from '../it/landing'

export const landingEn: Record<keyof typeof landingIt, string> = {
  'landing.meta.title': 'LayerCost — The real cost of 3D prints',
  'landing.meta.description':
    'Calculate the cost and price of 3D prints with materials, energy, wear, labor, discounts and VAT. Local-first, no account required.',

  'landing.nav.features': 'Features',
  'landing.nav.how': 'How it works',
  'landing.nav.privacy': 'Privacy',
  'landing.nav.faq': 'FAQ',
  'landing.nav.open': 'Open the calculator',

  'landing.hero.title': 'The real cost of 3D prints.',
  'landing.hero.body':
    'LayerCost adds up materials, energy, wear and labor, then applies markup, discounts and VAT. All in your browser, with your numbers.',
  'landing.hero.note': 'No account required. Data stays in your browser.',
  'landing.hero.imageAlt':
    'The LayerCost calculator with a 100 gram print: print lines on the left, the summary with full cost, profit and net price on the right.',
  'landing.hero.imageCaption': 'The real LayerCost interface, with the starting values.',

  'landing.features.title': 'Everything the price needs.',
  'landing.features.body':
    'Six things a spreadsheet does not do by itself. Each one starts from a number you already have: grams, hours, filament price.',
  'landing.features.column.layerCost': 'LayerCost',
  'landing.features.column.spreadsheet': 'A spreadsheet',
  'landing.features.column.feature': 'Capability',
  'landing.features.tableCaption': 'LayerCost compared with a spreadsheet',

  'landing.features.engine.name': 'Cost engine',
  'landing.features.engine.body':
    'Material, energy, wear, labor and risk all enter the same full cost.',
  'landing.features.engine.layerCost': 'Yes, with the documented formula.',
  'landing.features.engine.spreadsheet': 'Formulas rebuilt by hand.',

  'landing.features.multi.name': 'Multi-material',
  'landing.features.multi.body':
    'Several filaments in the same line, with grams and price per material.',
  'landing.features.multi.layerCost': 'Yes, several materials per line.',
  'landing.features.multi.spreadsheet': 'One line per material, then sum.',

  'landing.features.quotes.name': 'Quotes',
  'landing.features.quotes.body':
    'Price snapshots, editing until sending, duplication and archiving.',
  'landing.features.quotes.layerCost': 'Yes, with frozen prices.',
  'landing.features.quotes.spreadsheet': 'Copies that change price.',

  'landing.features.import.name': '.3mf import',
  'landing.features.import.body':
    'Plates, times and grams already read by the slicer go into the quote.',
  'landing.features.import.layerCost': 'Yes, with a plate preview.',
  'landing.features.import.spreadsheet': 'Numbers typed again.',

  'landing.features.export.name': '.xlsx and PDF export',
  'landing.features.export.body':
    'Three Excel sheets for external analysis and an A4 PDF for the customer.',
  'landing.features.export.layerCost': 'Yes, all locally.',
  'landing.features.export.spreadsheet': 'Copy, paste, lay out.',

  'landing.features.compare.name': 'Printer comparison',
  'landing.features.compare.body':
    'Kobra 3 and Kobra X on the same job, with the difference in euros.',
  'landing.features.compare.layerCost': 'Yes, without touching the draft.',
  'landing.features.compare.spreadsheet': 'Two separate sheets.',

  'landing.showcase.title': 'From calculation to customer.',
  'landing.showcase.body':
    'A saved quote keeps the prices it was created with. The customer view shows only prices, VAT and notes. The internal print keeps costs, profit and composition for you.',
  'landing.showcase.imageAlt':
    'The detail of a LayerCost quote with net price, cost composition and print lines.',
  'landing.showcase.caption':
    'Saved quote: frozen prices, lines and cost composition.',

  'landing.steps.title': 'Three steps, no spreadsheet.',
  'landing.steps.body': 'From the sliced file to the price you send the customer.',
  'landing.steps.one.lead': 'Choose.',
  'landing.steps.one.body':
    'Kobra 3 or Kobra X, PLA or PETG. Starting values are ready and stay editable at any time.',
  'landing.steps.one.imageAlt':
    'The .3mf import window with plates, times and grams read from the slicer.',
  'landing.steps.one.caption': '.3mf import: plates, times and grams.',
  'landing.steps.two.lead': 'Enter.',
  'landing.steps.two.body':
    'Use the slicer total grams and print time. Supports, purge and prime tower are already included: do not add supplements.',
  'landing.steps.three.lead': 'Read.',
  'landing.steps.three.body':
    'See the full cost, profit and composition. Save the quote, export to Excel or share the customer view.',
  'landing.steps.three.imageAlt':
    'The shared view of a LayerCost quote with prices, VAT and notes, without internal costs.',
  'landing.steps.three.caption': 'Customer view: prices, VAT and notes.',

  'landing.demo.title': 'Try it with your numbers.',
  'landing.demo.body':
    'An example with Kobra 3 and PLA, 30% markup and no VAT. Change grams and hours: cost and price update.',
  'landing.demo.grams': 'Grams',
  'landing.demo.gramsHint': 'Slicer total, supports included.',
  'landing.demo.hours': 'Print hours',
  'landing.demo.hoursHint': 'Slicer time.',
  'landing.demo.cost': 'Full cost',
  'landing.demo.price': 'Net price',
  'landing.demo.gain': 'Profit',
  'landing.demo.note': 'Example with the starting values. Your numbers change everything.',
  'landing.demo.invalid': 'Enter grams and hours greater than zero.',
  'landing.demo.compositionAria': 'Net price split into full cost and profit.',
  'landing.demo.open': 'Open the calculator',

  'landing.privacy.title': 'Your numbers stay yours.',
  'landing.privacy.body':
    'LayerCost has no mandatory backend. The calculator and quotes live in your browser; the cloud is an extra for those who ask for it.',
  'landing.privacy.account.title': 'No account to start',
  'landing.privacy.account.body':
    'Open the calculator and work. The account is only for optional sync.',
  'landing.privacy.data.title': 'Data in your browser',
  'landing.privacy.data.body':
    'Configuration and quotes live in localStorage. Clearing browser data deletes them: the backup is the external copy.',
  'landing.privacy.backup.title': 'Back up when you want',
  'landing.privacy.backup.body':
    'Export a complete JSON, import it into another browser or keep it outside the app.',
  'landing.privacy.tracking.title': 'No analytics',
  'landing.privacy.tracking.body':
    'No tracking cookies, no advertising. The only external call is the access request, and only if you send it.',

  'landing.sync.title': 'Elsewhere, if you want.',
  'landing.sync.body':
    'The cloud is free, requested and approved by hand. There is no self sign-up and it is not required to use the calculator.',
  'landing.sync.request.title': 'Request access',
  'landing.sync.request.body':
    'Fill in the form with your email. The request does not create an account.',
  'landing.sync.approve.title': 'Wait for approval',
  'landing.sync.approve.body':
    'The administrator reads the request and creates the user manually.',
  'landing.sync.signin.title': 'Sign in with Google or email',
  'landing.sync.signin.body':
    'Google is the fastest route; email and password stay available.',
  'landing.sync.find.title': 'Find everything again',
  'landing.sync.find.body':
    'Configuration and quotes live in the shared workspace, with backups and explicit conflicts.',
  'landing.sync.note': 'Supabase free plan, EU region. The cloud is optional.',

  'landing.faq.title': 'Questions before you start.',
  'landing.faq.account.question': 'Do I need an account?',
  'landing.faq.account.answer':
    'No. The calculator, quotes and exports work without an account. The account is only for optional cloud sync.',
  'landing.faq.cost.question': 'How much does it cost?',
  'landing.faq.cost.answer':
    'The calculator is free. The cloud uses the Supabase free plan and is activated only after the request is approved. There are no subscriptions.',
  'landing.faq.data.question': 'Where is the data?',
  'landing.faq.data.answer':
    'Without an account, in your browser (localStorage). With an account, in the shared workspace on Supabase in the EU region. You can export a JSON backup at any time.',
  'landing.faq.devices.question': 'Can I use it on more devices?',
  'landing.faq.devices.answer':
    'Yes, with the cloud account: configuration and quotes align in the workspace. Without an account, export the JSON backup and import it on the other device.',
  'landing.faq.access.question': 'How do I request access?',
  'landing.faq.access.answer':
    'Open the Request access page, enter your email and consent. The administrator creates the account manually: there is no self sign-up and no automatic confirmation email.',

  'landing.cta.title': 'Put in your numbers.',
  'landing.cta.body':
    'Open the calculator with the starting values, then replace prices, power and useful life with yours.',
  'landing.cta.note': 'No account required.',

  'landing.footer.product': 'Product',
  'landing.footer.app': 'App',
  'landing.footer.preferences': 'Preferences',
  'landing.footer.privacyNote':
    'No analytics and no cookies. App data stays in your browser; the cloud is optional.',
  'landing.footer.dataTitle': 'Data and privacy',
  'landing.footer.dataNote': 'No analytics, no cookies. Only the data you enter.',
  'landing.footer.description': 'Local-first calculator for 3D prints.',
}
