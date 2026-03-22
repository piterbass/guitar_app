// ============================================================
// song-view.js  –  Vista lectura de canción + voicings pineados
// ============================================================

(function () {
  const { createDiagram } = window.FretboardSVG;
  const { parseChord } = window.ChordParser;
  const MT = window.MusicTheory;
  const SB = window.Songbook;

  let currentSongId = null;
  let currentSong = null;
  let fontSize = 16;

  // ── Auto-scroll state ──────────────────────────────────────
  let scrollInterval = null;
  let scrollSpeed = 0;         // 0 = paused
  const SCROLL_SPEEDS = [0, 1, 2, 3, 5, 8]; // px per tick
  const SCROLL_LABELS = ['Off', '1', '2', '3', '4', '5'];
  const SCROLL_TICK = 50;      // ms between ticks

  // ── Transpose state ────────────────────────────────────────
  let transposeSemitones = 0;

  // Mapa de notas preferidas para transposición (usa bemoles para tonalidades con bemoles)
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  function open(songId) {
    const song = SB.getSong(songId);
    if (!song) return;

    currentSongId = songId;
    currentSong = song;
    fontSize = 16;
    transposeSemitones = 0;
    stopAutoScroll();

    document.getElementById('view-title').textContent = song.title;
    document.getElementById('view-artist').textContent = song.artist || '';

    // Reset transpose display
    updateTransposeDisplay();

    renderLyrics(song);
    renderPinnedBar(song);

    window.UI.showSection('song-view');
  }

  function renderLyrics(song) {
    const container = document.getElementById('view-lyrics');
    container.style.fontSize = fontSize + 'px';
    const content = transposeSemitones === 0
      ? song.content
      : transposeContent(song.content, transposeSemitones);
    container.innerHTML = window.SongEditor.renderContent(content, false);

    // Hacer clickeables los chord-markers
    container.querySelectorAll('.chord-marker').forEach(el => {
      el.addEventListener('click', () => {
        highlightPinned(el.dataset.chord);
      });
    });
  }

  function renderPinnedBar(song) {
    const bar = document.getElementById('view-pinned-bar');
    bar.innerHTML = '';

    if (!song.pinnedVoicings || song.pinnedVoicings.length === 0) {
      bar.innerHTML = '<span class="pinned-placeholder">No hay voicings pineados. Edita la cancion para agregar.</span>';
      return;
    }

    song.pinnedVoicings.forEach(pv => {
      const voicing = toVoicing(pv.frets);
      const card = document.createElement('div');
      card.className = 'voicing-card pinned-bar-card';
      card.dataset.chord = pv.chord;
      card._voicing = voicing;
      card._chordName = pv.chord;
      card.appendChild(createDiagram(voicing, pv.chord));
      card.addEventListener('click', function () {
        openPinnedZoom(card);
      });
      bar.appendChild(card);
    });
  }

  function openPinnedZoom(clickedCard) {
    const bar = document.getElementById('view-pinned-bar');
    const allCards = Array.from(bar.querySelectorAll('.pinned-bar-card'));
    const index = allCards.indexOf(clickedCard);
    const chordName = clickedCard._chordName;

    const chord = parseChord(chordName);
    const scales = chord
      ? window.ScaleDetector.scoredCompatibleScales(chord.pitchClasses, chord.rootPc, chord.intervals)
      : [];

    const freshSong = SB.getSong(currentSongId);
    const fixedScales = {};
    if (freshSong && freshSong.pinnedVoicings) {
      freshSong.pinnedVoicings.forEach(function (pv) {
        if (pv.fixedScale) fixedScales[pv.chord] = pv.fixedScale;
      });
    }

    window.UI.openZoomGeneric(allCards, index >= 0 ? index : 0, chordName, chord, scales, 'songs', fixedScales, currentSongId);
  }

  function highlightPinned(chordName) {
    const bar = document.getElementById('view-pinned-bar');
    bar.querySelectorAll('.pinned-bar-card').forEach(c => c.classList.remove('highlight'));
    bar.querySelectorAll(`.pinned-bar-card[data-chord="${chordName}"]`).forEach(c => {
      c.classList.add('highlight');
      c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    setTimeout(() => {
      bar.querySelectorAll('.highlight').forEach(c => c.classList.remove('highlight'));
    }, 2000);
  }

  function changeFontSize(delta) {
    fontSize = Math.max(10, Math.min(32, fontSize + delta));
    const container = document.getElementById('view-lyrics');
    container.style.fontSize = fontSize + 'px';
    const chordHeight = Math.ceil(fontSize * 0.85) + 4;
    container.querySelectorAll('.lyric-line').forEach(el => {
      el.style.paddingTop = chordHeight + 'px';
    });
  }

  // ── Auto-scroll ────────────────────────────────────────────

  function setAutoScroll(speedIdx) {
    stopAutoScroll();
    scrollSpeed = speedIdx;
    updateScrollDisplay();

    if (speedIdx === 0) return;

    const px = SCROLL_SPEEDS[speedIdx];
    const lyrics = document.getElementById('view-lyrics');
    scrollInterval = setInterval(() => {
      lyrics.scrollTop += px;
    }, SCROLL_TICK);
  }

  function stopAutoScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    scrollSpeed = 0;
    updateScrollDisplay();
  }

  function cycleScrollSpeed(direction) {
    let next = scrollSpeed + direction;
    if (next < 0) next = 0;
    if (next >= SCROLL_SPEEDS.length) next = SCROLL_SPEEDS.length - 1;
    setAutoScroll(next);
  }

  function updateScrollDisplay() {
    const label = document.getElementById('scroll-speed-label');
    if (label) {
      label.textContent = SCROLL_LABELS[scrollSpeed];
    }
    const btnPlay = document.getElementById('btn-scroll-play');
    if (btnPlay) {
      btnPlay.textContent = scrollSpeed > 0 ? '⏸' : '▶';
      btnPlay.title = scrollSpeed > 0 ? 'Pausar scroll' : 'Iniciar scroll';
    }
  }

  function toggleAutoScroll() {
    if (scrollSpeed > 0) {
      stopAutoScroll();
    } else {
      setAutoScroll(2); // velocidad default media
    }
  }

  // ── Transpose ──────────────────────────────────────────────

  function transpose(delta) {
    transposeSemitones = ((transposeSemitones + delta) % 12 + 12) % 12;
    updateTransposeDisplay();
    renderLyrics(currentSong);
  }

  function updateTransposeDisplay() {
    const label = document.getElementById('transpose-label');
    if (!label) return;
    if (transposeSemitones === 0) {
      label.textContent = 'Original';
    } else {
      const sign = transposeSemitones <= 6 ? '+' : '-';
      const val = transposeSemitones <= 6 ? transposeSemitones : 12 - transposeSemitones;
      label.textContent = sign + val;
    }
  }

  /**
   * Transpone todos los acordes en el contenido por N semitonos.
   * Preserva la calidad del acorde y la notación (sostenidos/bemoles).
   */
  function transposeContent(content, semitones) {
    // Reemplazar cada [Acorde] con el acorde transpuesto
    return content.replace(/\[([^\]]+)\]/g, (match, chordStr) => {
      return '[' + transposeChordName(chordStr.trim(), semitones) + ']';
    });
  }

  function transposeChordName(name, semitones) {
    // Extraer raíz
    const rootMatch = name.match(/^([A-G])([#b]?)(.*)/);
    if (!rootMatch) return name;

    const rootName = rootMatch[1] + rootMatch[2];
    const suffix = rootMatch[3];

    // Determinar si el acorde original usa bemoles
    const useFlats = rootMatch[2] === 'b' || hasFlatsInSuffix(suffix);

    const pc = MT.NOTE_TO_PC[rootName];
    if (pc === undefined) return name;

    const newPc = ((pc + semitones) % 12 + 12) % 12;
    const newRoot = useFlats ? FLAT_NAMES[newPc] : SHARP_NAMES[newPc];

    // Si hay slash bass, transponerlo también
    const slashMatch = suffix.match(/^(.*)\/([A-G][#b]?)$/);
    if (slashMatch) {
      const innerSuffix = slashMatch[1];
      const bassName = slashMatch[2];
      const bassPc = MT.NOTE_TO_PC[bassName];
      if (bassPc !== undefined) {
        const newBassPc = ((bassPc + semitones) % 12 + 12) % 12;
        const bassFlats = bassName.includes('b');
        const newBass = bassFlats ? FLAT_NAMES[newBassPc] : SHARP_NAMES[newBassPc];
        return newRoot + innerSuffix + '/' + newBass;
      }
    }

    return newRoot + suffix;
  }

  function hasFlatsInSuffix(suffix) {
    // Chequear si algún bajo o extensión usa bemoles
    const bassMatch = suffix.match(/\/([A-G])b/);
    return !!bassMatch;
  }

  // ── Navigation ─────────────────────────────────────────────

  function editCurrent() {
    stopAutoScroll();
    if (currentSongId) window.SongEditor.open(currentSongId);
  }

  function printSong() {
    window.print();
  }

  function backToList() {
    stopAutoScroll();
    window.SongListView.render();
    window.UI.showSection('songs');
  }

  function toVoicing(frets) {
    const noteNames = frets.map((f, i) => {
      if (f === -1) return 'X';
      return MT.pcToName(MT.fretToPC(i, f));
    });
    const barre = window.VoicingFinder.detectBarre(frets);
    const fingers = window.VoicingFinder.suggestFingers(frets, barre);
    return { frets, noteNames, barre, fingers };
  }

  // ── Event bindings ─────────────────────────────────────────
  function initEvents() {
    document.getElementById('btn-view-print').addEventListener('click', printSong);
    document.getElementById('btn-view-edit').addEventListener('click', editCurrent);
    document.getElementById('btn-view-back').addEventListener('click', backToList);
    document.getElementById('btn-font-up').addEventListener('click', () => changeFontSize(2));
    document.getElementById('btn-font-down').addEventListener('click', () => changeFontSize(-2));

    // Auto-scroll controls
    document.getElementById('btn-scroll-play').addEventListener('click', toggleAutoScroll);
    document.getElementById('btn-scroll-slower').addEventListener('click', () => cycleScrollSpeed(-1));
    document.getElementById('btn-scroll-faster').addEventListener('click', () => cycleScrollSpeed(1));

    // Transpose controls
    document.getElementById('btn-transpose-down').addEventListener('click', () => transpose(-1));
    document.getElementById('btn-transpose-up').addEventListener('click', () => transpose(1));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }

  window.SongView = { open };
})();
