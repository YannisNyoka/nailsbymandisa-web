// "09:00" -> "9:00 am" — settings.hours stores 24h HH:MM (same convention as
// employees.workingHours). Shared by ContactPage.jsx's full weekly table and
// HomePage.jsx's condensed "Get in touch" card.
export function formatHour(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
