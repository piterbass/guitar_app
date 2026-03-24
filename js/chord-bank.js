// ============================================================
// chord-bank.js  –  Banco de acordes personales (localStorage)
// ============================================================

(function () {
  const STORAGE_KEY = 'guitar-chord-bank';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
  }

  function _persist(bank) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  }

  /** Devuelve todo el banco: { chordName: [ { frets, label, timestamp } ] } */
  function getAll() {
    return _load();
  }

  /** Devuelve voicings guardados para un nombre de acorde (match flexible). */
  function getByName(name) {
    const bank = _load();
    const trimmed = name.trim();
    // Intento exacto primero
    if (bank[trimmed]) return bank[trimmed];
    // Fallback case-insensitive
    const lower = trimmed.toLowerCase();
    for (const key of Object.keys(bank)) {
      if (key.toLowerCase() === lower) return bank[key];
    }
    return [];
  }

  /**
   * Guarda un voicing en el banco.
   * @param {string} name – nombre del acorde (ej. "Dm7")
   * @param {number[]} frets – array de 6 elementos (-1 = muted)
   * @param {string} [label] – etiqueta opcional
   * @returns {boolean} true si se guardó, false si ya existía
   */
  function save(name, frets, label) {
    const bank = _load();
    if (!bank[name]) bank[name] = [];

    // Evitar duplicados
    const key = frets.join(',');
    const exists = bank[name].some(v => v.frets.join(',') === key);
    if (exists) return false;

    bank[name].push({
      frets: [...frets],
      label: label || frets.map(f => f === -1 ? 'x' : f).join('-'),
      timestamp: Date.now(),
    });
    _persist(bank);
    return true;
  }

  /** Elimina un voicing por nombre de acorde e índice. */
  function remove(name, index) {
    const bank = _load();
    if (!bank[name]) return;
    bank[name].splice(index, 1);
    if (bank[name].length === 0) delete bank[name];
    _persist(bank);
  }

  /** Exporta todo el banco como string JSON. */
  function exportJSON() {
    return JSON.stringify(_load(), null, 2);
  }

  /** Importa desde string JSON. Mergea con lo existente. */
  function importJSON(jsonStr) {
    const imported = JSON.parse(jsonStr);
    const bank = _load();
    for (const [name, voicings] of Object.entries(imported)) {
      if (!bank[name]) bank[name] = [];
      for (const v of voicings) {
        const key = v.frets.join(',');
        const exists = bank[name].some(e => e.frets.join(',') === key);
        if (!exists) bank[name].push(v);
      }
    }
    _persist(bank);
  }

  /** Elimina todos los voicings de un acorde. */
  function removeAll(name) {
    const bank = _load();
    if (!bank[name]) return;
    delete bank[name];
    _persist(bank);
  }

  /** Renombra un acorde (mueve todos sus voicings al nuevo nombre). */
  function rename(oldName, newName) {
    const bank = _load();
    if (!bank[oldName] || !newName.trim()) return false;
    newName = newName.trim();
    if (oldName === newName) return false;
    // Mergear si el nuevo nombre ya existe
    if (!bank[newName]) bank[newName] = [];
    bank[oldName].forEach(v => {
      const key = v.frets.join(',');
      const exists = bank[newName].some(e => e.frets.join(',') === key);
      if (!exists) bank[newName].push(v);
    });
    delete bank[oldName];
    _persist(bank);
    return true;
  }

  /** Actualiza los frets de un voicing específico. */
  function updateFrets(name, index, newFrets) {
    const bank = _load();
    if (!bank[name] || !bank[name][index]) return false;
    bank[name][index].frets = [...newFrets];
    bank[name][index].label = newFrets.map(f => f === -1 ? 'x' : f).join('-');
    _persist(bank);
    return true;
  }

  /** Cuenta total de voicings guardados. */
  function count() {
    const bank = _load();
    return Object.values(bank).reduce((sum, arr) => sum + arr.length, 0);
  }

  window.ChordBank = { getAll, getByName, save, remove, removeAll, rename, updateFrets, exportJSON, importJSON, count };
})();
