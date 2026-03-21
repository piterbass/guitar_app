// ============================================================
// backup.js  –  Backup y restauración unificada
//   Descarga/sube todos los datos de la app en un solo JSON
// ============================================================

(function () {
  var STORAGE_KEYS = {
    'guitar-songbook':          'Canciones',
    'guitar-scale-bank':        'Mis Escalas',
    'guitar-chord-bank':        'Mis Acordes',
    'practice-prog-scale-maps': 'Mis Prácticas',
    'guitar-custom-scales':     'Mis Posiciones',
  };

  var elPanel, elSummary, elDownload, elUpload, elFile, elStatus;

  function init() {
    elPanel    = document.getElementById('backup-panel');
    elSummary  = document.getElementById('backup-summary');
    elDownload = document.getElementById('backup-download');
    elUpload   = document.getElementById('backup-upload');
    elFile     = document.getElementById('backup-file');
    elStatus   = document.getElementById('backup-status');

    if (!elPanel) return;

    document.getElementById('nav-backup').addEventListener('click', togglePanel);
    document.getElementById('backup-close').addEventListener('click', togglePanel);
    elDownload.addEventListener('click', downloadBackup);
    elUpload.addEventListener('click', function () { elFile.click(); });
    elFile.addEventListener('change', onFileSelected);
  }

  function togglePanel() {
    var visible = elPanel.style.display !== 'none';
    elPanel.style.display = visible ? 'none' : '';
    if (!visible) refreshSummary();
    elStatus.innerHTML = '';
  }

  function refreshSummary() {
    var lines = [];
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      var label = STORAGE_KEYS[key];
      var raw = localStorage.getItem(key);
      if (!raw) {
        lines.push('<b>' + label + ':</b> sin datos');
        return;
      }
      try {
        var data = JSON.parse(raw);
        var count = countItems(key, data);
        lines.push('<b>' + label + ':</b> ' + count);
      } catch (e) {
        lines.push('<b>' + label + ':</b> error al leer');
      }
    });
    elSummary.innerHTML = lines.join('<br>');
  }

  function countItems(key, data) {
    switch (key) {
      case 'guitar-songbook':
        var songs = data.songs || [];
        return songs.length + (songs.length === 1 ? ' canción' : ' canciones');
      case 'guitar-scale-bank':
        return (Array.isArray(data) ? data.length : 0) + ' escalas guardadas';
      case 'guitar-chord-bank':
        var total = 0;
        Object.keys(data).forEach(function (k) {
          total += Array.isArray(data[k]) ? data[k].length : 0;
        });
        return total + ' voicings en ' + Object.keys(data).length + ' acordes';
      case 'practice-prog-scale-maps':
        var progs = Object.keys(data).length;
        return progs + (progs === 1 ? ' progresión configurada' : ' progresiones configuradas');
      case 'guitar-custom-scales':
        var pos = Array.isArray(data) ? data.length : 0;
        return pos + (pos === 1 ? ' posición personalizada' : ' posiciones personalizadas');
      default:
        return 'datos guardados';
    }
  }

  function downloadBackup() {
    var backup = { _type: 'guitar-app-backup', _version: 1, _date: new Date().toISOString() };

    Object.keys(STORAGE_KEYS).forEach(function (key) {
      var raw = localStorage.getItem(key);
      if (raw) {
        try { backup[key] = JSON.parse(raw); }
        catch (e) { /* skip corrupted */ }
      }
    });

    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var date = new Date().toISOString().slice(0, 10);
    a.download = 'guitar-app-backup-' + date + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    elStatus.innerHTML = '<span style="color:#4ecdc4;">Backup descargado correctamente.</span>';
  }

  function onFileSelected() {
    var file = elFile.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);

        if (!data._type || data._type !== 'guitar-app-backup') {
          elStatus.innerHTML = '<span style="color:#e94560;">El archivo no es un backup válido.</span>';
          return;
        }

        var restored = [];
        Object.keys(STORAGE_KEYS).forEach(function (key) {
          if (data[key]) {
            // Merge strategy per key
            mergeData(key, data[key]);
            restored.push(STORAGE_KEYS[key]);
          }
        });

        if (restored.length === 0) {
          elStatus.innerHTML = '<span style="color:#f0a030;">El backup no contenía datos.</span>';
        } else {
          elStatus.innerHTML = '<span style="color:#4ecdc4;">Restaurado: ' + restored.join(', ') +
            '.<br>Recargá la página para ver los cambios.</span>';
        }

        refreshSummary();
      } catch (err) {
        elStatus.innerHTML = '<span style="color:#e94560;">Error al leer el archivo: ' + err.message + '</span>';
      }
    };
    reader.readAsText(file);
    elFile.value = '';
  }

  function mergeData(key, incoming) {
    var existing;
    try { existing = JSON.parse(localStorage.getItem(key)); }
    catch (e) { existing = null; }

    switch (key) {
      case 'guitar-songbook':
        existing = existing || { songs: [] };
        incoming = incoming || { songs: [] };
        var existingIds = new Set(existing.songs.map(function (s) { return s.id; }));
        (incoming.songs || []).forEach(function (song) {
          if (!existingIds.has(song.id)) {
            existing.songs.push(song);
          }
        });
        localStorage.setItem(key, JSON.stringify(existing));
        break;

      case 'guitar-scale-bank':
        existing = existing || [];
        incoming = incoming || [];
        var existingKeys = new Set(existing.map(function (s) { return s.rootPc + '|' + s.scaleKey; }));
        incoming.forEach(function (scale) {
          var k = scale.rootPc + '|' + scale.scaleKey;
          if (!existingKeys.has(k)) {
            existing.push(scale);
          }
        });
        localStorage.setItem(key, JSON.stringify(existing));
        break;

      case 'guitar-chord-bank':
        existing = existing || {};
        incoming = incoming || {};
        Object.keys(incoming).forEach(function (chordName) {
          if (!existing[chordName]) {
            existing[chordName] = incoming[chordName];
          } else {
            var existingLabels = new Set(existing[chordName].map(function (v) { return v.label; }));
            incoming[chordName].forEach(function (voicing) {
              if (!existingLabels.has(voicing.label)) {
                existing[chordName].push(voicing);
              }
            });
          }
        });
        localStorage.setItem(key, JSON.stringify(existing));
        break;

      case 'practice-prog-scale-maps':
        existing = existing || {};
        incoming = incoming || {};
        Object.keys(incoming).forEach(function (progId) {
          existing[progId] = incoming[progId];
        });
        localStorage.setItem(key, JSON.stringify(existing));
        break;

      case 'guitar-custom-scales':
        existing = existing || [];
        incoming = incoming || [];
        var existingCustomIds = new Set(existing.map(function (s) { return s.id; }));
        incoming.forEach(function (item) {
          if (!existingCustomIds.has(item.id)) {
            existing.push(item);
          }
        });
        localStorage.setItem(key, JSON.stringify(existing));
        break;

      default:
        localStorage.setItem(key, JSON.stringify(incoming));
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.Backup = { toggle: togglePanel };
})();
