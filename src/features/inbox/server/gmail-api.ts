import type { GmailMessage } from "../lib/gmail-message";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const REQUEST_TIMEOUT_MS = 10_000;

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export class GmailApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`Gmail API ${status}: ${reason}`);
  }

  get isRevoked() {
    return this.reason === "invalid_grant" || this.status === 401;
  }
}

interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GmailTokens {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
}

interface GmailHistoryPage {
  historyId?: string;
  nextPageToken?: string;
  history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[];
}

function parseJson(text: string): Record<string, unknown> {
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function errorReason(error: unknown) {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "status" in error) return String(error.status);
  return "";
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = parseJson(await response.text());
  if (!response.ok) throw new GmailApiError(response.status, errorReason(body.error) || response.statusText);
  return body as T;
}

function form(values: Record<string, string>) {
  return { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values) };
}

const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

export function authorizeUrl(client: OAuthClient, state: string) {
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

export async function exchangeCode(client: OAuthClient, code: string): Promise<GmailTokens> {
  const tokens = await request<{ access_token: string; refresh_token?: string; scope?: string }>(
    TOKEN_URL,
    form({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: client.redirectUri,
      grant_type: "authorization_code",
    }),
  );
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? null, scope: tokens.scope ?? "" };
}

export async function refreshAccessToken(client: Omit<OAuthClient, "redirectUri">, refreshToken: string) {
  const tokens = await request<{ access_token: string }>(
    TOKEN_URL,
    form({ refresh_token: refreshToken, client_id: client.clientId, client_secret: client.clientSecret, grant_type: "refresh_token" }),
  );
  return tokens.access_token;
}

export async function revokeToken(token: string) {
  await request(REVOKE_URL, form({ token }));
}

export function getProfile(accessToken: string) {
  return request<{ emailAddress: string; historyId: string }>(`${GMAIL_URL}/profile`, { headers: bearer(accessToken) });
}

export function watchInbox(accessToken: string, topicName: string) {
  return request<{ historyId: string; expiration: string }>(`${GMAIL_URL}/watch`, {
    method: "POST",
    headers: { ...bearer(accessToken), "content-type": "application/json" },
    body: JSON.stringify({ topicName, labelIds: ["INBOX"], labelFilterBehavior: "include" }),
  });
}

export async function stopWatch(accessToken: string) {
  await request(`${GMAIL_URL}/stop`, { method: "POST", headers: bearer(accessToken) });
}

export function listHistory(accessToken: string, startHistoryId: string, pageToken?: string) {
  const params = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded" });
  if (pageToken) params.set("pageToken", pageToken);
  return request<GmailHistoryPage>(`${GMAIL_URL}/history?${params}`, { headers: bearer(accessToken) });
}

function fetchMessage(accessToken: string, id: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return request<GmailMessage>(`${GMAIL_URL}/messages/${encodeURIComponent(id)}?${query}`, { headers: bearer(accessToken) });
}

export function getMessageSender(accessToken: string, id: string) {
  return fetchMessage(accessToken, id, { format: "metadata", metadataHeaders: "From" });
}

export function getMessage(accessToken: string, id: string) {
  return fetchMessage(accessToken, id, { format: "full" });
}
