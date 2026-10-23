/* Sign in with Google (8.0) — for a self-hosted instance with GOOGLE_CLIENT_ID set.
 *
 * The browser gets an ID token from Google Identity Services (the official "Sign in with Google"
 * button) and posts it here. The token is a JWT signed by Google (RS256); it is checked against
 * Google's published keys, for this instance's client ID, issuer and expiry — with node:crypto
 * only, no extra dependency. A verified token then signs in the profile linked to that Google
 * account (by its stable `sub`), or creates one (INVITE_ONLY still applies), and the usual
 * session cookie is set — from there on it is the same app as with a passkey.
 *
 * Unset GOOGLE_CLIENT_ID → no routes, nothing in /api/config: the app is exactly as before.
 */
import crypto from 'node:crypto';

export const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const SKEW_S = 300;   // clocks drift: accept up to 5 minutes either way

export class GoogleTokenError extends Error {
  constructor(code) { super('google token: ' + code); this.code = code; }
}
const fail = code => { throw new GoogleTokenError(code); };
const b64json = s => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

/** Split a JWT. Throws GoogleTokenError('malformed'). */
export function decodeJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts.some(p => !p)) fail('malformed');
  let header, payload;
  try { header = b64json(parts[0]); payload = b64json(parts[1]); } catch { fail('malformed'); }
  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') fail('malformed');
  return { header, payload, signed: parts[0] + '.' + parts[1], sig: Buffer.from(parts[2], 'base64url') };
}

/** The claims Google documents for ID tokens → { sub, email, name, picture }. */
export function checkClaims(p, { clientId, now = Date.now() } = {}) {
  if (!ISSUERS.has(p.iss)) fail('issuer');
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!clientId || !aud.includes(clientId)) fail('audience');
  const t = Math.floor(now / 1000);
  if (!Number.isFinite(p.exp) || p.exp + SKEW_S < t) fail('expired');
  if (Number.isFinite(p.iat) && p.iat - SKEW_S > t) fail('not yet valid');
  if (!p.sub || typeof p.sub !== 'string') fail('subject');
  // email_verified is a boolean in ID tokens (a string in a few older ones)
  if (p.email && !(p.email_verified === true || p.email_verified === 'true')) fail('email not verified');
  return {
    sub: p.sub,
    email: p.email ? String(p.email).toLowerCase().slice(0, 200) : null,
    name: p.name ? String(p.name).trim().slice(0, 40) : null,
    picture: typeof p.picture === 'string' && /^https:\/\//.test(p.picture) ? p.picture.slice(0, 500) : null,
  };
}

/**
 * verify(idToken) → { sub, email, name, picture }, or throws GoogleTokenError. Google's keys are
 * cached for as long as its Cache-Control says; an unknown key id refetches once (rotation).
 */
export function createGoogleVerifier({ clientId, fetchImpl = globalThis.fetch, now = () => Date.now(), certsUrl = GOOGLE_CERTS } = {}) {
  let cache = { keys: null, exp: 0 };
  async function keys(force) {
    if (!force && cache.keys && cache.exp > now()) return cache.keys;
    let res;
    try { res = await fetchImpl(certsUrl); } catch { fail('certs unreachable'); }
    if (!res || !res.ok) fail('certs unreachable');
    const j = await res.json();
    const cc = (res.headers && typeof res.headers.get === 'function' && res.headers.get('cache-control')) || '';
    const m = /max-age=(\d+)/i.exec(cc);
    cache = { keys: Array.isArray(j && j.keys) ? j.keys : [], exp: now() + (m ? +m[1] * 1000 : 3600000) };
    return cache.keys;
  }
  async function verify(idToken) {
    const { header, payload, signed, sig } = decodeJwt(idToken);
    if (header.alg !== 'RS256') fail('algorithm');
    let jwk = (await keys(false)).find(k => k.kid === header.kid);
    if (!jwk) jwk = (await keys(true)).find(k => k.kid === header.kid);
    if (!jwk) fail('unknown key');
    let key;
    try { key = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' }); } catch { fail('bad key'); }
    if (!crypto.verify('RSA-SHA256', Buffer.from(signed), key, sig)) fail('signature');
    return checkClaims(payload, { clientId, now: now() });
  }
  return { verify };
}

/**
 * The routes, handed the server's helpers (like coach/routes.js) so this module holds no state:
 *   POST /api/google/login   { credential, code? } → { user } + session cookie
 *   POST /api/google/link    { credential }        → links Google to the signed-in profile
 *   POST /api/google/unlink                         → only when a passkey remains to sign in with
 */
export function googleRoutes({ clientId, verifier, json, readBody, readSession, getDb, saveDb, sessionCookie, publicUser, inviteOnly, newId }) {
  if (!clientId) return {};
  const verifyOr401 = async (res, credential) => {
    try { return await verifier.verify(credential); }
    catch (e) { json(res, 401, { error: 'Google sign-in failed (' + ((e && e.code) || 'invalid token') + ')' }); return null; }
  };
  const fresh = (user, g) => { user.google = { ...(user.google || {}), sub: g.sub, email: g.email, picture: g.picture }; };
  return {
    'POST /api/google/login': async (req, res) => {
      const body = await readBody(req);
      const g = await verifyOr401(res, body.credential);
      if (!g) return;
      const db = getDb();
      let user = db.users.find(u => u.google && u.google.sub === g.sub);
      if (user) {
        if (user.disabled) return json(res, 403, { error: 'this account has been disabled' });
        fresh(user, g);
        saveDb();
        return json(res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(user) });
      }
      let invite = null;
      if (inviteOnly) {
        const code = String(body.code || '').trim().toUpperCase();
        invite = db.invites.find(i => i.code === code && !i.usedBy && !i.revoked);
        if (!invite) return json(res, 403, { error: 'a valid invite code is required', invite: true });
      }
      const created = new Date().toISOString();
      user = { id: newId(), name: g.name || (g.email ? g.email.split('@')[0] : 'Google'), created };
      fresh(user, g);
      if (invite) { user.invitedBy = invite.code; invite.usedBy = user.id; invite.usedAt = created; }
      db.users.push(user);
      saveDb();
      json(res, 200, { user: publicUser(user), created: true }, { 'Set-Cookie': sessionCookie(user) });
    },

    'POST /api/google/link': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const body = await readBody(req);
      const g = await verifyOr401(res, body.credential);
      if (!g) return;
      if (getDb().users.some(u => u !== user && u.google && u.google.sub === g.sub))
        return json(res, 409, { error: 'this Google account already belongs to another profile' });
      fresh(user, g);
      saveDb();
      json(res, 200, { user: publicUser(user) });
    },

    'POST /api/google/unlink': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      if (user.google) {
        // without a passkey the profile could never be signed in to again
        if (!getDb().creds.some(c => c.userId === user.id))
          return json(res, 400, { error: 'this profile signs in only with Google — it stays linked', onlyGoogle: true });
        delete user.google;
        saveDb();
      }
      json(res, 200, { user: publicUser(user) });
    },
  };
}
