import { FORM_CONFIG } from "./form-config.js";

const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const title = document.getElementById("title");
const description = document.getElementById("description");

title.textContent = FORM_CONFIG.meta.title;
description.textContent = FORM_CONFIG.meta.description;

const state = {};
const sectionState = {}; // tracks open/closed

function sectionForCode(code) {
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(code)) return s.id;
  }
  return null;
}

function render() {
  form.innerHTML = "";

  const sectionBodies = {};

  // Create sections
  FORM_CONFIG.sections.forEach((section) => {
    if (sectionState[section.id] === undefined) {
  sectionState[section.id] = false; // start closed
}

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

    const title = document.createElement("span");
    title.textContent = section.title;

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = sectionState[section.id] === false ? "Show" : "Hide";
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
    body.style.padding = "12px 16px";

    if (sectionState[section.id] === false) {
      body.style.display = "none";
    } else {
      sectionState[section.id] = true;
    }

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    form.appendChild(wrapper);

    sectionBodies[section.id] = body;
  });

  // Render questions into their section
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

  if (q.help) {
    const help = document.createElement("div");
    help.style.fontSize = "14px";
    help.style.color = "#555";
    help.style.marginBottom = "8px";
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
    sol.style.marginTop = "8px";
    sol.style.padding = "8px";
    sol.style.background = "#fff4f4";
    sol.style.borderLeft = "4px solid red";

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

function updatePreview() {
  preview.textContent = JSON.stringify(state, null, 2);
}

submitBtn.addEventListener("click", async () => {

  if (!validateMeta()) {
    alert("Complete Floor, Room, and Type.");
    return;
  }

  if (!validateAnswers()) {
    alert("Answer all required questions.");
    return;
  }

  // 👇 AQUI VA
  const inspectionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const payload = FORM_CONFIG.questions.map(q => ({
    timestamp,
    inspectionId,   // 👈 aquí lo mandas al sheet
    floor: metaState.floor,
    room: metaState.room,
    restroomType: metaState.type,
    code: q.code,
    section: sectionForCode(q.code),
    question: q.question,
    answer: state[q.id] || "",
    recommendation: state[q.id] === "no" ? (q.solutionsIfNo?.join("; ") || "") : "",
    notes: state[`${q.id}_notes`] || ""
  }));

  ...
});

  alert("Saved ✅");
});

resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.keys(sectionState).forEach((k) => delete sectionState[k]);
  render();
});

render();
