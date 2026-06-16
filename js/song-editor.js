// ============================================================
// song-editor.js  –  Editor de canciones con preview en vivo
// ============================================================

(function () {
  const { parseChord, normalizeChordName } = window.ChordParser;
  const { findVoicings } = window.VoicingFinder;
  const { createDiagram } = window.FretboardSVG;
  const SB = window.Songbook;

  let currentSongId = null;
  let pinnedVoicings = []; // { chord, frets }

  function init() {
    document.getElementById('editor-content').addEventListener('input', updatePreview);
    document.getElementById('btn-editor-save').addEventListener('click', save);
    document.getElementById('btn-editor-cancel').addEventListener('click', cancel);
    initPasteImport();
  }

  /** Abre el editor con una canción existente o nueva. */
  function open(songId) {
    const section = document.getElementById('section-song-edit');
    const titleInput = document.getElementById('editor-title');
    const artistInput = document.getElementById('editor-artist');
    const contentInput = document.getElementById('editor-content');

    if (songId) {
      const song = SB.getSong(songId);
      if (song) {
        currentSongId = song.id;
        titleInput.value = song.title;
        artistInput.value = song.artist;
        contentInput.value = song.content;
        pinnedVoicings = song.pinnedVoicings ? [...song.pinnedVoicings] : [];
      }
    } else {
      currentSongId = null;
      titleInput.value = '';
      artistInput.value = '';
      contentInput.value = '';
      pinnedVoicings = [];
    }

    window.UI.showSection('song-edit');
    updatePreview();
    renderPinnedVoicings();
  }

  function updatePreview() {
    const content = document.getElementById('editor-content').value;
    const preview = document.getElementById('editor-preview');
    preview.innerHTML = renderContent(content, true);
  }

  /**
   * Renderiza contenido con acordes entre corchetes.
   * @param {string} content – texto con [Acorde] markers
   * @param {boolean} editorMode – si es true, los acordes son clickeables para pinear
   * @returns {string} HTML
   */
  function renderContent(content, editorMode) {
    if (!content) return '<span class="preview-placeholder">Preview aparecera aqui...</span>';

    const lines = content.split('\n');
    let html = '';

    for (const line of lines) {
      if (line.trim() === '') {
        html += '<br>';
        continue;
      }

      // Detectar si la línea es solo acordes (sin letra)
      const textOnly = line.replace(/\[([^\]]+)\]/g, '').trim();
      const isChordOnly = textOnly === '';
      const lineClass = isChordOnly ? 'chord-only-line' : 'lyric-line';

      let lineHtml = `<div class="${lineClass}">`;
      let lastIndex = 0;
      const regex = /\[([^\]]+)\]/g;
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Texto antes del acorde
        const textBefore = line.slice(lastIndex, match.index);
        if (textBefore && !isChordOnly) {
          lineHtml += `<span class="lyric-text">${escapeHtml(textBefore)}</span>`;
        }

        const chordRaw = match[1].trim();
        // Strip optional :N beat notation for display
        const beatMatch = chordRaw.match(/^(.+):(\d+)$/);
        // Unificar a cifrado americano (la app usa C, D, E… no Do, Re, Mi…)
        const chordName = normalizeChordName(beatMatch ? beatMatch[1].trim() : chordRaw);
        const beatsSuffix = beatMatch ? `:${beatMatch[2]}` : '';
        const clickAttr = editorMode
          ? `onclick="SongEditor.onChordClick('${escapeAttr(chordName)}')" class="chord-marker clickable"`
          : `data-chord="${escapeAttr(chordName)}" class="chord-marker"`;

        if (isChordOnly) {
          // En líneas de solo acordes, mostrar inline con espacio
          lineHtml += `<span ${clickAttr}>${escapeHtml(chordName)}</span>`;
        } else {
          lineHtml += `<span class="chord-wrap"><span ${clickAttr}>${escapeHtml(chordName)}</span></span>`;
        }
        lastIndex = match.index + match[0].length;
      }

      // Texto restante
      const remaining = line.slice(lastIndex);
      if (remaining && !isChordOnly) {
        lineHtml += `<span class="lyric-text">${escapeHtml(remaining)}</span>`;
      }

      lineHtml += '</div>';
      html += lineHtml;
    }

    return html;
  }

  /** Click en un acorde del preview → abrir selector de voicing. */
  function onChordClick(chordName) {
    const modal = document.getElementById('voicing-picker-modal');
    const grid = document.getElementById('voicing-picker-grid');
    const title = document.getElementById('voicing-picker-title');

    title.textContent = 'Elegir voicing para: ' + chordName;
    grid.innerHTML = '';

    // Voicings del banco personal primero
    const saved = window.ChordBank.getByName(chordName);
    saved.forEach(sv => {
      const voicing = bankEntryToVoicing(sv);
      const card = createPickerCard(voicing, chordName, sv.frets, true);
      grid.appendChild(card);
    });

    // Voicings generados
    const chord = parseChord(chordName);
    if (chord) {
      const voicings = findVoicings(chord);
      voicings.slice(0, 20).forEach(v => {
        const card = createPickerCard(v, chordName, v.frets, false);
        grid.appendChild(card);
      });
    }

    if (grid.children.length === 0) {
      grid.innerHTML = '<p class="no-results">No se encontraron voicings.</p>';
    }

    modal.style.display = 'flex';

    // Cerrar modal
    document.getElementById('voicing-picker-close').onclick = () => {
      modal.style.display = 'none';
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  function createPickerCard(voicing, chordName, frets, isPersonal) {
    const card = document.createElement('div');
    card.className = 'voicing-card picker-card';
    if (isPersonal) card.classList.add('personal');

    // Check if already pinned
    const isPinned = pinnedVoicings.some(p => p.chord === chordName && p.frets.join(',') === frets.join(','));
    if (isPinned) card.classList.add('pinned');

    const svgOpts = isPersonal ? { badge: 'Personal' } : {};
    card.appendChild(createDiagram(voicing, chordName, svgOpts));

    card.addEventListener('click', () => {
      // Toggle pin
      const idx = pinnedVoicings.findIndex(p => p.chord === chordName && p.frets.join(',') === frets.join(','));
      if (idx >= 0) {
        pinnedVoicings.splice(idx, 1);
        card.classList.remove('pinned');
      } else {
        pinnedVoicings.push({ chord: chordName, frets: [...frets] });
        card.classList.add('pinned');
        // Flash de confirmación
        card.classList.remove('pin-flash');
        void card.offsetWidth; // force reflow
        card.classList.add('pin-flash');
      }
      renderPinnedVoicings();
    });

    return card;
  }

  function renderPinnedVoicings() {
    const container = document.getElementById('editor-pinned');
    container.innerHTML = '';

    if (pinnedVoicings.length === 0) {
      container.innerHTML = '<span class="pinned-placeholder">Haz click en un acorde del preview para pinear voicings de referencia</span>';
      return;
    }

    pinnedVoicings.forEach((pv, idx) => {
      const voicing = bankEntryToVoicing({ frets: pv.frets });
      const card = document.createElement('div');
      card.className = 'voicing-card pinned-card';
      card.dataset.pinIdx = idx;
      card.draggable = true;
      card.appendChild(createDiagram(voicing, pv.chord));

      // Botón quitar
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-card-action btn-delete';
      removeBtn.innerHTML = '&#10005;';
      removeBtn.title = 'Quitar';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedVoicings.splice(idx, 1);
        renderPinnedVoicings();
      });
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.appendChild(removeBtn);
      card.appendChild(actions);

      container.appendChild(card);
    });

    // Drag & drop (desktop + mobile touch)
    initDragAndDrop(container);
  }

  // ── Drag & Drop reordering ──────────────────────────────────

  let dragSrcIdx = null;

  function initDragAndDrop(container) {
    const cards = container.querySelectorAll('.pinned-card');

    cards.forEach(card => {
      // Desktop drag events
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragover', onDragOver);
      card.addEventListener('drop', onDrop);
      card.addEventListener('dragend', onDragEnd);

      // Mobile touch events
      card.addEventListener('touchstart', onTouchStart, { passive: false });
      card.addEventListener('touchmove', onTouchMove, { passive: false });
      card.addEventListener('touchend', onTouchEnd);
    });
  }

  function onDragStart(e) {
    dragSrcIdx = Number(this.dataset.pinIdx);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }

  function onDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const targetIdx = Number(this.dataset.pinIdx);
    if (dragSrcIdx !== null && dragSrcIdx !== targetIdx) {
      const item = pinnedVoicings.splice(dragSrcIdx, 1)[0];
      pinnedVoicings.splice(targetIdx, 0, item);
      renderPinnedVoicings();
    }
  }

  function onDragEnd() {
    document.querySelectorAll('.pinned-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over');
    });
    dragSrcIdx = null;
  }

  // Mobile touch-based drag
  let touchCard = null;
  let touchClone = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  let longPressTimer = null;

  function onTouchStart(e) {
    const card = e.currentTarget;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;

    // Long press to initiate drag
    longPressTimer = setTimeout(() => {
      touchCard = card;
      dragSrcIdx = Number(card.dataset.pinIdx);
      card.classList.add('dragging');

      // Crear clon visual
      touchClone = card.cloneNode(true);
      touchClone.classList.add('drag-clone');
      touchClone.style.cssText = 'position:fixed;z-index:10000;opacity:0.8;pointer-events:none;width:' + card.offsetWidth + 'px;';
      touchClone.style.left = (touchStartX - card.offsetWidth / 2) + 'px';
      touchClone.style.top = (touchStartY - card.offsetHeight / 2) + 'px';
      document.body.appendChild(touchClone);

      touchMoved = true;
    }, 300);
  }

  function onTouchMove(e) {
    if (!touchCard) {
      // Si se mueve antes del long press, cancelar
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(longPressTimer);
      }
      return;
    }

    e.preventDefault();
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    if (touchClone) {
      touchClone.style.left = (x - touchClone.offsetWidth / 2) + 'px';
      touchClone.style.top = (y - touchClone.offsetHeight / 2) + 'px';
    }

    // Resaltar card debajo del dedo
    document.querySelectorAll('.pinned-card').forEach(c => c.classList.remove('drag-over'));
    const elemBelow = document.elementFromPoint(x, y);
    if (elemBelow) {
      const targetCard = elemBelow.closest('.pinned-card');
      if (targetCard && targetCard !== touchCard) {
        targetCard.classList.add('drag-over');
      }
    }
  }

  function onTouchEnd(e) {
    clearTimeout(longPressTimer);

    if (!touchCard) return;

    // Encontrar card destino
    const lastTouch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(lastTouch.clientX, lastTouch.clientY);
    const targetCard = elemBelow ? elemBelow.closest('.pinned-card') : null;

    if (targetCard && targetCard !== touchCard) {
      const targetIdx = Number(targetCard.dataset.pinIdx);
      if (dragSrcIdx !== null && dragSrcIdx !== targetIdx) {
        const item = pinnedVoicings.splice(dragSrcIdx, 1)[0];
        pinnedVoicings.splice(targetIdx, 0, item);
      }
    }

    // Cleanup
    if (touchClone && touchClone.parentNode) {
      touchClone.parentNode.removeChild(touchClone);
    }
    document.querySelectorAll('.pinned-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over');
    });
    touchCard = null;
    touchClone = null;
    dragSrcIdx = null;

    renderPinnedVoicings();
  }

  // ── Importar texto pegado (formato LaCuerda.net etc.) ─────

  function initPasteImport() {
    const modal = document.getElementById('paste-import-modal');
    const input = document.getElementById('paste-import-input');
    const btnOpen = document.getElementById('btn-paste-import');
    const btnConvert = document.getElementById('paste-import-convert');
    const btnCancel = document.getElementById('paste-import-cancel');
    const btnClose = document.getElementById('paste-import-close');

    btnOpen.addEventListener('click', () => {
      input.value = '';
      modal.style.display = 'flex';
      input.focus();
    });

    const close = () => { modal.style.display = 'none'; };
    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    btnConvert.addEventListener('click', () => {
      const raw = input.value;
      if (!raw.trim()) return;
      const converted = convertPastedText(raw);
      const contentArea = document.getElementById('editor-content');
      // Append if there's existing content, otherwise replace
      if (contentArea.value.trim()) {
        contentArea.value += '\n\n' + converted;
      } else {
        contentArea.value = converted;
      }
      updatePreview();
      close();
    });
  }

  /**
   * Convierte cifrado clásico latino (DO, RE, MI...) a americano (C, D, E...).
   * Reemplaza solo las raíces de acordes, preservando calidad y extensiones.
   */
  const LATIN_TO_AMERICAN = {
    'DOb': 'Cb', 'DO#': 'C#', 'DO': 'C',
    'REb': 'Db', 'RE#': 'D#', 'RE': 'D',
    'MIb': 'Eb', 'MI#': 'E#', 'MI': 'E',
    'FAb': 'Fb', 'FA#': 'F#', 'FA': 'F',
    'SOLb': 'Gb', 'SOL#': 'G#', 'SOL': 'G',
    'LAb': 'Ab', 'LA#': 'A#', 'LA': 'A',
    'SIb': 'Bb', 'SI#': 'B#', 'SI': 'B',
  };

  function latinToAmerican(texto) {
    // Case-sensitive: solo matchea mayúsculas (como aparecen en líneas de acordes)
    // Separa nota de accidental para lookup correcto
    const rootPattern = /\b(SOL|DO|RE|MI|FA|LA|SI)([#b]?)/g;
    return texto.replace(rootPattern, (match, note, acc) => {
      return LATIN_TO_AMERICAN[note + acc] || match;
    });
  }

  /** Detecta si el texto usa cifrado clásico latino. */
  function usesLatinNotation(texto) {
    const latinRoots = /\b(SOL|DO|RE|MI|FA|LA|SI)[#b]?/g;
    const matches = texto.match(latinRoots);
    return matches && matches.length >= 2;
  }

  /**
   * Convierte texto con acordes sobre la letra (formato LaCuerda.net)
   * al formato [Acorde]letra usado por el cancionero.
   */
  function convertPastedText(texto) {
    // Auto-detectar y convertir cifrado latino a americano
    if (usesLatinNotation(texto)) {
      texto = latinToAmerican(texto);
    }

    const lineas = texto.split('\n');
    const resultado = [];
    let i = 0;

    while (i < lineas.length) {
      const linea = lineas[i];
      const trimmed = linea.trim();

      // Línea vacía → preservar separación
      if (trimmed === '') {
        resultado.push('');
        i++;
        continue;
      }

      // ¿Es una línea de acordes?
      if (isChordLine(linea)) {
        // Mirar la siguiente línea
        const next = i + 1 < lineas.length ? lineas[i + 1] : '';
        const nextTrimmed = next.trim();

        if (nextTrimmed === '' || isChordLine(next) || i + 1 >= lineas.length) {
          // Línea de solo acordes (intro, puente, etc.)
          // Preservar etiquetas como "Intro:", "Puente:" y repeticiones "x4"
          const tokens = linea.split(/\s+/);
          const parts = tokens.map(t => {
            if (isChordToken(t)) return '[' + t + ']';
            return t; // labels like "Intro:", "x4"
          });
          resultado.push(parts.join(' '));
          i++;
        } else {
          // Alinear acordes con la línea de letra siguiente
          resultado.push(mergeChordAndLyric(linea, next));
          i += 2;
        }
      } else {
        // Línea de texto sin acordes arriba (etiquetas, instrucciones)
        resultado.push(trimmed);
        i++;
      }
    }

    return resultado.join('\n');
  }

  /**
   * Verifica si un token individual es un acorde válido.
   * Intenta "consumir" el string pieza por pieza.
   */
  function isChordToken(t) {
    const root = t.match(/^[A-G][#b]?/);
    if (!root) return false;
    let rest = t.slice(root[0].length);
    if (rest === '') return true; // Solo raíz: "A", "Bb", etc.
    // Calidad (maj antes de m para evitar match parcial)
    rest = rest.replace(/^(?:maj|min|dim|aug|add|sus|m|M)/, '');
    // Número de extensión
    rest = rest.replace(/^[0-9]+/, '');
    // Sufijos adicionales como sus4 después del número (ej: D7sus4)
    rest = rest.replace(/sus[0-9]*/g, '');
    // Extensiones entre paréntesis PRIMERO (ej: (#9), (b9)) — antes de sueltas
    rest = rest.replace(/\([#b]?[0-9]+\)/g, '');
    // Extensiones sueltas con # o b (ej: b5, #11)
    rest = rest.replace(/[#b][0-9]+/g, '');
    // Bajo de slash chord (ej: /Bb)
    rest = rest.replace(/\/[A-G][#b]?$/, '');
    return rest === '';
  }

  /** Detecta si una línea es predominantemente acordes. */
  function isChordLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const tokens = trimmed.split(/\s+/);
    let chordCount = 0;
    for (const t of tokens) {
      if (isChordToken(t)) chordCount++;
      else if (!/^[A-Za-záéíóúñü]+:$/i.test(t) && !/^x\d+$/i.test(t)) return false;
    }
    return chordCount > 0;
  }

  /** Encuentra acordes y sus posiciones en una línea. */
  function findChordsInLine(line) {
    const results = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (isChordToken(m[0])) {
        results.push({ name: m[0], pos: m.index });
      }
    }
    return results;
  }

  /** Fusiona una línea de acordes con la línea de letra debajo, por posición columnar. */
  function mergeChordAndLyric(chordLine, lyricLine) {
    const chords = findChordsInLine(chordLine);
    if (chords.length === 0) return lyricLine.trimEnd();

    let result = lyricLine.trimEnd();
    // Extender la letra si los acordes caen más allá
    const maxPos = chords[chords.length - 1].pos;
    if (maxPos > result.length) {
      result = result + ' '.repeat(maxPos - result.length + 1);
    }

    // Insertar de atrás para adelante para preservar posiciones
    for (let j = chords.length - 1; j >= 0; j--) {
      const c = chords[j];
      const insertPos = Math.min(c.pos, result.length);
      result = result.slice(0, insertPos) + '[' + c.name + ']' + result.slice(insertPos);
    }

    return result.trimEnd();
  }

  /**
   * Convierte los acordes [Acorde] del contenido a cifrado americano, dejando
   * intacta la letra (que puede contener palabras como "mi", "la", "sol").
   * Preserva la notación de beats ":N".
   */
  function normalizeContentChords(content) {
    return content.replace(/\[([^\]]+)\]/g, function (full, inner) {
      const raw = inner.trim();
      const beatMatch = raw.match(/^(.+):(\d+)$/);
      const chordName = beatMatch ? beatMatch[1].trim() : raw;
      const beats = beatMatch ? ':' + beatMatch[2] : '';
      return '[' + normalizeChordName(chordName) + beats + ']';
    });
  }

  function save() {
    const title = document.getElementById('editor-title').value.trim() || 'Sin titulo';
    const artist = document.getElementById('editor-artist').value.trim();
    // Guardar en cifrado americano aunque se haya escrito en latino (Do, Re…)
    const content = normalizeContentChords(document.getElementById('editor-content').value);

    const song = {
      id: currentSongId,
      title,
      artist,
      content,
      pinnedVoicings: [...pinnedVoicings],
    };

    const saved = SB.saveSong(song);
    currentSongId = saved.id;

    // Volver a la lista
    window.SongListView.render();
    window.UI.showSection('songs');
  }

  function cancel() {
    window.UI.showSection('songs');
  }

  function bankEntryToVoicing(entry) {
    const frets = entry.frets;
    const noteNames = frets.map((f, i) => {
      if (f === -1) return 'X';
      return window.MusicTheory.pcToName(window.MusicTheory.fretToPC(i, f));
    });
    const barre = window.VoicingFinder.detectBarre(frets);
    const fingers = window.VoicingFinder.suggestFingers(frets, barre);
    return { frets, noteNames, barre, fingers };
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return s.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // Init cuando DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SongEditor = { open, onChordClick, renderContent };
})();
