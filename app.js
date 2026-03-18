// ==========================
// app.js (UPDATED / COMPATIBLE WITH NEW CONFIG + GOOGLE SHEETS)
// ==========================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyHf68B5TISRmdCOpvjbb_4vNRm8yyuZ6getsJMwO-yYvlthYxBcrzH_IxAT_frn2yxCw/exec";

let FORM_CONFIG = null;

// DOM
const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");

const floorSelect = document.getElementById("floorSelect");
const roomInput = document.getElementById("roomInput");
const restroomType = document.getElementById("restroomType");

// State
const state = {};        // answers + notes
const sectionState = {}; // open/closed
const metaState = { floor: "", room: "", type: "" };

// ---------- Helpers ----------
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

function updateMeta() {
  metaState.floor = floorSelect.value || "";
  metaState.room = roomInput.value || "";
  metaState.type = restroomType.value || "";
  updatePreview();
}

function validateMeta() {
  return metaState.floor && metaState.room.trim().length > 0 && metaState.type;
}

// keep previous behavior: unanswered questions are allowed
function validateAnswers() {
  return true;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Render ----------
function render() {
  if (!FORM_CONFIG) return;

  form.innerHTML = "";
  const sectionBodies = {};

  // Sections (collapsible)
  FORM_CONFIG.sections.forEach((section) => {
    if (sectionState[section.id] === undefined) {
      sectionState[section.id] = false; // start closed
    }

    const wrapper = document.createElement("div");
    wrapper.style.border = "1px solid #ddd";
    wrapper.style.borderRadius = "12px";
    wrapper.style.margin = "12px 0";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "#fff";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "12px 16px";
    header.style.background = "#eef3ff";
    header.style.fontWeight = "900";
    header.style.color = "#0f3fb8";

    const t = document.createElement("span");
    t.textContent = section.title;

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
}

function renderQuestion(q) {
  const block = document.createElement("div");
  block.style.marginBottom = "18px";
  block.style.paddingBottom = "14px";
  block.style.borderBottom = "1px solid #eee";

  const title = document.createElement("div");
  title.style.fontWeight = "900";
  title.style.color = "#0f3fb8";
  title.style.marginBottom = "4px";
  title.textContent = `${q.code} — ${q.title}`;
  block.appendChild(title);

  const prompt = document.createElement("div");
  prompt.style.fontWeight = "800";
  prompt.style.color = "#1e5eff";
  prompt.style.marginBottom = "8px";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  // Measurements (show if present)
  if (Array.isArray(q.measurements) && q.measurements.length) {
    const m = document.createElement("div");
    m.style.fontSize = "14px";
    m.style.color = "#111";
    m.style.marginBottom = "8px";
    m.innerHTML = `<strong>Measurements:</strong> ${escapeHtml(q.measurements.join(", "))}`;
    block.appendChild(m);
  }

  // help intentionally kept but will only render if non-empty
  if (q.help && String(q.help).trim()) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#555";
    help.style.marginBottom = "8px";
    help.textContent = q.help;
    block.appendChild(help);
  }

  // Reference image placeholder (ready for future use)
  const refWrap = document.createElement("div");
  refWrap.style.marginBottom = "8px";

  if (q.referenceImage && String(q.referenceImage).trim()) {
    const link = document.createElement("a");
    link.href = q.referenceImage;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open reference image";
    link.style.color = "#0f3fb8";
    link.style.fontWeight = "700";
    refWrap.appendChild(link);
  } else {
    const ph = document.createElement("div");
    ph.style.fontSize = "13px";
    ph.style.color = "#8b93a7";
    ph.textContent = "Reference image coming soon";
    refWrap.appendChild(ph);
  }

  block.appendChild(refWrap);

  // YES / NO / NA
  const options = ["yes", "no", "na"];
  const row = document.createElement("div");
  row.style.marginBottom = "8px";

  options.forEach((opt) => {
    const label = document.createElement("label");
    label.style.marginRight = "16px";
    label.style.cursor = "pointer";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = q.id;
    input.value = opt;
    if (state[q.id] === opt) input.checked = true;

    input.addEventListener("change", () => {
      state[q.id] = opt;
      render(); // keep old behavior so solutions appear immediately
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + opt.toUpperCase()));
    row.appendChild(label);
  });

  block.appendChild(row);

  // Solutions if NO
  if (state[q.id] === "no" && Array.isArray(q.solutionsIfNo) && q.solutionsIfNo.length) {
    const sol = document.createElement("div");
    sol.style.marginTop = "8px";
    sol.style.padding = "10px 12px";
    sol.style.background = "#fff4f4";
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

// ---------- Submit ----------
submitBtn.addEventListener("click", async () => {
  if (!validateMeta()) {
    alert("Please complete Floor, Room/Area, and Restroom Type.");
    return;
  }

  if (!validateAnswers()) {
    alert("Please answer all questions (YES / NO / NA).");
    return;
  }

  const inspectionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Respect spreadsheet format
  const payload = FORM_CONFIG.questions.map((q) => ({
    timestamp,
    inspectionId,
    floor: metaState.floor,
    room: metaState.room,
    restroomType: metaState.type,
    code: q.code,
    section: sectionTitleForCode(q.code),
    question: q.question,
    answer: state[q.id] || "",
    recommendation:
      state[q.id] === "no"
        ? (q.solutionsIfNo || []).join("; ")
        : "",
    notes: state[`${q.id}_notes`] || ""
  }));

  console.log("Sending to:", WEB_APP_URL);
  console.log("Rows:", payload.length);
  console.log(payload);

  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    alert("Saved ✅ (sent)");
  } catch (err) {
    console.error("FETCH FAILED:", err);
    alert("Connection error ❌ (check console)");
  }
});

// ---------- Reset ----------
resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.keys(sectionState).forEach((k) => delete sectionState[k]);

  floorSelect.value = "";
  roomInput.value = "";
  restroomType.value = "";
  updateMeta();

  render();
});

// ---------- Load Config ----------
async function loadConfig() {
  const res = await fetch("./form-config.json");
  FORM_CONFIG = await res.json();

  titleEl.textContent = FORM_CONFIG?.meta?.title || "ADA Restroom Accessibility Inspection";
  descEl.textContent = FORM_CONFIG?.meta?.description || "";

  floorSelect.addEventListener("change", updateMeta);
  roomInput.addEventListener("input", updateMeta);
  restroomType.addEventListener("change", updateMeta);

  updateMeta();
  render();
}

loadConfig();
