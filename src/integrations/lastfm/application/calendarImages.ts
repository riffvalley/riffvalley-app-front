export interface CalendarImagesPort { fillImages(month: number, year: number, week: number): Promise<void> }
export function fillCalendarImages(port: CalendarImagesPort, releaseDate: string) {
  const date = new Date(releaseDate);
  return port.fillImages(date.getMonth() + 1, date.getFullYear(), Math.ceil(date.getDate() / 7));
}
