// form-config.js
export const FORM_CONFIG = {
  meta: {
    title: "ADA Checklist – Priority 3: Toilet Rooms",
    description: "Scroll checklist with collapsible sections. Answers: YES / NO / NOT APPLICABLE. Shows solutions only when NO."
  },

  // Visual grouping (collapsible)
  sections: [
    { id: "sec_toilets_overview", title: "Overview & Routing / Signs", codes: ["3.1","3.2","3.3","3.4"] },
    { id: "sec_signs", title: "Restroom Signs (Tactile/Braille/Height)", codes: ["3.5","3.5 (Height)"] },
    { id: "sec_doors", title: "Doors, Clearances, Hardware", codes: ["3.6","3.7","3.7 (Slope)","3.8","3.9","3.10","3.11","3.12","3.13","3.14","3.15"] },
    { id: "sec_layout", title: "Interior Layout (Paths/Turning/Single-User)", codes: ["3.16","3.17","3.18"] },
    { id: "sec_mirror_hook", title: "Mirror & Coat Hook", codes: ["3.19","3.20"] },
    { id: "sec_lavatories", title: "Lavatories / Faucets / Dispensers", codes: ["3.21","3.22","3.23","3.24","3.25","3.26","3.27","3.28","3.29"] },
    { id: "sec_toilet", title: "Toilet (Location/Clearance/Grab Bars/Controls)", codes: ["3.30","3.31","3.32","3.33","3.34","3.35","3.36","3.37","3.38","3.39","3.40"] },
    { id: "sec_stalls", title: "Toilet Compartments (Stalls)", codes: ["3.41","3.42","3.43","3.44","3.45","3.46","3.47","3.48","3.49","3.50"] }
  ],

  questions: [
    {
      id: "3_1",
      code: "3.1",
      title: "At least one accessible restroom",
      question:
        "If restrooms are open to the public, is there at least one accessible restroom (either one accessible restroom for each sex, or one unisex accessible restroom)?",
      help:
        "If the restroom is mainly for children (schools/day care), use the children’s ADA requirements instead.",
      solutionsIfNo: [
        "Modify the restroom layout to create an accessible restroom.",
        "Combine restrooms to create one unisex accessible restroom."
      ],
      requireAnswer: true
    },
    {
      id: "3_2",
      code: "3.2",
      title: "Signs directing to accessible restrooms",
      question:
        "If some restrooms are not accessible, are there signs at those restrooms directing people to an accessible restroom?",
      help: "ADA reference: 216.8.",
      solutionsIfNo: ["Install directional signs."],
      requireAnswer: true
    },
    {
      id: "3_3",
      code: "3.3",
      title: "Accessible restroom has ISA sign",
      question:
        "If not all restrooms are accessible, does the accessible restroom have a sign with the International Symbol of Accessibility (wheelchair symbol)?",
      help: "ADA reference: 216.8.",
      solutionsIfNo: ["Install the required accessibility sign."],
      requireAnswer: true
    },
    {
      id: "3_4",
      code: "3.4",
      title: "Accessible route to the accessible restroom",
      question: "Is there an accessible route to the accessible restroom?",
      help: "ADA reference: 206.2.4.",
      solutionsIfNo: ["Alter the route to make it accessible."],
      requireAnswer: true
    },

    {
      id: "3_5",
      code: "3.5",
      title: "Restroom sign: contrast, raised text, Braille, mounting",
      question:
        "Do restroom signs meet tactile sign requirements: good color contrast, raised characters, Braille, and mounted in the correct location with required clear floor space?",
      help:
        "Mounting is typically on the wall at the latch side of the door. Clear floor space must be outside the door swing. ADA: 703.2, 703.3, 703.4.2, 703.5.",
      solutionsIfNo: ["Install a tactile sign.", "Relocate the sign."],
      requireAnswer: true
    },
    {
      id: "3_5b",
      code: "3.5 (Height)",
      title: "Restroom sign height",
      question:
        "Is the sign mounted at the correct height: lowest character baseline at least 48 inches above the floor and highest character baseline no more than 60 inches above the floor?",
      help: "ADA: 703.4.1.",
      solutionsIfNo: ["Relocate the sign to the correct height."],
      requireAnswer: true
    },

    {
      id: "3_6",
      code: "3.6",
      title: "Door clear width",
      question:
        "Is the restroom door opening at least 32 inches clear when the door is open 90 degrees?",
      help: "ADA: 404.2.3.",
      solutionsIfNo: ["Install offset hinges.", "Alter the doorway."],
      requireAnswer: true
    },
    {
      id: "3_7",
      code: "3.7",
      title: "Maneuvering clearance at pull side",
      question:
        "For a front approach to the pull side of the door, is there at least 18 inches of clearance beyond the latch side and 60 inches of clear depth?",
      help: "ADA: 404.2.4.",
      solutionsIfNo: [
        "Remove obstructions.",
        "Reconfigure walls.",
        "Add an automatic door opener."
      ],
      requireAnswer: true
    },
    {
      id: "3_7b",
      code: "3.7 (Slope)",
      title: "Maneuvering area is level",
      question:
        "On both sides of the door, is the maneuvering clearance area level (no steeper than 1:48)?",
      help: "ADA: 404.2.4.",
      solutionsIfNo: [],
      requireAnswer: true
    },
    {
      id: "3_8",
      code: "3.8",
      title: "Threshold height and bevel",
      question:
        "Is the threshold compliant (within the allowed height and bevel rules, depending on when it was installed)?",
      help: "ADA: 404.2.5, 303.2.",
      solutionsIfNo: ["Remove or replace the threshold."],
      requireAnswer: true
    },
    {
      id: "3_9",
      code: "3.9",
      title: "Door hardware operable (handle/lock)",
      question:
        "Is the door hardware operable with one hand and without tight grasping, pinching, or twisting of the wrist (including the lock if provided)?",
      help: "ADA: 404.2.7.",
      solutionsIfNo: [
        "Replace an inaccessible knob with lever/loop/push hardware.",
        "Add an automatic door opener."
      ],
      requireAnswer: true
    },
    {
      id: "3_10",
      code: "3.10",
      title: "Hardware height",
      question:
        "Are operable parts of the door hardware between 34 and 48 inches above the floor?",
      help: "ADA: 404.2.7.",
      solutionsIfNo: ["Change the hardware height."],
      requireAnswer: true
    },
    {
      id: "3_11",
      code: "3.11",
      title: "Door opening force",
      question:
        "Can the door be opened easily (maximum 5 pounds of force)?",
      help: "ADA: 404.2.9.",
      solutionsIfNo: [
        "Adjust or replace door closers.",
        "Install power-assisted or automatic door openers."
      ],
      requireAnswer: true
    },
    {
      id: "3_12",
      code: "3.12",
      title: "Closer closing speed",
      question:
        "If the door has a closer, does it take at least 5 seconds to close from 90 degrees open to 12 degrees from the latch?",
      help: "ADA: 404.2.8.1.",
      solutionsIfNo: ["Adjust the door closer."],
      requireAnswer: true
    },
    {
      id: "3_13",
      code: "3.13",
      title: "Two doors in series (vestibule)",
      question:
        "If there are two doors in series, is the space between the doors at least 48 inches plus the door widths when they swing into that space?",
      help: "ADA: 404.2.6.",
      solutionsIfNo: ["Remove the inner door.", "Change the door swing."],
      requireAnswer: true
    },
    {
      id: "3_14",
      code: "3.14",
      title: "Privacy wall + door swings out",
      question:
        "If there is a privacy wall and the door swings out, is there at least 24 inches beyond the latch side and 42 inches to the privacy wall?",
      help: "ADA: 404.2.4.",
      solutionsIfNo: ["Reconfigure the space."],
      requireAnswer: true
    },
    {
      id: "3_15",
      code: "3.15",
      title: "Privacy wall + door swings in",
      question:
        "If there is a privacy wall and the door swings in, is there at least 24 inches beyond the latch side and enough space to the privacy wall (48 inches without a closer, or 54 inches with a closer)?",
      help: "ADA: 404.2.4.",
      solutionsIfNo: ["Reconfigure the space."],
      requireAnswer: true
    },

    {
      id: "3_16",
      code: "3.16",
      title: "Clear path to fixtures",
      question:
        "Is there a clear path to at least one of each fixture type that is at least 36 inches wide?",
      help: "ADA: 403.5.1.",
      solutionsIfNo: ["Remove obstructions."],
      requireAnswer: true
    },
    {
      id: "3_17",
      code: "3.17",
      title: "Turning space",
      question:
        "Is there enough clear floor space for a wheelchair to turn around (60-inch circle or T-turn)?",
      help: "ADA: 603.2.1.",
      solutionsIfNo: ["Move or remove partitions/objects (trash cans, etc.)."],
      requireAnswer: true
    },
    {
      id: "3_18",
      code: "3.18",
      title: "Single-user: door swing over fixture space",
      question:
        "In a single-user restroom, if the door swings into the clear floor space at an accessible fixture, is there a 30 x 48 inch clear floor space outside the door swing?",
      help: "ADA: 603.2.3 Exception 2.",
      solutionsIfNo: ["Reverse the door swing.", "Alter the restroom layout."],
      requireAnswer: true
    },

    {
      id: "3_19",
      code: "3.19",
      title: "Mirror height",
      question:
        "Is the bottom of the mirror’s reflecting surface low enough (40 inches max over a sink/counter, or 35 inches max if not over a sink/counter)?",
      help: "ADA: 603.3.",
      solutionsIfNo: ["Lower the mirror.", "Add another compliant mirror."],
      requireAnswer: true
    },
    {
      id: "3_20",
      code: "3.20",
      title: "Coat hook height",
      question:
        "If there is a coat hook, is it within the allowed height range (generally 15 to 48 inches above the floor)?",
      help: "ADA: 603.4.",
      solutionsIfNo: ["Adjust or add an accessible hook."],
      requireAnswer: true
    },

    {
      id: "3_21",
      code: "3.21",
      title: "Lavatory clear floor space",
      question:
        "Does at least one lavatory have a 30 x 48 inch clear floor space for a forward approach?",
      help: "ADA: 606.2.",
      solutionsIfNo: ["Alter or replace the lavatory."],
      requireAnswer: true
    },
    {
      id: "3_22",
      code: "3.22",
      title: "Lavatory reach (space under sink)",
      question:
        "Does the clear floor space extend under the lavatory far enough so a wheelchair user can reach the faucet (about 17–25 inches)?",
      help: "ADA: 306.2.",
      solutionsIfNo: ["Alter or replace the lavatory."],
      requireAnswer: true
    },
    {
      id: "3_23",
      code: "3.23",
      title: "Lavatory height",
      question:
        "Is the lavatory or counter surface no higher than 34 inches above the floor?",
      help: "ADA: 606.3.",
      solutionsIfNo: ["Alter or replace the lavatory."],
      requireAnswer: true
    },
    {
      id: "3_24",
      code: "3.24",
      title: "Knee clearance",
      question:
        "Is there at least 27 inches of knee clearance under the lavatory (extending at least 8 inches under)?",
      help: "ADA: 306.3.3.",
      solutionsIfNo: ["Alter or replace the lavatory."],
      requireAnswer: true
    },
    {
      id: "3_25",
      code: "3.25",
      title: "Toe clearance",
      question:
        "Is there compliant toe clearance under the lavatory where required (at least 9 inches high)?",
      help: "ADA: 306.3.3.",
      solutionsIfNo: ["Alter or replace the lavatory."],
      requireAnswer: true
    },
    {
      id: "3_26",
      code: "3.26",
      title: "Protect against hot/sharp pipes",
      question:
        "Are pipes under the lavatory insulated or covered to protect against contact?",
      help: "ADA: 606.5.",
      solutionsIfNo: ["Install pipe insulation.", "Install a cover panel."],
      requireAnswer: true
    },
    {
      id: "3_27",
      code: "3.27",
      title: "Faucet usability and force",
      question:
        "Can the faucet be used without tight grasping/pinching/twisting, and with no more than 5 pounds of force?",
      help: "ADA: 606.4.",
      solutionsIfNo: ["Adjust the faucet.", "Replace the faucet."],
      requireAnswer: true
    },
    {
      id: "3_28",
      code: "3.28",
      title: "Soap dispenser reach range",
      question:
        "Are soap dispenser controls within the allowed reach range?",
      help: "ADA: 308.2.",
      solutionsIfNo: ["Relocate or add an accessible soap dispenser."],
      requireAnswer: true
    },
    {
      id: "3_29",
      code: "3.29",
      title: "Hand dryer/towel dispenser reach + usability",
      question:
        "Are hand dryer or towel dispenser controls within reach, usable without tight grasping/pinching/twisting, and requiring no more than 5 pounds of force?",
      help: "ADA: 308.2, 309.4.",
      solutionsIfNo: ["Relocate or add an accessible dispenser."],
      requireAnswer: true
    },

    {
      id: "3_30",
      code: "3.30",
      title: "Toilet centerline from side wall",
      question:
        "Is the toilet centerline 16 to 18 inches from the side wall or partition?",
      help: "ADA: 604.2.",
      solutionsIfNo: ["Move the toilet or partition."],
      requireAnswer: true
    },
    {
      id: "3_31",
      code: "3.31",
      title: "Clearance around toilet",
      question:
        "Is there enough clearance around the toilet (based on ADA toilet clearance dimensions)?",
      help: "ADA: 604.3.1.",
      solutionsIfNo: ["Alter the compartment to provide the required clearance."],
      requireAnswer: true
    },
    {
      id: "3_32",
      code: "3.32",
      title: "Toilet seat height",
      question:
        "Is the toilet seat height 17 to 19 inches above the floor (to the top of the seat)?",
      help: "ADA: 604.4.",
      solutionsIfNo: ["Adjust or replace the toilet."],
      requireAnswer: true
    },
    {
      id: "3_33",
      code: "3.33",
      title: "Side grab bar requirements",
      question:
        "Is there a side grab bar that meets the required length, position, height, and clearances?",
      help: "ADA: 604.5.1, 609.3, 609.4.",
      solutionsIfNo: ["Install or relocate the grab bar.", "Relocate nearby objects."],
      requireAnswer: true
    },
    {
      id: "3_34",
      code: "3.34",
      title: "Rear grab bar requirements",
      question:
        "Is there a rear grab bar that meets the required length, position, height, and clearances?",
      help: "ADA: 604.5.2, 609.3, 609.4.",
      solutionsIfNo: ["Install or relocate the grab bar.", "Relocate nearby objects."],
      requireAnswer: true
    },
    {
      id: "3_35",
      code: "3.35",
      title: "Flush control height (hand-operated)",
      question:
        "If the flush control is hand-operated, is it no higher than 48 inches above the floor?",
      help: "ADA: 604.6.",
      solutionsIfNo: ["Relocate the control.", "Use a compliant sensor override button."],
      requireAnswer: true
    },
    {
      id: "3_36",
      code: "3.36",
      title: "Flush control usability and force",
      question:
        "If hand-operated, can the flush control be used without tight grasping/pinching/twisting and with no more than 5 pounds of force?",
      help: "ADA: 309.4.",
      solutionsIfNo: ["Change or adjust the control."],
      requireAnswer: true
    },
    {
      id: "3_37",
      code: "3.37",
      title: "Flush control location",
      question:
        "Is the flush control on the open side of the toilet (not the side against the wall)?",
      help: "ADA: 604.6.",
      solutionsIfNo: ["Relocate the control."],
      requireAnswer: true
    },
    {
      id: "3_38",
      code: "3.38",
      title: "Toilet paper dispenser distance",
      question:
        "Is the toilet paper dispenser located the correct distance from the front edge of the toilet (typically 7–9 inches to the centerline)?",
      help: "ADA: 604.7.",
      solutionsIfNo: ["Relocate the dispenser."],
      requireAnswer: true
    },
    {
      id: "3_39",
      code: "3.39",
      title: "Dispenser outlet height / not behind grab bars",
      question:
        "Is the dispenser outlet within 15–48 inches above the floor and not located behind grab bars?",
      help: "ADA: 604.7.",
      solutionsIfNo: ["Relocate the dispenser."],
      requireAnswer: true
    },
    {
      id: "3_40",
      code: "3.40",
      title: "Continuous paper flow",
      question:
        "Does the toilet paper dispenser allow continuous paper flow?",
      help: "ADA: 604.7.",
      solutionsIfNo: ["Adjust or replace the dispenser."],
      requireAnswer: true
    },

    {
      id: "3_41",
      code: "3.41",
      title: "Stall door clear width",
      question:
        "In stalls, is the door opening at least 32 inches clear when open 90 degrees?",
      help: "ADA: 604.8.1.2.",
      solutionsIfNo: ["Widen the door opening."],
      requireAnswer: true
    },
    {
      id: "3_42",
      code: "3.42",
      title: "Stall door maneuvering clearance",
      question:
        "For a front approach to the pull side of the stall door, is there at least 18 inches beyond the latch side and 60 inches clear depth?",
      help: "ADA: 604.8.1.2.",
      solutionsIfNo: ["Remove obstructions."],
      requireAnswer: true
    },
    {
      id: "3_43",
      code: "3.43",
      title: "Stall door self-closing",
      question: "Is the stall door self-closing?",
      help: "ADA: 604.8.1.2.",
      solutionsIfNo: ["Add/adjust a door closer.", "Replace the door."],
      requireAnswer: true
    },
    {
      id: "3_44",
      code: "3.44",
      title: "Stall door pulls both sides",
      question:
        "Are there door pulls on both sides of the stall door that can be used without tight grasping/pinching/twisting (older exceptions may apply)?",
      help: "ADA: 604.8.1.2.",
      solutionsIfNo: ["Replace or add compliant door pulls."],
      requireAnswer: true
    },
    {
      id: "3_45",
      code: "3.45",
      title: "Stall lock usability",
      question:
        "Is the stall lock operable with one hand and without tight grasping, pinching, or twisting?",
      help: "ADA: 309.4.",
      solutionsIfNo: ["Replace the lock."],
      requireAnswer: true
    },
    {
      id: "3_46",
      code: "3.46",
      title: "Stall hardware height",
      question:
        "Are operable parts of stall door hardware between 34 and 48 inches above the floor?",
      help: "ADA: 404.2.7.",
      solutionsIfNo: ["Relocate the hardware."],
      requireAnswer: true
    },
    {
      id: "3_47",
      code: "3.47",
      title: "Stall width",
      question:
        "Is the toilet compartment (stall) at least 60 inches wide?",
      help: "ADA: 604.8.1.1.",
      solutionsIfNo: ["Alter the compartment to meet width."],
      requireAnswer: true
    },
    {
      id: "3_48",
      code: "3.48",
      title: "Stall depth (wall-hung)",
      question:
        "If the toilet is wall-hung, is the stall at least 56 inches deep?",
      help: "ADA: 604.8.1.1.",
      solutionsIfNo: ["Alter the compartment depth."],
      requireAnswer: true
    },
    {
      id: "3_49",
      code: "3.49",
      title: "Stall depth (floor-mounted)",
      question:
        "If the toilet is floor-mounted, is the stall at least 59 inches deep?",
      help: "ADA: 604.8.1.1.",
      solutionsIfNo: ["Alter the compartment depth."],
      requireAnswer: true
    },
    {
      id: "3_50",
      code: "3.50",
      title: "Stall area beyond inward door swing",
      question:
        "If the stall door swings in, is the required stall area provided beyond the door swing?",
      help: "ADA: 604.8.1.1.",
      solutionsIfNo: ["Reverse the door swing.", "Alter the compartment."],
      requireAnswer: true
    }
  ]
};
