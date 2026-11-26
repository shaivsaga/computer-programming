export const SUBJECTS = [
  { code: "CP104", name: "Computer Programming 104", bg: "#58AFFC" },
  { code: "PKLP", name: "Pag-aaral ng Kasaysayang Lipunang Pilipino", bg: "#FF9F6B" },
  { code: "GENSCI", name: "General Science", bg: "#70D1FE" },
  { code: "EFFCOM", name: "Effective Communication", bg: "#8FE3A8" },
  { code: "MABKOM", name: "Mabisang Komunikasyon", bg: "#D8C7A0" },
  { code: "THEOLOGY", name: "Theology", bg: "#C3C7D6" },
  { code: "FINMATH101", name: "Finite Mathematics 101", bg: "#C9A6E0" },
  { code: "PE", name: "Physical Education", bg: "#F7CD54" },
  { code: "GENMATH", name: "General Math", bg: "#FBA6F7" },
  { code: "PERDEV", name: "Personal Development", bg: "#7FF0E0" },
];

export const SUBJECT_BG_MAP = Object.fromEntries(
  SUBJECTS.map((subject) => [subject.code, subject.bg])
);

export const HERO_FILTERS = ["ALL", "CP104", "GENSCI", "PERDEV", "PKLP"];

export const BOARD_COLUMNS = [
  {
    id: "todo",
    label: "To Do",
    dotClass: "",
    badgeClass: "",
    emptyText: "No tasks waiting here.",
  },
  {
    id: "progress",
    label: "In Progress",
    dotClass: "is-progress",
    badgeClass: "is-progress",
    emptyText: "Move an active task here.",
  },
  {
    id: "done",
    label: "Done",
    dotClass: "is-done",
    badgeClass: "is-done",
    emptyText: "Advance a task to finish it.",
  },
];

export const NEXT_TASK_STATUS = {
  todo: "progress",
  progress: "done",
  done: "todo",
};

export const INITIAL_HERO_TASKS = [
  {
    id: "t1",
    title: "Build mock SaaS landing + login flow",
    subj: "CP104",
    due: "Due tomorrow · 5:00 PM",
    tone: "is-soon",
    status: "progress",
  },
  {
    id: "t2",
    title: "Oral recitation: Newton's laws",
    subj: "GENSCI",
    due: "In 2 days · 9:30 AM",
    tone: "",
    status: "todo",
  },
  {
    id: "t3",
    title: "Journal entry: community immersion prep",
    subj: "PERDEV",
    due: "In 3 days · 5:00 PM",
    tone: "",
    status: "todo",
  },
  {
    id: "t4",
    title: "Primary source brief: 1898 Malolos Congress",
    subj: "PKLP",
    due: "Fri · 11:59 PM",
    tone: "",
    status: "todo",
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
    { title: "Quiz: truth tables and matrices", subj: "FINMATH101", time: "11:00 AM" },
    { title: "Draft radio drama scene 1", subj: "PERDEV", time: "7:30 PM" },
  ],
  28: [
    { title: "Oral recitation: Newton's laws", subj: "GENSCI", time: "9:30 AM" },
    { title: "Source timeline: Cavite Mutiny notes", subj: "PKLP", time: "4:00 PM" },
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
