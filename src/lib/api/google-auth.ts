/**
 * Google Identity Services (GIS) — browser-only OAuth 2.0 token flow.
 * No backend required. Tokens are kept in memory (lost on page reload).
 * This intentionally avoids Web Storage persistence for read-only API tokens.
 */

export type GoogleScope = "gmail" | "calendar";

const SCOPES: Record<GoogleScope, string> = {
  gmail: "https://www.googleapis.com/auth/gmail.readonly",
  calendar: "https://www.googleapis.com/auth/calendar.readonly",
};

const tokenMap: Partial<Record<GoogleScope, string>> = {};

interface GoogleWindow {
  google?: GoogleIdentityServices;
}

type GoogleOAuth2 = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (resp: { error?: string; access_token?: string }) => void;
  }) => { requestAccessToken: (opts: { prompt: string }) => void };
  revoke?: (token: string, callback?: () => void) => void;
};

type GoogleIdentityServices = {
  accounts?: {
    oauth2?: GoogleOAuth2;
  };
};

export function getToken(scope: GoogleScope): string | null {
  return tokenMap[scope] ?? null;
}

export function hasToken(scope: GoogleScope): boolean {
  return !!tokenMap[scope];
}

function getOAuth2(): GoogleOAuth2 | undefined {
  return (window as unknown as GoogleWindow).google?.accounts?.oauth2;
}

export async function requestGoogleToken(
  scope: GoogleScope
): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const oauth2 = getOAuth2();
  if (!oauth2) {
    return Promise.reject(
      new Error("Google Identity Services OAuth2 API is not loaded")
    );
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES[scope],
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        tokenMap[scope] = resp.access_token!;
        resolve(resp.access_token!);
      },
    });
    client.requestAccessToken({ prompt: tokenMap[scope] ? "" : "consent" });
  });
}

export function revokeToken(scope: GoogleScope): void {
  const token = tokenMap[scope];
  if (!token) return;
  getOAuth2()?.revoke?.(token);
  // Revoke is best-effort in GIS; clear local memory even if the remote call is unavailable.
  delete tokenMap[scope];
}
