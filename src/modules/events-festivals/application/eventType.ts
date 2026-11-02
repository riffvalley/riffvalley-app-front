export const eventTypes = [
  { value: "concert", label: "Concierto" },
  { value: "festival", label: "Festival" },
] as const;

export type EventType = (typeof eventTypes)[number]["value"];

export function parseEventType(value: string): EventType | null {
  switch (value.trim().toLocaleLowerCase("es")) {
    case "concert":
    case "concierto":
      return "concert";
    case "festival":
      return "festival";
    default:
      return null;
  }
}
