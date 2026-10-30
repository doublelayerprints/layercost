export const docsIt = {
  'docs.title': 'Documentazione',
  'docs.description':
    'Guida completa a LayerCost: configurazione, calcolo, preventivi, import .3mf, cloud e backup.',
  'docs.index': 'Sezioni della guida',
  'docs.previous': 'Precedente',
  'docs.next': 'Successiva',
  'docs.pagination': 'Navigazione tra sezioni',
  'docs.related': 'Link utili',
  'docs.feedback.title': 'Manca qualcosa?',
  'docs.feedback.body':
    'Se la guida non risponde alla tua domanda, invia un suggerimento: possiamo migliorare questa pagina e il prodotto.',
  'docs.feedback.action': 'Invia un suggerimento',

  'docs.primiPassi.label': 'Primi passi',
  'docs.primiPassi.title': 'Primi passi',
  'docs.primiPassi.intro':
    'LayerCost calcola costo e prezzo delle stampe 3D partendo dai dati dello slicer. La configurazione iniziale è ciò che rende il risultato attendibile.',
  'docs.primiPassi.p1':
    'L’app funziona nel browser e salva i dati solo su questo dispositivo. Prima di calcolare una stampa, dedica qualche minuto alla configurazione: i valori di partenza sono stime e vanno adattati alle tue macchine.',
  'docs.primiPassi.p2':
    'Non serve compilare tutto subito. Puoi iniziare con una stampante, un materiale e la tariffa energia, calcolare il primo preventivo e completare il resto quando serve.',
  'docs.primiPassi.stepsTitle': 'Ordine consigliato',
  'docs.primiPassi.step1':
    'Apri Stampanti e controlla prezzo di acquisto, vita utile, manutenzione e potenza media.',
  'docs.primiPassi.step2':
    'Apri Materiali e inserisci il prezzo reale al kg e il peso netto della bobina.',
  'docs.primiPassi.step3':
    'Apri Tariffe energia e inserisci il costo variabile al kWh del tuo contratto.',
  'docs.primiPassi.step4':
    'Aggiungi gli Extra che usi davvero: imballaggio, etichette, spedizione.',
  'docs.primiPassi.step5':
    'Controlla Impostazioni: manodopera, tasso guasti, ricarico, arrotondamento e IVA.',
  'docs.primiPassi.step6':
    'Vai al Calcolatore, inserisci tempo e grammi dello slicer e salva il primo preventivo.',
  'docs.primiPassi.noteTitle': 'I valori di partenza sono stime',
  'docs.primiPassi.note':
    'Le due stampanti e i materiali iniziali servono a partire. Sostituisci prezzi e consumi con i tuoi dati: il risultato è attendibile solo quanto i dati che inserisci.',
  'docs.primiPassi.imageAlt':
    'Calcolatore di LayerCost con una stampa, il prezzo e la composizione del costo.',
  'docs.primiPassi.imageCaption':
    'Il calcolatore mostra subito costo pieno, guadagno e prezzo del preventivo.',
  'docs.primiPassi.linkCalculator': 'Apri il calcolatore',
  'docs.primiPassi.linkPrinters': 'Vai alla guida delle stampanti',

  'docs.stampanti.label': 'Stampanti',
  'docs.stampanti.title': 'Configurare le stampanti',
  'docs.stampanti.intro':
    'Ogni stampante ha un costo orario di usura e manutenzione, un consumo medio per famiglia di materiale e un eventuale contratto energia.',
  'docs.stampanti.p1':
    'Apri Stampanti e scegli Aggiungi stampante, oppure Modifica su una scheda esistente. Prezzo di acquisto, valore residuo e vita utile determinano l’ammortamento; la manutenzione aggiunge una riserva per ugello, piatto, cinghie e lubrificante.',
  'docs.stampanti.p2':
    'La potenza nominale è solo informativa e non entra nel costo. Il costo energia usa i profili di potenza media per famiglia (PLA, PETG, ABS…). Se hai misurato i Wh con una presa intelligente, inseriscili nella riga del calcolatore: l’energia misurata sostituisce il modello.',
  'docs.stampanti.stepsTitle': 'Cosa controllare',
  'docs.stampanti.step1': 'Prezzo di acquisto: il prezzo reale pagato, accessori inclusi se vuoi.',
  'docs.stampanti.step2':
    'Valore residuo e vita utile: il default è 20% e 15.000–20.000 ore, ma dipende dalla macchina.',
  'docs.stampanti.step3':
    'Manutenzione: una riserva oraria per usura e ricambi, non il costo di un singolo intervento.',
  'docs.stampanti.step4':
    'Minuti di avvio e potenza media: l’avvio viene aggiunto al tempo dello slicer.',
  'docs.stampanti.step5':
    'Tariffa energia: globale oppure specifica, se la stampante è in una casa con un contratto diverso.',
  'docs.stampanti.noteTitle': 'Multicolore e ACE/AMS',
  'docs.stampanti.note':
    'Il sistema multicolore non cambia il calcolo: i grammi dello slicer includono già purge, flush e prime tower. Non aggiungere una percentuale a mano.',
  'docs.stampanti.imageAlt':
    'Elenco delle stampanti configurate con costo orario, prezzo, vita utile e potenza media.',
  'docs.stampanti.imageCaption':
    'La scheda stampante riassume usura, manutenzione, consumi e tariffa energia.',
  'docs.stampanti.linkPrinters': 'Apri Stampanti',

  'docs.materiali.label': 'Materiali',
  'docs.materiali.title': 'Configurare i materiali',
  'docs.materiali.intro':
    'Il materiale è la voce più variabile del costo. Inserisci il prezzo che paghi davvero e il peso netto della bobina.',
  'docs.materiali.p1':
    'Il prezzo al kg non è quello di listino: se hai pagato la spedizione, includila. Se la bobina non è da 1 kg, indica il peso netto reale del filamento, senza la tara. LayerCost calcola il prezzo al grammo e lo usa nelle righe.',
  'docs.materiali.p2':
    'La famiglia (PLA, PETG, ABS, ASA, TPU, PVA e le varianti CF) determina il profilo di potenza della stampante. Puoi sovrascrivere il tasso guasti per un singolo materiale: è utile per ABS e ASA su telaio aperto.',
  'docs.materiali.stepsTitle': 'Cosa compilare',
  'docs.materiali.step1': 'Nome riconoscibile, ad esempio “PLA bianco” o “PETG nero Sunlu”.',
  'docs.materiali.step2': 'Famiglia del materiale, per il profilo di potenza.',
  'docs.materiali.step3':
    'Prezzo al kg e peso netto della bobina: il prezzo al grammo si aggiorna da solo.',
  'docs.materiali.step4':
    'Fornitore, colore e note sono opzionali; il colore non entra nel calcolo.',
  'docs.materiali.step5': 'Tasso guasti specifico solo se vuoi scostarti dal valore globale.',
  'docs.materiali.noteTitle': 'Usa il totale dello slicer',
  'docs.materiali.note':
    'I grammi da inserire sono il totale riportato dallo slicer: comprendono supporti, brim, purge e prime tower. Non aggiungere il purge di ACE/AMS una seconda volta.',
  'docs.materiali.imageAlt':
    'Elenco dei materiali con famiglia, prezzo al kg, prezzo al grammo e peso della bobina.',
  'docs.materiali.imageCaption':
    'La tabella materiali mostra subito prezzo al kg, prezzo al grammo e tasso guasti.',
  'docs.materiali.linkMaterials': 'Apri Materiali',

  'docs.tariffeExtra.label': 'Tariffe ed extra',
  'docs.tariffeExtra.title': 'Tariffe energia ed extra',
  'docs.tariffeExtra.intro':
    'La tariffa energia e gli extra completano il costo della stampa senza toccare il modello di usura.',
  'docs.tariffeExtra.p1':
    'In Tariffe energia inserisci il costo variabile al kWh della bolletta, comprensivo di oneri e IVA, e la data di decorrenza. Non usare il totale della bolletta diviso i kWh: i costi fissi non cambiano se stampi un pezzo in più. Ogni preventivo conserva la tariffa usata nel suo snapshot.',
  'docs.tariffeExtra.p2':
    'In Extra aggiungi ciò che si somma alla stampa. Un extra “per pezzo” viene moltiplicato per la quantità della riga; un extra “per lavoro” viene applicato una volta al preventivo, come la spedizione. Puoi archiviare un extra senza cancellarlo.',
  'docs.tariffeExtra.stepsTitle': 'Esempi',
  'docs.tariffeExtra.step1': 'Sacchetto zip o scatola: per pezzo.',
  'docs.tariffeExtra.step2': 'Etichetta, calamita o vite: per pezzo.',
  'docs.tariffeExtra.step3': 'Spedizione o imballo del lotto: per lavoro.',
  'docs.tariffeExtra.step4':
    'Pellicola, nastro o riempimento: scegli l’unità in base a come lo usi.',
  'docs.tariffeExtra.noteTitle': 'Archiviare, non cancellare',
  'docs.tariffeExtra.note':
    'Se una tariffa o un extra è già stato usato, archivialo invece di eliminarlo: i preventivi salvati restano leggibili e i calcoli futuri non dipendono da un dato sparito.',
  'docs.tariffeExtra.imageAlt':
    'Elenco delle tariffe energia con prezzo al kWh, decorrenza e stato.',
  'docs.tariffeExtra.imageCaption':
    'Le tariffe hanno una decorrenza: la più recente valida oggi viene usata nei nuovi calcoli.',
  'docs.tariffeExtra.linkTariffs': 'Apri Tariffe energia',
  'docs.tariffeExtra.linkExtras': 'Apri Extra',

  'docs.calcolare.label': 'Calcolare',
  'docs.calcolare.title': 'Calcolare una stampa',
  'docs.calcolare.intro':
    'Il calcolatore è il punto di partenza: una riga per ogni stampa o pezzo diverso, con quantità per le copie.',
  'docs.calcolare.p1':
    'Inserisci il tempo stimato dallo slicer e i grammi totali del materiale. LayerCost aggiunge i minuti di avvio della stampante e la finitura per pezzo. Scegli stampante e materiali per ogni riga; puoi aggiungere più materiali alla stessa riga.',
  'docs.calcolare.p2':
    'I costi di lavoro (setup, progettazione, extra per lavoro) si applicano una volta per preventivo. Il prezzo si calcola sul costo pieno; gli sconti di riga e di preventivo si applicano nell’ordine indicato nel riepilogo. Gli override avanzati servono solo se hai misure migliori della potenza o dell’energia.',
  'docs.calcolare.stepsTitle': 'Passo per passo',
  'docs.calcolare.step1':
    'Dai un nome al preventivo, controlla la data e, se serve, indica il cliente.',
  'docs.calcolare.step2':
    'Aggiungi una riga per ogni stampa o pezzo diverso. Duplica una riga quando cambi solo la quantità.',
  'docs.calcolare.step3':
    'Scegli stampante e quantità; inserisci il tempo dello slicer e, se serve, la finitura per pezzo.',
  'docs.calcolare.step4':
    'Inserisci i grammi totali per ogni materiale, come riportati dallo slicer.',
  'docs.calcolare.step5':
    'Aggiungi extra per pezzo e sconto di riga solo se quel pezzo li prevede.',
  'docs.calcolare.step6': 'Compila i costi di lavoro e scegli ricarico o margine, sconto e IVA.',
  'docs.calcolare.step7':
    'Controlla prezzo, costo pieno e margine effettivo, poi salva il preventivo.',
  'docs.calcolare.noteTitle': 'La bozza si salva da sola',
  'docs.calcolare.note':
    'La bozza resta in questo browser. “Salva preventivo” la aggiunge allo storico e congela i prezzi usati in quel momento.',
  'docs.calcolare.imageAlt':
    'Calcolatore compilato con nome, data, una riga di stampa e il riepilogo del prezzo.',
  'docs.calcolare.imageCaption':
    'Il riepilogo a destra resta visibile mentre compili le righe e i costi di lavoro.',
  'docs.calcolare.linkCalculator': 'Apri il calcolatore',
  'docs.calcolare.linkImport': 'Importa un file .3mf',

  'docs.import3mf.label': 'Import .3mf',
  'docs.import3mf.title': 'Importare un file .3mf',
  'docs.import3mf.intro':
    'Puoi importare un file .3mf già slicato e trasformare i piatti in righe del preventivo senza copiare tempo e grammi a mano.',
  'docs.import3mf.p1':
    'Nello slicer, slica il progetto ed esporta come .gcode.3mf (o come .3mf con le informazioni di slicing). Trascina il file nel calcolatore oppure usa Importa .3mf dalla testata o dalla sezione Stampe.',
  'docs.import3mf.p2':
    'LayerCost legge il file in locale, mostra i piatti e propone stampante e materiali. Seleziona i piatti, controlla la mappatura e scegli Aggiungi alla bozza o Sostituisci le righe. Ogni piatto diventa una riga con quantità 1: modifica la quantità dopo l’import se produci più copie.',
  'docs.import3mf.stepsTitle': 'Procedura',
  'docs.import3mf.step1': 'Apri il progetto nello slicer e controlla che sia slicato.',
  'docs.import3mf.step2': 'Esporta un .gcode.3mf, oppure un .3mf con le informazioni di slicing.',
  'docs.import3mf.step3': 'Trascina il file nel calcolatore o usa Importa .3mf.',
  'docs.import3mf.step4':
    'Seleziona i piatti, assegna stampante e materiali se la mappatura non è automatica.',
  'docs.import3mf.step5':
    'Scegli Aggiungi o Sostituisci, poi controlla le righe e salva il preventivo.',
  'docs.import3mf.noteTitle': 'Limiti e privacy',
  'docs.import3mf.note':
    'Il file può arrivare a 250 MiB compressi e 1 GiB decompressi. Viene letto nel browser e non lascia il dispositivo. Un progetto non slicato viene rifiutato: aprilo nello slicer, slica e riesporta.',
  'docs.import3mf.imageAlt':
    'Dialogo di importazione .3mf con i piatti del progetto e la mappatura dei materiali.',
  'docs.import3mf.imageCaption':
    'L’anteprima mostra i piatti trovati nel file prima di aggiungerli alla bozza.',
  'docs.import3mf.linkCalculator': 'Apri il calcolatore',

  'docs.prezzo.label': 'Prezzo e IVA',
  'docs.prezzo.title': 'Prezzo, sconti e IVA',
  'docs.prezzo.intro':
    'Il prezzo parte dal costo pieno, non dal solo costo del materiale. Ricarico e margine sono due modi alternativi di impostarlo.',
  'docs.prezzo.p1':
    'Il costo pieno somma il costo diretto (materiale, energia, usura, manodopera, extra, guasti) e la quota dei costi fissi (setup, progettazione, spedizione). Scegli ricarico sul costo oppure margine sul prezzo: non vanno sommati e non sono equivalenti.',
  'docs.prezzo.p2':
    'Gli sconti di riga si applicano al totale della riga, poi si applica lo sconto del preventivo e infine l’arrotondamento. L’IVA è solo presentazione: nessuna IVA, esclusa o inclusa. Il margine effettivo mostra quanto resta davvero dopo sconti e arrotondamento.',
  'docs.prezzo.stepsTitle': 'Controlli prima di salvare',
  'docs.prezzo.step1': 'Scegli ricarico o margine e imposta la percentuale.',
  'docs.prezzo.step2': 'Scegli arrotondamento per eccesso, al più vicino o per difetto.',
  'docs.prezzo.step3': 'Imposta l’IVA solo se vuoi mostrarla nel preventivo.',
  'docs.prezzo.step4': 'Aggiungi eventuali sconti di riga o di preventivo.',
  'docs.prezzo.step5': 'Controlla il margine effettivo e il prezzo netto prima di salvare.',
  'docs.prezzo.noteTitle': 'Prezzo sotto il costo',
  'docs.prezzo.note':
    'Se il prezzo è sotto il costo, il riepilogo lo segnala. Non è un errore bloccante: controlla sconti, ricarico e arrotondamento prima di inviare il preventivo.',
  'docs.prezzo.imageAlt':
    'Dettaglio di un preventivo con prezzo netto, costo pieno, guadagno e composizione del costo.',
  'docs.prezzo.imageCaption':
    'Il dettaglio separa costo pieno e guadagno, così il margine non resta nascosto.',
  'docs.prezzo.linkCalculator': 'Apri il calcolatore',
  'docs.prezzo.linkSettings': 'Imposta i valori predefiniti',

  'docs.preventivi.label': 'Preventivi',
  'docs.preventivi.title': 'Preventivi, stampa e condivisione',
  'docs.preventivi.intro':
    'Lo storico conserva ogni preventivo con input, tariffe risolte e versione del motore. I numeri salvati restano validi come storico.',
  'docs.preventivi.p1':
    'Un preventivo salvato si modifica in place e mantiene i prezzi della prima stesura. Dopo Segna come inviato o Segna come completato è bloccato: duplicalo per creare una copia. Aggiorna ai prezzi correnti crea una copia ricalcolata con la configurazione attuale.',
  'docs.preventivi.p2':
    'Archiviare non cancella: il preventivo resta consultabile e puoi ripristinarlo. Elimina definitivamente va usato solo per i dati che non servono più. La lista è ricercabile per nome o cliente.',
  'docs.preventivi.p3':
    'La stampa standard è per il cliente e mostra prezzi, IVA e note. Stampa interna aggiunge costi, composizione e margine ed è marcata “Uso interno”. Condividi crea un link con una copia compressa del preventivo: chi lo riceve può leggerlo e importarlo, ma non vede la tua configurazione.',
  'docs.preventivi.bulletsTitle': 'Azioni principali',
  'docs.preventivi.item1': 'Cerca per nome o cliente e mostra o nascondi gli archiviati.',
  'docs.preventivi.item2': 'Apri il dettaglio per vedere prezzi, costi e snapshot.',
  'docs.preventivi.item3': 'Duplica nel calcolatore per correggere o creare una variante.',
  'docs.preventivi.item4':
    'Esporta in Excel per analisi esterne; il JSON resta il backup completo.',
  'docs.preventivi.item5': 'Stampa per il cliente o stampa internamente con i costi.',
  'docs.preventivi.noteTitle': 'Il link è pubblico per chi lo riceve',
  'docs.preventivi.note':
    'Chiunque abbia il link può leggere i dati del preventivo. Non inserire dati sensibili e condividilo solo con chi deve vederlo.',
  'docs.preventivi.imageAlt':
    'Dettaglio di un preventivo con prezzo totale, composizione del costo e azioni.',
  'docs.preventivi.imageCaption':
    'Il dettaglio mostra prezzo, costo pieno, guadagno e stato del preventivo.',
  'docs.preventivi.image2Alt':
    'Pagina di condivisione in sola lettura con il preventivo e il pulsante di importazione.',
  'docs.preventivi.image2Caption':
    'Il link condiviso è una copia in sola lettura e non espone la configurazione.',
  'docs.preventivi.linkQuotes': 'Apri Preventivi',
  'docs.preventivi.linkSettings': 'Vai a Dati e backup',

  'docs.cloud.label': 'Cloud e backup',
  'docs.cloud.title': 'Cloud, account e backup',
  'docs.cloud.intro':
    'LayerCost è local-first: senza account i dati restano nel browser. Il cloud è opzionale e serve a condividere lo stesso archivio tra due o più dispositivi.',
  'docs.cloud.p1':
    'Con un account puoi usare il workspace condiviso: configurazione e preventivi si sincronizzano tra i dispositivi. L’accesso è su richiesta e l’amministratore crea l’account. Puoi entrare con email e password oppure con Google.',
  'docs.cloud.p2':
    'Se lavori offline le modifiche restano in coda e vengono riprodotte al ritorno. Se lo stesso dato cambia su due dispositivi, LayerCost chiede quale versione tenere. Al logout la copia locale del cloud viene rimossa se non ci sono scritture in sospeso.',
  'docs.cloud.p3':
    'Il backup JSON è l’unica copia esterna completa. Importarlo sostituisce configurazione, preventivi e bozza, dopo aver scaricato un backup dei dati attuali. Il file Excel serve per analisi, non è un backup. Svuotare il browser cancella i dati locali.',
  'docs.cloud.stepsTitle': 'Proteggere i dati',
  'docs.cloud.step1':
    'Esporta un JSON da Impostazioni → Dati e backup prima di cambiare dispositivo.',
  'docs.cloud.step2': 'Conserva il file in un posto sicuro: è l’unica copia esterna completa.',
  'docs.cloud.step3': 'Se usi il cloud, controlla lo stato di sincronizzazione in sidebar.',
  'docs.cloud.step4': 'In caso di conflitto scegli esplicitamente quale versione tenere.',
  'docs.cloud.step5': 'Prima di un ripristino o di un import, esporta sempre una copia.',
  'docs.cloud.noteTitle': 'Privacy',
  'docs.cloud.note':
    'In modalità ospite nessun dato lascia il browser. Con il cloud i dati sono nel workspace Supabase in Europa. Non ci sono analytics, cookie di tracciamento o chiamate di rete oltre agli asset e ai moduli espliciti.',
  'docs.cloud.imageAlt':
    'Pagina Impostazioni con le sezioni per prezzo, aspetto, lingua e dati e backup.',
  'docs.cloud.imageCaption':
    'In Impostazioni trovi anche esportazione, importazione e ripristino dei dati.',
  'docs.cloud.linkRequest': 'Richiedi accesso al cloud',
  'docs.cloud.linkSettings': 'Apri Impostazioni',

  'docs.suggerimenti.label': 'Suggerimenti',
  'docs.suggerimenti.title': 'Suggerimenti e supporto',
  'docs.suggerimenti.intro':
    'Hai trovato un bug o un’idea per migliorare LayerCost? La pagina Suggerimenti serve proprio a questo.',
  'docs.suggerimenti.p1':
    'Indica il tipo (miglioramento, problema o altro), l’area dell’app e una descrizione concreta. Se vuoi una risposta, lascia un’email. Il messaggio arriva all’amministratore e non crea un account.',
  'docs.suggerimenti.p2':
    'Il modulo invia solo i campi che compili al servizio Formspree. Non invia preventivi, configurazione o altri dati dell’app. Non inserire dati personali o sensibili nella descrizione.',
  'docs.suggerimenti.stepsTitle': 'Un buon messaggio contiene',
  'docs.suggerimenti.step1': 'Cosa stavi facendo e quale schermata avevi aperto.',
  'docs.suggerimenti.step2': 'Cosa ti aspettavi e cosa è successo invece.',
  'docs.suggerimenti.step3': 'I passi per riprodurre il problema, se è un bug.',
  'docs.suggerimenti.step4': 'Dispositivo e browser, se il problema è visivo o di prestazioni.',
  'docs.suggerimenti.noteTitle': 'Non inserire dati sensibili',
  'docs.suggerimenti.note':
    'La descrizione viene consegnata via email e conservata dal servizio per il tempo necessario a gestire la richiesta. Evita dati personali, prezzi riservati o informazioni di clienti.',
  'docs.suggerimenti.linkFeedback': 'Apri Suggerimenti',
} as const
