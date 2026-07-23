// app.js - Logica applicativa del gestionale Beautri Tricologia

// Cattura errori di runtime globali per renderli visibili a schermo durante i test
window.addEventListener('error', function(e) {
  alert("Errore di Sistema:\n" + (e.error ? e.error.stack || e.error.message : e.message));
});
window.addEventListener('unhandledrejection', function(e) {
  alert("Errore di Promise non gestito (Rejection):\n" + (e.reason ? e.reason.stack || e.reason.message || e.reason : e));
});

(function() {
  // ── STATO GLOBALE DELL'APPLICAZIONE ──
  let db = null;
  let storage = null;
  let auth = null;
  let firebaseActive = false;
  let firebaseInitError = null;
  let firebaseActiveConfig = null;

  // Dati di default
  const DEFAULT_MENU = "https://menu.beautri.it";
  const DEFAULT_HOURS = "Lunedì: Chiuso\nMartedì: 13:30 - 21:00\nMercoledì: 13:30 - 21:00\nGiovedì: 09:00 - 12:00 / 14:00 - 18:45\nVenerdì: 09:00 - 12:00 / 14:00 - 19:30\nSabato: 08:00 - 17:30\nDomenica: Chiuso";

  const MAINTENANCE_DEFAULTS = {
    base: {
      lui: { unica: "Lui 572€", seduta: "Lui 52€", risparmio: "200€" },
      lei: { unica: "Lei 814/858€", seduta: "Lei 74/78€", risparmio: "200/230€" }
    },
    intermedio: {
      lui: { unica: "Lui 737€", seduta: "Lui 67€", risparmio: "210€" },
      lei: { unica: "Lei 979/1023€", seduta: "Lei 89/93€", risparmio: "210/240€" }
    },
    avanzato: {
      lui: { unica: "Lui 836€", seduta: "Lui 76€", risparmio: "220€" },
      lei: { unica: "Lei 1056/1144€", seduta: "Lei 96/104€", risparmio: "220/250€" }
    }
  };

  const PRODUCT_PRICES = {
    "Lozione SOFT": 41,
    "Lozione ACTIVE": 45,
    "Lozione PRO": 49,
    "Shampoo Nutriente": 29,
    "Shampoo Caduta GOLD": 29,
    "Shampoo Caduta SILVER": 29,
    "Shampoo Caduta PLATINUM": 29,
    "Shampoo Purificante": 29,
    "Shampoo Equilibrante": 29,
    "Shampoo Forfora": 29,
    "Shampoo Delicato": 26,
    "Emulsione Lenitiva": 58,
    "Emulsione Avvolgente": 28,
    "Maschera Rigenerante": 37,
    "Maschera Nutriente": 37,
    "Conditioner Idratante": 29
  };

  // Prodotti caricati in memoria (Daniela)
  let recommendedProducts = [];

  // File PDF selezionato per il caricamento
  let selectedPdfFile = null;

  // Inizializzazione Firebase
  function initFirebase() {
    try {
      // Pulisci vecchie chiavi obsolete salvate in localStorage per prevenire conflitti
      localStorage.removeItem('beautri_firebase_config');

      const isClientPage = document.getElementById('display-client-name') !== null;
      let config = window.FIREBASE_CONFIG_LOCAL;

      if (!isClientPage) {
        // Amministratore (Daniela): controlla se Firebase è abilitato
        const isFirebaseEnabled = localStorage.getItem('beautri_firebase_enabled') !== 'false';
        if (!isFirebaseEnabled) {
          console.log("Firebase disabilitato dall'utente. Avvio in modalità Offline.");
          return;
        }
      }

      if (config && config.apiKey) {
        firebaseActiveConfig = config;
        // Controlla se Firebase è già stato inizializzato
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        db = firebase.firestore();
        if (typeof firebase.storage === 'function') {
          storage = firebase.storage();
          storage.setMaxUploadRetryTime(5000);
          storage.setMaxOperationRetryTime(5000);
        } else {
          console.warn("Firebase Storage SDK non caricato. La funzionalità di upload non sarà disponibile.");
        }
        auth = firebase.auth();
        
        firebaseActive = true;
        console.log("Firebase inizializzato correttamente.");
      } else {
        console.warn("Nessuna configurazione Firebase valida trovata. Utilizzo della modalità offline (localStorage).");
      }
    } catch (error) {
      console.error("Errore inizializzazione Firebase:", error);
      firebaseInitError = error;
    }
  }

  initFirebase();

  // Rileva in quale pagina ci troviamo
  const isAdminPage = document.getElementById('consultation-form') !== null;
  const isClientPage = document.getElementById('display-client-name') !== null;

  if (isAdminPage) {
    initAdminApp();
  } else if (isClientPage) {
    initClientApp();
  }

  // ── SEZIONE AMMINISTRATIVA (Daniela iPad) ──
  function initAdminApp() {
    console.log("Inizializzazione interfaccia amministratore Daniela...");

    // Selettori DOM
    const nav = document.getElementById('app-nav');
    const tabNuova = document.getElementById('tab-nuova');
    const tabStorico = document.getElementById('tab-storico');
    const appContent = document.getElementById('app-content');
    const loginView = document.getElementById('login-view');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    const consultationType = document.getElementById('consultation-type');
    const typeBtnIniziale = document.getElementById('type-btn-iniziale');
    const typeBtnControllo = document.getElementById('type-btn-controllo');
    const typeBtnMantenimento = document.getElementById('type-btn-mantenimento');
    const conditionalSectionsWrapper = document.getElementById('conditional-sections-wrapper');
    const maintenanceSectionsWrapper = document.getElementById('maintenance-sections-wrapper');
    const maintLevelSelect = document.getElementById('maint-level-select');
    const maintGenderSelect = document.getElementById('maint-gender-select');
    const maintPriceUnicaInput = document.getElementById('maint-price-unica-input');
    const maintPriceSedutaInput = document.getElementById('maint-price-seduta-input');
    const maintSavingsInput = document.getElementById('maint-savings-input');

    const form = document.getElementById('consultation-form');
    const successView = document.getElementById('success-view');
    const pdfDropzone = document.getElementById('pdf-dropzone');
    const pdfInput = document.getElementById('pdf-input');
    const fileInfo = document.getElementById('file-info');
    const fileNameLabel = document.getElementById('file-name-label');
    const fileRemove = document.getElementById('file-remove');
    
    const treatmentsContainer = document.getElementById('treatments-container');
    const addTreatmentBtn = document.getElementById('add-treatment');
    const estimatedTotalPrice = document.getElementById('estimated-total-price');
    const expiryDate = document.getElementById('expiry-date');
    const expiryDateContainer = document.getElementById('expiry-date-container');
    const productsContainer = document.getElementById('products-container');
    const addProductBtn = document.getElementById('add-product');
    const menuLink = document.getElementById('menu-link');
    const salonHours = document.getElementById('salon-hours');

    const generatedLinkDisplay = document.getElementById('generated-link-display');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnWhatsappShare = document.getElementById('btn-whatsapp-share');
    const btnResetForm = document.getElementById('btn-reset-form');
    const btnResetFormMain = document.getElementById('btn-reset-form-main');

    const searchInput = document.getElementById('search-input');
    const clientsList = document.getElementById('clients-list');

    // Impostazioni Drawer
    const settingsTrigger = document.getElementById('settings-trigger');
    const settingsDrawer = document.getElementById('settings-drawer');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsClose = document.getElementById('settings-close');
    const settingsForm = document.getElementById('settings-form');

    // Toast
    const toastOverlay = document.getElementById('toast-overlay');
    const toastIconLoader = document.getElementById('toast-icon-loader');
    const toastIconSuccess = document.getElementById('toast-icon-success');
    const toastIconError = document.getElementById('toast-icon-error');
    const toastTitle = document.getElementById('toast-title');
    const toastDesc = document.getElementById('toast-desc');

    // 1. Gestione Autenticazione (Bypassa login form, usa auth anonima se disponibile)
    loginView.style.display = "none";
    appContent.style.display = "block";
    nav.style.display = "flex";
    if (btnLogout) btnLogout.style.display = "none";
    loadDefaultValues();
    loadClientsHistory();

    const versionStatus = document.getElementById('app-version-status');

    if (firebaseActive) {
      if (versionStatus) {
        versionStatus.innerHTML = `Gestione Tricologia v1.0.0<br><span style="color: var(--gold); font-weight: 600;">Connesso a Firebase: ${firebase.app().options.projectId}</span>`;
      }
      auth.signInAnonymously()
        .then(() => {
          console.log("Autenticazione anonima completata con successo.");
        })
        .catch(error => {
          console.error("Autenticazione anonima fallita. Verifica che sia abilitata nella console di Firebase:", error);
          if (versionStatus) {
            versionStatus.innerHTML = `Gestione Tricologia v1.0.0<br><span style="color: var(--red); font-weight: 600;">Errore Auth: ${error.message}</span>`;
          }
        });
    } else {
      // Modalità Offline (senza auth)
      if (versionStatus) {
        versionStatus.innerHTML = `Gestione Tricologia v1.0.0<br><span style="color: var(--red); font-weight: 600;">Modalità Offline</span>`;
      }
      
      // Aggiungi un indicatore visuale dell'offline
      const logoEl = document.querySelector('.logo');
      if (logoEl && !document.getElementById('offline-badge')) {
        const badge = document.createElement('span');
        badge.id = 'offline-badge';
        badge.textContent = 'OFFLINE';
        badge.style.fontSize = '10px';
        badge.style.background = 'var(--red)';
        badge.style.color = '#fff';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';
        badge.style.marginLeft = '8px';
        badge.style.verticalAlign = 'middle';
        logoEl.appendChild(badge);
      }
      loadDefaultValues();
      loadClientsHistory();
    }

    // Carica valori di default nel form
    function loadDefaultValues() {
      if (menuLink) menuLink.value = DEFAULT_MENU;
      if (salonHours) salonHours.value = DEFAULT_HOURS;
      
      // Imposta data di scadenza di default a 30 giorni da oggi
      const today = new Date();
      today.setDate(today.getDate() + 30);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      if (expiryDate) expiryDate.value = `${year}-${month}-${day}`;
    }

    // 2. Navigazione Tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tabId = this.getAttribute('data-tab');
        if (tabId === 'tab-nuova') {
          tabNuova.classList.add('active');
          tabStorico.classList.remove('active');
        } else {
          tabNuova.classList.remove('active');
          tabStorico.classList.add('active');
          loadClientsHistory(); // Ricarica lo storico ogni volta che si cambia tab
        }
      });
    });

    // 3. Gestione Trattamenti/Sedute Dinamici
    function addTreatmentRow(data = {}) {
      const treatId = 'treat_' + Date.now() + Math.random().toString(36).substring(2, 5);
      const row = document.createElement('div');
      row.className = 'treatment-row';
      row.id = treatId;

      row.innerHTML = `
        <div class="form-group">
          <label>Tipo di Seduta</label>
          <select class="treat-type-select" required>
            <option value="" disabled ${!data.name ? 'selected' : ''}>Seleziona...</option>
            <option value="IGENIZZARE/PURIFICARE">IGENIZZARE/PURIFICARE</option>
            <option value="LENIRE">LENIRE</option>
            <option value="DETOSSINARE">DETOSSINARE</option>
            <option value="NUTRIRE">NUTRIRE</option>
            <option value="LASER A FOTOBIOSTIMOLAZIONE">LASER A FOTOBIOSTIMOLAZIONE</option>
            <option value="Altro / Personalizzato">Altro / Personalizzato...</option>
          </select>
          <input type="text" class="custom-treat-input" placeholder="Specifica..." style="display: none; margin-top: 5px;">
        </div>
        <div class="form-group">
          <label>N. Sedute</label>
          <input type="number" min="1" value="${data.sessionsCount || 1}" required class="treat-qty-input">
        </div>
        <div class="form-group">
          <label>Costo Cad. (€)</label>
          <input type="number" min="0" step="0.01" value="${data.pricePerSession !== undefined ? data.pricePerSession : ''}" placeholder="Costo cad." required class="treat-price-input">
        </div>
        <button type="button" class="remove-prod-btn remove-treat-btn" title="Rimuovi seduta">&times;</button>
      `;

      const select = row.querySelector('.treat-type-select');
      const customInput = row.querySelector('.custom-treat-input');
      const qtyInput = row.querySelector('.treat-qty-input');
      const priceInput = row.querySelector('.treat-price-input');
      const removeBtn = row.querySelector('.remove-treat-btn');

      // Se ci sono dati pre-caricati
      if (data.name) {
        const optionExists = Array.from(select.options).some(opt => opt.value === data.name);
        if (optionExists) {
          select.value = data.name;
        } else {
          select.value = "Altro / Personalizzato";
          customInput.value = data.name;
          customInput.style.display = "block";
          customInput.setAttribute('required', 'required');
        }
      }

      // Mostra/nascondi custom input
      select.addEventListener('change', function() {
        if (this.value === 'Altro / Personalizzato') {
          customInput.style.display = 'block';
          customInput.setAttribute('required', 'required');
        } else {
          customInput.style.display = 'none';
          customInput.removeAttribute('required');
        }
        recalculateEstimatedTotal();
      });

      // Calcola totale quando cambiano i valori
      qtyInput.addEventListener('input', recalculateEstimatedTotal);
      priceInput.addEventListener('input', recalculateEstimatedTotal);

      // Rimozione riga
      removeBtn.addEventListener('click', function() {
        // Impedisci di rimuovere se è l'unica riga
        if (treatmentsContainer.querySelectorAll('.treatment-row').length <= 1) {
          showToast("Azione non consentita", "Devi inserire almeno un tipo di seduta per la proposta.", "error", 2000);
          return;
        }
        row.remove();
        recalculateEstimatedTotal();
      });

      treatmentsContainer.appendChild(row);
      recalculateEstimatedTotal();
    }

    function recalculateEstimatedTotal() {
      let total = 0;
      const rows = treatmentsContainer.querySelectorAll('.treatment-row');
      rows.forEach(row => {
        const qty = parseInt(row.querySelector('.treat-qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.treat-price-input').value) || 0;
        total += qty * price;
      });
      if (estimatedTotalPrice) {
        estimatedTotalPrice.textContent = `€ ${total.toFixed(2)}`;
      }
    }

    addTreatmentBtn.addEventListener('click', () => addTreatmentRow());
    
    // Inizializza con un trattamento vuoto
    addTreatmentRow();

    // 4. Gestione Dropzone Drag-and-Drop per PDF
    ['dragenter', 'dragover'].forEach(eventName => {
      pdfDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        pdfDropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      pdfDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        pdfDropzone.classList.remove('dragover');
      }, false);
    });

    pdfDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0 && files[0].type === "application/pdf") {
        pdfInput.files = files;
        handlePdfSelection(files[0]);
      } else {
        showToast("Errore File", "Puoi caricare esclusivamente file PDF.", "error", 2500);
      }
    });

    pdfInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        handlePdfSelection(this.files[0]);
      }
    });

    fileRemove.addEventListener('click', function() {
      selectedPdfFile = null;
      pdfInput.value = "";
      fileInfo.classList.remove('show');
      pdfDropzone.style.display = "flex";
      pdfInput.setAttribute('required', 'required');
    });

    function handlePdfSelection(file) {
      selectedPdfFile = file;
      fileNameLabel.textContent = file.name + ` (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      fileInfo.classList.add('show');
      pdfDropzone.style.display = "none";
      pdfInput.removeAttribute('required');
    }

    // 5. Gestione Prodotti Consigliati Dinamici
    addProductBtn.addEventListener('click', function() {
      const prodId = 'prod_' + Date.now();
      const productRow = document.createElement('div');
      productRow.className = 'product-row';
      productRow.id = prodId;

      productRow.innerHTML = `
        <div class="form-group">
          <label>Prodotto consigliato</label>
          <select class="prod-select" required>
            <option value="" disabled selected>Seleziona prodotto...</option>
            <option value="Lozione SOFT">Lozione SOFT</option>
            <option value="Lozione ACTIVE">Lozione ACTIVE</option>
            <option value="Lozione PRO">Lozione PRO</option>
            <option value="Shampoo Nutriente">Shampoo Nutriente</option>
            <option value="Shampoo Caduta GOLD">Shampoo Caduta GOLD</option>
            <option value="Shampoo Caduta SILVER">Shampoo Caduta SILVER</option>
            <option value="Shampoo Caduta PLATINUM">Shampoo Caduta PLATINUM</option>
            <option value="Shampoo Purificante">Shampoo Purificante</option>
            <option value="Shampoo Equilibrante">Shampoo Equilibrante</option>
            <option value="Shampoo Forfora">Shampoo Forfora</option>
            <option value="Shampoo Delicato">Shampoo Delicato</option>
            <option value="Emulsione Lenitiva">Emulsione Lenitiva</option>
            <option value="Emulsione Avvolgente">Emulsione Avvolgente</option>
            <option value="Maschera Rigenerante">Maschera Rigenerante</option>
            <option value="Maschera Nutriente">Maschera Nutriente</option>
            <option value="Conditioner Idratante">Conditioner Idratante</option>
            <option value="Altro / Personalizzato">Altro / Personalizzato...</option>
          </select>
          <input type="text" class="custom-prod-input" placeholder="Specifica prodotto..." style="display: none; margin-top: 5px;">
        </div>
        <div class="form-group">
          <label>Quantità</label>
          <input type="number" min="1" value="1" required class="prod-qty-input">
        </div>
        <div class="form-group">
          <label>Prezzo Totale</label>
          <div class="prod-price-display" style="height: 44px; display: flex; align-items: center; background: var(--bg); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-weight: 600; color: var(--dark); box-sizing: border-box; font-size: 14px; user-select: none;">
            € 0,00
          </div>
          <input type="number" min="0" step="0.5" class="custom-prod-price-input" placeholder="Prezzo Cad. (€)" style="display: none; height: 44px; width: 100%; box-sizing: border-box; padding: 0 10px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); font-weight: 600; font-size: 14px;">
        </div>
        <button type="button" class="remove-prod-btn" title="Rimuovi prodotto">&times;</button>
      `;

      const select = productRow.querySelector('.prod-select');
      const customInput = productRow.querySelector('.custom-prod-input');
      const qtyInput = productRow.querySelector('.prod-qty-input');
      const priceDisplay = productRow.querySelector('.prod-price-display');
      const customPriceInput = productRow.querySelector('.custom-prod-price-input');

      // Gestione rimozione prodotto
      productRow.querySelector('.remove-prod-btn').addEventListener('click', function() {
        productRow.remove();
        recommendedProducts = recommendedProducts.filter(p => p.id !== prodId);
      });

      function updateRowPrice() {
        const prodVal = select.value;
        const qtyVal = parseInt(qtyInput.value) || 1;
        
        if (prodVal === 'Altro / Personalizzato') {
          customPriceInput.style.display = 'block';
          priceDisplay.style.display = 'none';
          customPriceInput.setAttribute('required', 'required');
        } else {
          customPriceInput.style.display = 'none';
          priceDisplay.style.display = 'flex';
          customPriceInput.removeAttribute('required');
          const unitPrice = PRODUCT_PRICES[prodVal] || 0;
          priceDisplay.textContent = `€ ${(unitPrice * qtyVal).toFixed(2)}`;
        }
      }

      // Gestione mostra/nascondi custom input e aggiornamento prezzo
      select.addEventListener('change', function() {
        if (this.value === 'Altro / Personalizzato') {
          customInput.style.display = 'block';
          customInput.setAttribute('required', 'required');
        } else {
          customInput.style.display = 'none';
          customInput.removeAttribute('required');
        }
        updateRowPrice();
      });

      qtyInput.addEventListener('input', updateRowPrice);
      customPriceInput.addEventListener('input', updateRowPrice);

      productsContainer.appendChild(productRow);
      recommendedProducts.push({ id: prodId });
      
      // Inizializza le icone Lucide all'interno della riga
      lucide.createIcons({
        attrs: {
          class: 'lucide'
        }
      });
    });

    // Autocompilazione valori di default per il Mantenimento
    function updateMaintenanceDefaults() {
      if (!maintLevelSelect || !maintGenderSelect || !maintPriceUnicaInput || !maintPriceSedutaInput || !maintSavingsInput) return;
      const level = maintLevelSelect.value;
      const gender = maintGenderSelect.value;
      const defaults = MAINTENANCE_DEFAULTS[level][gender];
      if (defaults) {
        maintPriceUnicaInput.value = defaults.unica;
        maintPriceSedutaInput.value = defaults.seduta;
        maintSavingsInput.value = defaults.risparmio;
      }
    }

    if (maintLevelSelect) maintLevelSelect.addEventListener('change', updateMaintenanceDefaults);
    if (maintGenderSelect) maintGenderSelect.addEventListener('change', updateMaintenanceDefaults);

    // Gestione selezione Tipo Consulenza
    function selectConsultationType(type) {
      if (!consultationType) return;
      consultationType.value = type;

      // Aggiorna la classe attiva sui bottoni
      if (typeBtnIniziale) typeBtnIniziale.classList.toggle('active', type === 'iniziale');
      if (typeBtnControllo) typeBtnControllo.classList.toggle('active', type === 'controllo');
      if (typeBtnMantenimento) typeBtnMantenimento.classList.toggle('active', type === 'mantenimento');

      // Mostra o nasconde le sezioni e abilita/disabilita i relativi input
      if (type === 'controllo') {
        if (conditionalSectionsWrapper) {
          conditionalSectionsWrapper.style.display = 'none';
          conditionalSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
        if (maintenanceSectionsWrapper) {
          maintenanceSectionsWrapper.style.display = 'none';
          maintenanceSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
        if (expiryDateContainer) expiryDateContainer.style.display = 'none';
        if (expiryDate) {
          expiryDate.disabled = true;
          expiryDate.removeAttribute('required');
        }
      } else if (type === 'mantenimento') {
        if (conditionalSectionsWrapper) {
          conditionalSectionsWrapper.style.display = 'none';
          conditionalSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
        if (maintenanceSectionsWrapper) {
          maintenanceSectionsWrapper.style.display = 'block';
          maintenanceSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
          updateMaintenanceDefaults();
        }
        if (expiryDateContainer) expiryDateContainer.style.display = 'block';
        if (expiryDate) {
          expiryDate.disabled = false;
          expiryDate.setAttribute('required', 'required');
        }
      } else {
        // Iniziale
        if (conditionalSectionsWrapper) {
          conditionalSectionsWrapper.style.display = 'block';
          conditionalSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
        }
        if (maintenanceSectionsWrapper) {
          maintenanceSectionsWrapper.style.display = 'none';
          maintenanceSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
        if (expiryDateContainer) expiryDateContainer.style.display = 'block';
        if (expiryDate) {
          expiryDate.disabled = false;
          expiryDate.setAttribute('required', 'required');
        }
      }
    }

    if (typeBtnIniziale) {
      typeBtnIniziale.addEventListener('click', () => selectConsultationType('iniziale'));
    }
    if (typeBtnControllo) {
      typeBtnControllo.addEventListener('click', () => selectConsultationType('controllo'));
    }
    if (typeBtnMantenimento) {
      typeBtnMantenimento.addEventListener('click', () => selectConsultationType('mantenimento'));
    }

    // 6. Invio Form & Generazione Link
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const clientNameVal = document.getElementById('client-name').value.trim();
      const relationVal = document.getElementById('client-relazione').value.trim();
      const menuLinkVal = menuLink.value.trim();
      const salonHoursVal = salonHours.value.trim();
      const typeVal = consultationType ? consultationType.value : 'iniziale';

      // Raccogli trattamenti/sedute
      const finalTreatments = [];
      let totalSessions = 0;
      let totalPrice = 0;
      let expiryDateVal = "";

      let maintenanceLevelVal = "";
      let maintenanceGenderVal = "";
      let maintenancePriceUnicaVal = "";
      let maintenancePriceSedutaVal = "";
      let maintenanceSavingsVal = "";
      
      if (typeVal === 'iniziale') {
        expiryDateVal = expiryDate.value;
        document.querySelectorAll('.treatment-row').forEach(row => {
          const select = row.querySelector('.treat-type-select');
          const customInput = row.querySelector('.custom-treat-input');
          const qty = parseInt(row.querySelector('.treat-qty-input').value) || 0;
          const priceCad = parseFloat(row.querySelector('.treat-price-input').value) || 0;
          
          let name = select.value;
          if (name === "Altro / Personalizzato") {
            name = customInput.value.trim() || "Trattamento Personalizzato";
          }
          
          if (name) {
            finalTreatments.push({
              name,
              sessionsCount: qty,
              pricePerSession: priceCad
            });
            totalSessions += qty;
            totalPrice += qty * priceCad;
          }
        });

        if (finalTreatments.length === 0) {
          showToast("Trattamento mancante", "Inserisci almeno un tipo di seduta per la proposta.", "error", 3000);
          return;
        }
      }

      // Genera un nome cumulativo per la visualizzazione nello storico
      let mainTreatmentName = "Solo Relazione/Controllo";
      if (typeVal === 'iniziale' && finalTreatments.length > 0) {
        mainTreatmentName = finalTreatments.map(t => `${t.sessionsCount}x ${t.name}`).join(", ");
      } else if (typeVal === 'mantenimento') {
        maintenanceLevelVal = maintLevelSelect ? maintLevelSelect.value : "base";
        maintenanceGenderVal = maintGenderSelect ? maintGenderSelect.value : "lei";
        maintenancePriceUnicaVal = maintPriceUnicaInput ? maintPriceUnicaInput.value.trim() : "";
        maintenancePriceSedutaVal = maintPriceSedutaInput ? maintPriceSedutaInput.value.trim() : "";
        maintenanceSavingsVal = maintSavingsInput ? maintSavingsInput.value.trim() : "";
        
        mainTreatmentName = `Mantenimento ${maintenanceLevelVal.toUpperCase()} (${maintenanceGenderVal.toUpperCase()})`;
      }

      if (!selectedPdfFile) {
        showToast("File mancante", "Carica il report PDF della cute per generare la scheda.", "error", 3000);
        return;
      }

      showToast("Salvataggio in corso", "Caricamento del report PDF ed inserimento nel database...", "loading");

      try {
        const clientId = 'c_' + Date.now() + Math.random().toString(36).substring(2, 7);
        let pdfUrl = "";

        // Raccogli i prodotti inseriti
        const finalProducts = [];
        if (typeVal === 'iniziale') {
          document.querySelectorAll('.product-row').forEach(row => {
            const select = row.querySelector('.prod-select');
            const customInput = row.querySelector('.custom-prod-input');
            const qty = parseInt(row.querySelector('.prod-qty-input').value) || 1;
            const customPriceInput = row.querySelector('.custom-prod-price-input');
            
            let name = select.value;
            let price = 0;
            if (name === "Altro / Personalizzato") {
              name = customInput.value.trim() || "Prodotto Personalizzato";
              const unitPrice = parseFloat(customPriceInput.value) || 0;
              price = unitPrice * qty;
            } else {
              const unitPrice = PRODUCT_PRICES[name] || 0;
              price = unitPrice * qty;
            }
            
            if (name) {
              finalProducts.push({ name, qty, price });
            }
          });
        }

        if (firebaseActive) {
          // 1. Assicurati che l'utente sia autenticato prima di caricare
          if (!auth.currentUser) {
            console.log("Nessun utente autenticato. Tentativo di accesso anonimo...");
            await auth.signInAnonymously();
          }

          // 2. Carica PDF su Firebase Storage
          console.log("Avvio upload PDF...");
          const storageRef = storage.ref().child(`consulenze_tricologia/${clientId}_${selectedPdfFile.name}`);
          const uploadTask = await storageRef.put(selectedPdfFile);
          pdfUrl = await uploadTask.ref.getDownloadURL();
          console.log("Upload completato con successo. URL:", pdfUrl);

          // 3. Salva scheda cliente su Firestore
          const docData = {
            id: clientId,
            name: clientNameVal,
            pdfUrl: pdfUrl,
            relation: relationVal,
            type: typeVal,
            treatment: mainTreatmentName,
            sessions: totalSessions || 12,
            price: totalPrice || 0,
            treatments: finalTreatments,
            expiryDate: expiryDateVal,
            products: finalProducts,
            menuLink: menuLinkVal,
            salonHours: salonHoursVal,
            maintenanceLevel: maintenanceLevelVal,
            maintenanceGender: maintenanceGenderVal,
            maintenancePriceUnica: maintenancePriceUnicaVal,
            maintenancePriceSeduta: maintenancePriceSedutaVal,
            maintenanceSavings: maintenanceSavingsVal,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          await db.collection('tricologia_consultations').doc(clientId).set(docData);
        } else {
          // Modalità Offline: Converti file in Base64 (se piccolo)
          if (selectedPdfFile.size > 2 * 1024 * 1024) {
            throw new Error("Il file PDF è troppo grande per la modalità Offline (max 2MB). Configura Firebase.");
          }

          pdfUrl = await convertFileToBase64(selectedPdfFile);

          const docData = {
            id: clientId,
            name: clientNameVal,
            pdfUrl: pdfUrl,
            relation: relationVal,
            type: typeVal,
            treatment: mainTreatmentName,
            sessions: totalSessions || 12,
            price: totalPrice || 0,
            treatments: finalTreatments,
            expiryDate: expiryDateVal,
            products: finalProducts,
            menuLink: menuLinkVal,
            salonHours: salonHoursVal,
            maintenanceLevel: maintenanceLevelVal,
            maintenanceGender: maintenanceGenderVal,
            maintenancePriceUnica: maintenancePriceUnicaVal,
            maintenancePriceSeduta: maintenancePriceSedutaVal,
            maintenanceSavings: maintenanceSavingsVal,
            createdAt: new Date().toISOString()
          };

          // Salva in localStorage
          const localData = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
          localData.push(docData);
          localStorage.setItem('beautri_local_consultations', JSON.stringify(localData));
        }

        // Genera il link personalizzato per il cliente
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const landingUrl = `${baseUrl}consultazione.html?id=${clientId}`;

        // Copia automaticamente negli appunti
        let copied = false;
        try {
          await navigator.clipboard.writeText(landingUrl);
          copied = true;
        } catch(err) {
          console.warn("Copia negli appunti non riuscita automaticamente:", err);
        }

        // Mostra toast di successo e notifica di copia
        if (copied) {
          showToast("Link Copiato!", "La scheda è stata salvata ed il link è stato copiato negli appunti.", "success", 4000);
        } else {
          // Fallback se il browser blocca la scrittura degli appunti
          showToast("Scheda Salvata!", `Link: ${landingUrl}`, "success", 6000);
        }

        // Reset del form immediato per prepararlo a una nuova inserzione
        resetFormUI();

      } catch (err) {
        console.error(err);
        showToast("Errore Salvataggio", err.message || "Impossibile salvare i dati.", "error", 4000);
      }
    });

    // Funzione per il reset completo del form e dell'interfaccia
    function resetFormUI() {
      form.reset();
      selectedPdfFile = null;
      pdfInput.value = "";
      fileInfo.classList.remove('show');
      pdfDropzone.style.display = "flex";
      pdfInput.setAttribute('required', 'required');
      productsContainer.innerHTML = "";
      recommendedProducts = [];
      
      treatmentsContainer.innerHTML = "";
      addTreatmentRow();

      // Reset dei bottoni tipo consulenza
      if (consultationType) {
        consultationType.value = 'iniziale';
        if (typeBtnIniziale) typeBtnIniziale.classList.add('active');
        if (typeBtnControllo) typeBtnControllo.classList.remove('active');
        if (typeBtnMantenimento) typeBtnMantenimento.classList.remove('active');
        if (conditionalSectionsWrapper) {
          conditionalSectionsWrapper.style.display = 'block';
          conditionalSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
        }
        if (maintenanceSectionsWrapper) {
          maintenanceSectionsWrapper.style.display = 'none';
          maintenanceSectionsWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
          if (maintLevelSelect) maintLevelSelect.value = 'base';
          if (maintGenderSelect) maintGenderSelect.value = 'lei';
        }
        if (expiryDateContainer) expiryDateContainer.style.display = 'block';
        if (expiryDate) {
          expiryDate.disabled = false;
          expiryDate.setAttribute('required', 'required');
        }
      }

      loadDefaultValues();

      if (successView) successView.style.display = "none";
      form.style.display = "block";
    }

    // Reset del form manuale per una nuova scheda
    if (btnResetForm) btnResetForm.addEventListener('click', resetFormUI);
    if (btnResetFormMain) btnResetFormMain.addEventListener('click', resetFormUI);

    // Helper per convertire file in base64
    function convertFileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    // 7. Storico Clienti (Caricamento e Filtro)
    async function loadClientsHistory() {
      clientsList.innerHTML = '<div class="no-clients">Caricamento dello storico...</div>';
      
      try {
        let items = [];

        if (firebaseActive) {
          const snapshot = await db.collection('tricologia_consultations').orderBy('createdAt', 'desc').get();
          snapshot.forEach(doc => {
            const data = doc.data();
            items.push(data);
          });
        } else {
          // Leggi da localStorage
          items = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
          // Ordina per data decrescente
          items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        renderClientsList(items);

        // Associa ricerca in tempo reale
        searchInput.oninput = function() {
          const query = this.value.toLowerCase().trim();
          const filtered = items.filter(item => item.name.toLowerCase().includes(query));
          renderClientsList(filtered);
        };

      } catch (err) {
        console.error("Errore recupero storico:", err);
        clientsList.innerHTML = '<div class="no-clients" style="color: var(--red);">Impossibile caricare lo storico dei clienti.</div>';
      }
    }

    function renderClientsList(items) {
      if (items.length === 0) {
        clientsList.innerHTML = '<div class="no-clients">Nessun cliente trovato nello storico.</div>';
        return;
      }

      clientsList.innerHTML = "";
      items.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.id = `card-${client.id}`;

        let dateStr = "N/D";
        if (client.createdAt) {
          const dateObj = client.createdAt.seconds ? new Date(client.createdAt.seconds * 1000) : new Date(client.createdAt);
          dateStr = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        card.innerHTML = `
          <div class="client-meta">
            <span class="client-name">${client.name}</span>
            <span class="client-sub">${client.treatment} (${client.sessions} sedute - €${client.price.toFixed(2)})</span>
            <span class="client-date">Inviato il ${dateStr}</span>
          </div>
          <div class="client-actions">
            <button type="button" class="btn-icon-only btn-view" title="Visualizza Landing Page">
              <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
            </button>
            <button type="button" class="btn-icon-only btn-copy" title="Copia Link">
              <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
            </button>
            <button type="button" class="btn-icon-only btn-delete" style="color: var(--red); border-color: rgba(239, 68, 68, 0.2);" title="Elimina Scheda">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        `;

        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const clientLandingUrl = `${baseUrl}consultazione.html?id=${client.id}`;

        // Eventi bottoni
        card.querySelector('.btn-view').onclick = () => window.open(clientLandingUrl, '_blank');
        card.querySelector('.btn-copy').onclick = async () => {
          try {
            await navigator.clipboard.writeText(clientLandingUrl);
            showToast("Copiato!", "Il link è stato copiato negli appunti.", "success", 1500);
          } catch(err) {
            showToast("Errore copia", "Impossibile copiare.", "error", 2000);
          }
        };

        card.querySelector('.btn-delete').onclick = async () => {
          if (confirm(`Sei sicuro di voler eliminare la consulenza di ${client.name}? Questa azione non può essere annullata.`)) {
            showToast("Eliminazione in corso", "Rimozione della scheda...", "loading");
            try {
              if (firebaseActive) {
                // Rimuovi da Firestore
                await db.collection('tricologia_consultations').doc(client.id).delete();
                // NOTA: il PDF in storage potrebbe rimanere ma lo eliminiamo per pulizia se necessario
                try {
                  // Estrai il percorso del file dall'URL o ricrealo
                  // Usiamo un approccio semplice per non appesantire
                } catch(e){}
              } else {
                // Rimuovi da localStorage
                let localData = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
                localData = localData.filter(item => item.id !== client.id);
                localStorage.setItem('beautri_local_consultations', JSON.stringify(localData));
              }
              
              card.remove();
              showToast("Eliminato", "Consulenza rimossa con successo.", "success", 1800);
              
              // Se la lista è ora vuota
              if (clientsList.children.length === 0) {
                clientsList.innerHTML = '<div class="no-clients">Nessun cliente trovato nello storico.</div>';
              }
            } catch(e) {
              showToast("Errore", "Impossibile rimuovere la scheda.", "error", 3000);
            }
          }
        };

        clientsList.appendChild(card);
      });

      // Rendi le nuove icone
      lucide.createIcons();
    }

    // 8. Gestione Impostazioni Drawer (Firebase Config)
    settingsTrigger.onclick = () => {
      // Carica i valori correnti nel drawer
      const savedConfig = localStorage.getItem('beautri_firebase_config');
      const currentConfig = savedConfig ? JSON.parse(savedConfig) : window.FIREBASE_CONFIG_LOCAL;

      const isFirebaseEnabled = localStorage.getItem('beautri_firebase_enabled') !== 'false';
      document.getElementById('set-firebase-enable').checked = isFirebaseEnabled;

      if (currentConfig) {
        document.getElementById('set-api-key').value = currentConfig.apiKey || "";
        document.getElementById('set-project-id').value = currentConfig.projectId || "";
        document.getElementById('set-auth-domain').value = currentConfig.authDomain || "";
        document.getElementById('set-storage-bucket').value = currentConfig.storageBucket || "";
        document.getElementById('set-app-id').value = currentConfig.appId || "";
      }

      settingsDrawer.classList.add('open');
      settingsOverlay.classList.add('show');
    };

    const closeSettings = () => {
      settingsDrawer.classList.remove('open');
      settingsOverlay.classList.remove('show');
    };

    settingsClose.onclick = closeSettings;
    settingsOverlay.onclick = closeSettings;

    settingsForm.onsubmit = function(e) {
      e.preventDefault();
      
      const isChecked = document.getElementById('set-firebase-enable').checked;
      localStorage.setItem('beautri_firebase_enabled', isChecked ? 'true' : 'false');
      
      const newConfig = {
        apiKey: document.getElementById('set-api-key').value.trim(),
        projectId: document.getElementById('set-project-id').value.trim(),
        authDomain: document.getElementById('set-auth-domain').value.trim(),
        storageBucket: document.getElementById('set-storage-bucket').value.trim(),
        appId: document.getElementById('set-app-id').value.trim()
      };

      if (!newConfig.apiKey || !newConfig.projectId) {
        // Se svuota i campi, ripristina default
        localStorage.removeItem('beautri_firebase_config');
      } else {
        localStorage.setItem('beautri_firebase_config', JSON.stringify(newConfig));
      }

      showToast("Configurazione Salvata", "Riavvio dell'applicazione...", "success", 1500);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    };

    const btnResetSettings = document.getElementById('btn-reset-settings');
    if (btnResetSettings) {
      btnResetSettings.onclick = function() {
        localStorage.removeItem('beautri_firebase_config');
        localStorage.removeItem('beautri_firebase_enabled');
        showToast("Configurazione Ripristinata", "Riavvio in corso con le chiavi predefinite...", "success", 1500);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      };
    }

    // Helper Toast
    function showToast(title, desc, type, duration = 0) {
      toastTitle.textContent = title;
      toastDesc.textContent = desc;

      toastIconLoader.style.display = "none";
      toastIconSuccess.style.display = "none";
      toastIconError.style.display = "none";

      if (type === "loading") {
        toastIconLoader.style.display = "flex";
      } else if (type === "success") {
        toastIconSuccess.style.display = "flex";
      } else {
        toastIconError.style.display = "flex";
      }

      toastOverlay.classList.add('show');

      if (duration > 0) {
        setTimeout(hideToast, duration);
      }
    }

    function hideToast() {
      toastOverlay.classList.remove('show');
    }
  }

  // ── SEZIONE CLIENTE (Landing Page smartphone) ──
  function initClientApp() {
    console.log("Inizializzazione landing page cliente...");

    const clientLoader = document.getElementById('client-loader');
    const clientError = document.getElementById('client-error');
    const clientContent = document.getElementById('client-content');

    const displayClientName = document.getElementById('display-client-name');
    const displayDate = document.getElementById('display-date');
    const btnViewPdf = document.getElementById('btn-view-pdf');
    const pdfModal = document.getElementById('pdf-modal');
    const pdfModalIframe = document.getElementById('pdf-modal-iframe');
    const pdfModalClose = document.getElementById('pdf-modal-close');
    const displayTreatmentsList = document.getElementById('display-treatments-list');
    const displayPaymentPlan = document.getElementById('display-payment-plan');
    const cardProductsSection = document.getElementById('card-products-section');
    const displayProductsList = document.getElementById('display-products-list');
    
    // Countdown
    const countdownContainer = document.getElementById('countdown-container');
    const countdownTitleText = document.getElementById('countdown-title-text');
    const countdownTimer = document.getElementById('countdown-timer');
    const timerDays = document.getElementById('timer-days');
    const timerHours = document.getElementById('timer-hours');
    const timerMins = document.getElementById('timer-mins');
    const timerSecs = document.getElementById('timer-secs');
    const offerExpiredText = document.getElementById('offer-expired-text');

    const btnViewMenu = document.getElementById('btn-view-menu');
    const displayHours = document.getElementById('display-hours');
    const btnWhatsappContact = document.getElementById('btn-whatsapp-contact');

    // 1. Estrai ID dalla query string
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (!clientId) {
      showErrorState();
      return;
    }

    // 2. Carica i dati
    loadClientData(clientId);

    async function loadClientData(id) {
      try {
        if (firebaseInitError) {
          throw new Error("Errore inizializzazione database: " + (firebaseInitError.message || firebaseInitError));
        }

        let clientData = null;

        if (firebaseActive) {
          // Forza l'autenticazione anonima del cliente prima di leggere da Firestore
          if (auth && !auth.currentUser) {
            console.log("Autenticazione anonima in corso per il cliente...");
            await auth.signInAnonymously();
          }
          
          const doc = await db.collection('tricologia_consultations').doc(id).get();
          if (doc.exists) {
            clientData = doc.data();
          }
        }

        // Se non trovato in Firebase o Firebase non attivo, cerca in localStorage locale
        if (!clientData) {
          const localConsultations = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
          clientData = localConsultations.find(item => item.id === id);
        }

        if (clientData) {
          renderClientData(clientData);
        } else {
          const configInfo = firebaseActiveConfig ? JSON.stringify(firebaseActiveConfig) : "NESSUNA";
          showErrorState(`Nessuna consulenza trovata con ID '${id}'. DB attivo: ${configInfo}`);
        }
      } catch (err) {
        console.error("Errore caricamento dati cliente:", err);
        showErrorState(err.message || err);
      }
    }

    function renderClientData(data) {
      // Nome e Data
      displayClientName.textContent = data.name;
      
      let formattedDate = "Data non disponibile";
      if (data.createdAt) {
        const dateObj = data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt);
        formattedDate = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      displayDate.textContent = `Consulenza effettuata il ${formattedDate}`;

      // PDF Report Link - Anteprima Modale Integrata
      btnViewPdf.onclick = function() {
        if (data.pdfUrl) {
          if (pdfModal && pdfModalIframe) {
            pdfModalIframe.src = data.pdfUrl;
            pdfModal.style.display = "flex";
            document.body.style.overflow = "hidden"; // Blocca lo scroll di sfondo
          }
        } else {
          alert("Report PDF non caricato correttamente.");
        }
      };

      // Gestore chiusura modale PDF
      if (pdfModalClose) {
        pdfModalClose.onclick = function() {
          if (pdfModal && pdfModalIframe) {
            pdfModalIframe.src = "";
            pdfModal.style.display = "none";
            document.body.style.overflow = ""; // Ripristina lo scroll di sfondo
          }
        };
      }
      
      // Chiudi cliccando anche sullo sfondo nero
      if (pdfModal) {
        pdfModal.onclick = function(e) {
          if (e.target === pdfModal) {
            pdfModalIframe.src = "";
            pdfModal.style.display = "none";
            document.body.style.overflow = "";
          }
        };
      }

      // Relazione della Consulenza
      const cardRelationSection = document.getElementById('card-relation-section');
      const displayRelation = document.getElementById('display-relation');
      if (cardRelationSection && displayRelation) {
        if (data.relation) {
          displayRelation.textContent = data.relation;
          cardRelationSection.style.display = "block";
        } else {
          cardRelationSection.style.display = "none";
        }
      }

      // Percorso
      displayTreatmentsList.innerHTML = "";
      
      let treatmentsList = [];
      if (data.treatments && data.treatments.length > 0) {
        treatmentsList = data.treatments;
      } else if (data.treatment) {
        // Fallback per vecchie consulenze nel database
        treatmentsList = [{
          name: data.treatment,
          sessionsCount: data.sessions || 1,
          pricePerSession: data.sessions ? (data.price / data.sessions) : data.price
        }];
      }

      let totalSessions = 0;
      let totalPrice = 0;

      treatmentsList.forEach(t => {
        totalSessions += t.sessionsCount;
        totalPrice += t.sessionsCount * t.pricePerSession;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'prod-item';
        itemDiv.style.background = '#fff';
        itemDiv.style.border = '1.5px solid var(--border)';
        itemDiv.style.boxShadow = 'none';
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.padding = '12px 14px';

        itemDiv.innerHTML = `
          <div style="text-align: left; display: flex; flex-direction: column;">
            <span class="prod-name" style="font-size: 15px;">${t.name}</span>
            <span style="font-size: 11px; color: var(--gray); margin-top: 2px; font-weight: 500;">Pagamento seduta per seduta</span>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <span style="font-weight: 800; color: var(--gold-hover); font-size: 16px;">€ ${t.pricePerSession.toFixed(2)} <span style="font-size: 10px; font-weight: 600; color: var(--gray);">/ cad.</span></span>
            <span style="font-size: 11px; font-weight: 700; color: var(--dark); margin-top: 2px;">N. Sedute: ${t.sessionsCount}</span>
          </div>
        `;
        displayTreatmentsList.appendChild(itemDiv);
      });

      // Generazione del Piano di Pagamento (Seduta per Seduta)
      if (displayPaymentPlan) {
        displayPaymentPlan.innerHTML = "";
        
        if (treatmentsList.length === 1) {
          const t = treatmentsList[0];
          displayPaymentPlan.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--gray-light); padding: 12px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase;">Costo a Seduta</span>
              <span style="font-size: 18px; font-weight: 800; color: var(--gold-hover);">€ ${t.pricePerSession.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 14px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--gray);">Sedute Totali</span>
              <span style="font-size: 14px; font-weight: 700; color: var(--black);">${t.sessionsCount} sedute</span>
            </div>
          `;
        } else if (treatmentsList.length > 1) {
          let html = `
            <div style="font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.05em;">
              Piano di Pagamento (Seduta per Seduta)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
          `;
          
          treatmentsList.forEach((t, index) => {
            let label = "";
            if (index === 0) {
              label = `Le prime ${t.sessionsCount} sedute`;
            } else {
              label = `Le successive ${t.sessionsCount} sedute`;
            }
            
            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--gray-light); padding: 10px 14px; border-radius: var(--radius-sm);">
                <span style="font-size: 13px; font-weight: 600; color: var(--dark);">${label}</span>
                <span style="font-size: 15px; font-weight: 800; color: var(--gold-hover);">€ ${t.pricePerSession.toFixed(2)} <span style="font-size: 10px; font-weight: 600; color: var(--gray);">/ cad.</span></span>
              </div>
            `;
          });
          
          html += `</div>`;
          displayPaymentPlan.innerHTML = html;
        }
      }

      // Prodotti
      if (data.products && data.products.length > 0) {
        displayProductsList.innerHTML = "";
        data.products.forEach(p => {
          const li = document.createElement('li');
          li.className = 'prod-item';
          
          let priceText = '';
          if (p.price) {
            priceText = `<span style="font-weight: 800; color: var(--gold-hover); font-size: 15px; margin-left: auto;">€ ${parseFloat(p.price).toFixed(2)}</span>`;
          } else {
            // Calcola retroattivamente per le consulenze passate se il prodotto è in listino
            const listPrice = PRODUCT_PRICES[p.name];
            if (listPrice) {
              priceText = `<span style="font-weight: 800; color: var(--gold-hover); font-size: 15px; margin-left: auto;">€ ${(listPrice * p.qty).toFixed(2)}</span>`;
            }
          }

          li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="prod-name">${p.name}</span>
              <span class="prod-qty">Q.tà: ${p.qty}</span>
            </div>
            ${priceText}
          `;
          displayProductsList.appendChild(li);
        });
        cardProductsSection.style.display = "block";
      } else {
        cardProductsSection.style.display = "none";
      }

      // Menù Trattamenti
      btnViewMenu.onclick = function() {
        window.open(data.menuLink || DEFAULT_MENU, '_blank');
      };

      // Orari con evidenziazione dei giorni di apertura in grassetto
      const rawHours = data.salonHours || DEFAULT_HOURS;
      let formattedHoursHTML = "";
      if (rawHours) {
        const lines = rawHours.split('\n');
        formattedHoursHTML = lines.map(line => {
          const lower = line.toLowerCase();
          const isOpenDay = lower.includes('marted') || 
                            lower.includes('mercoled') || 
                            lower.includes('gioved') || 
                            lower.includes('venerd') || 
                            lower.includes('sabat');
          if (isOpenDay) {
            return `<strong>${line}</strong>`;
          }
          return `<span style="color: var(--gray);">${line}</span>`;
        }).join('<br>');
      }
      displayHours.innerHTML = formattedHoursHTML;

      // WhatsApp Contact
      const waText = `Ciao Daniela, ho appena visualizzato la mia consulenza personalizzata del ${formattedDate}. Vorrei avere maggiori informazioni sul mio percorso!`;
      btnWhatsappContact.onclick = function() {
        // Apri chat di WhatsApp col centro al numero +39 3661970861
        window.open(`https://wa.me/393661970861?text=${encodeURIComponent(waText)}`, '_blank');
      };

      // Gestione Countdown Validità Offerta
      if (data.expiryDate) {
        initCountdown(data.expiryDate);
      }

      // Render condizionale in base alla tipologia di consulenza (iniziale, controllo, mantenimento)
      const typeVal = data.type || 'iniziale';

      const cardPercorsoSection = document.getElementById('card-percorso-section');
      const cardMenuSection = document.getElementById('card-menu-section');
      const percorsoTitleText = document.getElementById('percorso-title-text');
      const cardMantenimentoSection = document.getElementById('card-mantenimento-section');
      
      if (typeVal === 'controllo') {
        if (cardPercorsoSection) cardPercorsoSection.style.display = 'none';
        if (cardProductsSection) cardProductsSection.style.display = 'none';
        if (countdownContainer) countdownContainer.style.display = 'none';
        if (cardMenuSection) cardMenuSection.style.display = 'none';
        if (cardMantenimentoSection) cardMantenimentoSection.style.display = 'none';
      } else if (typeVal === 'mantenimento') {
        if (cardPercorsoSection) cardPercorsoSection.style.display = 'none';
        if (cardProductsSection) cardProductsSection.style.display = 'none';
        if (countdownContainer) countdownContainer.style.display = data.expiryDate ? 'block' : 'none';
        if (cardMenuSection) cardMenuSection.style.display = 'block';
        if (cardMantenimentoSection) {
          cardMantenimentoSection.style.display = 'block';
          
          // Popola i prezzi e il risparmio
          const displayMaintPriceUnica = document.getElementById('maint-price-unica');
          const displayMaintPriceSeduta = document.getElementById('maint-price-seduta');
          const displayMaintSavings = document.getElementById('maint-savings');
          const maintTitleText = document.getElementById('mantenimento-title-text');
          
          if (displayMaintPriceUnica) {
            displayMaintPriceUnica.textContent = data.maintenancePriceUnica || "Lui 572€ Lei 814/858€";
          }
          if (displayMaintPriceSeduta) {
            displayMaintPriceSeduta.textContent = data.maintenancePriceSeduta || "Lui 52€ Lei 74/78€";
          }
          if (displayMaintSavings) {
            displayMaintSavings.textContent = data.maintenanceSavings || "200/230€";
          }
          if (maintTitleText && data.maintenanceLevel) {
            maintTitleText.textContent = `Percorso di Mantenimento ${data.maintenanceLevel.toUpperCase()} Personalizzato`;
          }
        }
      } else {
        if (cardPercorsoSection) cardPercorsoSection.style.display = 'block';
        if (cardMenuSection) cardMenuSection.style.display = 'block';
        if (cardMantenimentoSection) cardMantenimentoSection.style.display = 'none';
        
        if (percorsoTitleText) {
          percorsoTitleText.textContent = "Il tuo Percorso Personalizzato";
        }
      }

      // Mostra contenuto e nascondi loader
      clientLoader.style.display = "none";
      clientContent.style.display = "block";
    }

    function initCountdown(expiryDateStr) {
      const expiryTime = new Date(expiryDateStr + 'T23:59:59').getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = expiryTime - now;

        if (diff <= 0) {
          // Offerta scaduta
          clearInterval(timerInterval);
          countdownTimer.style.display = "none";
          countdownTitleText.style.display = "none";
          
          const expDate = new Date(expiryTime);
          const formattedExp = expDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
          offerExpiredText.textContent = `Proposta di trattamento scaduta il ${formattedExp}`;
          offerExpiredText.style.display = "block";
          countdownContainer.style.background = "var(--red-light)";
          countdownContainer.style.borderColor = "var(--red)";
          countdownContainer.style.animation = "none";
        } else {
          // Calcola giorni, ore, minuti, secondi
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          timerDays.textContent = String(days).padStart(2, '0');
          timerHours.textContent = String(hours).padStart(2, '0');
          timerMins.textContent = String(minutes).padStart(2, '0');
          timerSecs.textContent = String(seconds).padStart(2, '0');
        }
      };

      // Mostra container countdown
      countdownContainer.style.display = "block";
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
    }

    function showErrorState(message) {
      clientLoader.style.display = "none";
      clientError.style.display = "block";
      if (message) {
        const p = clientError.querySelector('p');
        if (p) {
          p.innerHTML = `<strong>Dettaglio errore:</strong> ${message}`;
        }
      }
    }
  }
})();
