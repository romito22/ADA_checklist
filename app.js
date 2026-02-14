// app.js (collapsible groups + "Hide this group" after finishing)
import { FORM_CONFIG } from "./form-config.js";

const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const title = document.getElementById("title");
const description = document.getElementById("description");

const floorSelect = document.getElementById("floorSelect");
const roomInput = document.getElementById("roomInput");
const restroomType = document.getElementById("restroomType");

title.textContent = FORM_CONFIG.meta.title;
description.textContent = FORM_CONFIG.meta.description;

const state = {};
const metaState = { floor: "", room: "", type: "" };

function setMeta() {
  metaState.floor = floorSelect.value || "";
  metaState.room = roomInput.value || "";
  metaState.type = restroomType.value || "";
  updatePreview();
}
floorSelect.addEventListener("change", setMeta);
roomInput.addEventListener("input", setMeta);
restroomType.addEventListener("change", setMeta);

function sectionForCode(code) {
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(code)) return s.id;
  }
  return "sec_misc";
}

function countAnsweredInSection(section) {
  const codes = section.codes;
  const qs = FORM_CONFIG.questions.filter(q => codes.includes(q.code));
  let answered = 0;
  for (const q of qs) if (state[q.id]) answered++;
  return { answered, total: qs.length };
}

function render() {
  form.innerHTML = "";

  const sectionNodes = new Map();
  const sectionDetails = new Map();

  // Create sections (collapsible)
  for (const s of FORM_CONFIG.sections) {
    const details = document.createElement("details");
    details.className = "section";
    details.open = true;

    const summary = document.createElement("summary");
    summary.dataset.sectionId = s.id;

    const left = document.createElement("span");
    left.textContent = s.title;

    const right = document.createElement("span");
    right.className = "summary-right";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.id = `badge_${s.id}`;
    badge.textContent = "0/0";

    const hideBtn = document.createElement("button");
    hideBtn.type = "button";
    hideBtn.className = "btn-mini";
    hideBtn.textContent = "Hide group";
    hideBtn.addEventListener("click", (e) => {
      e.preventDefault();      // prevent toggle
      e.stopPropagation();     // prevent toggle
      details.style.display = "none";
      // store hidden state so it stays hidden after re-render
      state[`__hidden_${s.id}`] = true;
      updatePreview();
    });

    right.appendChild(badge);
    right.appendChild(hideBtn);

    summary.appendChild(left);
    summary.appendChild(right);

    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "section-body";
    details.appendChild(body);

    form.appendChild(details);

    sectionNodes.set(s.id, body);
    sectionDetails.set(s.id, details);
  }

  // Render questions into sections
  for (const q of FORM_CONFIG.questions) {
    const secId = sectionForCode(q.code);
    const host = sectionNodes.get(secId);
    if (host) host.appendChild(renderQuestion(q));
  }

  // Apply hidden state + update badges
  for (const s of FORM_CONFIG.sections) {
    const details = sectionDetails.get(s.id);
    if (!details) continue;

    if (state[`__hidden_${s.id}`] === true) details.style.display = "none";

    updateSectionBadge(s);
  }

  updatePreview();
}

function updateSectionBadge(section) {
  const badge = document.getElementById(`badge_${section.id}`);
  if (!badge) return;
  const { answered, total } = countAnsweredInSection(section);
  badge.textContent = `${answered}/${total}`;
}

function renderQuestion(q) {
  const block = document.createElement("div");
  block.className = "question-block";

  const qtitle = document.createElement("div");
  qtitle.className = "qtitle";
  qtitle.textContent = `${q.code} — ${q.title}`;
  block.appendChild(qtitle);

  const prompt = document.createElement("div");
  prompt.className = "prompt";
  prompt.textContent = q.question;
  block.appendChild(prompt);

  if (q.help) {
    const help = document.createElement("div");
    help.className = "help";
    help.textContent = q.help;
    block.appendChild(help);
  }

  if (q.referenceImage) {
    const img = document.createElement("img");
    img.className = "refimg";
    img.src = q.referenceImage;
    img.alt = `${q.code} reference`;
    block.appendChild(img);
  }

  const radioGroup = document.createElement("div");
  radioGroup.className = "radio-group";

  const options = [
    { value: "yes", label: "YES" },
    { value: "no", label: "NO" },
    { value: "na", label: "NOT APPLICABLE" }
  ];

  options.forEach((opt) => {
    const row = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = q.id;
    input.value = opt.value;
    if (state[q.id] === opt.value) input.checked = true;

    input.addEventListener("change", () => {
      state[q.id] = opt.value;
      updateSolutions(q);
      updatePreview();

      // update badge live
      const sec = FORM_CONFIG.sections.find(s => s.codes.includes(q.code));
      if (sec) updateSectionBadge(sec);
    });

    row.appendChild(input);
    row.appendChild(document.createTextNode(" " + opt.label));
    radioGroup.appendChild(row);
  });

  block.appendChild(radioGroup);

  const solutionsBox = document.createElement("div");
  solutionsBox.className = "solutions";
  solutionsBox.id = `solutions_${q.id}`;

  const strong = document.createElement("strong");
  strong.textContent = "Possible Solutions:";
  solutionsBox.appendChild(strong);

  const ul = document.createElement("ul");
  (q.solutionsIfNo || []).forEach((sol) => {
    const li = document.createElement("li");
    li.textContent = sol;
    ul.appendChild(li);
  });
  solutionsBox.appendChild(ul);
  block.appendChild(solutionsBox);

  const notesLabel = document.createElement("div");
  notesLabel.className = "qtitle";
  notesLabel.textContent = "Notes:";
  block.appendChild(notesLabel);

  const textarea = document.createElement("textarea");
  textarea.className = "notes";
  textarea.placeholder = "Add your notes here...";
  textarea.value = state[`${q.id}_notes`] || "";
  textarea.addEventListener("input", (e) => {
    state[`${q.id}_notes`] = e.target.value;
    updatePreview();
  });
  block.appendChild(textarea);

  updateSolutions(q);
  return block;
}

function updateSolutions(q) {
  const box = document.getElementById(`solutions_${q.id}`);
  if (!box) return;
  box.style.display = state[q.id] === "no" ? "block" : "none";
}

function validateMeta() {
  return metaState.floor && metaState.room.trim().length > 0 && metaState.type;
}
function validateAnswers() {
  for (const q of FORM_CONFIG.questions) {
    if (q.requireAnswer && !state[q.id]) return false;
  }
  return true;
}

function updatePreview() {
  const payload = {
    timestamp: new Date().toISOString(),
    meta: { ...metaState },
    hiddenSections: FORM_CONFIG.sections
      .filter(s => state[`__hidden_${s.id}`] === true)
      .map(s => s.id),
    responses: FORM_CONFIG.questions.map((q) => ({
      id: q.id,
      code: q.code,
      answer: state[q.id] || null,
      solutionsShown: state[q.id] === "no" ? (q.solutionsIfNo || []) : [],
      notes: state[`${q.id}_notes`] || ""
    }))
  };
  preview.textContent = JSON.stringify(payload, null, 2);
}

submitBtn.addEventListener("click", () => {
  if (!validateMeta()) {
    alert("Please select Floor, enter Room/Area, and choose Restroom Type.");
    return;
  }
  if (!validateAnswers()) {
    alert("Please answer all required questions (YES / NO / NOT APPLICABLE).");
    return;
  }
  alert("Preview saved ✅");
});

resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach((k) => delete state[k]);
  metaState.floor = "";
  metaState.room = "";
  metaState.type = "";
  floorSelect.value = "";
  roomInput.value = "";
  restroomType.value = "";
  render();
});

render();
