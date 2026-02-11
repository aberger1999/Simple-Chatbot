// Compute the Nth weekday of a given month/year
// weekday: 0=Sun, 1=Mon, ... 6=Sat
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  let day = 1 + ((weekday - first.getDay() + 7) % 7);
  day += (n - 1) * 7;
  return new Date(year, month, day);
}

// Last weekday of a given month
function lastWeekday(year, month, weekday) {
  const last = new Date(year, month + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - diff);
}

// If a fixed holiday falls on Saturday, observed Friday; Sunday, observed Monday
function observed(date) {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

// Anonymous Gregorian Easter (Meeus algorithm)
function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// First Tuesday after the first Monday in November
function electionDay(year) {
  const firstMonday = nthWeekday(year, 10, 1, 1);
  return new Date(year, 10, firstMonday.getDate() + 1);
}

function makeHoliday(name, date, type) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return {
    id: `holiday-${name}-${start.getFullYear()}`,
    title: name,
    start,
    end,
    allDay: true,
    color: type === 'federal' ? '#dc2626' : '#f59e0b',
    isHoliday: true,
    holidayType: type,
  };
}

export function getHolidaysForYear(year) {
  const easterDate = easter(year);

  // Federal holidays (red)
  const federal = [
    { name: "New Year's Day", date: observed(new Date(year, 0, 1)) },
    { name: 'MLK Jr. Day', date: nthWeekday(year, 0, 1, 3) },
    { name: "Presidents' Day", date: nthWeekday(year, 1, 1, 3) },
    { name: 'Memorial Day', date: lastWeekday(year, 4, 1) },
    { name: 'Juneteenth', date: observed(new Date(year, 5, 19)) },
    { name: 'Independence Day', date: observed(new Date(year, 6, 4)) },
    { name: 'Labor Day', date: nthWeekday(year, 8, 1, 1) },
    { name: 'Columbus Day', date: nthWeekday(year, 9, 1, 2) },
    { name: 'Veterans Day', date: observed(new Date(year, 10, 11)) },
    { name: 'Thanksgiving', date: nthWeekday(year, 10, 4, 4) },
    { name: 'Christmas Day', date: observed(new Date(year, 11, 25)) },
  ].map((h) => makeHoliday(h.name, h.date, 'federal'));

  // Observance / cultural holidays (amber)
  const observances = [
    { name: "Valentine's Day", date: new Date(year, 1, 14) },
    { name: "St. Patrick's Day", date: new Date(year, 2, 17) },
    { name: 'Good Friday', date: new Date(easterDate.getFullYear(), easterDate.getMonth(), easterDate.getDate() - 2) },
    { name: 'Easter Sunday', date: easterDate },
    { name: "Mother's Day", date: nthWeekday(year, 4, 0, 2) },
    { name: "Father's Day", date: nthWeekday(year, 5, 0, 3) },
    { name: 'Halloween', date: new Date(year, 9, 31) },
    { name: 'Election Day', date: electionDay(year) },
    { name: "New Year's Eve", date: new Date(year, 11, 31) },
  ].map((h) => makeHoliday(h.name, h.date, 'observance'));

  return [...federal, ...observances];
}

export function getHolidaysForRange(startDate, endDate) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const holidays = [];
  for (let y = startYear; y <= endYear; y++) {
    holidays.push(...getHolidaysForYear(y));
  }
  return holidays.filter((h) => h.start >= startDate && h.start <= endDate);
}
