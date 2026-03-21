// ============================================================
// chord-practice.js  –  Modo Práctica de Acordes
//   Progresiones, círculos, metrónomo, dificultad
// ============================================================

(function () {
  const Audio = window.AudioEngine;
  const Progressions = window.ChordProgressions;
  const Parser = window.ChordParser;
  const Voicings = window.VoicingFinder;
  const Diagram = window.FretboardSVG;
  const { STANDARD_TUNING } = window.MusicTheory;

  // ── BPM presets (mismos que practice-mode) ──
  const SPEED_PRESETS = {
    lento: 60,
    normal: 100,
    rapido: 140,
    'super-rapido': 180,
    extremo: 220,
  };

  // ── DOM refs ──
  let elPanel;
  let elCategory, elProgression;
  let elDifficultyToggle;
  let elStrip;
  let elCurrentName, elNextName, elDiagram;
  let elSpeed, elBpmDisplay, elBpmInput;
  let elMetronome, elLoop;
  let elPlay, elPause, elStop, elBeatIndicator;
  let elPositionZone;

  // ── State ──
  let state = {
    selectedId: null,
    category: 'all',
    difficulty: 'easy',
    positionZone: 'all',
    chords: [],
    voicings: [],
    beatsPerChord: 4,
    currentChordIndex: 0,
    beatInChord: 0,
    bpm: 100,
    speed: 'normal',
    metronomeOn: true,
    soundOn: true,
    loopOn: true,
    playing: false,
    paused: false,
    _intervalId: null,
    _countIdx: 0,
  };

  // ── Init ──

  function init() {
    elPanel = document.getElementById('chord-practice-panel');
    if (!elPanel) return;

    elCategory      = document.getElementById('cp-category');
    elProgression   = document.getElementById('cp-progression');
    elDifficultyToggle = document.getElementById('cp-difficulty-toggle');
    elStrip         = document.getElementById('cp-progression-strip');
    elCurrentName   = document.getElementById('cp-current-name');
    elNextName      = document.getElementById('cp-next-name');
    elDiagram       = document.getElementById('cp-diagram');
    elSpeed         = document.getElementById('cp-speed');
    elBpmDisplay    = document.getElementById('cp-bpm-display');
    elBpmInput      = document.getElementById('cp-bpm-input');
    elMetronome     = document.getElementById('cp-metronome');
    elLoop          = document.getElementById('cp-loop');
    elPlay          = document.getElementById('cp-play');
    elPause         = document.getElementById('cp-pause');
    elStop          = document.getElementById('cp-stop');
    elBeatIndicator = document.getElementById('cp-beat-indicator');
    elPositionZone  = document.getElementById('cp-position-zone');

    if (!elCategory || !elProgression) return;

    // Populate progression list
    populateProgressions();

    // Events
    elCategory.addEventListener('change', function () {
      state.category = elCategory.value;
      populateProgressions();
    });
    elProgression.addEventListener('change', onProgressionSelected);

    // Difficulty toggle
    elDifficultyToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.cp-diff-btn');
      if (!btn) return;
      elDifficultyToggle.querySelectorAll('.cp-diff-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.difficulty = btn.dataset.diff;
      if (state.chords.length > 0) {
        stop();
        computeVoicings();
        renderCurrentChord();
      }
    });

    // Position zone
    elPositionZone.addEventListener('change', function () {
      state.positionZone = elPositionZone.value;
      if (state.chords.length > 0) {
        stop();
        computeVoicings();
        renderCurrentChord();
      }
    });

    // Speed / BPM
    elSpeed.addEventListener('change', onSpeedChanged);
    elBpmInput.addEventListener('change', onBpmInputChanged);
    elBpmInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.target.blur(); onBpmInputChanged(); }
    });

    // Toggles
    elMetronome.addEventListener('change', function () { state.metronomeOn = elMetronome.checked; });
    document.getElementById('cp-sound').addEventListener('change', function () { state.soundOn = this.checked; });
    elLoop.addEventListener('change', function () { state.loopOn = elLoop.checked; });

    // Play / Pause / Stop
    elPlay.addEventListener('click', play);
    elPause.addEventListener('click', pause);
    elStop.addEventListener('click', stop);

    // Load first progression
    onProgressionSelected();
  }

  // ── Populate ──

  function populateProgressions() {
    elProgression.innerHTML = '';

    if (state.category === 'mis-canciones') {
      // Load from user's songbook
      var songs = window.Songbook ? window.Songbook.getSongs() : [];
      songs.forEach(function (song) {
        var chords = window.Songbook.extractChords(song.content);
        if (chords.length === 0) return;
        // Deduplicate consecutive same chords
        var unique = [chords[0]];
        for (var i = 1; i < chords.length; i++) {
          if (chords[i] !== chords[i - 1]) unique.push(chords[i]);
        }
        var opt = document.createElement('option');
        opt.value = 'song-' + song.id;
        opt.textContent = song.title + (song.artist ? ' – ' + song.artist : '') + ' (' + unique.length + ' acordes)';
        opt.dataset.chords = JSON.stringify(unique);
        elProgression.appendChild(opt);
      });
      if (songs.length === 0) {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay canciones guardadas';
        elProgression.appendChild(opt);
      }
    } else {
      var list = Progressions.getByCategory(state.category);
      list.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.artist ? ' – ' + p.artist : '');
        elProgression.appendChild(opt);
      });
    }
    onProgressionSelected();
  }

  // ── Progression selected ──

  function onProgressionSelected() {
    stop();
    var id = elProgression.value;
    if (!id) {
      state.chords = [];
      state.voicings = [];
      renderStrip();
      renderCurrentChord();
      return;
    }

    // Check if it's a songbook song
    if (id.startsWith('song-')) {
      var opt = elProgression.querySelector('option[value="' + id + '"]');
      if (opt && opt.dataset.chords) {
        state.chords = JSON.parse(opt.dataset.chords);
        state.beatsPerChord = 4;
        state.selectedId = id;
      } else {
        state.chords = [];
      }
    } else {
      var list = Progressions.getByCategory(state.category);
      var prog = list.find(function (p) { return p.id === id; });
      if (!prog) {
        state.chords = [];
        state.voicings = [];
        renderStrip();
        renderCurrentChord();
        return;
      }
      state.selectedId = prog.id;
      state.chords = prog.chords;
      state.beatsPerChord = prog.beatsPerChord || 4;
    }

    state.currentChordIndex = 0;
    state.beatInChord = 0;

    computeVoicings();
    renderStrip();
    renderCurrentChord();
  }

  // ── Voicing computation ──

  function getCategoryForDifficulty(difficulty, chordIndex) {
    switch (difficulty) {
      case 'easy': return 'common';
      case 'medium': return chordIndex % 2 === 0 ? 'common' : 'shell';
      case 'advanced': {
        var cats = ['rootless', 'drop2', 'quartal'];
        return cats[chordIndex % 3];
      }
      default: return 'common';
    }
  }

  function parseZone(zone) {
    if (!zone || zone === 'all') return {};
    var parts = zone.split('-');
    return { minFret: parseInt(parts[0]), maxFret: parseInt(parts[1]) };
  }

  function computeVoicings() {
    var zone = parseZone(state.positionZone);

    state.voicings = state.chords.map(function (chordName, i) {
      var parsed = Parser.parseChord(chordName);
      if (!parsed) return null;

      var category = getCategoryForDifficulty(state.difficulty, i);
      var opts = { category: category };
      if (zone.minFret !== undefined) {
        opts.minFret = zone.minFret;
        opts.maxFret = zone.maxFret;
      }
      var results = Voicings.findVoicings(parsed, opts);

      // Fallback to common if no results in this zone
      if (results.length === 0 && category !== 'common') {
        opts.category = 'common';
        results = Voicings.findVoicings(parsed, opts);
      }

      // Fallback to any zone if still no results
      if (results.length === 0 && zone.minFret !== undefined) {
        results = Voicings.findVoicings(parsed, { category: category });
        if (results.length === 0 && category !== 'common') {
          results = Voicings.findVoicings(parsed, { category: 'common' });
        }
      }

      return results.length > 0 ? results[0] : null;
    });
  }

  // ── Render strip ──

  function renderStrip() {
    elStrip.innerHTML = '';
    state.chords.forEach(function (chord, i) {
      var chip = document.createElement('span');
      chip.className = 'cp-chord-chip';
      chip.textContent = chord;
      chip.dataset.index = i;
      chip.addEventListener('click', function () {
        if (!state.playing) {
          state.currentChordIndex = i;
          state.beatInChord = 0;
          renderCurrentChord();
          updateStripHighlight();
        }
      });
      elStrip.appendChild(chip);
    });
    updateStripHighlight();
  }

  function updateStripHighlight() {
    var chips = elStrip.querySelectorAll('.cp-chord-chip');
    chips.forEach(function (chip, i) {
      chip.classList.remove('current', 'next');
      if (i === state.currentChordIndex) chip.classList.add('current');
      else if (i === state.currentChordIndex + 1) chip.classList.add('next');
    });

    // Scroll current into view
    var current = elStrip.querySelector('.cp-chord-chip.current');
    if (current) {
      current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ── Render current chord ──

  function renderCurrentChord() {
    var chord = state.chords[state.currentChordIndex];
    var next = state.chords[state.currentChordIndex + 1];

    elCurrentName.textContent = chord || '--';
    elNextName.textContent = next ? 'Siguiente: ' + next : '';

    elDiagram.innerHTML = '';
    var voicing = state.voicings[state.currentChordIndex];
    if (voicing && chord) {
      var svg = Diagram.createDiagram(voicing, chord);
      elDiagram.appendChild(svg);
    }

    updateStripHighlight();
  }

  // ── Voicing to MIDI ──

  function voicingToMidi(voicing) {
    if (!voicing || !voicing.frets) return [];
    return voicing.frets
      .map(function (f, i) { return f === -1 ? null : STANDARD_TUNING[i] + f; })
      .filter(function (n) { return n !== null; });
  }

  // ── Play / Stop (same metronome pattern as practice-mode.js) ──

  function play() {
    if (state.playing) return;
    if (state.chords.length === 0) return;

    // If resuming from pause, keep position; otherwise start from beginning
    if (!state.paused) {
      state.currentChordIndex = 0;
    }
    state.beatInChord = 0;
    state._countIdx = 0;
    state.playing = true;
    state.paused = false;

    elPlay.disabled = true;
    elPlay.style.opacity = '0.5';
    elStop.disabled = false;
    elStop.style.opacity = '1';
    if (elPause) { elPause.disabled = false; elPause.style.opacity = '1'; }

    renderCurrentChord();

    var intervalMs = 60000 / state.bpm;
    var countIn = state.beatsPerChord;

    state._intervalId = setInterval(function () {
      // Count-in phase
      if (state._countIdx < countIn) {
        if (state.metronomeOn) {
          Audio.playClick(state._countIdx === 0);
        }
        updateBeatIndicator(state._countIdx, countIn, true);
        state._countIdx++;
        return;
      }

      // Playing phase
      var isFirstBeat = (state.beatInChord === 0);

      // Metronome click
      if (state.metronomeOn) {
        Audio.playClick(isFirstBeat);
      }

      // On first beat: play chord + update diagram
      if (isFirstBeat) {
        var voicing = state.voicings[state.currentChordIndex];
        if (voicing && state.soundOn) {
          var midi = voicingToMidi(voicing);
          var chordDuration = Math.max((state.beatsPerChord * intervalMs) / 1000, 1.5);
          Audio.playChord(midi, chordDuration);
        }
        renderCurrentChord();
      }

      // Beat indicator
      updateBeatIndicator(state.beatInChord, state.beatsPerChord, false);

      // Advance beat
      state.beatInChord++;
      if (state.beatInChord >= state.beatsPerChord) {
        state.beatInChord = 0;
        state.currentChordIndex++;

        if (state.currentChordIndex >= state.chords.length) {
          if (state.loopOn) {
            state.currentChordIndex = 0;
          } else {
            stop();
          }
        }
      }
    }, intervalMs);
  }

  function pause() {
    if (!state.playing) return;
    if (state._intervalId) {
      clearInterval(state._intervalId);
      state._intervalId = null;
    }
    state.playing = false;
    state.paused = true;

    Audio.stopAll();

    if (elPlay) { elPlay.disabled = false; elPlay.style.opacity = '1'; }
    if (elPause) { elPause.disabled = true; elPause.style.opacity = '0.5'; }
    if (elStop) { elStop.disabled = false; elStop.style.opacity = '1'; }
    if (elBeatIndicator) { elBeatIndicator.innerHTML = ''; }
  }

  function stop() {
    if (state._intervalId) {
      clearInterval(state._intervalId);
      state._intervalId = null;
    }
    state.playing = false;
    state.paused = false;
    state._countIdx = 0;
    state.beatInChord = 0;
    state.currentChordIndex = 0;

    Audio.stopAll();

    if (elPlay) { elPlay.disabled = false; elPlay.style.opacity = '1'; }
    if (elPause) { elPause.disabled = true; elPause.style.opacity = '0.5'; }
    if (elStop) { elStop.disabled = true; elStop.style.opacity = '0.5'; }
    if (elBeatIndicator) { elBeatIndicator.innerHTML = ''; }

    renderCurrentChord();
  }

  // ── Beat indicator (same as practice-mode.js) ──

  function updateBeatIndicator(current, total, isCountIn) {
    if (!elBeatIndicator) return;

    if (isCountIn) {
      var dots = [];
      for (var i = 0; i < total; i++) {
        var active = i <= current;
        dots.push('<span class="beat-dot' + (active ? ' active count-in' : '') + '"></span>');
      }
      elBeatIndicator.innerHTML =
        '<span style="color:#ffe66d;font-size:0.8rem;margin-right:6px;">Cuenta: ' + (current + 1) + '</span>' +
        dots.join('');
      return;
    }

    var pct = total > 1 ? Math.round((current / (total - 1)) * 100) : 100;
    elBeatIndicator.innerHTML =
      '<div class="beat-progress-bar"><div class="beat-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="beat-note-count">Beat ' + (current + 1) + ' / ' + total + '</span>';
  }

  // ── Speed / BPM (same pattern as practice-mode.js) ──

  function onSpeedChanged() {
    var key = elSpeed.value;
    state.speed = key;
    if (key === 'custom') {
      elBpmInput.style.display = '';
      elBpmDisplay.style.display = 'none';
      state.bpm = parseInt(elBpmInput.value) || 100;
    } else {
      elBpmInput.style.display = 'none';
      elBpmDisplay.style.display = '';
      state.bpm = SPEED_PRESETS[key] || 100;
      elBpmDisplay.textContent = state.bpm + ' BPM';
      elBpmInput.value = state.bpm;
    }
    if (state.playing) {
      stop();
      play();
    }
  }

  function onBpmInputChanged() {
    var val = parseInt(elBpmInput.value) || 100;
    if (val < 20) val = 20;
    if (val > 300) val = 300;
    elBpmInput.value = val;
    state.bpm = val;

    var matchingPreset = null;
    Object.keys(SPEED_PRESETS).forEach(function (key) {
      if (SPEED_PRESETS[key] === val) matchingPreset = key;
    });

    if (matchingPreset) {
      elSpeed.value = matchingPreset;
      state.speed = matchingPreset;
      elBpmDisplay.textContent = val + ' BPM';
      elBpmDisplay.style.display = '';
      elBpmInput.style.display = 'none';
    } else {
      elSpeed.value = 'custom';
      state.speed = 'custom';
    }

    if (state.playing) {
      stop();
      play();
    }
  }

  // ── Public ──

  function syncFromExplore() {
    // Refresh state when entering practice tab
  }

  // ── Init on DOM ready ──
  document.addEventListener('DOMContentLoaded', init);

  window.ChordPractice = { init: init, stop: stop, syncFromExplore: syncFromExplore };
})();
