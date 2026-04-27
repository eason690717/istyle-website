// Google OAuth：handle authorization code flow → 拿 ID token → verify → 回 email
import { OAuth2Client } from "google-auth-library";

const env = (k: string) => (process.env[k] || "").trim();

const CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID");
const CLIENT_SECRET = env("GOOGLE_OAUTH_CLIENT_SECRET");

export function getOAuthClient(redirectUri: string): OAuth2Client {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const client = getOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
}

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function exchangeCodeForProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleProfile | null> {
  try {
    const client = getOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return null;
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return null;
    return {
      email: payload.email.toLowerCase(),
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (e) {
    console.error("[google-auth] exchange failed", e);
    return null;
  }
}

// 允許登入後台的 email 白名單（CSV，不分大小寫）
// env: ADMIN_ALLOWED_EMAILS="admin@i-style.store,boss@i-style.store"
export function isEmailAllowed(email: string): boolean {
  const list = env("ADMIN_ALLOWED_EMAILS") || "admin@i-style.store";
  const allowed = list.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
