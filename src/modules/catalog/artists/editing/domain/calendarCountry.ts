const CALENDAR_COUNTRY_ID = "4108d9b0-a44e-4877-a839-a5541eac852d";
const ALTERNATE_CALENDAR_COUNTRY_ID = "a121dfc4-7ee8-4435-ab26-1db8e4071dde";

export function alternateCalendarCountryId(currentId: string | null | undefined): string {
  return currentId === CALENDAR_COUNTRY_ID ? ALTERNATE_CALENDAR_COUNTRY_ID : CALENDAR_COUNTRY_ID;
}
