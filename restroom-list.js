// ==========================
// restroom-list.js
// Editable view of the "restroom_list" tab. Reads/writes through the same
// Apps Script web app used by the inspection form (WEB_APP_URL, see app.js).
// ==========================

const rlModal = document.getElementById("restroomModal");
const rlBody = document.getElementById("rlBody");
const rlStatus = document.getElementById("rlStatus");
const rlTypeFilter = document.getElementById("rlType");
const rlFloorFilter = document.getElementById("rlFloor");
const rlSort = document.getElementById("rlSort");
const rlGroup = document.getElementById("rlGroup");

let rlRows = [];
let rlEditable = false;
let rlLoaded = false;

// ---------- Helpers ----------
function rlKind(type) {
  const t = String(type || "").toLowerCase();
  // check "women" first: "women's" contains "men's"
  if (t.includes("women")) return "women";
  if (t.includes("men")) return "men";
  return "other";
}

function rlCategory(floor) {
  return floor === "" || floor == null ? "" : `Floor ${floor}`;
}

function rlSetStatus(text, isError) {
  rlStatus.textContent = text;
  rlStatus.classList.toggle("error", !!isError);
}

function rlCompare(a, b, sort) {
  const byFloor = Number(a.floor) - Number(b.floor);
  const byRoom = String(a.room).localeCompare(String(b.room), undefined, { numeric: true });
  if (sort === "sheet") return a.row - b.row;
  if (sort === "room") return byRoom;
  if (sort === "type") {
    return rlKind(a.type).localeCompare(rlKind(b.type)) || byFloor || byRoom;
  }
  return byFloor || byRoom;
}

// ---------- Load ----------
async function rlLoad() {
  rlSetStatus("Loading…");
  try {
    const res = await fetch(`${WEB_APP_URL}?action=restroomList`);
    const data = await res.json();
    if (!data || !Array.isArray(data.rows)) throw new Error("Unexpected response");
    rlRows = data.rows;
    rlEditable = true;
    rlSetStatus("Connected to the spreadsheet. Changes save automatically.");
  } catch (err) {
    console.warn("Restroom list: live sheet unavailable, using local copy.", err);
    const res = await fetch("./restroom-list.json");
    rlRows = await res.json();
    rlEditable = false;
    rlSetStatus(
      "Showing a saved copy. Live editing needs the updated Apps Script (see apps-script/restroom-list.gs).",
      true
    );
  }

  rlRows.forEach((r) => {
    r.savedRoom = r.room;
  });
  rlLoaded = true;
  rlFillFloors();
  rlRender();
}

function rlFillFloors() {
  const floors = [...new Set(rlRows.map((r) => String(r.floor)).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const current = rlFloorFilter.value;
  rlFloorFilter.innerHTML = '<option value="all">All floors</option>';
  floors.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = rlCategory(f);
    rlFloorFilter.appendChild(opt);
  });
  rlFloorFilter.value = floors.includes(current) ? current : "all";
}

// ---------- Render ----------
function rlTextInput(row, field) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = row[field] ?? "";
  input.disabled = !rlEditable;
  input.addEventListener("change", () => rlSave(row, field, input.value.trim(), input));
  return input;
}

function rlCell(className) {
  const td = document.createElement("td");
  td.className = className;
  return td;
}

function rlRender() {
  const kind = rlTypeFilter.value;
  const floor = rlFloorFilter.value;
  const sort = rlSort.value;

  const visible = rlRows
    .filter((r) => kind === "all" || rlKind(r.type) === kind)
    .filter((r) => floor === "all" || String(r.floor) === floor)
    .sort((a, b) => rlCompare(a, b, sort));

  rlBody.innerHTML = "";

  if (!visible.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "No restrooms match these filters.";
    tr.appendChild(td);
    rlBody.appendChild(tr);
    return;
  }

  const grouped = rlGroup.checked && sort !== "sheet" && sort !== "room";
  let lastFloor = null;

  visible.forEach((row) => {
    if (grouped && String(row.floor) !== lastFloor) {
      lastFloor = String(row.floor);
      const g = document.createElement("tr");
      g.className = "rl-group";
      const gt = document.createElement("td");
      gt.colSpan = 7;
      gt.textContent = rlCategory(row.floor) || "No floor";
      g.appendChild(gt);
      rlBody.appendChild(g);
    }

    const tr = document.createElement("tr");

    const floorTd = rlCell("rl-floor");
    floorTd.appendChild(rlTextInput(row, "floor"));

    const catTd = rlCell("rl-cat");
    catTd.textContent = rlCategory(row.floor);

    const roomTd = rlCell("rl-room");
    roomTd.appendChild(rlTextInput(row, "room"));

    const typeTd = rlCell("rl-type");
    typeTd.appendChild(rlTextInput(row, "type"));

    const doneTd = rlCell("rl-done");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = String(row.done).toLowerCase() === "done";
    check.disabled = !rlEditable;
    check.addEventListener("change", () =>
      rlSave(row, "done", check.checked ? "done" : "", check)
    );
    doneTd.appendChild(check);

    const notesTd = rlCell("rl-notes");
    notesTd.appendChild(rlTextInput(row, "notes"));

    const stateTd = rlCell("rl-state");

    tr.append(floorTd, catTd, roomTd, typeTd, doneTd, notesTd, stateTd);
    tr._state = stateTd;
    tr._cat = catTd;
    row._tr = tr;
    rlBody.appendChild(tr);
  });
}

// ---------- Save ----------
async function rlSave(row, field, value, control) {
  const previous = row[field];
  if (String(previous ?? "") === String(value)) return;

  const stateTd = row._tr && row._tr._state;
  const setState = (text, cls) => {
    if (!stateTd) return;
    stateTd.textContent = text;
    stateTd.className = `rl-state ${cls || ""}`;
  };

  row[field] = value;
  if (field === "floor" && row._tr) row._tr._cat.textContent = rlCategory(value);
  setState("Saving…");

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateRestroom",
        row: row.row,
        expectedRoom: row.savedRoom,
        field,
        value
      })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Save failed");
    if (field === "room") row.savedRoom = value;
    setState("Saved ✓", "ok");
    if (field === "floor") rlFillFloors();
  } catch (err) {
    console.error("Restroom list save failed:", err);
    row[field] = previous;
    if (control.type === "checkbox") control.checked = String(previous).toLowerCase() === "done";
    else control.value = previous ?? "";
    if (field === "floor" && row._tr) row._tr._cat.textContent = rlCategory(previous);
    setState("Not saved ✗", "error");
  }
}

// ---------- Open / close ----------
function rlOpen() {
  rlModal.classList.add("open");
  rlModal.setAttribute("aria-hidden", "false");
  if (!rlLoaded) rlLoad();
}

function rlClose() {
  rlModal.classList.remove("open");
  rlModal.setAttribute("aria-hidden", "true");
}

document.getElementById("restroomListBtn").addEventListener("click", rlOpen);
document.getElementById("rlClose").addEventListener("click", rlClose);
rlModal.addEventListener("click", (e) => {
  if (e.target === rlModal) rlClose();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") rlClose();
});

[rlTypeFilter, rlFloorFilter, rlSort, rlGroup].forEach((el) =>
  el.addEventListener("change", rlRender)
);
