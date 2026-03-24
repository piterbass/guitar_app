// ============================================================
// harmonic-analysis-ui.js  –  UI del Análisis Armónico
//   Detecta tonalidad, grados, funciones y escalas de progresiones
// ============================================================

(function () {
  var MT = window.MusicTheory
  var Parser = window.ChordParser
  var HC = window.HarmonicContext
  var CP = window.ChordProgressions
  var FB = window.FullFretboardSVG
  var Engine = window.ScalePositionEngine
  var SCALE_LABELS = window.ScaleDetector.SCALE_LABELS

  var PROG_SCALES_KEY = 'practice-prog-scale-maps'

  // DOM refs
  var elSourceType, elSourceSelect, elManualInput, elChordInput, elAnalyzeBtn
  var elResult, elKeyDisplay, elAnalysisTable, elFretboard, elFretboardInfo
  var elPosNav, elPrevPos, elNextPos, elPosDots, elPosLabel

  // State
  var state = {
    initialized: false,
    chords: [],
    analysis: null,
    selectedChordIdx: -1,
    positions: [],
    currentPosIdx: 0,
    currentCs: null,
    currentScalePCs: null,
  }

  function init() {
    if (state.initialized) return
    state.initialized = true

    elSourceType = document.getElementById('ha-source-type')
    elSourceSelect = document.getElementById('ha-source-select')
    elManualInput = document.getElementById('ha-manual-input')
    elChordInput = document.getElementById('ha-chord-input')
    elAnalyzeBtn = document.getElementById('ha-analyze-btn')
    elResult = document.getElementById('ha-result')
    elKeyDisplay = document.getElementById('ha-key-display')
    elAnalysisTable = document.getElementById('ha-analysis-table')
    elFretboard = document.getElementById('ha-fretboard')
    elFretboardInfo = document.getElementById('ha-fretboard-info')
    elPosNav = document.getElementById('ha-position-nav')
    elPrevPos = document.getElementById('ha-prev-pos')
    elNextPos = document.getElementById('ha-next-pos')
    elPosDots = document.getElementById('ha-position-dots')
    elPosLabel = document.getElementById('ha-position-label')

    if (!elSourceType) return

    // Events
    elSourceType.addEventListener('change', onSourceTypeChanged)
    elSourceSelect.addEventListener('change', onSourceSelected)
    if (elAnalyzeBtn) elAnalyzeBtn.addEventListener('click', onManualAnalyze)
    if (elChordInput) elChordInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onManualAnalyze()
    })

    // Position nav events
    if (elPrevPos) elPrevPos.addEventListener('click', function () { navigatePosition(-1) })
    if (elNextPos) elNextPos.addEventListener('click', function () { navigatePosition(1) })

    // Populate initial source
    onSourceTypeChanged()
  }

  // ── Load saved scale map from practice mode ──

  function loadSavedScaleMap(progId) {
    try {
      var all = JSON.parse(localStorage.getItem(PROG_SCALES_KEY)) || {}
      return all[progId] || null
    } catch (e) { return null }
  }

  // ── Source selection ──

  function onSourceTypeChanged() {
    var type = elSourceType.value
    elSourceSelect.innerHTML = '<option value="">— Seleccionar —</option>'

    if (type === 'manual') {
      elSourceSelect.style.display = 'none'
      elManualInput.style.display = ''
      return
    }

    elSourceSelect.style.display = ''
    elManualInput.style.display = 'none'

    if (type === 'library') {
      if (!CP) return
      var list = CP.getAll()
      list.forEach(function (p) {
        var opt = document.createElement('option')
        opt.value = p.id
        opt.textContent = p.name + (p.artist ? ' – ' + p.artist : '')
        opt.dataset.chords = JSON.stringify(p.chords)
        elSourceSelect.appendChild(opt)
      })
    } else if (type === 'songs') {
      if (!window.Songbook) return
      var songs = window.Songbook.getSongs()
      songs.forEach(function (song) {
        var chords = window.Songbook.extractChords(song.content)
        if (chords.length === 0) return
        var opt = document.createElement('option')
        opt.value = 'song-' + song.id
        opt.textContent = song.title + (song.artist ? ' – ' + song.artist : '')
        opt.dataset.chords = JSON.stringify(chords)
        elSourceSelect.appendChild(opt)
      })
    }
  }

  function onSourceSelected() {
    var opt = elSourceSelect.querySelector('option:checked')
    if (!opt || !opt.dataset.chords) {
      elResult.style.display = 'none'
      return
    }

    var chords = JSON.parse(opt.dataset.chords)
    // Deduplicate consecutive
    var unique = [chords[0]]
    for (var i = 1; i < chords.length; i++) {
      if (chords[i] !== chords[i - 1]) unique.push(chords[i])
    }

    // Load saved scale map (from practice mode's "Configurar escalas")
    var progId = opt.value
    var savedMap = loadSavedScaleMap(progId)

    analyzeChords(unique, savedMap)
  }

  function onManualAnalyze() {
    var text = elChordInput.value.trim()
    if (!text) return
    // Split by spaces, commas, pipes, dashes
    var chords = text.split(/[\s,|–\-]+/).filter(function (c) { return c.length > 0 })
    if (chords.length === 0) return
    analyzeChords(chords, null)
  }

  // ── Core analysis ──

  function analyzeChords(chords, savedScaleMap) {
    state.chords = chords
    state.selectedChordIdx = 0

    // Run contextual analysis
    if (HC && HC.suggestScalesForProgression) {
      state.analysis = HC.suggestScalesForProgression(chords)
    } else {
      state.analysis = null
    }

    // Apply saved scale overrides from practice mode configuration
    if (state.analysis && state.analysis.chordScales && savedScaleMap &&
        savedScaleMap.length === chords.length) {
      var hasOverrides = false
      for (var i = 0; i < chords.length; i++) {
        var saved = savedScaleMap[i]
        var cs = state.analysis.chordScales[i]
        if (!saved || !cs) continue
        // Only override if different from the auto-analysis
        if (saved.rootPc !== cs.rootPc || saved.scaleKey !== cs.scaleKey) {
          cs.rootPc = saved.rootPc
          cs.scaleKey = saved.scaleKey
          cs.customScale = true
          hasOverrides = true
        }
      }
      state.analysis.hasCustomScales = hasOverrides
    }

    renderKeyDisplay()
    renderAnalysisTable()
    selectChord(0)
    elResult.style.display = ''
  }

  // ── Render key display ──

  function renderKeyDisplay() {
    if (!elKeyDisplay) return
    var analysis = state.analysis

    if (!analysis || !analysis.key) {
      elKeyDisplay.innerHTML = '<div class="ha-key-name">Tonalidad no detectada</div>'
      return
    }

    var key = analysis.key
    var keyLabel = key.rootName + (key.mode === 'minor' ? ' menor' : ' mayor')

    // Get scale notes
    var scaleKey = key.mode === 'minor' ? 'harmonic-minor' : 'major'
    var scalePCs = MT.getScalePCs(key.rootPc, scaleKey)
    var noteNames = scalePCs.map(function (pc) { return MT.pcToName(pc) }).join(' – ')

    var customBadge = analysis.hasCustomScales
      ? '<span class="ha-custom-badge" title="Algunas escalas usan la configuración del modo práctica">escalas personalizadas</span>'
      : ''

    elKeyDisplay.innerHTML =
      '<div class="ha-key-name">' + keyLabel + customBadge + '</div>' +
      '<div class="ha-key-notes">Notas: ' + noteNames + '</div>'
  }

  // ── Render analysis table ──

  function renderAnalysisTable() {
    if (!elAnalysisTable) return
    var analysis = state.analysis
    var chords = state.chords

    if (!analysis || !analysis.chordScales) {
      elAnalysisTable.innerHTML = '<p style="color:#888;">No hay análisis disponible</p>'
      return
    }

    var funcLabels = {
      tonica: 'Tónica', subdominante: 'Subdominante',
      dominante: 'Dominante', modal: 'Modal', secundario: 'Dom. secundario',
    }

    // Chord chips (clickable)
    var chipsHtml = '<div style="margin-bottom:12px; text-align:center;">'
    for (var i = 0; i < chords.length; i++) {
      var cs = analysis.chordScales[i]
      var activeClass = i === state.selectedChordIdx ? ' active' : ''
      var customClass = cs && cs.customScale ? ' ha-custom' : ''
      var degreeLabel = cs && cs.degree !== '?' ? cs.degree : ''
      chipsHtml += '<span class="ha-chord-chip' + activeClass + customClass + '" data-idx="' + i + '">' +
        chords[i] +
        (degreeLabel ? '<span class="ha-chip-degree">' + degreeLabel + '</span>' : '') +
        '</span>'
    }
    chipsHtml += '</div>'

    // Table
    var html = chipsHtml
    html += '<table><thead><tr><th>Acorde</th><th>Grado</th><th>Función</th><th>Escala</th></tr></thead><tbody>'

    for (var i = 0; i < chords.length; i++) {
      var cs = analysis.chordScales[i]
      if (!cs) continue
      var funcClass = 'ha-func-' + (cs.func || 'tonica')
      var scaleLabel = SCALE_LABELS[cs.scaleKey] || cs.scaleKey
      var rootName = MT.pcToName(cs.rootPc)
      var customIcon = cs.customScale ? ' <span class="ha-custom-icon" title="Escala personalizada (modo práctica)">&#9734;</span>' : ''

      html += '<tr data-idx="' + i + '" style="cursor:pointer;' + (i === state.selectedChordIdx ? 'background:#1a2540;' : '') + '">' +
        '<td><strong>' + chords[i] + '</strong></td>' +
        '<td class="ha-degree">' + (cs.degree || '?') + '</td>' +
        '<td class="' + funcClass + '">' + (funcLabels[cs.func] || cs.func) + '</td>' +
        '<td>' + rootName + ' ' + scaleLabel + customIcon + '</td>' +
        '</tr>'
    }

    html += '</tbody></table>'
    elAnalysisTable.innerHTML = html

    // Add click events to chips and rows
    var chips = elAnalysisTable.querySelectorAll('.ha-chord-chip')
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        selectChord(parseInt(chip.dataset.idx))
      })
    })
    var rows = elAnalysisTable.querySelectorAll('tr[data-idx]')
    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        selectChord(parseInt(row.dataset.idx))
      })
    })
  }

  // ── Position navigation ──

  function navigatePosition(delta) {
    var newIdx = state.currentPosIdx + delta
    if (newIdx < 0 || newIdx >= state.positions.length) return
    state.currentPosIdx = newIdx
    renderFretboardPosition()
    updatePositionNav()
  }

  function updatePositionNav() {
    if (!elPosNav) return
    var positions = state.positions

    if (positions.length <= 1) {
      elPosNav.style.display = 'none'
      return
    }

    elPosNav.style.display = ''
    var idx = state.currentPosIdx

    // Label
    if (elPosLabel) {
      elPosLabel.textContent = positions[idx].label + ' (' + (idx + 1) + '/' + positions.length + ')'
    }

    // Arrows
    if (elPrevPos) elPrevPos.disabled = idx === 0
    if (elNextPos) elNextPos.disabled = idx === positions.length - 1

    // Dots
    if (elPosDots) {
      elPosDots.innerHTML = ''
      positions.forEach(function (p, pi) {
        var dot = document.createElement('span')
        dot.className = 'position-dot' + (pi === idx ? ' active' : '')
        dot.title = p.label
        dot.style.cursor = 'pointer'
        dot.addEventListener('click', function () {
          state.currentPosIdx = pi
          renderFretboardPosition()
          updatePositionNav()
        })
        elPosDots.appendChild(dot)
      })
    }
  }

  function renderFretboardPosition() {
    if (!elFretboard || !state.positions[state.currentPosIdx]) return
    elFretboard.innerHTML = ''
    var pos = state.positions[state.currentPosIdx]
    var svg = FB.createFullFretboard({
      rootPc: state.currentCs.rootPc,
      scalePCs: state.currentScalePCs,
      positionNotes: pos.noteData,
      fretRange: pos.fretRange,
      showFullScale: true,
      showIntervals: true,
    })
    elFretboard.appendChild(svg)
  }

  // ── Select chord and show fretboard ──

  function selectChord(idx) {
    if (idx < 0 || idx >= state.chords.length) return
    state.selectedChordIdx = idx

    var analysis = state.analysis
    if (!analysis || !analysis.chordScales || !analysis.chordScales[idx]) return

    var cs = analysis.chordScales[idx]
    var scalePCs = MT.getScalePCs(cs.rootPc, cs.scaleKey)
    var positions = Engine.generatePositions(cs.rootPc, cs.scaleKey)

    // Save to state for position nav
    state.currentCs = cs
    state.currentScalePCs = scalePCs
    state.positions = positions
    state.currentPosIdx = 0

    // Show info
    var scaleLabel = SCALE_LABELS[cs.scaleKey] || cs.scaleKey
    var rootName = MT.pcToName(cs.rootPc)
    var funcLabels = {
      tonica: 'Tónica', subdominante: 'Subdominante',
      dominante: 'Dominante', modal: 'Modal', secundario: 'Dom. secundario',
    }
    var customTag = cs.customScale ? ' [personalizada]' : ''
    if (elFretboardInfo) {
      elFretboardInfo.textContent = state.chords[idx] + ' → ' + rootName + ' ' + scaleLabel +
        ' (' + (cs.degree || '') + ' · ' + (funcLabels[cs.func] || '') + ')' + customTag
    }

    // Render fretboard and position nav
    if (elFretboard && positions.length > 0) {
      renderFretboardPosition()
      updatePositionNav()
    }

    // Update chip/row selection visuals
    renderAnalysisTable()
  }

  // Init on first nav click (lazy)
  window.HarmonicAnalysisUI = { init: init }
})()
