export const authIt = {
  'auth.title': 'Accedi',
  'auth.description':
    'Accedi per sincronizzare configurazione e preventivi tra i tuoi dispositivi. Il cloud è opzionale: senza account l’app resta locale.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.submit': 'Accedi',
  'auth.submitting': 'Accesso…',
  'auth.noSignup':
    'La registrazione è chiusa. Gli account sono creati dall’amministratore.',
  'auth.forgotPassword': 'Password dimenticata? Chiedi all’amministratore.',
  'auth.backToApp': 'Torna al calcolatore',
  'auth.unconfigured.title': 'Cloud non configurato',
  'auth.unconfigured.body':
    'Questa build non ha le credenziali Supabase. L’app funziona in locale.',
  'auth.expired.title': 'Sessione scaduta',
  'auth.expired.body':
    'Accedi di nuovo per continuare a usare il cloud. I dati locali restano disponibili.',
  'auth.loginAction': 'Accedi',
  'auth.error.invalidCredentials': 'Email o password non corretti.',
  'auth.error.emailNotConfirmed': 'Devi confermare l’email prima di accedere.',
  'auth.error.tooManyRequests': 'Troppi tentativi. Riprova tra qualche minuto.',
  'auth.error.network': 'Impossibile raggiungere il cloud. Controlla la connessione.',
  'auth.error.notConfigured': 'Cloud non configurato.',
  'auth.error.unknown': 'Accesso non riuscito. Riprova.',
  'auth.showPassword': 'Mostra password',
  'auth.hidePassword': 'Nascondi password',

  'sync.title': 'Sincronizzazione',
  'sync.description':
    'Collega l’account per ritrovare configurazione e preventivi su altri dispositivi. Il cloud è opzionale.',
  'sync.status.idle': 'Non connesso',
  'sync.status.loading': 'Connessione…',
  'sync.status.authenticated': 'Connesso',
  'sync.status.expired': 'Sessione scaduta',
  'sync.status.error': 'Errore di connessione',
  'sync.account': 'Account',
  'sync.lastSync': 'Ultimo sync',
  'sync.never': 'Mai',
  'sync.login': 'Accedi',
  'sync.logout': 'Esci',
  'sync.logoutTitle': 'Uscire dall’account?',
  'sync.logoutDescription':
    'Le modifiche locali verranno salvate prima di uscire. I dati restano su questo browser.',
  'sync.logoutConfirm': 'Esci',
  'sync.localOnly':
    'Senza account l’app resta in locale. I dati non vengono cancellati.',
  'sync.comingSoon': 'La sincronizzazione dei dati sarà attivata nella prossima versione.',
  'sync.pending': 'Modifiche in sospeso: {count}',
  'sync.retry': 'Riprova',
  'sync.syncNow': 'Sincronizza ora',
  'sync.syncNowHint': 'Disponibile quando la sincronizzazione sarà attiva.',
} as const
