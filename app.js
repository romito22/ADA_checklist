import { FORM_CONFIG } from "./form-config.js";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyBpR4aFiAXJEdJFAcqvlr706DK3Oi-u3EjtsQvNgExULQwEeaBo5EvV2GqeS_wyaYI9g/exec";

const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");

// Meta inputs (must exist in index.html)
const floorSelect = document.getElementById("floorSelect");
const roomInput = document.getElementById("roomInput");
const restroomType = document.getElementById("restroomType");

titleEl.textContent = FORM_CONFIG.meta.title;
descEl.textContent = FORM_CONFIG.meta.description;

const state = {}; // answers + notes
const sectionState = {}; // open/closed per section
const metaState = { floor: "", room: "", type: "" };

function setMeta() {
  metaState.floor = floorSelect?.value || "";
  metaState.room = roomInput?.value || "";
  metaState.type = restroomType?.value || "";
  updatePreview();
}

floorSelect?.addEventListener("change", setMeta);
roomInput?.addEventListener("input", setMeta);
restroomType?.addEventListener("change", setMeta);

function validateMeta() {
  return (
    metaState.floor &&
    metaState.room.trim().length > 0 &&
    metaState.type
  );
}

function validateAnswers() {
  for (const q of FORM_CONFIG.questions) {
    if (q.requireAnswer && !state[q.id]) return false;
  }
  return true;
}

function sectionForCode(code) {
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(code)) return s.id;
  }
  return null;
}

function render() {
  form.innerHTML = "";
  const sectionBodies = {};

  // Create section containers
  FORM_CONFIG.sections.forEach((section) => {
    // default closed
    if (sectionState[section.id] === undefined) sectionState[section.id] = false;

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

    const sectionTitle = document.createElement("span");
    sectionTitle.textContent = section.title;

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

    header.appendChild(sectionTitle);
    header.appendChild(toggleBtn);

    const body = document.createElement("div");
    body.style.padding = "12px 16px";
    body.style.display = sectionState[section.id] ? "block" : "none";

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    form.appendChild(wrapper);

    sectionBodies[section.id] = body;
  });

  // Render questions into their sections
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

  const t = document.createElement("div");
  t.style.fontWeight = "900";
  t.style.color = "#0f3fb8";
  t.textContent = `${q.code} — ${q.title}`;
  block.appendChild(t);

  const prompt = document.createElement("div");
  prompt.style.fontWeight = "800";
  prompt.style.color = "#1e5eff";
  prompt.style.margin = "6px 0";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  if (q.help) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#555";
    help.style.marginBottom = "8px";
    help.textContent = q.help;
    block.appendChild(help);
  }

  const options = ["yes", "no", "na"];
  const optsWrap = document.createElement("div");
  optsWrap.style.marginBottom = "8px";

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
      render(); // re-render to show/hide solutions
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + opt.toUpperCase()));
    optsWrap.appendChild(label);
  });

  block.appendChild(optsWrap);

  // Solutions shown only when NO
  if (state[q.id] === "no" && q.solutionsIfNo?.length) {
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
    responses: FORM_CONFIG.questions.map((q) => ({
      code: q.code,
      answer: state[q.id] || "",
      recommendation:
        state[q.id] === "no" ? (q.solutionsIfNo?.join("; ") || "") : "",
      notes: state[`${q.id}_notes`] || ""
    }))
  };
  preview.textContent = JSON.stringify(payload, null, 2);
}

submitBtn.addEventListener("click", async () => {
  if (!validateMeta()) {
    alert("Please select Floor, enter Room/Area, and choose Restroom Type.");
    return;
  }
  if (!validateAnswers()) {
    alert("Please answer all questions (YES / NO / NOT APPLICABLE).");
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
      state[q.id] === "no" ? (q.solutionsIfNo?.join("; ") || "") : "",
    notes: state[`${q.id}_notes`] || ""
  }));

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === "success") alert("Saved to Google Sheets ✅");
    else alert("Save failed ❌");
  } catch (err) {
    console.error(err);
    alert("Connection error ❌");
  }
});

resetBtn.addEventListener("click", () => {
  // clear answers + notes
  Object.keys(state).forEach((k) => delete state[k]);

  // reset section open/closed
  Object.keys(sectionState).forEach((k) => delete sectionState[k]);

  // reset meta UI
  if (floorSelect) floorSelect.value = "";
  if (roomInput) roomInput.value = "";
  if (restroomType) restroomType.value = "";
  setMeta();

  render();
});

// initial
setMeta();
render();
