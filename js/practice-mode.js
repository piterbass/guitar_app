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
  let elProgSelect, elProgStrip, elProgInfo;
  let elBankSelect;
  let elMetronomeToggle;
  let elPlayBtn, elStopBtn;
  let elFretboard;
  let elBeatIndicator;
  let elLoopToggle;

  // ── State ──
  let practiceState = {
    rootPc: 0,
    scaleKey: 'major',
    scalePCs: [],
    positions: [],
    selectedPosition: 0,
    direction: 'ascending',
    speed: 'normal',
    bpm: 100,
    metronomeOn: true,
    loopOn: true,
    playing: false,
    // runtime
    _intervalId: null,
    _noteIndex: 0,
    _currentNotes: [],
    _beatCount: 0,
    // progression mode
    progressionMode: false,
    progressionChords: [],
    progressionCurrentIdx: 0,
    progressionNotesPlayed: 0,
    progressionNotesPerChord: 0,
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
    elStopBtn          = document.getElementById('practice-stop');
    elFretboard        = document.getElementById('practice-fretboard');
    elBeatIndicator    = document.getElementById('practice-beat-indicator');
    elLoopToggle       = document.getElementById('practice-loop');
    elBpmInput         = document.getElementById('practice-bpm-input');
    elBankSelect       = document.getElementById('practice-bank-select');
    elProgSelect       = document.getElementById('practice-prog-select');
    elProgStrip        = document.getElementById('practice-prog-strip');
    elProgInfo         = document.getElementById('practice-prog-info');

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
    if (elProgSelect) elProgSelect.addEventListener('change', onProgSelected);
    elPositionSelect.addEventListener('change', onPositionChanged);
    elDirection.addEventListener('change', () => {
      practiceState.direction = elDirection.value;
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
    elLoopToggle.addEventListener('change', () => {
      practiceState.loopOn = elLoopToggle.checked;
    });
    elPlayBtn.addEventListener('click', play);
    elStopBtn.addEventListener('click', stop);

    // Initial
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

    // Built-in progressions
    if (window.ChordProgressions) {
      var all = window.ChordProgressions.getAll();
      var optgroup = document.createElement('optgroup');
      optgroup.label = 'Biblioteca';
      all.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.artist ? ' – ' + p.artist : '');
        optgroup.appendChild(opt);
      });
      elProgSelect.appendChild(optgroup);
    }

    // User's songbook songs
    if (window.Songbook) {
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

  function onProgSelected() {
    stop();
    var id = elProgSelect.value;
    if (!id) {
      practiceState.progressionMode = false;
      practiceState.progressionChords = [];
      if (elProgStrip) elProgStrip.style.display = 'none';
      if (elProgInfo) elProgInfo.textContent = '';
      return;
    }

    var chords = null;

    // Check if songbook song
    if (id.startsWith('song-')) {
      var opt = elProgSelect.querySelector('option[value="' + id + '"]');
      if (opt && opt.dataset.chords) {
        chords = JSON.parse(opt.dataset.chords);
        // Deduplicate consecutive same chords
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
    practiceState.progressionChords = chords;
    practiceState.progressionCurrentIdx = 0;
    practiceState.progressionNotesPlayed = 0;

    // Apply first chord's suggested scale
    applyProgChordScale(0);

    // Render progression strip
    renderProgStrip();
    if (elProgStrip) elProgStrip.style.display = '';
  }

  function applyProgChordScale(chordIdx) {
    if (chordIdx >= practiceState.progressionChords.length) return;
    var chordName = practiceState.progressionChords[chordIdx];
    var suggestion = window.ChordProgressions.suggestScale(chordName);
    var { getScalePCs } = window.MusicTheory;

    practiceState.rootPc = suggestion.rootPc;
    practiceState.scaleKey = suggestion.scaleKey;
    practiceState.scalePCs = getScalePCs(suggestion.rootPc, suggestion.scaleKey);
    practiceState.positions = Engine.generatePositions(suggestion.rootPc, suggestion.scaleKey);
    practiceState.selectedPosition = 0;

    // Update UI selectors
    if (elRootSelect) elRootSelect.value = suggestion.rootPc;
    if (elTypeSelect) elTypeSelect.value = suggestion.scaleKey;
    populatePositionSelector();
    renderFretboard();

    // Update info
    var scaleName = window.ScaleDetector.SCALE_LABELS[suggestion.scaleKey] || suggestion.scaleKey;
    var rootName = window.MusicTheory.pcToName(suggestion.rootPc);
    if (elProgInfo) {
      elProgInfo.textContent = chordName + ' → ' + rootName + ' ' + scaleName;
    }

    // Calculate how many notes per chord (one pass of the position)
    var notes = buildMidiNotes();
    practiceState.progressionNotesPerChord = notes.length;
  }

  function renderProgStrip() {
    if (!elProgStrip) return;
    elProgStrip.innerHTML = '';
    practiceState.progressionChords.forEach(function (chord, i) {
      var chip = document.createElement('span');
      chip.className = 'cp-chord-chip';
      if (i === practiceState.progressionCurrentIdx) chip.classList.add('current');
      else if (i === practiceState.progressionCurrentIdx + 1) chip.classList.add('next');
      chip.textContent = chord;
      elProgStrip.appendChild(chip);
    });
  }

  function advanceProgChord() {
    practiceState.progressionCurrentIdx++;
    if (practiceState.progressionCurrentIdx >= practiceState.progressionChords.length) {
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
  }

  function onPositionChanged() {
    stop();
    practiceState.selectedPosition = parseInt(elPositionSelect.value) || 0;
    renderFretboard();
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
    const pos = practiceState.positions[practiceState.selectedPosition];
    if (!pos) return;

    const svg = FB.createFullFretboard({
      rootPc: practiceState.rootPc,
      scalePCs: practiceState.scalePCs,
      positionNotes: pos.noteData,
      fretRange: pos.fretRange,
      showFullScale: false,
      showIntervals: false,
    });
    elFretboard.appendChild(svg);
  }

  // ── Build notes for playback ──

  function buildMidiNotes() {
    const pos = practiceState.positions[practiceState.selectedPosition];
    if (!pos) return [];

    const sorted = [...pos.noteData].sort((a, b) => {
      if (a.string !== b.string) return a.string - b.string;
      return a.fret - b.fret;
    });

    const midiNotes = sorted.map(n => n.midi);

    if (practiceState.direction === 'descending') {
      return midiNotes.reverse();
    }
    if (practiceState.direction === 'both') {
      const desc = [...midiNotes].reverse().slice(1);
      return [...midiNotes, ...desc];
    }
    return midiNotes;
  }

  // ── Play / Stop ──

  function play() {
    if (practiceState.playing) return;

    const notes = buildMidiNotes();
    if (notes.length === 0) return;

    practiceState._currentNotes = notes;
    practiceState._noteIndex = 0;
    practiceState._beatCount = 0;
    practiceState.playing = true;

    elPlayBtn.disabled = true;
    elPlayBtn.style.opacity = '0.5';
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
      Audio.playNote(midi, noteDuration);

      // Highlight on fretboard
      FB.clearHighlights();
      FB.highlightNoteMidi(midi);

      // Beat indicator
      updateBeatIndicator(idx, practiceState._currentNotes.length, false);

      practiceState._noteIndex++;

      if (practiceState._noteIndex >= practiceState._currentNotes.length) {
        // Progression mode: advance to next chord's scale
        if (practiceState.progressionMode) {
          var canContinue = advanceProgChord();
          if (!canContinue) {
            stop();
            return;
          }
          // Rebuild notes for new scale
          practiceState._currentNotes = buildMidiNotes();
          practiceState._noteIndex = 0;
          practiceState._beatCount++;
        } else if (practiceState.loopOn) {
          practiceState._noteIndex = 0;
          practiceState._beatCount++;
        } else {
          stop();
        }
      }
    }, intervalMs);
  }

  function stop() {
    if (practiceState._intervalId) {
      clearInterval(practiceState._intervalId);
      practiceState._intervalId = null;
    }
    practiceState.playing = false;
    practiceState._noteIndex = 0;

    Audio.stopAll();
    FB.clearHighlights();

    if (elPlayBtn) {
      elPlayBtn.disabled = false;
      elPlayBtn.style.opacity = '1';
    }
    if (elStopBtn) {
      elStopBtn.disabled = true;
      elStopBtn.style.opacity = '0.5';
    }
    if (elBeatIndicator) {
      elBeatIndicator.innerHTML = '';
    }
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
