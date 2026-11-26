export const SUBJECTS = [
  { code: "CP104", name: "Computer Programming", bg: "#58AFFC" },
  { code: "PKLP", name: "Pagbasa at Pagsusuri", bg: "#FF9F6B" },
  { code: "GENSCI", name: "General Science", bg: "#70D1FE" },
  { code: "EFFCOM", name: "Effective Comm", bg: "#8FE3A8" },
  { code: "MABKOM", name: "Komunikasyon", bg: "#D8C7A0" },
  { code: "THEOLOGY", name: "Theology", bg: "#C3C7D6" },
  { code: "FINMATH101", name: "Financial Math", bg: "#C9A6E0" },
  { code: "PE", name: "Physical Education", bg: "#F7CD54" },
  { code: "GENMATH", name: "General Math", bg: "#FBA6F7" },
  { code: "PERDEV", name: "Personal Dev", bg: "#7FF0E0" },
];

export const SUBJECT_BG_MAP = Object.fromEntries(
  SUBJECTS.map((subject) => [subject.code, subject.bg])
);

export const HERO_FILTERS = ["ALL", "CP104", "GENSCI", "PERDEV", "PKLP"];

export const INITIAL_HERO_TASKS = [
  {
    id: "t1",
    title: "Build mock SaaS landing + login flow",
    subj: "CP104",
    due: "Due tomorrow · 5:00 PM",
    tone: "is-soon",
    done: false,
  },
  {
    id: "t2",
    title: "Oral recitation: Newton's laws",
    subj: "GENSCI",
    due: "In 2 days · 9:30 AM",
    tone: "",
    done: false,
  },
  {
    id: "t3",
    title: "Journal entry: community immersion prep",
    subj: "PERDEV",
    due: "In 3 days · 5:00 PM",
    tone: "",
    done: false,
  },
  {
    id: "t4",
    title: "Read chapter 7 of Noli Me Tangere",
    subj: "PKLP",
    due: "Fri · 11:59 PM",
    tone: "",
    done: false,
  },
];

export const CALENDAR_DAYS = [
  22, 23, 24, 25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5,
];

export const CALENDAR_EVENTS = {
  24: [
    { title: "Warm-up routine log", subj: "PE", time: "2:00 PM" },
  ],
  26: [
    { title: "Submit statistical survey draft", subj: "MABKOM", time: "5:00 PM" },
    { title: "Reading response: ethics case", subj: "THEOLOGY", time: "8:00 PM" },
  ],
  27: [
    { title: "Build mock SaaS landing + login flow", subj: "CP104", time: "5:00 PM" },
    { title: "Quiz: compound interest tables", subj: "FINMATH101", time: "11:00 AM" },
    { title: "Draft radio drama scene 1", subj: "PERDEV", time: "7:30 PM" },
  ],
  28: [
    { title: "Oral recitation: Newton's laws", subj: "GENSCI", time: "9:30 AM" },
    { title: "Annotate chapter 7 vocabulary", subj: "PKLP", time: "4:00 PM" },
  ],
  30: [
    { title: "Journal entry: community immersion prep", subj: "PERDEV", time: "5:00 PM" },
  ],
  2: [
    { title: "Problem set: rational functions", subj: "GENMATH", time: "1:00 PM" },
    { title: "Speech outline peer check", subj: "EFFCOM", time: "3:30 PM" },
  ],
};

export const WORKFLOW_TABS = [
  {
    id: "board",
    label: "Class Board",
    heading: "One shared class board, private local progress.",
    description:
      "Class officers publish tasks once. Every student reads the same schedule while checking off work on their own device.",
    bullets: [
      "Hard 2px edges and 0px corners keep scanning fast",
      "Royal Blue marks active focus without loud alarm banners",
      "Ten high-contrast subject labels for instant recognition",
    ],
  },
  {
    id: "calendar",
    label: "Calm Calendar",
    heading: "Calendar view with closed tasks filtered out.",
    description:
      "Dates and due times render in crisp tabular numerals. Select any highlighted day to inspect its scheduled deadline.",
    bullets: [
      "Color-coded subject markers inside each day cell",
      "Closed and archived tasks stay out of upcoming weeks",
      "Select days 26, 27, 28, or 30 to inspect the daily agenda",
    ],
  },
  {
    id: "qr",
    label: "QR Transfer",
    heading: "Move your checklist to a new device in one scan.",
    description:
      "Carry your local progress from laptop to phone with a short-lived pixel QR matrix or pair it with a portal account.",
    bullets: [
      "Zero tracking scripts or third-party analytics",
      "One-tap transfer code regeneration",
      "Works alongside optional PostgreSQL portal sign-in",
    ],
  },
  {
    id: "publish",
    label: "Draft & Publish",
    heading: "Draft quietly, preview as a student, then publish.",
    description:
      "Class reps stage edits in a private draft sheet before releasing updates live to the entire section.",
    bullets: [
      "Atomic publish with versioned rollback history",
      "Student-view preview before every release",
      "Clear separation between staging and live board state",
    ],
  },
];

export const PRICING_PLANS = [
  {
    id: "single-class",
    tier: "Section",
    name: "Single Class",
    termPrice: "$0",
    yearPrice: "$0",
    unit: "always free",
    summary: "Everything a 20-student section needs to stay on top of weekly work.",
    features: [
      "Board, List, and Calendar views",
      "Ten custom subject color labels",
      "Local progress and QR transfer",
    ],
    cta: "Start with Single Class",
    featured: false,
  },
  {
    id: "whole-grade",
    tier: "Batch Pro",
    name: "Whole Grade Level",
    termPrice: "$5",
    yearPrice: "$4",
    unit: "section / month",
    summary: "Multi-section publishing, draft diff previews, and pinned batch announcements.",
    features: [
      "Unlimited sections and officers",
      "Draft staging and version history",
      "Cloud session portal access",
    ],
    cta: "Start with Batch Pro",
    featured: true,
  },
  {
    id: "school-portal",
    tier: "Campus",
    name: "School Portal",
    termPrice: "$24",
    yearPrice: "$19",
    unit: "campus / month",
    summary: "Department-wide boards, custom domain branding, and archival exports.",
    features: [
      "Custom school domain and badges",
      "Automated nightly JSON backups",
      "Priority officer onboarding",
    ],
    cta: "Start with School Portal",
    featured: false,
  },
];
