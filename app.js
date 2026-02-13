// app.js
import { FORM_CONFIG } from "./form-config.js";

const form = document.getElementById("form");
const preview = document.getElementById("preview");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const title = document.getElementById("title");
const description = document.getElementById("description");

title.textContent = FORM_CONFIG.meta.title;
description.textContent = FORM_CONFIG.meta.description;

const state = {}; // { "3_1": "yes", "3_1_notes": "...", ... }

function render() {
  form.innerHTML = "";

  FORM_CONFIG.questions.forEach((q) => {
    const block = document.createElement("div");
    block.className = "question-block";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = `${q.code} — ${q.title}`;
    block.appendChild(label);

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

    // Yes/No/NA options
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

      // Restore selection if already in state
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

    // Solutions box (only show when NO)
    const solutionsBox = document.createElement("div");
    solutionsBox.className = "solutions";
    solutionsBox.id = `solutions_${q.id}`;
    solutionsBox.style.display = "none";

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
    notesLabel.className = "label";
    notesLabel.textContent = q.notesLabel || "Notes:";
    block.appendChild(notesLabel);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Add your notes here...";
    textarea.value = state[`${q.id}_notes`] || "";
    textarea.addEventListener("input", (e) => {
      state[`${q.id}_notes`] = e.target.value;
      updatePreview();
    });
    block.appendChild(textarea);

    form.appendChild(block);

    // Set initial solutions visibility
    updateSolutions(q);
  });

  updatePreview();
}

function updateSolutions(q) {
  const box = document.getElementById(`solutions_${q.id}`);
  if (!box) return;
  box.style.display = state[q.id] === "no" ? "block" : "none";
}

function validate() {
  for (const q of FORM_CONFIG.questions) {
    if (q.requireAnswer && !state[q.id]) return false;
  }
  return true;
}

function updatePreview() {
  const payload = {
    timestamp: new Date().toISOString(),
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
  if (!validate()) {
    alert("Please answer all required questions (YES / NO / NOT APPLICABLE).");
    return;
  }
  alert("Preview saved ✅ (next step: connect to Google Sheets).");
  console.log("SUBMIT payload:", preview.textContent);
});

resetBtn.addEventListener("click", () => {
  Object.keys(state).forEach((k) => delete state[k]);
  render();
});

render();
