// app.js
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

const state = {}; // answers + notes
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
  // Match exact code string in FORM_CONFIG.sections
  for (const s of FORM_CONFIG.sections) {
    if (s.codes.includes(code)) return s.id;
  }
  return "sec_misc";
}

function render() {
  form.innerHTML = "";

  // Build sections container map
  const sectionNodes = new Map();

  // Create all sections as <details>
  for (const s of FORM_CONFIG.sections) {
    const details = document.createElement("details");
    details.className = "section";
    details.open = true; // collapsible but open by default

    const summary = document.createElement("summary");
    summary.textContent = s.title;
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "section-body";
    details.appendChild(body);

    form.appendChild(details);
    sectionNodes.set(s.id, body);
  }

  // If something doesn't match, it goes here
  const miscDetails = document.createElement("details");
  miscDetails.className = "section";
  miscDetails.open = true;
  const miscSummary = document.createElement("summary");
  miscSummary.textContent = "Other";
  miscDetails.appendChild(miscSummary);
  const miscBody = document.createElement("div");
  miscBody.className = "section-body";
  miscDetails.appendChild(miscBody);
  form.appendChild(miscDetails);
  sectionNodes.set("sec_misc", miscBody);

  // Render questions into their section
  FORM_CONFIG.questions.forEach((q) => {
    const secId = sectionForCode(q.code);
    const host = sectionNodes.get(secId) || miscBody;
    host.appendChild(renderQuestion(q));
  });

  updatePreview();
}

function renderQuestion(q) {
  const block = document.createElement("div");
  block.className = "question-block";

  const qtitle = document.createElement("div");
  qtitle.className = "qtitle";
  qtitle.textContent = `${q.code} — ${q.title}`;
  block.appendChild(qtitle);

  const questionText = document.createElement("div");
  questionText.textContent = q.question;
  block.appendChild(questionText);

  if (q.help) {
    const help = document.createElement("div");
    help.className = "help";
    help.textContent = q.help;
    block.appendChild(help);
  }

  // Reference image (optional)
  if (q.referenceImage) {
    const img = document.createElement("img");
    img.className = "refimg";
    img.src = q.referenceImage;
    img.alt = `${q.code} reference`;
    block.appendChild(img);
  }

  // Options
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
    });

    row.appendChild(input);
    row.appendChild(document.createTextNode(" " + opt.label));
    radioGroup.appendChild(row);
  });

  block.appendChild(radioGroup);

  // Solutions (only NO)
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

  // Notes
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

  // initial visibility
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
  alert("Preview saved ✅ (next step: connect to Google Sheets).");
  console.log("SUBMIT payload:", JSON.parse(preview.textContent));
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
