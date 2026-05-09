import { getToken } from "./google-auth";

export interface GmailMessage {
  id: string;
  subject: string;
  snippet: string;
  date: string;
  from: string;
}

const BASE = "https://gmail.googleapis.com/gmail/v1";

async function authFetch(path: string): Promise<unknown> {
  const token = getToken("gmail");
  if (!token) throw new Error("Gmail not authenticated");

  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Gmail API error: ${response.status}`);
  return response.json();
}

export async function fetchRecentMessages(): Promise<GmailMessage[]> {
  const query = encodeURIComponent("newer_than:7d");
  const list = (await authFetch(`/users/me/messages?q=${query}&maxResults=20`)) as {
    messages?: { id: string }[];
  };
  if (!list.messages?.length) return [];

  return Promise.all(
    list.messages.map(async (message) => {
      const data = (await authFetch(
        `/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`
      )) as {
        payload?: { headers?: { name: string; value: string }[] };
        snippet?: string;
      };
      const headers = data.payload?.headers ?? [];
      const getHeader = (name: string) => headers.find((header) => header.name === name)?.value ?? "";

      return {
        id: message.id,
        subject: getHeader("Subject"),
        snippet: data.snippet ?? "",
        date: getHeader("Date"),
        from: getHeader("From"),
      };
    })
  );
}
