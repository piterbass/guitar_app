// ============================================================
// harmonic-context.js  –  Contexto armónico para escalas
// ============================================================

(function () {

  // Mapa: función armónica × familia de acorde → escalas recomendadas/alternativas
  const FUNCTION_SCALE_MAP = {
    'tonica': {
      'maj7':  { recommended: ['major', 'lydian', 'pentatonic-major'], alternatives: ['bebop-major'] },
      'm7':    { recommended: ['aeolian', 'dorian', 'pentatonic-minor'], alternatives: ['melodic-minor', 'harmonic-minor'] },
      'mMaj7': { recommended: ['melodic-minor', 'harmonic-minor'], alternatives: [] },
      '6':     { recommended: ['major', 'pentatonic-major'], alternatives: ['lydian'] },
      'm6':    { recommended: ['dorian', 'melodic-minor'], alternatives: ['aeolian'] },
      '7':     { recommended: ['mixolydian'], alternatives: ['blues', 'pentatonic-minor'] },
      'm7b5':  { recommended: ['locrian', 'locrian-nat2'], alternatives: [] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian', 'pentatonic-minor'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'subdominante': {
      'maj7':  { recommended: ['lydian'], alternatives: ['major', 'lydian-augmented'] },
      'm7':    { recommended: ['dorian'], alternatives: ['aeolian', 'pentatonic-minor'] },
      '7':     { recommended: ['lydian-dominant'], alternatives: ['mixolydian'] },
      'm7b5':  { recommended: ['locrian-nat2'], alternatives: ['locrian'] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: ['harmonic-minor'] },
      '6':     { recommended: ['lydian'], alternatives: ['major'] },
      'm6':    { recommended: ['dorian'], alternatives: ['melodic-minor'] },
      'dim7':  { recommended: ['diminished'], alternatives: ['half-whole-dim'] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'dominante': {
      '7':     { recommended: ['mixolydian', 'altered', 'lydian-dominant', 'half-whole-dim'],
                 alternatives: ['whole-tone', 'mixolydian-b6', 'phrygian-dominant', 'bebop-dominant'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone', 'half-whole-dim'] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian', 'pentatonic-minor'] },
      'maj7':  { recommended: ['lydian'], alternatives: ['major'] },
      'm7':    { recommended: ['dorian', 'phrygian'], alternatives: ['aeolian'] },
      'm7b5':  { recommended: ['locrian-nat2', 'locrian'], alternatives: [] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: ['harmonic-minor'] },
      '6':     { recommended: ['major', 'mixolydian'], alternatives: [] },
      'm6':    { recommended: ['dorian'], alternatives: ['melodic-minor'] },
    },
    'modal': {
      'm7':    { recommended: ['dorian', 'phrygian', 'aeolian'], alternatives: ['dorian-b2', 'dorian-sharp4'] },
      'maj7':  { recommended: ['lydian', 'major', 'ionian-sharp5'], alternatives: [] },
      '7':     { recommended: ['mixolydian', 'lydian-dominant', 'mixolydian-b6'], alternatives: ['phrygian-dominant'] },
      '7sus4': { recommended: ['mixolydian', 'dorian'], alternatives: [] },
      'm7b5':  { recommended: ['locrian', 'locrian-nat2', 'locrian-nat6'], alternatives: [] },
      'dim7':  { recommended: ['half-whole-dim', 'diminished'], alternatives: [] },
      'mMaj7': { recommended: ['melodic-minor', 'harmonic-minor'], alternatives: [] },
      '6':     { recommended: ['major', 'lydian'], alternatives: [] },
      'm6':    { recommended: ['dorian', 'melodic-minor'], alternatives: [] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
    'secundario': {
      '7':     { recommended: ['mixolydian', 'lydian-dominant', 'altered'], alternatives: ['half-whole-dim', 'whole-tone', 'phrygian-dominant'] },
      'm7':    { recommended: ['dorian'], alternatives: ['aeolian', 'phrygian'] },
      'dim7':  { recommended: ['half-whole-dim'], alternatives: ['diminished'] },
      'm7b5':  { recommended: ['locrian-nat2', 'locrian'], alternatives: [] },
      'maj7':  { recommended: ['lydian'], alternatives: ['major'] },
      'mMaj7': { recommended: ['melodic-minor'], alternatives: [] },
      '6':     { recommended: ['major'], alternatives: ['lydian'] },
      'm6':    { recommended: ['dorian'], alternatives: [] },
      '7sus4': { recommended: ['mixolydian'], alternatives: ['dorian'] },
      '7alt':  { recommended: ['altered'], alternatives: ['whole-tone'] },
    },
  };

  /**
   * Mapea una calidad de acorde a su familia para el lookup de funciones.
   */
  function qualityFamily(quality) {
    const map = {
      'maj': 'maj7', 'maj7': 'maj7', 'maj9': 'maj7', 'maj11': 'maj7', 'maj13': 'maj7',
      'add9': 'maj7', 'aug': 'maj7', 'sus2': 'maj7', 'sus4': 'maj7', '5': 'maj7',
      '6': '6',
      'm': 'm7', 'm7': 'm7', 'm9': 'm7', 'm11': 'm7', 'm13': 'm7', 'madd9': 'm7',
      'm6': 'm6',
      'mMaj7': 'mMaj7',
      '7': '7', '9': '7', '11': '7', '13': '7',
      '7b5': '7', '7#5': '7', '7b9': '7', '7#9': '7', '7#11': '7', '7b13': '7',
      '7b9b5': '7', '7#9#5': '7', 'aug7': '7',
      '7alt': '7alt', 'alt': '7alt',
      '7sus4': '7sus4', '7sus2': '7sus4',
      'm7b5': 'm7b5',
      'dim7': 'dim7', 'dim': 'dim7',
    };
    return map[quality] || '7';
  }

  /**
   * Categoriza escalas compatibles según función armónica.
   * @param {object[]} compatibleScales – output de findCompatibleScales
   * @param {string} harmonicFunction – 'tonica'|'subdominante'|'dominante'|'modal'|'secundario'
   * @param {string} chordQuality – calidad del acorde
   * @param {number} chordRootPc – pitch class de la raíz
   * @returns {{ recommended: object[], alternatives: object[], outside: object[] }}
   */
  function categorizeByFunction(compatibleScales, harmonicFunction, chordQuality, chordRootPc) {
    const family = qualityFamily(chordQuality);
    const funcMap = FUNCTION_SCALE_MAP[harmonicFunction];
    const qualityMap = (funcMap && funcMap[family]) || { recommended: [], alternatives: [] };

    const recSet = new Set(qualityMap.recommended);
    const altSet = new Set(qualityMap.alternatives);

    const recommended = [];
    const alternatives = [];
    const outside = [];

    for (const scale of compatibleScales) {
      const isChordRoot = scale.root === chordRootPc;

      if (isChordRoot && recSet.has(scale.scaleKey)) {
        recommended.push(scale);
      } else if (isChordRoot && altSet.has(scale.scaleKey)) {
        alternatives.push(scale);
      } else if (!isChordRoot && recSet.has(scale.scaleKey)) {
        alternatives.push(scale);
      } else {
        outside.push(scale);
      }
    }

    // Ordenar recomendadas según prioridad del mapa
    const recOrder = qualityMap.recommended;
    recommended.sort((a, b) => recOrder.indexOf(a.scaleKey) - recOrder.indexOf(b.scaleKey));

    return { recommended, alternatives, outside };
  }

  window.HarmonicContext = { categorizeByFunction, FUNCTION_SCALE_MAP, qualityFamily };
})();
