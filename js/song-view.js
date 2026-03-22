// ============================================================
// song-view.js  –  Vista lectura de canción + voicings pineados
// ============================================================

(function () {
  const { createDiagram } = window.FretboardSVG;
  const { parseChord } = window.ChordParser;
  const SB = window.Songbook;

  let currentSongId = null;
  let currentSong = null;
  let fontSize = 16;

  function open(songId) {
    const song = SB.getSong(songId);
    if (!song) return;

    currentSongId = songId;
    currentSong = song;
    fontSize = 16;

    document.getElementById('view-title').textContent = song.title;
    document.getElementById('view-artist').textContent = song.artist || '';

    renderLyrics(song);
    renderPinnedBar(song);

    window.UI.showSection('song-view');
  }

  function renderLyrics(song) {
    const container = document.getElementById('view-lyrics');
    container.style.fontSize = fontSize + 'px';
    container.innerHTML = window.SongEditor.renderContent(song.content, false);

    // Hacer clickeables los chord-markers
    container.querySelectorAll('.chord-marker').forEach(el => {
      el.addEventListener('click', () => {
        const chordName = el.dataset.chord;
        highlightPinned(chordName);
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

    // Re-leer canción fresca desde storage (puede haber sido modificada por el botón fijar)
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
    // Quitar highlights previos
    bar.querySelectorAll('.pinned-bar-card').forEach(c => c.classList.remove('highlight'));
    // Resaltar los del acorde
    bar.querySelectorAll(`.pinned-bar-card[data-chord="${chordName}"]`).forEach(c => {
      c.classList.add('highlight');
      c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    // Quitar highlight después de 2s
    setTimeout(() => {
      bar.querySelectorAll('.highlight').forEach(c => c.classList.remove('highlight'));
    }, 2000);
  }

  function changeFontSize(delta) {
    fontSize = Math.max(10, Math.min(32, fontSize + delta));
    const container = document.getElementById('view-lyrics');
    container.style.fontSize = fontSize + 'px';
    // Ajustar padding-top de lyric-lines para que los acordes no se encimen
    const chordHeight = Math.ceil(fontSize * 0.85) + 4;
    container.querySelectorAll('.lyric-line').forEach(el => {
      el.style.paddingTop = chordHeight + 'px';
    });
  }

  function editCurrent() {
    if (currentSongId) window.SongEditor.open(currentSongId);
  }

  function printSong() {
    window.print();
  }

  function backToList() {
    window.SongListView.render();
    window.UI.showSection('songs');
  }

  function toVoicing(frets) {
    const noteNames = frets.map((f, i) => {
      if (f === -1) return 'X';
      return window.MusicTheory.pcToName(window.MusicTheory.fretToPC(i, f));
    });
    const barre = window.VoicingFinder.detectBarre(frets);
    const fingers = window.VoicingFinder.suggestFingers(frets, barre);
    return { frets, noteNames, barre, fingers };
  }

  // Event bindings (called after DOM ready)
  function initEvents() {
    document.getElementById('btn-view-print').addEventListener('click', printSong);
    document.getElementById('btn-view-edit').addEventListener('click', editCurrent);
    document.getElementById('btn-view-back').addEventListener('click', backToList);
    document.getElementById('btn-font-up').addEventListener('click', () => changeFontSize(2));
    document.getElementById('btn-font-down').addEventListener('click', () => changeFontSize(-2));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }

  window.SongView = { open };
})();
