// ============================================================
// pdf-export.js  –  Generador de PDF vanilla (sin dependencias)
//   Arma un PDF de texto monoespaciado (Courier) multipágina y lo descarga.
//   Pensado para hojas de acordes + letra. Funciona offline (PWA).
// ============================================================

(function () {
  // A4 en puntos (1pt = 1/72")
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 42;

  // ── Layout: convierte items en páginas con líneas posicionadas ──
  // item: { text, bold?, size?, spaceBefore? }
  function layout(items) {
    const pages = [];
    let cur = [];
    let y = PAGE_H - MARGIN;

    for (const it of items) {
      const size = it.size || 10;
      const lh = Math.round(size * 1.32);
      if (it.spaceBefore) y -= it.spaceBefore;
      // Salto de página si no entra
      if (y - lh < MARGIN) {
        pages.push(cur);
        cur = [];
        y = PAGE_H - MARGIN;
      }
      y -= lh;
      if (it.text && it.text.length) {
        cur.push({ x: MARGIN, y: y, font: it.bold ? 'F2' : 'F1', size: size, text: it.text });
      }
    }
    if (cur.length || pages.length === 0) pages.push(cur);
    return pages;
  }

  // ── Codificación de texto a bytes WinAnsi, con escape de ( ) \ ──
  function pushTextBytes(b, text) {
    for (const ch of text) {
      if (ch === '\\') { b.push(0x5C, 0x5C); continue; }
      if (ch === '(') { b.push(0x5C, 0x28); continue; }
      if (ch === ')') { b.push(0x5C, 0x29); continue; }
      let code = ch.charCodeAt(0);
      // WinAnsi ≈ Latin-1 para 0x20–0xFF (cubre acentos español: á é í ó ú ñ ü ¿ ¡)
      if (code > 255) code = 0x3F; // '?'
      b.push(code & 0xFF);
    }
  }

  // ── Content stream de una página ──
  function streamBytes(lines) {
    const b = [];
    const push = (s) => { for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xFF); };
    push('BT\n');
    let lastFont = '', lastSize = 0;
    for (const ln of lines) {
      if (ln.font !== lastFont || ln.size !== lastSize) {
        push('/' + ln.font + ' ' + ln.size + ' Tf\n');
        lastFont = ln.font; lastSize = ln.size;
      }
      push('1 0 0 1 ' + ln.x + ' ' + ln.y + ' Tm\n');
      push('(');
      pushTextBytes(b, ln.text);
      push(') Tj\n');
    }
    push('ET\n');
    return b;
  }

  function strBytes(s) {
    const b = [];
    for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xFF);
    return b;
  }

  /**
   * Construye los bytes de un PDF a partir de items de texto.
   * @param {Array<{text,bold,size,spaceBefore}>} items
   * @returns {Uint8Array}
   */
  function buildPdf(items) {
    const pages = layout(items);

    // Numeración de objetos:
    // 1 Catalog · 2 Pages · 3 Font F1 (Courier) · 4 Font F2 (Courier-Bold)
    // luego, por página: content (5,7,9…) y page (6,8,10…)
    const objects = []; // { bytes }
    objects[1] = strBytes('<< /Type /Catalog /Pages 2 0 R >>');

    const pageNums = [];
    for (let i = 0; i < pages.length; i++) pageNums.push(6 + i * 2);

    objects[2] = strBytes('<< /Type /Pages /Kids [ ' +
      pageNums.map((n) => n + ' 0 R').join(' ') + ' ] /Count ' + pages.length + ' >>');
    objects[3] = strBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
    objects[4] = strBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');

    for (let i = 0; i < pages.length; i++) {
      const contentNum = 5 + i * 2;
      const pageNum = 6 + i * 2;
      const stream = streamBytes(pages[i]);
      const head = strBytes('<< /Length ' + stream.length + ' >>\nstream\n');
      const tail = strBytes('\nendstream');
      objects[contentNum] = head.concat(stream, tail);
      objects[pageNum] = strBytes(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + ']' +
        ' /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + contentNum + ' 0 R >>');
    }

    // Ensamblar archivo con offsets para el xref
    const out = [];
    const offsets = [];
    const append = (arr) => { for (let i = 0; i < arr.length; i++) out.push(arr[i]); };

    append(strBytes('%PDF-1.4\n'));
    const count = objects.length - 1; // índices 1..count
    for (let n = 1; n <= count; n++) {
      offsets[n] = out.length;
      append(strBytes(n + ' 0 obj\n'));
      append(objects[n]);
      append(strBytes('\nendobj\n'));
    }

    const xrefOffset = out.length;
    append(strBytes('xref\n0 ' + (count + 1) + '\n'));
    append(strBytes('0000000000 65535 f\r\n'));
    for (let n = 1; n <= count; n++) {
      const off = String(offsets[n]).padStart(10, '0');
      append(strBytes(off + ' 00000 n\r\n'));
    }
    append(strBytes('trailer\n<< /Size ' + (count + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF'));

    return new Uint8Array(out);
  }

  // ── Descarga ──
  function download(filename, bytes) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'cancion';
  }

  /**
   * Genera y descarga un PDF de items de texto.
   * @param {string} baseName – nombre base (sin extensión)
   * @param {Array} items
   */
  function downloadTextPdf(baseName, items) {
    const bytes = buildPdf(items);
    download(sanitizeFilename(baseName) + '.pdf', bytes);
  }

  window.PdfExport = { buildPdf, download, downloadTextPdf, sanitizeFilename };
})();
