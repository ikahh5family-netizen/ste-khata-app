export const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "STE Mobile Care";
export const SHOP_FULL_NAME = "Star Tech Electronics";
export const SHOP_TAGLINE = "Since 2003";
export const SHOP_LOGO = "/logo.png";
export const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || "";
export const SHOP_ADDRESS = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "";

export const PRINT_TERMS = [
  "Phone will be handed over only on showing this job card.",
  "Shop is not responsible if the device is not collected within 30 days.",
  "No warranty on water damage, physical damage or burnt boards.",
  "Data backup is the customer's responsibility.",
  "Warranty covers the replaced part only, not the whole device.",
];

export const IPHONE_MODELS = [
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Air", "iPhone 17",
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
  "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
  "iPhone SE (3rd gen)", "iPhone SE (2nd gen)",
  "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
  "iPhone 6s Plus", "iPhone 6s", "iPad", "Apple Watch", "AirPods", "Android / Other",
];

export const REPAIR_TYPES = [
  "Screen / Display",
  "Battery",
  "Charging Port",
  "Back Glass",
  "Rear Camera",
  "Front Camera",
  "Face ID",
  "Touch ID / Home Button",
  "Speaker / Ear Speaker",
  "Microphone",
  "Water Damage",
  "Motherboard / IC",
  "Network / Baseband",
  "Housing / Body",
  "Power / Volume Button",
  "Software / iCloud / Update",
  "Camera Glass",
  "Other",
];

export const PART_CATEGORIES = [
  "Display", "Battery", "Charging Flex", "Back Glass", "Camera", "Face ID",
  "Speaker", "Housing", "IC / Chip", "Accessories", "Cable / Charger", "Tempered Glass", "Cover", "Other",
];

export const EXPENSE_CATEGORIES = [
  "Rent", "Salary", "Bijli (Electricity)", "Gas / Generator", "Tools", "Tea / Food", "Transport", "Internet / Phone", "Marketing", "Other",
];

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
];

export const JOB_STATUSES = [
  { value: "received", label: "Received", color: "bg-sky-100 text-sky-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "waiting_part", label: "Waiting Part", color: "bg-purple-100 text-purple-700" },
  { value: "ready", label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  { value: "delivered", label: "Delivered", color: "bg-slate-200 text-slate-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-rose-100 text-rose-700" },
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number]["value"];

export function statusInfo(s: string) {
  return JOB_STATUSES.find((x) => x.value === s) ?? JOB_STATUSES[0];
}
