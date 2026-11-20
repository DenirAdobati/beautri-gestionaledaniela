# 🌿 Gestionale Beautrì Tricologia — Daniela
### Documentazione Completa dell'Applicazione, Architettura, Strumenti e Cronologia Sviluppo

---

## 1. 📌 Panoramica del Progetto

Il **Gestionale Beautrì Tricologia** è una suite web completa, moderna e reattiva progettata specificamente per **Daniela** e il centro **Beautrì**, specializzato in consulenze e trattamenti tricologici avanzati.

Il sistema risolve l'intero ciclo di vita della consulenza tricologica:
1. **Pre-Consulenza**: Il cliente compila un questionario interattivo guidato da casa prima dell'appuntamento.
2. **Archiviazione & Gestione Interna**: Daniela riceve le risposte, le visualizza (con copia originale e modificabile), redige la diagnosi, imposta i trattamenti, i prodotti e le modalità economiche.
3. **Report per il Cliente**: Il cliente riceve via link WhatsApp/web un report digitale interattivo, elegante, mobile-first, completo di diagnosi PDF integrata, piano di pagamento, countdown di validità dell'offerta e contatto diretto.

---

## 2. 🏛️ Architettura dell'Applicazione & Moduli

L'applicazione è strutturata in moduli web indipendenti ma sincronizzati sullo stesso database cloud in tempo reale:

```
beautri-tricologia/
├── index.html                  # 🖥️ Gestionale Interno Daniela (Dashboard & Storico)
├── consultazione.html          # 📱 Report Digitale Interattivo per il Cliente
├── questionario-pre.html       # 📝 Questionario Pre-Consulenza per il Cliente
├── visualizza-pre.html         # 👁️ Scheda Visualizzazione / Modifica Questionario
├── scheda.html                 # 🔬 Scheda Tecnica Tricologica Avanzata
├── app_v3.js                   # ⚙️ Logica Applicativa Globale (CRUD, Timer, Calcoli)
├── style.css                   # 🎨 Foglio di Stile Ufficiale (Brand #F5C200)
├── style_scheda_interna.css    # 🎨 Stile per la Scheda Tecnica Interna
├── firebase-config-v2.js       # ☁️ Configurazione e Inizializzazione Firebase
├── CNAME                       # 🌐 Dominio personalizzato GitHub Pages
└── img/                        # 🖼️ Immagini cliniche (Norwood, Ludwig, Incidenze)
```

### Dettaglio dei Singoli File:

| File | Destinatario | Descrizione e Funzionalità |
| :--- | :--- | :--- |
| **`index.html`** | Daniela (Admin) | Dashboard di creazione, modifica, gestione clienti e cartelle, inserimento consulenze con calcoli automatici, storico e report PDF. |
| **`consultazione.html`** | Cliente Finale | La pagina web che il cliente apre dal link ricevuto (`?id=c_...`). Include visualizzatore PDF, prodotti, countdown, menù e WhatsApp. |
| **`questionario-pre.html`** | Cliente Finale | Questionario step-by-step con domande anagrafiche, domande a scelta multipla, 3 scale di gradimento 1-10, upload foto prodotti e video finale di Daniela. |
| **`visualizza-pre.html`** | Daniela (Admin) | Visualizzatore interno delle risposte del cliente al questionario pre-consulenza. Mostra i punteggi dorati 1-10 e consente la modifica e la stampa pulita. |
| **`scheda.html`** | Daniela (Admin) | Scheda di analisi tricologica clinica avanzata (scale Norwood, Ludwig, tricoanalyzer, anamnesi organica). |
| **`app_v3.js`** | Core Engine | Tutta la logica di business: gestione stato, calcolo prezzi dinamici, interfaccia Firestore, countdown Safari-compliant, drag & drop cartelle. |
| **`firebase-config-v2.js`**| Sistema Cloud | Connessione sicura al cluster Google Cloud / Firebase (Firestore, Storage, Auth). |
| **`style.css`** | UI/UX Globale | Palette colori del brand (Giallo/Oro `#F5C200`), card elevation, animazioni, modali responsive, stili di stampa. |

---

## 3. 🖥️ Funzionalità del Gestionale Daniela (`index.html`)

### 3.1. Tipologie di Consulenza Gestite
1. **Consulenza Iniziale**:
   - Inserimento sedute personalizzate con calcolo automatico del prezzo totale e del numero di sedute.
   - Selezione prodotti domiciliari consigliati con prezzi di listino automatici.
   - Data di scadenza dell'offerta a 30 giorni (modificabile).
   - Caricamento del report PDF (diagnosi) con anteprima e sostituzione.
2. **Consulenza di Controllo**:
   - Versione snella per monitorare l'evoluzione clinica senza riproporre l'offerta economica.
3. **Percorso di Mantenimento (Annuale 12 mesi)**:
   - Livelli configurabili: **Base**, **Intermedio**, **Avanzato**.
   - Differenziazione genere: **Lui** o **Lei**.
   - Calcolo automatico delle due modalità di pagamento: **Pagamento in unica quota** (con sedute/prodotti in omaggio e risparmio evidenziato) o **Pagamento a seduta**.
   - Data di scadenza dell'offerta e countdown per bloccare le condizioni agevolate.

### 3.2. Gestione Cartelle Clienti & Storico
- **Raggruppamento Intelligente**: Riconosce e unifica le cartelle indipendentemente dall'ordine con cui viene scritto il nome (es. `Mario Rossi` e `Rossi Mario`).
- **Cartelle Personalizzate**: Possibilità di creare cartelle manuali e spostare le consulenze con comodo Drag & Drop o pulsante "Sposta".
- **Ricerca Rapida**: Filtro istantaneo per nome, cognome o trattamento.
- **Modifica Completa**: Pulsante a forma di matita per modificare qualsiasi parametro di una consulenza senza alterare il link già inviato al cliente.
- **Protezione con Passcode**: Accesso riservato protetto da codice PIN per salvaguardare la privacy delle schede clienti.

### 3.3. Sezione Notifiche Scadenza Offerte (Campanellina in Alto)
- **Tab Compatta con Campanellina & Badge Rosso**: Pulsante compatto nel menu superiore con contatore rosso in tempo reale delle notifiche attive ogni volta che Daniela apre il gestionale.
- **Notifica Consulenza Iniziale (2 giorni)**: Il giorno successivo alla scadenza dell'offerta (2 giorni), mostra: *"Ieri è scaduta l'offerta per il percorso intensivo di [Nome Cliente]"*.
- **Notifica Percorso di Mantenimento (10 giorni)**: Il giorno successivo alla scadenza dell'offerta (10 giorni), mostra: *"Ieri è scaduta l'offerta di [Nome Cliente] per il percorso di mantenimento"*.
- **Apertura Diretta Cartella Cliente**: Cliccando sulla notifica, il gestionale passa automaticamente allo Storico Clienti, apre ed evidenzia la cartella del cliente corrispondente.
- **Tasto Spunta Verde (`✓`) di Gestione**: Ogni notifica presenta un pulsante verde `✓` sulla destra; cliccandolo una volta contattato il cliente, la notifica scompare definitivamente e il contatore rosso si aggiorna.

---

## 4. 📱 Funzionalità del Report Cliente (`consultazione.html`)

Il cliente riceve via WhatsApp un link dedicato (`https://questionarioconsulenza.beautri.it/consultazione.html?id=...`):

1. **Header & Saluto Personalizzato**: Nome del cliente, data della consulenza e introduzione di Daniela.
2. **Visualizzatore PDF In-Page**:
   - Il report PDF/diagnosi clinica si apre direttamente all'interno della pagina in un modale a schermo intero con tasto di chiusura `✕ Chiudi e torna al report`.
   - Compatibilità perfetta touch su iPhone, iPad e dispositivi Android senza tagli o blocchi di visualizzazione.
3. **Dettaglio del Percorso**: Elenco sedute, trattamenti previsti e relative modalità.
4. **Prodotti Personalizzati per la Routine Giornaliera**: Elenco dei prodotti specifici consigliati da Daniela con quantità e prezzo.
5. **Countdown & Scadenza Chiara dell'Offerta**:
   - Conto alla rovescia animato in tempo reale (Giorni, Ore, Minuti, Secondi).
   - Dicitura esplicita della data sul calendario (es. `Offerta valida fino al: 25/11/2026`).
   - Se l'offerta scade, il box diventa rosso avvisando che le condizioni riservate sono scadute.
6. **Modale Informativa Percorsi di Mantenimento**:
   - Pulsante dedicato *"Altre informazioni sul percorso di mantenimento"* che apre una finestra dettagliata con tutti i vantaggi, le regole, cosa garantisce Beautrì e cosa viene richiesto per garantire il risultato.
7. **Menù Trattamenti**: Collegamento diretto al menù online (`https://menu.beautri.it/#percorsi`).
8. **Orari del Salone**: Orari di apertura settimanali con evidenziazione in grassetto dei giorni aperti.
9. **Pulsante WhatsApp Diretto**: Tasto con logo ufficiale WhatsApp che apre direttamente la chat con Daniela (+39 3313348233) con messaggio precompilato.

---

## 5. 📝 Questionario Pre-Consulenza (`questionario-pre.html` & `visualizza-pre.html`)

Il questionario è accessibile al link pubblico `https://questionarioconsulenza.beautri.it/questionario-pre.html`:

1. **Esperienza Guidata Step-by-Step**: Una domanda alla volta a tutto schermo, barra di avanzamento dorata e pulsanti touch reattivi.
2. **Dati Anagrafici Snelli**: Raccolta di Nome, Cognome, Data di Nascita e Professione (rimossi i recapiti superflui già acquisiti altrove).
3. **Motivazioni Cliniche & Aspettative**: Domande a selezione multipla sulle problematiche (caduta, diradamento, cute grassa, forfora, psoriasi, post-parto, chemioterapia).
4. **Rapporto Aperto con i Capelli**: Spazio testuale libero per raccontare emozioni e abitudini.
5. **Schermata di Transizione "Ora ti chiediamo 3 numeri"**:
   - Frase rassicurante: *"Rispondi di getto, senza pensarci troppo: sono il tuo punto di partenza e ci serviranno per misurare insieme i tuoi progressi."*
   - Pulsante pulito `Vai alle domande →`.
6. **3 Scale Psicologiche da 1 a 10**:
   - *Quanto sei soddisfatta/o della situazione dei tuoi capelli e della tua cute oggi?* (1 = per niente · 10 = del tutto)
   - *Quanto senti che il tuo problema è sotto controllo oggi?* (1 = per niente · 10 = completamente sotto controllo)
   - *Quanto ti senti a tuo agio con i tuoi capelli quando sei in mezzo agli altri?* (1 = per niente · 10 = completamente)
   - **Interazione UX Rigorosa**: La scala parte completamente vuota (nessun valore 5 preimpostato); è obbligatorio toccare un numero; al tocco compaiono emoji dinamica, voto dorato e giudizio descrittivo.
7. **Caricamento Foto Prodotti**: Possibilità facoltativa di caricare una foto dei prodotti utilizzati a casa direttamente su Cloud Storage.
8. **Duplicazione Automatica nel Database**:
   - Al salvataggio vengono create **due schede separate**: una versione **Originale** (non modificabile da Daniela, per consultazione o stampa) e una versione **Modificabile** (dove Daniela può integrare annotazioni o correggere dati durante la visita).
9. **Video Finale di Daniela**:
   - Schermata di ringraziamento con video YouTube incorporato in 16:9 responsive: *"Daniela ha qualcosa da dirti. 💛"*.

---

## 6. 🛠️ Stack Tecnologico & Strumenti Utilizzati

### Frontend & Linguaggi
- **HTML5 Semantico**: Struttura accessibile e scalabile.
- **CSS3 Moderno**: Utilizzo di CSS Custom Properties (`--gold: #F5C200;`), Flexbox, CSS Grid, media query per smartphone, tablet iPad e desktop. Stili dedicati `@media print` per eliminare URL e intestazioni indesiderate durante la stampa PDF.
- **JavaScript ES6+ Vanilla**: Nessun framework pesante (React, Vue o Angular), garantendo tempi di caricamento istantanei (< 1 secondo), massima reattività anche con connessioni mobili 3G/4G e totale assenza di dipendenze vulnerabili.

### Backend, Database & Cloud
- **Google Cloud Platform & Firebase**:
  - **Cloud Firestore**: Database NoSQL in tempo reale per salvare clienti, percorsi, storico modifiche e risposte ai questionari.
  - **Firebase Cloud Storage**: Bucket per l'archiviazione sicura dei report PDF e delle fotografie caricate dai clienti (`beautri-gestionaledaniela.firebasestorage.app`).
  - **Firebase Authentication**: Autenticazione anonima/amministratore per consentire letture e scritture sicure regolate da Security Rules.
  - **Piano Blaze (Pay-as-you-go)**: Configurato e attivo per garantire storage e traffico senza blocchi improvvisi.

### Hosting & Deployment
- **Git & GitHub**: Versionamento del codice sorgente su repository `https://github.com/DenirAdobati/beautri-gestionaledaniela`.
- **GitHub Pages con Dominio Personalizzato**: Deploy automatico con certificato SSL HTTPS attivo sul dominio di terzo livello `https://questionarioconsulenza.beautri.it`.
- **Cache Busting Versionato**: Query string dinamiche (`?v=70`) su script e fogli di stile per forzare l'aggiornamento immediato su tutti i dispositivi (iPad Daniela, smartphone dei clienti).

### Librerie Esterne
- **Lucide Icons**: Iconografia SVG moderna, leggera ed elegante.
- **Google Fonts**: Font `Inter` e `Karla` per la massima leggibilità su schermi retina.
- **YouTube Iframe Player API**: Riproduzione video fluida e reattiva per il messaggio conclusivo.

### Strumenti di Sviluppo & Intelligenza Artificiale
- **Google DeepMind Antigravity AI**: Agente AI autonomo per la progettazione architetturale, sviluppo codice, debugging, test cross-browser, gestione versioni Git e manutenzione ordinaria e straordinaria.

---

## 7. 🎨 Identità Visiva & Brand Guidelines

Il gestionale riflette rigorosamente i canoni estetici di **Beautrì**:
- **Colore Primario Oro/Brand**: `#F5C200`
- **Oro Scuro / Hover**: `#D9A700`
- **Oro Chiarissimo (Sfondi & Alert)**: `#FEF9D9` / `#FEF3C7`
- **Sfondo Pagine**: `#FFFFFF` / `#F8F7F4`
- **Testo Principale**: `#111827` / `#12161C`
- **Favicon Ufficiale**: Goccina dorata ufficiale Beautrì (`favicon.png?v=68`).

---

## 8. 🌐 Link Ufficiali & Riferimenti

- **Questionario Pre-Consulenza**: [https://questionarioconsulenza.beautri.it/questionario-pre.html](https://questionarioconsulenza.beautri.it/questionario-pre.html)
- **Gestionale Daniela**: [https://questionarioconsulenza.beautri.it/index.html](https://questionarioconsulenza.beautri.it/index.html)
- **Visualizzatore Questionari**: [https://questionarioconsulenza.beautri.it/visualizza-pre.html](https://questionarioconsulenza.beautri.it/visualizza-pre.html)
- **Scheda Clinica Interna**: [https://questionarioconsulenza.beautri.it/scheda.html](https://questionarioconsulenza.beautri.it/scheda.html)
- **Menù Trattamenti & Percorsi**: [https://menu.beautri.it/#percorsi](https://menu.beautri.it/#percorsi)
- **Repository GitHub**: [https://github.com/DenirAdobati/beautri-gestionaledaniela](https://github.com/DenirAdobati/beautri-gestionaledaniela)
- **Progetto Firebase**: `beautri-gestionaledaniela` (Google Cloud)
- **Numero Assistenza WhatsApp**: `+39 331 3348233`

---

## 9. 📈 Cronologia Principale delle Versioni & Miglioramenti

1. **Setup & Architettura Iniziale**: Creazione del gestionale, integrazione Firestore e Storage per report PDF.
2. **Sistema Cartelle & Ricerca**: Raggruppamento automatico per cliente, ordinamento alfabetico tollerante (Nome/Cognome), creazione cartelle manuali e Drag & Drop.
3. **Modale PDF Integrato**: Sostituito il download esterno con un visualizzatore PDF in-page con pulsante di chiusura `✕` per un'esperienza fluida su iPhone e iPad.
4. **Protezione Admin**: Aggiunta schermata con passcode numerico (`1938`) per proteggere i dati sensibili.
5. **Questionario Pre-Consulenza Automatico**:
   - Duplicazione automatica di ogni risposta ricevuta in due cartelle: originale e modificabile.
   - Modifica campi di testo in textarea per facilitare la scrittura di Daniela da iPad.
   - Rimozione header/footer indesiderati durante la stampa PDF.
6. **Aggiornamento Brand Identity**: Transizione globale di tutti i colori e dettagli dorati al codice ufficiale `#F5C200`.
7. **Modale Informativa Mantenimento**: Inserimento del pulsante e della finestra informativa con dettagli, garanzie e regole del percorso annuale.
8. **Restyling Scale Psicologiche 1-10**:
   - Inserimento delle 3 metriche persuasive con slider/pulsanti touch senza valori preimpostati.
   - Badge dinamici con faccine emoji (`😞`, `🙁`, `😐`, `🙂`, `🤩`) e giudizio testuale.
   - Nuova schermata di stacco *"Ora ti chiediamo 3 numeri"* con pulsante *"Vai alle domande"*.
9. **Ottimizzazione Video Finale**: Rifacimento del container responsive 16:9 del video YouTube di Daniela.
10. **Aggiornamento Link Menù**: Puntamento diretto del pulsante menù alla sezione percorsi (`https://menu.beautri.it/#percorsi`).
11. **Risoluzione Bug Scadenza Mantenimento**:
    - Risolto il mancato salvataggio della data di scadenza nei percorsi di mantenimento.
    - Mostrata esplicitamente la data di calendario sul box del countdown (es. `Offerta valida fino al: GG/MM/AAAA`).
12. **Sezione Notifiche Scadenza Offerte**:
    - Aggiunta tab compatta con campanellina e pallino rosso contatore nel menu superiore del gestionale.
    - Generazione automatica delle notifiche il giorno dopo la scadenza per Consulenza Iniziale (2 giorni) e Percorso di Mantenimento (10 giorni).
    - Click sulla notifica per aprire direttamente la cartella del cliente nello storico e pulsante verde `✓` per rimuovere le notifiche già gestite da Daniela.
