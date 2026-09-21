// Shared by WhatsAppButton.jsx and HomePage.jsx's "Get in touch" card — a wa.me deep
// link needs the number stripped to digits only (no +, spaces, or dashes).
export function buildWhatsAppLink(number, message) {
  const digits = number.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
