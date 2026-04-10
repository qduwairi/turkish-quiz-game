// Developer-only error viewer — feature 008-error-tracking.
// Reads /errors from Firebase Realtime Database and renders a latest-first
// list with inspection + delete. Enforces the 500-record retention cap on
// load by deleting the oldest excess.
//
// NOTE: The production rules block anonymous reads of /errors. To run this
// viewer you either need temporarily loosened rules, a local emulator, or
// an authenticated session with read access. See specs/008-error-tracking/
// quickstart.md for the operational options.

(function () {
  var MAX_STORED = 500;

  var listEl = document.getElementById("error-list");
  var countEl = document.getElementById("count");
  var statusEl = document.getElementById("status");
  var emptyEl = document.getElementById("empty");

  var db = firebase.database();
  var errorsRef = db.ref("/errors");
  var capEnforced = false;

  errorsRef.on(
    "value",
    function (snapshot) {
      statusEl.textContent = "live";
      var raw = snapshot.val() || {};
      var entries = Object.keys(raw).map(function (id) {
        return { id: id, data: raw[id] };
      });
      // Firebase push() IDs are chronologically sortable.
      entries.sort(function (a, b) {
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });

      if (!capEnforced && entries.length > MAX_STORED) {
        capEnforced = true;
        var excess = entries.slice(MAX_STORED); // oldest (already sorted desc)
        console.log("[error-viewer] pruning", excess.length, "old records over cap", MAX_STORED);
        for (var i = 0; i < excess.length; i++) {
          errorsRef.child(excess[i].id).remove();
        }
        // The live subscription will fire again with the trimmed set.
        return;
      }

      render(entries);
    },
    function (err) {
      statusEl.textContent = "error: " + (err && err.message ? err.message : String(err));
    }
  );

  function render(entries) {
    countEl.textContent = entries.length + " record" + (entries.length === 1 ? "" : "s");
    if (entries.length === 0) {
      listEl.innerHTML = '<div class="empty">No errors recorded.</div>';
      return;
    }
    // Replace content — no need for incremental diffing at this scale.
    listEl.innerHTML = "";
    for (var i = 0; i < entries.length; i++) {
      listEl.appendChild(renderEntry(entries[i]));
    }
  }

  function renderEntry(entry) {
    var id = entry.id;
    var d = entry.data || {};

    var wrap = document.createElement("div");
    wrap.className = "entry";

    var head = document.createElement("div");
    head.className = "entry-head";
    head.onclick = function () { wrap.classList.toggle("open"); };

    var kind = document.createElement("span");
    kind.className = "kind " + (d.kind || "unknown");
    kind.textContent = d.kind || "unknown";
    head.appendChild(kind);

    var msg = document.createElement("div");
    msg.className = "message";
    msg.textContent = d.message || "(no message)";
    head.appendChild(msg);

    var time = document.createElement("div");
    time.className = "time";
    time.textContent = d.timestamp ? new Date(d.timestamp).toLocaleString() : "";
    head.appendChild(time);

    wrap.appendChild(head);

    var meta = document.createElement("dl");
    meta.className = "entry-meta";
    addMetaRow(meta, "page", d.page || "");
    if (d.operation) addMetaRow(meta, "operation", d.operation);
    var envStr = "";
    if (d.env) {
      envStr = (d.env.browser || "") + " · " + (d.env.os || "") + " · " + (d.env.viewport || "");
    }
    addMetaRow(meta, "env", envStr);
    addMetaRow(meta, "session", d.sessionId || "");
    addMetaRow(meta, "id", id);
    wrap.appendChild(meta);

    var body = document.createElement("div");
    body.className = "entry-body";

    if (d.stack) {
      var stackHead = document.createElement("h3");
      stackHead.textContent = "Stack";
      body.appendChild(stackHead);
      var stackPre = document.createElement("pre");
      stackPre.textContent = d.stack;
      body.appendChild(stackPre);
    }

    if (d.breadcrumbs && d.breadcrumbs.length) {
      var bcHead = document.createElement("h3");
      bcHead.textContent = "Breadcrumbs";
      body.appendChild(bcHead);
      var bcList = document.createElement("ol");
      for (var i = 0; i < d.breadcrumbs.length; i++) {
        var bc = d.breadcrumbs[i];
        var li = document.createElement("li");
        var t = bc && bc.t ? new Date(bc.t).toLocaleTimeString() : "";
        li.textContent = t + " — " + ((bc && bc.msg) || "");
        bcList.appendChild(li);
      }
      body.appendChild(bcList);
    }

    wrap.appendChild(body);

    var actions = document.createElement("div");
    actions.className = "entry-actions";
    var delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.onclick = function (evt) {
      evt.stopPropagation();
      if (!window.confirm("Delete this error record?")) return;
      errorsRef.child(id).remove();
    };
    actions.appendChild(delBtn);
    wrap.appendChild(actions);

    return wrap;
  }

  function addMetaRow(dl, label, value) {
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
})();
