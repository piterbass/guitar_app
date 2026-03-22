// ============================================================
// practice-mode.js  –  Modo Práctica para escalas
//   Metrónomo, reproducción continua (loop), control de velocidad
// ============================================================

(function () {
  const { STANDARD_TUNING, fretToPC } = window.MusicTheory;
  const Engine = window.ScalePositionEngine;
  const FB = window.FullFretboardSVG;
  const Audio = window.AudioEngine;

  // ── BPM presets ──
  const SPEED_PRESETS = {
    lento:  60,
    normal: 100,
    rapido: 140,
    'super-rapido': 180,
    extremo: 220,
  };

  // ── DOM refs ──
  let elPanel;
  let elRootSelect, elTypeSelect;
  let elPositionSelect;
  let elDirection;
  let elSpeed;
  let elBpmDisplay, elBpmInput;
  let elProgCategory, elProgSelect, elProgStrip, elProgInfo, elProgScaleEditor, elProgEditorToggle;
  let elBankSelect;
  let elMetronomeToggle;
  let elPlayBtn, elPauseBtn, elStopBtn;
  let elFretboard;
  let elBeatIndicator;
  let elLoopToggle;
  // Advanced practice modes
  let elAdvancedToggle, elAdvancedPanel;
  let elZoneEnabled, elZoneControls, elZoneFretMin, elZoneFretMax, elZoneStringMin, elZoneStringMax;
  let elStringMode, elStringPairInfo;
  let elPathUp, elPathDown, elPathDownRow, elPathInfo;
  let elTransposeAll, elTransposeInfo;

  // ── State ──
  let practiceState = {
    rootPc: 0,
    scaleKey: 'major',
    scalePCs: [],
    positions: [],
    selectedPosition: 0,
    _globalPosition: 0,  // user-chosen position (before overrides)
    direction: 'ascending',
    speed: 'normal',
    bpm: 100,
    metronomeOn: true,
    soundOn: true,
    loopOn: true,
    playing: false,
    // runtime
    _intervalId: null,
    _noteIndex: 0,
    _currentNotes: [],
    _beatCount: 0,
    // progression mode
    progressionMode: false,
    progressionId: null,
    progressionChords: [],
    progressionScaleMap: [],   // [{ rootPc, scaleKey }] per chord
    progressionCurrentIdx: 0,
    progressionNotesPlayed: 0,
    progressionNotesPerChord: 0,
    // advanced practice modes
    zoneEnabled: false,
    zoneFretMin: 0,
    zoneFretMax: 7,
    zoneStringMin: 0,   // 0 = 6ª cuerda (E grave)
    zoneStringMax: 3,    // 3 = 3ª cuerda (G)
    stringMode: 'all',   // 'all' | 'pairs' | 'skip'
    _stringPairIndex: 0, // current pair/skip group index
    pathUp: 'melodico',    // 'melodico' | 'cuerdas' | 'diagonal'
    pathDown: 'cuerdas',   // 'melodico' | 'cuerdas' | 'diagonal'
    transposeAllKeys: false,
    _transposeSemitones: 0,  // current transposition offset (0-11)
    _transposeOriginalRootPc: null,
    _transposeOriginalScaleMap: null,
  };

  // ── Init ──

  function init() {
    elPanel = document.getElementById('scales-practice-panel');
    if (!elPanel) return;

    elRootSelect       = document.getElementById('practice-root');
    elTypeSelect       = document.getElementById('practice-type');
    elPositionSelect   = document.getElementById('practice-position');
    elDirection        = document.getElementById('practice-direction');
    elSpeed            = document.getElementById('practice-speed');
    elBpmDisplay       = document.getElementById('practice-bpm-display');
    elMetronomeToggle  = document.getElementById('practice-metronome');
    elPlayBtn          = document.getElementById('practice-play');
    elPauseBtn         = document.getElementById('practice-pause');
    elStopBtn          = document.getElementById('practice-stop');
    elFretboard        = document.getElementById('practice-fretboard');
    elBeatIndicator    = document.getElementById('practice-beat-indicator');
    elLoopToggle       = document.getElementById('practice-loop');
    elBpmInput         = document.getElementById('practice-bpm-input');
    elBankSelect       = document.getElementById('practice-bank-select');
    elProgCategory     = document.getElementById('practice-prog-category');
    elProgSelect       = document.getElementById('practice-prog-select');
    elProgStrip        = document.getElementById('practice-prog-strip');
    elProgInfo         = document.getElementById('practice-prog-info');
    elProgScaleEditor  = document.getElementById('practice-prog-scale-editor');
    elProgEditorToggle = document.getElementById('practice-prog-editor-toggle');

    // Advanced practice modes
    elAdvancedToggle   = document.getElementById('practice-advanced-toggle');
    elAdvancedPanel    = document.getElementById('practice-advanced-panel');
    elZoneEnabled      = document.getElementById('practice-zone-enabled');
    elZoneControls     = document.getElementById('practice-zone-controls');
    elZoneFretMin      = document.getElementById('practice-zone-fret-min');
    elZoneFretMax      = document.getElementById('practice-zone-fret-max');
    elZoneStringMin    = document.getElementById('practice-zone-string-min');
    elZoneStringMax    = document.getElementById('practice-zone-string-max');
    elStringMode       = document.getElementById('practice-string-mode');
    elStringPairInfo   = document.getElementById('practice-string-pair-info');
    elPathUp           = document.getElementById('practice-path-up');
    elPathDown         = document.getElementById('practice-path-down');
    elPathDownRow      = document.getElementById('practice-path-down-row');
    elPathInfo         = document.getElementById('practice-path-info');
    elTransposeAll     = document.getElementById('practice-transpose-all');
    elTransposeInfo    = document.getElementById('practice-transpose-info');

    if (!elRootSelect || !elTypeSelect) return;

    // Populate selectors (reuse MusicTheory data)
    populateRootSelector();
    populateScaleTypeSelector();
    populateBankSelector();
    populateProgSelector();

    // Events
    elRootSelect.addEventListener('change', () => { elBankSelect.value = ''; onScaleChanged(); });
    elTypeSelect.addEventListener('change', () => { elBankSelect.value = ''; onScaleChanged(); });
    elBankSelect.addEventListener('change', onBankSelected);
    if (elProgCategory) elProgCategory.addEventListener('change', function () {
      populateProgSelector();
    });
    if (elProgSelect) elProgSelect.addEventListener('change', onProgSelected);
    if (elProgEditorToggle) elProgEditorToggle.addEventListener('click', toggleScaleEditor);
    elPositionSelect.addEventListener('change', onPositionChanged);
    elDirection.addEventListener('change', () => {
      practiceState.direction = elDirection.value;
      updatePathDownVisibility();
      updatePathInfo();
      if (practiceState.playing) { stop(); }
    });
    elSpeed.addEventListener('change', onSpeedChanged);
    elBpmInput.addEventListener('change', onBpmInputChanged);
    elBpmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.target.blur(); onBpmInputChanged(); }
    });
    elMetronomeToggle.addEventListener('change', () => {
      practiceState.metronomeOn = elMetronomeToggle.checked;
    });
    document.getElementById('practice-sound').addEventListener('change', function () {
      practiceState.soundOn = this.checked;
    });
    elLoopToggle.addEventListener('change', () => {
      practiceState.loopOn = elLoopToggle.checked;
    });
    elPlayBtn.addEventListener('click', play);
    elPauseBtn.addEventListener('click', pause);
    elStopBtn.addEventListener('click', stop);

    // Advanced practice mode events
    if (elAdvancedToggle) elAdvancedToggle.addEventListener('click', function () {
      var visible = elAdvancedPanel.style.display !== 'none';
      elAdvancedPanel.style.display = visible ? 'none' : '';
      elAdvancedToggle.innerHTML = (visible ? '&#9656;' : '&#9662;') + ' Modos de práctica';
    });
    if (elZoneEnabled) elZoneEnabled.addEventListener('change', function () {
      practiceState.zoneEnabled = this.checked;
      elZoneControls.style.display = this.checked ? '' : 'none';
      if (practiceState.playing) { stop(); }
      renderFretboard();
    });
    [elZoneFretMin, elZoneFretMax, elZoneStringMin, elZoneStringMax].forEach(function (el) {
      if (el) el.addEventListener('change', function () {
        practiceState.zoneFretMin = parseInt(elZoneFretMin.value) || 0;
        practiceState.zoneFretMax = parseInt(elZoneFretMax.value) || 22;
        practiceState.zoneStringMin = parseInt(elZoneStringMin.value) || 0;
        practiceState.zoneStringMax = parseInt(elZoneStringMax.value) || 5;
        if (practiceState.playing) { stop(); }
        renderFretboard();
      });
    });
    if (elStringMode) elStringMode.addEventListener('change', function () {
      practiceState.stringMode = this.value;
      practiceState._stringPairIndex = 0;
      updateStringModeInfo();
      if (practiceState.playing) { stop(); }
    });
    if (elPathUp) elPathUp.addEventListener('change', function () {
      practiceState.pathUp = this.value;
      updatePathInfo();
      if (practiceState.playing) { stop(); }
    });
    if (elPathDown) elPathDown.addEventListener('change', function () {
      practiceState.pathDown = this.value;
      updatePathInfo();
      if (practiceState.playing) { stop(); }
    });
    if (elTransposeAll) elTransposeAll.addEventListener('change', function () {
      practiceState.transposeAllKeys = this.checked;
      elTransposeInfo.style.display = this.checked ? '' : 'none';
      if (this.checked) {
        elTransposeInfo.textContent = 'Al terminar la secuencia, transpone +1 semitono y repite (12 tonos)';
      }
      if (practiceState.playing) { stop(); }
    });

    // Initial
    updatePathDownVisibility();
    onScaleChanged();
  }

  // ── Selectors ──

  function populateRootSelector() {
    const NOTE_NAMES = window.MusicTheory.NOTE_NAMES;
    elRootSelect.innerHTML = '';
    NOTE_NAMES.forEach((name, pc) => {
      const opt = document.createElement('option');
      opt.value = pc;
      opt.textContent = name;
      elRootSelect.appendChild(opt);
    });
  }

  function populateScaleTypeSelector() {
    const SCALE_LABELS = window.ScaleDetector.SCALE_LABELS;
    const SCALE_GROUPS = [
      { label: 'Modos diatónicos', keys: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] },
      { label: 'Escalas menores', keys: ['aeolian', 'harmonic-minor', 'melodic-minor'] },
      { label: 'Modos menor melódica', keys: ['melodic-minor', 'dorian-b2', 'lydian-augmented', 'lydian-dominant', 'mixolydian-b6', 'locrian-nat2', 'altered'] },
      { label: 'Modos menor armónica', keys: ['harmonic-minor', 'locrian-nat6', 'ionian-sharp5', 'dorian-sharp4', 'phrygian-dominant', 'lydian-sharp2'] },
      { label: 'Pentatónicas y Blues', keys: ['pentatonic-major', 'pentatonic-minor', 'blues', 'blues-major'] },
      { label: 'Simétricas', keys: ['whole-tone', 'diminished', 'half-whole-dim', 'augmented'] },
      { label: 'Bebop', keys: ['bebop-dominant', 'bebop-major', 'bebop-dorian', 'bebop-melodic-minor'] },
      { label: 'Exóticas', keys: ['double-harmonic', 'harmonic-major', 'in-sen', 'hirajoshi'] },
    ];

    elTypeSelect.innerHTML = '';
    SCALE_GROUPS.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      group.keys.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = SCALE_LABELS[key] || key;
        optgroup.appendChild(opt);
      });
      elTypeSelect.appendChild(optgroup);
    });
  }

  // ── Mis Escalas (bank) ──

  function populateBankSelector() {
    const Bank = window.ScaleBank;
    if (!Bank || !elBankSelect) return;
    const scales = Bank.getAll();

    // Keep the first placeholder option
    elBankSelect.innerHTML = '<option value="">— Mis Escalas —</option>';
    scales.forEach((scale, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = scale.label;
      elBankSelect.appendChild(opt);
    });
  }

  function onBankSelected() {
    const Bank = window.ScaleBank;
    if (!Bank || !elBankSelect) return;
    const idx = elBankSelect.value;
    if (idx === '') return;

    const scales = Bank.getAll();
    const scale = scales[parseInt(idx)];
    if (!scale) return;

    elRootSelect.value = scale.rootPc;
    elTypeSelect.value = scale.scaleKey;
    onScaleChanged();
  }

  // ── Progression mode ──

  function populateProgSelector() {
    if (!elProgSelect) return;
    elProgSelect.innerHTML = '<option value="">— Sin progresión —</option>';

    var category = elProgCategory ? elProgCategory.value : 'all';

    if (category === 'mis-canciones') {
      // User's songbook songs only
      if (window.Songbook) {
        var songs = window.Songbook.getSongs();
        songs.forEach(function (song) {
          var chords = window.Songbook.extractChords(song.content);
          if (chords.length === 0) return;
          var opt = document.createElement('option');
          opt.value = 'song-' + song.id;
          opt.textContent = song.title + (song.artist ? ' – ' + song.artist : '');
          opt.dataset.chords = JSON.stringify(chords);
          elProgSelect.appendChild(opt);
        });
      }
    } else {
      // Built-in progressions (filtered by category)
      if (window.ChordProgressions) {
        var list = category === 'all'
          ? window.ChordProgressions.getAll()
          : window.ChordProgressions.getByCategory(category);
        list.forEach(function (p) {
          var opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name + (p.artist ? ' – ' + p.artist : '');
          elProgSelect.appendChild(opt);
        });
      }

      // Also show songbook songs when "all" is selected
      if (category === 'all' && window.Songbook) {
        var songs = window.Songbook.getSongs();
        var hasSongs = false;
        var songGroup = document.createElement('optgroup');
        songGroup.label = 'Mis Canciones';
        songs.forEach(function (song) {
          var chords = window.Songbook.extractChords(song.content);
          if (chords.length === 0) return;
          hasSongs = true;
          var opt = document.createElement('option');
          opt.value = 'song-' + song.id;
          opt.textContent = song.title + (song.artist ? ' – ' + song.artist : '');
          opt.dataset.chords = JSON.stringify(chords);
          songGroup.appendChild(opt);
        });
        if (hasSongs) elProgSelect.appendChild(songGroup);
      }
    }
  }

  // ── localStorage for scale maps ──

  var PROG_SCALES_KEY = 'practice-prog-scale-maps';

  function loadSavedScaleMap(progId) {
    try {
      var all = JSON.parse(localStorage.getItem(PROG_SCALES_KEY)) || {};
      return all[progId] || null;
    } catch (e) { return null; }
  }

  function saveScaleMap(progId, scaleMap) {
    try {
      var all = JSON.parse(localStorage.getItem(PROG_SCALES_KEY)) || {};
      all[progId] = scaleMap;
      localStorage.setItem(PROG_SCALES_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
  }

  function onProgSelected() {
    stop();
    var id = elProgSelect.value;
    if (!id) {
      practiceState.progressionMode = false;
      practiceState.progressionChords = [];
      practiceState.progressionScaleMap = [];
      practiceState.progressionId = null;
      if (elProgStrip) elProgStrip.style.display = 'none';
      if (elProgInfo) elProgInfo.textContent = '';
      if (elProgScaleEditor) elProgScaleEditor.style.display = 'none';
      if (elProgEditorToggle) elProgEditorToggle.style.display = 'none';
      return;
    }

    var chords = null;

    // Check if songbook song
    if (id.startsWith('song-')) {
      var opt = elProgSelect.querySelector('option[value="' + id + '"]');
      if (opt && opt.dataset.chords) {
        chords = JSON.parse(opt.dataset.chords);
        var unique = [chords[0]];
        for (var i = 1; i < chords.length; i++) {
          if (chords[i] !== chords[i - 1]) unique.push(chords[i]);
        }
        chords = unique;
      }
    } else if (window.ChordProgressions) {
      var all = window.ChordProgressions.getAll();
      var prog = all.find(function (p) { return p.id === id; });
      if (prog) chords = prog.chords;
    }

    if (!chords || chords.length === 0) return;

    practiceState.progressionMode = true;
    practiceState.progressionId = id;
    practiceState.progressionChords = chords;
    practiceState.progressionCurrentIdx = 0;
    practiceState.progressionNotesPlayed = 0;

    // Build scale map: load saved or auto-suggest
    var saved = loadSavedScaleMap(id);
    if (saved && saved.length === chords.length) {
      practiceState.progressionScaleMap = saved;
    } else {
      practiceState.progressionScaleMap = chords.map(function (ch) {
        return window.ChordProgressions.suggestScale(ch);
      });
    }

    // Apply first chord
    applyProgChordScale(0);

    // Render
    renderProgStrip();
    renderScaleEditor();
    if (elProgStrip) elProgStrip.style.display = '';
    if (elProgEditorToggle) elProgEditorToggle.style.display = '';
  }

  function applyProgChordScale(chordIdx) {
    if (chordIdx >= practiceState.progressionChords.length) return;
    var chordName = practiceState.progressionChords[chordIdx];
    var mapping = practiceState.progressionScaleMap[chordIdx];
    if (!mapping) mapping = window.ChordProgressions.suggestScale(chordName);
    var { getScalePCs } = window.MusicTheory;

    practiceState.rootPc = mapping.rootPc;
    practiceState.scaleKey = mapping.scaleKey;
    practiceState.scalePCs = getScalePCs(mapping.rootPc, mapping.scaleKey);
    practiceState.positions = Engine.generatePositions(mapping.rootPc, mapping.scaleKey);

    // Update UI selectors
    if (elRootSelect) elRootSelect.value = mapping.rootPc;
    if (elTypeSelect) elTypeSelect.value = mapping.scaleKey;
    populatePositionSelector();

    // Check for position override at the user's chosen global position
    var globalPos = practiceState._globalPosition;
    var overrides = mapping.positionOverrides || {};
    if (overrides[globalPos] !== undefined) {
      // Override: use custom position instead of the generated one
      var overrideIdx = overrides[globalPos];
      if (overrideIdx < practiceState.positions.length) {
        practiceState.selectedPosition = overrideIdx;
      } else {
        // Override index out of range, fall back to global
        practiceState.selectedPosition = Math.min(globalPos, practiceState.positions.length - 1);
      }
    } else {
      // No override: restore to global position (clamped to valid range)
      practiceState.selectedPosition = Math.min(globalPos, practiceState.positions.length - 1);
    }

    if (elPositionSelect) elPositionSelect.value = practiceState.selectedPosition;
    renderFretboard();

    // Update info
    var scaleName = window.ScaleDetector.SCALE_LABELS[mapping.scaleKey] || mapping.scaleKey;
    var rootName = window.MusicTheory.pcToName(mapping.rootPc);
    var posInfo = '';
    if (overrides[globalPos] !== undefined) {
      var pos = practiceState.positions[practiceState.selectedPosition];
      posInfo = pos ? ' [' + pos.label + ']' : '';
    }
    if (elProgInfo) {
      elProgInfo.textContent = chordName + ' → ' + rootName + ' ' + scaleName + posInfo;
    }

    // Calculate how many notes per chord
    var notes = buildMidiNotes();
    practiceState.progressionNotesPerChord = notes.length;
  }

  // ── Scale editor UI ──

  function toggleScaleEditor() {
    if (!elProgScaleEditor) return;
    var visible = elProgScaleEditor.style.display !== 'none';
    elProgScaleEditor.style.display = visible ? 'none' : '';
    if (elProgEditorToggle) {
      elProgEditorToggle.textContent = visible ? '▸ Configurar escalas' : '▾ Configurar escalas';
    }
  }

  function renderScaleEditor() {
    if (!elProgScaleEditor) return;
    elProgScaleEditor.innerHTML = '';

    var chords = practiceState.progressionChords;
    var scaleMap = practiceState.progressionScaleMap;
    var SCALE_LABELS = window.ScaleDetector.SCALE_LABELS;
    var NOTE_NAMES = window.MusicTheory.NOTE_NAMES;

    // Deduplicate: group consecutive identical chords
    var groups = [];
    for (var i = 0; i < chords.length; i++) {
      groups.push({ chord: chords[i], index: i });
    }

    groups.forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'prog-scale-row';

      // Chord name label
      var chordLabel = document.createElement('span');
      chordLabel.className = 'prog-scale-chord';
      chordLabel.textContent = g.chord;
      row.appendChild(chordLabel);

      // Arrow
      var arrow = document.createElement('span');
      arrow.className = 'prog-scale-arrow';
      arrow.textContent = '→';
      row.appendChild(arrow);

      // Scale selector
      var sel = document.createElement('select');
      sel.className = 'prog-scale-select';
      sel.dataset.index = g.index;

      // Get compatible scales for this chord
      var parsed = window.ChordParser.parseChord(g.chord);
      var compatScales = [];
      if (parsed) {
        compatScales = window.ScaleDetector.findCompatibleScales(parsed.pitchClasses, parsed.rootPc);
        // Prioritize: same root first, then sorted by label
        compatScales.sort(function (a, b) {
          var aRoot = a.root === parsed.rootPc ? 0 : 1;
          var bRoot = b.root === parsed.rootPc ? 0 : 1;
          if (aRoot !== bRoot) return aRoot - bRoot;
          return a.label.localeCompare(b.label);
        });
      }

      // Populate options
      var currentMapping = scaleMap[g.index];
      compatScales.forEach(function (sc) {
        var opt = document.createElement('option');
        opt.value = sc.root + '|' + sc.scaleKey;
        opt.textContent = sc.label;
        if (currentMapping && sc.root === currentMapping.rootPc && sc.scaleKey === currentMapping.scaleKey) {
          opt.selected = true;
        }
        sel.appendChild(opt);
      });

      // If current mapping not in compatible list, add it at top
      if (currentMapping) {
        var found = compatScales.some(function (sc) {
          return sc.root === currentMapping.rootPc && sc.scaleKey === currentMapping.scaleKey;
        });
        if (!found) {
          var label = NOTE_NAMES[currentMapping.rootPc] + ' ' + (SCALE_LABELS[currentMapping.scaleKey] || currentMapping.scaleKey);
          var opt = document.createElement('option');
          opt.value = currentMapping.rootPc + '|' + currentMapping.scaleKey;
          opt.textContent = label;
          opt.selected = true;
          sel.insertBefore(opt, sel.firstChild);
        }
      }

      sel.addEventListener('change', function () {
        var parts = sel.value.split('|');
        var rootPc = parseInt(parts[0]);
        var scaleKey = parts[1];
        // Keep existing positionIdx if scale didn't change root
        var prevMapping = practiceState.progressionScaleMap[g.index] || {};
        practiceState.progressionScaleMap[g.index] = { rootPc: rootPc, scaleKey: scaleKey };
        saveScaleMap(practiceState.progressionId, practiceState.progressionScaleMap);
        // Rebuild position selector for this row
        rebuildPositionSelect(posSel, rootPc, scaleKey, null);
        if (practiceState.playing) {
          if (practiceState.progressionCurrentIdx === g.index) {
            applyProgChordScale(g.index);
          }
        } else {
          practiceState.progressionCurrentIdx = g.index;
          applyProgChordScale(g.index);
          renderProgStrip();
        }
      });

      row.appendChild(sel);

      // Override button: assign custom position for a specific global position
      var mapRootPc = currentMapping ? currentMapping.rootPc : (parsed ? parsed.rootPc : 0);
      var mapScaleKey = currentMapping ? currentMapping.scaleKey : 'major';
      var overrides = currentMapping && currentMapping.positionOverrides ? currentMapping.positionOverrides : {};
      var hasOverrides = Object.keys(overrides).length > 0;

      var overrideBtn = document.createElement('button');
      overrideBtn.className = 'bs-btn' + (hasOverrides ? ' bs-btn-active' : '');
      overrideBtn.textContent = hasOverrides ? '★ ' + Object.keys(overrides).length : '⚙';
      overrideBtn.title = 'Asignar posición custom';
      overrideBtn.style.fontSize = '0.8rem';

      overrideBtn.addEventListener('click', function () {
        toggleOverridePanel(g.index, row);
      });

      row.appendChild(overrideBtn);
      elProgScaleEditor.appendChild(row);
    });
  }

  function toggleOverridePanel(chordIdx, parentRow) {
    // If panel already open, close it
    var existing = parentRow.nextElementSibling;
    if (existing && existing.classList.contains('prog-override-panel')) {
      existing.remove();
      return;
    }

    var mapping = practiceState.progressionScaleMap[chordIdx];
    if (!mapping) return;

    var overrides = mapping.positionOverrides || {};
    var positions = Engine.generatePositions(mapping.rootPc, mapping.scaleKey);

    // Get custom positions for this scale
    var customPositions = [];
    if (window.CustomScales) {
      customPositions = window.CustomScales.getByScale(mapping.rootPc, mapping.scaleKey);
    }

    if (customPositions.length === 0) {
      alert('No hay posiciones custom guardadas para esta escala.\nCreá una en el tab Constructor.');
      return;
    }

    var panel = document.createElement('div');
    panel.className = 'prog-override-panel';

    var title = document.createElement('div');
    title.style.cssText = 'color:#ffe66d; font-size:0.8rem; margin-bottom:6px; font-weight:600;';
    title.textContent = 'Overrides: en qué posición usar tu custom';
    panel.appendChild(title);

    // For each generated position, show: "Pos N → [normal / ★ custom1 / ★ custom2]"
    positions.forEach(function (pos, posIdx) {
      var overrideRow = document.createElement('div');
      overrideRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:4px;';

      var label = document.createElement('span');
      label.style.cssText = 'color:#a0a0b0; font-size:0.8rem; min-width:80px;';
      label.textContent = pos.label + ':';
      overrideRow.appendChild(label);

      var oSel = document.createElement('select');
      oSel.className = 'prog-scale-select';
      oSel.style.cssText = 'flex:1; font-size:0.8rem;';

      var optNormal = document.createElement('option');
      optNormal.value = '';
      optNormal.textContent = '— Normal —';
      oSel.appendChild(optNormal);

      // Append custom positions as options
      customPositions.forEach(function (cs, ci) {
        var customIdx = positions.length + ci;
        var opt = document.createElement('option');
        opt.value = customIdx;
        opt.textContent = '★ ' + cs.positionLabel + ' (' + cs.name + ')';
        if (overrides[posIdx] !== undefined && overrides[posIdx] === customIdx) {
          opt.selected = true;
        }
        oSel.appendChild(opt);
      });

      oSel.addEventListener('change', function () {
        if (!mapping.positionOverrides) mapping.positionOverrides = {};
        if (oSel.value === '') {
          delete mapping.positionOverrides[posIdx];
        } else {
          mapping.positionOverrides[posIdx] = parseInt(oSel.value);
        }
        // Clean up empty overrides
        if (Object.keys(mapping.positionOverrides).length === 0) {
          delete mapping.positionOverrides;
        }
        saveScaleMap(practiceState.progressionId, practiceState.progressionScaleMap);
        // Re-apply if this is current chord
        if (!practiceState.playing) {
          practiceState.progressionCurrentIdx = chordIdx;
          applyProgChordScale(chordIdx);
          renderProgStrip();
        }
      });

      overrideRow.appendChild(oSel);
      panel.appendChild(overrideRow);
    });

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'bs-btn';
    closeBtn.textContent = 'Cerrar';
    closeBtn.style.cssText = 'margin-top:6px; font-size:0.8rem;';
    closeBtn.addEventListener('click', function () {
      panel.remove();
      // Update override button text
      var ov = mapping.positionOverrides || {};
      var btn = parentRow.querySelector('.bs-btn');
      if (btn) {
        var count = Object.keys(ov).length;
        btn.textContent = count > 0 ? '★ ' + count : '⚙';
        btn.className = 'bs-btn' + (count > 0 ? ' bs-btn-active' : '');
      }
    });
    panel.appendChild(closeBtn);

    parentRow.after(panel);
  }

  function renderProgStrip() {
    if (!elProgStrip) return;
    elProgStrip.innerHTML = '';
    var semi = practiceState._transposeSemitones || 0;
    practiceState.progressionChords.forEach(function (chord, i) {
      var chip = document.createElement('span');
      chip.className = 'cp-chord-chip';
      if (i === practiceState.progressionCurrentIdx) chip.classList.add('current');
      else if (i === practiceState.progressionCurrentIdx + 1) chip.classList.add('next');
      // Show transposed chord name if transposing
      var displayChord = chord;
      if (semi > 0 && window.ChordParser) {
        var parsed = window.ChordParser.parseChord(chord);
        if (parsed) {
          var newRootPc = (parsed.rootPc + semi) % 12;
          var newRoot = window.MusicTheory.pcToName(newRootPc);
          displayChord = newRoot + chord.replace(/^[A-G][#b]?/, '');
        }
      }
      chip.textContent = displayChord;
      elProgStrip.appendChild(chip);
    });
  }

  function advanceProgChord() {
    practiceState.progressionCurrentIdx++;
    if (practiceState.progressionCurrentIdx >= practiceState.progressionChords.length) {
      // If we have string groups or transpose pending, signal cycle end
      var hasAdvancedModes = practiceState.stringMode !== 'all' || practiceState.transposeAllKeys;
      if (hasAdvancedModes) {
        return false; // signal cycle end for advanceAfterCycle to handle
      }
      if (practiceState.loopOn) {
        practiceState.progressionCurrentIdx = 0;
      } else {
        return false; // signal to stop
      }
    }
    applyProgChordScale(practiceState.progressionCurrentIdx);
    renderProgStrip();
    // Scroll current into view
    var current = elProgStrip && elProgStrip.querySelector('.cp-chord-chip.current');
    if (current) current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    return true;
  }

  // ── Scale / Position changes ──

  function onScaleChanged() {
    stop();
    const { getScalePCs } = window.MusicTheory;

    practiceState.rootPc = parseInt(elRootSelect.value) || 0;
    practiceState.scaleKey = elTypeSelect.value || 'major';
    practiceState.scalePCs = getScalePCs(practiceState.rootPc, practiceState.scaleKey);
    practiceState.positions = Engine.generatePositions(practiceState.rootPc, practiceState.scaleKey);
    practiceState.selectedPosition = 0;

    populatePositionSelector();
    renderFretboard();
  }

  function populatePositionSelector() {
    elPositionSelect.innerHTML = '';
    practiceState.positions.forEach((pos, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      const fretText = pos.fretRange[0] === pos.fretRange[1]
        ? 'traste ' + pos.fretRange[0]
        : 'trastes ' + pos.fretRange[0] + '-' + pos.fretRange[1];
      opt.textContent = pos.label + ' (' + fretText + ')';
      elPositionSelect.appendChild(opt);
    });

    // Append custom positions for this root + scale
    if (window.CustomScales) {
      var custom = window.CustomScales.getByScale(practiceState.rootPc, practiceState.scaleKey);
      custom.forEach(function (cs) {
        // Build a position object compatible with the engine format
        var formula = window.MusicTheory.SCALE_FORMULAS[practiceState.scaleKey];
        var posObj = {
          label: '★ ' + cs.positionLabel,
          fretRange: cs.fretRange,
          noteData: cs.noteData.map(function (n) {
            var degree = practiceState.scalePCs.indexOf(n.pc);
            return {
              string: n.string, fret: n.fret, midi: n.midi, pc: n.pc,
              interval: formula && degree >= 0 ? formula[degree] : '',
              isRoot: n.pc === practiceState.rootPc,
              isTriad: degree !== -1 && degree % 2 === 0,
            };
          }),
        };
        var idx = practiceState.positions.length;
        practiceState.positions.push(posObj);

        var opt = document.createElement('option');
        opt.value = idx;
        var fretText = cs.fretRange[0] + '-' + cs.fretRange[1];
        opt.textContent = '★ ' + cs.positionLabel + ' (' + cs.name + ', trastes ' + fretText + ')';
        elPositionSelect.appendChild(opt);
      });
    }
  }

  function onPositionChanged() {
    // Stop playback without resetting progression position
    if (practiceState._intervalId) {
      clearInterval(practiceState._intervalId);
      practiceState._intervalId = null;
    }
    practiceState.playing = false;
    practiceState.paused = false;
    practiceState._noteIndex = 0;
    Audio.stopAll();
    FB.clearHighlights();
    if (elPlayBtn) { elPlayBtn.disabled = false; elPlayBtn.style.opacity = '1'; }
    if (elPauseBtn) { elPauseBtn.disabled = true; elPauseBtn.style.opacity = '0.5'; }
    if (elStopBtn) { elStopBtn.disabled = true; elStopBtn.style.opacity = '0.5'; }
    if (elBeatIndicator) { elBeatIndicator.innerHTML = ''; }

    var pos = parseInt(elPositionSelect.value) || 0;
    practiceState.selectedPosition = pos;
    practiceState._globalPosition = pos;

    // If in progression mode, re-apply to check for overrides
    if (practiceState.progressionMode) {
      applyProgChordScale(practiceState.progressionCurrentIdx);
    } else {
      renderFretboard();
    }
  }

  function onSpeedChanged() {
    const key = elSpeed.value;
    practiceState.speed = key;
    if (key === 'custom') {
      elBpmInput.style.display = '';
      elBpmDisplay.style.display = 'none';
      practiceState.bpm = parseInt(elBpmInput.value) || 100;
    } else {
      elBpmInput.style.display = 'none';
      elBpmDisplay.style.display = '';
      practiceState.bpm = SPEED_PRESETS[key] || 100;
      elBpmDisplay.textContent = practiceState.bpm + ' BPM';
      elBpmInput.value = practiceState.bpm;
    }
    if (practiceState.playing) {
      stop();
      play();
    }
  }

  function onBpmInputChanged() {
    let val = parseInt(elBpmInput.value) || 100;
    if (val < 20) val = 20;
    if (val > 300) val = 300;
    elBpmInput.value = val;
    practiceState.bpm = val;

    // Switch dropdown to 'custom' if value doesn't match any preset
    const matchingPreset = Object.entries(SPEED_PRESETS).find(([, bpm]) => bpm === val);
    if (matchingPreset) {
      elSpeed.value = matchingPreset[0];
      practiceState.speed = matchingPreset[0];
      elBpmDisplay.textContent = val + ' BPM';
      elBpmDisplay.style.display = '';
      elBpmInput.style.display = 'none';
    } else {
      elSpeed.value = 'custom';
      practiceState.speed = 'custom';
    }

    if (practiceState.playing) {
      stop();
      play();
    }
  }

  // ── Fretboard ──

  function renderFretboard() {
    elFretboard.innerHTML = '';

    var displayNotes, displayFretRange;

    if (practiceState.zoneEnabled) {
      // Zone mode: generate all scale notes in the zone, independent of position
      displayNotes = buildZoneNotes();
      var fMin = Math.min(practiceState.zoneFretMin, practiceState.zoneFretMax);
      var fMax = Math.max(practiceState.zoneFretMin, practiceState.zoneFretMax);
      displayFretRange = [fMin, fMax];
    } else {
      const pos = practiceState.positions[practiceState.selectedPosition];
      if (!pos) return;
      displayNotes = pos.noteData;
      displayFretRange = pos.fretRange;
    }

    // If string pair/skip mode, further filter to show active group
    if (practiceState.stringMode !== 'all') {
      var groups = getStringGroups();
      if (groups.length > 0) {
        var groupIdx = practiceState._stringPairIndex % groups.length;
        displayNotes = filterNotesByStringGroup(displayNotes, groups[groupIdx]);
      }
    }

    const svg = FB.createFullFretboard({
      rootPc: practiceState.rootPc,
      scalePCs: practiceState.scalePCs,
      positionNotes: displayNotes,
      fretRange: displayFretRange,
      showFullScale: false,
      showIntervals: false,
    });
    elFretboard.appendChild(svg);
  }

  // ── String mode info ──

  function updateStringModeInfo() {
    if (!elStringPairInfo) return;
    var mode = practiceState.stringMode;
    if (mode === 'all') {
      elStringPairInfo.style.display = 'none';
      return;
    }
    elStringPairInfo.style.display = '';
    var groups = getStringGroups();
    var STRING_LABELS = ['6ª(E)', '5ª(A)', '4ª(D)', '3ª(G)', '2ª(B)', '1ª(e)'];
    var desc = groups.map(function (g) {
      return g.map(function (s) { return STRING_LABELS[s]; }).join(' + ');
    }).join('  →  ');
    elStringPairInfo.textContent = (mode === 'pairs' ? 'Pares: ' : 'Saltos: ') + desc;
  }

  function getStringGroups() {
    var mode = practiceState.stringMode;
    var minS = 0, maxS = 5;

    // If zone filtering is on, use zone string range
    if (practiceState.zoneEnabled) {
      minS = Math.min(practiceState.zoneStringMin, practiceState.zoneStringMax);
      maxS = Math.max(practiceState.zoneStringMin, practiceState.zoneStringMax);
    }

    var groups = [];
    if (mode === 'pairs') {
      // Consecutive pairs: 0-1, 1-2, 2-3, 3-4, 4-5 (within range)
      for (var s = minS; s < maxS; s++) {
        groups.push([s, s + 1]);
      }
      if (groups.length === 0 && minS === maxS) groups.push([minS]);
    } else if (mode === 'skip') {
      // Skip strings: even strings, then odd strings
      // e.g., 0-2-4, 1-3-5
      var even = [], odd = [];
      for (var s = minS; s <= maxS; s++) {
        if ((s - minS) % 2 === 0) even.push(s);
        else odd.push(s);
      }
      if (even.length > 0) groups.push(even);
      if (odd.length > 0) groups.push(odd);
    }
    return groups;
  }

  // ── Generate all scale notes within a fret/string zone ──

  function buildZoneNotes() {
    var fMin = Math.min(practiceState.zoneFretMin, practiceState.zoneFretMax);
    var fMax = Math.max(practiceState.zoneFretMin, practiceState.zoneFretMax);
    var sMin = Math.min(practiceState.zoneStringMin, practiceState.zoneStringMax);
    var sMax = Math.max(practiceState.zoneStringMin, practiceState.zoneStringMax);
    var scalePCSet = {};
    practiceState.scalePCs.forEach(function (pc) { scalePCSet[pc] = true; });

    var formula = window.MusicTheory.SCALE_FORMULAS[practiceState.scaleKey];
    var notes = [];
    for (var s = sMin; s <= sMax; s++) {
      for (var f = fMin; f <= fMax; f++) {
        var pc = fretToPC(s, f);
        if (scalePCSet[pc]) {
          var midi = STANDARD_TUNING[s] + f;
          var degree = practiceState.scalePCs.indexOf(pc);
          notes.push({
            string: s, fret: f, midi: midi, pc: pc,
            interval: formula && degree >= 0 ? formula[degree] : '',
            isRoot: pc === practiceState.rootPc,
            isTriad: degree !== -1 && degree % 2 === 0,
          });
        }
      }
    }
    return notes;
  }

  function filterNotesByStringGroup(notes, groupStrings) {
    var stringSet = {};
    groupStrings.forEach(function (s) { stringSet[s] = true; });
    return notes.filter(function (n) { return stringSet[n.string]; });
  }

  // ── Path sorting algorithms ──

  /**
   * Melódico: notas ordenadas estrictamente por altura (MIDI).
   * Sin repeticiones de pitch, recorrido limpio ascendente.
   */
  function sortMelodico(notes) {
    var sorted = [...notes].sort(function (a, b) { return a.midi - b.midi; });
    // Dedup by midi to avoid repeated pitches on different strings
    var seen = {};
    return sorted.filter(function (n) {
      if (seen[n.midi]) return false;
      seen[n.midi] = true;
      return true;
    });
  }

  /**
   * Por cuerdas: toca cada cuerda completa (notas ascendentes por traste),
   * avanzando de la cuerda más grave a la más aguda.
   */
  function sortPorCuerdas(notes) {
    return [...notes].sort(function (a, b) {
      if (a.string !== b.string) return a.string - b.string;
      return a.fret - b.fret;
    });
  }

  /**
   * Diagonal: recorre las cuerdas tomando una nota de cada una en orden,
   * creando un movimiento cruzado por el diapasón.
   * Agrupa por cuerda, luego intercala: 1ª nota de cada cuerda, 2ª de cada, etc.
   */
  function sortDiagonal(notes) {
    // Group notes by string, sorted by fret within each string
    var byString = {};
    notes.forEach(function (n) {
      if (!byString[n.string]) byString[n.string] = [];
      byString[n.string].push(n);
    });
    var strings = Object.keys(byString).map(Number).sort(function (a, b) { return a - b; });
    strings.forEach(function (s) {
      byString[s].sort(function (a, b) { return a.fret - b.fret; });
    });

    // Interleave: take one note from each string in round-robin
    var result = [];
    var maxLen = 0;
    strings.forEach(function (s) {
      if (byString[s].length > maxLen) maxLen = byString[s].length;
    });
    for (var i = 0; i < maxLen; i++) {
      for (var si = 0; si < strings.length; si++) {
        var arr = byString[strings[si]];
        if (i < arr.length) result.push(arr[i]);
      }
    }
    return result;
  }

  function applyPath(notes, pathType) {
    if (pathType === 'melodico') return sortMelodico(notes);
    if (pathType === 'cuerdas') return sortPorCuerdas(notes);
    if (pathType === 'diagonal') return sortDiagonal(notes);
    return sortMelodico(notes); // fallback
  }

  function updatePathDownVisibility() {
    if (!elPathDownRow) return;
    var show = elDirection && elDirection.value === 'both';
    elPathDownRow.style.display = show ? '' : 'none';
  }

  function updatePathInfo() {
    if (!elPathInfo) return;
    var dir = practiceState.direction;
    var LABELS = { melodico: 'Melódico', cuerdas: 'Por cuerdas', diagonal: 'Diagonal' };
    if (dir === 'both') {
      elPathInfo.style.display = '';
      elPathInfo.textContent = 'Sube: ' + LABELS[practiceState.pathUp] + '  ·  Baja: ' + LABELS[practiceState.pathDown];
    } else {
      elPathInfo.style.display = 'none';
    }
  }

  // ── Build notes for playback ──

  function buildMidiNotes() {
    var notes;

    if (practiceState.zoneEnabled) {
      // Zone mode: generate notes from the full scale within the zone, ignoring position
      notes = buildZoneNotes();
    } else {
      const pos = practiceState.positions[practiceState.selectedPosition];
      if (!pos) return [];
      notes = [...pos.noteData];
    }

    // Apply string group filtering (pairs/skip mode)
    if (practiceState.stringMode !== 'all') {
      var groups = getStringGroups();
      if (groups.length > 0) {
        var groupIdx = practiceState._stringPairIndex % groups.length;
        notes = filterNotesByStringGroup(notes, groups[groupIdx]);
      }
    }

    if (notes.length === 0) return [];

    // Apply path sorting
    var pathUp = practiceState.pathUp;
    var pathDown = practiceState.pathDown;

    if (practiceState.direction === 'ascending') {
      return applyPath(notes, pathUp).map(function (n) { return n.midi; });
    }
    if (practiceState.direction === 'descending') {
      return applyPath(notes, pathUp).reverse().map(function (n) { return n.midi; });
    }
    if (practiceState.direction === 'both') {
      // Ascending by pathUp, descending by pathDown (different route!)
      var ascNotes = applyPath(notes, pathUp).map(function (n) { return n.midi; });
      var descNotes = applyPath(notes, pathDown).reverse().map(function (n) { return n.midi; });
      // Remove first note of descending to avoid repeating the top note
      if (descNotes.length > 0) descNotes = descNotes.slice(1);
      return ascNotes.concat(descNotes);
    }

    return applyPath(notes, pathUp).map(function (n) { return n.midi; });
  }

  // ── Play / Stop ──

  // ── Transpose helpers ──

  function applyTranspose(semitones) {
    var { getScalePCs } = window.MusicTheory;
    if (practiceState.progressionMode) {
      // Transpose all chords in the scale map
      practiceState.progressionScaleMap = practiceState._transposeOriginalScaleMap.map(function (m) {
        return {
          rootPc: (m.rootPc + semitones) % 12,
          scaleKey: m.scaleKey,
          positionOverrides: m.positionOverrides,
        };
      });
      applyProgChordScale(practiceState.progressionCurrentIdx);
      renderProgStrip();
    } else {
      practiceState.rootPc = (practiceState._transposeOriginalRootPc + semitones) % 12;
      practiceState.scalePCs = getScalePCs(practiceState.rootPc, practiceState.scaleKey);
      practiceState.positions = Engine.generatePositions(practiceState.rootPc, practiceState.scaleKey);
      practiceState.selectedPosition = Math.min(practiceState.selectedPosition, practiceState.positions.length - 1);
      if (elRootSelect) elRootSelect.value = practiceState.rootPc;
      populatePositionSelector();
      if (elPositionSelect) elPositionSelect.value = practiceState.selectedPosition;
      renderFretboard();
    }
    updateTransposeInfo();
  }

  function updateTransposeInfo() {
    if (!elTransposeInfo || !practiceState.transposeAllKeys) return;
    var semi = practiceState._transposeSemitones;
    var rootName = window.MusicTheory.pcToName(
      practiceState.progressionMode
        ? practiceState.progressionScaleMap[0].rootPc
        : practiceState.rootPc
    );
    elTransposeInfo.textContent = 'Tono actual: ' + rootName + ' (+' + semi + ' semitonos) — ' + (12 - semi) + ' tonos restantes';
  }

  // ── Advance string group or transpose after a cycle ──

  function advanceAfterCycle() {
    // 1. If string pairs/skip mode: advance to next group
    if (practiceState.stringMode !== 'all') {
      var groups = getStringGroups();
      practiceState._stringPairIndex++;
      if (practiceState._stringPairIndex < groups.length) {
        // More groups to play in this key
        updateStringModeInfo();
        return true; // continue
      }
      // All groups done, reset for next cycle
      practiceState._stringPairIndex = 0;
      updateStringModeInfo();
    }

    // 2. If transpose all keys: advance semitone
    if (practiceState.transposeAllKeys) {
      practiceState._transposeSemitones++;
      if (practiceState._transposeSemitones < 12) {
        applyTranspose(practiceState._transposeSemitones);
        return true; // continue
      }
      // All 12 keys done
      practiceState._transposeSemitones = 0;
      applyTranspose(0);
      // Fall through to loop check
    }

    // 3. Check loop
    return practiceState.loopOn;
  }

  function play() {
    if (practiceState.playing) return;

    const notes = buildMidiNotes();
    if (notes.length === 0) return;

    practiceState._currentNotes = notes;
    if (!practiceState.paused) {
      practiceState._noteIndex = 0;
      practiceState._beatCount = 0;
      practiceState._stringPairIndex = 0;
      practiceState._transposeSemitones = 0;

      // Save original roots for transpose
      if (practiceState.progressionMode) {
        practiceState._transposeOriginalScaleMap = practiceState.progressionScaleMap.map(function (m) {
          return { rootPc: m.rootPc, scaleKey: m.scaleKey, positionOverrides: m.positionOverrides };
        });
        practiceState.progressionCurrentIdx = 0;
        applyProgChordScale(0);
        renderProgStrip();
        practiceState._currentNotes = buildMidiNotes();
      } else {
        practiceState._transposeOriginalRootPc = practiceState.rootPc;
      }
    }
    practiceState.playing = true;
    practiceState.paused = false;

    elPlayBtn.disabled = true;
    elPlayBtn.style.opacity = '0.5';
    if (elPauseBtn) { elPauseBtn.disabled = false; elPauseBtn.style.opacity = '1'; }
    elStopBtn.disabled = false;
    elStopBtn.style.opacity = '1';

    const intervalMs = 60000 / practiceState.bpm;
    const noteDuration = Math.max(intervalMs / 1000 + 0.5, 0.8);

    // Count-in: 4 clicks before starting
    let countIn = 4;
    let countIdx = 0;

    practiceState._intervalId = setInterval(() => {
      if (countIdx < countIn) {
        // Count-in phase
        if (practiceState.metronomeOn) {
          Audio.playClick(countIdx === 0);
        }
        updateBeatIndicator(countIdx, countIn, true);
        countIdx++;
        return;
      }

      // Playing phase
      const idx = practiceState._noteIndex;
      const midi = practiceState._currentNotes[idx];

      // Metronome click
      if (practiceState.metronomeOn) {
        Audio.playClick(idx === 0);
      }

      // Play note
      if (midi !== undefined && practiceState.soundOn) Audio.playNote(midi, noteDuration);

      // Highlight on fretboard
      FB.clearHighlights();
      if (midi !== undefined) FB.highlightNoteMidi(midi);

      // Beat indicator
      updateBeatIndicator(idx, practiceState._currentNotes.length, false);

      practiceState._noteIndex++;

      if (practiceState._noteIndex >= practiceState._currentNotes.length) {
        // Progression mode: advance to next chord's scale
        if (practiceState.progressionMode) {
          var canContinue = advanceProgChord();
          if (!canContinue) {
            // Progression finished one full cycle
            var canAdvance = advanceAfterCycle();
            if (canAdvance) {
              // Reset progression to beginning for the new cycle
              practiceState.progressionCurrentIdx = 0;
              applyProgChordScale(0);
              renderProgStrip();
            } else {
              stop();
              return;
            }
          }
          // Rebuild notes for new scale/group
          practiceState._currentNotes = buildMidiNotes();
          if (practiceState._currentNotes.length === 0) { stop(); return; }
          practiceState._noteIndex = 0;
          practiceState._beatCount++;
        } else {
          // Non-progression mode
          var canAdvance = advanceAfterCycle();
          if (canAdvance) {
            practiceState._currentNotes = buildMidiNotes();
            if (practiceState._currentNotes.length === 0) { stop(); return; }
            practiceState._noteIndex = 0;
            practiceState._beatCount++;
          } else {
            stop();
          }
        }
      }
    }, intervalMs);
  }

  function pause() {
    if (!practiceState.playing) return;
    if (practiceState._intervalId) {
      clearInterval(practiceState._intervalId);
      practiceState._intervalId = null;
    }
    practiceState.playing = false;
    practiceState.paused = true;

    Audio.stopAll();
    FB.clearHighlights();

    if (elPlayBtn) { elPlayBtn.disabled = false; elPlayBtn.style.opacity = '1'; }
    if (elPauseBtn) { elPauseBtn.disabled = true; elPauseBtn.style.opacity = '0.5'; }
    if (elStopBtn) { elStopBtn.disabled = false; elStopBtn.style.opacity = '1'; }
    if (elBeatIndicator) { elBeatIndicator.innerHTML = ''; }
  }

  function stop() {
    if (practiceState._intervalId) {
      clearInterval(practiceState._intervalId);
      practiceState._intervalId = null;
    }
    practiceState.playing = false;
    practiceState.paused = false;
    practiceState._noteIndex = 0;
    practiceState._beatCount = 0;
    practiceState._stringPairIndex = 0;

    // Restore original key if transposed
    if (practiceState._transposeSemitones > 0 && practiceState._transposeOriginalRootPc !== null) {
      practiceState._transposeSemitones = 0;
      applyTranspose(0);
    }
    practiceState._transposeSemitones = 0;

    // Reset progression to beginning
    if (practiceState.progressionMode) {
      // Restore original scale map if it was transposed
      if (practiceState._transposeOriginalScaleMap) {
        practiceState.progressionScaleMap = practiceState._transposeOriginalScaleMap.map(function (m) {
          return { rootPc: m.rootPc, scaleKey: m.scaleKey, positionOverrides: m.positionOverrides };
        });
      }
      practiceState.progressionCurrentIdx = 0;
      applyProgChordScale(0);
      renderProgStrip();
    }

    Audio.stopAll();
    FB.clearHighlights();

    if (elPlayBtn) { elPlayBtn.disabled = false; elPlayBtn.style.opacity = '1'; }
    if (elPauseBtn) { elPauseBtn.disabled = true; elPauseBtn.style.opacity = '0.5'; }
    if (elStopBtn) { elStopBtn.disabled = true; elStopBtn.style.opacity = '0.5'; }
    if (elBeatIndicator) { elBeatIndicator.innerHTML = ''; }
  }

  // ── Beat indicator ──

  function updateBeatIndicator(current, total, isCountIn) {
    if (!elBeatIndicator) return;

    if (isCountIn) {
      const dots = [];
      for (let i = 0; i < total; i++) {
        const active = i <= current;
        dots.push('<span class="beat-dot' + (active ? ' active count-in' : '') + '"></span>');
      }
      elBeatIndicator.innerHTML = '<span style="color:#ffe66d;font-size:0.8rem;margin-right:6px;">Cuenta: ' + (current + 1) + '</span>' + dots.join('');
      return;
    }

    // Show current note position as a progress bar
    const pct = total > 1 ? Math.round((current / (total - 1)) * 100) : 100;
    elBeatIndicator.innerHTML =
      '<div class="beat-progress-bar"><div class="beat-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="beat-note-count">' + (current + 1) + ' / ' + total + '</span>';
  }

  // ── Sync from Explore tab ──

  function syncFromExplore(rootPc, scaleKey, positionIdx) {
    populateBankSelector();
    if (elBankSelect) elBankSelect.value = '';
    if (elRootSelect) elRootSelect.value = rootPc;
    if (elTypeSelect) elTypeSelect.value = scaleKey;
    onScaleChanged();
    if (positionIdx !== undefined && positionIdx < practiceState.positions.length) {
      practiceState.selectedPosition = positionIdx;
      elPositionSelect.value = positionIdx;
      renderFretboard();
    }
  }

  // ── Init on DOM ready ──
  document.addEventListener('DOMContentLoaded', init);

  window.PracticeMode = { init, syncFromExplore, stop };
})();
