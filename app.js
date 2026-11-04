// ==========================
// app.js — inspection survey
// ==========================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyHf68B5TISRmdCOpvjbb_4vNRm8yyuZ6getsJMwO-yYvlthYxBcrzH_IxAT_frn2yxCw/exec";

const DRAFT_KEY = "ada_checklist_draft_v1";
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SEND_TIMEOUT_MS = 60000;

// [stored value, label, css class]
const ANSWER_OPTIONS = [
  ["yes", "YES", "y"],
  ["no", "NO", "n"],
  ["na", "N/A", "a"],
  ["unsure", "NOT SURE", "u"]
];

let FORM_CONFIG = null;

// DOM
const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");

const floorSelect = document.getElementById("floorSelect");
const roomPick = document.getElementById("roomPick");
const roomInput = document.getElementById("roomInput");
const roomInfo = document.getElementById("roomInfo");
const restroomType = document.getElementById("restroomType");
const inspectionDate = document.getElementById("inspectionDate");
const surveyProgress = document.getElementById("surveyProgress");

const inspectorName = document.getElementById("inspectorName");
const inspectorList = document.getElementById("inspectorList");

const completeBanner = document.getElementById("completeBanner");
const completeText = document.getElementById("completeText");

const draftBanner = document.getElementById("draftBanner");
const draftText = document.getElementById("draftText");

const reviewModal = document.getElementById("reviewModal");
const reviewBody = document.getElementById("reviewBody");
const reviewActions = document.getElementById("reviewActions");
const reviewTitle = document.getElementById("reviewTitle");

// State
const state = {};        // answers + notes
const sectionState = {}; // open/closed
const metaState = { floor: "", room: "", type: "", date: "", inspector: "" };
// Set while the user is filling in the blanks of an earlier inspection (see SURVEY.loadFrom).
let completing = null;
const INSPECTOR_KEY = "ada_inspector_names_v1";
// One id per inspection, created when the form starts (not per click), so a
// retry or double tap can never create a second inspection.
const session = { id: newId(), timestamp: null };
let sending = false;

// Loader (CSS lives in index.html): five crossing strands plus an optional label.
function makeLoader(text, opts) {
  const o = opts || {};
  const wrap = document.createElement("div");
  wrap.className = `loading${o.center ? " center" : ""}`;
  wrap.setAttribute("role", "status");
  const dna = document.createElement("span");
  dna.className = `ld-dna${o.small ? " sm" : ""}${o.light ? " light" : ""}`;
  dna.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 5; i++) dna.appendChild(document.createElement("i"));
  wrap.appendChild(dna);
  if (text) wrap.appendChild(document.createTextNode(text));
  return wrap;
}

// ---------- Helpers ----------
function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function baseCode(code) {
  const parts = String(code).split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : String(code);
}

function getSectionForCode(code) {
  if (!FORM_CONFIG) return null;

  // 1) exact code match first
  for (const section of FORM_CONFIG.sections) {
    if (Array.isArray(section.codes) && section.codes.includes(code)) {
      return section;
    }
  }

  // 2) fallback to base code if needed
  const bc = baseCode(code);
  for (const section of FORM_CONFIG.sections) {
    if (Array.isArray(section.codes) && section.codes.includes(bc)) {
      return section;
    }
  }

  return null;
}

function sectionIdForCode(code) {
  const section = getSectionForCode(code);
  return section ? section.id : null;
}

function sectionTitleForCode(code) {
  const section = getSectionForCode(code);
  return section ? section.title : "";
}

function typeFor(listType) {
  const t = String(listType || "").toLowerCase();
  // check "women" first: "women's" contains "men's"
  if (t.includes("women")) return "Women";
  if (t.includes("men")) return "Men";
  if (t.includes("mother") || t.includes("family")) return "Family";
  return "Unisex";
}

function tally() {
  const t = { yes: 0, no: 0, na: 0, unsure: 0, blank: 0 };
  FORM_CONFIG.questions.forEach((q) => {
    const a = state[q.id];
    if (a && t[a] !== undefined) t[a]++;
    else t.blank++;
  });
  t.total = FORM_CONFIG.questions.length;
  t.answered = t.yes + t.no + t.na;
  return t;
}

function updateMeta() {
  metaState.floor = floorSelect.value || "";
  metaState.room = roomInput.value || "";
  metaState.type = restroomType.value || "";
  metaState.date = inspectionDate.value || "";
  metaState.inspector = (inspectorName.value || "").trim();
  updatePreview();
  updateProgress();
  saveDraft();
}

function validateMeta() {
  return (
    metaState.floor &&
    metaState.room.trim().length > 0 &&
    metaState.type &&
    metaState.date &&
    metaState.inspector.length >= 2
  );
}

// ---------- Inspector name (mandatory, remembered on this device) ----------
function readInspectors() {
  try {
    const list = JSON.parse(localStorage.getItem(INSPECTOR_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function rememberInspector(name) {
  const clean = String(name || "").trim();
  if (clean.length < 2) return;
  try {
    const list = [clean, ...readInspectors().filter((n) => n.toLowerCase() !== clean.toLowerCase())].slice(0, 12);
    localStorage.setItem(INSPECTOR_KEY, JSON.stringify(list));
  } catch (e) {
    /* storage unavailable: the name just won't be remembered */
  }
  fillInspectorList();
}

function fillInspectorList() {
  inspectorList.innerHTML = "";
  readInspectors().forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n;
    inspectorList.appendChild(opt);
  });
}

function lastInspector() {
  return readInspectors()[0] || "";
}

// unanswered questions are allowed; the review screen warns about them
function validateAnswers() {
  return true;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function updateProgress() {
  if (!FORM_CONFIG) return;
  const t = tally();
  const parts = [`${t.answered} of ${t.total} answered`];
  if (t.unsure) parts.push(`${t.unsure} not sure`);
  surveyProgress.textContent = parts.join(" · ");
}

// ---------- Room picker (list comes from dashboard.js) ----------
function populateRooms() {
  if (!window.ADA || !window.ADA.loaded()) return;

  const keep = roomPick.value;
  const rows = window.ADA.rows()
    .slice()
    .sort(
      (a, b) =>
        Number(a.floor) - Number(b.floor) ||
        String(a.room).localeCompare(String(b.room), undefined, { numeric: true })
    );

  roomPick.innerHTML = '<option value="">Select a restroom...</option>';
  rows.forEach((r) => {
    const info = window.ADA.info(r.room);
    const opt = document.createElement("option");
    opt.value = r.room;
    opt.textContent =
      `${r.room} · ${r.type} · Floor ${r.floor}` +
      (info.inspections ? ` — inspected ${info.date}` : " — not inspected");
    roomPick.appendChild(opt);
  });

  const other = document.createElement("option");
  other.value = "__other__";
  other.textContent = "Not in the list…";
  roomPick.appendChild(other);

  if (keep && [...roomPick.options].some((o) => o.value === keep)) roomPick.value = keep;
  showRoomInfo();
}

function showRoomInfo() {
  roomInfo.className = "room-info";
  roomInfo.textContent = "";
  const room = (roomInput.value || "").trim();
  if (!room || !window.ADA || !window.ADA.loaded()) return;

  const known = window.ADA.rows().some((r) => String(r.room).toUpperCase() === room.toUpperCase());
  const info = window.ADA.info(room);

  if (!known) {
    roomInfo.classList.add("warn");
    roomInfo.textContent =
      "This room isn't in the restroom list. Pick it from the list when possible so the dashboard can track it.";
  } else if (info.inspections) {
    roomInfo.classList.add("warn");
    roomInfo.textContent =
      `Already inspected (${info.date}). Submitting again is recorded as a re-inspection; the newest one counts. `;
    if (info.missing > 0 && info.currentId && !completing) {
      const b = el("button", "link-btn", `Edit it and fill in its ${info.missing} unanswered question${info.missing === 1 ? "" : "s"} instead`);
      b.type = "button";
      b.addEventListener("click", () => window.ADA.editInspection(info.currentId));
      roomInfo.appendChild(b);
    }
  } else {
    roomInfo.textContent = "Not inspected yet.";
  }
}

roomPick.addEventListener("change", () => {
  const v = roomPick.value;

  if (v === "__other__") {
    roomInput.hidden = false;
    roomInput.value = "";
    roomInput.focus();
  } else if (v && window.ADA) {
    const row = window.ADA.rows().find((r) => r.room === v);
    roomInput.hidden = true;
    roomInput.value = v;
    if (row) {
      floorSelect.value = String(row.floor);
      restroomType.value = typeFor(row.type);
    }
  } else {
    roomInput.hidden = true;
    roomInput.value = "";
  }

  updateMeta();
  showRoomInfo();
});

document.addEventListener("ada:data", populateRooms);

// ---------- Draft (autosave) ----------
let draftTimer = null;

function hasContent() {
  return !!(metaState.room.trim() || Object.keys(state).length);
}

function saveDraft() {
  if (!FORM_CONFIG) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      // never remove here: an unfinished draft must survive a page load until the user resumes or discards it
      if (!hasContent()) return;
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          v: 1,
          id: session.id,
          timestamp: session.timestamp,
          meta: metaState,
          state,
          completing,
          savedAt: Date.now()
        })
      );
    } catch (e) {
      /* storage unavailable: the survey still works, it just won't autosave */
    }
  }, 400);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    const answered = Object.keys(d.state || {}).filter((k) => !k.endsWith("_notes")).length;
    if (!(d.meta && d.meta.room) && !answered) return null;
    return d;
  } catch (e) {
    return null;
  }
}

function clearDraft() {
  clearTimeout(draftTimer);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    /* ignore */
  }
}

function checkDraft() {
  const d = readDraft();
  if (!d) return;

  const answered = Object.keys(d.state || {}).filter((k) => !k.endsWith("_notes")).length;
  const when = new Date(d.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  draftText.textContent =
    `You have an unfinished inspection${d.meta && d.meta.room ? ` (room ${d.meta.room})` : ""}: ` +
    `${answered} answers, saved ${when}.`;
  draftBanner.hidden = false;

  document.getElementById("draftResume").onclick = () => {
    session.id = d.id || newId();
    session.timestamp = d.timestamp || null;
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, d.state || {});
    const c = d.completing || null;
    // drafts saved by an earlier version stored a single fromId
    completing = c ? Object.assign({}, c, { fromIds: c.fromIds || (c.fromId ? [c.fromId] : []) }) : null;
    applyMeta(d.meta || {});
    showCompleteBanner();
    draftBanner.hidden = true;
    render();
  };

  document.getElementById("draftDiscard").onclick = () => {
    clearDraft();
    draftBanner.hidden = true;
  };
}

function applyMeta(meta) {
  const room = (meta.room || "").trim();
  roomInput.value = room;

  const inList =
    room &&
    window.ADA &&
    window.ADA.loaded() &&
    window.ADA.rows().some((r) => r.room === room);

  if (inList) {
    roomInput.hidden = true;
    roomPick.value = room;
  } else if (room) {
    roomInput.hidden = false;
    roomPick.value = "__other__";
  } else {
    roomInput.hidden = true;
    roomPick.value = "";
  }

  floorSelect.value = meta.floor || "";
  restroomType.value = meta.type || "";
  inspectionDate.value = meta.date || today();
  inspectorName.value = meta.inspector || lastInspector();
  updateMeta();
  showRoomInfo();
}

function showCompleteBanner() {
  if (completing) {
    completeText.textContent =
      `Editing the inspection of room ${completing.room} (${completing.date}` +
      `${completing.inspector ? `, by ${completing.inspector}` : ""}). ` +
      "Change any answer or fill in the highlighted ones (unanswered or Not sure). " +
      "Saving creates a new version that replaces it in the dashboard; the old one is kept as history.";
    completeBanner.hidden = false;
  } else {
    completeBanner.hidden = true;
  }
}

document.getElementById("completeCancel").addEventListener("click", () => {
  if (hasContent() && !confirm("Stop editing this inspection and clear the form?")) return;
  resetAll();
});

// Pair each current survey question with its record in a saved inspection. Same form version
// (same number of rows) pairs by position, which is exact; otherwise by question text, then by code.
// (Codes alone are unreliable: Sheets stored "3.10" as the number 3.1 in older rows.)
function matchAnswers(questions, answers) {
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (answers.length === questions.length) return questions.map((q, i) => answers[i]);

  const byQ = {};
  const byCode = {};
  answers.forEach((a) => {
    byQ[norm(a.question)] = a;
    (byCode[a.code] = byCode[a.code] || []).push(a);
  });
  return questions.map(
    (q) => byQ[norm(q.question)] || (byCode[q.code] && byCode[q.code].length === 1 ? byCode[q.code][0] : undefined)
  );
}

// Load an existing inspection into the form to edit it or fill in its blanks. It is submitted as a
// NEW version (own id) that points back to the original with BasedOn; nothing is overwritten.
window.SURVEY = {
  loadFrom(rec) {
    if (!FORM_CONFIG) return;
    resetAll();

    const matched = matchAnswers(FORM_CONFIG.questions, rec.answers);
    FORM_CONFIG.questions.forEach((q, i) => {
      const a = matched[i];
      if (!a) return;
      if (["yes", "no", "na", "unsure"].includes(a.answer)) state[q.id] = a.answer;
      if (a.notes) state[`${q.id}_notes`] = a.notes;
    });

    const m = rec.inspection;
    completing = { fromIds: [m.id], room: m.room, date: m.date, inspector: m.inspector };

    // open every section that still has something to answer
    FORM_CONFIG.questions.forEach((q) => {
      if (!state[q.id] || state[q.id] === "unsure") {
        const id = sectionIdForCode(q.code);
        if (id) sectionState[id] = true;
      }
    });

    // the visit date is kept; the inspector field becomes whoever is saving this version
    applyMeta({ room: m.room, floor: m.floor, type: m.type, date: m.date || today(), inspector: lastInspector() });
    showCompleteBanner();
    render();
    saveDraft();

    const first = FORM_CONFIG.questions.find((q) => !state[q.id] || state[q.id] === "unsure");
    if (first) {
      const target = document.getElementById(`q-${first.id}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
};

// ---------- Render ----------
function render() {
  if (!FORM_CONFIG) return;

  form.innerHTML = "";
  const sectionBodies = {};

  const perSection = {};
  FORM_CONFIG.questions.forEach((q) => {
    const id = sectionIdForCode(q.code);
    if (!id) return;
    perSection[id] = perSection[id] || { done: 0, total: 0 };
    perSection[id].total++;
    if (["yes", "no", "na"].includes(state[q.id])) perSection[id].done++;
  });

  // Sections (collapsible)
  FORM_CONFIG.sections.forEach((section) => {
    if (sectionState[section.id] === undefined) {
      sectionState[section.id] = false; // start closed
    }

    const wrapper = document.createElement("div");
    wrapper.style.border = "1px solid rgba(255, 255, 255, 0.28)";
    wrapper.style.borderRadius = "12px";
    wrapper.style.margin = "12px 0";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "rgba(20, 32, 48, 0.30)";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "12px 16px";
    header.style.background = "rgba(20, 32, 48, 0.55)";
    header.style.fontWeight = "900";
    header.style.color = "#f5f5f5";

    const t = document.createElement("span");
    const c = perSection[section.id];
    t.textContent = c ? `${section.title}  ·  ${c.done}/${c.total}` : section.title;

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = sectionState[section.id] ? "Hide" : "Show";
    toggleBtn.style.background = "#1e5eff";
    toggleBtn.style.color = "white";
    toggleBtn.style.border = "none";
    toggleBtn.style.padding = "6px 12px";
    toggleBtn.style.borderRadius = "8px";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.fontWeight = "900";

    toggleBtn.addEventListener("click", () => {
      sectionState[section.id] = !sectionState[section.id];
      render();
    });

    header.appendChild(t);
    header.appendChild(toggleBtn);

    const body = document.createElement("div");
    body.style.padding = "12px 16px";
    body.style.display = sectionState[section.id] ? "block" : "none";

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    form.appendChild(wrapper);

    sectionBodies[section.id] = body;
  });

  // Questions
  FORM_CONFIG.questions.forEach((q) => {
    const secId = sectionIdForCode(q.code);
    if (!secId || !sectionBodies[secId]) return;
    sectionBodies[secId].appendChild(renderQuestion(q));
  });

  updatePreview();
  updateProgress();
}

function renderQuestion(q) {
  const block = document.createElement("div");
  block.id = `q-${q.id}`;
  if (completing && (!state[q.id] || state[q.id] === "unsure")) block.classList.add("needs-answer");
  block.style.marginBottom = "18px";
  block.style.paddingBottom = "14px";
  block.style.borderBottom = "1px solid rgba(255, 255, 255, 0.2)";

  const title = document.createElement("div");
  title.style.fontWeight = "900";
  title.style.color = "#f5f5f5";
  title.style.marginBottom = "4px";
  title.textContent = `${q.code} — ${q.title}`;
  block.appendChild(title);

  const prompt = document.createElement("div");
  prompt.style.fontWeight = "800";
  prompt.style.color = "#e6e6e6";
  prompt.style.marginBottom = "8px";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  // Measurements (show if present)
  if (Array.isArray(q.measurements) && q.measurements.length) {
    const m = document.createElement("div");
    m.style.fontSize = "14px";
    m.style.color = "#e6e6e6";
    m.style.marginBottom = "8px";
    m.innerHTML = `<strong>Measurements:</strong> ${escapeHtml(q.measurements.join(", "))}`;
    block.appendChild(m);
  }

  // help intentionally kept but will only render if non-empty
  if (q.help && String(q.help).trim()) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#d2d2d2";
    help.style.marginBottom = "8px";
    help.textContent = q.help;
    block.appendChild(help);
  }

  // Reference image shown inline
  if (q.referenceImage && String(q.referenceImage).trim()) {
    const refWrap = document.createElement("div");
    refWrap.style.marginBottom = "10px";

    const img = document.createElement("img");
    img.src = q.referenceImage;
    img.alt = `Reference image for ${q.code}`;
    img.loading = "lazy";
    img.style.display = "block";
    img.style.width = "100%";
    img.style.maxWidth = "420px";
    img.style.height = "auto";
    img.style.margin = "8px 0 4px";
    img.style.border = "1px solid #d7deec";
    img.style.borderRadius = "12px";
    img.style.background = "#fff";
    img.style.padding = "6px";
    img.style.boxSizing = "border-box";

    img.onerror = () => {
      refWrap.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.style.fontSize = "13px";
      fallback.style.color = "#ffb4ab";
      fallback.style.marginTop = "6px";
      fallback.textContent = `Could not load reference image: ${q.referenceImage}`;
      refWrap.appendChild(fallback);
    };

    refWrap.appendChild(img);
    block.appendChild(refWrap);
  }

  // YES / NO / N/A / NOT SURE
  const row = document.createElement("div");
  row.className = "opts";
  row.setAttribute("role", "radiogroup");
  row.setAttribute("aria-label", `Answer for ${q.code}`);

  ANSWER_OPTIONS.forEach(([opt, text, cls]) => {
    const label = document.createElement("label");
    label.className = "opt";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = q.id;
    input.value = opt;
    if (state[q.id] === opt) input.checked = true;

    input.addEventListener("change", () => {
      state[q.id] = opt;
      render(); // keep old behavior so solutions appear immediately
      saveDraft();
      const again = document.querySelector(`#q-${q.id} input[value="${opt}"]`);
      if (again) again.focus({ preventScroll: true });
    });

    const face = document.createElement("span");
    face.className = cls;
    face.textContent = text;

    label.appendChild(input);
    label.appendChild(face);
    row.appendChild(label);
  });

  block.appendChild(row);

  if (state[q.id] === "unsure") {
    const note = document.createElement("div");
    note.className = "unsure-note";
    note.textContent = "Flagged for review. Add a note describing what you saw.";
    block.appendChild(note);
  }

  // Solutions if NO
  if (state[q.id] === "no" && Array.isArray(q.solutionsIfNo) && q.solutionsIfNo.length) {
    const sol = document.createElement("div");
    sol.style.marginTop = "8px";
    sol.style.padding = "10px 12px";
    sol.style.background = "rgba(120, 35, 35, 0.5)";
    sol.style.color = "#f5f5f5";
    sol.style.borderLeft = "4px solid red";
    sol.style.borderRadius = "8px";

    const strong = document.createElement("strong");
    strong.textContent = "Possible Solutions:";
    sol.appendChild(strong);

    const ul = document.createElement("ul");
    ul.style.marginTop = "8px";
    ul.style.marginBottom = "0";

    q.solutionsIfNo.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });

    sol.appendChild(ul);
    block.appendChild(sol);
  }

  // Notes
  const notes = document.createElement("textarea");
  notes.placeholder = "Notes...";
  notes.style.width = "100%";
  notes.style.marginTop = "8px";
  notes.style.minHeight = "70px";
  notes.value = state[`${q.id}_notes`] || "";

  notes.addEventListener("input", (e) => {
    state[`${q.id}_notes`] = e.target.value;
    updatePreview();
    saveDraft();
  });

  block.appendChild(notes);

  return block;
}

function updatePreview() {
  const payload = {
    meta: {
      floor: metaState.floor,
      room: metaState.room,
      restroomType: metaState.type
    },
    totalQuestions: FORM_CONFIG ? FORM_CONFIG.questions.length : 0,
    responses: FORM_CONFIG
      ? FORM_CONFIG.questions.map((q) => ({
          code: q.code,
          section: sectionTitleForCode(q.code),
          question: q.question,
          answer: state[q.id] || "",
          recommendation:
            state[q.id] === "no"
              ? (q.solutionsIfNo || []).join("; ")
              : "",
          notes: state[`${q.id}_notes`] || ""
        }))
      : []
  };

  preview.textContent = JSON.stringify(payload, null, 2);
}

// ---------- Payload ----------
function buildPayload() {
  if (!session.timestamp) session.timestamp = new Date().toISOString();

  return FORM_CONFIG.questions.map((q) => ({
    timestamp: session.timestamp,
    inspectionId: session.id,
    floor: metaState.floor,
    room: metaState.room.trim(),
    restroomType: metaState.type,
    code: q.code,
    section: sectionTitleForCode(q.code),
    question: q.question,
    answer: state[q.id] || "",
    recommendation:
      state[q.id] === "no"
        ? (q.solutionsIfNo || []).join("; ")
        : "",
    notes: state[`${q.id}_notes`] || "",
    inspectionDate: metaState.date,
    inspector: metaState.inspector,
    basedOn: completing ? completing.fromIds.join(",") : ""
  }));
}

// ---------- Review & submit ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function actionButton(label, cls, handler) {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", handler);
  return b;
}

function openModal() {
  reviewModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (sending) return;
  reviewModal.hidden = true;
  document.body.style.overflow = "";
}

function goToQuestion(q) {
  closeModal();
  const secId = sectionIdForCode(q.code);
  if (secId) sectionState[secId] = true;
  render();
  const target = document.getElementById(`q-${q.id}`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const first = target.querySelector("input");
    if (first) first.focus({ preventScroll: true });
  }
}

function listSection(title, items, withGo) {
  const wrap = document.createElement("div");
  wrap.appendChild(el("h3", "", `${title} (${items.length})`));
  const ul = el("ul", "rv-list");

  items.forEach(({ q, extra }) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.appendChild(document.createTextNode(`${q.code} — ${q.question}`));
    if (extra) left.appendChild(el("small", "", extra));
    li.appendChild(left);
    if (withGo) li.appendChild(actionButton("Go to question", "link-btn", () => goToQuestion(q)));
    ul.appendChild(li);
  });

  wrap.appendChild(ul);
  return wrap;
}

function openReview() {
  if (!validateMeta()) {
    alert("Please choose the restroom, floor, type and inspection date, and enter the inspector name first.");
    return;
  }
  if (!validateAnswers()) return;

  const t = tally();
  const issues = [];
  const unsure = [];
  const blank = [];

  FORM_CONFIG.questions.forEach((q) => {
    const a = state[q.id];
    if (a === "no") {
      issues.push({ q, extra: (q.solutionsIfNo || [])[0] ? `Suggested: ${q.solutionsIfNo[0]}` : "" });
    } else if (a === "unsure") {
      unsure.push({ q, extra: state[`${q.id}_notes`] ? `Note: ${state[`${q.id}_notes`]}` : "No note yet" });
    } else if (!a) {
      blank.push({ q });
    }
  });

  reviewTitle.textContent = "Review before submitting";
  reviewBody.innerHTML = "";
  reviewActions.innerHTML = "";

  reviewBody.appendChild(
    el(
      "div",
      "rv-meta",
      `Room ${metaState.room} · Floor ${metaState.floor} · ${metaState.type} · ${metaState.date} · by ${metaState.inspector}`
    )
  );

  const chips = el("div", "rv-chips");
  chips.appendChild(el("span", "rv-chip y", `${t.yes} Yes`));
  chips.appendChild(el("span", "rv-chip n", `${t.no} No`));
  chips.appendChild(el("span", "rv-chip", `${t.na} N/A`));
  chips.appendChild(el("span", "rv-chip u", `${t.unsure} Not sure`));
  chips.appendChild(el("span", "rv-chip", `${t.blank} Unanswered`));
  reviewBody.appendChild(chips);

  if (issues.length) reviewBody.appendChild(listSection("Issues found (answered No)", issues, true));
  if (unsure.length) reviewBody.appendChild(listSection("Marked Not sure", unsure, true));
  if (blank.length) {
    reviewBody.appendChild(listSection("Unanswered", blank, true));
    reviewBody.appendChild(
      el("div", "rv-warn", "Unanswered questions are saved as blank and the restroom will show as in progress.")
    );
  }
  if (!issues.length && !unsure.length && !blank.length) {
    reviewBody.appendChild(el("p", "rv-ok", "Everything is answered and nothing was flagged."));
  }

  reviewActions.appendChild(actionButton("Back to edit", "secondary", closeModal));
  reviewActions.appendChild(actionButton("Confirm and submit", "primary", sendInspection));
  openModal();
}

function setBusy(on) {
  sending = on;
  reviewActions.querySelectorAll("button").forEach((b) => {
    b.disabled = on;
  });
}

function showFailure(message) {
  reviewBody.querySelectorAll(".rv-error").forEach((n) => n.remove());
  reviewBody.appendChild(
    el(
      "div",
      "rv-error",
      `${message} Your answers are safe on this device. Press "Confirm and submit" to try again; ` +
        "it will not create a duplicate."
    )
  );
}

async function sendInspection() {
  if (sending) return;
  setBusy(true);
  reviewBody.querySelectorAll(".rv-error").forEach((n) => n.remove());
  const status = makeLoader("Sending… this can take a few seconds. Please don't close this page.");
  status.id = "sendStatus";
  reviewBody.appendChild(status);

  const payload = buildPayload();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await res.json();
    clearTimeout(timer);

    if (data.status !== "success" && data.status !== "duplicate") {
      throw new Error(data.message || "The server did not accept the inspection.");
    }

    rememberInspector(metaState.inspector);
    clearDraft();
    setBusy(false);
    showSuccess(data);
    if (window.ADA) window.ADA.refresh();
  } catch (err) {
    clearTimeout(timer);
    console.error("Send failed:", err);
    status.remove();
    setBusy(false);
    showFailure(
      err.name === "AbortError"
        ? "The server took too long to answer."
        : "The inspection could not be confirmed."
    );
  }
}

function showSuccess(data) {
  reviewTitle.textContent = "Saved";
  reviewBody.innerHTML = "";
  reviewActions.innerHTML = "";

  reviewBody.appendChild(el("div", "success-mark", "✓"));

  if (data.status === "duplicate") {
    reviewBody.appendChild(
      el("p", "rv-ok", "This inspection had already been received. Nothing was added twice.")
    );
  } else {
    reviewBody.appendChild(
      el("p", "rv-ok", `${data.saved} answers recorded for room ${metaState.room}.`)
    );
    if (data.flag === "Superseded" || data.flag === "Duplicate") {
      reviewBody.appendChild(
        el(
          "div",
          "rv-warn",
          "This looks like a repeat of an inspection sent moments ago, so it was flagged. " +
            "Nothing was deleted."
        )
      );
    }
  }

  reviewActions.appendChild(
    actionButton("View dashboard", "secondary", () => {
      resetAll();
      closeModal();
      if (window.ADA) window.ADA.showTab("dashboard");
    })
  );
  reviewActions.appendChild(
    actionButton("Start next restroom", "primary", () => {
      resetAll();
      closeModal();
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );
  // closing the modal by other means (Escape / backdrop) also starts a clean form
  reviewModal.dataset.done = "1";
}

reviewModal.addEventListener("click", (e) => {
  if (e.target !== reviewModal || sending) return;
  if (reviewModal.dataset.done) resetAll();
  closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || reviewModal.hidden || sending) return;
  if (reviewModal.dataset.done) resetAll();
  closeModal();
});

submitBtn.addEventListener("click", openReview);

// ---------- Reset ----------
function resetAll() {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.keys(sectionState).forEach((k) => delete sectionState[k]);

  session.id = newId();
  session.timestamp = null;
  delete reviewModal.dataset.done;
  clearDraft();

  completing = null;
  showCompleteBanner();

  roomPick.value = "";
  roomInput.value = "";
  roomInput.hidden = true;
  floorSelect.value = "";
  restroomType.value = "";
  inspectionDate.value = today();
  inspectorName.value = lastInspector();
  updateMeta();
  showRoomInfo();
  populateRooms();

  render();
}

resetBtn.addEventListener("click", () => {
  if (hasContent() && !confirm("Clear this inspection and start over?")) return;
  resetAll();
});

// ---------- Load Config ----------
async function loadConfig() {
  const res = await fetch("./form-config.json");
  FORM_CONFIG = await res.json();

  descEl.textContent = FORM_CONFIG?.meta?.description || "";

  floorSelect.addEventListener("change", updateMeta);
  roomInput.addEventListener("input", () => {
    updateMeta();
    showRoomInfo();
  });
  restroomType.addEventListener("change", updateMeta);
  inspectionDate.addEventListener("change", updateMeta);
  inspectorName.addEventListener("input", updateMeta);
  inspectorName.addEventListener("change", () => rememberInspector(inspectorName.value));

  fillInspectorList();
  inspectorName.value = lastInspector();
  inspectionDate.value = today();
  updateMeta();
  render();
  populateRooms();
  checkDraft();
}

loadConfig();
