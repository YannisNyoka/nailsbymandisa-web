// Mirrors api/src/models/services.js's SERVICE_CATEGORIES — kept here too since the admin
// form and the booking wizard's category filter both need the value/label pairing, not
// just the raw enum values.
export const SERVICE_CATEGORIES = [
  { value: 'acrylic_manicure', label: 'Acrylic Manicure' },
  { value: 'gel_manicure', label: 'Gel Manicure' },
  { value: 'combo_services', label: 'Combo Services' },
  { value: 'pedicure', label: 'Pedicure' },
  { value: 'nail_art', label: 'Nail Art' },
  { value: 'add_ons', label: 'Add-ons' },
];

export function categoryLabel(value) {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
