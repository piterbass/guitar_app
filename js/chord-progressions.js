// ============================================================
// chord-progressions.js  –  Biblioteca de progresiones de acordes
//   Jazz Standards, Pop/Rock, Cancionero Argentino, Ciclos
// ============================================================

(function () {

  const CATEGORIES = ['Jazz Standards', 'Pop/Rock', 'Cancionero Argentino', 'Ciclos'];

  // ── Biblioteca de progresiones ──────────────────────────────

  const LIBRARY = [
    // ── Jazz Standards ──
    {
      id: 'autumn-leaves', name: 'Autumn Leaves', artist: 'Joseph Kosma',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 140,
      chords: ['Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm7','Gm7',
               'Am7b5','D7','Gm7','Ebmaj7','Am7b5','D7','Gm7','Gm7'],
    },
    {
      id: 'all-of-me', name: 'All of Me', artist: 'Gerald Marks',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Cmaj7','Cmaj7','E7','E7','A7','A7','Dm7','Dm7',
               'E7','E7','Am7','Am7','D7','D7','Dm7','G7'],
    },
    {
      id: 'blue-bossa', name: 'Blue Bossa', artist: 'Kenny Dorham',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 140,
      chords: ['Cm7','Cm7','Fm7','Fm7','Dm7b5','G7','Cm7','Cm7',
               'Ebm7','Ab7','Dbmaj7','Dbmaj7','Dm7b5','G7','Cm7','Cm7'],
    },
    {
      id: 'fly-me-to-the-moon', name: 'Fly Me to the Moon', artist: 'Bart Howard',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 120,
      chords: ['Am7','Dm7','G7','Cmaj7','Fmaj7','Bm7b5','E7','Am7',
               'Dm7','G7','Cmaj7','A7','Dm7','G7','Cmaj7','E7'],
    },
    {
      id: 'so-what', name: 'So What', artist: 'Miles Davis',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Dm7','Dm7','Dm7','Dm7','Dm7','Dm7','Dm7','Dm7',
               'Ebm7','Ebm7','Ebm7','Ebm7','Dm7','Dm7','Dm7','Dm7'],
    },
    {
      id: 'girl-from-ipanema', name: 'Girl from Ipanema', artist: 'Tom Jobim',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Fmaj7','Fmaj7','G7','G7','Gm7','Gb7','Fmaj7','Fmaj7',
               'Fmaj7','Fmaj7','G7','G7','Gm7','Gb7','Fmaj7','Fmaj7'],
    },
    {
      id: 'all-the-things', name: 'All The Things You Are', artist: 'Jerome Kern',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Fm7','Bbm7','Eb7','Abmaj7','Dbmaj7','Dm7','G7','Cmaj7',
               'Cm7','Fm7','Bb7','Ebmaj7','Abmaj7','Am7b5','D7','Gmaj7'],
    },
    {
      id: 'summertime', name: 'Summertime', artist: 'George Gershwin',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 100,
      chords: ['Am7','Am7','E7','E7','Am7','Am7','Dm7','E7',
               'Am7','Am7','E7','E7','Am7','Dm7','Am7','E7'],
    },
    {
      id: 'misty', name: 'Misty', artist: 'Erroll Garner',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 80,
      chords: ['Ebmaj7','Bbm7','Eb7','Abmaj7','Abm7','Db7','Ebmaj7','Cm7',
               'Fm7','Bb7','Ebmaj7','Cm7','Fm7','Bb7','Ebmaj7','Ebmaj7'],
    },
    {
      id: 'take-five', name: 'Take Five', artist: 'Dave Brubeck',
      category: 'Jazz Standards', beatsPerChord: 5, defaultBpm: 170,
      chords: ['Ebm7','Bbm7','Ebm7','Bbm7','Ebm7','Bbm7','Ebm7','Bbm7',
               'Cbmaj7','Abm7','Bbm7','Ebm7','Cbmaj7','Abm7','Bbm7','Ebm7'],
    },
    {
      id: 'stella-by-starlight', name: 'Stella by Starlight', artist: 'Victor Young',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Em7b5','A7','Cm7','F7','Fm7','Bb7','Ebmaj7','Ebmaj7',
               'Em7b5','A7','Dm7','Bbm7','Eb7','Fmaj7','Em7b5','A7',
               'Dm7','Dm7','Bbm7','Eb7','Fmaj7','Fmaj7','Em7b5','A7',
               'Am7b5','D7','Bm7b5','E7','Am7b5','D7','Gm7','Gm7'],
    },
    {
      id: 'out-of-nowhere', name: 'Out of Nowhere', artist: 'Johnny Green',
      category: 'Jazz Standards', beatsPerChord: 4, defaultBpm: 130,
      chords: ['Gmaj7','Gmaj7','Bbm7','Eb7','Gmaj7','Gmaj7','Bm7','E7',
               'Am7','Am7','Eb7','Eb7','Am7','Am7','Am7','D7',
               'Gmaj7','Gmaj7','Bbm7','Eb7','Gmaj7','Gmaj7','Bm7','E7',
               'Am7','Am7','Cm7','F7','Gmaj7','Am7','D7','Gmaj7'],
    },

    // ── Pop/Rock ──
    {
      id: 'let-it-be', name: 'Let It Be', artist: 'The Beatles',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 76,
      chords: ['C','G','Am','F','C','G','F','C'],
    },
    {
      id: 'hallelujah', name: 'Hallelujah', artist: 'Leonard Cohen',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 80,
      chords: ['C','Am','C','Am','F','G','C','G'],
    },
    {
      id: 'wonderwall', name: 'Wonderwall', artist: 'Oasis',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 87,
      chords: ['Em7','G','Dsus4','A7sus4','Em7','G','Dsus4','A7sus4'],
    },
    {
      id: 'hotel-california', name: 'Hotel California', artist: 'Eagles',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 75,
      chords: ['Bm','F#','A','E','G','D','Em','F#'],
    },
    {
      id: 'stand-by-me', name: 'Stand By Me', artist: 'Ben E. King',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 120,
      chords: ['A','A','F#m','F#m','D','E','A','A'],
    },
    {
      id: 'knockin-on-heavens-door', name: "Knockin' on Heaven's Door", artist: 'Bob Dylan',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 70,
      chords: ['G','D','Am','Am','G','D','C','C'],
    },
    {
      id: 'hey-jude', name: 'Hey Jude', artist: 'The Beatles',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 76,
      chords: ['F','C','C7','F','Bb','F','C7','F'],
    },
    {
      id: 'yesterday', name: 'Yesterday', artist: 'The Beatles',
      category: 'Pop/Rock', beatsPerChord: 4, defaultBpm: 100,
      chords: ['F','Em7','A7','Dm','Bb','C','F','F'],
    },

    // ── Cancionero Argentino ──
    {
      id: 'zamba-esperanza', name: 'Zamba de mi esperanza', artist: 'Luis Profili',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 90,
      chords: ['Em','Am','B7','Em','Am','Em','B7','Em'],
    },
    {
      id: 'la-cumparsita', name: 'La cumparsita', artist: 'G. H. Matos Rodríguez',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 120,
      chords: ['Am','Dm','E7','Am','Dm','Am','E7','Am'],
    },
    {
      id: 'el-dia-que-me-quieras', name: 'El día que me quieras', artist: 'Carlos Gardel',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 80,
      chords: ['C','E7','Am','C7','F','Fm','C','G7'],
    },
    {
      id: 'alfonsina-y-el-mar', name: 'Alfonsina y el mar', artist: 'Ariel Ramírez',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 80,
      chords: ['Am','E7','Am','Dm','G7','C','E7','Am'],
    },
    {
      id: 'balada-para-un-loco', name: 'Balada para un loco', artist: 'Piazzolla / Ferrer',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 100,
      chords: ['Cm','Fm','G7','Cm','Ab','G7','Cm','Cm'],
    },
    {
      id: 'muchacha-ojos-de-papel', name: 'Muchacha ojos de papel', artist: 'Almendra',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 90,
      chords: ['D','A','Bm','F#m','G','A','D','D'],
    },
    {
      id: 'solo-le-pido-a-dios', name: 'Solo le pido a Dios', artist: 'León Gieco',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 90,
      chords: ['Em','Bm','C','G','Am','Em','B7','Em'],
    },
    {
      id: 'cancion-para-mi-muerte', name: 'Canción para mi muerte', artist: 'Sui Generis',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 100,
      chords: ['A','D','E','A','F#m','D','E','A'],
    },
  ];

  // ── Generadores de ciclos ──────────────────────────────────

  const NOTE_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // Ciclo de 4tas: C→F→Bb→Eb...
  function circle4ths() { return [0,5,10,3,8,1,6,11,4,9,2,7]; }
  // Ciclo de 5tas: C→G→D→A...
  function circle5ths() { return [0,7,2,9,4,11,6,1,8,3,10,5]; }

  function getCycleProgressions() {
    var cycles = [];

    // Círculos de 4tas y 5tas con diferentes calidades
    var qualities = [
      { suffix: 'maj7', label: 'maj7' },
      { suffix: '7', label: '7' },
      { suffix: 'm7', label: 'm7' },
    ];

    qualities.forEach(function (q) {
      cycles.push({
        id: 'circle-4ths-' + q.suffix,
        name: 'Círculo de 4tas (' + q.label + ')',
        artist: '',
        category: 'Ciclos',
        beatsPerChord: 4,
        defaultBpm: 100,
        chords: circle4ths().map(function (pc) { return NOTE_NAMES[pc] + q.suffix; }),
      });
      cycles.push({
        id: 'circle-5ths-' + q.suffix,
        name: 'Círculo de 5tas (' + q.label + ')',
        artist: '',
        category: 'Ciclos',
        beatsPerChord: 4,
        defaultBpm: 100,
        chords: circle5ths().map(function (pc) { return NOTE_NAMES[pc] + q.suffix; }),
      });
    });

    // ii-V-I en todas las tonalidades (por ciclo de 4tas)
    var iiVI = [];
    circle4ths().forEach(function (root) {
      var ii = NOTE_NAMES[(root + 2) % 12] + 'm7';
      var V = NOTE_NAMES[(root + 7) % 12] + '7';
      var I = NOTE_NAMES[root] + 'maj7';
      iiVI.push(ii, V, I, I);
    });
    cycles.push({
      id: 'ii-V-I-all-keys',
      name: 'ii-V-I en 12 tonalidades',
      artist: '',
      category: 'Ciclos',
      beatsPerChord: 4,
      defaultBpm: 120,
      chords: iiVI,
    });

    // I-IV-V-I en todas las tonalidades
    var turnaround = [];
    circle4ths().forEach(function (root) {
      turnaround.push(
        NOTE_NAMES[root] + 'maj7',
        NOTE_NAMES[(root + 5) % 12] + 'maj7',
        NOTE_NAMES[(root + 7) % 12] + '7',
        NOTE_NAMES[root] + 'maj7'
      );
    });
    cycles.push({
      id: 'I-IV-V-I-all-keys',
      name: 'I-IV-V-I en 12 tonalidades',
      artist: '',
      category: 'Ciclos',
      beatsPerChord: 4,
      defaultBpm: 120,
      chords: turnaround,
    });

    // I-vi-ii-V (turnaround jazz) en todas las tonalidades
    var jazzTurn = [];
    circle4ths().forEach(function (root) {
      jazzTurn.push(
        NOTE_NAMES[root] + 'maj7',
        NOTE_NAMES[(root + 9) % 12] + 'm7',
        NOTE_NAMES[(root + 2) % 12] + 'm7',
        NOTE_NAMES[(root + 7) % 12] + '7'
      );
    });
    cycles.push({
      id: 'I-vi-ii-V-all-keys',
      name: 'I-vi-ii-V en 12 tonalidades',
      artist: '',
      category: 'Ciclos',
      beatsPerChord: 4,
      defaultBpm: 120,
      chords: jazzTurn,
    });

    // Blues de 12 compases en C
    cycles.push({
      id: 'blues-12-C',
      name: 'Blues 12 compases (C)',
      artist: '',
      category: 'Ciclos',
      beatsPerChord: 4,
      defaultBpm: 110,
      chords: ['C7','C7','C7','C7','F7','F7','C7','C7','G7','F7','C7','G7'],
    });

    // Blues de 12 compases en A
    cycles.push({
      id: 'blues-12-A',
      name: 'Blues 12 compases (A)',
      artist: '',
      category: 'Ciclos',
      beatsPerChord: 4,
      defaultBpm: 110,
      chords: ['A7','A7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'],
    });

    return cycles;
  }

  // ── Sugerencia de escala para un acorde ─────────────────────

  function suggestScale(chordName) {
    var parsed = window.ChordParser.parseChord(chordName);
    if (!parsed) return { rootPc: 0, scaleKey: 'major' };

    var family = window.HarmonicContext.qualityFamily(parsed.quality);
    var funcMap = window.HarmonicContext.FUNCTION_SCALE_MAP;

    // Determinar función armónica probable
    var func = (family === '7' || family === '7alt') ? 'dominante' : 'tonica';
    var qualMap = funcMap[func] && funcMap[func][family];
    if (!qualMap) qualMap = funcMap['tonica']['maj7'];

    var scaleKey = qualMap.recommended[0] || 'major';
    return { rootPc: parsed.rootPc, scaleKey: scaleKey };
  }

  // ── Obtener toda la biblioteca (incluye ciclos) ─────────────

  function getAll() {
    return LIBRARY.concat(getCycleProgressions());
  }

  function getByCategory(category) {
    if (!category || category === 'all') return getAll();
    return getAll().filter(function (p) { return p.category === category; });
  }

  window.ChordProgressions = {
    LIBRARY: LIBRARY,
    CATEGORIES: CATEGORIES,
    getCycleProgressions: getCycleProgressions,
    getAll: getAll,
    getByCategory: getByCategory,
    suggestScale: suggestScale,
  };
})();
