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
    const tabSchedaInterna = document.getElementById('tab-scheda-interna');
    const pdfModal = document.getElementById('pdf-modal');
    const pdfModalIframe = document.getElementById('pdf-modal-iframe');
    const pdfModalClose = document.getElementById('pdf-modal-close');
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
    const productsSectionWrapper = document.getElementById('products-section-wrapper');
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
        tabNuova.classList.remove('active');
        tabStorico.classList.remove('active');
        if (tabSchedaInterna) tabSchedaInterna.classList.remove('active');

        if (tabId === 'tab-nuova') {
          tabNuova.classList.add('active');
        } else if (tabId === 'tab-scheda-interna') {
          if (tabSchedaInterna) tabSchedaInterna.classList.add('active');
          initQuestionnaire();
        } else if (tabId === 'tab-storico') {
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
        if (productsSectionWrapper) {
          productsSectionWrapper.style.display = 'none';
          productsSectionWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
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
        if (productsSectionWrapper) {
          productsSectionWrapper.style.display = 'block';
          productsSectionWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
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
        if (productsSectionWrapper) {
          productsSectionWrapper.style.display = 'block';
          productsSectionWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
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
        if (typeVal === 'iniziale' || typeVal === 'mantenimento') {
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
        if (productsSectionWrapper) {
          productsSectionWrapper.style.display = 'block';
          productsSectionWrapper.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
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
          const consultations = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
          const schedeInterne = JSON.parse(localStorage.getItem('beautri_offline_consultations') || '[]');
          items = [...consultations, ...schedeInterne];
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

    // PDF Close handler wire
    if (pdfModalClose) {
      pdfModalClose.onclick = () => {
        pdfModal.style.display = 'none';
        pdfModalIframe.src = '';
      };
    }
    if (pdfModal) {
      pdfModal.onclick = (e) => {
        if (e.target === pdfModal) {
          pdfModal.style.display = 'none';
          pdfModalIframe.src = '';
        }
      };
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

        const isScheda = client.recordType === 'scheda_interna';
        
        let subText = "";
        if (isScheda) {
          subText = `<span style="background: rgba(234, 179, 8, 0.15); color: var(--gold); padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-right: 6px;">SCHEDA INTERNA</span> Caso: ${(client.casoTipo || 'generico').toUpperCase()}`;
        } else {
          subText = `${client.treatment} (${client.sessions} sedute - €${(client.price || 0).toFixed(2)})`;
        }

        card.innerHTML = `
          <div class="client-meta">
            <span class="client-name">${client.name}</span>
            <span class="client-sub">${subText}</span>
            <span class="client-date">Inviato il ${dateStr}</span>
          </div>
          <div class="client-actions">
            <button type="button" class="btn-icon-only btn-view" title="${isScheda ? 'Visualizza PDF' : 'Visualizza Landing Page'}">
              <i data-lucide="${isScheda ? 'file-text' : 'eye'}" style="width: 16px; height: 16px;"></i>
            </button>
            <button type="button" class="btn-icon-only btn-copy" title="Copia Link" style="${isScheda ? 'display: none;' : ''}">
              <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
            </button>
            <button type="button" class="btn-icon-only btn-delete" style="color: var(--red); border-color: rgba(239, 68, 68, 0.2);" title="Elimina Scheda">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        `;

        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const clientLandingUrl = `${baseUrl}consultazione.html?id=${client.id}`;

        card.querySelector('.btn-view').onclick = () => {
          if (isScheda) {
            // Visualizza scheda.html in anteprima iframe direttamente in-page
            pdfModalIframe.src = 'scheda.html?id=' + client.id;
            pdfModal.style.display = 'flex';
          } else {
            window.location.href = clientLandingUrl + "&admin=true";
          }
        };

        if (!isScheda) {
          card.querySelector('.btn-copy').onclick = async () => {
            try {
              await navigator.clipboard.writeText(clientLandingUrl);
              showToast("Copiato!", "Il link è stato copiato negli appunti.", "success", 1500);
            } catch(err) {
              showToast("Errore copia", "Impossibile copiare.", "error", 2000);
            }
          };
        }

        card.querySelector('.btn-delete').onclick = async () => {
          const typeName = isScheda ? 'la scheda interna' : 'la consulenza';
          if (confirm(`Sei sicuro di voler eliminare ${typeName} di ${client.name}? Questa azione non può essere annullata.`)) {
            showToast("Eliminazione in corso", "Rimozione in corso...", "loading");
            try {
              if (firebaseActive) {
                // Rimuovi da Firestore
                await db.collection('tricologia_consultations').doc(client.id).delete();
              } else {
                // Rimuovi da localStorage
                if (isScheda) {
                  let schedeData = JSON.parse(localStorage.getItem('beautri_offline_consultations') || '[]');
                  schedeData = schedeData.filter(item => item.id !== client.id);
                  localStorage.setItem('beautri_offline_consultations', JSON.stringify(schedeData));
                } else {
                  let localData = JSON.parse(localStorage.getItem('beautri_local_consultations') || '[]');
                  localData = localData.filter(item => item.id !== client.id);
                  localStorage.setItem('beautri_local_consultations', JSON.stringify(localData));
                }
              }
              
              card.remove();
              showToast("Eliminato", "Elemento rimosso con successo.", "success", 1800);
              
              // Se la lista è ora vuota
              if (clientsList.children.length === 0) {
                clientsList.innerHTML = '<div class="no-clients">Nessun cliente trovato nello storico.</div>';
              }
            } catch(e) {
              showToast("Errore", "Impossibile rimuovere l'elemento.", "error", 3000);
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

    // ═══════════════════════════════════════
    // SEZIONE INTEGRATA: SCHEDA INTERNA (QUESTIONARIO)
    // ═══════════════════════════════════════

    // Costanti e configurazioni
    const HTML2PDF_API_KEY = 'kpmUzBuAUjJTxjjvYHB8DnzIwn6vh6ahcqbKoUCj8sU3X7qiQdyTwZYLltQedyLh';
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0Z8WWJui6NSTG1dpiD3RFUkzQWqgimkfPT7wZ3_hXLbW90qb_HfHAh_Qf1RP2ZQDc/exec';

    // Domande
    const Q_CONOSCITIVA = [
      { id:1, sec:'Fase Conoscitiva', q:'Qual è il tuo nome?', type:'name' },
      { id:2, sec:'Fase Conoscitiva', q:'Sesso', type:'radio', opts:['Maschio','Femmina'] },
      { id:3, sec:'Fase Conoscitiva', q:'Età', type:'radio-grid2', opts:['0–10 anni','10–20 anni','20–30 anni','30–40 anni','40–50 anni','50–60 anni','> 60 anni'] },
      { id:4, sec:'Fase Conoscitiva', q:'Altezza', type:'radio-grid3', opts:['< 150 cm','150–160 cm','160–170 cm','170–180 cm','180–190 cm','> 190 cm'] },
      { id:5, sec:'Fase Conoscitiva', q:'Peso', type:'radio-grid3', opts:['< 50 kg','50–60 kg','60–70 kg','70–80 kg','80–90 kg','90–100 kg','> 100 kg'] },
      { id:6, sec:'Fase Conoscitiva', q:'Anamnesi personale', type:'check-other', opts:['Attività sportiva'] },
      { id:7, sec:'Fase Conoscitiva', q:'Quante volte lavi i capelli a settimana?', type:'radio', opts:['Tutti i giorni e spesso 2 volte al giorno','Tutti i giorni','Una volta ogni 2 giorni','2 volte a settimana','Una volta a settimana'] },
      { id:8, sec:'Fase Conoscitiva', q:'Quando hai lavato l\'ultima volta i capelli?', type:'radio-grid2', opts:['Oggi','Ieri','2 giorni fa','Più di 2 giorni fa'] },
      { id:9, sec:'Fase Conoscitiva', q:'Che prodotti utilizzi di solito?', type:'radio', opts:['Prodotti generici comprati al supermercato','Prodotti specifici comprati in farmacia','Prodotti specifici comprati in salone / negozi specializzati'] }
    ];

    const Q_INDAGINE = [
      { id:10, sec:'Fase di Indagine', q:'Esigenza / causa', type:'check-other', opts:['Problemi fisici negli ultimi anni','Operazioni','Diete'] },
      { id:11, sec:'Fase di Indagine', q:'Valori ematici', type:'check-other', opts:['Analisi del sangue','Ferro'] },
      { id:12, sec:'Fase di Indagine', q:'Lamenti forfora e/o capelli grassi?', type:'radio', opts:['Sì','No'] },
      { id:13, sec:'Fase di Indagine', q:'Ti capita di trovare tracce di forfora sui vestiti o adese al cuoio capelluto?', type:'radio', opts:['Sì','No'] },
      { id:14, sec:'Fase di Indagine', q:'Percepisci la sensazione di prurito sul cuoio capelluto?', type:'radio-grid2', opts:['Sì','No','Lieve','Intenso'] },
      { id:15, sec:'Fase di Indagine', q:'Percepisci un fastidio o un dolore alla base dei capelli?', type:'radio', opts:['Sì','No'] },
      { id:16, sec:'Fase di Indagine', q:'La tua sudorazione è eccessiva?', type:'radio-grid3', opts:['Intensa','Normale','Leggera'] },
      { id:17, sec:'Fase di Indagine', q:'Quante ore dormi di solito?', type:'radio', opts:['Meno di 6 ore','Tra le 6 e le 8 ore','Più di 8 ore al giorno'] },
      { id:18, sec:'Fase di Indagine', q:'Com\'è la qualità del sonno? (1 = pessima — 10 = ottima)', type:'scale' },
      { id:19, sec:'Fase di Indagine', q:'Ti alzi riposato/a?', type:'radio-grid3', opts:['Sì','Poco','No'] },
      { id:20, sec:'Fase di Indagine', q:'Hai difficoltà ad addormentarti?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:21, sec:'Fase di Indagine', q:'Ti svegli di continuo?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:22, sec:'Fase di Indagine', q:'Hai il sonno leggero?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:23, sec:'Fase di Indagine', q:'Ti senti stressato/a?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:24, sec:'Fase di Indagine', q:'Il tuo lavoro ti mette a dura prova mentalmente e fisicamente? (es. turni di notte)', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:25, sec:'Fase di Indagine', q:'Sei una persona che pensa molto?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:26, sec:'Fase di Indagine', q:'Rifletti molto su qualsiasi cosa, sia di giorno che di notte?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] },
      { id:27, sec:'Fase di Indagine', q:'Hai particolari disturbi gastrointestinali?', type:'radio-grid3', opts:['Sì','No','Abbastanza'] }
    ];

    const Q_UOMO = [
      { id:28, sec:'Uomo Giovane', q:'Tuo padre ha perso i capelli?', type:'check-other', opts:['Sì','No'] },
      { id:29, sec:'Uomo Giovane', q:'Tua madre ha perso i capelli?', type:'check-other', opts:['Sì','No'] },
      { id:30, sec:'Uomo Giovane', q:'Il nonno, padre di tua madre, ha perso i capelli?', type:'check-other', opts:['Sì','No','In parte Sì'] },
      { id:31, sec:'Uomo Giovane', q:'A che ora vai a dormire?', type:'radio', opts:['Quasi sempre prima delle 24:00','A volte vado a letto dopo le 24:00','Spesso vado a letto dopo le 24:00'] },
      { id:32, sec:'Uomo Giovane', q:'Giudichi i tuoi capelli grassi?', type:'radio-grid3', opts:['Sì','No','A volte'] },
      { id:33, sec:'Uomo Giovane', q:'Ti vedi diradato?', type:'check-other', opts:['Sì','No'] }
    ];

    const Q_DONNA = [
      { id:34, sec:'Donna Giovane', q:'Hai mai riscontrato carenze di ferritina, vitamina D, anemie o disturbi della tiroide?', type:'check-other', opts:['Sì','No'] },
      { id:35, sec:'Donna Giovane', q:'Usi la pillola?', type:'radio', opts:['Sì','No'] },
      { id:36, sec:'Donna Giovane', q:'Se NON usi la pillola, le mestruazioni sono regolari?', type:'radio', opts:['Sì','No'] },
      { id:37, sec:'Donna Giovane', q:'Come giudichi il tuo umore?', type:'radio', opts:['Sono spesso triste o nervosa','A volte sono nervosa e stanca','Non riesco a dormire','Mi sento bene','Non mi sento bene'] },
      { id:38, sec:'Donna Giovane', q:'Fai spesso servizi di stiratura / permanente, colorazione / schiariture?', type:'radio-grid3', opts:['Spesso','A volte','Mai'] },
      { id:39, sec:'Donna Giovane', q:'I capelli ti sembrano secchi, spenti o che manchino di luminosità?', type:'radio', opts:['Sì','No'] },
      { id:40, sec:'Donna Giovane', q:'I capelli ti sembrano che manchino di volume?', type:'radio', opts:['Sì','No'] },
      { id:41, sec:'Donna Giovane', q:'Ti vedi diradata?', type:'check-other', opts:['Sì','No'] }
    ];

    const Q_MAMMA = [
      { id:42, sec:'Neo Mamma', q:'Da quanto hai partorito?', type:'radio-grid3', opts:['Da 3 mesi','Da 6 mesi','Da più di un anno'] },
      { id:43, sec:'Neo Mamma', q:'Hai riscontrato in gravidanza o dopo il parto carenze di ferritina, vitamina D, anemie, acido folico, vitamina B12 o disturbi della tiroide?', type:'check-other', opts:['Sì','No'] },
      { id:44, sec:'Neo Mamma', q:'Stai allattando?', type:'radio', opts:['Sì','No'] },
      { id:45, sec:'Neo Mamma', q:'Fai spesso servizi di stiratura / permanente, colorazione / schiariture?', type:'radio-grid3', opts:['Spesso','A volte','Mai'] },
      { id:46, sec:'Neo Mamma', q:'I capelli ti sembrano secchi, spenti o che manchino di luminosità?', type:'radio', opts:['Sì','No'] },
      { id:47, sec:'Neo Mamma', q:'I capelli ti sembrano che manchino di volume?', type:'radio', opts:['Sì','No'] }
    ];

    const Q_MENOPAUSA = [
      { id:48, sec:'Donna Mezza Età', q:'Hai problemi di salute?', type:'check-other', opts:['Sì','No'] },
      { id:49, sec:'Donna Mezza Età', q:'Hai mai riscontrato carenze di ferritina, vitamina D, anemie o disturbi della tiroide?', type:'check-other', opts:['Sì','No'] },
      { id:50, sec:'Donna Mezza Età', q:'Ti fanno male i capelli o la cute?', type:'radio', opts:['Sì','No'] },
      { id:51, sec:'Donna Mezza Età', q:'Lavando la testa cadono tanti capelli?', type:'radio', opts:['Sì','No'] },
      { id:52, sec:'Donna Mezza Età', q:'Com\'è il tuo umore?', type:'radio', opts:['Sono spesso triste o nervosa','A volte sono nervosa e stanca','Non riesco a dormire','Mi sento bene','Non mi sento bene'] },
      { id:53, sec:'Donna Mezza Età', q:'Ti vedi diradata?', type:'check-other', opts:['Sì','No'] },
      { id:54, sec:'Donna Mezza Età', q:'Fai spesso servizi di stiratura / permanente, colorazione / schiariture?', type:'radio-grid3', opts:['Spesso','A volte','Mai'] },
      { id:55, sec:'Donna Mezza Età', q:'I capelli ti sembrano secchi, spenti o che manchino di luminosità?', type:'radio', opts:['Sì','No'] },
      { id:56, sec:'Donna Mezza Età', q:'I capelli ti sembrano che manchino di volume?', type:'radio', opts:['Sì','No'] }
    ];

    const Q_UOMOMEZZA = [
      { id:60, sec:'Uomo Mezza Età', q:'Quando hai iniziato a notare il diradamento?', type:'radio', opts:['Tra i 18 e i 30 anni','Tra i 30 e i 45 anni','Tra i 45 e i 60 anni'] },
      { id:61, sec:'Uomo Mezza Età', q:'Hai fatto qualcosa in merito?', type:'radio', opts:['Sì','No'] },
      { id:62, sec:'Uomo Mezza Età', q:'Quanto ti è pesata questa situazione?', type:'radio-grid3', opts:['Tanto','Poco','Non mi creo problemi'] },
      { id:63, sec:'Uomo Mezza Età', q:'Quanto lo stress ha influenzato la tua vita?', type:'radio-grid3', opts:['Pochissimo','Tantissimo','Non saprei'] },
      { id:64, sec:'Uomo Mezza Età', q:'Giudichi i tuoi capelli grassi?', type:'radio-grid3', opts:['Sì','No','A volte'] },
      { id:65, sec:'Uomo Mezza Età', q:'Ti vedi diradato?', type:'check-other', opts:['Sì','No'] }
    ];

    const Q_CHEMIO = [
      { id:70, sec:'Percorso Chemioterapico', q:'Come è cambiato il tuo capello durante il percorso?', type:'radio', opts:['Li ho persi tutti','Sono deboli','Si sono diradati parecchio','Ancora uguali'] },
      { id:71, sec:'Percorso Chemioterapico', q:'Il tuo cuoio capelluto ha subito cambiamenti?', type:'check-other', opts:['Sì','No','In parte'] },
      { id:72, sec:'Percorso Chemioterapico', q:'Quale è la cosa che più ti crea disagio e difficoltà?', type:'check-other', opts:['Avere la testa senza capelli','Non sapere come comportarmi in merito','Il calore ed il prurito che ho sul cuoio capelluto'] },
      { id:73, sec:'Percorso Chemioterapico', q:'Oltre alla chemioterapia, che farmaci stai assumendo?', type:'textarea' },
      { id:74, sec:'Percorso Chemioterapico', q:'Cosa ha accompagnato il tuo percorso?', type:'check-other', opts:['Ho fatto intervento','Devo fare intervento','Radioterapia','Menopausa indotta'] }
    ];

    const Q_VISIVA = [
      { id:100, sec:'Fase Visiva e Tattile', q:'Scala di Hamilton-Norwood — calvizie maschile', type:'norwood' },
      { id:101, sec:'Fase Visiva e Tattile', q:'Scala di Ludwig — diradamento femminile', type:'ludwig' },
      { id:102, sec:'Fase Visiva e Tattile', q:'Osservazioni con Proscope (ingrandimento 200X)', type:'textarea' },
      { id:103, sec:'Fase Visiva e Tattile', q:'Gravità in relazione all\'età', type:'matrix-gravity' },
      { id:104, sec:'Fase Visiva e Tattile', q:'Caduta — tipo e entità', type:'radio', opts:['Assente','Lieve (< 50 capelli/giorno)','Moderata (50–100 capelli/giorno)','Intensa (> 100 capelli/giorno)'] },
      { id:105, sec:'Fase Visiva e Tattile', q:'Zone colpite', type:'check-other', opts:['Frontale','Tempie','Vertice / Corona','Occipitale','Laterale sinistra','Laterale destra','Diffusa'] },
      { id:106, sec:'Fase Visiva e Tattile', q:'Cuoio capelluto — aspetto lipidico', type:'radio-grid3', opts:['Secco','Normale','Grasso'] },
      { id:107, sec:'Fase Visiva e Tattile', q:'Cuoio capelluto — spessore', type:'radio-grid3', opts:['Sottile','Normale','Spesso'] },
      { id:108, sec:'Fase Visiva e Tattile', q:'Cuoio capelluto — tensione', type:'radio-grid3', opts:['Bassa','Normale','Alta'] },
      { id:109, sec:'Fase Visiva e Tattile', q:'Cuoio capelluto — colore', type:'radio-grid3', opts:['Rosa (normale)','Arrossato','Pallido'] },
      { id:110, sec:'Fase Visiva e Tattile', q:'Forfora — tipo', type:'radio', opts:['Assente','Pitiriasi secca','Pitiriasi grassa','Squame aderenti'] },
      { id:111, sec:'Fase Visiva e Tattile', q:'Prurito — intensità', type:'radio-grid2', opts:['Assente','Lieve','Moderato','Intenso'] },
      { id:112, sec:'Fase Visiva e Tattile', q:'Odore del cuoio capelluto', type:'radio-grid3', opts:['Assente','Lieve','Intenso'] },
      { id:113, sec:'Fase Visiva e Tattile', q:'Sudorazione', type:'radio-grid3', opts:['Scarsa','Normale','Eccessiva'] },
      { id:114, sec:'Fase Visiva e Tattile', q:'Caratteristiche dei capelli', type:'check-other', opts:['Secchi','Grassi','Fragili','Spenti','Privi di volume','Con doppie punte','Trattati chimicamente'] },
      { id:115, sec:'Fase Visiva e Tattile', q:'Tipo di incidenza', type:'incidenze-visive' },
      { id:116, sec:'Fase Visiva e Tattile', q:'Patologie riscontrate', type:'patologie-check' },
      { id:117, sec:'Fase Visiva e Tattile', q:'Tipo di incidenze — dettaglio', type:'incidenze-tabella' },
      { id:118, sec:'Fase Visiva e Tattile', q:'Note finali', type:'textarea' }
    ];

    // Stato del questionario
    let S = {
      step: 'conoscitiva',
      qIdx: 0,
      casoTipo: null,
      answers: {},
      checkAns: {},
      otherTxt: {},
      gravity: {},
      incidenze: new Set(),
      incidenzeTab: new Set(),
    };

    function getActiveQuestions() {
      switch(S.step) {
        case 'conoscitiva': return Q_CONOSCITIVA;
        case 'indagine': return Q_INDAGINE;
        case 'caso':
          if (S.casoTipo === 'uomo') return Q_UOMO;
          if (S.casoTipo === 'donna') return Q_DONNA;
          if (S.casoTipo === 'mamma') return Q_MAMMA;
          if (S.casoTipo === 'menopausa') return Q_MENOPAUSA;
          if (S.casoTipo === 'uomomezza') return Q_UOMOMEZZA;
          if (S.casoTipo === 'chemio') return Q_CHEMIO;
          return [];
        case 'visiva':
          if (S.casoTipo === 'uomo' || S.casoTipo === 'uomomezza') return Q_VISIVA.filter(q => q.id !== 101);
          if (S.casoTipo === 'chemio') return Q_VISIVA.filter(q => q.id !== 101 && q.id !== 100);
          if (S.casoTipo === 'donna' || S.casoTipo === 'mamma' || S.casoTipo === 'menopausa') return Q_VISIVA.filter(q => q.id !== 100);
          return Q_VISIVA;
        default: return [];
      }
    }

    function cur() {
      const qs = getActiveQuestions();
      return qs[S.qIdx] || null;
    }

    function getCasoLength() {
      if (S.casoTipo === 'uomo') return Q_UOMO.length;
      if (S.casoTipo === 'donna') return Q_DONNA.length;
      if (S.casoTipo === 'mamma') return Q_MAMMA.length;
      if (S.casoTipo === 'menopausa') return Q_MENOPAUSA.length;
      if (S.casoTipo === 'uomomezza') return Q_UOMOMEZZA.length;
      if (S.casoTipo === 'chemio') return Q_CHEMIO.length;
      return 6;
    }

    function getVisivaLength() {
      if (S.casoTipo === 'uomo' || S.casoTipo === 'uomomezza') return Q_VISIVA.length - 1;
      if (S.casoTipo === 'chemio') return Q_VISIVA.length - 2;
      if (S.casoTipo === 'donna' || S.casoTipo === 'mamma' || S.casoTipo === 'menopausa') return Q_VISIVA.length - 1;
      return Q_VISIVA.length;
    }

    function globalProgress() {
      let done = 0;
      let casoLen = S.casoTipo ? getCasoLength() : 6;
      let visivaLen = getVisivaLength();
      
      if (S.step === 'conoscitiva') done = S.qIdx;
      else if (S.step === 'indagine') done = Q_CONOSCITIVA.length + S.qIdx;
      else if (S.step === 'selector') done = Q_CONOSCITIVA.length + Q_INDAGINE.length;
      else if (S.step === 'caso') done = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + S.qIdx;
      else if (S.step === 'visiva') done = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + casoLen + S.qIdx;
      else if (S.step === 'done') return 'Completato';
      
      const total = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + casoLen + visivaLen;
      return (done + 1) + ' / ' + total;
    }

    function renderTimeline() {
      const tl = document.getElementById('si-timeline');
      if (!tl) return;
      
      let casoLabel = 'Caso';
      let casoIcon = '3';
      if (S.casoTipo === 'uomo') { casoLabel = 'Uomo'; casoIcon = '👨'; }
      else if (S.casoTipo === 'donna') { casoLabel = 'Donna'; casoIcon = '👩'; }
      else if (S.casoTipo === 'mamma') { casoLabel = 'Mamma'; casoIcon = '🤱'; }
      else if (S.casoTipo === 'menopausa') { casoLabel = 'Menopausa'; casoIcon = '👩‍🦳'; }
      else if (S.casoTipo === 'uomomezza') { casoLabel = 'Uomo Mezza'; casoIcon = '🧔'; }
      else if (S.casoTipo === 'chemio') { casoLabel = 'Chemio'; casoIcon = '🎗️'; }
      
      const phases = [
        { label: 'Conoscitiva', icon: '1', active: S.step === 'conoscitiva' },
        { label: 'Indagine', icon: '2', active: S.step === 'indagine' },
        { label: casoLabel, icon: casoIcon, active: S.step === 'selector' || S.step === 'caso' },
        { label: 'Visiva', icon: '4', active: S.step === 'visiva' },
        { label: 'Fine', icon: '✓', active: S.step === 'done' },
      ];
      
      let currentIdx = phases.findIndex(p => p.active);
      let done = 0;
      let casoLen = S.casoTipo ? getCasoLength() : 6;
      let visivaLen = getVisivaLength();
      
      if (S.step === 'conoscitiva') done = S.qIdx;
      else if (S.step === 'indagine') done = Q_CONOSCITIVA.length + S.qIdx;
      else if (S.step === 'selector') done = Q_CONOSCITIVA.length + Q_INDAGINE.length;
      else if (S.step === 'caso') done = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + S.qIdx;
      else if (S.step === 'visiva') done = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + casoLen + S.qIdx;
      else if (S.step === 'done') done = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + casoLen + visivaLen;
      
      const total = Q_CONOSCITIVA.length + Q_INDAGINE.length + 1 + casoLen + visivaLen;
      const progressPercent = Math.min(100, Math.max(0, (done / total) * 100));
      
      let html = `<div class="tl-progress-bg"><div class="tl-progress-fill" style="width: ${progressPercent}%"></div></div>`;
      html += `<div class="tl-steps">`;
      phases.forEach((p, i) => {
        let cls = 'tl-item';
        if (i < currentIdx) cls += ' done';
        if (i === currentIdx) cls += ' active';
        
        let iconContent = p.icon;
        if (i < currentIdx && p.icon !== '✓' && !['👨','👩','🤱','👩‍🦳','🧔','🎗️'].includes(p.icon)) {
          iconContent = '✓';
        }
        
        html += `<div class="${cls}"><div class="tl-dot">${iconContent}</div><div class="tl-lbl">${p.label}</div></div>`;
      });
      html += `</div>`;
      tl.innerHTML = html;
    }

    function initQuestionnaire() {
      renderQuestionnaire();
    }

    function renderQuestionnaire() {
      renderTimeline();
      
      const main = document.getElementById('si-question-container');
      const btnBack = document.getElementById('si-btn-back');
      const btnNext = document.getElementById('si-btn-next');
      const stepProgress = document.getElementById('si-step-progress');
      
      if (!main) return;
      
      stepProgress.textContent = globalProgress();
      btnBack.disabled = (S.step === 'conoscitiva' && S.qIdx === 0);
      
      if (S.step === 'done') {
        btnNext.style.display = 'none';
        renderDone(main);
        return;
      }
      
      btnNext.style.display = '';
      
      if (S.step === 'selector') {
        btnNext.style.display = 'none';
        renderSelector(main);
        return;
      }
      
      const q = cur();
      if (!q) return;
      
      let html = `<div class="sec-badge" style="margin-bottom: 12px; margin-top: 10px;">${q.sec}</div>
      <div class="q-card">
        <div class="q-num">Domanda ${q.id}</div>
        <div class="q-text" style="font-size: 17px; font-weight: 700; color: var(--dark); margin-bottom: 16px;">${q.q}</div>`;
      html += renderInput(q);
      html += `</div>`;
      main.innerHTML = html;
    }

    function renderSelector(main) {
      main.innerHTML = `
      <div class="sec-badge" style="margin-bottom: 12px; margin-top: 10px;">Seleziona Caso Specifico</div>
      <div class="q-card">
        <div class="q-text" style="font-size: 16px; font-weight: 700; margin-bottom: 20px;">Seleziona il caso specifico per questo cliente:</div>
        <div class="caso-selector">
          <button type="button" class="caso-btn uomo" onclick="siSelectCaso('uomo')">
            <div class="caso-icon">👨</div>
            <div class="caso-label">Uomo Giovane</div>
          </button>
          <button type="button" class="caso-btn donna" onclick="siSelectCaso('donna')">
            <div class="caso-icon">👩</div>
            <div class="caso-label">Donna Giovane</div>
          </button>
          <button type="button" class="caso-btn mamma" onclick="siSelectCaso('mamma')">
            <div class="caso-icon">🤱</div>
            <div class="caso-label">Neo Mamma</div>
          </button>
          <button type="button" class="caso-btn menopausa" onclick="siSelectCaso('menopausa')">
            <div class="caso-icon">👩‍🦳</div>
            <div class="caso-label">Donna Mezza Età</div>
          </button>
          <button type="button" class="caso-btn uomomezza" onclick="siSelectCaso('uomomezza')">
            <div class="caso-icon">🧔</div>
            <div class="caso-label">Uomo di Mezza Età</div>
          </button>
          <button type="button" class="caso-btn chemio" onclick="siSelectCaso('chemio')">
            <div class="caso-icon">🎗️</div>
            <div class="caso-label">Percorso Chemioterapico</div>
          </button>
        </div>
      </div>`;
    }

    function renderInput(q) {
      switch (q.type) {
        case 'name':            return rName(q);
        case 'radio':           return rRadioList(q);
        case 'radio-grid2':     return rRadioGrid(q, 2);
        case 'radio-grid3':     return rRadioGrid(q, 3);
        case 'check-other':     return rCheckOther(q);
        case 'scale':           return rScale(q);
        case 'textarea':        return rTextarea(q);
        case 'matrix-gravity':  return rMatrixGravity();
        case 'matrix-incidenze':return rMatrixIncidenze();
        case 'incidenze-visive':return rIncidenze();
        case 'patologie-check': return rPatologie();
        case 'incidenze-tabella':return rIncidenzeTabella();
        case 'norwood':         return rNorwood(q);
        case 'ludwig':          return rLudwig(q);
        default: return '';
      }
    }

    function rName(q) {
      const first = S.answers[q.id + '_first'] || '';
      const last  = S.answers[q.id + '_last']  || '';
      return `<div class="name-row">
        <div class="inp-group"><label>Nome</label><input type="text" value="${first}" placeholder="Nome" oninput="siSetAnswer('${q.id}_first',this.value)"></div>
        <div class="inp-group"><label>Cognome</label><input type="text" value="${last}" placeholder="Cognome" oninput="siSetAnswer('${q.id}_last',this.value)"></div>
      </div>`;
    }

    function rRadioList(q) {
      return '<div class="opts">' + q.opts.map(o => {
        const sel = S.answers[q.id] === o ? ' sel' : '';
        const col = optColorClass(o);
        return `<button type="button" class="opt${sel}${col}" onclick="siPickR(${q.id},'${escQ(o)}')"><span class="opt-radio"></span>${o}</button>`;
      }).join('') + '</div>';
    }

    function rRadioGrid(q, cols) {
      const cls = cols === 3 ? 'opts-grid3' : 'opts-grid2';
      return '<div class="' + cls + '">' + q.opts.map(o => {
        const sel = S.answers[q.id] === o ? ' sel' : '';
        const col = optColorClass(o);
        return `<button type="button" class="opt${sel}${col}" onclick="siPickR(${q.id},'${escQ(o)}')"><span class="opt-radio"></span>${o}</button>`;
      }).join('') + '</div>';
    }

    function rCheckOther(q) {
      const set   = S.checkAns[q.id] || new Set();
      const other = S.otherTxt[q.id] || '';
      let html = '<div class="opts">';
      q.opts.forEach(o => {
        const sel = set.has(o) ? ' sel' : '';
        const col = optColorClass(o);
        html += `<button type="button" class="opt${sel}${col}" onclick="siToggleC(${q.id},'${escQ(o)}')"><span class="opt-check"></span>${o}</button>`;
      });
      html += '</div>';
      html += `<div class="other-row"><span class="other-lbl">Altro:</span><input class="other-inp" type="text" value="${other}" placeholder="Specifica…" oninput="siSetOtherTxt('${q.id}',this.value)"></div>`;
      return html;
    }

    function rScale(q) {
      const val = S.answers[q.id];
      let btns = '';
      for (let i = 1; i <= 10; i++) {
        const sel = val == i ? ' sel' : '';
        btns += `<button type="button" class="scale-btn${sel}" onclick="siPickS(${q.id},${i})">${i}</button>`;
      }
      return `<div class="scale-wrap">
        <div class="scale-ends"><span>Pessima</span><span>Ottima</span></div>
        <div class="scale-btns">${btns}</div>
      </div>`;
    }

    function rTextarea(q) {
      const val = S.answers[q.id] || '';
      return `<textarea placeholder="Scrivi qui…" oninput="siSetAnswer('${q.id}',this.value)">${val}</textarea>`;
    }

    function rMatrixGravity() {
      const zones = ['Attaccatura frontale','Tempie','Vertice / Corona','Zona occipitale','Laterale sinistra','Laterale destra'];
      const cols  = ['1','2','3','4','5'];
      let html = '<div class="mx-scroll"><table class="mx-table"><thead><tr><th>Zona</th>';
      cols.forEach(c => html += `<th>${c}</th>`);
      html += '</tr></thead><tbody>';
      zones.forEach(z => {
        html += `<tr><td>${z}</td>`;
        cols.forEach((c, ci) => {
          const sel = S.gravity[z] === ci ? ' sel' : '';
          html += `<td><div class="mx-dot${sel}" onclick="siPickGrav('${escQ(z)}',${ci})"></div></td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      return html;
    }

    const INCIDENZE_TIPI = [
      { tipo:'Digestiva',    img:'img/incidenza-digestiva.png' },
      { tipo:'Nervosa',      img:'img/incidenza-nervosa.png' },
      { tipo:'Fisica',       img:'img/incidenza-fisica.png' },
      { tipo:'Psicofisica',  img:'img/incidenza-psicofisica.png' },
    ];

    function rIncidenze() {
      let html = '<div class="clinical-grid incidenze-grid">';
      INCIDENZE_TIPI.forEach(i => {
        const sel = S.answers['incid_tipo'] === i.tipo ? ' sel' : '';
        html += `<div class="clinical-item${sel}" onclick="siPickIncidTipo('${escQ(i.tipo)}')">
          <img src="${i.img}" alt="${i.tipo}" style="width: 100%; height: auto; border-radius: 4px; display: block;" referrerPolicy="no-referrer" />
          <div class="ci-stage">${i.tipo}</div>
        </div>`;
      });
      html += '</div>';
      return html;
    }

    function rPatologie() {
      const types = [
        'Alopecia androgenetica','Alopecia areata','Alopecia da trazione',
        'Telogen effluvium','Anagen effluvium','Dermatite seborroica',
        'Pitiriasi','Psoriasi del cuoio capelluto','Tricotillomania'
      ];
      let html = '<div class="opts">';
      types.forEach(t => {
        const sel = S.incidenze.has(t) ? ' sel' : '';
        html += `<button type="button" class="opt${sel}" onclick="siToggleI('${escQ(t)}')"><span class="opt-check"></span>${t}</button>`;
      });
      html += '</div>';
      const other = S.otherTxt['incid'] || '';
      html += `<div class="other-row"><span class="other-lbl">Altro:</span><input class="other-inp" type="text" value="${other}" placeholder="Specifica…" oninput="siSetOtherTxt('incid',this.value)"></div>`;
      return html;
    }

    function rMatrixIncidenze() {
      return rIncidenze() + rPatologie();
    }

    const INCIDENZE_DETTAGLIO = [
      { label: 'Vertice posteriore', col: 'rosso' },
      { label: 'Generalmente diffuso', col: 'blu' },
      { label: 'Cuoio capelluto iperlipidico', col: 'rosso' },
      { label: 'Cuoio capelluto sottile', col: 'blu' },
      { label: 'Cuoio capelluto spesso', col: 'rosso' },
      { label: 'Cuoio capelluto grigiastro', col: 'blu' },
      { label: 'Cuoio capelluto mobile', col: 'rosso' },
      { label: 'Localizzazione del prurito zona superiore', col: 'blu' },
      { label: 'Cuoio capelluto rosato', col: 'rosso' },
      { label: 'Odore cuoio capelluto ammoniacale', col: 'blu' },
      { label: 'Forfora grassa', col: 'rosso' },
      { label: 'Sudorazione intensa', col: 'blu' },
      { label: 'Odore cuoio capelluto rancido', col: 'rosso' },
      { label: 'Capelli fini', col: 'blu' },
      { label: 'Capelli grossi', col: 'rosso' },
    ];

    function rIncidenzeTabella() {
      if (!S.incidenzeTab) S.incidenzeTab = new Set();
      
      let html = '<div class="incidenze-tab-grid">';
      
      // Colonna BLU
      html += '<div class="incidenze-col incidenze-col-blu">';
      html += '<div class="incidenze-col-header blu">Incidenza Blu</div>';
      INCIDENZE_DETTAGLIO.filter(i => i.col === 'blu').forEach(i => {
        const sel = S.incidenzeTab.has(i.label) ? ' sel' : '';
        html += `<button type="button" class="incidenze-item blu${sel}" onclick="siToggleIncidTab('${escQ(i.label)}')">
          <span class="incidenze-dot"></span>${i.label}
        </button>`;
      });
      html += '</div>';
      
      // Colonna ROSSA
      html += '<div class="incidenze-col incidenze-col-rosso">';
      html += '<div class="incidenze-col-header rosso">Incidenza Rossa</div>';
      INCIDENZE_DETTAGLIO.filter(i => i.col === 'rosso').forEach(i => {
        const sel = S.incidenzeTab.has(i.label) ? ' sel' : '';
        html += `<button type="button" class="incidenze-item rosso${sel}" onclick="siToggleIncidTab('${escQ(i.label)}')">
          <span class="incidenze-dot"></span>${i.label}
        </button>`;
      });
      html += '</div>';
      
      html += '</div>';
      return html;
    }

    const NORWOOD_STAGES = [
      { stage:'I',    img:'img/norwood-1.png' },
      { stage:'II',   img:'img/norwood-2.png' },
      { stage:'III',  img:'img/norwood-3.png' },
      { stage:'IIIv', img:'img/norwood-3v.png' },
      { stage:'IV',   img:'img/norwood-4.png' },
      { stage:'IVa',  img:'img/norwood-4a.png' },
      { stage:'V',    img:'img/norwood-5.png' },
      { stage:'Va',   img:'img/norwood-5a.png' },
      { stage:'VI',   img:'img/norwood-6.png' },
      { stage:'VII',  img:'img/norwood-7.png' },
      { stage:'VIIa', img:'img/norwood-7a.png' },
    ];

    function rNorwood(q) {
      let html = '<div class="clinical-grid">';
      NORWOOD_STAGES.forEach(s => {
        const sel = S.answers[q.id] === s.stage ? ' sel' : '';
        html += `<div class="clinical-item${sel}" onclick="siPickR(${q.id},'${escQ(s.stage)}')">
          <img src="${s.img}" alt="Stadio ${s.stage}" style="width: 100%; height: auto; border-radius: 4px; display: block;" referrerPolicy="no-referrer" />
        </div>`;
      });
      html += '</div>';
      return html;
    }

    const LUDWIG_STAGES = [
      { stage:'I',   label:'Grado I',   img:'img/ludwig-1.png' },
      { stage:'II',  label:'Grado II',  img:'img/ludwig-2.png' },
      { stage:'III', label:'Grado III', img:'img/ludwig-3.png' },
    ];

    function rLudwig(q) {
      let html = '<div class="clinical-grid ludwig-grid">';
      LUDWIG_STAGES.forEach(s => {
        const sel = S.answers[q.id] === s.stage ? ' sel' : '';
        html += `<div class="clinical-item${sel}" onclick="siPickR(${q.id},'${escQ(s.stage)}')">
          <img src="${s.img}" alt="${s.label}" style="width: 100%; height: auto; border-radius: 4px; display: block;" referrerPolicy="no-referrer" />
          <div class="ci-stage">${s.label}</div>
        </div>`;
      });
      html += '</div>';
      return html;
    }

    function renderDone(main) {
      const name = (S.answers['1_first'] || '') + ' ' + (S.answers['1_last'] || '');
      const display = name.trim() ? name.trim() : null;
      main.innerHTML = `
      <div class="done-card">
        <div class="done-icon">✓</div>
        <h2>Scheda completata!</h2>
        <p>${display ? 'Grazie <strong>' + display + '</strong>.<br>' : ''}La scheda tricologica è stata compilata con successo ed è in fase di caricamento.</p>
      </div>`;
    }

    // Actions & Event handlers
    function siGoBack() {
      if (S.step === 'conoscitiva' && S.qIdx > 0) {
        S.qIdx--;
      } else if (S.step === 'indagine' && S.qIdx > 0) {
        S.qIdx--;
      } else if (S.step === 'indagine' && S.qIdx === 0) {
        S.step = 'conoscitiva';
        S.qIdx = Q_CONOSCITIVA.length - 1;
      } else if (S.step === 'selector') {
        S.step = 'indagine';
        S.qIdx = Q_INDAGINE.length - 1;
      } else if (S.step === 'caso' && S.qIdx > 0) {
        S.qIdx--;
      } else if (S.step === 'caso' && S.qIdx === 0) {
        S.step = 'selector';
        S.casoTipo = null;
      } else if (S.step === 'visiva' && S.qIdx > 0) {
        S.qIdx--;
      } else if (S.step === 'visiva' && S.qIdx === 0) {
        S.step = 'caso';
        S.qIdx = getActiveQuestions().length - 1;
      }
      renderQuestionnaire();
    }

    function siGoNext() {
      const qs = getActiveQuestions();
      
      if (S.step === 'conoscitiva') {
        if (S.qIdx === 0) {
          const first = S.answers['1_first'] || '';
          const last  = S.answers['1_last']  || '';
          if (!first.trim() || !last.trim()) {
            alert('Inserisci sia il nome che il cognome per continuare.');
            return;
          }
        }
        
        if (S.qIdx < qs.length - 1) {
          S.qIdx++;
        } else {
          S.step = 'indagine';
          S.qIdx = 0;
        }
      } else if (S.step === 'indagine') {
        if (S.qIdx < qs.length - 1) {
          S.qIdx++;
        } else {
          S.step = 'selector';
        }
      } else if (S.step === 'caso') {
        if (S.qIdx < qs.length - 1) {
          S.qIdx++;
        } else {
          S.step = 'visiva';
          S.qIdx = 0;
        }
      } else if (S.step === 'visiva') {
        if (S.qIdx < qs.length - 1) {
          S.qIdx++;
        } else {
          siSaveAndUpload();
          S.step = 'done';
        }
      }
      renderQuestionnaire();
    }

    function siSelectCaso(tipo) {
      S.casoTipo = tipo;
      S.step = 'caso';
      S.qIdx = 0;
      renderQuestionnaire();
    }

    function siPickR(id, val) {
      S.answers[id] = val;
      renderQuestionnaire();
    }
    function siPickS(id, val) {
      S.answers[id] = val;
      renderQuestionnaire();
    }
    function siToggleC(id, val) {
      if (!S.checkAns[id]) S.checkAns[id] = new Set();
      if (S.checkAns[id].has(val)) S.checkAns[id].delete(val);
      else S.checkAns[id].add(val);
      renderQuestionnaire();
    }
    function siPickGrav(zone, col) {
      if (S.gravity[zone] === col) delete S.gravity[zone];
      else S.gravity[zone] = col;
      renderQuestionnaire();
    }
    function siToggleI(val) {
      if (S.incidenze.has(val)) S.incidenze.delete(val);
      else S.incidenze.add(val);
      renderQuestionnaire();
    }
    function siPickIncidTipo(val) {
      if (S.answers['incid_tipo'] === val) delete S.answers['incid_tipo'];
      else S.answers['incid_tipo'] = val;
      renderQuestionnaire();
    }
    function siToggleIncidTab(val) {
      if (S.incidenzeTab.has(val)) S.incidenzeTab.delete(val);
      else S.incidenzeTab.add(val);
      renderQuestionnaire();
    }

    function siResetForm() {
      S = { step:'conoscitiva', qIdx:0, casoTipo:null, answers:{}, checkAns:{}, otherTxt:{}, gravity:{}, incidenze:new Set(), incidenzeTab:new Set() };
      renderQuestionnaire();
    }

    window.siSelectCaso = siSelectCaso;
    window.siGoBack = siGoBack;
    window.siGoNext = siGoNext;
    window.siPickR = siPickR;
    window.siPickS = siPickS;
    window.siToggleC = siToggleC;
    window.siPickGrav = siPickGrav;
    window.siToggleI = siToggleI;
    window.siPickIncidTipo = siPickIncidTipo;
    window.siToggleIncidTab = siToggleIncidTab;
    window.siResetForm = siResetForm;

    function siSetAnswer(key, val) {
      S.answers[key] = val;
    }
    function siSetOtherTxt(key, val) {
      S.otherTxt[key] = val;
    }
    window.siSetAnswer = siSetAnswer;
    window.siSetOtherTxt = siSetOtherTxt;

    function generaHTMLPdf() {
      const nome = S.answers['1_first'] || '';
      const cognome = S.answers['1_last'] || '';
      const timestamp = new Date().toLocaleString('it-IT');
      const casoTipo = S.casoTipo || '';
      const incidenzaTipo = S.answers['incid_tipo'] || 'Non specificato';
      
      const tutteDomande = [...Q_CONOSCITIVA, ...Q_INDAGINE, ...Q_UOMO, ...Q_DONNA, ...Q_MAMMA, ...Q_MENOPAUSA, ...Q_UOMOMEZZA, ...Q_CHEMIO, ...Q_VISIVA];
      let risposteHTML = '';
      let checkboxHTML = '';
      
      tutteDomande.forEach(q => {
        if (S.answers[q.id] !== undefined) {
          risposteHTML += '<div style="margin-bottom:8px;padding:8px 12px;background:#fafafa;border-radius:4px;"><strong>' + q.q + ':</strong> ' + S.answers[q.id] + '</div>';
        }
        if (S.checkAns[q.id] && S.checkAns[q.id].size > 0) {
          checkboxHTML += '<div style="margin-bottom:8px;padding:8px 12px;background:#fafafa;border-radius:4px;"><strong>' + q.q + ':</strong> ' + Array.from(S.checkAns[q.id]).join(', ') + '</div>';
        }
      });
      
      let gravityHTML = '';
      Object.entries(S.gravity).forEach(([zona, val]) => {
        const pct = (val + 1) * 20;
        gravityHTML += '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#fafafa;margin-bottom:5px;border-radius:4px;"><span>' + zona + '</span><div style="width:100px;height:8px;background:#e5e5e5;border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:#EAB308;"></div></div></div>';
      });
      
      const incidenze = Array.from(S.incidenze);
      let incidenzeBadges = incidenze.map(i => '<span style="display:inline-block;background:#EAB308;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;margin:3px;">' + i + '</span>').join('');
      if (!incidenzeBadges) incidenzeBadges = '<span style="color:#888;">Nessuna</span>';
      
      const incidenzeTab = Array.from(S.incidenzeTab);
      let incidenzeTabBadges = incidenzeTab.map(i => '<span style="display:inline-block;background:transparent;border:1px solid #EAB308;color:#333;padding:3px 10px;border-radius:12px;font-size:12px;margin:3px;">' + i + '</span>').join('');
      if (!incidenzeTabBadges) incidenzeTabBadges = '<span style="color:#888;">Nessuna</span>';
     
      return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#1a1a1a;font-size:14px}h1{color:#EAB308;border-bottom:2px solid #EAB308;padding-bottom:10px;margin-bottom:30px;font-size:24px}.header-subtitle{color:#666;font-size:12px;margin-top:-25px;margin-bottom:30px}.info-box{background:#f8f7f4;padding:20px;border-radius:8px;margin-bottom:30px;border-left:4px solid #EAB308}h2{color:#333;font-size:16px;margin-top:30px;margin-bottom:15px;padding-bottom:5px;border-bottom:1px solid #ddd}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:11px;color:#888;text-align:center}</style></head><body><h1>Scheda Tricologica</h1><p class="header-subtitle">Beautri S.R.L. — Centro Tricologico</p><div class="info-box"><p><strong>Cliente:</strong> ' + cognome + ' ' + nome + '</p><p><strong>Caso:</strong> ' + casoTipo + '</p><p><strong>Data compilazione:</strong> ' + timestamp + '</p></div><h2>Risposte Questionario</h2>' + (risposteHTML || '<p style="color:#888;">Nessuna risposta</p>') + '<h2>Selezioni Multiple</h2>' + (checkboxHTML || '<p style="color:#888;">Nessuna selezione</p>') + '<h2>Tipo di Incidenza</h2><p><span style="display:inline-block;background:#EAB308;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;">' + incidenzaTipo + '</span></p><h2>Patologie Riscontrate</h2><div>' + incidenzeBadges + '</div><h2>Dettaglio Incidenze</h2><div>' + incidenzeTabBadges + '</div><h2>Gravità per Zona</h2>' + (gravityHTML || '<p style="color:#888;">Nessuna gravità specificata</p>') + '<div class="footer">Documento generato automaticamente — ' + timestamp + '</div></body></html>';
    }

    function showSiToast(title, desc, type) {
      showToast(title, desc, type);
    }

    async function fetchWithTimeout(url, options, timeoutMs = 30000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    async function generaPdfBase64(htmlContent, retries = 3) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const pdfResponse = await fetchWithTimeout('https://api.html2pdf.app/v1/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: HTML2PDF_API_KEY,
              html: htmlContent,
              format: 'A4',
              marginTop: 20,
              marginBottom: 20,
              marginLeft: 20,
              marginRight: 20
            })
          }, 30000);
          
          if (!pdfResponse.ok) {
            throw new Error('HTTP ' + pdfResponse.status);
          }
          
          const pdfBlob = await pdfResponse.blob();
          
          if (!pdfBlob || pdfBlob.size < 1000) {
            throw new Error('PDF vuoto o corrotto (' + (pdfBlob?.size || 0) + ' bytes)');
          }
          
          const pdfBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result;
              if (result && result.includes(',')) {
                resolve(result.split(',')[1]);
              } else {
                reject(new Error('Conversione base64 fallita'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(pdfBlob);
          });
          
          if (!pdfBase64 || pdfBase64.length < 100) {
            throw new Error('Base64 non valido');
          }
          
          return pdfBase64;
          
        } catch (err) {
          console.warn('Tentativo ' + attempt + '/' + retries + ' fallito:', err.message);
          if (attempt === retries) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    async function inviaAGoogleDrive(filename, pdfBase64, retries = 2) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: filename,
              pdfBase64: pdfBase64
            })
          });
          return true;
        } catch (err) {
          console.warn('Upload tentativo ' + attempt + '/' + retries + ' fallito:', err.message);
          if (attempt === retries) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    function base64ToBlob(base64, type = 'application/pdf') {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], {type: type});
    }

    async function siSaveAndUpload() {
      const nome = S.answers['1_first'] || '';
      const cognome = S.answers['1_last'] || '';
      const clientFullName = (cognome + ' ' + nome).trim() || 'Cliente Senza Nome';
      const clientId = 'si_' + Date.now() + Math.random().toString(36).substring(2, 7);

      showSiToast("Salvataggio in corso", "Salvataggio del record nel database...", "loading");

      try {
        const docData = {
          id: clientId,
          name: clientFullName,
          recordType: 'scheda_interna',
          casoTipo: S.casoTipo || 'generico',
          createdAt: firebaseActive ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
          answers: S.answers,
          checkAns: Object.fromEntries(
            Object.entries(S.checkAns).map(([k, set]) => [k, Array.from(set || [])])
          ),
          otherTxt: S.otherTxt,
          gravity: S.gravity,
          incidenze: Array.from(S.incidenze || []),
          incidenzeTab: Array.from(S.incidenzeTab || [])
        };

        if (firebaseActive) {
          await db.collection('tricologia_consultations').doc(clientId).set(docData);
        } else {
          const offlineList = JSON.parse(localStorage.getItem('beautri_offline_consultations') || '[]');
          offlineList.push(docData);
          localStorage.setItem('beautri_offline_consultations', JSON.stringify(offlineList));
        }

        showSiToast("Scheda Salvata!", "La scheda clinica è stata salvata con successo.", "success");
        setTimeout(hideToast, 1500);

        siResetForm();
        const tabBtnStorico = document.getElementById('btn-tab-storico');
        if (tabBtnStorico) {
          tabBtnStorico.click();
        }

      } catch (err) {
        console.error('Errore durante il salvataggio:', err);
        showSiToast("Errore di Salvataggio", err.message || "Impossibile salvare la scheda. Riprova.", "error");
      }
    }

    function optColorClass(val) {
      const v = (val || '').trim();
      if (v === 'Sì') return ' opt-si';
      if (v === 'No') return ' opt-no';
      if (v === 'Maschio') return ' opt-maschio';
      if (v === 'Femmina') return ' opt-femmina';
      return '';
    }

    function escQ(s) {
      return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
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

    // Ripristina il tab storico se specificato nella query string (es: per tornare indietro da landing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'history') {
      const tabBtnStorico = document.querySelector('.tab-btn[data-tab="tab-storico"]');
      if (tabBtnStorico) {
        setTimeout(() => {
          tabBtnStorico.click();
        }, 100);
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
    const btnBackToAdmin = document.getElementById('btn-back-to-admin');
    
    // Mostra il tasto indietro se visualizzato dall'amministratore Daniela (?admin=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true' && btnBackToAdmin) {
      btnBackToAdmin.style.display = 'flex';
    }

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
        if (cardProductsSection) cardProductsSection.style.display = (data.products && data.products.length > 0) ? 'block' : 'none';
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
