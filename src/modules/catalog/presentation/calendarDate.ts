export function formatCalendarDate(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${date.toLocaleDateString("es-ES", { weekday: "long" })}`;
}
