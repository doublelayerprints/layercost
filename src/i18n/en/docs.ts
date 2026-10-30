export const docsEn = {
  'docs.title': 'Documentation',
  'docs.description':
    'A complete guide to LayerCost: setup, calculation, quotes, .3mf import, cloud and backups.',
  'docs.index': 'Guide sections',
  'docs.previous': 'Previous',
  'docs.next': 'Next',
  'docs.pagination': 'Section navigation',
  'docs.related': 'Useful links',
  'docs.feedback.title': 'Something missing?',
  'docs.feedback.body':
    'If the guide does not answer your question, send a suggestion: we can improve this page and the product.',
  'docs.feedback.action': 'Send a suggestion',

  'docs.primiPassi.label': 'Getting started',
  'docs.primiPassi.title': 'Getting started',
  'docs.primiPassi.intro':
    'LayerCost calculates the cost and price of 3D prints from slicer data. The initial setup is what makes the result trustworthy.',
  'docs.primiPassi.p1':
    'The app runs in the browser and saves data only on this device. Before calculating a print, spend a few minutes on setup: the starting values are estimates and should be adapted to your machines.',
  'docs.primiPassi.p2':
    'You do not need to fill everything in at once. Start with one printer, one material and the energy tariff, calculate your first quote, then complete the rest when needed.',
  'docs.primiPassi.stepsTitle': 'Recommended order',
  'docs.primiPassi.step1':
    'Open Printers and check purchase price, useful life, maintenance and average power.',
  'docs.primiPassi.step2':
    'Open Materials and enter the real price per kg and the spool net weight.',
  'docs.primiPassi.step3':
    'Open Energy tariffs and enter the variable cost per kWh from your contract.',
  'docs.primiPassi.step4': 'Add the Extras you actually use: packaging, labels, shipping.',
  'docs.primiPassi.step5': 'Check Settings: labor, failure rate, markup, rounding and VAT.',
  'docs.primiPassi.step6':
    'Go to the Calculator, enter the slicer time and grams, and save your first quote.',
  'docs.primiPassi.noteTitle': 'Starting values are estimates',
  'docs.primiPassi.note':
    'The two starting printers and materials are there to get you going. Replace prices and consumption with your own data: the result is only as reliable as the data you enter.',
  'docs.primiPassi.imageAlt':
    'LayerCost calculator with a print, the price and the cost breakdown.',
  'docs.primiPassi.imageCaption':
    'The calculator immediately shows full cost, profit and quote price.',
  'docs.primiPassi.linkCalculator': 'Open the calculator',
  'docs.primiPassi.linkPrinters': 'Go to the printer guide',

  'docs.stampanti.label': 'Printers',
  'docs.stampanti.title': 'Configuring printers',
  'docs.stampanti.intro':
    'Every printer has an hourly wear and maintenance cost, an average consumption per material family and an optional energy contract.',
  'docs.stampanti.p1':
    'Open Printers and choose Add printer, or Edit on an existing card. Purchase price, residual value and useful life determine depreciation; maintenance adds a reserve for nozzle, bed, belts and lubricant.',
  'docs.stampanti.p2':
    'Rated power is informational only and does not enter the cost. Energy cost uses average power profiles per family (PLA, PETG, ABS…). If you measured Wh with a smart plug, enter them on the calculator line: measured energy replaces the model.',
  'docs.stampanti.stepsTitle': 'What to check',
  'docs.stampanti.step1': 'Purchase price: the real price paid, including accessories if you want.',
  'docs.stampanti.step2':
    'Residual value and useful life: defaults are 20% and 15,000–20,000 hours, but it depends on the machine.',
  'docs.stampanti.step3':
    'Maintenance: an hourly reserve for wear and spare parts, not the cost of a single repair.',
  'docs.stampanti.step4': 'Startup minutes and average power: startup is added to slicer time.',
  'docs.stampanti.step5':
    'Energy tariff: global or specific, if the printer is in a home with a different contract.',
  'docs.stampanti.noteTitle': 'Multicolor and ACE/AMS',
  'docs.stampanti.note':
    'Multicolor does not change the calculation: slicer grams already include purge, flush and prime tower. Do not add a percentage by hand.',
  'docs.stampanti.imageAlt':
    'List of configured printers with hourly cost, price, useful life and average power.',
  'docs.stampanti.imageCaption':
    'The printer card summarizes wear, maintenance, consumption and energy tariff.',
  'docs.stampanti.linkPrinters': 'Open Printers',

  'docs.materiali.label': 'Materials',
  'docs.materiali.title': 'Configuring materials',
  'docs.materiali.intro':
    'Material is the most variable part of the cost. Enter the price you actually pay and the spool net weight.',
  'docs.materiali.p1':
    'The price per kg is not the list price: include shipping if you paid it. If the spool is not 1 kg, enter the real net filament weight without the spool. LayerCost calculates the price per gram and uses it on each line.',
  'docs.materiali.p2':
    'The family (PLA, PETG, ABS, ASA, TPU, PVA and CF variants) determines the printer power profile. You can override the failure rate for a single material: useful for ABS and ASA on an open frame.',
  'docs.materiali.stepsTitle': 'What to fill in',
  'docs.materiali.step1': 'A recognizable name, for example “White PLA” or “Black PETG Sunlu”.',
  'docs.materiali.step2': 'Material family, for the power profile.',
  'docs.materiali.step3':
    'Price per kg and spool net weight: the price per gram updates automatically.',
  'docs.materiali.step4':
    'Supplier, color and notes are optional; color does not enter the calculation.',
  'docs.materiali.step5':
    'A specific failure rate only if you want to differ from the global value.',
  'docs.materiali.noteTitle': 'Use the slicer total',
  'docs.materiali.note':
    'The grams to enter are the total reported by the slicer: they include supports, brim, purge and prime tower. Do not add the ACE/AMS purge a second time.',
  'docs.materiali.imageAlt':
    'List of materials with family, price per kg, price per gram and spool weight.',
  'docs.materiali.imageCaption':
    'The materials table shows price per kg, price per gram and failure rate at a glance.',
  'docs.materiali.linkMaterials': 'Open Materials',

  'docs.tariffeExtra.label': 'Tariffs and extras',
  'docs.tariffeExtra.title': 'Energy tariffs and extras',
  'docs.tariffeExtra.intro':
    'The energy tariff and extras complete the print cost without changing the wear model.',
  'docs.tariffeExtra.p1':
    'In Energy tariffs enter the variable cost per kWh from your bill, including charges and VAT, and the effective date. Do not use the total bill divided by kWh: fixed costs do not change when you print one more piece. Every quote keeps the tariff used in its snapshot.',
  'docs.tariffeExtra.p2':
    'In Extras add what is added to the print. A “per piece” extra is multiplied by the line quantity; a “per job” extra is applied once to the quote, like shipping. You can archive an extra without deleting it.',
  'docs.tariffeExtra.stepsTitle': 'Examples',
  'docs.tariffeExtra.step1': 'Zip bag or box: per piece.',
  'docs.tariffeExtra.step2': 'Label, magnet or screw: per piece.',
  'docs.tariffeExtra.step3': 'Shipping or batch packaging: per job.',
  'docs.tariffeExtra.step4': 'Film, tape or filling: choose the unit based on how you use it.',
  'docs.tariffeExtra.noteTitle': 'Archive, do not delete',
  'docs.tariffeExtra.note':
    'If a tariff or extra has already been used, archive it instead of deleting it: saved quotes stay readable and future calculations do not depend on missing data.',
  'docs.tariffeExtra.imageAlt':
    'List of energy tariffs with price per kWh, effective date and status.',
  'docs.tariffeExtra.imageCaption':
    'Tariffs have an effective date: the most recent one valid today is used for new calculations.',
  'docs.tariffeExtra.linkTariffs': 'Open Energy tariffs',
  'docs.tariffeExtra.linkExtras': 'Open Extras',

  'docs.calcolare.label': 'Calculating',
  'docs.calcolare.title': 'Calculating a print',
  'docs.calcolare.intro':
    'The calculator is the starting point: one line per print or different piece, with quantity for copies.',
  'docs.calcolare.p1':
    'Enter the time estimated by the slicer and the total grams of material. LayerCost adds the printer startup minutes and per-piece finishing. Choose printer and materials for each line; you can add multiple materials to the same line.',
  'docs.calcolare.p2':
    'Job costs (setup, design, per-job extras) apply once per quote. The price is calculated on full cost; line and quote discounts apply in the order shown in the summary. Advanced overrides are only for when you have better power or energy measurements.',
  'docs.calcolare.stepsTitle': 'Step by step',
  'docs.calcolare.step1': 'Name the quote, check the date and, if needed, enter the customer.',
  'docs.calcolare.step2':
    'Add one line per print or different piece. Duplicate a line when only the quantity changes.',
  'docs.calcolare.step3':
    'Choose printer and quantity; enter slicer time and, if needed, per-piece finishing.',
  'docs.calcolare.step4': 'Enter total grams for each material, as reported by the slicer.',
  'docs.calcolare.step5': 'Add per-piece extras and line discount only if that piece needs them.',
  'docs.calcolare.step6': 'Fill in job costs and choose markup or margin, discount and VAT.',
  'docs.calcolare.step7': 'Check price, full cost and effective margin, then save the quote.',
  'docs.calcolare.noteTitle': 'The draft saves itself',
  'docs.calcolare.note':
    'The draft stays in this browser. “Save quote” adds it to the archive and freezes the prices used at that moment.',
  'docs.calcolare.imageAlt':
    'Filled-in calculator with name, date, one print line and the price summary.',
  'docs.calcolare.imageCaption':
    'The summary on the right stays visible while you fill in lines and job costs.',
  'docs.calcolare.linkCalculator': 'Open the calculator',
  'docs.calcolare.linkImport': 'Import a .3mf file',

  'docs.import3mf.label': '.3mf import',
  'docs.import3mf.title': 'Importing a .3mf file',
  'docs.import3mf.intro':
    'You can import an already sliced .3mf file and turn plates into quote lines without copying time and grams by hand.',
  'docs.import3mf.p1':
    'In the slicer, slice the project and export it as .gcode.3mf (or as .3mf with slicing information). Drag the file into the calculator or use Import .3mf from the header or the Prints section.',
  'docs.import3mf.p2':
    'LayerCost reads the file locally, shows the plates and suggests printer and materials. Select the plates, check the mapping and choose Add to draft or Replace lines. Each plate becomes a line with quantity 1: change the quantity after import if you produce more copies.',
  'docs.import3mf.stepsTitle': 'Procedure',
  'docs.import3mf.step1': 'Open the project in the slicer and make sure it is sliced.',
  'docs.import3mf.step2': 'Export a .gcode.3mf, or a .3mf with slicing information.',
  'docs.import3mf.step3': 'Drag the file into the calculator or use Import .3mf.',
  'docs.import3mf.step4':
    'Select the plates and assign printer and materials if the mapping is not automatic.',
  'docs.import3mf.step5': 'Choose Add or Replace, then check the lines and save the quote.',
  'docs.import3mf.noteTitle': 'Limits and privacy',
  'docs.import3mf.note':
    'The file can be up to 250 MiB compressed and 1 GiB uncompressed. It is read in the browser and never leaves the device. An unsliced project is rejected: open it in the slicer, slice it and export again.',
  'docs.import3mf.imageAlt': '3mf import dialog with the project plates and material mapping.',
  'docs.import3mf.imageCaption':
    'The preview shows the plates found in the file before adding them to the draft.',
  'docs.import3mf.linkCalculator': 'Open the calculator',

  'docs.prezzo.label': 'Price and VAT',
  'docs.prezzo.title': 'Price, discounts and VAT',
  'docs.prezzo.intro':
    'The price starts from full cost, not just material cost. Markup and margin are two alternative ways to set it.',
  'docs.prezzo.p1':
    'Full cost adds direct cost (material, energy, wear, labor, extras, failures) and the share of fixed costs (setup, design, shipping). Choose markup on cost or margin on price: they are not added together and are not equivalent.',
  'docs.prezzo.p2':
    'Line discounts apply to the line total, then the quote discount applies, and finally rounding. VAT is presentation only: no VAT, excluded or included. Effective margin shows what actually remains after discounts and rounding.',
  'docs.prezzo.stepsTitle': 'Checks before saving',
  'docs.prezzo.step1': 'Choose markup or margin and set the percentage.',
  'docs.prezzo.step2': 'Choose rounding up, to nearest or down.',
  'docs.prezzo.step3': 'Set VAT only if you want to show it on the quote.',
  'docs.prezzo.step4': 'Add any line or quote discounts.',
  'docs.prezzo.step5': 'Check effective margin and net price before saving.',
  'docs.prezzo.noteTitle': 'Price below cost',
  'docs.prezzo.note':
    'If the price is below cost, the summary flags it. It is not a blocking error: check discounts, markup and rounding before sending the quote.',
  'docs.prezzo.imageAlt': 'Quote detail with net price, full cost, profit and cost breakdown.',
  'docs.prezzo.imageCaption':
    'The detail separates full cost and profit, so the margin is never hidden.',
  'docs.prezzo.linkCalculator': 'Open the calculator',
  'docs.prezzo.linkSettings': 'Set the default values',

  'docs.preventivi.label': 'Quotes',
  'docs.preventivi.title': 'Quotes, printing and sharing',
  'docs.preventivi.intro':
    'The archive keeps every quote with its inputs, resolved tariffs and engine version. Saved numbers remain valid as history.',
  'docs.preventivi.p1':
    'A saved quote is edited in place and keeps the prices from its first version. After Mark as sent or Mark as completed it is locked: duplicate it to create a copy. Update to current prices creates a recalculated copy with the current configuration.',
  'docs.preventivi.p2':
    'Archiving does not delete: the quote stays readable and can be restored. Delete permanently should only be used for data you no longer need. The list is searchable by name or customer.',
  'docs.preventivi.p3':
    'Standard print is for the customer and shows prices, VAT and notes. Internal print adds costs, breakdown and margin and is marked “Internal use”. Share creates a link with a compressed copy of the quote: whoever receives it can read and import it, but cannot see your configuration.',
  'docs.preventivi.bulletsTitle': 'Main actions',
  'docs.preventivi.item1': 'Search by name or customer and show or hide archived quotes.',
  'docs.preventivi.item2': 'Open the detail to see prices, costs and snapshot.',
  'docs.preventivi.item3': 'Duplicate into the calculator to correct or create a variant.',
  'docs.preventivi.item4': 'Export to Excel for external analysis; JSON remains the full backup.',
  'docs.preventivi.item5': 'Print for the customer or print internally with costs.',
  'docs.preventivi.noteTitle': 'The link is public to whoever receives it',
  'docs.preventivi.note':
    'Anyone with the link can read the quote data. Do not include sensitive data and share it only with people who should see it.',
  'docs.preventivi.imageAlt': 'Quote detail with total price, cost breakdown and actions.',
  'docs.preventivi.imageCaption': 'The detail shows price, full cost, profit and quote status.',
  'docs.preventivi.image2Alt': 'Read-only share page with the quote and the import button.',
  'docs.preventivi.image2Caption':
    'The shared link is a read-only copy and does not expose the configuration.',
  'docs.preventivi.linkQuotes': 'Open Quotes',
  'docs.preventivi.linkSettings': 'Go to Data and backup',

  'docs.cloud.label': 'Cloud and backup',
  'docs.cloud.title': 'Cloud, account and backup',
  'docs.cloud.intro':
    'LayerCost is local-first: without an account, data stays in the browser. The cloud is optional and lets two or more devices share the same archive.',
  'docs.cloud.p1':
    'With an account you can use the shared workspace: configuration and quotes sync across devices. Access is by request and the administrator creates the account. You can sign in with email and password or with Google.',
  'docs.cloud.p2':
    'If you work offline, changes stay queued and are replayed when you return. If the same data changes on two devices, LayerCost asks which version to keep. On logout the local cloud copy is removed when there are no pending writes.',
  'docs.cloud.p3':
    'The JSON backup is the only complete external copy. Importing it replaces configuration, quotes and draft, after downloading a backup of the current data. The Excel file is for analysis, not a backup. Clearing the browser deletes local data.',
  'docs.cloud.stepsTitle': 'Protecting data',
  'docs.cloud.step1': 'Export JSON from Settings → Data and backup before changing device.',
  'docs.cloud.step2': 'Keep the file somewhere safe: it is the only complete external copy.',
  'docs.cloud.step3': 'If you use the cloud, check sync status in the sidebar.',
  'docs.cloud.step4': 'On a conflict, explicitly choose which version to keep.',
  'docs.cloud.step5': 'Before a restore or import, always export a copy.',
  'docs.cloud.noteTitle': 'Privacy',
  'docs.cloud.note':
    'In guest mode no data leaves the browser. With the cloud, data lives in the Supabase workspace in Europe. There are no analytics, tracking cookies or network calls beyond assets and explicit forms.',
  'docs.cloud.imageAlt':
    'Settings page with sections for price, appearance, language and data and backup.',
  'docs.cloud.imageCaption': 'Settings also contains data export, import and restore.',
  'docs.cloud.linkRequest': 'Request cloud access',
  'docs.cloud.linkSettings': 'Open Settings',

  'docs.suggerimenti.label': 'Suggestions',
  'docs.suggerimenti.title': 'Suggestions and support',
  'docs.suggerimenti.intro':
    'Found a bug or an idea to improve LayerCost? The Suggestions page is there for exactly that.',
  'docs.suggerimenti.p1':
    'Choose the type (improvement, problem or other), the app area and a concrete description. If you want a reply, leave an email. The message reaches the administrator and does not create an account.',
  'docs.suggerimenti.p2':
    'The form only sends the fields you fill in to the Formspree service. It does not send quotes, configuration or other app data. Do not include personal or sensitive data in the description.',
  'docs.suggerimenti.stepsTitle': 'A good message includes',
  'docs.suggerimenti.step1': 'What you were doing and which screen was open.',
  'docs.suggerimenti.step2': 'What you expected and what happened instead.',
  'docs.suggerimenti.step3': 'Steps to reproduce the problem, if it is a bug.',
  'docs.suggerimenti.step4': 'Device and browser, if the problem is visual or performance-related.',
  'docs.suggerimenti.noteTitle': 'Do not include sensitive data',
  'docs.suggerimenti.note':
    'The description is delivered by email and kept by the service for as long as needed to handle the request. Avoid personal data, confidential prices or customer information.',
  'docs.suggerimenti.linkFeedback': 'Open Suggestions',
} as const
