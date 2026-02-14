export const FORM_CONFIG = {
  meta: {
    title: "ADA Restroom Accessibility Inspection",
    description: "Complete all questions. If 'No' is selected, review the suggested correction."
  },

  sections: [
    {
      id: "doors",
      title: "Doors & Entry",
      codes: ["3.6", "3.7", "3.8", "3.9"]
    },
    {
      id: "lavatories",
      title: "Lavatories & Sinks",
      codes: ["3.21", "3.22", "3.23"]
    },
    {
      id: "toilet",
      title: "Toilet & Grab Bars",
      codes: ["3.30", "3.31", "3.33"]
    }
  ],

  questions: [
    {
      id: "q_3_6",
      code: "3.6",
      title: "Door Width",
      question: "Is the door opening at least 32 inches clear when open at 90 degrees?",
      help: "Measure clear width between door face and frame stop.",
      solutionsIfNo: [
        "Install offset hinges.",
        "Widen the doorway opening."
      ],
      requireAnswer: true
    },

    {
      id: "q_3_7",
      code: "3.7",
      title: "Maneuvering Clearance",
      question: "Is there adequate maneuvering clearance on the pull side of the door?",
      help: "Check required clearance per ADA standards.",
      solutionsIfNo: [
        "Reconfigure wall or partition to provide clearance."
      ],
      requireAnswer: true
    },

    {
      id: "q_3_21",
      code: "3.21",
      title: "Lavatory Height",
      question: "Is the top of the lavatory no higher than 34 inches above the floor?",
      help: "Measure from finished floor to top of rim.",
      solutionsIfNo: [
        "Lower the lavatory mounting height."
      ],
      requireAnswer: true
    },

    {
      id: "q_3_30",
      code: "3.30",
      title: "Toilet Clearance",
      question: "Is there sufficient clearance around the toilet for wheelchair access?",
      help: "Verify side and rear clearance dimensions.",
      solutionsIfNo: [
        "Reposition toilet to meet ADA clearance requirements."
      ],
      requireAnswer: true
    },

    {
      id: "q_3_33",
      code: "3.33",
      title: "Grab Bars",
      question: "Are grab bars installed at correct height and length?",
      help: "Check mounting height and length per ADA guidelines.",
      solutionsIfNo: [
        "Install compliant grab bars.",
        "Adjust grab bar mounting height."
      ],
      requireAnswer: true
    }
  ]
};
