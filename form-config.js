// form-config.js
export const FORM_CONFIG = {
  meta: {
    title: "Accessibility Inspection Checklist",
    description: "Yes / No / Not Applicable + solutions when NO + notes + optional reference image."
  },

  questions: [
    {
      id: "3_1",
      code: "3.1",
      title: "Restroom Accessibility",
      question:
        "If this restroom area is open to the public, is there at least one restroom that a person using a wheelchair can fully use?",
      help:
        "An accessible restroom can be one for each sex, or one unisex accessible restroom.",
      // Put your own local image path here if you have one:
      // referenceImage: "./images/3-1.png",
      solutionsIfNo: [
        "Modify the restroom layout to create an accessible restroom.",
        "Combine restrooms to create one unisex accessible restroom."
      ],
      requireAnswer: true,
      notesLabel: "Notes:"
    },

    {
      id: "3_2",
      code: "3.2",
      title: "Directional Signage",
      question:
        "If there are restrooms that are not accessible, are there clear signs directing people to the nearest accessible restroom?",
      help:
        "Signs must guide people from an inaccessible restroom to an accessible one.",
      // Example: put your own file in /images and reference it like this:
      // referenceImage: "./images/3-2-signage.png",
      solutionsIfNo: [
        "Install directional signs pointing to the accessible restroom.",
        "Use the International Symbol of Accessibility on the signage."
      ],
      requireAnswer: true,
      notesLabel: "Notes:"
    }
  ]
};
