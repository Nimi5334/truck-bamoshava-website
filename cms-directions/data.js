/* Shared, FIXED dataset. Identical across all 10 directions.
   Tenant: Bright Smile Dental. Today = 2026-07-30. */

const TODAY = '2026-07-30';
const SITE = 'Bright Smile Dental';

const ITEMS = [
  { id: 1,  title: 'Home',                    status: 'published', edited: '2026-07-28', days: 2,
    cadence: 90,  reason: null, unpublished: false, sessions: 5,
    pieces: { headline: true,  body: true,  image: true,  contact: true  } },

  { id: 2,  title: 'Opening Hours',           status: 'review',    edited: '2026-06-14', days: 46,
    cadence: 30,  reason: 'Summer hours were never updated', unpublished: false, sessions: 3,
    pieces: { headline: true,  body: true,  image: false, contact: true  } },

  { id: 3,  title: 'Our Services',            status: 'published', edited: '2026-07-11', days: 19,
    cadence: 180, reason: null, unpublished: true,  sessions: 6,
    pieces: { headline: true,  body: true,  image: true,  contact: true  } },

  { id: 4,  title: 'Meet the Team',           status: 'draft',     edited: '2026-07-02', days: 28,
    cadence: 180, reason: null, unpublished: true,  sessions: 2,
    pieces: { headline: true,  body: true,  image: false, contact: false } },

  { id: 5,  title: 'Teeth Whitening',         status: 'published', edited: '2026-05-30', days: 61,
    cadence: 180, reason: null, unpublished: true,  sessions: 4,
    pieces: { headline: true,  body: true,  image: true,  contact: true  } },

  { id: 6,  title: 'Emergency Appointments',  status: 'review',    edited: '2026-04-19', days: 102,
    cadence: 90,  reason: 'Phone number changed', unpublished: false, sessions: 2,
    pieces: { headline: true,  body: true,  image: false, contact: true  } },

  { id: 7,  title: 'Contact & Directions',    status: 'published', edited: '2026-07-25', days: 5,
    cadence: 180, reason: null, unpublished: false, sessions: 4,
    pieces: { headline: true,  body: true,  image: true,  contact: true  } },

  { id: 8,  title: 'Patient Reviews',         status: 'draft',     edited: '2026-07-19', days: 11,
    cadence: 60,  reason: null, unpublished: true,  sessions: 1,
    pieces: { headline: true,  body: false, image: true,  contact: false } },

  { id: 9,  title: 'New Patient Offer',       status: 'review',    edited: '2026-03-08', days: 144,
    cadence: 60,  reason: 'This offer expired in May', unpublished: false, sessions: 3,
    pieces: { headline: true,  body: true,  image: true,  contact: false } },

  { id: 10, title: 'Insurance & Payment',     status: 'published', edited: '2026-06-02', days: 58,
    cadence: 180, reason: null, unpublished: false, sessions: 2,
    pieces: { headline: true,  body: true,  image: true,  contact: true  } },

  { id: 11, title: 'Blog: 5 Flossing Myths',  status: 'draft',     edited: '2026-01-22', days: 189,
    cadence: 365, reason: null, unpublished: true,  sessions: 1,
    pieces: { headline: true,  body: true,  image: false, contact: false } },

  { id: 12, title: 'Privacy Policy',          status: 'published', edited: '2025-11-14', days: 258,
    cadence: 365, reason: null, unpublished: false, sessions: 1,
    pieces: { headline: true,  body: true,  image: false, contact: false } }
];

/* ---- helpers shared by every direction ---- */

const STATUS_WORD = { published: 'Live', draft: 'Draft', review: 'Needs review' };

function niceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

function agoWords(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `over a year ago`;
}

function isOverdue(it) { return it.days > it.cadence; }

function needsAttention(it) { return it.status === 'review' || isOverdue(it); }

function piecesDone(it) { return Object.values(it.pieces).filter(Boolean).length; }

const PIECE_LABELS = { headline: 'Page title', body: 'Written text', image: 'A photo', contact: 'Phone & address' };

function missingPieces(it) {
  return Object.keys(it.pieces).filter(k => !it.pieces[k]).map(k => PIECE_LABELS[k]);
}

/* Attention first, then most-neglected first. Used by every direction so the
   functional hierarchy is identical and only the visual language differs. */
function sorted() {
  return [...ITEMS].sort((a, b) => {
    const an = needsAttention(a) ? 0 : 1, bn = needsAttention(b) ? 0 : 1;
    if (an !== bn) return an - bn;
    return b.days - a.days;
  });
}

function counts() {
  return {
    live: ITEMS.filter(i => i.status === 'published').length,
    draft: ITEMS.filter(i => i.status === 'draft').length,
    review: ITEMS.filter(i => i.status === 'review').length,
    attention: ITEMS.filter(needsAttention).length
  };
}
