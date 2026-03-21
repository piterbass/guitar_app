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
      chords: [
        // Estrofa
        'E','E','B7','B7','A','E','B7','E','E7',
        // Estribillo
        'E','B7','B7','E','E','B7','E','E7',
      ],
    },
    {
      id: 'la-cumparsita', name: 'La cumparsita', artist: 'G. H. Matos Rodríguez',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 110,
      chords: [
        // Intro
        'Am','G','F','E','Am','E','Am','Dm','Am','E','Am','G','F',
        // Estrofa 1
        'E','E','Am','Am','E','E','Am','Am',
        'Dm','Dm','Am','Am','E','E','Am','Am',
        // Estrofa 2
        'Am','Am','E','E','E','E','Am','Am',
        'Am','Am','Dm','Dm','Am','E','Am','Am',
      ],
    },
    {
      id: 'el-dia-que-me-quieras', name: 'El día que me quieras', artist: 'Carlos Gardel',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 75,
      chords: [
        // Verso
        'D','C#m7b5','Bm7','E7','F#7',
        'Bm','E7','Gadd9','A7b9',
        'D','Ebdim7','A','F#7',
        'B7','E7','Gadd9','A7b9','A','Fmaj7#5',
        // Estribillo 1
        'D','F#7','Bm','D7','G','B7','Em',
        'A7','F#7','Bm','E7','Gadd9','A7b9',
        // Estribillo 2
        'D','F#7','Bm','D7','G','B7','Em',
        'F#7','B7','Em7','Gm','F#m','Em7','A','D',
      ],
    },
    {
      id: 'alfonsina-y-el-mar', name: 'Alfonsina y el mar', artist: 'Ariel Ramírez',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 75,
      chords: [
        // Estrofa
        'Bm7b5','E7','Am','B7','Em',
        'Am7','D7','Gmaj7','Cmaj7','F#7','B7','Em',
        'Am7','D7','Gmaj7','Cmaj7','F#7','B7','Em',
        // Estribillo
        'Am7','D7','Gmaj7','Bm7b5','E7','A',
        'B7','Em','B7','F7','E7',
        'Am','Am6','Em','F#7','B7','Em',
      ],
    },
    {
      id: 'balada-para-un-loco', name: 'Balada para un loco', artist: 'Piazzolla / Ferrer',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 100,
      chords: [
        // Recitado (vals)
        'Em','Em','Em','Em','Em','Em','F','F','F','F','Em','Em','F#7','B7','Em',
        // Cantado - estrofa
        'E','B7','Bm','C#7','F#m','Am','E','F#7','B7','E',
        // Estribillo
        'Em','Em','F','F','Em','Em','F#7','B7',
        'Em','Em','F','F','Em','Em','F#7','B7','Em',
        // Modulación (Sol mayor)
        'G','D7','Dm','E7','Am','D7','G','D7','G',
        // Final
        'Em','C','E',
      ],
    },
    {
      id: 'muchacha-ojos-de-papel', name: 'Muchacha ojos de papel', artist: 'Almendra',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 90,
      chords: [
        // Estrofa
        'G','D/F#','Em7','Am7','D',
        'G','D/F#','Em7','Am7','D',
        // Puente (bajo descendente)
        'Em','Em/D#','Em/D','Em/C#',
        // Estribillo
        'C','G/B','Am7','G','Bb',
        'C','G/B','Am7','G',
      ],
    },
    {
      id: 'solo-le-pido-a-dios', name: 'Solo le pido a Dios', artist: 'León Gieco',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 90,
      chords: [
        'Gadd2','Am7/G','C/G','Gadd2',
        'Bm','Am','Dsus2','D',
        'Em','Bm','Am','D',
        'G','Am7/G','C/G','G',
      ],
    },
    {
      id: 'cancion-para-mi-muerte', name: 'Canción para mi muerte', artist: 'Sui Generis',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 100,
      chords: [
        // Estrofa
        'G','F9','C','G',
        'G','F9','C','Dsus4','D',
        // Estribillo
        'Bm','Em','D#','D','G',
        'Em','D','G',
      ],
    },
    {
      id: 'cabildo-y-juramento', name: 'Cabildo y Juramento', artist: 'Conociendo Rusia',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 105,
      chords: [
        // Estrofa
        'Gm9','Cm9','Fsus4','F','Bb','D7#9','D7b9',
        'Gm9','Cm9','Fsus4','F','Bb','D7#9','D7b9',
        // Estribillo
        'Cm9','Fsus4','F','Bbmaj7','Ebmaj7','Am7b5','D7#9','D7b9','Gm',
        // Estribillo 2
        'G7','Cm9','Fsus4','F','Bbmaj7','Ebmaj7','Am7b5','D7#9','D7b9','Gm',
      ],
    },
    {
      id: 'tres-agujas', name: 'Tres agujas', artist: 'Fito Páez',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 85,
      chords: [
        // Estrofa (Gm)
        'Gm7','Cm7','Eb/F','Bbmaj7','Ebmaj7','Gm/E','Gm/F','Gm/E','Am7b5','D7b5','Gm7',
        // Estribillo (Gm)
        'Gm','Gmmaj7','Gm7','Gm6','Ebmaj7','F7','D9',
        'C9','F13','Ebmaj7',
        'Gm','Gmmaj7','Gm7','Gm6','Ebmaj7','F7','D9',
        'C9','F13','Ebmaj7',
        // Puente
        'Cm7','Cdim7','Bbm7','Bbdim7','Am7','Ebdim7','Dm7','Fmaj7/G','E7b9',
        // Estrofa (Am - modulación)
        'Am7','Dm7','Fmaj7/G','Cmaj7','Fmaj7','F#m7b5','Am7/G','F#m7b5','Bm7b5','E7b9','Am7',
        // Estribillo (Am)
        'Am','Ammaj7','Am7','Am6','Fmaj7','Am7',
        'D9','G13','Fmaj7',
        'Am','Ammaj7','Am7','Am6','Fmaj7','Am7',
        'D9','G13','Fmaj7',
        // Puente 2
        'Dm7','Ddim7','Cm7','Cdim7','Bm7','Bdim7','Em7','G/A','Gm/F#',
        // Final (Bm - modulación)
        'Bm7','Em7','G/A','Gmaj#11/A','Dmaj7',
        'Gmaj7','G#m7b5','G5/A','G#m7b5','C#m7b5','F#+7','Bm7','B11',
      ],
    },
    {
      id: 'promesas-sobre-el-bidet', name: 'Promesas sobre el bidet', artist: 'Charly García',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 120,
      chords: [
        // Estrofa
        'Gm7','Am7','Dm7',
        'Gm7','Am7','Dm7',
        'Gm7','Am7','Dm7',
        'Bbmaj7','Csus4',
        // Estribillo
        'F','Ebmaj7/F','Dm7','Bbmaj7',
        'F','Fm','Dm7','Ebmaj7',
        'Dm7','A/C#','Am/C','Bm7b5',
        'Bbmaj7','Am7','Csus4','Dm7','Gm7','Am7',
      ],
    },
    {
      id: 'seminare', name: 'Seminare', artist: 'Serú Girán',
      category: 'Cancionero Argentino', beatsPerChord: 4, defaultBpm: 100,
      chords: [
        // Estrofa
        'G','D/F#','Em','B','Cadd9','C','Dsus4','D7sus4',
        'G','D/F#','Em','B','Cadd9','C','Dsus4','D7sus4',
        // Estribillo
        'Am','G6/B','Cadd9','D/C','Em','Em7','C#m7b5','Cm',
        'G/B','G/C','G/D','G7','C','B7','Em7','A9',
        'Bm/D','Am/D','G/D','G',
        // Solo
        'G','A/G','Gmaj7','C/G','G','D/G','C/G',
        'G','D/G','C/G',
        'G','A/G','Gmaj7','C/G','G','D/G','C/G','G',
      ],
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
