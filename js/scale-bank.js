// ============================================================
// scale-bank.js  –  Banco de escalas favoritas (localStorage)
// ============================================================

(function () {
  const STORAGE_KEY = 'guitar-scale-bank';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function _persist(bank) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  }

  /** Devuelve todas las escalas guardadas: [{ rootPc, scaleKey, label, timestamp }] */
  function getAll() {
    return _load();
  }

  /**
   * Guarda una escala en el banco.
   * @param {number} rootPc – pitch class de la raíz (0-11)
   * @param {string} scaleKey – clave de SCALE_FORMULAS
   * @returns {boolean} true si se guardó, false si ya existía
   */
  function save(rootPc, scaleKey) {
    const bank = _load();
    const rootName = window.MusicTheory.pcToName(rootPc);
    const scaleName = (window.ScaleDetector && window.ScaleDetector.SCALE_LABELS[scaleKey]) || scaleKey;
    const label = rootName + ' ' + scaleName;

    // Evitar duplicados
    const exists = bank.some(s => s.rootPc === rootPc && s.scaleKey === scaleKey);
    if (exists) return false;

    bank.push({
      rootPc: rootPc,
      scaleKey: scaleKey,
      label: label,
      timestamp: Date.now(),
    });
    _persist(bank);
    return true;
  }

  /** Elimina una escala por índice. */
  function remove(index) {
    const bank = _load();
    if (index < 0 || index >= bank.length) return;
    bank.splice(index, 1);
    _persist(bank);
  }

  /** Cuenta total de escalas guardadas. */
  function count() {
    return _load().length;
  }

  /** Exporta todo el banco como string JSON. */
  function exportJSON() {
    return JSON.stringify(_load(), null, 2);
  }

  /** Importa desde string JSON. Mergea con lo existente. */
  function importJSON(jsonStr) {
    const imported = JSON.parse(jsonStr);
    if (!Array.isArray(imported)) return;
    const bank = _load();
    for (const s of imported) {
      if (s.rootPc == null || !s.scaleKey) continue;
      const exists = bank.some(e => e.rootPc === s.rootPc && e.scaleKey === s.scaleKey);
      if (!exists) {
        bank.push({
          rootPc: s.rootPc,
          scaleKey: s.scaleKey,
          label: s.label || (window.MusicTheory.pcToName(s.rootPc) + ' ' + s.scaleKey),
          timestamp: s.timestamp || Date.now(),
        });
      }
    }
    _persist(bank);
  }

  window.ScaleBank = { getAll, save, remove, count, exportJSON, importJSON };
})();
