import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { decodeJwt, checkClaims, createGoogleVerifier, googleRoutes, GoogleTokenError } from '../google.js';

// A stand-in for Google: our own RSA key, published as a JWKS, signing ID tokens.
const CLIENT = '1234-abc.apps.googleusercontent.com';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const NOW = Date.UTC(2026, 9, 23, 12, 0, 0);
const claims = (over = {}) => ({
  iss: 'https://accounts.google.com', aud: CLIENT, sub: '1099', email: 'Mahdi@Gmail.com', email_verified: true,
  name: 'Mahdi', picture: 'https://lh3.googleusercontent.com/a/p', iat: NOW / 1000 - 10, exp: NOW / 1000 + 3600, ...over,
});
function token(payload = claims(), { kid = 'k1', alg = 'RS256', key = privateKey } = {}) {
  const head = b64({ alg, kid, typ: 'JWT' }) + '.' + b64(payload);
  const sig = alg === 'none' ? '' : crypto.sign('RSA-SHA256', Buffer.from(head), key).toString('base64url');
  return head + '.' + (sig || 'x');
}
function fakeFetch(keys = [jwk]) {
  const f = async () => { f.calls++; return { ok: true, headers: { get: () => 'public, max-age=600' }, json: async () => ({ keys: f.keys }) }; };
  f.calls = 0; f.keys = keys;
  return f;
}
const rejects = async (p, code) => {
  await assert.rejects(p, e => e instanceof GoogleTokenError && e.code === code, 'expected ' + code);
};

/* ---------------- the token ---------------- */

test('a JWT that is not three parts of JSON is malformed', () => {
  for (const t of ['', 'a.b', 'a.b.c.d', 'x.y.z', null]) assert.throws(() => decodeJwt(t), e => e.code === 'malformed');
  const d = decodeJwt(token());
  assert.equal(d.header.kid, 'k1');
  assert.equal(d.payload.sub, '1099');
});

test('claims: issuer, audience, expiry and a verified email are all required', () => {
  const ok = checkClaims(claims(), { clientId: CLIENT, now: NOW });
  assert.deepEqual(ok, { sub: '1099', email: 'mahdi@gmail.com', name: 'Mahdi', picture: 'https://lh3.googleusercontent.com/a/p' });
  assert.equal(checkClaims(claims({ iss: 'accounts.google.com' }), { clientId: CLIENT, now: NOW }).sub, '1099');
  assert.equal(checkClaims(claims({ aud: ['other', CLIENT] }), { clientId: CLIENT, now: NOW }).sub, '1099');
  assert.throws(() => checkClaims(claims({ iss: 'https://evil.example' }), { clientId: CLIENT, now: NOW }), e => e.code === 'issuer');
  assert.throws(() => checkClaims(claims({ aud: 'someone-else' }), { clientId: CLIENT, now: NOW }), e => e.code === 'audience');
  assert.throws(() => checkClaims(claims(), { clientId: '', now: NOW }), e => e.code === 'audience');
  assert.throws(() => checkClaims(claims({ exp: NOW / 1000 - 3600 }), { clientId: CLIENT, now: NOW }), e => e.code === 'expired');
  assert.throws(() => checkClaims(claims({ iat: NOW / 1000 + 3600 }), { clientId: CLIENT, now: NOW }), e => e.code === 'not yet valid');
  assert.throws(() => checkClaims(claims({ email_verified: false }), { clientId: CLIENT, now: NOW }), e => e.code === 'email not verified');
  assert.throws(() => checkClaims(claims({ sub: '' }), { clientId: CLIENT, now: NOW }), e => e.code === 'subject');
  // a little clock drift is fine; a picture that isn't https is dropped
  assert.equal(checkClaims(claims({ exp: NOW / 1000 - 60, picture: 'http://x/p' }), { clientId: CLIENT, now: NOW }).picture, null);
});

test('the signature is checked against Google’s published keys', async () => {
  const f = fakeFetch();
  const v = createGoogleVerifier({ clientId: CLIENT, fetchImpl: f, now: () => NOW });
  assert.equal((await v.verify(token())).email, 'mahdi@gmail.com');
  await rejects(v.verify(token(claims(), { key: other.privateKey })), 'signature');
  // a payload swapped under a valid signature
  const [h, , s] = token().split('.');
  await rejects(v.verify(h + '.' + b64(claims({ sub: 'attacker' })) + '.' + s), 'signature');
  await rejects(v.verify(token(claims(), { alg: 'none' })), 'algorithm');
  await rejects(v.verify(token(claims(), { alg: 'HS256' })), 'algorithm');
  await rejects(v.verify(token(claims({ aud: 'nope' }))), 'audience');
  assert.equal(f.calls, 1, 'keys are cached');
});

test('Google rotated its keys: an unknown key id fetches them once more', async () => {
  const f = fakeFetch([]);
  const v = createGoogleVerifier({ clientId: CLIENT, fetchImpl: f, now: () => NOW });
  await rejects(v.verify(token()), 'unknown key');
  f.keys = [jwk];
  assert.equal((await v.verify(token())).sub, '1099');
  const down = createGoogleVerifier({ clientId: CLIENT, fetchImpl: async () => { throw new Error('offline'); }, now: () => NOW });
  await rejects(down.verify(token()), 'certs unreachable');
});

/* ---------------- the routes ---------------- */

function harness({ inviteOnly = false } = {}) {
  const db = { users: [], creds: [], invites: [{ code: 'WELCOME', usedBy: null }] };
  let saved = 0, n = 0, session = null;
  const out = {};
  const routes = googleRoutes({
    clientId: CLIENT,
    verifier: createGoogleVerifier({ clientId: CLIENT, fetchImpl: fakeFetch(), now: () => NOW }),
    json: (res, code, body, headers) => { Object.assign(res, { code, body, headers: headers || {} }); },
    readBody: async req => req.body,
    readSession: () => session,
    getDb: () => db, saveDb: () => { saved++; },
    sessionCookie: u => 'gymsid=' + u.id,
    publicUser: u => ({ id: u.id, name: u.name, ...(u.google ? { google: { email: u.google.email } } : {}) }),
    inviteOnly, newId: () => 'u' + (++n),
  });
  const call = async (route, body) => { const res = {}; await routes[route]({ body }, res); return res; };
  return { db, routes, call, out, signIn: u => { session = u; }, saved: () => saved };
}

test('no client ID → no routes at all', () => {
  assert.deepEqual(googleRoutes({ clientId: '' }), {});
});

test('the first Google sign-in creates a profile; the next one signs into it', async () => {
  const h = harness();
  const a = await h.call('POST /api/google/login', { credential: token() });
  assert.equal(a.code, 200);
  assert.equal(a.body.created, true);
  assert.equal(a.body.user.name, 'Mahdi');
  assert.equal(a.headers['Set-Cookie'], 'gymsid=u1');
  assert.equal(h.db.users.length, 1);
  assert.deepEqual(h.db.users[0].google, { sub: '1099', email: 'mahdi@gmail.com', picture: 'https://lh3.googleusercontent.com/a/p' });
  const b = await h.call('POST /api/google/login', { credential: token(claims({ name: 'Renamed' })) });
  assert.equal(b.code, 200);
  assert.equal(b.body.created, undefined);
  assert.equal(b.body.user.id, 'u1', 'matched by the Google account id, not by name');
  assert.equal(h.db.users.length, 1);
  const bad = await h.call('POST /api/google/login', { credential: token(claims(), { key: other.privateKey }) });
  assert.equal(bad.code, 401);
});

test('invite-only instances still need a code for a new profile — and burn it', async () => {
  const h = harness({ inviteOnly: true });
  const a = await h.call('POST /api/google/login', { credential: token() });
  assert.equal(a.code, 403);
  assert.equal(a.body.invite, true);
  assert.equal(h.db.users.length, 0);
  const b = await h.call('POST /api/google/login', { credential: token(), code: 'welcome' });
  assert.equal(b.code, 200);
  assert.equal(h.db.invites[0].usedBy, 'u1');
  const c = await h.call('POST /api/google/login', { credential: token(claims({ sub: '2000' })), code: 'WELCOME' });
  assert.equal(c.code, 403, 'a used code does not work twice');
  // an existing profile never needs a code
  assert.equal((await h.call('POST /api/google/login', { credential: token() })).code, 200);
});

test('a disabled profile cannot sign in with Google either', async () => {
  const h = harness();
  await h.call('POST /api/google/login', { credential: token() });
  h.db.users[0].disabled = true;
  assert.equal((await h.call('POST /api/google/login', { credential: token() })).code, 403);
});

test('linking: one Google account per profile; unlinking keeps a way to sign in', async () => {
  const h = harness();
  const me = { id: 'p1', name: 'Passkey user' };
  h.db.users.push(me);
  assert.equal((await h.call('POST /api/google/link', { credential: token() })).code, 401, 'signed out');
  h.signIn(me);
  const a = await h.call('POST /api/google/link', { credential: token() });
  assert.equal(a.code, 200);
  assert.equal(me.google.sub, '1099');
  // the same Google account can't be linked to a second profile
  const other = { id: 'p2', name: 'Other' };
  h.db.users.push(other);
  h.signIn(other);
  assert.equal((await h.call('POST /api/google/link', { credential: token() })).code, 409);
  // unlinking needs a passkey left over
  h.signIn(me);
  const u1 = await h.call('POST /api/google/unlink', {});
  assert.equal(u1.code, 400);
  assert.equal(u1.body.onlyGoogle, true);
  h.db.creds.push({ id: 'c1', userId: 'p1' });
  const u2 = await h.call('POST /api/google/unlink', {});
  assert.equal(u2.code, 200);
  assert.equal(me.google, undefined);
  // and Google sign-in now creates a separate profile instead of finding this one
  const again = await h.call('POST /api/google/login', { credential: token() });
  assert.equal(again.body.created, true);
});
