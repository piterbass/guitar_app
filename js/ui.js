// ============================================================
// ui.js  –  Lógica de interfaz y eventos
// ============================================================

(function () {
  const { NOTE_NAMES, CHORD_FORMULAS, fretToPC, pcToName } = window.MusicTheory;
  const { parseChord, buildChordName } = window.ChordParser;
  const { findVoicings } = window.VoicingFinder;
  const { createDiagram, addScaleOverlay } = window.FretboardSVG;
  const Bank = window.ChordBank;
  const SB = window.Songbook;

  // Elementos del DOM
  let elInput, elBtnSearch, elGrid, elInfo, elSortSelect, elPositionFilter, elVoicingCategory;
  let elRoot, elQuality, elBass;
  let elExtensions;
  let elTabGen, elTabBank, elTabPractice, elChordPracticePanel, elManualSection, elBankSearch, elBankSearchInput;
  let elScaleSection, elScaleSelect, elScaleNotes;
  let elScaleModeToggle, elHarmonicFunction, elShowTargets;
  let elPlayScaleBtn, elScaleTempo;
  let syncLock = false;
  let currentTab = 'generated';

  // Estado
  let currentChord = null;
  let currentChordPCs = null;
  let currentScales = [];
  let scaleMode = 'compatible';
  let harmonicFunction = 'tonica';
  let showTargets = true;
  let currentScalePlayback = null;
  let scaleRefCard = null; // card seleccionada como referencia para reproducir escala

  // ── Navegación principal ────────────────────────────────────

  function showSection(sectionName) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + sectionName);
    if (target) target.classList.add('active');

    // Actualizar nav activo
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (sectionName === 'chords') {
      document.getElementById('nav-chords').classList.add('active');
    } else if (sectionName === 'scales') {
      document.getElementById('nav-scales').classList.add('active');
    } else if (sectionName === 'songs' || sectionName === 'song-edit' || sectionName === 'song-view') {
      document.getElementById('nav-songs').classList.add('active');
    } else if (sectionName === 'analyzer') {
      document.getElementById('nav-analyzer').classList.add('active');
    }
  }

  // ── Init ────────────────────────────────────────────────────

  function init() {
    elInput = document.getElementById('chord-input');
    elBtnSearch = document.getElementById('btn-search');
    elGrid = document.getElementById('results-grid');
    elInfo = document.getElementById('chord-info');
    elSortSelect = document.getElementById('sort-select');
    elPositionFilter = document.getElementById('position-filter');
    elVoicingCategory = document.getElementById('voicing-category');
    elRoot = document.getElementById('sel-root');
    elQuality = document.getElementById('sel-quality');
    elBass = document.getElementById('sel-bass');
    elExtensions = document.querySelectorAll('.ext-checkbox');
    elTabGen = document.getElementById('tab-generated');
    elTabBank = document.getElementById('tab-bank');
    elTabPractice = document.getElementById('tab-practice');
    elChordPracticePanel = document.getElementById('chord-practice-panel');
    elManualSection = document.getElementById('manual-section');
    elBankSearch = document.getElementById('bank-search');
    elBankSearchInput = document.getElementById('bank-search-input');
    elScaleSection = document.getElementById('scale-section');
    elScaleSelect = document.getElementById('scale-select');
    elScaleNotes = document.getElementById('scale-notes');
    elScaleModeToggle = document.getElementById('scale-mode-toggle');
    elHarmonicFunction = document.getElementById('harmonic-function');
    elShowTargets = document.getElementById('show-targets');
    elPlayScaleBtn = document.getElementById('play-scale-btn');
    elScaleTempo = document.getElementById('scale-tempo');

    populateSelectors();

    // Search events
    elBtnSearch.addEventListener('click', doSearch);
    elInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    elSortSelect.addEventListener('change', () => {
      if (currentTab === 'generated') doSearch();
    });
    elPositionFilter.addEventListener('change', () => {
      if (currentTab === 'generated') doSearch();
    });
    elVoicingCategory.addEventListener('change', () => {
      if (currentTab === 'generated') doSearch();
    });
    elScaleSelect.addEventListener('change', applyScaleOverlay);

    // Scale mode toggle
    elScaleModeToggle.querySelectorAll('.scale-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        elScaleModeToggle.querySelectorAll('.scale-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        scaleMode = btn.dataset.mode;
        elHarmonicFunction.style.display = scaleMode === 'contextual' ? '' : 'none';
        populateScaleSelect();
        applyScaleOverlay();
      });
    });
    elHarmonicFunction.addEventListener('change', () => {
      harmonicFunction = elHarmonicFunction.value;
      populateScaleSelect();
      applyScaleOverlay();
    });
    elShowTargets.addEventListener('change', () => {
      showTargets = elShowTargets.checked;
      applyScaleOverlay();
    });

    // Play scale button
    if (elPlayScaleBtn) {
      elPlayScaleBtn.addEventListener('click', playCurrentScale);
    }

    // Sync texto ↔ selectores
    elInput.addEventListener('input', () => {
      if (syncLock) return;
      syncLock = true;
      syncSelectorsFromText();
      syncLock = false;
    });
    [elRoot, elQuality, elBass].forEach(el => {
      el.addEventListener('change', () => {
        if (syncLock) return;
        syncLock = true;
        syncTextFromSelectors();
        syncLock = false;
      });
    });
    elExtensions.forEach(cb => {
      cb.addEventListener('change', () => {
        if (syncLock) return;
        syncLock = true;
        syncTextFromSelectors();
        syncLock = false;
      });
    });

    // Tabs acordes
    elTabGen.addEventListener('click', () => switchTab('generated'));
    elTabBank.addEventListener('click', () => switchTab('bank'));
    elTabPractice.addEventListener('click', () => switchTab('practice'));

    // Bank search
    elBankSearchInput.addEventListener('input', () => renderBankView());

    // Manual add
    document.getElementById('btn-manual-save').addEventListener('click', saveManualVoicing);

    // Export / Import (chords)
    document.getElementById('btn-export').addEventListener('click', handleExport);
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('file-import').click();
    });
    document.getElementById('file-import').addEventListener('change', handleImport);

    // Nav principal
    document.getElementById('nav-chords').addEventListener('click', () => showSection('chords'));
    document.getElementById('nav-scales').addEventListener('click', () => showSection('scales'));
    document.getElementById('nav-songs').addEventListener('click', () => {
      window.SongListView.render();
      showSection('songs');
    });
    document.getElementById('nav-analyzer').addEventListener('click', () => showSection('analyzer'));

    // Init Chord Analyzer
    if (window.ChordAnalyzerUI) window.ChordAnalyzerUI.init();

    updateBankCount();

    // Ejemplo inicial
    elInput.value = 'Dm7';
    syncSelectorsFromText();
    doSearch();
    showSection('chords');
  }

  // ── Selectores ──────────────────────────────────────────────

  function populateSelectors() {
    NOTE_NAMES.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      elRoot.appendChild(opt);
    });

    const qualityLabels = {
      'maj': 'Major', 'm': 'Minor', '7': '7', 'maj7': 'Maj7', 'm7': 'Min7',
      'dim': 'Dim', 'aug': 'Aug', 'sus2': 'Sus2', 'sus4': 'Sus4',
      '6': '6', 'm6': 'Min6', '9': '9', 'maj9': 'Maj9', 'm9': 'Min9',
      '11': '11', 'm11': 'Min11', '13': '13', 'dim7': 'Dim7',
      'm7b5': 'Min7b5', 'mMaj7': 'MinMaj7', 'aug7': 'Aug7',
      '7sus4': '7sus4', 'add9': 'Add9', '5': 'Power (5)',
    };
    Object.entries(qualityLabels).forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      elQuality.appendChild(opt);
    });

    const noneOpt = document.createElement('option');
    noneOpt.value = ''; noneOpt.textContent = '(ninguno)';
    elBass.appendChild(noneOpt);
    NOTE_NAMES.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      elBass.appendChild(opt);
    });
  }

  function syncSelectorsFromText() {
    const chord = parseChord(elInput.value);
    if (!chord) return;
    elRoot.value = chord.root;
    elQuality.value = chord.quality;
    elBass.value = chord.bass || '';
    elExtensions.forEach(cb => { cb.checked = false; });
    const baseIntervals = new Set(CHORD_FORMULAS[chord.quality] || []);
    chord.intervals.forEach(iv => {
      if (!baseIntervals.has(iv)) {
        const cb = document.querySelector(`.ext-checkbox[value="${iv}"]`);
        if (cb) cb.checked = true;
      }
    });
  }

  function syncTextFromSelectors() {
    const root = elRoot.value;
    const quality = elQuality.value;
    const bass = elBass.value;
    const extensions = [];
    elExtensions.forEach(cb => { if (cb.checked) extensions.push(cb.value); });
    elInput.value = buildChordName(root, quality, extensions, bass);
  }

  // ── Tabs ────────────────────────────────────────────────────

  function switchTab(tab) {
    currentTab = tab;
    elTabGen.classList.toggle('active', tab === 'generated');
    elTabBank.classList.toggle('active', tab === 'bank');
    elTabPractice.classList.toggle('active', tab === 'practice');
    elManualSection.style.display = tab === 'bank' ? 'flex' : 'none';
    elBankSearch.style.display = tab === 'bank' ? 'block' : 'none';
    elChordPracticePanel.style.display = tab === 'practice' ? 'block' : 'none';
    elScaleSection.style.display = tab === 'generated' && currentScales.length > 0 ? 'block' : 'none';

    // Hide sort-row and results-grid when in practice mode
    var elSortRow = document.querySelector('.sort-row');
    var elResultsGrid = document.getElementById('results-grid');
    if (elSortRow) elSortRow.style.display = tab === 'practice' ? 'none' : '';
    if (elResultsGrid) elResultsGrid.style.display = tab === 'practice' ? 'none' : '';

    if (tab === 'generated') doSearch();
    else if (tab === 'bank') renderBankView();
    else if (tab === 'practice') {
      if (window.ChordPractice) window.ChordPractice.syncFromExplore();
    }

    // Stop chord practice when leaving
    if (tab !== 'practice' && window.ChordPractice) {
      window.ChordPractice.stop();
    }
  }

  // ── Búsqueda (tab Generados) ───────────────────────────────

  function doSearch() {
    const input = elInput.value.trim();
    if (!input) return;

    const chord = parseChord(input);
    elGrid.innerHTML = '';

    if (!chord) {
      elInfo.innerHTML = '<span class="error">No se pudo interpretar el acorde. Prueba con otro formato.</span>';
      return;
    }

    elInfo.innerHTML = `
      <strong>${chord.name}</strong> &mdash;
      Notas: <span class="notes">${chord.noteNames.join(' ')}</span>
      ${chord.bass ? ` | Bajo: <span class="notes">${chord.bass}</span>` : ''}
    `;

    const saved = Bank.getByName(input);
    saved.forEach((sv, idx) => {
      const voicing = bankEntryToVoicing(sv);
      const card = createVoicingCard(voicing, chord.name, { badge: 'Personal', bankName: input, bankIndex: idx });
      elGrid.appendChild(card);
    });

    // Parsear filtro de posición
    const posVal = elPositionFilter.value;
    const voicingOpts = {};
    if (posVal !== 'all') {
      const parts = posVal.split('-');
      voicingOpts.minFret = parseInt(parts[0], 10);
      voicingOpts.maxFret = parseInt(parts[1], 10);
    }

    voicingOpts.category = elVoicingCategory.value;
    let voicings = findVoicings(chord, voicingOpts);
    const sortBy = elSortSelect.value;
    if (sortBy === 'position') voicings.sort((a, b) => a.position - b.position);
    else voicings.sort((a, b) => b.score - a.score);

    voicings.forEach(v => {
      const card = createVoicingCard(v, chord.name, { saveable: true });
      elGrid.appendChild(card);
    });

    if (saved.length === 0 && voicings.length === 0) {
      elGrid.innerHTML = '<p class="no-results">No se encontraron voicings para este acorde.</p>';
    }

    // Detectar escalas compatibles
    currentChord = chord;
    currentChordPCs = chord.pitchClasses;
    currentScales = window.ScaleDetector.scoredCompatibleScales(chord.pitchClasses, chord.rootPc, chord.intervals);
    populateScaleSelect();
    elScaleSection.style.display = currentScales.length > 0 ? 'block' : 'none';

    // Re-aplicar overlay si había escala seleccionada
    applyScaleOverlay();
  }

  // ── Escalas ────────────────────────────────────────────────

  function populateScaleSelect() {
    const prevValue = elScaleSelect.value;
    elScaleSelect.innerHTML = '<option value="">Sin escala</option>';

    if (scaleMode === 'contextual' && currentChord && window.HarmonicContext) {
      const categorized = window.HarmonicContext.categorizeByFunction(
        currentScales, harmonicFunction, currentChord.quality, currentChord.rootPc
      );

      const addGroup = (label, scales) => {
        if (scales.length === 0) return;
        const grp = document.createElement('optgroup');
        grp.label = label;
        scales.forEach(scale => {
          const opt = document.createElement('option');
          opt.value = currentScales.indexOf(scale);
          opt.textContent = scale.label;
          grp.appendChild(opt);
        });
        elScaleSelect.appendChild(grp);
      };

      addGroup('Recomendadas', categorized.recommended);
      addGroup('Alternativas', categorized.alternatives);
      addGroup('Outside', categorized.outside);
    } else {
      currentScales.forEach((scale, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = scale.label;
        elScaleSelect.appendChild(opt);
      });
    }

    if (prevValue && currentScales[prevValue]) {
      elScaleSelect.value = prevValue;
    }
  }

  function computeTargetOpts(chord, scale) {
    if (!chord || !chord.intervals || !scale || !scale.scalePCs) return null;

    const { INTERVAL_SEMITONES, getModalCharacteristicPCs } = window.MusicTheory;
    const scaleSet = new Set(scale.scalePCs);
    const chordSet = new Set(chord.pitchClasses);

    // Guide tones: 3ra y 7ma
    const targetPCs = new Set();
    const guideSemitones = { '3': 4, 'b3': 3, '7': 11, 'b7': 10, 'bb7': 9 };
    for (const [iv, semi] of Object.entries(guideSemitones)) {
      if (chord.intervals.includes(iv)) {
        targetPCs.add((chord.rootPc + semi) % 12);
      }
    }

    // Tensiones: notas de la escala que son 9/11/13 y NO están en el acorde
    const tensionPCs = new Set();
    const tensionIntervals = ['9', 'b9', '#9', '11', '#11', 'b13', '13'];
    for (const ti of tensionIntervals) {
      if (INTERVAL_SEMITONES[ti] === undefined) continue;
      const pc = (chord.rootPc + INTERVAL_SEMITONES[ti]) % 12;
      if (scaleSet.has(pc) && !chordSet.has(pc)) tensionPCs.add(pc);
    }

    // Avoid notes: nota a semitono de un chord tone que no es ni chord tone ni tensión
    const avoidPCs = new Set();
    for (const chordPc of chordSet) {
      const halfAbove = (chordPc + 1) % 12;
      if (scaleSet.has(halfAbove) && !chordSet.has(halfAbove) && !tensionPCs.has(halfAbove)) {
        avoidPCs.add(halfAbove);
      }
    }

    // Notas características modales
    const modalPCs = new Set(getModalCharacteristicPCs(scale.root, scale.scaleKey));

    return { targetPCs, tensionPCs, avoidPCs, modalPCs };
  }

  function applyScaleOverlay() {
    const idx = elScaleSelect.value;
    const svgs = elGrid.querySelectorAll('svg.chord-diagram');

    if (!idx || !currentScales[idx]) {
      svgs.forEach(svg => {
        svg.querySelectorAll('.scale-overlay').forEach(el => el.remove());
      });
      elScaleNotes.innerHTML = '';
      return;
    }

    const scale = currentScales[idx];
    const chordPCSet = new Set(currentChordPCs);
    const targetOpts = showTargets ? computeTargetOpts(currentChord, scale) : null;

    // Mostrar notas de la escala con jerarquía visual
    const noteNames = scale.scalePCs.map(pc => {
      const name = window.MusicTheory.pcToName(pc);
      let cls = 'note';
      if (targetOpts && targetOpts.targetPCs.has(pc)) cls += ' target-note';
      else if (targetOpts && targetOpts.modalPCs && targetOpts.modalPCs.has(pc)) cls += ' modal-char-note';
      else if (chordPCSet.has(pc)) cls += ' chord-tone';
      else if (targetOpts && targetOpts.tensionPCs.has(pc)) cls += ' tension-note';
      else if (targetOpts && targetOpts.avoidPCs.has(pc)) cls += ' avoid-note';
      return `<span class="${cls}">${name}</span>`;
    });
    elScaleNotes.innerHTML = 'Notas: ' + noteNames.join(' ');

    // Aplicar overlay a cada diagrama
    const cards = elGrid.querySelectorAll('.voicing-card');
    cards.forEach(card => {
      const svg = card.querySelector('svg.chord-diagram');
      if (!svg) return;
      const voicing = card._voicing;
      if (!voicing) return;
      addScaleOverlay(svg, voicing, scale.scalePCs, currentChordPCs, targetOpts);
    });
  }

  /**
   * Reproduce la escala seleccionada con animación visual sincronizada.
   * Calcula las notas MIDI desde los pitch classes de la escala (ascendente,
   * una octava desde la raíz más grave posible en guitarra) e ilumina los
   * dots correspondientes en TODOS los diagramas visibles.
   */
  function stopCurrentScale() {
    if (currentScalePlayback) {
      currentScalePlayback.stop();
      currentScalePlayback = null;
    }
    clearScaleHighlights();
    resetScaleBtn();
  }

  function resetScaleBtn() {
    if (elPlayScaleBtn) elPlayScaleBtn.innerHTML = '&#9654; Escala';
    var zoomBtn = document.getElementById('diagram-zoom-play-scale');
    if (zoomBtn) zoomBtn.innerHTML = '&#9654; Escala';
  }

  function setScaleBtnStop(btn) {
    if (btn) btn.innerHTML = '&#9724; Stop';
  }

  function playCurrentScale() {
    if (!window.AudioEngine) return;

    // Si ya está reproduciendo → detener (toggle)
    if (currentScalePlayback) {
      stopCurrentScale();
      return;
    }

    const idx = elScaleSelect.value;
    if (!idx || !currentScales[idx]) return;

    const scale = currentScales[idx];

    // Usar la card de referencia seleccionada, o la primera visible
    const refCard = (scaleRefCard && elGrid.contains(scaleRefCard))
      ? scaleRefCard
      : elGrid.querySelector('.voicing-card');
    if (!refCard) return;

    const refSvg = refCard.querySelector('svg.chord-diagram');
    if (!refSvg) return;

    // Pre-capturar elementos y construir mapa midi→elements
    const { midiNotes, midiMap } = buildMidiMap(refSvg);
    if (midiNotes.length === 0) return;

    const interval = elScaleTempo ? Number(elScaleTempo.value) || 300 : 300;

    setScaleBtnStop(elPlayScaleBtn);

    currentScalePlayback = window.AudioEngine.playScale(midiNotes, interval, function (noteIdx) {
      clearScaleHighlights();
      if (noteIdx >= 0 && noteIdx < midiNotes.length) {
        var elems = midiMap[midiNotes[noteIdx]];
        if (elems) elems.forEach(function (el) { highlightNote(el); });
      }
      if (noteIdx === -1) {
        currentScalePlayback = null;
        resetScaleBtn();
      }
    });
  }

  /**
   * Pre-captura los elementos SVG con data-midi y construye un mapa
   * para evitar querySelectorAll dentro de los callbacks de setTimeout.
   */
  function buildMidiMap(svg) {
    var dots = Array.from(svg.querySelectorAll('.scale-overlay [data-midi]'));
    if (dots.length === 0) return { midiNotes: [], midiMap: {} };

    dots.sort(function (a, b) {
      return Number(a.getAttribute('data-midi')) - Number(b.getAttribute('data-midi'));
    });

    var midiMap = {};
    var midiNotes = [];
    var seen = {};
    dots.forEach(function (d) {
      var m = Number(d.getAttribute('data-midi'));
      if (!midiMap[m]) midiMap[m] = [];
      midiMap[m].push(d);
      if (!seen[m]) {
        seen[m] = true;
        midiNotes.push(m);
      }
    });

    return { midiNotes: midiNotes, midiMap: midiMap };
  }

  function highlightNote(el) {
    // Guardar originales como atributos data- (más confiable en SVG que propiedades JS)
    el.setAttribute('data-orig-fill', el.getAttribute('fill') || '');
    el.setAttribute('data-orig-opacity', el.getAttribute('opacity') || '');
    el.setAttribute('data-orig-r', el.getAttribute('r') || '');
    // Aplicar highlight
    el.setAttribute('fill', '#ffe66d');
    el.setAttribute('opacity', '1');
    el.setAttribute('stroke', '#fff');
    el.setAttribute('stroke-width', '2.5');
    // Agrandar el dot para forzar repaint geométrico
    var origR = parseFloat(el.getAttribute('data-orig-r')) || 5;
    el.setAttribute('r', String(origR + 3));
    el.setAttribute('data-highlighted', '1');
  }

  function clearScaleHighlights() {
    document.querySelectorAll('[data-highlighted="1"]').forEach(function (el) {
      el.setAttribute('fill', el.getAttribute('data-orig-fill') || '#4ecdc4');
      el.setAttribute('opacity', el.getAttribute('data-orig-opacity') || '0.45');
      var origR = el.getAttribute('data-orig-r');
      if (origR) el.setAttribute('r', origR);
      el.removeAttribute('stroke');
      el.removeAttribute('stroke-width');
      el.removeAttribute('data-highlighted');
      el.removeAttribute('data-orig-fill');
      el.removeAttribute('data-orig-opacity');
      el.removeAttribute('data-orig-r');
    });
  }

  // ── Vista Banco ─────────────────────────────────────────────

  function renderBankView() {
    elGrid.innerHTML = '';
    const all = Bank.getAll();
    let names = Object.keys(all).sort();

    // Filtrar por búsqueda
    const query = elBankSearchInput ? elBankSearchInput.value.trim().toLowerCase() : '';
    if (query) {
      names = names.filter(name => name.toLowerCase().includes(query));
    }

    if (names.length === 0 && query) {
      elGrid.innerHTML = '<p class="no-results">No se encontraron acordes que coincidan con "' + query + '".</p>';
      elInfo.innerHTML = '<strong>Mis Acordes</strong> &mdash; sin resultados';
      return;
    }

    if (names.length === 0) {
      elGrid.innerHTML = '<p class="no-results">No tienes acordes guardados. Busca un acorde y usa el boton guardar, o agrega uno manualmente.</p>';
      elInfo.innerHTML = '<strong>Mis Acordes</strong> &mdash; 0 voicings guardados';
      return;
    }

    let total = 0;
    names.forEach(name => {
      const header = document.createElement('div');
      header.className = 'bank-group-header';
      header.textContent = name;
      elGrid.appendChild(header);

      all[name].forEach((sv, idx) => {
        total++;
        const voicing = bankEntryToVoicing(sv);
        const card = createVoicingCard(voicing, name, { badge: 'Personal', bankName: name, bankIndex: idx, deletable: true });
        elGrid.appendChild(card);
      });
    });

    elInfo.innerHTML = `<strong>Mis Acordes</strong> &mdash; ${total} voicing${total !== 1 ? 's' : ''} en ${names.length} acorde${names.length !== 1 ? 's' : ''}${query ? ' (filtrado)' : ''}`;
  }

  // ── Modal de diagrama expandido ────────────────────────────

  var zoomState = { cards: [], index: 0, chordName: '', chord: null, scales: [], chordPCs: null, source: 'chords', fixedScales: {}, songId: null };

  function renderZoomDiagram() {
    var body = document.getElementById('diagram-zoom-body');
    var counter = document.getElementById('diagram-zoom-counter');
    var title = document.getElementById('diagram-zoom-title');
    var notesDiv = document.getElementById('diagram-zoom-notes');
    if (!body || zoomState.cards.length === 0) return;

    var card = zoomState.cards[zoomState.index];
    var voicing = card._voicing;

    // Crear SVG expandido
    var svg = createDiagram(voicing, zoomState.chordName);
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    // Aplicar scale overlay según los controles del modal
    var zoomScale = document.getElementById('diagram-zoom-scale');
    var zoomTargets = document.getElementById('diagram-zoom-targets');
    var scaleIdx = zoomScale ? zoomScale.value : '';
    var targetOpts = null;
    if (scaleIdx && zoomState.scales[scaleIdx]) {
      var scale = zoomState.scales[scaleIdx];
      var useTargets = zoomTargets ? zoomTargets.checked : showTargets;
      targetOpts = useTargets ? computeTargetOpts(zoomState.chord, scale) : null;
      addScaleOverlay(svg, voicing, scale.scalePCs, zoomState.chordPCs, targetOpts);

      // Indicador de notas con colores
      if (notesDiv) {
        var chordPCSet = new Set(zoomState.chordPCs || []);
        var noteNames = scale.scalePCs.map(function (pc) {
          var name = window.MusicTheory.pcToName(pc);
          var cls = 'note';
          if (targetOpts && targetOpts.targetPCs.has(pc)) cls += ' target-note';
          else if (targetOpts && targetOpts.modalPCs && targetOpts.modalPCs.has(pc)) cls += ' modal-char-note';
          else if (chordPCSet.has(pc)) cls += ' chord-tone';
          else if (targetOpts && targetOpts.tensionPCs.has(pc)) cls += ' tension-note';
          else if (targetOpts && targetOpts.avoidPCs.has(pc)) cls += ' avoid-note';
          return '<span class="' + cls + '">' + name + '</span>';
        });
        notesDiv.innerHTML = 'Notas: ' + noteNames.join(' ');
      }
    } else {
      if (notesDiv) notesDiv.innerHTML = '';
    }

    body.innerHTML = '';
    body.appendChild(svg);
    if (counter) counter.textContent = (zoomState.index + 1) + ' / ' + zoomState.cards.length;
    if (title) title.textContent = zoomState.chordName;
  }

  function openDiagramZoom(voicing, chordName) {
    var allCards = Array.from(elGrid.querySelectorAll('.voicing-card'));
    var index = allCards.findIndex(function (c) { return c._voicing === voicing; });
    if (index < 0) index = 0;

    openZoomGeneric(allCards, index, chordName, currentChord, currentScales, 'chords');
  }

  function populateZoomScaleSelect() {
    var zoomScale = document.getElementById('diagram-zoom-scale');
    if (!zoomScale) return;
    zoomScale.innerHTML = '<option value="">Sin escala</option>';
    zoomState.scales.forEach(function (scale, idx) {
      var opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = scale.label;
      zoomScale.appendChild(opt);
    });

    // Si viene de chords view, sincronizar selección con el select principal
    if (zoomState.source === 'chords' && elScaleSelect) {
      zoomScale.value = elScaleSelect.value;
      return;
    }

    // Auto-selección para songs view
    var autoCheck = document.getElementById('diagram-zoom-auto-scale');
    if (!autoCheck || !autoCheck.checked) return;
    if (zoomState.scales.length === 0) return;

    // 1) Buscar escala fijada por label
    var fixedLabel = zoomState.fixedScales[zoomState.chordName];
    if (fixedLabel) {
      for (var i = 0; i < zoomState.scales.length; i++) {
        if (zoomState.scales[i].label === fixedLabel) {
          zoomScale.value = String(i);
          return;
        }
      }
    }

    // 2) Si no hay fijada, seleccionar la primera sugerida
    zoomScale.value = '0';
  }

  function openZoomGeneric(cards, index, chordName, chord, scales, source, fixedScales, songId) {
    var modal = document.getElementById('diagram-zoom-modal');
    if (!modal) return;

    zoomState.cards = cards;
    zoomState.index = index;
    zoomState.chordName = chordName;
    zoomState.chord = chord;
    zoomState.scales = scales || [];
    zoomState.chordPCs = chord ? chord.pitchClasses : null;
    zoomState.source = source || 'external';
    zoomState.fixedScales = fixedScales || {};
    zoomState.songId = songId || null;

    // Mostrar/ocultar botón fijar según contexto
    var fixBtn = document.getElementById('diagram-zoom-fix-scale');
    if (fixBtn) fixBtn.style.display = (source === 'songs') ? '' : 'none';

    // Checkbox auto-scale: activar por defecto en songs
    var autoCheck = document.getElementById('diagram-zoom-auto-scale');
    if (autoCheck) autoCheck.checked = (source === 'songs');

    populateZoomScaleSelect();
    renderZoomDiagram();
    modal.style.display = 'flex';
  }

  function updateZoomChordIfChanged() {
    var card = zoomState.cards[zoomState.index];
    if (!card || !card._chordName) return;
    if (card._chordName === zoomState.chordName) return;
    // Acorde cambió — re-parsear y re-computar escalas
    zoomState.chordName = card._chordName;
    var chord = parseChord(card._chordName);
    zoomState.chord = chord;
    zoomState.chordPCs = chord ? chord.pitchClasses : null;
    zoomState.scales = chord
      ? window.ScaleDetector.scoredCompatibleScales(chord.pitchClasses, chord.rootPc, chord.intervals)
      : [];
    populateZoomScaleSelect();
  }

  function closeDiagramZoom() {
    var modal = document.getElementById('diagram-zoom-modal');
    if (modal) modal.style.display = 'none';
    // Detener escala si estaba reproduciéndose
    if (currentScalePlayback) {
      currentScalePlayback.stop();
      currentScalePlayback = null;
    }
    clearScaleHighlights();
    resetScaleBtn();
  }

  // Inicializar eventos del modal
  document.addEventListener('DOMContentLoaded', function () {
    var closeBtn = document.getElementById('diagram-zoom-close');
    var modal = document.getElementById('diagram-zoom-modal');
    var prevBtn = document.getElementById('diagram-zoom-prev');
    var nextBtn = document.getElementById('diagram-zoom-next');
    var zoomScale = document.getElementById('diagram-zoom-scale');
    var zoomTargets = document.getElementById('diagram-zoom-targets');
    var zoomPlay = document.getElementById('diagram-zoom-play');

    if (closeBtn) closeBtn.addEventListener('click', closeDiagramZoom);
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) closeDiagramZoom();
    });

    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (zoomState.index > 0) {
        zoomState.index--;
        updateZoomChordIfChanged();
        renderZoomDiagram();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (zoomState.index < zoomState.cards.length - 1) {
        zoomState.index++;
        updateZoomChordIfChanged();
        renderZoomDiagram();
      }
    });

    // Cambiar escala en el modal → re-renderizar + sincronizar con principal si aplica
    if (zoomScale) zoomScale.addEventListener('change', function () {
      if (zoomState.source === 'chords') {
        elScaleSelect.value = zoomScale.value;
        applyScaleOverlay();
      }
      renderZoomDiagram();
    });

    // Toggle targets en modal
    if (zoomTargets) zoomTargets.addEventListener('change', function () {
      renderZoomDiagram();
    });

    // Checkbox auto-scale: al cambiar, re-aplicar si se activa
    var autoScaleCheck = document.getElementById('diagram-zoom-auto-scale');
    if (autoScaleCheck) autoScaleCheck.addEventListener('change', function () {
      if (this.checked) {
        populateZoomScaleSelect(); // re-trigger auto-selection
        renderZoomDiagram();
      }
    });

    // Botón fijar escala para este acorde en la canción
    var fixScaleBtn = document.getElementById('diagram-zoom-fix-scale');
    if (fixScaleBtn) fixScaleBtn.addEventListener('click', function () {
      if (zoomState.source !== 'songs' || !zoomState.songId) return;
      var zs = document.getElementById('diagram-zoom-scale');
      var scaleIdx = zs ? zs.value : '';
      var scaleLabel = (scaleIdx && zoomState.scales[scaleIdx]) ? zoomState.scales[scaleIdx].label : null;

      // Guardar en estado local
      if (scaleLabel) {
        zoomState.fixedScales[zoomState.chordName] = scaleLabel;
      } else {
        delete zoomState.fixedScales[zoomState.chordName];
      }

      // Persistir en la canción
      var song = window.Songbook.getSong(zoomState.songId);
      if (song && song.pinnedVoicings) {
        song.pinnedVoicings.forEach(function (pv) {
          if (pv.chord === zoomState.chordName) {
            pv.fixedScale = scaleLabel;
          }
        });
        window.Songbook.saveSong(song);
      }

      // Feedback visual
      fixScaleBtn.style.background = '#4ecdc4';
      setTimeout(function () { fixScaleBtn.style.background = ''; }, 400);
    });

    // Play acorde
    var zoomPlayChord = document.getElementById('diagram-zoom-play-chord');
    if (zoomPlayChord) zoomPlayChord.addEventListener('click', function () {
      if (!window.AudioEngine || zoomState.cards.length === 0) return;
      var card = zoomState.cards[zoomState.index];
      if (!card || !card._voicing) return;
      var { STANDARD_TUNING } = window.MusicTheory;
      var midiNotes = card._voicing.frets.map(function (f, i) {
        return f === -1 ? null : STANDARD_TUNING[i] + f;
      });
      window.AudioEngine.playChord(midiNotes);
    });

    // Play/stop escala sobre el diagrama expandido
    var zoomPlayScale = document.getElementById('diagram-zoom-play-scale');
    if (zoomPlayScale) zoomPlayScale.addEventListener('click', function () {
      // Toggle: si ya está reproduciendo, detener
      if (currentScalePlayback) {
        stopCurrentScale();
        return;
      }

      if (!window.AudioEngine) return;
      var zBody = document.getElementById('diagram-zoom-body');
      if (!zBody) return;
      var svg = zBody.querySelector('svg');
      if (!svg) return;

      var result = buildMidiMap(svg);
      if (result.midiNotes.length === 0) return;

      var zTempo = document.getElementById('diagram-zoom-tempo');
      var interval = zTempo ? Number(zTempo.value) || 300 : 300;

      setScaleBtnStop(zoomPlayScale);

      currentScalePlayback = window.AudioEngine.playScale(result.midiNotes, interval, function (noteIdx) {
        clearScaleHighlights();
        if (noteIdx >= 0 && noteIdx < result.midiNotes.length) {
          var elems = result.midiMap[result.midiNotes[noteIdx]];
          if (elems) elems.forEach(function (el) { highlightNote(el); });
        }
        if (noteIdx === -1) {
          currentScalePlayback = null;
          resetScaleBtn();
        }
      });
    });
  });

  // ── Crear card de voicing ───────────────────────────────────

  function createVoicingCard(voicing, chordName, opts) {
    const card = document.createElement('div');
    card.className = 'voicing-card';
    card._voicing = voicing; // Guardar referencia para scale overlay
    card._chordName = chordName;
    if (opts.badge) card.classList.add('personal');

    const svgOpts = opts.badge ? { badge: opts.badge } : {};
    card.appendChild(createDiagram(voicing, chordName, svgOpts));

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    if (opts.saveable) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-card-action btn-save';
      saveBtn.title = 'Guardar en mi banco';
      saveBtn.innerHTML = '&#9733;';
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ok = Bank.save(chordName, voicing.frets);
        updateBankCount();
        if (ok && currentTab === 'generated') {
          doSearch(); // refrescar para que aparezca arriba como Personal
        } else {
          saveBtn.classList.add('saved');
          saveBtn.title = ok ? 'Guardado!' : 'Ya guardado';
        }
      });
      const existing = Bank.getByName(chordName);
      const key = voicing.frets.join(',');
      if (existing.some(e => e.frets.join(',') === key)) saveBtn.classList.add('saved');
      actions.appendChild(saveBtn);
    }

    if (opts.deletable) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-card-action btn-delete';
      delBtn.title = 'Eliminar';
      delBtn.innerHTML = '&#10005;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Bank.remove(opts.bankName, opts.bankIndex);
        updateBankCount();
        renderBankView();
      });
      actions.appendChild(delBtn);
    }

    // Botón reproducir acorde
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-card-action btn-play';
    playBtn.title = 'Reproducir acorde';
    playBtn.innerHTML = '&#9654;';
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.AudioEngine) return;
      const { STANDARD_TUNING } = window.MusicTheory;
      const midiNotes = voicing.frets.map((f, i) =>
        f === -1 ? null : STANDARD_TUNING[i] + f
      );
      window.AudioEngine.playChord(midiNotes);
    });
    actions.appendChild(playBtn);

    // Botón seleccionar como referencia de escala
    const scaleRefBtn = document.createElement('button');
    scaleRefBtn.className = 'btn-card-action btn-scale-ref';
    scaleRefBtn.title = 'Usar como referencia para escala';
    scaleRefBtn.innerHTML = '&#9835;'; // ♫
    scaleRefBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Quitar selección anterior
      document.querySelectorAll('.voicing-card.scale-ref-active').forEach(c => c.classList.remove('scale-ref-active'));
      document.querySelectorAll('.btn-scale-ref.active').forEach(b => b.classList.remove('active'));
      // Marcar esta card
      card.classList.add('scale-ref-active');
      scaleRefBtn.classList.add('active');
      scaleRefCard = card;
    });
    actions.appendChild(scaleRefBtn);

    card.appendChild(actions);

    // Click en la card (no en botones) → abrir modal expandido
    card.addEventListener('click', function () {
      openDiagramZoom(voicing, chordName);
    });

    return card;
  }

  // ── Voicing desde banco ─────────────────────────────────────

  function bankEntryToVoicing(entry) {
    const frets = entry.frets;
    const noteNames = frets.map((f, i) => {
      if (f === -1) return 'X';
      return pcToName(fretToPC(i, f));
    });
    const barre = window.VoicingFinder.detectBarre(frets);
    const fingers = window.VoicingFinder.suggestFingers(frets, barre);
    return { frets, noteNames, barre, fingers };
  }

  // ── Agregar voicing manual ──────────────────────────────────

  function saveManualVoicing() {
    const nameInput = document.getElementById('manual-name');
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    const frets = [];
    for (let i = 0; i < 6; i++) {
      const val = document.getElementById('manual-s' + i).value.trim().toLowerCase();
      if (val === 'x' || val === '') {
        frets.push(-1);
      } else {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0 || n > 24) {
          document.getElementById('manual-s' + i).focus();
          return;
        }
        frets.push(n);
      }
    }

    if (frets.filter(f => f >= 0).length < 2) return;

    const ok = Bank.save(name, frets);
    if (ok) {
      updateBankCount();
      for (let i = 0; i < 6; i++) document.getElementById('manual-s' + i).value = '';
      if (currentTab === 'bank') renderBankView();
    }
  }

  // ── Export / Import ─────────────────────────────────────────

  function handleExport() {
    const json = Bank.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mis-acordes.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Bank.importJSON(reader.result);
        updateBankCount();
        if (currentTab === 'bank') renderBankView();
      } catch (err) {
        alert('Error al importar: archivo JSON invalido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function updateBankCount() {
    const count = Bank.count();
    const badge = document.getElementById('bank-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  // ── Song List View ──────────────────────────────────────────

  const SongListView = {
    render() {
      const list = document.getElementById('songs-list');
      const songs = SB.getSongs();
      list.innerHTML = '';

      if (songs.length === 0) {
        list.innerHTML = '<p class="no-results">No tienes canciones guardadas. Crea una nueva!</p>';
        return;
      }

      songs.forEach(song => {
        const chords = SB.extractChords(song.content);
        const row = document.createElement('div');
        row.className = 'song-row';
        row.innerHTML = `
          <div class="song-info">
            <span class="song-title">${escapeHtml(song.title)}</span>
            <span class="song-artist">${escapeHtml(song.artist || '')}</span>
            <span class="song-chords-preview">${chords.slice(0, 8).join(' - ')}${chords.length > 8 ? '...' : ''}</span>
          </div>
          <div class="song-actions">
            <button class="btn-small" data-action="view">Ver</button>
            <button class="btn-small btn-secondary" data-action="edit">Editar</button>
            <button class="btn-small btn-danger" data-action="delete">Eliminar</button>
          </div>
        `;

        row.querySelector('[data-action="view"]').addEventListener('click', () => {
          window.SongView.open(song.id);
        });
        row.querySelector('[data-action="edit"]').addEventListener('click', () => {
          window.SongEditor.open(song.id);
        });
        row.querySelector('[data-action="delete"]').addEventListener('click', () => {
          if (confirm('Eliminar "' + song.title + '"?')) {
            SB.deleteSong(song.id);
            SongListView.render();
          }
        });

        list.appendChild(row);
      });
    }
  };

  // Botón nueva canción
  function initSongListEvents() {
    document.getElementById('btn-new-song').addEventListener('click', () => {
      window.SongEditor.open(null);
    });
    // Export/import songbook
    document.getElementById('btn-export-songs').addEventListener('click', () => {
      const json = SB.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mi-cancionero.json'; a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById('btn-import-songs').addEventListener('click', () => {
      document.getElementById('file-import-songs').click();
    });
    document.getElementById('file-import-songs').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          SB.importJSON(reader.result);
          SongListView.render();
        } catch { alert('Error al importar cancionero.'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Init ────────────────────────────────────────────────────

  function fullInit() {
    init();
    initSongListEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fullInit);
  } else {
    fullInit();
  }

  // Exponer API global
  window.UI = { showSection, openZoomGeneric };
  window.SongListView = SongListView;
})();
