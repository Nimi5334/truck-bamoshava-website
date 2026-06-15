/**
 * Schema metadata for the editor: human labels (Hebrew, matching the client
 * base), the curated font list, color-token labels, and dietary-tag options.
 * Keeping this data here makes the editor declarative and easy to extend.
 */

// Curated Google Fonts offered in the theme editor. family is the CSS value
// (with a generic fallback); href loads the font.
export const FONT_CHOICES = [
  { family: '"Assistant",sans-serif', label: "Assistant", href: "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" },
  { family: '"Frank Ruhl Libre",serif', label: "Frank Ruhl Libre", href: "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" },
  { family: '"Heebo",sans-serif', label: "Heebo", href: "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" },
  { family: '"Rubik",sans-serif', label: "Rubik", href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" },
  { family: '"Secular One",sans-serif', label: "Secular One", href: "https://fonts.googleapis.com/css2?family=Secular+One&display=swap" },
  { family: '"David Libre",serif', label: "David Libre", href: "https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap" },
];

// theme.colors key -> friendly label.
export const COLOR_LABELS = {
  bg: "רקע ראשי",
  bgDeep: "רקע משני",
  surface: "כרטיסים",
  ink: "טקסט ראשי",
  inkSoft: "טקסט משני",
  sage: "צבע מותג",
  sageDeep: "מותג כהה (קישורים)",
  sageDark: "כפתורים",
  olive: "הדגשה",
  line: "קווי הפרדה",
};

export const TAG_OPTIONS = [
  { value: "vegan", label: "טבעוני" },
  { value: "vegan-option", label: "אפשרות טבעונית" },
  { value: "gf", label: "ללא גלוטן" },
];

export const SECTION_LABELS = {
  hero: "כותרת ראשית (Hero)",
  richtext: "טקסט / סיפור",
  menu: "תפריט",
  media: "וידאו / תמונה",
  locations: "סניפים ושעות",
  social: "רשתות חברתיות",
};

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export const LABELS = {
  login_title: "עריכת האתר",
  login_sub: "התחברו כדי לערוך את התוכן של האתר שלכם.",
  password: "סיסמה",
  signin: "כניסה",
  save: "שמירת שינויים",
  saving: "שומר…",
  saved: "נשמר! האתר יתעדכן תוך כדקה.",
  logout: "יציאה",
  preview: "תצוגה מקדימה",
  general: "כללי",
  theme: "צבעים וגופנים",
  navigation: "תפריט עליון",
  sections: "אזורי התוכן",
  footer: "כותרת תחתונה",
  brand_name: "שם העסק",
  logo: "לוגו",
  site_title: "כותרת הדף (לשונית/גוגל)",
  site_desc: "תיאור הדף (גוגל)",
  add: "הוספה",
  remove: "מחיקה",
  up: "↑",
  down: "↓",
  visible: "מוצג באתר",
  radius: "עיגול פינות",
};
