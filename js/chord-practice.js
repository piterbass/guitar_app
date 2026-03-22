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
  let elLyricsKaraoke, elKaraokeCurrent, elKaraokeNext;
  let elArpeggioToggle;

  // ── State ──
  let state = {
    selectedId: null,
    category: 'all',
    difficulty: 'easy',
    positionZone: 'all',
    chords: [],
    voicings: [],
    songSegments: [],   // [{chord, lyrics, beats}] - karaoke segments from song content
    beatsPerChordArr: [],  // per-chord beats (from :N notation), null = use global
    hasCustomBeats: false, // true if any chord has :N notation
    isSong: false,      // true when a songbook song is selected
    customVoicings: {}, // { progId: { chordIdx: voicingObj } } - user overrides saved in localStorage
    arpeggioMode: false,
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
    _arpeggioTimeouts: [],
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
    elLyricsKaraoke = document.getElementById('cp-lyrics-karaoke');
    elKaraokeCurrent = document.getElementById('cp-karaoke-current');
    elKaraokeNext   = document.getElementById('cp-karaoke-next');
    elArpeggioToggle = document.getElementById('cp-arpeggio');

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
    if (elArpeggioToggle) {
      elArpeggioToggle.checked = false;  // always start with arpeggio off
      state.arpeggioMode = false;
      elArpeggioToggle.addEventListener('change', function () {
        state.arpeggioMode = elArpeggioToggle.checked;
      });
    }

    // Tap diagram to pick voicing (when not playing)
    elDiagram.addEventListener('click', function () {
      if (state.playing) return;
      if (state.chords.length === 0) return;
      openVoicingPicker(state.currentChordIndex);
    });

    // Play / Pause / Stop
    elPlay.addEventListener('click', play);
    elPause.addEventListener('click', pause);
    elStop.addEventListener('click', stop);

    // Load saved custom voicings
    loadCustomVoicings();

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
        var segments = parseSongSegments(song.content);
        if (segments.length === 0) return;
        var allChords = segments.map(function (s) { return s.chord; });
        var opt = document.createElement('option');
        opt.value = 'song-' + song.id;
        opt.textContent = song.title + (song.artist ? ' – ' + song.artist : '') + ' (' + allChords.length + ' acordes)';
        opt.dataset.chords = JSON.stringify(allChords);
        opt.dataset.segments = JSON.stringify(segments);
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
      state.songSegments = [];
      state.isSong = false;
      renderStrip();
      renderCurrentChord();
      return;
    }

    // Check if it's a songbook song
    if (id.startsWith('song-')) {
      var opt = elProgression.querySelector('option[value="' + id + '"]');
      if (opt && opt.dataset.chords) {
        state.chords = JSON.parse(opt.dataset.chords);
        state.songSegments = opt.dataset.segments ? JSON.parse(opt.dataset.segments) : [];
        state.isSong = true;
        state.beatsPerChord = 4;
        state.selectedId = id;

        // Build per-chord beats array from segments
        var anyCustom = false;
        state.beatsPerChordArr = state.songSegments.map(function (seg) {
          if (seg.beats) { anyCustom = true; return seg.beats; }
          return null;
        });
        state.hasCustomBeats = anyCustom;
      } else {
        state.chords = [];
        state.songSegments = [];
        state.isSong = false;
        state.hasCustomBeats = false;
        state.beatsPerChordArr = [];
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
      state.songSegments = [];
      state.isSong = false;
    }

    state.currentChordIndex = 0;
    state.beatInChord = 0;

    computeVoicings();
    renderStrip();
    renderCurrentChord();
    renderKaraoke();
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
      // Check for user-selected custom voicing first
      var custom = getCustomVoicing(state.selectedId, i);
      if (custom) return custom;

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
    renderKaraoke();
  }

  // ── Voicing to MIDI ──

  function voicingToMidi(voicing) {
    if (!voicing || !voicing.frets) return [];
    return voicing.frets
      .map(function (f, i) { return f === -1 ? null : STANDARD_TUNING[i] + f; })
      .filter(function (n) { return n !== null; });
  }

  /** Returns beats for the given chord index (per-chord or global fallback). */
  function getBeatsForChord(idx) {
    if (state.hasCustomBeats && state.beatsPerChordArr[idx]) {
      return state.beatsPerChordArr[idx];
    }
    return state.beatsPerChord;
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
    var countIn = getBeatsForChord(state.currentChordIndex);

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
      var curBeats = getBeatsForChord(state.currentChordIndex);
      var isFirstBeat = (state.beatInChord === 0);

      // Metronome click
      if (state.metronomeOn) {
        Audio.playClick(isFirstBeat);
      }

      // On first beat: update diagram first, then play chord/arpeggio
      if (isFirstBeat) {
        renderCurrentChord();
        var voicing = state.voicings[state.currentChordIndex];
        if (voicing && state.soundOn) {
          var chordDuration = Math.max((curBeats * intervalMs) / 1000, 1.5);
          if (state.arpeggioMode) {
            playArpeggio(voicing, chordDuration);
          } else {
            var midi = voicingToMidi(voicing);
            Audio.playChord(midi, chordDuration);
          }
        }
      }

      // Beat indicator
      updateBeatIndicator(state.beatInChord, curBeats, false);

      // Advance beat
      state.beatInChord++;
      if (state.beatInChord >= curBeats) {
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

    clearArpeggioTimeouts();
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

    clearArpeggioTimeouts();
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

  // ── Song content parsing ──

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Parse song content into segments: [{chord, lyrics, beats}, ...]
   * Each segment is one chord occurrence with its associated lyrics text.
   * Supports optional beat notation: [Dm7:2] means 2 beats for this chord.
   */
  function parseSongSegments(content) {
    if (!content) return [];
    var segments = [];
    var parts = content.split(/\[([^\]]+)\]/);
    // parts = [textBefore, chord1, textAfter1, chord2, textAfter2, ...]
    for (var i = 1; i < parts.length; i += 2) {
      var raw = parts[i].trim();
      var lyrics = (parts[i + 1] || '').replace(/\n+/g, ' ').trim();
      // Parse optional :N beat notation
      var beatMatch = raw.match(/^(.+):(\d+)$/);
      if (beatMatch) {
        segments.push({ chord: beatMatch[1].trim(), beats: parseInt(beatMatch[2]), lyrics: lyrics });
      } else {
        segments.push({ chord: raw, beats: null, lyrics: lyrics });
      }
    }
    return segments;
  }

  /**
   * Format a karaoke segment as HTML: chord name + lyrics text
   */
  function formatKaraokeSegment(segment) {
    if (!segment) return '';
    var html = '<span class="karaoke-chord">[' + escapeHtml(segment.chord) + ']</span>';
    if (segment.lyrics) {
      html += ' ' + escapeHtml(segment.lyrics);
    }
    return html;
  }

  /**
   * Render the karaoke lyrics display for the current chord
   */
  function renderKaraoke() {
    if (!elLyricsKaraoke) return;

    if (!state.isSong || state.songSegments.length === 0) {
      elLyricsKaraoke.style.display = 'none';
      return;
    }

    elLyricsKaraoke.style.display = '';
    var idx = state.currentChordIndex;
    var current = state.songSegments[idx];
    var next = state.songSegments[idx + 1];

    elKaraokeCurrent.innerHTML = current ? formatKaraokeSegment(current) : '';
    elKaraokeNext.innerHTML = next ? formatKaraokeSegment(next) : '';
  }

  // ── Custom voicing persistence ──

  var CUSTOM_VOICINGS_KEY = 'cp-custom-voicings';

  function loadCustomVoicings() {
    try {
      state.customVoicings = JSON.parse(localStorage.getItem(CUSTOM_VOICINGS_KEY)) || {};
    } catch (e) { state.customVoicings = {}; }
  }

  function saveCustomVoicing(progId, chordIdx, voicing) {
    if (!progId) return;
    if (!state.customVoicings[progId]) state.customVoicings[progId] = {};
    state.customVoicings[progId][chordIdx] = {
      frets: voicing.frets,
      noteNames: voicing.noteNames,
      barre: voicing.barre,
      fingers: voicing.fingers
    };
    try {
      localStorage.setItem(CUSTOM_VOICINGS_KEY, JSON.stringify(state.customVoicings));
    } catch (e) { /* ignore */ }
  }

  function getCustomVoicing(progId, chordIdx) {
    if (!progId || !state.customVoicings[progId]) return null;
    return state.customVoicings[progId][chordIdx] || null;
  }

  // ── Voicing picker ──

  function bankEntryToVoicing(entry) {
    var frets = entry.frets;
    var noteNames = frets.map(function (f, i) {
      if (f === -1) return 'X';
      return window.MusicTheory.pcToName(window.MusicTheory.fretToPC(i, f));
    });
    var barre = Voicings.detectBarre(frets);
    var fingers = Voicings.suggestFingers(frets, barre);
    return { frets: frets, noteNames: noteNames, barre: barre, fingers: fingers };
  }

  function openVoicingPicker(chordIdx) {
    var chordName = state.chords[chordIdx];
    if (!chordName) return;

    var modal = document.getElementById('voicing-picker-modal');
    var grid = document.getElementById('voicing-picker-grid');
    var title = document.getElementById('voicing-picker-title');

    title.textContent = 'Elegir voicing: ' + chordName;
    grid.innerHTML = '';

    var currentFrets = state.voicings[chordIdx] ? state.voicings[chordIdx].frets.join(',') : '';

    // 1) Pinned voicings from song
    if (state.isSong && state.selectedId) {
      var songId = state.selectedId.replace('song-', '');
      var song = window.Songbook ? window.Songbook.getSong(songId) : null;
      if (song && song.pinnedVoicings) {
        song.pinnedVoicings.forEach(function (pv) {
          if (pv.chord !== chordName) return;
          var voicing = bankEntryToVoicing(pv);
          var card = createVoicingPickerCard(voicing, chordName, chordIdx, currentFrets, 'Pineado');
          grid.appendChild(card);
        });
      }
    }

    // 2) Personal voicings from ChordBank
    if (window.ChordBank) {
      var saved = window.ChordBank.getByName(chordName);
      saved.forEach(function (sv) {
        var voicing = bankEntryToVoicing(sv);
        // Skip if already added as pinned
        var key = voicing.frets.join(',');
        if (grid.querySelector('[data-frets="' + key + '"]')) return;
        var card = createVoicingPickerCard(voicing, chordName, chordIdx, currentFrets, 'Personal');
        grid.appendChild(card);
      });
    }

    // 3) Generated voicings by categories
    var chord = Parser.parseChord(chordName);
    if (chord) {
      var categories = ['common', 'shell', 'drop2', 'rootless'];
      var seen = {};
      // Mark already-shown voicings
      grid.querySelectorAll('[data-frets]').forEach(function (el) {
        seen[el.dataset.frets] = true;
      });

      categories.forEach(function (cat) {
        var results = Voicings.findVoicings(chord, { category: cat });
        results.slice(0, 8).forEach(function (v) {
          var key = v.frets.join(',');
          if (seen[key]) return;
          seen[key] = true;
          var label = cat === 'common' ? '' : cat.charAt(0).toUpperCase() + cat.slice(1);
          var card = createVoicingPickerCard(v, chordName, chordIdx, currentFrets, label);
          grid.appendChild(card);
        });
      });
    }

    if (grid.children.length === 0) {
      grid.innerHTML = '<p style="color:#888;text-align:center;">No se encontraron voicings.</p>';
    }

    modal.style.display = 'flex';

    // Close handlers
    var closeBtn = document.getElementById('voicing-picker-close');
    closeBtn.onclick = function () { modal.style.display = 'none'; };
    modal.onclick = function (e) {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  function createVoicingPickerCard(voicing, chordName, chordIdx, currentFrets, badge) {
    var card = document.createElement('div');
    card.className = 'voicing-card picker-card';
    card.dataset.frets = voicing.frets.join(',');

    // Highlight current voicing
    if (voicing.frets.join(',') === currentFrets) {
      card.classList.add('pinned');
    }

    var opts = badge ? { badge: badge } : {};
    card.appendChild(Diagram.createDiagram(voicing, chordName, opts));

    card.addEventListener('click', function () {
      // Apply this voicing
      state.voicings[chordIdx] = voicing;
      saveCustomVoicing(state.selectedId, chordIdx, voicing);
      renderCurrentChord();

      // Flash confirmation
      card.classList.add('pinned');
      card.classList.remove('pin-flash');
      void card.offsetWidth;
      card.classList.add('pin-flash');

      // Close after brief delay
      setTimeout(function () {
        document.getElementById('voicing-picker-modal').style.display = 'none';
      }, 350);
    });

    return card;
  }

  // ── Arpeggio playback ──

  function playArpeggio(voicing, totalDurationSec) {
    if (!voicing || !voicing.frets) return;

    // Build note list with string index (low to high, skip muted)
    var notes = [];
    for (var s = 0; s < voicing.frets.length; s++) {
      var f = voicing.frets[s];
      if (f !== -1) {
        notes.push({ midi: STANDARD_TUNING[s] + f, string: s });
      }
    }
    if (notes.length === 0) return;

    // Clear any previous arpeggio
    clearArpeggioTimeouts();

    // Space notes evenly across the beat duration
    var noteInterval = (totalDurationSec * 1000) / (notes.length + 1);
    var noteDuration = Math.max(totalDurationSec * 0.8, 1.0);

    notes.forEach(function (note, idx) {
      var tid = setTimeout(function () {
        // Find SVG fresh each time (it may have been re-rendered)
        var svg = elDiagram ? elDiagram.querySelector('.chord-diagram') : null;
        if (svg) {
          Diagram.clearDiagramHighlights(svg);
          Diagram.highlightString(svg, note.string);
        }
        Audio.playNote(note.midi, noteDuration);
      }, idx * noteInterval);
      state._arpeggioTimeouts.push(tid);
    });

    // Clear highlights after last note
    var clearTid = setTimeout(function () {
      var svg = elDiagram ? elDiagram.querySelector('.chord-diagram') : null;
      if (svg) Diagram.clearDiagramHighlights(svg);
    }, notes.length * noteInterval);
    state._arpeggioTimeouts.push(clearTid);
  }

  function clearArpeggioTimeouts() {
    state._arpeggioTimeouts.forEach(function (tid) { clearTimeout(tid); });
    state._arpeggioTimeouts = [];
  }

  // ── Public ──

  function syncFromExplore() {
    // Refresh state when entering practice tab
  }

  // ── Init on DOM ready ──
  document.addEventListener('DOMContentLoaded', init);

  window.ChordPractice = { init: init, stop: stop, syncFromExplore: syncFromExplore };
})();
