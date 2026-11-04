/**
 * Dizionario italiano dell'area amministrazione (EVO-8).
 * I messaggi degli errori cloud restano nel modulo workspace; la console li
 * riusa tramite il mapping di `features/admin/messages.ts`.
 */
export const adminIt = {
  'admin.title': 'Amministrazione',
  'admin.description':
    'Panoramica del servizio, utenti registrati e spazi con i loro tetti.',
  'admin.checking': 'Verifica dell’accesso in corso…',
  'admin.reserved.title': 'Area riservata',
  'admin.reserved.body': 'Questa console è visibile solo all’amministratore di LayerCost.',
  'admin.error.title': 'Verifica non riuscita',
  'admin.retry': 'Riprova',

  'admin.overview.title': 'Panoramica',
  'admin.overview.users': 'Utenti',
  'admin.overview.usersHint': 'Tetto di registrazione: {max}',
  'admin.overview.personal': 'Spazi personali',
  'admin.overview.shared': 'Spazi condivisi',
  'admin.overview.quotes': 'Preventivi attivi',
  'admin.overview.membershipsHint': 'Appartenenze totali: {count}',

  'admin.users.title': 'Utenti',
  'admin.users.tableLabel': 'Utenti registrati',
  'admin.users.searchLabel': 'Cerca utenti',
  'admin.users.searchPlaceholder': 'Cerca per email o nome',
  'admin.users.results.one': '{count} utente',
  'admin.users.results.other': '{count} utenti',
  'admin.users.empty': 'Nessun utente corrisponde alla ricerca.',
  'admin.users.email': 'Email',
  'admin.users.name': 'Nome',
  'admin.users.providers': 'Accesso',
  'admin.users.workspaces': 'Spazi',
  'admin.users.createdAt': 'Creato',
  'admin.users.lastSignIn': 'Ultimo accesso',
  'admin.users.never': 'Mai',
  'admin.provider.email': 'Email',
  'admin.provider.google': 'Google',

  'admin.workspaces.title': 'Spazi',
  'admin.workspaces.tableLabel': 'Spazi e tetti',
  'admin.workspaces.name': 'Spazio',
  'admin.workspaces.empty': 'Nessuno spazio.',
  'admin.workspaces.kind.personal': 'Personale',
  'admin.workspaces.kind.shared': 'Condiviso',
  'admin.workspaces.usage.value': '{used}/{max}',
  'admin.workspaces.atCap': 'A tetto',
  'admin.workspaces.createdAt': 'Creato',
  'admin.workspaces.details': 'Dettagli',
  'admin.workspaces.membersTitle': 'Membri',
  'admin.workspaces.membersLoading': 'Caricamento dei membri…',
  'admin.workspaces.membersEmpty': 'Nessun membro in questo spazio.',
  'admin.workspaces.memberJoined': 'Iscritto',
  'admin.workspaces.limitsTitle': 'Tetti dello spazio',
  'admin.workspaces.limitsHint':
    'I valori valgono per le nuove iscrizioni e i nuovi preventivi: le risorse esistenti restano.',
  'admin.workspaces.maxMembers': 'Membri max',
  'admin.workspaces.maxQuotes': 'Preventivi max',
  'admin.workspaces.limitsSave': 'Salva tetti',
  'admin.workspaces.limitsSaving': 'Salvataggio…',
  'admin.workspaces.limitsSaved': 'Tetti aggiornati.',
  'admin.workspaces.belowUsageWarning':
    'Il valore è sotto l’uso attuale: le risorse esistenti restano, il limite vale per i nuovi ingressi.',
  'admin.workspaces.limitInvalid': 'Inserisci un numero intero maggiore di zero.',
} as const
