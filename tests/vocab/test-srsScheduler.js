// Tests for js/vocab/srsScheduler.js — US3 / T024.
(function () {
  var t = window.__vocabTest;
  t.suite('srsScheduler');
  var srs = window.vocabSrsScheduler;

  function ev(ts, correct) { return { ts: ts, correct: correct, direction: 'termToTranslation', mode: 'quiz' }; }

  t.add('fresh state with no events', function () {
    var s = srs.deriveReviewRecord([]);
    window.assertEqual(s.interval, 0);
    window.assertEqual(s.ease, srs.INITIAL_EASE);
    window.assertEqual(s.streak, 0);
    window.assertEqual(s.totalSeen, 0);
    window.assertEqual(s.dueDate, null);
  });

  t.add('first correct → interval 1, streak 1, ease 2.6', function () {
    var s = srs.deriveReviewRecord([ev(Date.now(), true)]);
    window.assertEqual(s.interval, 1);
    window.assertEqual(s.streak, 1);
    window.assertEqual(s.ease, 2.6);
    window.assertEqual(s.totalSeen, 1);
    window.assert(typeof s.dueDate === 'string' && s.dueDate.length === 10, 'dueDate formatted YYYY-MM-DD');
  });

  t.add('second correct → interval 3, streak 2', function () {
    var now = Date.now();
    var s = srs.deriveReviewRecord([ev(now - 1, true), ev(now, true)]);
    window.assertEqual(s.interval, 3);
    window.assertEqual(s.streak, 2);
    window.assertEqual(s.ease, 2.7);
  });

  t.add('third correct → interval = round(prev * ease)', function () {
    var now = Date.now();
    var s = srs.deriveReviewRecord([ev(now - 2, true), ev(now - 1, true), ev(now, true)]);
    // After 2 corrects: interval=3, ease=2.7; third correct → ease becomes 2.8, interval = round(3 * 2.7) = 8
    window.assertEqual(s.interval, 8);
    window.assertEqual(s.streak, 3);
    window.assertEqual(s.ease, 2.8);
  });

  t.add('incorrect resets interval to 1 and streak to 0, ease drops 0.2', function () {
    var now = Date.now();
    var s = srs.deriveReviewRecord([ev(now - 2, true), ev(now - 1, true), ev(now, false)]);
    window.assertEqual(s.interval, 1);
    window.assertEqual(s.streak, 0);
    // After 2 corrects ease=2.7; incorrect → 2.5
    window.assertEqual(s.ease, 2.5);
  });

  t.add('ease floors at 1.3', function () {
    var events = [];
    for (var i = 0; i < 20; i++) events.push(ev(i, false));
    var s = srs.deriveReviewRecord(events);
    window.assertEqual(s.ease, srs.MIN_EASE);
  });

  t.add('ease caps at 3.0', function () {
    var events = [];
    for (var i = 0; i < 20; i++) events.push(ev(i, true));
    var s = srs.deriveReviewRecord(events);
    window.assertEqual(s.ease, srs.MAX_EASE);
  });

  t.add('event-order replay is deterministic regardless of array order', function () {
    var e1 = ev(1000, true), e2 = ev(2000, false), e3 = ev(3000, true);
    var a = srs.deriveReviewRecord([e1, e2, e3]);
    var b = srs.deriveReviewRecord([e3, e1, e2]); // scrambled
    window.assertEqual(a, b);
  });

  t.add('dueDate formatted YYYY-MM-DD in local TZ', function () {
    // Use a fixed local midnight-ish timestamp to dodge DST edges.
    var noon = new Date(2026, 3, 20, 12, 0, 0).getTime(); // April 20 2026 local
    var s = srs.deriveReviewRecord([ev(noon, true)]);
    // Interval 1 day → due April 21
    window.assertEqual(s.dueDate, '2026-04-21');
  });

  t.add('isDue compares against today local', function () {
    var yesterday = window.vocabSrsScheduler.formatLocalYmd(Date.now() - 86400 * 1000 * 2);
    window.assert(srs.isDue({ dueDate: yesterday }, srs.todayLocalYmd()) === true);
    var future = window.vocabSrsScheduler.formatLocalYmd(Date.now() + 86400 * 1000 * 5);
    window.assert(srs.isDue({ dueDate: future }, srs.todayLocalYmd()) === false);
  });

  t.add('compareOverdue sorts oldest dueDate first', function () {
    var a = { dueDate: '2026-04-15' };
    var b = { dueDate: '2026-04-20' };
    var c = { dueDate: '2026-04-10' };
    var sorted = [a, b, c].sort(srs.compareOverdue);
    window.assertEqual(sorted.map(function (x) { return x.dueDate; }), ['2026-04-10', '2026-04-15', '2026-04-20']);
  });

  t.add('replays 100 events under 10ms', function () {
    var events = [];
    for (var i = 0; i < 100; i++) events.push(ev(i * 1000, i % 3 !== 0));
    var start = performance.now();
    srs.deriveReviewRecord(events);
    var elapsed = performance.now() - start;
    window.assert(elapsed < 10, 'expected <10ms, got ' + elapsed.toFixed(2) + 'ms');
  });
})();
