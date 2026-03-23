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

  // DOM refs
  var elSourceType, elSourceSelect, elManualInput, elChordInput, elAnalyzeBtn
  var elResult, elKeyDisplay, elAnalysisTable, elFretboard, elFretboardInfo

  // State
  var state = {
    initialized: false,
    chords: [],
    analysis: null,
    selectedChordIdx: -1,
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

    if (!elSourceType) return

    // Events
    elSourceType.addEventListener('change', onSourceTypeChanged)
    elSourceSelect.addEventListener('change', onSourceSelected)
    if (elAnalyzeBtn) elAnalyzeBtn.addEventListener('click', onManualAnalyze)
    if (elChordInput) elChordInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onManualAnalyze()
    })

    // Populate initial source
    onSourceTypeChanged()
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

    analyzeChords(unique)
  }

  function onManualAnalyze() {
    var text = elChordInput.value.trim()
    if (!text) return
    // Split by spaces, commas, pipes, dashes
    var chords = text.split(/[\s,|–\-]+/).filter(function (c) { return c.length > 0 })
    if (chords.length === 0) return
    analyzeChords(chords)
  }

  // ── Core analysis ──

  function analyzeChords(chords) {
    state.chords = chords
    state.selectedChordIdx = 0

    // Run contextual analysis
    if (HC && HC.suggestScalesForProgression) {
      state.analysis = HC.suggestScalesForProgression(chords)
    } else {
      state.analysis = null
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

    elKeyDisplay.innerHTML =
      '<div class="ha-key-name">' + keyLabel + '</div>' +
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
      var degreeLabel = cs && cs.degree !== '?' ? cs.degree : ''
      chipsHtml += '<span class="ha-chord-chip' + activeClass + '" data-idx="' + i + '">' +
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
      var rowClass = i === state.selectedChordIdx ? ' style="background:#1a2540;"' : ''

      html += '<tr' + rowClass + ' data-idx="' + i + '" style="cursor:pointer;' + (i === state.selectedChordIdx ? 'background:#1a2540;' : '') + '">' +
        '<td><strong>' + chords[i] + '</strong></td>' +
        '<td class="ha-degree">' + (cs.degree || '?') + '</td>' +
        '<td class="' + funcClass + '">' + (funcLabels[cs.func] || cs.func) + '</td>' +
        '<td>' + rootName + ' ' + scaleLabel + '</td>' +
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

  // ── Select chord and show fretboard ──

  function selectChord(idx) {
    if (idx < 0 || idx >= state.chords.length) return
    state.selectedChordIdx = idx

    var analysis = state.analysis
    if (!analysis || !analysis.chordScales || !analysis.chordScales[idx]) return

    var cs = analysis.chordScales[idx]
    var scalePCs = MT.getScalePCs(cs.rootPc, cs.scaleKey)
    var positions = Engine.generatePositions(cs.rootPc, cs.scaleKey)

    // Show info
    var scaleLabel = SCALE_LABELS[cs.scaleKey] || cs.scaleKey
    var rootName = MT.pcToName(cs.rootPc)
    var funcLabels = {
      tonica: 'Tónica', subdominante: 'Subdominante',
      dominante: 'Dominante', modal: 'Modal', secundario: 'Dom. secundario',
    }
    if (elFretboardInfo) {
      elFretboardInfo.textContent = state.chords[idx] + ' → ' + rootName + ' ' + scaleLabel +
        ' (' + (cs.degree || '') + ' · ' + (funcLabels[cs.func] || '') + ')'
    }

    // Render fretboard with first position
    if (elFretboard && positions.length > 0) {
      elFretboard.innerHTML = ''
      var pos = positions[0]
      var svg = FB.createFullFretboard({
        rootPc: cs.rootPc,
        scalePCs: scalePCs,
        positionNotes: pos.noteData,
        fretRange: pos.fretRange,
        showFullScale: true,
        showIntervals: true,
      })
      elFretboard.appendChild(svg)

      // Add position dots for navigation
      if (positions.length > 1) {
        var dotsDiv = document.createElement('div')
        dotsDiv.style.cssText = 'text-align:center; margin-top:6px;'
        positions.forEach(function (p, pi) {
          var dot = document.createElement('span')
          dot.className = 'position-dot' + (pi === 0 ? ' active' : '')
          dot.title = p.label
          dot.style.cursor = 'pointer'
          dot.addEventListener('click', function () {
            renderPosition(cs, scalePCs, positions, pi)
            dotsDiv.querySelectorAll('.position-dot').forEach(function (d, di) {
              d.classList.toggle('active', di === pi)
            })
          })
          dotsDiv.appendChild(dot)
        })
        elFretboard.appendChild(dotsDiv)
      }
    }

    // Update chip/row selection visuals
    renderAnalysisTable()
  }

  function renderPosition(cs, scalePCs, positions, posIdx) {
    if (!elFretboard || !positions[posIdx]) return
    // Keep dots div
    var dotsDiv = elFretboard.querySelector('div')
    elFretboard.innerHTML = ''
    var pos = positions[posIdx]
    var svg = FB.createFullFretboard({
      rootPc: cs.rootPc,
      scalePCs: scalePCs,
      positionNotes: pos.noteData,
      fretRange: pos.fretRange,
      showFullScale: true,
      showIntervals: true,
    })
    elFretboard.appendChild(svg)
    if (dotsDiv) elFretboard.appendChild(dotsDiv)
  }

  // Init on first nav click (lazy)
  window.HarmonicAnalysisUI = { init: init }
})()
