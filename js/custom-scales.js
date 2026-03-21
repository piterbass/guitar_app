// ============================================================
// custom-scales.js  –  Posiciones de escala personalizadas
//   CRUD + export/import para posiciones custom del usuario
// ============================================================

(function () {
  var STORAGE_KEY = 'guitar-custom-scales';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) { return []; }
  }

  function _persist(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getAll() {
    return _load();
  }

  // Get custom positions that match a given root + scaleKey
  function getByScale(rootPc, scaleKey) {
    return _load().filter(function (s) {
      return s.rootPc === rootPc && s.scaleKey === scaleKey;
    });
  }

  // Get custom positions for a given root (any scale)
  function getByRoot(rootPc) {
    return _load().filter(function (s) {
      return s.rootPc === rootPc;
    });
  }

  // Save a new custom position
  // noteData: [{string, fret, midi, pc}]
  function save(name, positionLabel, rootPc, scaleKey, noteData) {
    if (!noteData || noteData.length === 0) return false;
    var data = _load();

    // Calculate fretRange
    var frets = noteData.map(function (n) { return n.fret; }).filter(function (f) { return f >= 0; });
    var fretRange = [Math.min.apply(null, frets), Math.max.apply(null, frets)];

    data.push({
      id: Date.now(),
      name: name || 'Sin nombre',
      positionLabel: positionLabel || 'Posición custom',
      rootPc: rootPc,
      scaleKey: scaleKey || '',
      noteData: noteData,
      fretRange: fretRange,
      timestamp: Date.now(),
    });

    _persist(data);
    return true;
  }

  function remove(id) {
    var data = _load();
    data = data.filter(function (s) { return s.id !== id; });
    _persist(data);
  }

  function update(id, fields) {
    var data = _load();
    for (var i = 0; i < data.length; i++) {
      if (data[i].id === id) {
        Object.keys(fields).forEach(function (k) {
          data[i][k] = fields[k];
        });
        break;
      }
    }
    _persist(data);
  }

  function count() {
    return _load().length;
  }

  function exportJSON() {
    return JSON.stringify(_load());
  }

  function importJSON(jsonStr) {
    try {
      var incoming = JSON.parse(jsonStr);
      if (!Array.isArray(incoming)) return 0;
      var data = _load();
      var existingIds = new Set(data.map(function (s) { return s.id; }));
      var added = 0;
      incoming.forEach(function (item) {
        if (!existingIds.has(item.id)) {
          data.push(item);
          added++;
        }
      });
      _persist(data);
      return added;
    } catch (e) { return 0; }
  }

  window.CustomScales = {
    getAll: getAll,
    getByScale: getByScale,
    getByRoot: getByRoot,
    save: save,
    remove: remove,
    update: update,
    count: count,
    exportJSON: exportJSON,
    importJSON: importJSON,
  };
})();
