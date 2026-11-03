// ==========================
// dashboard.js
// Tabs (Dashboard / Survey / Restrooms), progress dashboard and a
// Notion-style editable database of restrooms. Talks to the same Apps Script
// web app as the survey (WEB_APP_URL, defined in app.js).
// ==========================

(function () {
  const TABS = ["dashboard", "survey", "database"];
  const STATUS_CLASS = { Complete: "complete", "In progress": "progress", "Not started": "none" };
  const STATUS_ORDER = ["Complete", "In progress", "Not started"];

  const DB = { rows: [], progress: {}, total: 82, live: false, loaded: false, loading: null };
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
    if (!p) return { answered: 0, pct: 0, yes: 0, no: 0, na: 0, inspections: 0, last: "" };
    const pct = p.answered >= DB.total ? 100 : Math.min(99, Math.round((p.answered / DB.total) * 100));
    return Object.assign({}, p, { pct });
  }

  function statusOf(row) {
    const p = progressFor(row);
    if (!p.inspections) return "Not started";
    return p.pct >= 100 ? "Complete" : "In progress";
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

  function tag(text, cls) {
    return el("span", `tag ${cls || ""}`, text);
  }

  function setNote(id, text, isError) {
    const node = byId(id);
    node.textContent = text;
    node.classList.toggle("error", !!isError);
  }

  const sortedFloors = () =>
    [...new Set(DB.rows.map((r) => String(r.floor)).filter(Boolean))].sort((a, b) => Number(a) - Number(b));

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
      });
    }
    return DB.loading;
  }

  function renderAll() {
    const note = DB.live
      ? "Live data from the spreadsheet."
      : "Showing a saved copy. Live data needs the Apps Script web app to be reachable (see apps-script/Code.gs).";
    setNote("dashStatus", note, !DB.live);
    setNote("dbStatus", DB.live ? "Connected to the spreadsheet. Changes save automatically." : note, !DB.live);
    fillFilters();
    renderDashboard();
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
    const answered = infos.reduce((a, p) => a + Math.min(p.answered, DB.total), 0);
    const yes = infos.reduce((a, p) => a + p.yes, 0);
    const no = infos.reduce((a, p) => a + p.no, 0);
    const compliance = yes + no ? Math.round((yes / (yes + no)) * 100) : 0;
    const inspections = infos.reduce((a, p) => a + p.inspections, 0);

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

    [
      ["Complete", count("Complete")],
      ["In progress", count("In progress")],
      ["Not started", count("Not started")],
      ["Inspections logged", inspections],
      ["Yes rate (yes ÷ yes+no)", `${compliance}%`]
    ].forEach(([label, value]) => {
      const k = el("div", "kpi");
      k.appendChild(el("div", "label", label));
      k.appendChild(el("div", "value", String(value)));
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
      line.appendChild(name);
      line.appendChild(makeBar(p.pct));
      line.appendChild(el("div", "pct", `${p.pct}%`));
      line.appendChild(makeStack(p));
      line.appendChild(tag(status, STATUS_CLASS[status]));
      roomBars.appendChild(line);
    });
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
    if (by === "type") return ["men", "women", "other"].indexOf(kindOf(row.type)) + "|" + {
      men: "Men", women: "Women", other: "Other"
    }[kindOf(row.type)];
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

  // ---------- Database: render ----------
  function renderDatabase() {
    const rows = visibleRows();
    const table = byId("dbTableWrap");
    const board = byId("dbBoard");
    table.hidden = view.mode !== "table";
    board.hidden = view.mode !== "board";

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
    c.prog.innerHTML = "";
    c.prog.appendChild(el("div", "pct", `${p.pct}% · ${Math.min(p.answered, DB.total)}/${DB.total}`));
    c.prog.appendChild(makeBar(p.pct));
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
        const prog = cell("c-prog");

        const done = cell("c-done");
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = String(row.done).toLowerCase() === "done";
        check.disabled = !DB.live;
        check.addEventListener("change", () => save(row, "done", check.checked ? "done" : "", check));
        done.appendChild(check);

        const notes = cell("c-notes");
        notes.appendChild(textInput(row, "notes"));
        const state = cell("c-state");

        tr.append(room, floor, type, status, prog, done, notes, state);
        row._cells = { status, prog, state };
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

        card.appendChild(el("div", "pct", `${p.pct}%`));
        card.appendChild(makeBar(p.pct));
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
    if (name !== "survey") ensureLoaded();
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

  showTab(location.hash.slice(1));
})();
