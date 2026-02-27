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
  let elInput, elBtnSearch, elGrid, elInfo, elSortSelect, elPositionFilter;
  let elRoot, elQuality, elBass;
  let elExtensions;
  let elTabGen, elTabBank, elManualSection, elBankSearch, elBankSearchInput;
  let elScaleSection, elScaleSelect, elScaleNotes;
  let syncLock = false;
  let currentTab = 'generated';

  // Estado de escala actual
  let currentChordPCs = null;
  let currentScales = [];

  // ── Navegación principal ────────────────────────────────────

  function showSection(sectionName) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + sectionName);
    if (target) target.classList.add('active');

    // Actualizar nav activo
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (sectionName === 'chords') {
      document.getElementById('nav-chords').classList.add('active');
    } else if (sectionName === 'songs' || sectionName === 'song-edit' || sectionName === 'song-view') {
      document.getElementById('nav-songs').classList.add('active');
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
    elRoot = document.getElementById('sel-root');
    elQuality = document.getElementById('sel-quality');
    elBass = document.getElementById('sel-bass');
    elExtensions = document.querySelectorAll('.ext-checkbox');
    elTabGen = document.getElementById('tab-generated');
    elTabBank = document.getElementById('tab-bank');
    elManualSection = document.getElementById('manual-section');
    elBankSearch = document.getElementById('bank-search');
    elBankSearchInput = document.getElementById('bank-search-input');
    elScaleSection = document.getElementById('scale-section');
    elScaleSelect = document.getElementById('scale-select');
    elScaleNotes = document.getElementById('scale-notes');

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
    elScaleSelect.addEventListener('change', applyScaleOverlay);

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
    document.getElementById('nav-songs').addEventListener('click', () => {
      window.SongListView.render();
      showSection('songs');
    });

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
    elManualSection.style.display = tab === 'bank' ? 'flex' : 'none';
    elBankSearch.style.display = tab === 'bank' ? 'block' : 'none';
    elScaleSection.style.display = tab === 'generated' && currentScales.length > 0 ? 'block' : 'none';
    if (tab === 'generated') doSearch();
    else renderBankView();
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
    currentChordPCs = chord.pitchClasses;
    currentScales = window.ScaleDetector.findCompatibleScales(chord.pitchClasses, chord.rootPc);
    populateScaleSelect();
    elScaleSection.style.display = currentScales.length > 0 ? 'block' : 'none';

    // Re-aplicar overlay si había escala seleccionada
    applyScaleOverlay();
  }

  // ── Escalas ────────────────────────────────────────────────

  function populateScaleSelect() {
    const prevValue = elScaleSelect.value;
    elScaleSelect.innerHTML = '<option value="">Sin escala</option>';
    currentScales.forEach((scale, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = scale.label;
      elScaleSelect.appendChild(opt);
    });
    // Restaurar selección previa si la escala sigue disponible
    if (prevValue && currentScales[prevValue]) {
      elScaleSelect.value = prevValue;
    }
  }

  function applyScaleOverlay() {
    const idx = elScaleSelect.value;
    const svgs = elGrid.querySelectorAll('svg.chord-diagram');

    if (!idx || !currentScales[idx]) {
      // Limpiar overlays
      svgs.forEach(svg => {
        svg.querySelectorAll('.scale-overlay').forEach(el => el.remove());
      });
      elScaleNotes.innerHTML = '';
      return;
    }

    const scale = currentScales[idx];
    const scalePCSet = new Set(scale.scalePCs);
    const chordPCSet = new Set(currentChordPCs);

    // Mostrar notas de la escala
    const noteNames = scale.scalePCs.map(pc => {
      const name = window.MusicTheory.pcToName(pc);
      const isChordTone = chordPCSet.has(pc);
      return `<span class="note${isChordTone ? ' chord-tone' : ''}">${name}</span>`;
    });
    elScaleNotes.innerHTML = 'Notas: ' + noteNames.join(' ');

    // Aplicar overlay a cada diagrama
    const cards = elGrid.querySelectorAll('.voicing-card');
    cards.forEach(card => {
      const svg = card.querySelector('svg.chord-diagram');
      if (!svg) return;
      // Recuperar el voicing de los datos del card
      const voicing = card._voicing;
      if (!voicing) return;
      addScaleOverlay(svg, voicing, scale.scalePCs, currentChordPCs);
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

  // ── Crear card de voicing ───────────────────────────────────

  function createVoicingCard(voicing, chordName, opts) {
    const card = document.createElement('div');
    card.className = 'voicing-card';
    card._voicing = voicing; // Guardar referencia para scale overlay
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

    card.appendChild(actions);
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
  window.UI = { showSection };
  window.SongListView = SongListView;
})();
