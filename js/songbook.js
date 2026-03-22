// ============================================================
// songbook.js  –  Modelo de datos de canciones (localStorage)
// ============================================================

(function () {
  const STORAGE_KEY = 'guitar-songbook';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { songs: [] };
    } catch { return { songs: [] }; }
  }

  function _persist(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Devuelve todas las canciones ordenadas por updatedAt desc. */
  function getSongs() {
    const data = _load();
    return data.songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /** Devuelve una canción por id. */
  function getSong(id) {
    const data = _load();
    return data.songs.find(s => s.id === id) || null;
  }

  /**
   * Guarda (crea o actualiza) una canción.
   * @param {object} song – { id?, title, artist, content, pinnedVoicings }
   * @returns {object} la canción guardada con id
   */
  function saveSong(song) {
    const data = _load();
    const now = Date.now();

    if (song.id) {
      const idx = data.songs.findIndex(s => s.id === song.id);
      if (idx >= 0) {
        data.songs[idx] = { ...data.songs[idx], ...song, updatedAt: now };
        _persist(data);
        return data.songs[idx];
      }
    }

    const newSong = {
      id: String(now),
      title: song.title || 'Sin titulo',
      artist: song.artist || '',
      content: song.content || '',
      pinnedVoicings: song.pinnedVoicings || [],
      createdAt: now,
      updatedAt: now,
    };
    data.songs.push(newSong);
    _persist(data);
    return newSong;
  }

  /** Elimina una canción por id. */
  function deleteSong(id) {
    const data = _load();
    data.songs = data.songs.filter(s => s.id !== id);
    _persist(data);
  }

  /** Extrae nombres de acordes únicos del contenido de una canción. */
  function extractChords(content) {
    const matches = content.match(/\[([^\]]+)\]/g) || [];
    const chords = matches.map(m => {
      const raw = m.slice(1, -1).trim();
      // Strip optional :N beat notation
      const beatMatch = raw.match(/^(.+):(\d+)$/);
      return beatMatch ? beatMatch[1].trim() : raw;
    });
    return [...new Set(chords)];
  }

  /** Exporta todo el songbook como JSON string. */
  function exportJSON() {
    return JSON.stringify(_load(), null, 2);
  }

  /** Importa desde JSON string. Mergea canciones (por id, sin duplicar). */
  function importJSON(jsonStr) {
    const imported = JSON.parse(jsonStr);
    if (!imported.songs) return;
    const data = _load();
    const existingIds = new Set(data.songs.map(s => s.id));
    for (const song of imported.songs) {
      if (!existingIds.has(song.id)) {
        data.songs.push(song);
      }
    }
    _persist(data);
  }

  window.Songbook = { getSongs, getSong, saveSong, deleteSong, extractChords, exportJSON, importJSON };
})();
