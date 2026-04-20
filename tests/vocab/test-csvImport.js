// Tests for js/vocab/csvImport.js — US1 / T009.
(function () {
  var t = window.__vocabTest;
  t.suite('csvImport');

  var importCsv = window.vocabCsvImport.importCsv;
  var parseCsv = window.vocabCsvImport.parseCsv;

  t.add('parses a simple comma CSV with header', function () {
    var r = importCsv('term,translation\nmerhaba,hello\nlütfen,please\n');
    window.assertEqual(r.fileError, null);
    window.assertEqual(r.delimiter, ',');
    window.assertEqual(r.headerDetected, true);
    window.assertEqual(r.accepted.length, 2);
    window.assertEqual(r.accepted[0].term, 'merhaba');
    window.assertEqual(r.accepted[1].translation, 'please');
    window.assertEqual(r.skipped.length, 0);
  });

  t.add('auto-detects semicolon delimiter', function () {
    var r = importCsv('kelime;çeviri\nmerhaba;hello\ngünaydın;good morning\n');
    window.assertEqual(r.delimiter, ';');
    window.assertEqual(r.accepted.length, 2);
    window.assertEqual(r.accepted[1].term, 'günaydın');
  });

  t.add('auto-detects tab delimiter', function () {
    var r = importCsv('term\ttranslation\nmerhaba\thello\n');
    window.assertEqual(r.delimiter, '\t');
    window.assertEqual(r.accepted.length, 1);
  });

  t.add('handles RFC-4180 quoted fields with embedded commas', function () {
    var r = importCsv('term,translation,example\nkitap,book,"Bu bir kitap, güzel"\n');
    window.assertEqual(r.accepted.length, 1);
    window.assertEqual(r.accepted[0].extras.example, 'Bu bir kitap, güzel');
  });

  t.add('handles doubled double-quotes inside a quoted field', function () {
    var r = importCsv('term,translation\nkitap,"""book"""\n');
    window.assertEqual(r.accepted[0].translation, '"book"');
  });

  t.add('preserves Turkish characters ç ğ ı ö ş ü', function () {
    var r = importCsv('term,translation\nçocuk,child\nöğrenci,student\nşarkı,song\nüniversite,university\n');
    window.assertEqual(r.accepted.length, 4);
    window.assertEqual(r.accepted[0].term, 'çocuk');
    window.assertEqual(r.accepted[1].term, 'öğrenci');
    window.assertEqual(r.accepted[2].term, 'şarkı');
    window.assertEqual(r.accepted[3].term, 'üniversite');
  });

  t.add('skips empty row silently', function () {
    var r = importCsv('term,translation\nmerhaba,hello\n\nlütfen,please\n');
    window.assertEqual(r.accepted.length, 2);
    var emptyReasons = r.skipped.filter(function (s) { return s.reason === 'empty_row'; });
    window.assertEqual(emptyReasons.length, 1);
  });

  t.add('skips row with missing required field', function () {
    var r = importCsv('term,translation\nmerhaba,\n,hello\nlütfen,please\n');
    window.assertEqual(r.accepted.length, 1);
    var missing = r.skipped.filter(function (s) { return s.reason === 'missing_required_field'; });
    window.assertEqual(missing.length, 2);
  });

  t.add('dedups within a single file (case-insensitive, trimmed)', function () {
    var r = importCsv('term,translation\nmerhaba,hello\n MERHABA ,hi\nlütfen,please\n');
    window.assertEqual(r.accepted.length, 2);
    var dupes = r.skipped.filter(function (s) { return s.reason === 'duplicate_within_file'; });
    window.assertEqual(dupes.length, 1);
  });

  t.add('dedups against existing deck terms', function () {
    var existing = new Set(['merhaba']);
    var r = importCsv('term,translation\nMerhaba,hello\nlütfen,please\n', { existingTerms: existing });
    window.assertEqual(r.accepted.length, 1);
    window.assertEqual(r.accepted[0].term, 'lütfen');
    var d = r.skipped.filter(function (s) { return s.reason === 'duplicate_in_deck'; });
    window.assertEqual(d.length, 1);
  });

  t.add('rejects files exceeding 2000 rows up front', function () {
    var parts = ['term,translation'];
    for (var i = 0; i < 2001; i++) parts.push('t' + i + ',v' + i);
    var r = importCsv(parts.join('\n'));
    window.assertEqual(r.fileError, 'too_many_rows');
    window.assertEqual(r.accepted.length, 0);
  });

  t.add('rejects unrecognized delimiter', function () {
    var r = importCsv('term|translation\nmerhaba|hello\n');
    window.assertEqual(r.fileError, 'unrecognized_delimiter');
  });

  t.add('skips rows exceeding 200 chars', function () {
    var longTerm = new Array(202).join('x');
    var r = importCsv('term,translation\n' + longTerm + ',hello\nok,also ok\n');
    window.assertEqual(r.accepted.length, 1);
    var tooLong = r.skipped.filter(function (s) { return s.reason === 'too_long'; });
    window.assertEqual(tooLong.length, 1);
  });

  t.add('auto-detects header when row 0 is non-empty and distinct from data', function () {
    var p = parseCsv('term,translation\nmerhaba,hello\n');
    window.assert(p.headerDetected === true, 'expected header detected');
  });

  t.add('treats all rows as data when any header cell is empty', function () {
    var p = parseCsv('merhaba,\niyi,good\n');
    window.assert(p.headerDetected === false, 'expected no header');
  });

  t.add('preserves extra metadata columns', function () {
    var r = importCsv('term,translation,pos,example\nkitap,book,noun,bir kitap\n');
    window.assertEqual(r.accepted[0].extras.pos, 'noun');
    window.assertEqual(r.accepted[0].extras.example, 'bir kitap');
  });
})();
