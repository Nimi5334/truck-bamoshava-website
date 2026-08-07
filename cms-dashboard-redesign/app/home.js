const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CIRC = 390;
const SCORE = 68;

const ring = document.getElementById('ring');
const scoreEl = document.getElementById('score');

function paint(v){
  ring.style.strokeDashoffset = CIRC - (CIRC * v / 100);
  // Final value first: a throttled tab that never runs the frames below
  // still shows the real score rather than freezing at zero.
  scoreEl.textContent = v;
  if(REDUCE) return;
  const t0 = performance.now();
  requestAnimationFrame(function tick(now){
    const p = Math.min((now - t0) / 950, 1);
    scoreEl.textContent = Math.round(v * (1 - Math.pow(1 - p, 3)));
    if(p < 1) requestAnimationFrame(tick);
  });
}
setTimeout(() => paint(SCORE), REDUCE ? 0 : 260);

/* The search-result card shows the owner the actual line Google prints.
   "After" is not a promise — it's what the recommendations below produce. */
const NOW = {
  title: 'טראק במושבה | פוד־טראק אמיתי',
  desc: 'התחלנו ב־2019 עם טראק אחד וגריל ישן. היום אנחנו הכתובת לאוכל…'
};
const AFTER = {
  title: 'טראק במושבה — פוד טראק בזכרון יעקב',
  desc: 'אוכל רחוב טרי בזכרון יעקב, פתוח ראשון–שישי. בורגרים, טאקו וארוחות לאירועים. <em>מזמינים בטלפון 052-123-4567</em>'
};

const titleEl = document.getElementById('serp-title');
const descEl = document.getElementById('serp-desc');
const nowBtn = document.getElementById('serp-now');
const afterBtn = document.getElementById('serp-after');

// If the owner already edited the site, show their real headline here.
try{
  const saved = JSON.parse(localStorage.getItem('truck.site.v1'));
  if(saved?.hero?.title) NOW.title = 'טראק במושבה | ' + saved.hero.title;
  if(saved?.search?.desc) NOW.desc = saved.search.desc;
}catch(e){ /* nothing saved yet */ }

function show(which){
  const d = which === 'after' ? AFTER : NOW;
  titleEl.textContent = d.title;
  descEl.innerHTML = d.desc;
  nowBtn.setAttribute('aria-pressed', String(which === 'now'));
  afterBtn.setAttribute('aria-pressed', String(which === 'after'));
  nowBtn.classList.toggle('btn-go', which === 'now');
  afterBtn.classList.toggle('btn-go', which === 'after');
}
nowBtn.addEventListener('click', () => show('now'));
afterBtn.addEventListener('click', () => show('after'));
show('now');
