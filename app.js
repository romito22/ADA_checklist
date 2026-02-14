const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyBpR4aFiAXJEdJFAcqvlr706DK3Oi-u3EjtsQvNgExULQwEeaBo5EvV2GqeS_wyaYI9g/exec";

submitBtn.addEventListener("click", async () => {

  // 🔹 Genera ID único por inspección
  const inspectionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const payload = FORM_CONFIG.questions.map((q) => ({
    timestamp,
    inspectionId,

    // ⚠️ Si ya tienes metaState (floor/room/type) usa eso aquí
    floor: "",          
    room: "",           
    restroomType: "",   

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.status === "success") {
      alert("Inspection saved to Google Sheets ✅");
    } else {
      alert("Error saving data ❌");
      console.log(result);
    }

  } catch (err) {
    console.error(err);
    alert("Connection error ❌");
  }

});
