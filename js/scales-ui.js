// ============================================================
// scales-ui.js  –  Controlador UI de la sección Escalas
// ============================================================

(function () {
  const { NOTE_NAMES, SCALE_FORMULAS, INTERVAL_SEMITONES, STANDARD_TUNING, getScalePCs, pcToName, fretToPC } = window.MusicTheory;
  const SCALE_LABELS = window.ScaleDetector.SCALE_LABELS;
  const Engine = window.ScalePositionEngine;
  const FB = window.FullFretboardSVG;
  const Bank = window.ScaleBank;

  // ── DOM refs ──────────────────────────────────────────────
  let elRootSelect, elTypeSelect, elSaveBtn;
  let elInfo, elFretboard;
  let elPositionLabel, elPrevBtn, elNextBtn, elPositionDots;
  let elShowFull, elShowIntervals, elDirection;
  let elPlayPosition, elPlayFull, elTempo;
  let elFlipStrings;
  let elTabExplore, elTabBank, elTabPractice, elTabBuilder, elExplorePanel, elBankPanel, elPracticePanel, elBuilderPanel, elBankCount;
  let elBankList, elBankExport, elBankImport, elBankFile;

  // ── Estado ────────────────────────────────────────────────
  let state = {
    rootPc: 0,
    scaleKey: 'major',
    scalePCs: [],
    positions: [],
    currentPosition: 0,
    showFullScale: true,
    showIntervals: false,
    tempo: 300,
    playback: null,
    direction: 'ascending',
    currentTab: 'explore',
  };

  // ── Grupos para el selector de escalas ────────────────────
  const SCALE_GROUPS = [
    {
      label: 'Modos diatónicos',
      keys: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
    },
    {
      label: 'Escalas menores',
      keys: ['aeolian', 'harmonic-minor', 'melodic-minor'],
    },
    {
      label: 'Modos de la menor melódica',
      keys: ['melodic-minor', 'dorian-b2', 'lydian-augmented', 'lydian-dominant', 'mixolydian-b6', 'locrian-nat2', 'altered'],
    },
    {
      label: 'Modos de la menor armónica',
      keys: ['harmonic-minor', 'locrian-nat6', 'ionian-sharp5', 'dorian-sharp4', 'phrygian-dominant', 'lydian-sharp2'],
    },
    {
      label: 'Pentatónicas y Blues',
      keys: ['pentatonic-major', 'pentatonic-minor', 'blues', 'blues-major'],
    },
    {
      label: 'Simétricas',
      keys: ['whole-tone', 'diminished', 'half-whole-dim', 'augmented'],
    },
    {
      label: 'Bebop',
      keys: ['bebop-dominant', 'bebop-major', 'bebop-dorian', 'bebop-melodic-minor'],
    },
    {
      label: 'Exóticas',
      keys: ['double-harmonic', 'harmonic-major', 'in-sen', 'hirajoshi'],
    },
  ];

  // ── Init ──────────────────────────────────────────────────

  function init() {
    // Cache DOM
    elRootSelect = document.getElementById('scales-root');
    elTypeSelect = document.getElementById('scales-type');
    elSaveBtn = document.getElementById('scales-save-btn');
    elInfo = document.getElementById('scales-info');
    elFretboard = document.getElementById('scales-fretboard');
    elPositionLabel = document.getElementById('scales-position-label');
    elPrevBtn = document.getElementById('scales-prev-pos');
    elNextBtn = document.getElementById('scales-next-pos');
    elPositionDots = document.getElementById('scales-position-dots');
    elShowFull = document.getElementById('scales-show-full');
    elShowIntervals = document.getElementById('scales-show-intervals');
    elDirection = document.getElementById('scales-direction');
    elPlayPosition = document.getElementById('scales-play-position');
    elPlayFull = document.getElementById('scales-play-full');
    elTempo = document.getElementById('scales-tempo');
    elTabExplore = document.getElementById('scales-tab-explore');
    elTabPractice = document.getElementById('scales-tab-practice');
    elTabBank = document.getElementById('scales-tab-bank');
    elTabBuilder = document.getElementById('scales-tab-builder');
    elExplorePanel = document.getElementById('scales-explore-panel');
    elPracticePanel = document.getElementById('scales-practice-panel');
    elBankPanel = document.getElementById('scales-bank-panel');
    elBuilderPanel = document.getElementById('scales-builder-panel');
    elBankCount = document.getElementById('scales-bank-count');
    elBankList = document.getElementById('scales-bank-list');
    elFlipStrings = document.getElementById('scales-flip-strings');
    elBankExport = document.getElementById('scales-bank-export');
    elBankImport = document.getElementById('scales-bank-import');
    elBankFile = document.getElementById('scales-bank-file');

    if (!elRootSelect || !elTypeSelect) return; // guard

    populateRootSelector();
    populateScaleTypeSelector();

    // Events - selectors
    elRootSelect.addEventListener('change', onScaleChanged);
    elTypeSelect.addEventListener('change', onScaleChanged);

    // Events - position navigation
    elPrevBtn.addEventListener('click', () => navigatePosition(-1));
    elNextBtn.addEventListener('click', () => navigatePosition(1));

    // Events - toggles
    elShowFull.addEventListener('change', () => {
      state.showFullScale = elShowFull.checked;
      renderFretboard();
    });
    elShowIntervals.addEventListener('change', () => {
      state.showIntervals = elShowIntervals.checked;
      renderFretboard();
    });
    elDirection.addEventListener('change', () => {
      state.direction = elDirection.value;
    });
    elFlipStrings.addEventListener('click', () => {
      const current = FB.getFlip();
      FB.setFlip(!current);
      elFlipStrings.classList.toggle('active', !current);
      renderFretboard();
    });

    // Events - audio
    elPlayPosition.addEventListener('click', playPosition);
    elPlayFull.addEventListener('click', playFullScale);
    elTempo.addEventListener('change', () => {
      state.tempo = parseInt(elTempo.value) || 300;
    });

    // Events - tabs
    elTabExplore.addEventListener('click', () => switchTab('explore'));
    elTabPractice.addEventListener('click', () => switchTab('practice'));
    elTabBank.addEventListener('click', () => switchTab('bank'));
    elTabBuilder.addEventListener('click', () => switchTab('builder'));

    // Events - save
    elSaveBtn.addEventListener('click', saveCurrentScale);

    // Events - bank export/import
    elBankExport.addEventListener('click', handleExport);
    elBankImport.addEventListener('click', () => elBankFile.click());
    elBankFile.addEventListener('change', handleImport);

    // Keyboard navigation
    document.addEventListener('keydown', onKeyDown);

    // Initial render
    updateBankCount();
    onScaleChanged();
  }

  // ── Populadores de selectores ─────────────────────────────

  function populateRootSelector() {
    elRootSelect.innerHTML = '';
    NOTE_NAMES.forEach((name, pc) => {
      const opt = document.createElement('option');
      opt.value = pc;
      opt.textContent = name;
      elRootSelect.appendChild(opt);
    });
  }

  function populateScaleTypeSelector() {
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

  // ── Cambio de escala ──────────────────────────────────────

  function onScaleChanged() {
    stopPlayback();

    state.rootPc = parseInt(elRootSelect.value) || 0;
    state.scaleKey = elTypeSelect.value || 'major';
    state.scalePCs = getScalePCs(state.rootPc, state.scaleKey);
    state.positions = Engine.generatePositions(state.rootPc, state.scaleKey);
    state.currentPosition = 0;

    updateInfo();
    updatePositionDots();
    updatePositionLabel();
    renderFretboard();
  }

  // ── Info bar ──────────────────────────────────────────────

  function updateInfo() {
    const rootName = pcToName(state.rootPc);
    const scaleName = SCALE_LABELS[state.scaleKey] || state.scaleKey;
    const noteNames = state.scalePCs.map(pc => pcToName(pc)).join(' – ');
    const family = Engine.getScaleFamilyLabel(state.scaleKey);
    const system = Engine.getPositionSystemLabel(state.scaleKey);

    elInfo.innerHTML =
      '<span style="color:#e94560; font-weight:bold;">' + rootName + '</span> ' +
      '<span style="color:#4ecdc4; font-weight:bold;">' + scaleName + '</span>' +
      ' <span style="color:#888; font-size:0.8rem;">(' + family + ' · ' + system + ')</span>' +
      '<br><span style="color:#a0a0b0; font-size:0.85rem;">Notas: ' + noteNames + '</span>';
  }

  // ── Position dots ─────────────────────────────────────────

  function updatePositionDots() {
    elPositionDots.innerHTML = '';
    state.positions.forEach((pos, i) => {
      const dot = document.createElement('span');
      dot.className = 'position-dot' + (i === state.currentPosition ? ' active' : '');
      dot.title = pos.label;
      dot.addEventListener('click', () => {
        state.currentPosition = i;
        updatePositionDots();
        updatePositionLabel();
        renderFretboard();
      });
      elPositionDots.appendChild(dot);
    });
  }

  function updatePositionLabel() {
    const pos = state.positions[state.currentPosition];
    if (!pos) {
      elPositionLabel.textContent = '';
      return;
    }
    const system = Engine.getPositionSystemLabel(state.scaleKey);
    const total = state.positions.length;
    const fretText = pos.fretRange[0] === pos.fretRange[1]
      ? 'traste ' + pos.fretRange[0]
      : 'trastes ' + pos.fretRange[0] + '-' + pos.fretRange[1];
    elPositionLabel.textContent = system + ' – ' + pos.label + ' (' + fretText + ')';
  }

  // ── Navegación de posiciones ──────────────────────────────

  function navigatePosition(delta) {
    if (state.positions.length === 0) return;
    stopPlayback();
    state.currentPosition = (state.currentPosition + delta + state.positions.length) % state.positions.length;
    updatePositionDots();
    updatePositionLabel();
    renderFretboard();
  }

  // ── Renderizado del diapasón ──────────────────────────────

  function renderFretboard() {
    elFretboard.innerHTML = '';
    const pos = state.positions[state.currentPosition];
    if (!pos) return;

    const svg = FB.createFullFretboard({
      rootPc: state.rootPc,
      scalePCs: state.scalePCs,
      positionNotes: pos.noteData,
      fretRange: pos.fretRange,
      showFullScale: state.showFullScale,
      showIntervals: state.showIntervals,
    });

    elFretboard.appendChild(svg);
  }

  // ── Audio ─────────────────────────────────────────────────

  function buildPositionMidi() {
    const pos = state.positions[state.currentPosition];
    if (!pos) return [];

    // Ordenar notas: cuerda 0→5 (grave a agudo), dentro de cada cuerda por traste ascendente
    const sorted = [...pos.noteData].sort((a, b) => {
      if (a.string !== b.string) return a.string - b.string;
      return a.fret - b.fret;
    });

    const midiNotes = sorted.map(n => n.midi);

    if (state.direction === 'descending') {
      return midiNotes.reverse();
    }
    if (state.direction === 'both') {
      const desc = [...midiNotes].reverse().slice(1);
      return [...midiNotes, ...desc];
    }
    return midiNotes;
  }

  function buildFullScaleMidi() {
    // Todas las notas de la escala en el diapasón, ordenadas por altura
    const notes = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= 22; f++) {
        const pc = fretToPC(s, f);
        if (state.scalePCs.includes(pc)) {
          notes.push({ midi: STANDARD_TUNING[s] + f, string: s, fret: f });
        }
      }
    }
    // Ordenar por MIDI ascendente, eliminar duplicados
    notes.sort((a, b) => a.midi - b.midi);
    const seen = new Set();
    const unique = notes.filter(n => {
      if (seen.has(n.midi)) return false;
      seen.add(n.midi);
      return true;
    });

    const midiNotes = unique.map(n => n.midi);

    if (state.direction === 'descending') {
      return midiNotes.reverse();
    }
    if (state.direction === 'both') {
      const desc = [...midiNotes].reverse().slice(1);
      return [...midiNotes, ...desc];
    }
    return midiNotes;
  }

  function playPosition() {
    if (state.playback) { stopPlayback(); return; }

    const midiNotes = buildPositionMidi();
    if (midiNotes.length === 0) return;

    elPlayPosition.innerHTML = '&#9724; Stop';
    state.playback = window.AudioEngine.playScale(midiNotes, state.tempo, function (noteIdx) {
      FB.clearHighlights();
      if (noteIdx >= 0 && noteIdx < midiNotes.length) {
        FB.highlightNoteMidi(midiNotes[noteIdx]);
      }
      if (noteIdx === -1) {
        state.playback = null;
        elPlayPosition.innerHTML = '&#9654; Posición';
        FB.clearHighlights();
      }
    });
  }

  function playFullScale() {
    if (state.playback) { stopPlayback(); return; }

    const midiNotes = buildFullScaleMidi();
    if (midiNotes.length === 0) return;

    elPlayFull.innerHTML = '&#9724; Stop';
    state.playback = window.AudioEngine.playScale(midiNotes, state.tempo, function (noteIdx) {
      FB.clearHighlights();
      if (noteIdx >= 0 && noteIdx < midiNotes.length) {
        FB.highlightNoteMidi(midiNotes[noteIdx]);
      }
      if (noteIdx === -1) {
        state.playback = null;
        elPlayFull.innerHTML = '&#9654; Escala';
        FB.clearHighlights();
      }
    });
  }

  function stopPlayback() {
    if (state.playback) {
      state.playback.stop();
      state.playback = null;
    }
    window.AudioEngine.stopAll();
    elPlayPosition.innerHTML = '&#9654; Posición';
    elPlayFull.innerHTML = '&#9654; Escala';
    FB.clearHighlights();
  }

  // ── Keyboard ──────────────────────────────────────────────

  function onKeyDown(e) {
    // Solo si la sección de escalas está visible
    const section = document.getElementById('section-scales');
    if (!section || !section.classList.contains('active')) return;
    if (state.currentTab !== 'explore') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePosition(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigatePosition(1);
    }
  }

  // ── Tabs ──────────────────────────────────────────────────

  function switchTab(tab) {
    state.currentTab = tab;
    stopPlayback();

    elTabExplore.classList.toggle('active', tab === 'explore');
    elTabPractice.classList.toggle('active', tab === 'practice');
    elTabBank.classList.toggle('active', tab === 'bank');
    elTabBuilder.classList.toggle('active', tab === 'builder');
    elExplorePanel.style.display = tab === 'explore' ? '' : 'none';
    elPracticePanel.style.display = tab === 'practice' ? '' : 'none';
    elBankPanel.style.display = tab === 'bank' ? '' : 'none';
    elBuilderPanel.style.display = tab === 'builder' ? '' : 'none';

    if (tab === 'bank') {
      renderBankView();
    }
    if (tab === 'builder' && window.CustomScaleBuilder) {
      window.CustomScaleBuilder.refresh();
    }
    if (tab === 'practice') {
      // Stop practice playback when leaving, sync when entering
      if (window.PracticeMode) {
        window.PracticeMode.syncFromExplore(state.rootPc, state.scaleKey, state.currentPosition);
      }
    }
    if (tab !== 'practice' && window.PracticeMode) {
      window.PracticeMode.stop();
    }
  }

  // ── Banco de escalas ──────────────────────────────────────

  function updateBankCount() {
    elBankCount.textContent = Bank.count();
  }

  function saveCurrentScale() {
    const saved = Bank.save(state.rootPc, state.scaleKey);
    if (saved) {
      updateBankCount();
      elSaveBtn.textContent = '\u2713 Guardada';
      setTimeout(() => { elSaveBtn.innerHTML = '&#9733; Guardar'; }, 1500);
    } else {
      elSaveBtn.textContent = 'Ya existe';
      setTimeout(() => { elSaveBtn.innerHTML = '&#9733; Guardar'; }, 1500);
    }
  }

  function renderBankView() {
    const scales = Bank.getAll();
    updateBankCount();

    if (scales.length === 0) {
      elBankList.innerHTML = '<div class="scales-bank-empty">No hay escalas guardadas.<br>Usa el botón &#9733; Guardar en la pestaña Explorar.</div>';
      return;
    }

    elBankList.innerHTML = '';
    scales.forEach((scale, idx) => {
      const card = document.createElement('div');
      card.className = 'scale-bank-card';

      const info = document.createElement('div');

      const labelEl = document.createElement('div');
      labelEl.className = 'scale-label';
      labelEl.textContent = scale.label;
      info.appendChild(labelEl);

      const familyEl = document.createElement('div');
      familyEl.className = 'scale-family';
      familyEl.textContent = Engine.getScaleFamilyLabel(scale.scaleKey) + ' · ' + Engine.getPositionSystemLabel(scale.scaleKey);
      info.appendChild(familyEl);

      card.appendChild(info);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Eliminar';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Bank.remove(idx);
        renderBankView();
      });
      card.appendChild(removeBtn);

      // Click → cargar escala en explorador
      card.addEventListener('click', () => {
        elRootSelect.value = scale.rootPc;
        elTypeSelect.value = scale.scaleKey;
        switchTab('explore');
        onScaleChanged();
      });

      elBankList.appendChild(card);
    });
  }

  // ── Export / Import ───────────────────────────────────────

  function handleExport() {
    const json = Bank.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mis-escalas.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        Bank.importJSON(ev.target.result);
        renderBankView();
        updateBankCount();
      } catch (err) {
        console.error('Error importando escalas:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Cargar escala desde fuera (para integración futura) ───

  function loadScale(rootPc, scaleKey) {
    elRootSelect.value = rootPc;
    elTypeSelect.value = scaleKey;
    switchTab('explore');
    onScaleChanged();
  }

  // ── Init on DOM ready ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  window.ScalesUI = { init, loadScale };
})();
