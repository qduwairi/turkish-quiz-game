// Vocabulary feature (009) — CSV parsing, delimiter/header sniffing, row-level validation.
// Pure functions only; no DOM, no Firebase. Consumed by vocabUI.js for imports.

(function (global) {
  'use strict';

  var MAX_ROWS = 2000;
  var MAX_CELL = 200;
  var DELIMS = [',', ';', '\t'];

  function sniffDelimiter(line) {
    var counts = DELIMS.map(function (d) {
      var c = 0;
      for (var i = 0; i < line.length; i++) if (line.charAt(i) === d) c++;
      return c;
    });
    var max = Math.max.apply(null, counts);
    if (max === 0) return null;
    // Tie-break by precedence: comma > semicolon > tab.
    for (var i = 0; i < DELIMS.length; i++) if (counts[i] === max) return DELIMS[i];
    return null;
  }

  function firstNonEmptyLine(text) {
    var start = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '\n' || ch === '\r') {
        var seg = text.substring(start, i);
        if (seg.trim().length > 0) return seg;
        start = i + 1;
      }
    }
    return text.substring(start);
  }

  // RFC-4180 state-machine parser. `text` has leading BOM stripped by the caller.
  function parseRows(text, delim) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;
    while (i < len) {
      var ch = text.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === delim) { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\r') {
        // Swallow CR, CRLF handled by the \n branch below.
        if (text.charAt(i + 1) === '\n') { i++; continue; }
        row.push(cell); cell = ''; rows.push(row); row = []; i++; continue;
      }
      if (ch === '\n') {
        row.push(cell); cell = ''; rows.push(row); row = []; i++; continue;
      }
      cell += ch; i++;
    }
    // Flush the trailing cell/row unless the file ended on a newline.
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    // Drop any purely-empty trailing row produced by a final newline.
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
    return rows;
  }

  function detectHeader(rows) {
    if (rows.length < 1) return false;
    var first = rows[0];
    // Every cell non-empty after trim?
    for (var i = 0; i < first.length; i++) {
      if (first[i] == null || String(first[i]).trim() === '') return false;
    }
    // First row must not exactly equal any later row.
    for (var r = 1; r < rows.length; r++) {
      if (rows[r].length !== first.length) continue;
      var eq = true;
      for (var c = 0; c < first.length; c++) { if (rows[r][c] !== first[c]) { eq = false; break; } }
      if (eq) return false;
    }
    return true;
  }

  function parseCsv(text) {
    if (typeof text !== 'string') throw new Error('parseCsv expects a string');
    // Strip UTF-8 BOM if present.
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    var firstLine = firstNonEmptyLine(text).replace(/^\uFEFF/, '');
    var delim = sniffDelimiter(firstLine);
    if (!delim) {
      var e = new Error('unrecognized_delimiter');
      e.code = 'unrecognized_delimiter';
      throw e;
    }
    var rawRows = parseRows(text, delim);
    var headerDetected = detectHeader(rawRows);
    var headerNames = headerDetected ? rawRows[0].map(function (s) { return String(s).trim(); }) : null;
    var dataRows = headerDetected ? rawRows.slice(1) : rawRows;
    var out = [];
    for (var i = 0; i < dataRows.length; i++) {
      var r = dataRows[i];
      var term = (r[0] || '').trim();
      var translation = (r[1] || '').trim();
      var extras = {};
      for (var k = 2; k < r.length; k++) {
        var key = (headerNames && headerNames[k] ? headerNames[k] : 'col_' + (k + 1));
        var val = r[k] == null ? '' : String(r[k]);
        if (val.length > 0) extras[key] = val;
      }
      out.push({ term: term, translation: translation, extras: extras, _rowNumber: i + (headerDetected ? 2 : 1) });
    }
    return { rows: out, headerDetected: headerDetected, delimiter: delim };
  }

  // Apply file-level + row-level rules per contracts/csv-format.md.
  // `existingTerms` is a Set of lower-cased + trimmed terms already in the target deck.
  function importCsv(text, options) {
    options = options || {};
    var existingTerms = options.existingTerms || new Set();
    try {
      var parsed = parseCsv(text);
    } catch (err) {
      if (window.errorTracker) {
        window.errorTracker.capture({ kind: 'js_error', message: err.message, stack: err.stack, operation: 'vocab.csvImport.parse' });
      }
      return { accepted: [], skipped: [], fileError: err.code || 'parse_failed', delimiter: null, headerDetected: false };
    }
    if (parsed.rows.length > MAX_ROWS) {
      return { accepted: [], skipped: [], fileError: 'too_many_rows', delimiter: parsed.delimiter, headerDetected: parsed.headerDetected };
    }
    var accepted = [];
    var skipped = [];
    var seenInFile = new Set(); // lower-cased trimmed terms already accepted from this file
    for (var i = 0; i < parsed.rows.length; i++) {
      var row = parsed.rows[i];
      var rn = row._rowNumber;
      var term = row.term;
      var translation = row.translation;

      if (term.length === 0 && translation.length === 0 && Object.keys(row.extras).length === 0) {
        // Silent skip — empty row.
        skipped.push({ rowNumber: rn, reason: 'empty_row' });
        continue;
      }
      if (term.length === 0 || translation.length === 0) {
        skipped.push({ rowNumber: rn, reason: 'missing_required_field' });
        continue;
      }
      if (term.length > MAX_CELL || translation.length > MAX_CELL) {
        skipped.push({ rowNumber: rn, reason: 'too_long' });
        continue;
      }
      var key = term.toLowerCase();
      if (seenInFile.has(key)) {
        skipped.push({ rowNumber: rn, reason: 'duplicate_within_file' });
        continue;
      }
      if (existingTerms.has(key)) {
        skipped.push({ rowNumber: rn, reason: 'duplicate_in_deck' });
        continue;
      }
      seenInFile.add(key);
      accepted.push({ term: term, translation: translation, extras: row.extras });
    }
    return {
      accepted: accepted,
      skipped: skipped,
      fileError: null,
      delimiter: parsed.delimiter,
      headerDetected: parsed.headerDetected,
    };
  }

  global.vocabCsvImport = {
    parseCsv: parseCsv,
    importCsv: importCsv,
    MAX_ROWS: MAX_ROWS,
    MAX_CELL: MAX_CELL,
  };
})(window);
