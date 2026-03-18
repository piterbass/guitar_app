// ============================================================
// audio-engine.js  –  Audio con samples de guitarra real
//                      Fallback a Karplus-Strong si no hay red
// ============================================================

(function () {
  let ctx = null;
  let activeSources = [];
  let scaleTimeouts = [];
  let unlocked = false;

  // ── Sample cache ──
  const sampleBuffers = {};  // midi number → AudioBuffer
  let samplesLoading = false;
  let samplesReady = false;

  // URL base para samples de guitarra nylon (gleitz/midi-js-soundfonts)
  const SOUNDFONT_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/';

  // Nombres de notas MIDI para URLs de soundfont
  const NOTE_NAMES_FULL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  function midiToNoteName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const note = NOTE_NAMES_FULL[midi % 12];
    return note + octave;
  }

  function getContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  function onUserGesture() {
    var ac = getContext();
    if (!unlocked) {
      var buf = ac.createBuffer(1, 1, ac.sampleRate);
      var src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(ac.currentTime);
      unlocked = true;
    }
    if (ac.state === 'suspended') ac.resume();
  }
  document.addEventListener('touchstart', onUserGesture, true);
  document.addEventListener('touchend', onUserGesture, true);
  document.addEventListener('click', onUserGesture, true);

  // ── Carga de samples ──

  /**
   * Carga samples de guitarra para el rango MIDI de guitarra (40-88).
   * Se hace de forma lazy y no bloqueante.
   */
  function loadSamples() {
    if (samplesLoading || samplesReady) return;
    samplesLoading = true;

    var ac = getContext();
    // Rango de guitarra: E2 (40) a E6 (88), cargamos cada 1 semitono
    var midiRange = [];
    for (var m = 36; m <= 90; m++) midiRange.push(m);

    var loaded = 0;
    var total = midiRange.length;

    midiRange.forEach(function (midi) {
      var noteName = midiToNoteName(midi);
      var url = SOUNDFONT_BASE + noteName + '.mp3';

      fetch(url)
        .then(function (res) { return res.arrayBuffer(); })
        .then(function (data) { return ac.decodeAudioData(data); })
        .then(function (buffer) {
          sampleBuffers[midi] = buffer;
          loaded++;
          if (loaded === total) {
            samplesReady = true;
            samplesLoading = false;
          }
        })
        .catch(function () {
          loaded++;
          if (loaded === total) {
            // Algunos fallaron, pero marcamos como ready
            // si cargó al menos la mitad
            if (Object.keys(sampleBuffers).length > total / 2) {
              samplesReady = true;
            }
            samplesLoading = false;
          }
        });
    });
  }

  // Iniciar carga al cargar la página
  setTimeout(loadSamples, 500);

  // ── Helpers ──

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Busca el sample más cercano a un MIDI dado.
   * Si no hay sample exacto, busca ±1, ±2, etc.
   */
  function findClosestSample(midi) {
    if (sampleBuffers[midi]) return { buffer: sampleBuffers[midi], detune: 0 };
    for (var d = 1; d <= 4; d++) {
      if (sampleBuffers[midi - d]) return { buffer: sampleBuffers[midi - d], detune: d * 100 };
      if (sampleBuffers[midi + d]) return { buffer: sampleBuffers[midi + d], detune: -d * 100 };
    }
    return null;
  }

  // ── Karplus-Strong fallback ──

  function createPluckBuffer(frequency, duration, sampleRate) {
    const numSamples = Math.ceil(duration * sampleRate);
    const ac = getContext();
    const buffer = ac.createBuffer(1, numSamples, sampleRate);
    const channel = buffer.getChannelData(0);

    const delaySize = Math.round(sampleRate / frequency);
    if (delaySize < 2) return buffer;

    const delayLine = new Float32Array(delaySize);
    const pickPos = 0.4;
    const pickSample = Math.round(delaySize * pickPos);

    for (let i = 0; i < delaySize; i++) {
      const tri = i < pickSample
        ? i / pickSample
        : (delaySize - i) / (delaySize - pickSample);
      const noise = Math.random() * 2 - 1;
      delayLine[i] = 0.6 * tri + 0.4 * noise;
    }

    for (let pass = 0; pass < 3; pass++) {
      let prev = delayLine[delaySize - 1];
      for (let i = 0; i < delaySize; i++) {
        const next = delayLine[(i + 1) % delaySize];
        const smoothed = 0.25 * prev + 0.5 * delayLine[i] + 0.25 * next;
        prev = delayLine[i];
        delayLine[i] = smoothed;
      }
    }

    const freqNorm = Math.max(0, Math.min(1, (frequency - 70) / 900));
    const damping = 0.9995 - freqNorm * 0.004;
    const brightness = 0.45 + (1 - freqNorm) * 0.15;

    let idx = 0;
    let prevOut = 0;
    for (let i = 0; i < numSamples; i++) {
      const nextIdx = (idx + 1) % delaySize;
      const prevIdx = (idx - 1 + delaySize) % delaySize;
      const filtered = 0.2 * delayLine[prevIdx] +
                        0.6 * delayLine[idx] +
                        0.2 * delayLine[nextIdx];
      const out = brightness * filtered + (1 - brightness) * prevOut;
      prevOut = out;
      channel[i] = out;
      delayLine[idx] = damping * out;
      idx = nextIdx;
    }

    return buffer;
  }

  // ── Reproducción ──

  /**
   * Reproduce una nota usando sample real si está disponible,
   * o Karplus-Strong como fallback.
   */
  function playNote(midi, duration) {
    if (midi == null) return;
    duration = duration || 3;
    var ac = getContext();
    if (ac.state === 'suspended') ac.resume();

    var sample = samplesReady ? findClosestSample(midi) : null;

    if (sample) {
      playSampleNote(ac, sample.buffer, sample.detune, ac.currentTime + 0.02, duration, 0.5);
    } else {
      var freq = midiToFreq(midi);
      var audioBuffer = createPluckBuffer(freq, duration, ac.sampleRate);
      createSynthChain(ac, audioBuffer, ac.currentTime + 0.02, duration, 0.4);
    }
  }

  /**
   * Reproduce un sample con detune opcional.
   */
  function playSampleNote(ac, buffer, detune, startTime, duration, volume) {
    try {
      var now = ac.currentTime;
      if (startTime < now) startTime = now;

      var source = ac.createBufferSource();
      source.buffer = buffer;
      if (detune !== 0) source.detune.value = detune;

      var gain = ac.createGain();
      gain.gain.setValueAtTime(volume, startTime);
      // Fade out natural al final
      var fadeStart = startTime + Math.max(duration - 0.3, duration * 0.8);
      gain.gain.setValueAtTime(volume, fadeStart);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      source.connect(gain).connect(ac.destination);
      source.start(startTime);
      source.stop(startTime + duration);

      activeSources.push(source);
      source.onended = function () {
        var i = activeSources.indexOf(source);
        if (i !== -1) activeSources.splice(i, 1);
      };
    } catch (e) {
      // Fallback a synth
      var freq = 440 * Math.pow(2, (60 - 69) / 12); // dummy
      var buf = createPluckBuffer(freq, duration, ac.sampleRate);
      createSynthChain(ac, buf, startTime, duration, volume);
    }
  }

  /**
   * Cadena de audio para síntesis Karplus-Strong (fallback).
   */
  function createSynthChain(ac, audioBuffer, startTime, duration, volume) {
    try {
      var now = ac.currentTime;
      if (startTime < now) startTime = now;

      const source = ac.createBufferSource();
      source.buffer = audioBuffer;

      const body = ac.createBiquadFilter();
      body.type = 'lowpass';
      body.frequency.value = 5000;
      body.Q.value = 0.5;

      const bodyRes = ac.createBiquadFilter();
      bodyRes.type = 'peaking';
      bodyRes.frequency.value = 200;
      bodyRes.gain.value = 1.5;
      bodyRes.Q.value = 1.0;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      source.connect(body).connect(bodyRes).connect(gain).connect(ac.destination);
      source.start(startTime);
      source.stop(startTime + duration);

      activeSources.push(source);
      source.onended = function () {
        const i = activeSources.indexOf(source);
        if (i !== -1) activeSources.splice(i, 1);
      };

      return source;
    } catch (e) {
      try {
        var src2 = ac.createBufferSource();
        src2.buffer = audioBuffer;
        var g2 = ac.createGain();
        g2.gain.value = volume;
        src2.connect(g2).connect(ac.destination);
        src2.start();
        activeSources.push(src2);
        src2.onended = function () {
          var j = activeSources.indexOf(src2);
          if (j !== -1) activeSources.splice(j, 1);
        };
        return src2;
      } catch (e2) { return null; }
    }
  }

  /**
   * Reproduce un acorde completo con efecto strum.
   */
  function playChord(midiNotes, duration) {
    if (!midiNotes) return;
    duration = duration || 4;
    const ac = getContext();
    if (ac.state === 'suspended') ac.resume();
    const strumDelay = 0.030;

    const validNotes = midiNotes
      .map((midi, i) => ({ midi, i }))
      .filter(n => n.midi != null);

    var baseTime = ac.currentTime + 0.02;
    validNotes.forEach((note, idx) => {
      const startTime = baseTime + idx * strumDelay;

      var sample = samplesReady ? findClosestSample(note.midi) : null;
      if (sample) {
        playSampleNote(ac, sample.buffer, sample.detune, startTime, duration, 0.4);
      } else {
        const freq = midiToFreq(note.midi);
        const audioBuffer = createPluckBuffer(freq, duration, ac.sampleRate);
        createSynthChain(ac, audioBuffer, startTime, duration, 0.32);
      }
    });
  }

  /**
   * Reproduce una secuencia de notas (escala) con callback por nota.
   */
  function playScale(midiNotes, interval, onNoteStart) {
    if (!midiNotes || midiNotes.length === 0) return { stop: function() {} };

    stopScale();

    interval = interval || 300;
    const noteDuration = Math.max(interval / 1000 + 0.8, 1.2);

    midiNotes.forEach((midi, idx) => {
      const tid = setTimeout(() => {
        playNote(midi, noteDuration);
        if (onNoteStart) onNoteStart(idx);
      }, idx * interval);
      scaleTimeouts.push(tid);
    });

    const endTid = setTimeout(() => {
      if (onNoteStart) onNoteStart(-1);
      scaleTimeouts = [];
    }, midiNotes.length * interval);
    scaleTimeouts.push(endTid);

    return {
      stop: function() { stopScale(); }
    };
  }

  function stopScale() {
    scaleTimeouts.forEach(tid => clearTimeout(tid));
    scaleTimeouts = [];
  }

  function stopAll() {
    stopScale();
    activeSources.forEach(src => {
      try { src.stop(); } catch (e) { /* ya terminó */ }
    });
    activeSources = [];
  }

  window.AudioEngine = { playNote, playChord, playScale, stopAll, midiToFreq };
})();
