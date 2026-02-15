const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbz1pbrHlJ-H1qQg5Wh0ixRDnL030c-Y0uZTvTnIp9s2jBKTrVKQvcXJM2jvpkDKB2fgTw/exec";

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

function baseCode(code) {
  // "3.36.1" -> "3.36"
  const parts = String(code).split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : String(code);
}

function sectionForCode(code) {
  const bc = baseCode(code);
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(bc)) return s.id;
  }
  return null;
}

function updateMeta() {
  metaState.floor = floorSelect.value || "";
  metaState.room = roomInput.value || "";
  metaState.type = restroomType.value || "";
  updatePreview();
}

function validateMeta() {
  return (
    metaState.floor &&
    metaState.room.trim().length > 0 &&
    metaState.type
  );
}

function validateAnswers() {
  return true; // allow unanswered questions
}


function render() {
  form.innerHTML = "";
  const sectionBodies = {};

  // Sections
  FORM_CONFIG.sections.forEach((section) => {
    if (sectionState[section.id] === undefined) sectionState[section.id] = false; // start closed

    const wrapper = document.createElement("div");
    wrapper.style.border = "1px solid #ddd";
    wrapper.style.borderRadius = "12px";
    wrapper.style.margin = "12px 0";
    wrapper.style.overflow = "hidden";

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
    toggleBtn.textContent = sectionState[section.id] ? "Hide" : "Show";
    toggleBtn.style.background = "#1e5eff";
    toggleBtn.style.color = "white";
    toggleBtn.style.border = "none";
    toggleBtn.style.padding = "6px 12px";
    toggleBtn.style.borderRadius = "8px";
    toggleBtn.style.cursor = "pointer";

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
    const secId = sectionForCode(q.code);
    if (!secId) return;
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
  title.textContent = `${q.code} — ${q.title}`;
  block.appendChild(title);

  const prompt = document.createElement("div");
  prompt.style.fontWeight = "800";
  prompt.style.color = "#1e5eff";
  prompt.style.marginBottom = "6px";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  // Measurements (always show if present)
  if (Array.isArray(q.measurements) && q.measurements.length) {
    const m = document.createElement("div");
    m.style.fontSize = "14px";
    m.style.color = "#111";
    m.style.marginBottom = "6px";
    m.innerHTML = `<strong>Measurements:</strong> ${q.measurements.join(", ")}`;
    block.appendChild(m);
  }

  if (q.help) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#555";
    help.style.marginBottom = "8px";
    help.textContent = q.help;
    block.appendChild(help);
  }

  // YES / NO / NA
  const options = ["yes", "no", "na"];
  const row = document.createElement("div");
  row.style.marginBottom = "8px";

  options.forEach((opt) => {
    const label = document.createElement("label");
    label.style.marginRight = "16px";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = q.id;
    input.value = opt;
    if (state[q.id] === opt) input.checked = true;

    input.addEventListener("change", () => {
      state[q.id] = opt;
      render(); // re-render to show solutions
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
    sol.style.padding = "8px";
    sol.style.background = "#fff4f4";
    sol.style.borderLeft = "4px solid red";
    sol.style.borderRadius = "8px";

    const strong = document.createElement("strong");
    strong.textContent = "Possible Solutions:";
    sol.appendChild(strong);

    const ul = document.createElement("ul");
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
    meta: { ...metaState },
    totalQuestions: FORM_CONFIG ? FORM_CONFIG.questions.length : 0,
    responses: FORM_CONFIG
      ? FORM_CONFIG.questions.map((q) => ({
          code: q.code,
          answer: state[q.id] || "",
          recommendation:
            state[q.id] === "no" ? (q.solutionsIfNo || []).join("; ") : "",
          notes: state[`${q.id}_notes`] || ""
        }))
      : []
  };

  preview.textContent = JSON.stringify(payload, null, 2);
}

submitBtn.addEventListener("click", async () => {
  if (!validateMeta()) {
    alert("Please complete Floor, Room/Area, and Restroom Type.");
    return;
  }

  

  const inspectionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const payload = FORM_CONFIG.questions.map((q) => ({
    timestamp,
    inspectionId,
    floor: metaState.floor,
    room: metaState.room,
    restroomType: metaState.type,
    code: q.code,
    section: sectionForCode(q.code),
    question: q.question,
    answer: state[q.id] || "",
    recommendation: state[q.id] === "no" ? (q.solutionsIfNo || []).join("; ") : "",
    notes: state[`${q.id}_notes`] || ""
  }));

  try {
  await fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  alert("Saved ✅ (sent)");
} catch (err) {
  console.error(err);
  alert("Connection error ❌");
}


resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.keys(sectionState).forEach((k) => delete sectionState[k]);

  floorSelect.value = "";
  roomInput.value = "";
  restroomType.value = "";
  updateMeta();

  render();
});

async function loadConfig() {
  const res = await fetch("./form-config.json");
  FORM_CONFIG = await res.json();

  titleEl.textContent = FORM_CONFIG.meta.title;
  descEl.textContent = FORM_CONFIG.meta.description;

  floorSelect.addEventListener("change", updateMeta);
  roomInput.addEventListener("input", updateMeta);
  restroomType.addEventListener("change", updateMeta);

  updateMeta();
  render();
}

loadConfig();
