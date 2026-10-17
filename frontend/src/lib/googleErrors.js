// 4.1 — Google's answers, explained. When Google Drive doesn't work, Google says why with a code
// (from Google Play services' GoogleAuthUtil, or an HTTP status from the Drive API). This turns
// that into what it means and what to do about it — shown on Settings → Backups → Google check
// and in the toast after "Use Google Drive" / "Test Google Drive".
//
// Pure: no store. Titles and fixes are English t() keys.

/** { title, fix, kind } for a Drive failure (code, reason, raw message), or null when there's none. */
export function explainDrive({ code = '', reason = '', msg = '' } = {}) {
  const c = String(code || ''), m = String(msg || '')
  if (!c && !reason) return null
  if (c === 'API_DISABLED') return {
    kind: 'setup', title: 'The Google Drive API is switched off in the Cloud project',
    fix: 'In Google Cloud: APIs & Services → Library → Google Drive API → Enable. Then test again in a few minutes.',
  }
  if (c === '10' || c === '12500' || /UNREGISTERED|API_CONSOLE|INVALID_AUDIENCE|DEVELOPER/i.test(m) || (reason === 'setup' && !c)) return {
    kind: 'setup', title: 'Google doesn’t know this app yet',
    fix: 'Create an Android OAuth client in Google Cloud with exactly the package name and SHA-1 shown here. Wait about 5 minutes, then test again.',
  }
  if (c === 'CONSENT' || reason === 'consent') return {
    kind: 'consent', title: 'Access to Google Drive wasn’t allowed',
    fix: 'Tap Test Google Drive and choose Allow. While the app is in testing, your account must be listed as a test user on the OAuth consent screen.',
  }
  if (c === 'HTTP_403' || c === '16' || c === 'AUTH') return {
    kind: 'refused', title: 'Google refused access for this account',
    fix: 'On the OAuth consent screen: user type External, your account added as a test user, and the scope …/auth/drive.appdata added. Then test again.',
  }
  if (c === '7' || c === '8' || reason === 'network') return {
    kind: 'network', title: 'No connection to Google',
    fix: 'Check the internet connection and try again.',
  }
  if (c === 'SIGNED_OUT' || reason === 'signedout') return {
    kind: 'signedout', title: 'Not signed in',
    fix: 'Sign in with your Google account in Settings.',
  }
  if (c === 'UNAVAILABLE' || reason === 'unavailable') return {
    kind: 'unavailable', title: 'Google Play services aren’t available on this phone.',
    fix: 'Update Google Play services from the Play Store, then try again.',
  }
  return {
    kind: 'other', title: 'Google Drive answered with an error',
    fix: 'Try again later. If it keeps happening, the code below tells what Google said.',
  }
}

/** Is `sha1` the same certificate fingerprint as `ref` (any case, with or without colons)? */
export const sameSha1 = (sha1, ref) => {
  const n = x => String(x || '').replace(/[^0-9a-f]/gi, '').toUpperCase()
  return !!n(sha1) && n(sha1) === n(ref)
}
