export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Devuelve los años disponibles desde 2025 hasta el año actual
 * (o el siguiente si estamos en diciembre).
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const years: number[] = [];
  for (let y = 2025; y <= endYear; y++) years.push(y);
  return years;
}

/**
 * Igual que getAvailableYears pero con formato { value, label }
 * para usarse en componentes SimpleSelect.
 */
export function getYearOptions(): { value: number; label: string }[] {
  return getAvailableYears().map(y => ({ value: y, label: String(y) }));
}
