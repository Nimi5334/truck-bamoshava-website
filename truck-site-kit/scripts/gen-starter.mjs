import fs from "fs";

function svgPlaceholder(w, h, label, bg, fg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}' role='img' aria-label='placeholder' preserveAspectRatio='xMidYMid slice'>
  <rect width='${w}' height='${h}' fill='${bg}'/>
  <rect x='2' y='2' width='${w - 4}' height='${h - 4}' fill='none' stroke='${fg}' stroke-width='3' stroke-dasharray='10 8' opacity='0.55'/>
  <g fill='none' stroke='${fg}' stroke-width='${Math.max(4, w / 60)}' opacity='0.65'>
    <rect x='${w / 2 - 70}' y='${h / 2 - 52}' width='140' height='104' rx='14'/>
    <circle cx='${w / 2 - 30}' cy='${h / 2 - 18}' r='16'/>
    <path d='M ${w / 2 - 70} ${h / 2 + 36} l 46 -40 l 34 28 l 40 -34 l 40 46 z'/>
  </g>
  <text x='${w / 2}' y='${h / 2 + 96}' text-anchor='middle' font-family='Assistant, Arial, sans-serif' font-size='${Math.max(20, w / 28)}' font-weight='700' fill='${fg}' opacity='0.75'>${label}</text>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

function svgIcon(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' role='img' aria-label='icon'>
  <rect width='32' height='32' rx='7' fill='#7A7A85'/>
  <text x='16' y='21' text-anchor='middle' font-family='Assistant, Arial, sans-serif' font-size='13' font-weight='700' fill='#F4F4F6'>${label}</text>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

function svgLogo() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 440 220' width='440' height='220' role='img' aria-label='placeholder logo'>
  <rect width='440' height='220' fill='none'/>
  <rect x='60' y='40' width='320' height='140' rx='16' fill='none' stroke='#7A7A85' stroke-width='4' stroke-dasharray='12 10'/>
  <text x='220' y='118' text-anchor='middle' font-family='Assistant, Arial, sans-serif' font-size='26' font-weight='700' fill='#54545E'>הלוגו שלך</text>
  <text x='220' y='150' text-anchor='middle' font-family='Assistant, Arial, sans-serif' font-size='15' fill='#8A8A93'>העלו כאן במערכת הניהול</text>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

const BG1 = "#EDEDF0", FG1 = "#54545E";
const BG2 = "#E4E4E9", FG2 = "#4A4A54";

const heroBg = svgPlaceholder(1200, 800, "שימו כאן תמונת רקע", BG1, FG1);
const galleryImg = (n) => svgPlaceholder(800, 600, "שימו כאן תמונה " + n, n % 2 ? BG1 : BG2, n % 2 ? FG1 : FG2);
const mediaPoster = svgPlaceholder(1920, 1080, "שימו כאן תמונה או וידאו", BG1, FG1);
const logo = svgLogo();
const favicon = svgIcon("לוגו");

const site = {
  schemaVersion: 1,
  siteId: "starter",
  meta: {
    lang: "he",
    dir: "rtl",
    title: "שם העסק שלכם | תיאור קצר של העסק",
    description: "כתבו כאן משפט תיאור קצר על העסק שלכם. הטקסט הזה מופיע בתוצאות החיפוש וברשתות החברתיות.",
    favicon,
    themeColor: "#EDEDF0",
    fontsHref: "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700;900&family=Amatic+SC:wght@700&display=swap"
  },
  theme: {
    colors: {
      bg: "#EDEDF0",
      bgDeep: "#E2E2E7",
      surface: "#FFFFFF",
      ink: "#232328",
      inkSoft: "#5C5C66",
      sage: "#8A8A93",
      sageDeep: "#5C5C66",
      sageDark: "#3A3A42",
      olive: "#71717A",
      line: "#D6D6DC"
    },
    radius: "14px",
    fonts: {
      head: "\"Frank Ruhl Libre\",serif",
      body: "\"Assistant\",sans-serif"
    }
  },
  brand: {
    name: "שם העסק",
    logo
  },
  nav: {
    links: [
      { label: "אודות", href: "#story" },
      { label: "התפריט / השירותים", href: "#menu" },
      { label: "גלריה", href: "#gallery" },
      { label: "סניפים ושעות", href: "#locations" },
      { label: "צרו קשר", href: "#contact" }
    ],
    cta: { label: "לתפריט המלא", href: "#menu" }
  },
  sections: [
    {
      id: "top",
      type: "hero",
      visible: true,
      data: {
        logo,
        logoAlt: "הלוגו של העסק",
        background: heroBg,
        headline: "כותרת ראשית\nשל האתר שלכם",
        lead: "זהו אזור הפתיחה של האתר. כתבו כאן משפט או שניים שמסבירים מי אתם ומה אתם מציעים. כל הטקסט הזה נערך במערכת הניהול.",
        ctas: [
          { label: "לתפריט המלא", href: "#menu", style: "primary" },
          { label: "איך מגיעים אלינו", href: "#locations", style: "ghost" }
        ]
      }
    },
    {
      id: "story",
      type: "richtext",
      visible: true,
      data: {
        heading: "כותרת אזור הסיפור",
        paragraphs: [
          "זהו אזור טקסט חופשי לספר את הסיפור של העסק שלכם — מי אתם, מה אתם עושים, ולמה דווקא אתם. כתבו כאן שני-שלושה משפטים שמייצגים את העסק.",
          "ניתן להוסיף כאן פסקה נוספת, למשל על השירות, המוצרים, או הערכים של העסק. כל הטקסט הזה נערך בקלות במערכת הניהול."
        ]
      }
    },
    {
      id: "menu",
      type: "menu",
      visible: true,
      data: {
        heading: "כותרת אזור התפריט",
        intro: "זהו אזור התפריט או רשימת השירותים שלכם. ערכו כאן את הקטגוריות, הפריטים והמחירים במערכת הניהול.",
        currency: "₪",
        categories: [
          {
            id: "cat-1",
            navLabel: "קטגוריה 1",
            title: "קטגוריה 1",
            groups: [
              { items: [
                { name: "שם הפריט", price: "0", tags: [], desc: "תיאור קצר של הפריט." },
                { name: "שם הפריט", price: "0", tags: [], desc: "תיאור קצר של הפריט." },
                { name: "שם הפריט", price: "0", tags: [], desc: "תיאור קצר של הפריט." }
              ] }
            ]
          },
          {
            id: "cat-2",
            navLabel: "קטגוריה 2",
            title: "קטגוריה 2",
            groups: [
              { items: [
                { name: "שם הפריט", price: "0", tags: [] },
                { name: "שם הפריט", price: "0", tags: [] },
                { name: "שם הפריט", price: "0", tags: [], desc: "תיאור קצר של הפריט." }
              ] }
            ]
          }
        ]
      }
    },
    {
      id: "gallery",
      type: "gallery",
      visible: true,
      data: {
        heading: "כותרת אזור הגלריה",
        intro: "זהו אזור הגלריה. החליפו את התמונות האלה בתמונות אמיתיות של העסק שלכם דרך מערכת הניהול.",
        images: [
          { src: galleryImg(1), alt: "שימו כאן תמונה" },
          { src: galleryImg(2), alt: "שימו כאן תמונה" },
          { src: galleryImg(3), alt: "שימו כאן תמונה" }
        ]
      }
    },
    {
      id: "photo-band",
      type: "media",
      visible: true,
      data: {
        poster: mediaPoster,
        video: "",
        sectionLabel: "שימו כאן תמונה או וידאו של העסק",
        videoLabel: "וידאו של העסק"
      }
    },
    {
      id: "locations",
      type: "locations",
      visible: true,
      data: {
        heading: "כותרת אזור הסניפים",
        intro: "זהו אזור המיקומים והשעות. הוסיפו כאן את הסניפים, הכתובות והשעות שלכם דרך מערכת הניהול.",
        footnote: "ניתן להוסיף כאן הערה כללית, למשל שהשעות עשויות להשתנות.",
        branches: [
          {
            id: "main",
            name: "שם הסניף",
            desc: "כתבו כאן איפה הסניף נמצא ומה מסביב. לחיצה על הכפתור פותחת ניווט בוויז.",
            waze: { lat: 32.0853, lng: 34.7818 },
            hours: {
              "0": [9, 17], "1": [9, 17], "2": [9, 17], "3": [9, 17], "4": [9, 17], "5": [9, 14], "6": null
            }
          }
        ]
      }
    },
    {
      id: "contact",
      type: "social",
      visible: true,
      data: {
        heading: "כותרת אזור הקשר",
        intro: "זהו אזור הרשתות החברתיות ויצירת הקשר. עדכנו כאן את הקישורים שלכם דרך מערכת הניהול.",
        links: [
          { network: "instagram", label: "@your_business", url: "https://instagram.com/" },
          { network: "whatsapp", label: "שלחו הודעה", url: "https://wa.me/972500000000" }
        ]
      }
    }
  ],
  footer: {
    logo,
    logoAlt: "שם העסק",
    links: [
      { label: "התפריט", href: "#menu" },
      { label: "סניפים ושעות", href: "#locations" },
      { label: "אינסטגרם", href: "https://instagram.com/", external: true }
    ],
    copyright: "שם העסק. כל הזכויות שמורות.",
    regions: "ערכו את הפוטר במערכת הניהול"
  }
};

fs.writeFileSync(new URL("../starter/site.json", import.meta.url), JSON.stringify(site, null, 2) + "\n");
console.log("written");
