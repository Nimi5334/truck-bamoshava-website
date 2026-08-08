/* The site is the interface. Clicking any part of the page opens a long
   drawer with that part's fields — there is no separate "form screen",
   and nothing is named after a web concept the owner doesn't use. */

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'truck.site.v1';

const DEFAULTS = {
  search: {
    title: 'טראק במושבה | פוד־טראק אמיתי',
    desc: ''
  },
  hero: {
    title: 'פוד־טראק אמיתי, במושבה שלכם',
    sub: 'אוכל רחוב בלי פשרות. מגיעים אלינו לזכרון יעקב, או קוראים לנו לאירוע.',
    cta: 'לתפריט המלא',
    phone: '052-123-4567'
  },
  story: {
    title: 'הסיפור שלנו',
    body: 'התחלנו ב־2019 עם טראק אחד וגריל ישן. היום אנחנו הכתובת לאוכל רחוב במושבה, עם תפריט שמתחדש כל עונה.'
  },
  menu: {
    title: 'התפריט',
    items: [
      { name: 'בורגר טראק במושבה', desc: 'אנטריקוט טחון, בצל מקורמל, לחמנייה רכה', price: '58' },
      { name: 'טאקו פטריות פורטבלה', desc: 'שלוש יחידות, סלסת עגבניות שרופה', price: '42' }
    ]
  },
  gallery: { title: 'תמונות מהטראק', images: [] },
  hours: {
    title: 'מתי אנחנו פתוחים',
    address: 'רחוב הבורסקאים 4, זכרון יעקב',
    rows: [
      { day: 'ראשון', open: '11:00', close: '21:00', on: true },
      { day: 'שני',   open: '11:00', close: '21:00', on: true },
      { day: 'שלישי', open: '11:00', close: '21:00', on: true },
      { day: 'רביעי', open: '11:00', close: '21:00', on: true },
      { day: 'חמישי', open: '11:00', close: '22:00', on: true },
      { day: 'שישי',  open: '09:00', close: '15:00', on: true },
      { day: 'שבת',   open: '',      close: '',      on: false }
    ]
  },
  contact: {
    title: 'דברו איתנו',
    phone: '052-123-4567',
    email: 'hello@truckbamoshava.co.il',
    ig: 'instagram.com/truck.bamoshava',
    fb: 'facebook.com/truckbamoshava'
  }
};

let model = load();

function load(){
  try{
    const saved = JSON.parse(localStorage.getItem(KEY));
    // Object URLs from a previous session are dead — start the gallery empty.
    if(saved) return { ...structuredClone(DEFAULTS), ...saved, gallery: { ...DEFAULTS.gallery, title: saved.gallery?.title || DEFAULTS.gallery.title } };
  }catch(e){ /* fall through to defaults */ }
  return structuredClone(DEFAULTS);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ══ render the site ═════════════════════════════════════════ */

const paper = document.getElementById('paper');
const strip = document.getElementById('serpzone');

const zoneBtn = (z, label) =>
  `<button class="zone-btn" data-open="${z}" aria-label="${esc(label)}">
     <span class="zone-tag"><svg aria-hidden="true"><use href="#i-edit"/></svg> עריכה</span>
   </button>`;

function renderStrip(){
  const s = model.search;
  strip.innerHTML = `
    <section class="zone card strip" data-zone="search">
      <div class="serp-note"><svg aria-hidden="true"><use href="#i-search"/></svg> ככה אתם מופיעים בתוצאות של גוגל</div>
      <div class="serp-url ltr">truck-bamoshava.co.il</div>
      <div class="serp-title">${esc(s.title)}</div>
      <div class="serp-desc${s.desc ? '' : ' empty'}">${s.desc ? esc(s.desc) : 'לא כתבתם משפט תיאור — גוגל יבחר לבד משפט מהאתר, ולרוב הוא ייחתך באמצע.'}</div>
      ${zoneBtn('search', 'עריכת השורה שמופיעה בגוגל')}
    </section>`;
}

function renderPaper(){
  const { hero, story, menu, gallery, hours, contact } = model;

  const shots = gallery.images.length
    ? gallery.images.map(u => `<img src="${esc(u)}" alt="">`).join('')
    : '<div class="ph">כאן יופיעו התמונות שתעלו</div>'.repeat(3);

  paper.innerHTML = `
    <section class="zone" data-zone="hero">
      <div class="s-hero">
        <h1>${esc(hero.title)}</h1>
        <p>${esc(hero.sub)}</p>
        <div><span class="s-cta">${esc(hero.cta)}</span></div>
        <span class="s-phone ltr">${esc(hero.phone)}</span>
      </div>
      ${zoneBtn('hero', 'עריכת הכותרת הראשית בראש האתר')}
    </section>

    <section class="zone" data-zone="story">
      <div class="s-sec">
        <h2>${esc(story.title)}</h2>
        <p>${esc(story.body)}</p>
      </div>
      ${zoneBtn('story', 'עריכת הסיפור של העסק')}
    </section>

    <section class="zone" data-zone="menu">
      <div class="s-sec">
        <h2>${esc(menu.title)}</h2>
        ${menu.items.map(i => `
          <div class="s-menu-row">
            <span class="n">${esc(i.name)}</span>
            <span class="d">${esc(i.desc)}</span>
            <span class="p mono ltr">₪${esc(i.price)}</span>
          </div>`).join('')}
      </div>
      ${zoneBtn('menu', 'עריכת התפריט והמחירים')}
    </section>

    <section class="zone" data-zone="gallery">
      <div class="s-sec">
        <h2>${esc(gallery.title)}</h2>
        <div class="s-gal">${shots}</div>
      </div>
      ${zoneBtn('gallery', 'הוספה ועריכה של תמונות')}
    </section>

    <section class="zone" data-zone="hours">
      <div class="s-sec">
        <h2>${esc(hours.title)}</h2>
        <div class="s-hours">
          ${hours.rows.map(r => `
            <div class="r">
              <span class="day">${esc(r.day)}</span>
              ${r.on ? `<span class="t ltr">${esc(r.open)}–${esc(r.close)}</span>` : '<span class="t closed">סגור</span>'}
            </div>`).join('')}
        </div>
        <p style="margin-top:18px">${esc(hours.address)}</p>
      </div>
      ${zoneBtn('hours', 'עריכת שעות הפתיחה והכתובת')}
    </section>

    <section class="zone" data-zone="contact">
      <div class="s-foot">
        <div>${esc(contact.title)}</div>
        <div class="ltr" style="font-weight:700;font-size:18px;color:var(--ink);margin-top:6px">${esc(contact.phone)}</div>
        <div class="links">
          <span class="ltr">${esc(contact.ig)}</span>
          <span class="ltr">${esc(contact.fb)}</span>
          <span class="ltr">${esc(contact.email)}</span>
        </div>
      </div>
      ${zoneBtn('contact', 'עריכת פרטי הקשר והרשתות')}
    </section>`;
}

function renderAll(){ renderStrip(); renderPaper(); markOpenZone(); }

/* ══ what each part of the site asks for ═════════════════════ */

const SCHEMA = {
  search: {
    title: 'השורה שלכם בגוגל',
    help: 'זה מה שאנשים רואים בתוצאות החיפוש, עוד לפני שנכנסו לאתר.',
    fields: [
      { k:'title', label:'הכותרת בגוגל', type:'text', max:60,
        hint:'שם העסק, מה אתם מגישים, ובאיזה יישוב. מעל 60 תווים גוגל חותך.' },
      { k:'desc', label:'המשפט שמתחת לכותרת', type:'textarea', max:155,
        hint:'שתי שורות שגורמות ללחוץ. כדאי לכתוב מה מגישים, איפה, ומתי פתוח.' }
    ]
  },
  hero: {
    title: 'הכותרת הראשית',
    help: 'החלק העליון של האתר — מה שרואים בשנייה הראשונה.',
    fields: [
      { k:'title', label:'הכותרת הגדולה', type:'text', max:60,
        hint:'משפט אחד קצר. אם אפשר, שיהיה בו שם היישוב.' },
      { k:'sub', label:'משפט ההסבר', type:'textarea',
        hint:'שורה־שתיים: מה אתם מגישים, ולמי.' },
      { k:'cta', label:'הכיתוב על הכפתור', type:'text', hint:'למשל: לתפריט המלא' },
      { k:'phone', label:'טלפון להזמנות', type:'tel', ltr:true,
        hint:'מופיע מתחת לכפתור. מהטלפון אפשר להתקשר בלחיצה אחת.' }
    ]
  },
  story: {
    title: 'הסיפור שלכם',
    help: 'החלק שגורם לאנשים לבחור בכם ולא במישהו אחר.',
    fields: [
      { k:'title', label:'כותרת החלק', type:'text' },
      { k:'body', label:'הסיפור', type:'textarea', rows:8,
        hint:'מתי התחלתם, מה מיוחד אצלכם, ולאיזה אזור אתם מגיעים. 4–6 משפטים זה מספיק.' }
    ]
  },
  menu: {
    title: 'התפריט',
    help: 'המנות והמחירים שמופיעים באתר.',
    fields: [{ k:'title', label:'כותרת החלק', type:'text' }],
    custom: 'menu'
  },
  gallery: {
    title: 'התמונות',
    help: 'תמונות אמיתיות של האוכל ושל הטראק. שלוש טובות עדיפות על עשר בינוניות.',
    fields: [{ k:'title', label:'כותרת החלק', type:'text' }],
    custom: 'gallery'
  },
  hours: {
    title: 'שעות פתיחה וכתובת',
    help: 'גוגל מציג את השעות האלה ישירות בתוצאות החיפוש.',
    fields: [
      { k:'title', label:'כותרת החלק', type:'text' },
      { k:'address', label:'הכתובת', type:'text', hint:'רחוב, מספר ויישוב — ככה גוגל מזהה אתכם כעסק מקומי.' }
    ],
    custom: 'hours'
  },
  contact: {
    title: 'פרטי הקשר',
    help: 'מופיעים בתחתית כל עמוד באתר.',
    fields: [
      { k:'title', label:'כותרת החלק', type:'text' },
      { k:'phone', label:'טלפון', type:'tel', ltr:true },
      { k:'email', label:'אימייל', type:'email', ltr:true },
      { k:'ig', label:'עמוד האינסטגרם', type:'text', ltr:true, hint:'להעתיק מהדפדפן, בלי https' },
      { k:'fb', label:'עמוד הפייסבוק', type:'text', ltr:true }
    ]
  }
};

/* ══ drawer ══════════════════════════════════════════════════ */

const drawer  = document.getElementById('drawer');
const scrim   = document.getElementById('scrim');
const drBody  = document.getElementById('dr-body');
const drTitle = document.getElementById('dr-title');
const drHelp  = document.getElementById('dr-help');

let openZone = null;
let snapshot = null;
let lastFocus = null;

function markOpenZone(){
  document.querySelectorAll('.zone').forEach(z =>
    z.classList.toggle('editing', z.dataset.zone === openZone));
}

function fieldHTML(zone, f){
  const id = `f-${zone}-${f.k}`;
  const val = model[zone][f.k];
  const dirAttr = f.ltr ? ' dir="ltr" class="ltr"' : '';
  const control = f.type === 'textarea'
    ? `<textarea id="${id}" data-k="${f.k}" rows="${f.rows || 3}"${f.max ? ` maxlength="${f.max}"` : ''}>${esc(val)}</textarea>`
    : `<input id="${id}" type="${f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text'}" data-k="${f.k}" value="${esc(val)}"${f.max ? ` maxlength="${f.max}"` : ''}${dirAttr}>`;

  return `<div class="f">
    <label for="${id}">${esc(f.label)}</label>
    ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
    ${control}
    ${f.max ? `<div class="count" data-count="${f.k}">${String(val).length} מתוך ${f.max} תווים</div>` : ''}
  </div>`;
}

function menuHTML(){
  return `<div id="menu-items">${model.menu.items.map((it, i) => `
    <div class="item" data-idx="${i}">
      <div class="item-head">
        <span class="num">מנה ${i + 1}</span>
        <button type="button" class="btn btn-danger" data-del="${i}">מחיקה</button>
      </div>
      <div class="f">
        <label for="mi-${i}-name">שם המנה</label>
        <input id="mi-${i}-name" type="text" data-idx="${i}" data-part="name" value="${esc(it.name)}">
      </div>
      <div class="f">
        <label for="mi-${i}-desc">תיאור קצר</label>
        <input id="mi-${i}-desc" type="text" data-idx="${i}" data-part="desc" value="${esc(it.desc)}">
      </div>
      <div class="f">
        <label for="mi-${i}-price">מחיר בשקלים</label>
        <input id="mi-${i}-price" type="text" inputmode="numeric" data-idx="${i}" data-part="price" value="${esc(it.price)}" dir="ltr" class="ltr" style="max-width:130px">
      </div>
    </div>`).join('')}</div>
    <button type="button" class="btn add" id="menu-add"><svg aria-hidden="true"><use href="#i-plus"/></svg> הוספת מנה</button>`;
}

function hoursHTML(){
  return `<div class="f"><span class="lbl">השעות שלכם</span>
    <span class="hint">כבו את המתג ליום שאתם סגורים.</span>
    <div id="hours-rows">${model.hours.rows.map((r, i) => `
      <div class="hrow">
        <span class="day">${esc(r.day)}</span>
        <input type="text" data-h="${i}" data-part="open" value="${esc(r.open)}" dir="ltr" aria-label="שעת פתיחה ביום ${esc(r.day)}"${r.on ? '' : ' disabled'}>
        <input type="text" data-h="${i}" data-part="close" value="${esc(r.close)}" dir="ltr" aria-label="שעת סגירה ביום ${esc(r.day)}"${r.on ? '' : ' disabled'}>
        <label class="sw"><input type="checkbox" data-h="${i}" data-part="on"${r.on ? ' checked' : ''} aria-label="פתוח ביום ${esc(r.day)}"><span class="track"></span></label>
      </div>`).join('')}</div></div>`;
}

function galleryHTML(){
  return `<div class="f"><span class="lbl">התמונות באתר</span>
    <div class="upl" id="upl">
      <svg aria-hidden="true"><use href="#i-image"/></svg>
      <div class="t">גררו תמונות לכאן</div>
      <div class="s">או בחרו אותן מהמחשב</div>
      <button type="button" class="btn" id="pick" style="margin-top:12px">בחירת תמונות</button>
      <input type="file" id="file" accept="image/*" multiple class="sr-only" tabindex="-1">
    </div>
    <div class="shots" id="shots"></div>
  </div>`;
}

function renderShots(){
  const box = document.getElementById('shots');
  if(!box) return;
  box.innerHTML = model.gallery.images.map((u, i) => `
    <div class="shot">
      <img src="${esc(u)}" alt="">
      <button type="button" data-shot="${i}" aria-label="הסרת תמונה ${i + 1}"><svg aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('');
}

function buildBody(zone){
  const s = SCHEMA[zone];
  drBody.innerHTML =
    (s.fields || []).map(f => fieldHTML(zone, f)).join('') +
    (s.custom === 'menu' ? menuHTML() : '') +
    (s.custom === 'hours' ? hoursHTML() : '') +
    (s.custom === 'gallery' ? galleryHTML() : '');
  if(s.custom === 'gallery') renderShots();
}

function openDrawer(zone, focusField){
  const s = SCHEMA[zone];
  if(!s) return;

  lastFocus = document.activeElement;
  openZone = zone;
  snapshot = structuredClone(model[zone]);

  drTitle.textContent = s.title;
  drHelp.textContent = s.help;
  buildBody(zone);

  drawer.hidden = false;
  scrim.classList.add('on');
  void drawer.offsetWidth; // flush layout so the slide-in transition has a start value
  drawer.classList.add('on');
  markOpenZone();

  const target = (focusField && drBody.querySelector(`[data-k="${focusField}"]`)) || drBody.querySelector('input,textarea');
  target?.focus();
  if(target?.setSelectionRange && target.type !== 'email') {
    const n = target.value.length;
    try{ target.setSelectionRange(n, n); }catch(e){ /* type doesn't support it */ }
  }
}

function closeDrawer(){
  drawer.classList.remove('on');
  scrim.classList.remove('on');
  openZone = null;
  markOpenZone();
  setTimeout(() => { drawer.hidden = true; }, REDUCE ? 0 : 280);
  lastFocus?.focus();
}

function cancelDrawer(){
  if(openZone && snapshot) model[openZone] = snapshot;
  const z = openZone;
  closeDrawer();
  renderAll();
  if(z) document.querySelector(`.zone-btn[data-open="${z}"]`)?.focus();
}

function saveDrawer(){
  const z = openZone;
  persist();
  markDirty();
  closeDrawer();
  toast('השינויים נשמרו');
  if(z) document.querySelector(`.zone-btn[data-open="${z}"]`)?.focus();
}

/* ══ wiring ══════════════════════════════════════════════════ */

document.addEventListener('click', e => {
  const opener = e.target.closest('[data-open]');
  if(opener){ openDrawer(opener.dataset.open); return; }
});

drBody.addEventListener('input', e => {
  const el = e.target;
  if(!openZone) return;

  if(el.dataset.k){
    model[openZone][el.dataset.k] = el.value;
    const c = drBody.querySelector(`[data-count="${el.dataset.k}"]`);
    if(c){
      const f = SCHEMA[openZone].fields.find(x => x.k === el.dataset.k);
      c.textContent = `${el.value.length} מתוך ${f.max} תווים`;
      c.classList.toggle('over', el.value.length >= f.max);
    }
  } else if(el.dataset.idx !== undefined && el.dataset.part){
    model.menu.items[+el.dataset.idx][el.dataset.part] = el.value;
  } else if(el.dataset.h !== undefined){
    const row = model.hours.rows[+el.dataset.h];
    if(el.dataset.part === 'on'){
      row.on = el.checked;
      const wrap = el.closest('.hrow');
      wrap.querySelectorAll('input[type=text]').forEach(t => { t.disabled = !el.checked; });
      if(el.checked && !row.open){ row.open = '11:00'; row.close = '21:00';
        wrap.querySelector('[data-part=open]').value = row.open;
        wrap.querySelector('[data-part=close]').value = row.close; }
    } else {
      row[el.dataset.part] = el.value;
    }
  }
  renderAll();
});

drBody.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if(del){
    if(del.dataset.armed){
      model.menu.items.splice(+del.dataset.del, 1);
      buildBody('menu');
      renderAll();
      drBody.querySelector('#menu-add')?.focus();
    } else {
      del.dataset.armed = '1';
      del.textContent = 'בטוח? לחצו שוב';
      setTimeout(() => { delete del.dataset.armed; del.textContent = 'מחיקה'; }, 4000);
    }
    return;
  }

  if(e.target.closest('#menu-add')){
    model.menu.items.push({ name: 'מנה חדשה', desc: '', price: '0' });
    buildBody('menu');
    renderAll();
    const last = drBody.querySelectorAll('.item input[data-part=name]');
    last[last.length - 1]?.select();
    return;
  }

  if(e.target.closest('#pick')){ document.getElementById('file').click(); return; }

  const shot = e.target.closest('[data-shot]');
  if(shot){
    const i = +shot.dataset.shot;
    URL.revokeObjectURL(model.gallery.images[i]);
    model.gallery.images.splice(i, 1);
    renderShots();
    renderAll();
  }
});

drBody.addEventListener('change', e => {
  if(e.target.id === 'file'){
    addImages(e.target.files);
    e.target.value = '';
  }
});

function addImages(files){
  Array.from(files).filter(f => f.type.startsWith('image/'))
    .forEach(f => model.gallery.images.push(URL.createObjectURL(f)));
  renderShots();
  renderAll();
}

drBody.addEventListener('dragover', e => {
  const z = e.target.closest('#upl');
  if(!z) return;
  e.preventDefault();
  z.classList.add('over');
});
drBody.addEventListener('dragleave', e => e.target.closest('#upl')?.classList.remove('over'));
drBody.addEventListener('drop', e => {
  const z = e.target.closest('#upl');
  if(!z) return;
  e.preventDefault();
  z.classList.remove('over');
  addImages(e.dataTransfer.files);
});

document.getElementById('dr-save').addEventListener('click', saveDrawer);
document.getElementById('dr-cancel').addEventListener('click', cancelDrawer);
document.getElementById('dr-close').addEventListener('click', cancelDrawer);
scrim.addEventListener('click', cancelDrawer);

drawer.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ e.preventDefault(); cancelDrawer(); return; }
  if(e.key !== 'Tab') return;
  const f = [...drawer.querySelectorAll('button,input,textarea,select')]
    .filter(el => !el.disabled && el.tabIndex !== -1);
  if(!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});

/* ══ state, publish, help ════════════════════════════════════ */

const stateEl = document.getElementById('state');
const toastEl = document.getElementById('toast');
const toastTxt = document.getElementById('toast-txt');
let toastTimer;

function toast(msg){
  toastTxt.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
}

function markDirty(){
  stateEl.className = 'state state-dirty';
  stateEl.innerHTML = '<svg><use href="#i-alert"/></svg> יש שינויים שעוד לא פורסמו';
}
function markClean(){
  stateEl.className = 'state state-clean';
  stateEl.innerHTML = '<svg><use href="#i-check"/></svg> הכול מפורסם';
}

function persist(){
  const { gallery, ...rest } = model;
  localStorage.setItem(KEY, JSON.stringify({ ...rest, gallery: { title: gallery.title, images: [] } }));
}

const publishBtn = document.getElementById('publish');
publishBtn.addEventListener('click', () => {
  publishBtn.disabled = true;
  const crest = document.getElementById('crest');
  crest.classList.add('on');
  setTimeout(() => {
    crest.classList.remove('on');
    publishBtn.disabled = false;
    markClean();
  }, REDUCE ? 700 : 1900);
});

const dTop = document.getElementById('view-desktop');
const dMob = document.getElementById('view-mobile');
function setView(narrow){
  paper.classList.toggle('narrow', narrow);
  dMob.classList.toggle('btn-go', narrow);
  dTop.classList.toggle('btn-go', !narrow);
  dMob.setAttribute('aria-pressed', String(narrow));
  dTop.setAttribute('aria-pressed', String(!narrow));
}
dTop.addEventListener('click', () => setView(false));
dMob.addEventListener('click', () => setView(true));

const hintbar = document.getElementById('hintbar');
if(localStorage.getItem('truck.hint.seen')) hintbar.remove();
document.getElementById('hint-ok')?.addEventListener('click', () => {
  localStorage.setItem('truck.hint.seen', '1');
  hintbar.remove();
});

renderAll();

// Deep link from the home screen: "לתקן עכשיו" lands on the exact field.
const q = new URLSearchParams(location.search);
if(q.get('open')) openDrawer(q.get('open'), q.get('field'));
