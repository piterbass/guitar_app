// ============================================================
// custom-scale-builder.js  –  Constructor de posiciones de escala
//   Permite crear posiciones personalizadas sobre el diapasón
// ============================================================

(function () {
  var Engine = window.ScalePositionEngine;
  var FB = window.FullFretboardSVG;
  var MT = window.MusicTheory;
  var CustomScales = window.CustomScales;

  // ── DOM refs ──
  var elPanel;
  var elRoot, elType;
  var elPosition, elPositionEnd, elLoadBtn;
  var elFretboard, elNoteCount;
  var elName, elPosLabel, elSave, elClear;
  var elSavedList;

  // ── State ──
  var state = {
    rootPc: 0,
    scaleKey: 'major',
    scalePCs: [],
    positions: [],
    selectedNotes: [],  // [{string, fret, midi, pc}]
  };

  function init() {
    elPanel      = document.getElementById('scales-builder-panel');
    if (!elPanel) return;

    elRoot       = document.getElementById('builder-root');
    elType       = document.getElementById('builder-type');
    elPosition   = document.getElementById('builder-position');
    elPositionEnd = document.getElementById('builder-position-end');
    elLoadBtn    = document.getElementById('builder-load-pos');
    elFretboard  = document.getElementById('builder-fretboard');
    elNoteCount  = document.getElementById('builder-note-count');
    elName       = document.getElementById('builder-name');
    elPosLabel   = document.getElementById('builder-pos-label');
    elSave       = document.getElementById('builder-save');
    elClear      = document.getElementById('builder-clear');
    elSavedList  = document.getElementById('builder-saved-list');

    populateSelectors();

    elRoot.addEventListener('change', onScaleChanged);
    elType.addEventListener('change', onScaleChanged);
    elLoadBtn.addEventListener('click', onLoadPosition);
    elSave.addEventListener('click', onSave);
    elClear.addEventListener('click', function () {
      state.selectedNotes = [];
      renderFretboard();
      updateNoteCount();
    });

    onScaleChanged();
    renderSavedList();
  }

  function populateSelectors() {
    // Root
    elRoot.innerHTML = '';
    MT.NOTE_NAMES.forEach(function (name, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = name;
      elRoot.appendChild(opt);
    });

    // Scale type
    elType.innerHTML = '';
    var labels = window.ScaleDetector.SCALE_LABELS;
    Object.keys(MT.SCALE_FORMULAS).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = labels[key] || key;
      elType.appendChild(opt);
    });
  }

  function onScaleChanged() {
    state.rootPc = parseInt(elRoot.value);
    state.scaleKey = elType.value;
    state.scalePCs = MT.getScalePCs(state.rootPc, state.scaleKey);
    state.positions = Engine.generatePositions(state.rootPc, state.scaleKey);
    state.selectedNotes = [];

    populatePositionSelectors();
    renderFretboard();
    updateNoteCount();
  }

  function populatePositionSelectors() {
    elPosition.innerHTML = '';
    elPositionEnd.innerHTML = '<option value="">— No extender —</option>';

    state.positions.forEach(function (pos, i) {
      var fretText = pos.fretRange[0] === pos.fretRange[1]
        ? 'traste ' + pos.fretRange[0]
        : 'trastes ' + pos.fretRange[0] + '-' + pos.fretRange[1];
      var label = pos.label + ' (' + fretText + ')';

      var opt1 = document.createElement('option');
      opt1.value = i;
      opt1.textContent = label;
      elPosition.appendChild(opt1);

      var opt2 = document.createElement('option');
      opt2.value = i;
      opt2.textContent = label;
      elPositionEnd.appendChild(opt2);
    });
  }

  function onLoadPosition() {
    var startIdx = parseInt(elPosition.value);
    var endIdx = elPositionEnd.value !== '' ? parseInt(elPositionEnd.value) : null;

    // Collect notes from selected position(s)
    var notes = [];
    var noteKeys = new Set();

    if (endIdx !== null && endIdx !== startIdx) {
      // Range of positions
      var lo = Math.min(startIdx, endIdx);
      var hi = Math.max(startIdx, endIdx);
      for (var i = lo; i <= hi; i++) {
        addPositionNotes(state.positions[i], notes, noteKeys);
      }
    } else {
      addPositionNotes(state.positions[startIdx], notes, noteKeys);
    }

    state.selectedNotes = notes;
    renderFretboard();
    updateNoteCount();
  }

  function addPositionNotes(pos, notes, noteKeys) {
    if (!pos || !pos.noteData) return;
    pos.noteData.forEach(function (n) {
      var key = n.string + ',' + n.fret;
      if (!noteKeys.has(key)) {
        noteKeys.add(key);
        notes.push({
          string: n.string,
          fret: n.fret,
          midi: n.midi,
          pc: n.pc,
        });
      }
    });
  }

  function toggleNote(midi, string, fret) {
    var key = string + ',' + fret;
    var existing = state.selectedNotes.findIndex(function (n) {
      return n.string === string && n.fret === fret;
    });

    if (existing >= 0) {
      // Remove
      state.selectedNotes.splice(existing, 1);
    } else {
      // Add - only allow notes from the scale
      var pc = MT.fretToPC(string, fret);
      if (state.scalePCs.indexOf(pc) === -1) return; // not in scale, ignore
      state.selectedNotes.push({
        string: string,
        fret: fret,
        midi: midi,
        pc: pc,
      });
    }

    renderFretboard();
    updateNoteCount();
  }

  function renderFretboard() {
    elFretboard.innerHTML = '';

    // Build positionNotes from selected notes (with interval info)
    var posNotes = state.selectedNotes.map(function (n) {
      var degree = state.scalePCs.indexOf(n.pc);
      var formula = MT.SCALE_FORMULAS[state.scaleKey];
      return {
        string: n.string,
        fret: n.fret,
        midi: n.midi,
        pc: n.pc,
        interval: formula ? formula[degree] : '',
        isRoot: n.pc === state.rootPc,
        isTriad: degree !== -1 && degree % 2 === 0,
      };
    });

    // Calculate fret range from selected notes
    var fretRange = null;
    if (posNotes.length > 0) {
      var frets = posNotes.map(function (n) { return n.fret; });
      fretRange = [Math.min.apply(null, frets), Math.max.apply(null, frets)];
    }

    var svg = FB.createFullFretboard({
      rootPc: state.rootPc,
      scalePCs: state.scalePCs,
      positionNotes: posNotes.length > 0 ? posNotes : null,
      fretRange: fretRange,
      showFullScale: true,
      showIntervals: false,
      onNoteClick: function (midi, string, fret) {
        toggleNote(midi, string, fret);
      },
    });

    elFretboard.appendChild(svg);
  }

  function updateNoteCount() {
    var n = state.selectedNotes.length;
    elNoteCount.textContent = n === 0
      ? 'Clickeá notas en el diapasón para armar tu posición'
      : n + (n === 1 ? ' nota seleccionada' : ' notas seleccionadas');
  }

  function onSave() {
    if (state.selectedNotes.length === 0) {
      elNoteCount.textContent = 'Seleccioná al menos una nota';
      elNoteCount.style.color = '#e94560';
      setTimeout(function () { elNoteCount.style.color = '#a0a0b0'; }, 2000);
      return;
    }

    var name = elName.value.trim() || MT.pcToName(state.rootPc) + ' ' +
      (window.ScaleDetector.SCALE_LABELS[state.scaleKey] || state.scaleKey);
    var posLabel = elPosLabel.value.trim() || 'Custom';

    CustomScales.save(name, posLabel, state.rootPc, state.scaleKey, state.selectedNotes);

    elName.value = '';
    elPosLabel.value = '';
    state.selectedNotes = [];
    renderFretboard();
    updateNoteCount();
    renderSavedList();

    elNoteCount.textContent = 'Posición guardada correctamente';
    elNoteCount.style.color = '#4ecdc4';
    setTimeout(function () { elNoteCount.style.color = '#a0a0b0'; updateNoteCount(); }, 2000);
  }

  function renderSavedList() {
    if (!elSavedList) return;
    elSavedList.innerHTML = '';
    var all = CustomScales.getAll();

    if (all.length === 0) {
      elSavedList.innerHTML = '<p style="color:#666; font-size:0.85rem;">No hay posiciones guardadas</p>';
      return;
    }

    all.forEach(function (item) {
      var rootName = MT.pcToName(item.rootPc);
      var fretText = item.fretRange[0] + '-' + item.fretRange[1];

      var row = document.createElement('div');
      row.className = 'builder-saved-item';

      row.innerHTML =
        '<span class="bs-name">' + item.name + '</span>' +
        '<span class="bs-detail">' + rootName + ' | ' + item.positionLabel + ' | trastes ' + fretText + ' | ' + item.noteData.length + ' notas</span>' +
        '<button class="bs-btn bs-btn-load" title="Cargar para editar">Cargar</button>' +
        '<button class="bs-btn bs-btn-del" title="Eliminar">&#10005;</button>';

      // Load button
      row.querySelector('.bs-btn-load').addEventListener('click', function () {
        elRoot.value = item.rootPc;
        elType.value = item.scaleKey || 'major';
        onScaleChanged();

        state.selectedNotes = item.noteData.map(function (n) {
          return { string: n.string, fret: n.fret, midi: n.midi, pc: n.pc };
        });
        elName.value = item.name;
        elPosLabel.value = item.positionLabel;
        renderFretboard();
        updateNoteCount();
      });

      // Delete button
      row.querySelector('.bs-btn-del').addEventListener('click', function () {
        CustomScales.remove(item.id);
        renderSavedList();
      });

      elSavedList.appendChild(row);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.CustomScaleBuilder = { init: init, refresh: renderSavedList };
})();
