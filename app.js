// ===============================
// CONFIG
// ===============================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyBpR4aFiAXJEdJFAcqvlr706DK3Oi-u3EjtsQvNgExULQwEeaBo5EvV2GqeS_wyaYI9g/exec";

// ===============================
// LOAD JSON CONFIG
// ===============================

let FORM_CONFIG = null;

async function loadConfig() {
  const response = await fetch("./form-config.json");
  FORM_CONFIG = await response.json();
  init();
}

// ===============================
// DOM ELEMENTS
// ===============================

const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

const floorSelect = document.getElementById("floorSelect");
const roomInput = document.getElementById("roomInput");
const restroomType = document.getElementById("restroomType");

const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");

// ===============================
// STATE
// ===============================

const state = {};
const sectionState = {};
const metaState = {
  floor: "",
  room: "",
  type: ""
};

// ===============================
// INIT
// ===============================

function init() {
  titleEl.textContent = FORM_CONFIG.meta.title;
  descEl.textContent = FORM_CONFIG.meta.description;

  floorSelect.addEventListener("change", updateMeta);
  roomInput.addEventListener("input", updateMeta);
  restroomType.addEventListener("change", updateMeta);

  render();
}

// ===============================
// META
// ===============================

function updateMeta() {
  metaState.floor = floorSelect.value;
  metaState.room = roomInput.value;
  metaState.type = restroomType.value;
  updatePreview();
}

function validateMeta() {
  return (
    metaState.floor &&
    metaState.room.trim().length > 0 &&
    metaState.type
  );
}

// ===============================
// SECTION HELPER
// ===============================

function sectionForCode(code) {
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(code)) return s.id;
  }
  return null;
}

// ===============================
// RENDER
// ===============================

function render() {
  form.innerHTML = "";
  const sectionBodies = {};

  FORM_CONFIG.sections.forEach((section) => {

    if (sectionState[section.id] === undefined)
      sectionState[section.id] = false; // start closed

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
    header.style.fontWeight = "bold";
    header.style.color = "#0f3fb8";

    const title = document.createElement("span");
    title.textContent = section.title;

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

    header.appendChild(title);
    header.appendChild(toggleBtn);

    const body = document.createElement("div");
    body.style.padding = "16px";
    body.style.display = sectionState[section.id] ? "block" : "none";

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    form.appendChild(wrapper);

    sectionBodies[section.id] = body;
  });

  FORM_CONFIG.questions.forEach((q) => {
    const secId = sectionForCode(q.code);
    if (!secId) return;
    sectionBodies[secId].appendChild(renderQuestion(q));
  });

  updatePreview();
}

// ===============================
// RENDER QUESTION
// ===============================

function renderQuestion(q) {
  const block = document.createElement("div");
  block.style.marginBottom = "20px";
  block.style.borderBottom = "1px solid #eee";
  block.style.paddingBottom = "14px";

  const title = document.createElement("div");
  title.style.fontWeight = "bold";
  title.style.color = "#0f3fb8";
  title.textContent = `${q.code} — ${q.title}`;
  block.appendChild(title);

  const prompt = document.createElement("div");
  prompt.style.fontWeight = "600";
  prompt.style.color = "#1e5eff";
  prompt.style.margin = "6px 0";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  if (q.help) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#555";
    help.textContent = q.help;
    block.appendChild(help);
  }

  const options = ["yes", "no", "na"];

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
      render();
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + opt.toUpperCase()));
    block.appendChild(label);
  });

  if (state[q.id] === "no" && q.solutionsIfNo?.length) {
    const sol = document.createElement("div");
    sol.style.background = "#fff4f4";
    sol.style.borderLeft = "4px solid red";
    sol.style.marginTop = "8px";
    sol.style.padding = "8px";

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

  const notes = document.createElement("textarea");
  notes.placeholder = "Notes...";
  notes.style.width = "100%";
  notes.style.marginTop = "8px";
  notes.value = state[`${q.id}_notes`] || "";

  notes.addEventListener("input", (e) => {
    state[`${q.id}_notes`] = e.target.value;
    updatePreview();
  });

  block.appendChild(notes);

  return block;
}

// ===============================
// PREVIEW
// ===============================

function updatePreview() {
  const payload = {
    meta: metaState,
    responses: FORM_CONFIG.questions.map((q) => ({
      code: q.code,
      answer: state[q.id] || "",
      recommendation:
        state[q.id] === "no"
          ? (q.solutionsIfNo?.join("; ") || "")
          : "",
      notes: state[`${q.id}_notes`] || ""
    }))
  };

  preview.textContent = JSON.stringify(payload, null, 2);
}

// ===============================
// SUBMIT
// ===============================

submitBtn.addEventListener("click", async () => {

  if (!validateMeta()) {
    alert("Please complete Floor, Room, and Restroom Type.");
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
    recommendation:
      state[q.id] === "no"
        ? (q.solutionsIfNo?.join("; ") || "")
        : "",
    notes: state[`${q.id}_notes`] || ""
  }));

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.status === "success") {
      alert("Inspection saved to Google Sheets ✅");
    } else {
      alert("Save failed ❌");
    }

  } catch (err) {
    console.error(err);
    alert("Connection error ❌");
  }
});

// ===============================
// RESET
// ===============================

resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach(k => delete state[k]);
  Object.keys(sectionState).forEach(k => delete sectionState[k]);

  floorSelect.value = "";
  roomInput.value = "";
  restroomType.value = "";

  updateMeta();
  render();
});

// ===============================
// START
// ===============================

loadConfig();
