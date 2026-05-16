// Seed data for the prototype

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const dayOffset = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
};

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const SEED_RESERVATIONS = [
  { id: 'R-2041', name: 'Liga ng Kabataan', purpose: 'Inter-purok basketball league, Game 4', contact: '0917-442-0081', party: 18, date: fmtDate(TODAY), start: 7, end: 9, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: 'Recurring Saturday 7–9am. Members bring own water.' },
  { id: 'R-2042', name: 'Sto. Niño Elementary School', purpose: 'PE class — Grade 6', contact: '0928-117-3340', party: 32, date: fmtDate(TODAY), start: 9, end: 11, status: 'approved', approvedBy: 'Sec. L. Dizon', notes: 'Coordinator: Mrs. Salazar' },
  { id: 'R-2043', name: 'Barangay Fitness Circle', purpose: 'Open Zumba session (community)', contact: '0919-002-7715', party: 24, date: fmtDate(TODAY), start: 17, end: 19, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2044', name: 'Rodriguez Family', purpose: 'Birthday practice — will decorate after', contact: '0917-555-0201', party: 12, date: fmtDate(TODAY), start: 19, end: 21, status: 'pending', approvedBy: null, notes: 'Walk-in requested at 8:10am. Pending Kap. approval.' },
  { id: 'R-2045', name: 'Purok 3 Youth Group', purpose: 'Friendly scrim vs Purok 5', contact: '0906-881-2290', party: 15, date: fmtDate(TODAY), start: 14, end: 16, status: 'missed', approvedBy: 'Sec. L. Dizon', notes: 'Group did not show up. Marked missed at 14:15.' },

  { id: 'R-2046', name: 'Tanods of Barangay', purpose: 'Weekly fitness drill', contact: '0917-113-4401', party: 10, date: fmtDate(dayOffset(1)), start: 6, end: 8, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2047', name: 'Sto. Niño High School', purpose: 'Intramural basketball — finals', contact: '0928-217-7702', party: 40, date: fmtDate(dayOffset(1)), start: 13, end: 17, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: 'Coordinate w/ custodian to unlock storage.' },
  { id: 'R-2048', name: 'Samahan ng Nanay', purpose: 'Mother\u2019s Day practice', contact: '0919-554-9020', party: 22, date: fmtDate(dayOffset(1)), start: 18, end: 20, status: 'pending', approvedBy: null, notes: '' },

  { id: 'R-2049', name: 'Barangay Youth Council', purpose: 'SK general assembly + games', contact: '0917-200-0912', party: 30, date: fmtDate(dayOffset(2)), start: 9, end: 12, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2050', name: 'Church of the Sacred Heart', purpose: 'Youth Sunday activity', contact: '0928-441-8815', party: 28, date: fmtDate(dayOffset(2)), start: 14, end: 17, status: 'approved', approvedBy: 'Sec. L. Dizon', notes: '' },

  { id: 'R-2051', name: 'Purok 2 Sports Club', purpose: 'Practice', contact: '0906-221-4411', party: 14, date: fmtDate(dayOffset(3)), start: 16, end: 18, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2052', name: 'Fabre Family', purpose: 'Reunion basketball game', contact: '0917-901-2200', party: 20, date: fmtDate(dayOffset(3)), start: 18, end: 20, status: 'pending', approvedBy: null, notes: 'Requested same-day as family reunion.' },

  { id: 'R-2053', name: 'Liga ng Kabataan', purpose: 'Inter-purok league, Game 5', contact: '0917-442-0081', party: 18, date: fmtDate(dayOffset(4)), start: 7, end: 9, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2054', name: 'Lonzaga Wedding', purpose: 'Wedding reception setup', contact: '0919-881-4411', party: 80, date: fmtDate(dayOffset(4)), start: 14, end: 22, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: 'Full day reservation. Barangay permit #2026-114.' },

  { id: 'R-2055', name: 'Guo Family', purpose: 'Friendly match', contact: '0928-001-7714', party: 10, date: fmtDate(dayOffset(5)), start: 10, end: 12, status: 'approved', approvedBy: 'Sec. L. Dizon', notes: '' },
  { id: 'R-2056', name: 'Purok 4 Basketball', purpose: 'League Game', contact: '0906-552-1103', party: 16, date: fmtDate(dayOffset(6)), start: 15, end: 17, status: 'approved', approvedBy: 'Kap. R. Mendoza', notes: '' },

  // past week (for reports)
  { id: 'R-2030', name: 'Quizon Family', purpose: 'Birthday practice', contact: '0917-111-2299', party: 14, date: fmtDate(dayOffset(-3)), start: 18, end: 20, status: 'completed', approvedBy: 'Kap. R. Mendoza', notes: '' },
  { id: 'R-2031', name: 'Gabaldon Group', purpose: 'Friendly', contact: '0928-441-0091', party: 12, date: fmtDate(dayOffset(-4)), start: 17, end: 19, status: 'completed', approvedBy: 'Sec. L. Dizon', notes: '' },
  { id: 'R-2032', name: 'Purok 1 Youth', purpose: 'Practice', contact: '0906-119-2243', party: 18, date: fmtDate(dayOffset(-5)), start: 16, end: 18, status: 'missed', approvedBy: 'Sec. L. Dizon', notes: 'No-show reported by custodian.' },
];

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmtHour = (h) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${ampm}`;
};
const fmtHourCompact = (h) => {
  const ampm = h >= 12 ? 'p' : 'a';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${ampm}`;
};
const fmtLongDate = (d) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${DAYS_OF_WEEK[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

Object.assign(window, {
  SEED_RESERVATIONS, HOURS, DAYS_OF_WEEK, MONTH_NAMES,
  TODAY, dayOffset, fmtDate, fmtHour, fmtHourCompact, fmtLongDate,
});
