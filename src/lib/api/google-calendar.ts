import type { Category, Recurrence } from "@/lib/db";
import { getToken } from "./google-auth";

export interface CalendarEvent {
  id: string;
  summary?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

const BASE = "https://www.googleapis.com/calendar/v3";

async function authFetch(path: string): Promise<unknown> {
  const token = getToken("calendar");
  if (!token) throw new Error("Calendar not authenticated");

  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
  return response.json();
}

export async function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  const timeMin = encodeURIComponent(new Date().toISOString());
  const data = (await authFetch(
    `/calendars/primary/events?timeMin=${timeMin}&maxResults=30&singleEvents=true&orderBy=startTime`
  )) as { items?: CalendarEvent[] };
  return data.items ?? [];
}

export function calendarEventToTaskData(event: CalendarEvent) {
  const date = event.start.date ?? event.start.dateTime?.slice(0, 10) ?? "";
  const time = event.start.dateTime ? event.start.dateTime.slice(11, 16) : null;

  return {
    title: event.summary ?? "(無題)",
    dueDate: date,
    dueTime: time,
    category: "life" as Category,
    recurrence: "none" as Recurrence,
  };
}
