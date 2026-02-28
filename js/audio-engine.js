// ============================================================
// audio-engine.js  –  Síntesis de guitarra con Karplus-Strong
// ============================================================

(function () {
  let ctx = null;
  let activeSources = [];
  let scaleTimeouts = [];

  function getContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  // Asegurar que el AudioContext esté activo.
  // En iOS debe llamarse dentro de un gesto de usuario (touch/click).
  // Se llama en CADA interacción porque iOS puede re-suspender el contexto
  // (al cambiar de app, bloquear pantalla, etc.).
  function ensureAudioReady() {
    var ac = getContext();
    if (ac.state === 'suspended') {
      ac.resume();
    }
    // Reproducir un buffer silencioso para forzar el desbloqueo en iOS.
    // Esto es necesario la primera vez; en llamadas posteriores es inofensivo.
    var buf = ac.createBuffer(1, 1, ac.sampleRate);
    var src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(ac.currentTime);
  }

  // Listener persistente: desbloquea/resume en cada gesto del usuario.
  // NO se remueve para cubrir re-suspensiones de iOS.
  function onUserGesture() {
    ensureAudioReady();
  }
  document.addEventListener('touchstart', onUserGesture, true);
  document.addEventListener('touchend', onUserGesture, true);
  document.addEventListener('click', onUserGesture, true);

  /**
   * Convierte MIDI note number a frecuencia en Hz.
   */
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Genera un AudioBuffer con síntesis Karplus-Strong mejorada.
   * Simula cuerda de guitarra acústica/nylon con excitación suavizada,
   * filtro de 3 puntos y resonancia de cuerpo.
   * @param {number} frequency – frecuencia en Hz
   * @param {number} duration – duración en segundos
   * @param {number} sampleRate – sample rate del AudioContext
   * @returns {AudioBuffer}
   */
  function createPluckBuffer(frequency, duration, sampleRate) {
    const numSamples = Math.ceil(duration * sampleRate);
    const ac = getContext();
    const buffer = ac.createBuffer(1, numSamples, sampleRate);
    const channel = buffer.getChannelData(0);

    // Delay line = una longitud de onda
    const delaySize = Math.round(sampleRate / frequency);
    if (delaySize < 2) return buffer;

    // ── Excitación: mezcla de ruido suavizado + forma triangular ──
    // Esto elimina el ataque metálico del ruido blanco puro
    const delayLine = new Float32Array(delaySize);
    const pickPos = 0.4; // posición del pluck (0.5 = medio, más bajo = más cálido)
    const pickSample = Math.round(delaySize * pickPos);

    for (let i = 0; i < delaySize; i++) {
      // Componente triangular (fundamental suave)
      const tri = i < pickSample
        ? i / pickSample
        : (delaySize - i) / (delaySize - pickSample);
      // Componente de ruido (color tímbrico)
      const noise = Math.random() * 2 - 1;
      // Mezcla: 60% triangular + 40% ruido → timbre cálido con definición
      delayLine[i] = 0.6 * tri + 0.4 * noise;
    }

    // Suavizar la excitación con 3 pasadas de moving average
    for (let pass = 0; pass < 3; pass++) {
      let prev = delayLine[delaySize - 1];
      for (let i = 0; i < delaySize; i++) {
        const next = delayLine[(i + 1) % delaySize];
        const smoothed = 0.25 * prev + 0.5 * delayLine[i] + 0.25 * next;
        prev = delayLine[i];
        delayLine[i] = smoothed;
      }
    }

    // ── Damping adaptativo por frecuencia ──
    // Cuerdas graves: más sustain, agudas: decaen más rápido (como guitarra real)
    const freqNorm = Math.max(0, Math.min(1, (frequency - 70) / 900));
    const damping = 0.9995 - freqNorm * 0.004; // 0.9995 (graves) → 0.9955 (agudas)

    // Coeficiente de brillo: cuánto pasa del filtro LP (más alto = más brillante)
    const brightness = 0.45 + (1 - freqNorm) * 0.15; // 0.45–0.60

    // ── Síntesis: filtro LP de 3 puntos ponderado ──
    let idx = 0;
    let prevOut = 0;
    for (let i = 0; i < numSamples; i++) {
      const nextIdx = (idx + 1) % delaySize;
      const prevIdx = (idx - 1 + delaySize) % delaySize;

      // Filtro lowpass de 3 puntos (más suave que promedio de 2)
      const filtered = 0.2 * delayLine[prevIdx] +
                        0.6 * delayLine[idx] +
                        0.2 * delayLine[nextIdx];

      // One-pole lowpass adicional para calidez
      const out = brightness * filtered + (1 - brightness) * prevOut;
      prevOut = out;

      channel[i] = out;
      delayLine[idx] = damping * out;
      idx = nextIdx;
    }

    return buffer;
  }

  /**
   * Reproduce una nota individual.
   * @param {number} midi – MIDI note number
   * @param {number} [duration=1.5] – duración en segundos
   */
  /**
   * Crea la cadena de audio: source → bodyFilter → gain → destination.
   * El filtro simula la resonancia del cuerpo de la guitarra.
   */
  function createAudioChain(ac, audioBuffer, startTime, duration, volume) {
    const source = ac.createBufferSource();
    source.buffer = audioBuffer;

    // Filtro de cuerpo: recorta solo los armónicos más ásperos
    const body = ac.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.setValueAtTime(5000, startTime);
    body.Q.setValueAtTime(0.5, startTime);

    // Resonancia sutil de caja (no exagerar para no oscurecer)
    const bodyRes = ac.createBiquadFilter();
    bodyRes.type = 'peaking';
    bodyRes.frequency.setValueAtTime(200, startTime);
    bodyRes.gain.setValueAtTime(1.5, startTime);
    bodyRes.Q.setValueAtTime(1.0, startTime);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(body).connect(bodyRes).connect(gain).connect(ac.destination);
    source.start(startTime);
    source.stop(startTime + duration);

    activeSources.push(source);
    source.onended = () => {
      const i = activeSources.indexOf(source);
      if (i !== -1) activeSources.splice(i, 1);
    };

    return source;
  }

  function playNote(midi, duration) {
    if (midi == null) return;
    duration = duration || 3;
    const ac = getContext();
    if (ac.state === 'suspended') ac.resume();
    const freq = midiToFreq(midi);
    const audioBuffer = createPluckBuffer(freq, duration, ac.sampleRate);
    createAudioChain(ac, audioBuffer, ac.currentTime, duration, 0.4);
  }

  /**
   * Reproduce un acorde completo con efecto strum.
   * @param {(number|null)[]} midiNotes – array de 6 MIDI notes (null = muted)
   * @param {number} [duration=2] – duración total en segundos
   */
  function playChord(midiNotes, duration) {
    if (!midiNotes) return;
    duration = duration || 4;
    const ac = getContext();
    if (ac.state === 'suspended') ac.resume();
    const strumDelay = 0.030; // 30ms entre cuerdas

    const validNotes = midiNotes
      .map((midi, i) => ({ midi, i }))
      .filter(n => n.midi != null);

    validNotes.forEach((note, idx) => {
      const startTime = ac.currentTime + idx * strumDelay;
      const freq = midiToFreq(note.midi);
      const audioBuffer = createPluckBuffer(freq, duration, ac.sampleRate);
      createAudioChain(ac, audioBuffer, startTime, duration, 0.32);
    });
  }

  /**
   * Reproduce una secuencia de notas (escala) con callback por nota.
   * @param {number[]} midiNotes – array de MIDI notes en orden
   * @param {number} interval – ms entre notas
   * @param {function} [onNoteStart] – callback(index) cuando empieza cada nota
   * @returns {{ stop: function }} – control para detener la reproducción
   */
  function playScale(midiNotes, interval, onNoteStart) {
    if (!midiNotes || midiNotes.length === 0) return { stop() {} };

    // Detener escala anterior si hay una en curso
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

    // Limpiar highlight al terminar
    const endTid = setTimeout(() => {
      if (onNoteStart) onNoteStart(-1); // señal de fin
      scaleTimeouts = [];
    }, midiNotes.length * interval);
    scaleTimeouts.push(endTid);

    return {
      stop() { stopScale(); }
    };
  }

  /**
   * Detiene la reproducción de escala en curso.
   */
  function stopScale() {
    scaleTimeouts.forEach(tid => clearTimeout(tid));
    scaleTimeouts = [];
  }

  /**
   * Detiene toda reproducción en curso.
   */
  function stopAll() {
    stopScale();
    activeSources.forEach(src => {
      try { src.stop(); } catch (e) { /* ya terminó */ }
    });
    activeSources = [];
  }

  window.AudioEngine = { playNote, playChord, playScale, stopAll, midiToFreq };
})();
