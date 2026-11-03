// ==========================
// dashboard.js
// Tabs (Dashboard / Survey / Restrooms), progress dashboard, inspection history
// (duplicate detection) and a Notion-style editable database of restrooms.
// Talks to the same Apps Script web app as the survey (WEB_APP_URL, app.js).
// ==========================

(function () {
  const TABS = ["dashboard", "survey", "database", "duplicates"];
  const STATUS_CLASS = {
    Complete: "complete",
    "In progress": "progress",
    "Needs review": "review",
    "Not started": "none"
  };
  const STATUS_ORDER = ["Complete", "Needs review", "In progress", "Not started"];
  const HISTORY_CLASS = {
    Current: "complete",
    Previous: "none",
    Superseded: "progress",
    Duplicate: "progress",
    Ignored: "none"
  };
  // Plain-language names for the technical statuses stored in the sheet.
  const HISTORY_LABEL = {
    Current: "Counts",
    Previous: "Older inspection",
    Superseded: "Replaced",
    Duplicate: "Duplicate",
    Ignored: "Ignored"
  };
  const HISTORY_HINT = {
    Current: "Current: the inspection the Dashboard uses.",
    Previous: "Previous: an earlier visit kept as history.",
    Superseded: "Superseded: sent minutes after another one for the same restroom, replaced by it.",
    Duplicate: "Duplicate: exactly the same answers as another one sent just before.",
    Ignored: "Ignored: you chose to ignore it."
  };

  const DB = { rows: [], progress: {}, history: [], total: 82, live: false, loaded: false, loading: null };
  const view = { mode: "table" };

  const byId = (id) => document.getElementById(id);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------- Helpers ----------
  function kindOf(type) {
    const t = String(type || "").toLowerCase();
    // check "women" first: "women's" contains "men's"
    if (t.includes("women")) return "women";
    if (t.includes("men")) return "men";
    return "other";
  }

  const normRoom = (room) => String(room == null ? "" : room).trim().toUpperCase();
  const floorLabel = (floor) => (floor === "" || floor == null ? "No floor" : `Floor ${floor}`);

  function progressFor(row) {
    const p = DB.progress[normRoom(row.room)];
    if (!p || !p.hasCurrent) {
      return { answered: 0, pct: 0, yes: 0, no: 0, na: 0, unsure: 0, inspections: p ? p.inspections : 0, date: "", has: false };
    }
    const answered = Math.min(p.answered, DB.total);
    const pct = answered >= DB.total ? 100 : Math.min(99, Math.round((answered / DB.total) * 100));
    return Object.assign({}, p, { answered, pct, has: true });
  }

  function statusOf(row) {
    const p = progressFor(row);
    if (!p.has) return "Not started";
    const blank = DB.total - p.answered - (p.unsure || 0);
    if (blank > 0) return "In progress";
    if (p.unsure > 0) return "Needs review";
    return "Complete";
  }

  function barClass(pct) {
    if (pct >= 100) return "complete";
    if (pct > 0) return "progress";
    return "none";
  }

  function makeBar(pct, extra) {
    const bar = el("div", `bar ${barClass(pct)}${extra ? " " + extra : ""}`);
    const fill = document.createElement("span");
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    return bar;
  }

  function makeStack(p) {
    const stack = el("div", "stack");
    stack.title = `Yes ${p.yes} · No ${p.no} · N/A ${p.na}`;
    const total = p.yes + p.no + p.na;
    if (total) {
      [["y", p.yes], ["n", p.no], ["a", p.na]].forEach(([cls, n]) => {
        const seg = el("span", cls);
        seg.style.width = `${(n / total) * 100}%`;
        stack.appendChild(seg);
      });
    }
    return stack;
  }

  const tag = (text, cls) => el("span", `tag ${cls || ""}`, text);

  function setNote(id, text, isError) {
    const node = byId(id);
    node.textContent = text;
    node.classList.toggle("error", !!isError);
  }

  const sortedFloors = () =>
    [...new Set(DB.rows.map((r) => String(r.floor)).filter(Boolean))].sort((a, b) => Number(a) - Number(b));

  const typeOf = (room) => {
    const r = DB.rows.find((x) => normRoom(x.room) === normRoom(room));
    return r ? r.type : "";
  };

  // ---------- Load ----------
  async function load() {
    try {
      const res = await fetch(`${WEB_APP_URL}?action=restroomData`);
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.rows)) throw new Error("Unexpected response");
      DB.rows = data.rows;
      setProgress(data.progress);
      DB.live = true;
    } catch (err) {
      console.warn("Live data unavailable, using the saved copy.", err);
      const [rows, progress] = await Promise.all([
        fetch("./restroom-list.json").then((r) => r.json()),
        fetch("./restroom-progress.json").then((r) => r.json())
      ]);
      DB.rows = rows;
      setProgress(progress);
      DB.live = false;
    }
    DB.rows.forEach((r) => {
      r.savedRoom = r.room;
    });
    DB.loaded = true;
  }

  function setProgress(progress) {
    DB.total = (progress && progress.total) || 82;
    DB.history = (progress && progress.inspections) || [];
    DB.progress = {};
    ((progress && progress.rooms) || []).forEach((p) => {
      DB.progress[normRoom(p.room)] = p;
    });
  }

  function ensureLoaded() {
    if (DB.loaded) return Promise.resolve();
    if (!DB.loading) {
      DB.loading = load().then(() => {
        renderAll();
        document.dispatchEvent(new Event("ada:data"));
      });
    }
    return DB.loading;
  }

  async function refresh() {
    DB.loaded = false;
    DB.loading = null;
    await ensureLoaded();
  }

  function renderAll() {
    const note = DB.live
      ? "Live data from the spreadsheet."
      : "Showing a saved copy. Live data needs the Apps Script web app to be reachable (see apps-script/Code.gs).";
    setNote("dashStatus", note, !DB.live);
    setNote("dbStatus", DB.live ? "Connected to the spreadsheet. Changes save automatically." : note, !DB.live);
    fillFilters();
    renderDashboard();
    renderHistory();
    renderDatabase();
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const rows = DB.rows;
    const infos = rows.map(progressFor);
    const n = rows.length;
    const overall = n ? Math.round(infos.reduce((a, p) => a + p.pct, 0) / n) : 0;
    const statuses = rows.map(statusOf);
    const count = (s) => statuses.filter((x) => x === s).length;
    const inspected = n - count("Not started");
    const answered = infos.reduce((a, p) => a + p.answered, 0);
    const yes = infos.reduce((a, p) => a + p.yes, 0);
    const no = infos.reduce((a, p) => a + p.no, 0);
    const compliance = yes + no ? Math.round((yes / (yes + no)) * 100) : 0;
    const received = Object.values(DB.progress).reduce((a, p) => a + p.inspections, 0);
    const flagged = DB.history.filter((h) => ["Superseded", "Duplicate", "Ignored"].includes(h.status)).length;

    const kpis = byId("kpis");
    kpis.innerHTML = "";

    const total = el("div", "kpi total");
    total.appendChild(el("div", "label", "Overall progress"));
    total.appendChild(el("div", "value", `${overall}%`));
    total.appendChild(makeBar(overall, "big"));
    total.appendChild(
      el("div", "sub", `${inspected} of ${n} restrooms inspected · ${answered} of ${n * DB.total} questions answered`)
    );
    kpis.appendChild(total);

    const goStatus = (status) => () => {
      byId("dbStatusFilter").value = status;
      byId("dbType").value = "all";
      byId("dbFloor").value = "all";
      byId("dbSearch").value = "";
      showTab("database");
      renderDatabase();
    };
    const goDuplicates = () => showTab("duplicates");

    [
      ["Complete", count("Complete"), "See these restrooms", goStatus("Complete")],
      ["In progress", count("In progress"), "See which questions are missing", goStatus("In progress")],
      ["Needs review", count("Needs review"), "See these restrooms", goStatus("Needs review")],
      ["Not started", count("Not started"), "See these restrooms", goStatus("Not started")],
      ["Inspections received", received, "Review inspections", goDuplicates],
      ["Duplicates flagged", flagged, "Review duplicates", goDuplicates],
      ["Yes rate (yes ÷ yes+no)", `${compliance}%`, null, null]
    ].forEach(([label, value, hint, action]) => {
      const k = el("div", "kpi");
      k.appendChild(el("div", "label", label));
      k.appendChild(el("div", "value", String(value)));
      if (action) {
        k.classList.add("link");
        k.setAttribute("role", "button");
        k.tabIndex = 0;
        k.appendChild(el("div", "go", `${hint} →`));
        k.addEventListener("click", action);
        k.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            action();
          }
        });
      }
      kpis.appendChild(k);
    });

    // by floor
    const floorBars = byId("floorBars");
    floorBars.innerHTML = "";
    sortedFloors().forEach((f) => {
      const inFloor = rows.filter((r) => String(r.floor) === f);
      const pct = Math.round(inFloor.reduce((a, r) => a + progressFor(r).pct, 0) / inFloor.length);
      const done = inFloor.filter((r) => statusOf(r) === "Complete").length;
      const line = el("div", "floor-row");
      line.appendChild(el("strong", "", floorLabel(f)));
      line.appendChild(makeBar(pct));
      line.appendChild(el("div", "meta-text", `${pct}% · ${done}/${inFloor.length} complete`));
      floorBars.appendChild(line);
    });

    // by restroom
    const roomBars = byId("roomBars");
    roomBars.innerHTML = "";
    sortRows(rows.slice(), "floor").forEach((r) => {
      const p = progressFor(r);
      const status = statusOf(r);
      const line = el("div", "room-row");

      const name = el("div", "name", r.room);
      name.appendChild(el("small", "", `${floorLabel(r.floor)} · ${r.type}`));
      if (p.has && p.date) {
        name.appendChild(el("small", "", `Inspected ${p.date}${p.inspector ? ` · by ${p.inspector}` : ""}`));
      }
      if (p.has && p.currentId) {
        const b = el("button", "row-link", status === "Complete" ? "View details" : "See what's missing");
        b.type = "button";
        b.addEventListener("click", () => openDetail(p.currentId));
        name.appendChild(b);
      }
      line.appendChild(name);

      const prog = el("div", "cell c-prog");
      prog.appendChild(makeBar(p.pct));
      prog.appendChild(
        el("div", "sub", p.has ? `${p.answered} of ${DB.total} answered · ${p.pct}%` : "Not inspected yet")
      );
      line.appendChild(prog);

      const mix = el("div", "cell c-mix");
      mix.appendChild(makeStack(p));
      const parts = p.has
        ? [`${p.yes} yes`, `${p.no} no`, `${p.na} n/a`].concat(p.unsure ? [`${p.unsure} not sure`] : [])
        : [];
      mix.appendChild(el("div", "sub", parts.length ? parts.join(" · ") : "—"));
      line.appendChild(mix);

      line.appendChild(tag(status, STATUS_CLASS[status]));
      roomBars.appendChild(line);
    });
  }

  // ---------- Inspection history & duplicates (Duplicates tab) ----------
  const fmtDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";

  async function applyOverrides(changes, buttons) {
    if (!DB.live) {
      alert("Changing this needs the live connection to the spreadsheet.");
      return;
    }
    buttons.forEach((b) => {
      b.disabled = true;
    });
    try {
      const data = await post({ action: "setInspectionOverrides", changes });
      if (!data.ok) throw new Error(data.error || "Could not save");
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Could not save that change.");
      buttons.forEach((b) => {
        b.disabled = false;
      });
    }
  }

  function renderHistory() {
    const list = byId("historyList");
    list.innerHTML = "";

    const hist = DB.history;
    const auto = hist.filter((h) => h.status === "Superseded" || h.status === "Duplicate").length;
    const prev = hist.filter((h) => h.status === "Previous").length;
    const ignored = hist.filter((h) => h.status === "Ignored").length;

    const badge = byId("dupBadge");
    badge.textContent = String(auto);
    badge.hidden = auto === 0;

    if (!hist.length) {
      byId("historySummary").textContent = DB.live
        ? "No restroom has more than one inspection."
        : "The history needs the live connection to the spreadsheet.";
      return;
    }

    byId("historySummary").textContent =
      `${auto + prev + ignored} extra inspections in ${new Set(hist.map((h) => h.room)).size} restrooms: ` +
      `${auto} flagged automatically as duplicates or replaced submissions, ${prev} older inspections kept as history` +
      (ignored ? `, ${ignored} ignored by you` : "") +
      ". Nothing is deleted; the one labeled Counts is what the Dashboard uses.";

    const rooms = [...new Set(hist.map((h) => h.room))];
    rooms.forEach((room) => {
      const items = hist.filter((h) => h.room === room);
      const counts = items.find((h) => h.status === "Current");
      const box = el("details", "hist");
      const sum = document.createElement("summary");
      sum.appendChild(el("strong", "", room));
      sum.appendChild(el("span", "hist-meta", `${typeOf(room)} · ${items.length} inspections`));
      if (counts) {
        sum.appendChild(
          el("span", "hist-meta", `Counts: ${counts.date}${counts.inspector ? ` by ${counts.inspector}` : ""}`)
        );
      }
      box.appendChild(sum);

      // room-level action: keep only the newest
      const newest = items.slice().sort((a, b) => String(a.submitted).localeCompare(String(b.submitted))).pop();
      const head = el("div", "hist-head");
      head.appendChild(
        el("span", "hist-note", `Newest was sent ${fmtDateTime(newest.submitted)}${newest.inspector ? ` by ${newest.inspector}` : ""}.`)
      );
      const keep = el("button", "btn-sm", "Keep newest only");
      keep.type = "button";
      keep.title = "Marks the newest as the one that counts and ignores the others. Nothing is deleted.";
      head.appendChild(keep);
      box.appendChild(head);

      const buttons = [keep];

      keep.addEventListener("click", () => {
        const others = items.filter((h) => h.id !== newest.id);
        if (
          !confirm(
            `Keep the newest inspection of ${room} (sent ${fmtDateTime(newest.submitted)}) and ignore the other ` +
              `${others.length}?\n\nNothing is deleted: the others stay in the sheet and you can undo this.`
          )
        ) {
          return;
        }
        applyOverrides(
          [{ inspectionId: newest.id, override: "current" }].concat(
            others.map((h) => ({ inspectionId: h.id, override: "ignore" }))
          ),
          buttons
        );
      });

      items.forEach((h) => {
        const line = el("div", "hist-row");

        const when = el("div", "hist-when", h.date || "");
        const t = fmtDateTime(h.submitted);
        when.appendChild(el("small", "", t ? `sent ${t}` : ""));
        line.appendChild(when);

        const info = el("div", "hist-info");
        const bits = [`${h.answered}/${DB.total} answered`, `${h.yes} yes`, `${h.no} no`, `${h.na} n/a`];
        if (h.unsure) bits.push(`${h.unsure} not sure`);
        info.appendChild(el("div", "", h.inspector ? `By ${h.inspector}` : "Inspector not recorded"));
        info.appendChild(el("small", "", bits.join(" · ")));
        if (h.note) info.appendChild(el("small", "", h.note));
        line.appendChild(info);

        const label = tag(HISTORY_LABEL[h.status] || h.status, HISTORY_CLASS[h.status]);
        label.title = HISTORY_HINT[h.status] || "";
        line.appendChild(label);

        const actions = el("div", "hist-actions");
        const rowButtons = [];

        const details = el("button", "btn-sm secondary", "View details");
        details.type = "button";
        details.addEventListener("click", () => openDetail(h.id));
        actions.appendChild(details);

        if (h.status !== "Current") {
          const b = el("button", "btn-sm secondary", "Keep this one");
          b.type = "button";
          b.addEventListener("click", () => applyOverrides([{ inspectionId: h.id, override: "current" }], buttons.concat(rowButtons)));
          rowButtons.push(b);
          actions.appendChild(b);
        }
        if (h.status !== "Ignored") {
          const b = el("button", "btn-sm secondary", "Ignore");
          b.type = "button";
          b.addEventListener("click", () => applyOverrides([{ inspectionId: h.id, override: "ignore" }], buttons.concat(rowButtons)));
          rowButtons.push(b);
          actions.appendChild(b);
        }
        if (h.override) {
          const b = el("button", "btn-sm secondary", "Undo my choice");
          b.type = "button";
          b.addEventListener("click", () => applyOverrides([{ inspectionId: h.id, override: "" }], buttons.concat(rowButtons)));
          rowButtons.push(b);
          actions.appendChild(b);
        }
        line.appendChild(actions);
        box.appendChild(line);
      });

      list.appendChild(box);
    });
  }

  // ---------- Inspection details (what was answered, what was left blank) ----------
  function closeDetail() {
    byId("detailModal").hidden = true;
    if (byId("reviewModal").hidden) document.body.style.overflow = "";
  }

  byId("detailModal").addEventListener("click", (e) => {
    if (e.target === byId("detailModal")) closeDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !byId("detailModal").hidden) closeDetail();
  });

  async function fetchInspection(id) {
    const res = await fetch(`${WEB_APP_URL}?action=inspection&id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Inspection not found");
    return data;
  }

  function statusForId(id) {
    const h = DB.history.find((x) => x.id === id);
    if (h) return h.status;
    return Object.values(DB.progress).some((p) => p.currentId === id) ? "Current" : "";
  }

  async function openDetail(id) {
    const body = byId("detailBody");
    const actions = byId("detailActions");
    body.innerHTML = "";
    actions.innerHTML = "";
    body.appendChild(el("p", "status-note", "Loading…"));
    byId("detailModal").hidden = false;
    document.body.style.overflow = "hidden";

    const closeBtn = el("button", "secondary", "Close");
    closeBtn.type = "button";
    closeBtn.addEventListener("click", closeDetail);

    try {
      const data = await fetchInspection(id);
      renderDetail(data, closeBtn);
    } catch (err) {
      console.error(err);
      body.innerHTML = "";
      body.appendChild(el("div", "rv-error", "Could not load this inspection. Check the connection and try again."));
      actions.appendChild(closeBtn);
    }
  }

  function renderDetail(data, closeBtn) {
    const m = data.inspection;
    const body = byId("detailBody");
    const actions = byId("detailActions");
    body.innerHTML = "";
    actions.innerHTML = "";

    const status = statusForId(m.id);
    byId("detailTitle").textContent = `Room ${m.room} · inspection details`;

    const grid = el("div", "detail-meta");
    const add = (label, value) => {
      const d = document.createElement("div");
      d.appendChild(el("small", "", label));
      d.appendChild(el("strong", "", value || "—"));
      grid.appendChild(d);
    };
    add("Restroom", `${m.room} · Floor ${m.floor} · ${m.type}`);
    add("Inspection date", m.date);
    add("Inspector", m.inspector || "Not recorded");
    add("Sent", fmtDateTime(m.submitted));
    add("Label", status ? HISTORY_LABEL[status] || status : "—");
    body.appendChild(grid);

    if (status && HISTORY_HINT[status]) body.appendChild(el("p", "status-note", HISTORY_HINT[status]));

    const questions = typeof FORM_CONFIG !== "undefined" && FORM_CONFIG ? FORM_CONFIG.questions : null;
    if (!questions) {
      body.appendChild(el("p", "status-note", "The survey questions are still loading. Close this and try again."));
      actions.appendChild(closeBtn);
      return;
    }

    const issues = [];
    const unsure = [];
    const blank = [];
    const t = { yes: 0, no: 0, na: 0, unsure: 0, blank: 0 };

    const matched = matchAnswers(questions, data.answers);
    questions.forEach((q, i) => {
      const rec = matched[i];
      const a = rec ? rec.answer : "";
      if (a === "yes") t.yes++;
      else if (a === "no") {
        t.no++;
        issues.push({ q, extra: (q.solutionsIfNo || [])[0] ? `Suggested: ${q.solutionsIfNo[0]}` : "" });
      } else if (a === "na") t.na++;
      else if (a === "unsure") {
        t.unsure++;
        unsure.push({ q, extra: rec && rec.notes ? `Note: ${rec.notes}` : "No note" });
      } else {
        t.blank++;
        blank.push({ q, extra: rec ? "" : "Not part of the form version used for this inspection" });
      }
    });

    const chips = el("div", "rv-chips");
    chips.appendChild(el("span", "rv-chip y", `${t.yes} Yes`));
    chips.appendChild(el("span", "rv-chip n", `${t.no} No`));
    chips.appendChild(el("span", "rv-chip", `${t.na} N/A`));
    chips.appendChild(el("span", "rv-chip u", `${t.unsure} Not sure`));
    chips.appendChild(el("span", "rv-chip", `${t.blank} Unanswered`));
    body.appendChild(chips);

    if (blank.length) body.appendChild(listSection("Questions left unanswered", blank, false));
    if (unsure.length) body.appendChild(listSection("Marked Not sure", unsure, false));
    if (issues.length) body.appendChild(listSection("Issues found (answered No)", issues, false));
    if (!blank.length && !unsure.length) {
      body.appendChild(el("p", "rv-ok", "Every question has an answer in this inspection."));
    }

    actions.appendChild(closeBtn);
    if (blank.length || unsure.length) {
      const fix = el("button", "primary", "Complete the missing answers");
      fix.type = "button";
      fix.addEventListener("click", () => {
        closeDetail();
        completeFrom(data);
      });
      actions.appendChild(fix);
      body.appendChild(
        el(
          "div",
          "rv-warn",
          "Completing opens the survey with these answers filled in, so you only answer what is missing. " +
            "It is saved as a new inspection and the old one stays as history."
        )
      );
    }
  }

  function completeFrom(data) {
    if (!window.SURVEY) return;
    window.SURVEY.loadFrom(data);
    showTab("survey");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function completeInspection(id) {
    try {
      completeFrom(await fetchInspection(id));
    } catch (err) {
      console.error(err);
      alert("Could not load that inspection. Check the connection and try again.");
    }
  }

  // ---------- Database: filters / sorting ----------
  function fillFilters() {
    const floors = sortedFloors();

    const floorSel = byId("dbFloor");
    const current = floorSel.value;
    floorSel.innerHTML = '<option value="all">All floors</option>';
    floors.forEach((f) => {
      const opt = el("option", "", floorLabel(f));
      opt.value = f;
      floorSel.appendChild(opt);
    });
    floorSel.value = floors.includes(current) ? current : "all";

    const newFloor = byId("newFloor");
    const keep = newFloor.value;
    newFloor.innerHTML = "";
    [...new Set(["1", "2", "3", "4", "5", "6", ...floors])]
      .sort((a, b) => Number(a) - Number(b))
      .forEach((f) => {
        const opt = el("option", "", floorLabel(f));
        opt.value = f;
        newFloor.appendChild(opt);
      });
    if (keep) newFloor.value = keep;

    const list = byId("typeOptions");
    list.innerHTML = "";
    [...new Set(DB.rows.map((r) => r.type).filter(Boolean))].forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      list.appendChild(opt);
    });
  }

  function sortRows(rows, key) {
    const byFloor = (a, b) => Number(a.floor) - Number(b.floor);
    const byRoom = (a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true });
    return rows.sort((a, b) => {
      if (key === "room") return byRoom(a, b);
      if (key === "type") return kindOf(a.type).localeCompare(kindOf(b.type)) || byFloor(a, b) || byRoom(a, b);
      if (key === "progress") return progressFor(b).pct - progressFor(a).pct || byFloor(a, b) || byRoom(a, b);
      if (key === "status") {
        return STATUS_ORDER.indexOf(statusOf(a)) - STATUS_ORDER.indexOf(statusOf(b)) || byFloor(a, b) || byRoom(a, b);
      }
      return byFloor(a, b) || byRoom(a, b);
    });
  }

  function visibleRows() {
    const q = byId("dbSearch").value.trim().toLowerCase();
    const kind = byId("dbType").value;
    const floor = byId("dbFloor").value;
    const status = byId("dbStatusFilter").value;
    const rows = DB.rows.filter(
      (r) =>
        (kind === "all" || kindOf(r.type) === kind) &&
        (floor === "all" || String(r.floor) === floor) &&
        (status === "all" || statusOf(r) === status) &&
        (!q || [r.room, r.type, r.notes, floorLabel(r.floor)].join(" ").toLowerCase().includes(q))
    );
    return sortRows(rows, byId("dbSort").value);
  }

  function groupKey(row, by) {
    if (by === "type") {
      const k = kindOf(row.type);
      return ["men", "women", "other"].indexOf(k) + "|" + { men: "Men", women: "Women", other: "Other" }[k];
    }
    if (by === "status") return STATUS_ORDER.indexOf(statusOf(row)) + "|" + statusOf(row);
    return String(row.floor).padStart(3, "0") + "|" + floorLabel(row.floor);
  }

  function groupRows(rows, by) {
    const map = new Map();
    rows.forEach((r) => {
      const k = groupKey(r, by);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => ({ title: k.split("|")[1], rows: list }));
  }

  // ---------- Database: render (data + status only; bars live in the Dashboard) ----------
  function renderDatabase() {
    const rows = visibleRows();
    byId("dbTableWrap").hidden = view.mode !== "table";
    byId("dbBoard").hidden = view.mode !== "board";

    if (view.mode === "board") renderBoard(rows);
    else renderTable(rows);
  }

  function textInput(row, field) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = row[field] == null ? "" : row[field];
    input.disabled = !DB.live;
    if (field === "type") input.setAttribute("list", "typeOptions");
    input.addEventListener("change", () => save(row, field, input.value.trim(), input));
    return input;
  }

  function cell(cls) {
    const td = document.createElement("td");
    td.className = cls;
    return td;
  }

  function fillStatusCells(row) {
    const p = progressFor(row);
    const status = statusOf(row);
    const c = row._cells;
    if (!c) return;
    c.status.innerHTML = "";
    c.status.appendChild(tag(status, STATUS_CLASS[status]));
    c.last.textContent = p.has && p.date ? p.date : "—";
  }

  function renderTable(rows) {
    const body = byId("dbBody");
    body.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = el("td", "", "No restrooms match these filters.");
      td.colSpan = 8;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    const by = byId("dbGroup").value;
    const groups = by === "none" ? [{ title: null, rows }] : groupRows(rows, by);

    groups.forEach((g) => {
      if (g.title) {
        const tr = el("tr", "group");
        const td = el("td", "", `${g.title}  (${g.rows.length})`);
        td.colSpan = 8;
        tr.appendChild(td);
        body.appendChild(tr);
      }

      g.rows.forEach((row) => {
        const tr = document.createElement("tr");

        const room = cell("c-room");
        room.appendChild(textInput(row, "room"));
        const floor = cell("c-floor");
        floor.appendChild(textInput(row, "floor"));
        const type = cell("c-type");
        type.appendChild(textInput(row, "type"));
        const status = cell("c-status");
        const last = cell("c-last");

        const done = cell("c-done");
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = String(row.done).toLowerCase() === "done";
        check.disabled = !DB.live;
        check.title = "Your own checkmark (separate from the Status)";
        check.addEventListener("change", () => save(row, "done", check.checked ? "done" : "", check));
        done.appendChild(check);

        const notes = cell("c-notes");
        notes.appendChild(textInput(row, "notes"));
        const state = cell("c-state");

        tr.append(room, floor, type, status, last, done, notes, state);
        row._cells = { status, last, state };
        fillStatusCells(row);
        body.appendChild(tr);
      });
    });
  }

  function renderBoard(rows) {
    const board = byId("dbBoard");
    board.innerHTML = "";
    const by = byId("dbGroup").value === "none" ? "floor" : byId("dbGroup").value;

    if (!rows.length) {
      board.appendChild(el("p", "status-note", "No restrooms match these filters."));
      return;
    }

    groupRows(rows, by).forEach((g) => {
      const col = el("div", "col");
      col.appendChild(el("h4", "", `${g.title}  (${g.rows.length})`));

      g.rows.forEach((row) => {
        const p = progressFor(row);
        const status = statusOf(row);
        const card = el("div", "card");
        card.appendChild(el("div", "room", row.room));

        const tags = el("div", "row");
        tags.appendChild(tag(row.type || "—", kindOf(row.type)));
        tags.appendChild(tag(status, STATUS_CLASS[status]));
        card.appendChild(tags);

        card.appendChild(el("div", "note", p.has && p.date ? `Last inspected ${p.date}` : "Not inspected yet"));
        if (row.notes) card.appendChild(el("div", "note", row.notes));
        col.appendChild(card);
      });

      board.appendChild(col);
    });
  }

  // ---------- Database: save / add ----------
  async function post(payload) {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async function save(row, field, value, control) {
    const previous = row[field];
    if (String(previous == null ? "" : previous) === String(value)) return;

    const state = row._cells && row._cells.state;
    const setState = (text, cls) => {
      if (!state) return;
      state.textContent = text;
      state.className = `c-state ${cls || ""}`;
    };

    row[field] = value;
    setState("Saving…");

    try {
      const data = await post({
        action: "updateRestroom",
        row: row.row,
        expectedRoom: row.savedRoom,
        field,
        value
      });
      if (!data.ok) throw new Error(data.error || "Save failed");
      if (field === "room") row.savedRoom = value;
      setState("Saved ✓", "ok");
      fillStatusCells(row);
      renderDashboard();
      fillFilters();
      document.dispatchEvent(new Event("ada:data"));
    } catch (err) {
      console.error("Save failed:", err);
      row[field] = previous;
      if (control.type === "checkbox") control.checked = String(previous).toLowerCase() === "done";
      else control.value = previous == null ? "" : previous;
      setState("Not saved ✗", "error");
    }
  }

  async function addRestroom() {
    const floor = byId("newFloor").value;
    const room = byId("newRoom").value.trim();
    const type = byId("newType").value.trim();
    if (!room || !type) {
      alert("Please enter a room and a type.");
      return;
    }
    if (DB.rows.some((r) => normRoom(r.room) === normRoom(room))) {
      alert(`Room ${room} is already in the list.`);
      return;
    }

    const saveBtn = byId("newSave");
    saveBtn.disabled = true;
    try {
      const data = await post({ action: "addRestroom", floor, room, type, notes: "" });
      if (!data.ok) throw new Error(data.error || "Could not add");
      DB.rows.push({ row: data.row, floor, type, room, done: "", notes: "", savedRoom: room });
      byId("newRoom").value = "";
      byId("newType").value = "";
      byId("dbNew").hidden = true;
      fillFilters();
      renderDashboard();
      renderDatabase();
      document.dispatchEvent(new Event("ada:data"));
    } catch (err) {
      console.error("Add failed:", err);
      alert("Could not add the restroom. Is the live connection available?");
    } finally {
      saveBtn.disabled = false;
    }
  }

  // ---------- Tabs ----------
  function showTab(name) {
    if (!TABS.includes(name)) name = "dashboard";
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    TABS.forEach((t) => byId(`panel-${t}`).classList.toggle("active", t === name));
    try {
      history.replaceState(null, "", `#${name}`);
    } catch (e) {
      /* ignore */
    }
    ensureLoaded();
  }

  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  byId("dbViews").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (!btn) return;
    view.mode = btn.dataset.view;
    byId("dbViews").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
    if (DB.loaded) renderDatabase();
  });

  ["dbType", "dbFloor", "dbStatusFilter", "dbSort", "dbGroup"].forEach((id) =>
    byId(id).addEventListener("change", () => DB.loaded && renderDatabase())
  );
  byId("dbSearch").addEventListener("input", () => DB.loaded && renderDatabase());

  byId("dbAdd").addEventListener("click", () => {
    if (!DB.live) {
      alert("Adding restrooms needs the live connection to the spreadsheet.");
      return;
    }
    byId("dbNew").hidden = !byId("dbNew").hidden;
    if (!byId("dbNew").hidden) byId("newRoom").focus();
  });
  byId("newCancel").addEventListener("click", () => {
    byId("dbNew").hidden = true;
  });
  byId("newSave").addEventListener("click", addRestroom);

  // Used by the survey (app.js): room list, per-room info, refresh after a submit.
  window.ADA = {
    loaded: () => DB.loaded,
    rows: () => DB.rows,
    info: (room) => {
      const p = DB.progress[normRoom(room)];
      return {
        inspections: p ? p.inspections : 0,
        date: p && p.date ? p.date : "",
        currentId: p && p.hasCurrent ? p.currentId : "",
        missing: p && p.hasCurrent ? Math.max(0, DB.total - p.answered - (p.unsure || 0)) : 0
      };
    },
    completeInspection,
    refresh,
    showTab
  };

  showTab(location.hash.slice(1));
})();
