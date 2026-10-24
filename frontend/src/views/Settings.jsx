import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO, localTZ, DAYN, weekOrder } from '../lib/format.js'
import { resolveTheme } from '../lib/themes.js'
import { ThemeMock, themeName } from './Themes.jsx'
import { effortOf } from '../lib/history.js'
import { webauthnOK, passkeyLogin, passkeyRegister, IS_ANDROID } from '../lib/api.js'
import { pushSupported, enablePush, disablePush, sendTestPush } from '../lib/push.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, U, LANGS, dateLocale, deviceLang } from '../lib/i18n.js'
import { DEMO, WEBAPP, NO_SERVER, REPO } from '../lib/demo.js'
import { openLink, WEB_APP, apkUrl, APK_ONLINE } from '../lib/updates.js'
import { MOBILE, shareExport, syncReminder } from '../lib/mobile.js'
import { loadStarterPlan, confirmSheet, importFromApp } from '../sheets.jsx'
import { suggestedReminderTime, reminderPrefs, timeFor, routineSummary } from '../lib/dailyReminder.js'
import { routineLabel, routineColor, colorVar } from '../lib/routines.js'
import { coachAvailable, hasConsent } from '../lib/coach.js'
import { forgetCoach } from '../lib/coach-api.js'
import Icon from '../components/Icon.jsx'
import OfflineSection from '../components/OfflineSection.jsx'
import AppUpdates from '../components/AppUpdates.jsx'
import AccountSection from '../components/AccountSection.jsx'
import SecuritySection from '../components/SecuritySection.jsx'
import { linkGoogleSheet, GoogleWebButton, signInWithGoogleToken } from '../components/GoogleWebButton.jsx'
import { GoogleG } from '../components/AccountGate.jsx'
import { googleUnlink } from '../lib/googleWeb.js'
import { profileSheet, profileOf, ProfileAvatar } from '../components/ProfileSheet.jsx'
import { whatsNewSheet } from '../components/WhatsNew.jsx'
import { TEXT_SIZES, textScaleOf } from '../lib/a11y.js'
import { soundPacksSheet, packName } from '../components/SoundPacks.jsx'
import { batteryInfo } from '../lib/battery.js'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField, BackButton } from '../components/ui.jsx'

export default function Settings() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const { update, replaceState, setUser, pullState, pushState, signOut, signOutAll, resetDemo } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'mahdi-jym-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }
  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not a MAHDI-JYM backup')
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true); toast(t('Backup imported')) } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  const signInHere = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Sign-in failed')) }
  }
  const registerHere = () => useUI.getState().openSheet(close => <RegisterInline close={close} setUser={setUser} pushState={pushState} pullState={pullState} toast={toast} />)
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: t('Signs this profile out on every device, including this one. Your passkeys keep working — sign in with them again anytime.'),
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { await signOutAll(); nav('/home'); toast(t('Signed out on all devices')) }
      catch { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow">
    <div className="hdr">
      <BackButton fallback="/home" />
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* ---------- account (demo and mobile builds have nothing to sign in to) ---------- */}
    {MOBILE && <AccountSection />}
    {!MOBILE && <Section title={DEMO ? t('Demo') : WEBAPP ? t('Web app') : t('Account')}>
      {MOBILE ? null : WEBAPP ? <>
        {/* 12.0: the web app on GitHub Pages — no server, your data in this browser */}
        <Row icon="globe" iconTint="var(--acc)" title={t('You’re using the web app')} subtitle={t('Your data stays in this browser on this device — save a backup file now and then (Data → Export).')} />
        <Row icon="download" iconTint="var(--green)" title={t('Get the Android app')} subtitle={t('Online (light) or offline (everything inside) — Settings → App & updates')} accessory="chevron" onClick={() => openLink(apkUrl(APK_ONLINE))} />
      </> : DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
        <Row icon="globe" iconTint="var(--green)" title={t('Use the real web app')} subtitle={t('The same app with your own data, in this browser.')} accessory="chevron" onClick={() => openLink(WEB_APP)} />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host MAHDI-JYM')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : user ? <>
        <Row icon="personCircle" iconTint="var(--grey)" title={user.name} subtitle={user.google && !user.passkeys ? t('Signed in with Google — data syncs to this profile.') : t('Signed in with passkey — data syncs to this profile.')} />
        {/* 8.0: Sign in with Google (instance with GOOGLE_CLIENT_ID) */}
        {config && config.google_client_id && (user.google
          ? <div className="lrow gw-linked">
            {user.google.picture ? <img className="acc-avatar" src={user.google.picture} alt="" referrerPolicy="no-referrer" /> : <span className="acc-g"><GoogleG /></span>}
            <div className="lrow-t grow"><div>{t('Google account')}</div><div className="small muted" dir="ltr">{user.google.email}</div></div>
            {user.passkeys > 0 && <Button size="sm" variant="tinted" onClick={() => confirmSheet({
              title: t('Unlink Google?'), message: t('You then sign in to this profile with your passkey only.'), confirmText: t('Unlink'), danger: true,
              onConfirm: () => googleUnlink().then(r => { setUser(r.user); toast(t('Google account unlinked')) }).catch(e => toast(e.message)),
            })}>{t('Unlink')}</Button>}
          </div>
          : <Row icon="link" iconTint="var(--blue)" title={t('Link your Google account')} subtitle={t('Sign in to this profile with Google on any device')} accessory="chevron" onClick={() => linkGoogleSheet(config.google_client_id)} />)}
        {user.admin && <Row icon="wrench" iconTint="var(--indigo)" title={t('Admin dashboard')} accessory="chevron" onClick={() => nav('/admin')} />}
        <Row icon="signOut" iconTint="var(--red)" title={t('Sign out')} danger onClick={() => confirmSheet({ title: t('Sign out?'), message: t('Your data is synced to your profile first, then cleared from this device.'), confirmText: t('Sign out'), danger: true, onConfirm: () => { signOut(); nav('/home') } })} />
        <Row icon="shield" iconTint="var(--red)" title={t('Sign out everywhere')} subtitle={t('Ends this profile’s sessions on all your devices.')} danger onClick={signOutEverywhere} />
      </> : webauthnOK() || (config && config.google_client_id) ? <>
        {config && config.google_client_id && <Row icon="personCircle" iconTint="var(--blue)" title={t('Sign in with Google')} subtitle={t('Your profile and its data on every device')} accessory="chevron"
          onClick={() => useUI.getState().openSheet(close => <div className="gw-sheet">
            <div className="gw-sheet-ic"><GoogleG size={30} /></div>
            <h3>{t('Sign in with Google')}</h3>
            <p className="muted small">{t('A new profile is created the first time; data from this browser moves into it.')}</p>
            <GoogleWebButton clientId={config.google_client_id} onCredential={c => { close(); signInWithGoogleToken(c) }} />
          </div>)} />}
        {webauthnOK() && <Row icon="sparkles" iconTint="var(--acc)" title={t('Create passkey profile')} subtitle={t('Keeps your data safe and separate per person.')} accessory="chevron" onClick={registerHere} />}
        {webauthnOK() && <Row icon="person" iconTint="var(--blue)" title={t('Sign in with passkey')} accessory="chevron" onClick={signInHere} />}
      </> : (
        <Row icon="lock" iconTint="var(--grey)" title={t('Passkeys not supported in this browser.')} />
      )}
    </Section>}
    {!user && !NO_SERVER && !MOBILE && <p className="sect-f" style={{ marginTop: -18, marginBottom: 22 }}>{t('Guest mode — data lives only in this browser.')}</p>}

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      {/* 8.0: your name and avatar for the Home header */}
      <button className="lrow tap pf-row" onClick={profileSheet}>
        <ProfileAvatar S={S} size={30} />
        <span className="lrow-m"><span className="lrow-t">{profileOf(S).name || t('Your profile')}</span><span className="lrow-s">{t('Name and avatar')}</span></span>
        <Icon name="chevronRight" className="lrow-c" />
      </button>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang && LANGS[S.lang] ? S.lang : 'auto'} onChange={v => update(s => { s.lang = v })}
        options={[{ value: 'auto', label: t('Phone language'), subtitle: LANGS[deviceLang()] }, ...Object.entries(LANGS).map(([k, name]) => ({ value: k, label: name }))]}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: U('kg') }, { value: 'lb', label: U('lb') }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    {/* ---------- walking + body weight (MAHDI-JYM 2.0) ---------- */}
    <Section title={t('Walking & body')}>
      <Row icon="figureWalk" iconTint="var(--acc)" title={t('Walking & steps')} subtitle={t('Step counter, daily goal, notification, celebrations')} accessory="chevron" onClick={() => nav('/walk')} />
      <Row icon="scale" iconTint="var(--teal)" title={t('Body weight')} subtitle={t('Comparison, trend, photo verification, BMI')} accessory="chevron" onClick={() => nav('/weight')} />
      <Row icon="person" iconTint="var(--green)" title={t('Ideal body')} subtitle={t('Ideal weight, body fat, your plan and progress')} accessory="chevron" onClick={() => nav('/ideal')} />
      <Row icon="heartPulse" iconTint="var(--red)" title={t('Health log')} subtitle={t('Sleep, mood, blood pressure, sugar, medicines')} accessory="chevron" onClick={() => nav('/health')} />
      <Row icon="drop" iconTint="var(--blue)" title={t('Water & reminders')} subtitle={t('Glass, cup or can · daily goal · reminders with an exercise')} accessory="chevron" onClick={() => nav('/water')} />
      <Row icon="sparkles" iconTint="var(--pink)" title={t('Celebrations')} subtitle={t('Full screen, also with the app closed')} accessory="chevron" onClick={() => nav('/walk')} />
      <Row icon="target" iconTint="var(--orange)" title={t("Today's plan on Home")} subtitle={t('A daily workout, steps and water target for losing weight')}>
        <Switch checked={S.planOn !== false} onChange={v => update(s => { s.planOn = v })} />
      </Row>
    </Section>

    {/* ---------- 8.0: tools ---------- */}
    <Section title={t('Tools')}>
      <Row icon="calendar" iconTint="var(--indigo)" title={t('My schedule')} subtitle={t('School, meals, drinks, work — everything on time')} accessory="chevron" onClick={() => nav('/dayplan')} />
      <Row icon="bellBadge" iconTint="var(--orange)" title={t('All notifications')} subtitle={t('Water, workouts, schedule, medicines — in one place')} accessory="chevron" onClick={() => nav('/notifications')} />
      <Row icon="cup" iconTint="var(--green)" title={t('Drinks & juices')} subtitle={t('Healthy recipes with calories')} accessory="chevron" onClick={() => nav('/drinks')} />
      <Row icon="can" iconTint="var(--red)" title={t('Soft drinks')} subtitle={t('Cans, bottles and glasses')} accessory="chevron" onClick={() => nav('/sodas')} />
      <Row icon="nut" iconTint="var(--orange)" title={t('Nuts & seeds')} subtitle={t('Pistachios, kerzat and more')} accessory="chevron" onClick={() => nav('/nuts')} />
      <Row icon="timer" iconTint="var(--red)" title={t('Interval timer')} subtitle={t('Tabata, HIIT, EMOM and your own')} accessory="chevron" onClick={() => nav('/timer')} />
      <Row icon="wind" iconTint="var(--teal)" title={t('Breathe')} subtitle={t('Box, 4-7-8, coherent')} accessory="chevron" onClick={() => nav('/breathe')} />
      <Row icon="moon" iconTint="var(--purple)" title={t('Fasting tracker')} subtitle={t('Intermittent fasting and Ramadan')} accessory="chevron" onClick={() => nav('/fasting')} />
      <Row icon="heartPulse" iconTint="var(--green)" title={t('Recovery')} subtitle={t('Which muscles are ready again')} accessory="chevron" onClick={() => nav('/recovery')} />
      <Row icon="widget" iconTint="var(--acc)" title={t('All tools')} accessory="chevron" onClick={() => nav('/tools')} />
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + ' ' + U('s') }))} />
      {(wakeOK || !MOBILE) && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
        <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
      </Row>
      <Row icon="music" iconTint="var(--orange)" title={t('Celebration sound')} subtitle={packName(S)} accessory="chevron" onClick={soundPacksSheet} />
      <Row icon="play" iconTint="var(--green)" title={t('Start countdown')} subtitle={t('3 · 2 · 1 · GO before every workout, then a live timer')}>
        <Switch checked={S.workoutCountdown !== false} onChange={v => update(s => { s.workoutCountdown = v })} />
      </Row>
      <Row icon="timer" iconTint="var(--teal)" title={t('Voice countdown')} subtitle={t('Says 3, 2, 1 at the end of a rest or a timed set')}>
        <Switch checked={S.voiceCount !== false} onChange={v => update(s => { s.voiceCount = v })} />
      </Row>
      {/* Two names for the same judgement, so the column asks in the scale you already think in.
          The (i) sits before the control — you read it on the way to the choice, not after it. */}
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    {coachAvailable(config, user, { demo: DEMO, mobile: MOBILE }) && (
      <Section title={t('Coach')} footer={hasConsent(S)
        ? t('The Coach designs and adjusts your plan; it never changes anything without your say-so.')
        : t('An AI coach that can build your plan and adjust it from what you log. Off until you turn it on.')}>
        <Row icon="sparkles" iconTint="var(--acc)" title={hasConsent(S) ? t('Open the Coach') : t('Meet the Coach')}
          subtitle={hasConsent(S) ? t('Reviews, plan design, history and controls') : t('See what it would use, then decide')}
          accessory="chevron" onClick={() => nav('/coach')} />
      </Section>
    )}

    {(user || MOBILE) && <NotificationsCard S={S} update={update} toast={toast} />}

    {/* ---------- appearance ---------- */}
    <Section title={t('Appearance')} footer={DEMO || MOBILE ? undefined : t('synced with your profile')}>
      {/* every theme behind one row — 658 curated in 12 categories + the Theme Studio, follow the phone, accent (views/Themes.jsx) */}
      <Row icon="sparkles" iconTint="var(--pink)" title={t('Themes')} accessory="chevron" onClick={() => nav('/themes')}
        subtitle={themeName(resolveTheme(S, typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null)) + (S.themeSystem !== false ? ' · ' + t('Follow the phone') : '')}>
        <ThemeMock th={resolveTheme(S, typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null)} />
      </Row>
      <Row icon="image" iconTint="var(--teal)" title={t('Wallpaper')} accessory="chevron" onClick={() => nav('/wallpapers')}
        subtitle={S.wall && S.wall.id ? t('On') : t('Off')} />
      {MOBILE && <Row icon="bell" iconTint="var(--acc)" title={t('Theme colours in notifications')} subtitle={t('The notification shade and the status bar follow your theme')}>
        <Switch checked={S.notifTheme !== false} onChange={v => update(s => { s.notifTheme = v })} />
      </Row>}
      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
    </Section>

    {/* 9.0: battery saver (lib/battery.js) */}
    <Section title={t('Battery')} footer={t('The saver stops looping decorations and heavy blur effects. On Auto it switches on by itself at 20% battery or less.')}>
      <Row icon="battery" iconTint="var(--green)" title={t('Battery saver')}
        subtitle={batteryInfo().level != null ? t('Battery {0}%', Math.round(batteryInfo().level * 100)) + (batteryInfo().charging ? ' · ' + t('Charging') : '') : null} />
      <div className="bk-keep"><Segmented options={[{ value: 'auto', label: t('Auto') }, { value: 'on', label: t('On') }, { value: 'off', label: t('Off') }]}
        value={['on', 'off'].includes(S.saver) ? S.saver : 'auto'} onChange={v => update(s => { s.saver = v })} /></div>
    </Section>

    {/* 4.0: accessibility — text size, contrast, motion (lib/a11y.js) */}
    <Section title={t('Accessibility')} footer={t('Animations also stop when the phone’s own “remove animations” setting is on.')}>
      <Row icon="textformat" iconTint="var(--blue)" title={t('Text size')} />
      <div className="bk-keep"><Segmented options={TEXT_SIZES.map(x => ({ value: x.value, label: t(x.label) }))} value={textScaleOf(S)} onChange={v => update(s => { s.textScale = v })} /></div>
      <Row icon="contrast" iconTint="var(--label-2)" title={t('High contrast')} subtitle={t('Stronger text, lines and outlines')}>
        <Switch checked={!!S.highContrast} onChange={v => update(s => { s.highContrast = v })} />
      </Row>
      <Row icon="eye" iconTint="var(--teal)" title={t('Reduce motion')} subtitle={t('No animations or confetti')}>
        <Switch checked={!!S.reduceMotion} onChange={v => update(s => { s.reduceMotion = v })} />
      </Row>
      <Row icon="bolt" iconTint="var(--orange)" title={t('Vibrate on tap')} subtitle={t('A light tick when you press a button')}>
        <Switch checked={S.tapHaptics === true} onChange={v => update(s => { s.tapHaptics = v })} />
      </Row>
    </Section>

    {MOBILE && !DEMO && <SecuritySection />}

    <OfflineSection />

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Data')}>
      <Row icon="history" iconTint="var(--green)" title={t('Backups & restore')} subtitle={t('Versions of your data you can go back to')} accessory="chevron" onClick={() => nav('/backups')} />
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan (PPL)')} accessory="chevron" onClick={loadStarterPlan} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
      {/* Also drops anything the Coach is holding server-side: a wipe that leaves a pending
          proposal on the server behind would be a wipe in name only. */}
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({ title: t('Reset everything?'), message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), confirmText: t('Delete everything'), danger: true, onConfirm: () => { if (user) forgetCoach().catch(() => {}); replaceState(JSON.parse(JSON.stringify(DEF)), true); nav('/home'); toast(t('All data reset')) } })} />
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install MAHDI-JYM as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    {/* 12.0: this version, updates with direct downloads, the other versions */}
    <AppUpdates />

    <Section>
      <Row icon="sparkles" iconTint="var(--yellow)" title={t('What’s new')} subtitle={t('Version {0}', __APP_VERSION__)} accessory="chevron" onClick={whatsNewSheet} />
    </Section>

    <button className="app-sign" onClick={aboutSheet}>MAHDI-JYM</button>
  </div>
}

// Just the name under Settings; tapping it shows the licence notices the AGPL asks every
// interactive version of the app to keep reachable.
function aboutSheet() {
  useUI.getState().openSheet(close => <>
    <h3 style={{ textAlign: 'center' }}>MAHDI-JYM</h3>
    <div className="small muted" style={{ textAlign: 'center', lineHeight: 1.7, marginBottom: 14 }}>
      {t('Version {0}', __APP_VERSION__)}<br />
      {t('Free software under the GNU AGPL v3 — no warranty.')}<br />
      <a href="https://github.com/m777m44/Heroes-Jym" target="_blank" rel="noopener">{t('Source code')}</a>
      {' · '}<a href="https://github.com/DuarteSantos8/openGym" target="_blank" rel="noopener">openGym</a>
      {' · '}<a href="https://github.com/hasaneyldrm/exercises-dataset" target="_blank" rel="noopener">{t('Exercise data')}</a>
    </div>
    <Button onClick={close} style={{ width: '100%' }}>{t('Close')}</Button>
  </>)
}

// The whole point is that the two scales are one judgement counted from opposite ends, and a
// paragraph is a bad way to say that — the conversion table shows it in one look. Reading down
// a column is the answer to "what do I put here", so the numbers get their own aligned columns.
const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
// RIR 2 / RPE 8: the row a working set usually lands on — the anchor the others are read
// against. Not where the stepper starts; + walks up from the bottom of the scale.
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(() => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

// 2.6: each training day of the week (Saturday → Friday) with its routine — how many
// exercises, about how long — and its own reminder time (blank = the time for every day).
function ReminderWeek({ S, setReminder }) {
  const r = reminderPrefs(S)
  const rows = weekOrder(6).map(d => {
    const routine = (S.routines || []).find(x => x.id === (S.week || {})[d])
    return routine ? { d, routine, sum: routineSummary(routine, S.restSec) } : null
  }).filter(Boolean)
  if (!rows.length) return <Row icon="calendar" iconTint="var(--grey)" title={t('No routines on your week yet')} subtitle={t('Put routines on days in Plan — each one gets its reminder.')} />
  const setDay = (d, v) => {
    const days = { ...r.days }
    if (!v || v === r.time) delete days[d]; else days[d] = v
    setReminder({ days })
  }
  return <div className="rweek">
    {rows.map(({ d, routine, sum }) => {
      const own = !!r.days[d]
      return <div key={d} className="rweek-row" style={{ '--rc': colorVar(routineColor(routine)) }}>
        <span className="rweek-dot" aria-hidden="true" />
        <div className="rweek-t">
          <b>{t(DAYN[d])} · {routineLabel(routine.name)}</b>
          <span>{t('{0} exercises · about {1} min', sum.n.toLocaleString(dateLocale()), sum.min.toLocaleString(dateLocale()))}</span>
        </div>
        <input type="time" className={'timef' + (own ? ' own' : '')} value={timeFor(r, d)} aria-label={t(DAYN[d])}
          onChange={e => setDay(d, e.target.value)} />
      </div>
    })}
  </div>
}

// Rows shared by both reminder cards (native and push) once the daily reminder is on: the
// time, a smart suggestion from when you actually train, the follow-up and rest-day walks.
function ReminderExtras({ S, setReminder }) {
  const r = reminderPrefs(S)
  const sug = suggestedReminderTime(S.workouts)
  return <>
    <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')} subtitle={t('For every day — or set a time per day below')}>
      <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
        onChange={e => e.target.value && setReminder({ time: e.target.value })} />
    </Row>
    <ReminderWeek S={S} setReminder={setReminder} />
    {sug && sug.remind !== r.time && (
      <Row icon="lightbulb" iconTint="var(--yellow)" title={t('Use {0}', sug.remind)}
        subtitle={t('You usually start training around {0} — remind you half an hour before.', sug.usual)}
        accessory="chevron" onClick={() => setReminder({ time: sug.remind })} />
    )}
    <Row icon="figureStrength" iconTint="var(--green)" title={t('Home-workout reminder')}
      subtitle={t('Days without a routine: the day’s no-equipment workout, on screen with a light vibration.')}>
      <Switch checked={r.home} onChange={v => setReminder({ home: v })} />
    </Row>
    <Row icon="reset" iconTint="var(--orange)" title={t('Follow-up reminder')} subtitle={t('Once more an hour later if the workout still isn’t logged.')}>
      <Switch checked={r.nudge} onChange={v => setReminder({ nudge: v })} />
    </Row>
    <Row icon="figureWalk" iconTint="var(--acc)" title={t('Walking reminder on rest days')} subtitle={t('Only while today’s step goal isn’t met yet.')}>
      <Switch checked={r.walk} onChange={v => setReminder({ walk: v })} />
    </Row>
  </>
}

function NotificationsCard({ S, update, toast }) {
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <PushCard S={S} update={update} toast={toast} />
}

// Mobile build: the reminder is a native local notification scheduled on planned weekdays —
// no push server involved. The schedule itself is (re)synced by the store on every persist;
// this card only owns the OS permission prompt when the switch turns on.
function MobileReminderCard({ S, update, toast }) {
  const isOn = reminderPrefs(S).on
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: reminderPrefs(s).on, v2: true, ...patch, tz: localTZ() } })
  const toggle = async () => {
    const on = !isOn
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true, v2: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
    }
    setReminder({ on })
  }
  return (
    <Section title={t('Notifications')}
      footer={isOn ? t('Reminds you on days that have a routine planned and not yet trained — with the exercises, about how long it takes and your step goal in the same notification.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={isOn} onChange={toggle} />
      </Row>
      {isOn && <ReminderExtras S={S} setReminder={setReminder} />}
    </Section>
  )
}

function PushCard({ S, update, toast }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setOn(!!sub)).catch(() => {})
  }, [supported])

  const toggle = async v => {
    setBusy(true)
    try {
      if (!v) { await disablePush(); setOn(false); toast(t('Notifications off')) }
      else { await enablePush(); setOn(true); toast(t('Notifications on')) }
    } catch (e) { toast(e.message || t('Could not change notification settings')) }
    setBusy(false)
  }
  const test = async () => {
    try { await sendTestPush(); toast(t('Test sent — should arrive any second')) }
    catch (e) { toast(e.message || t('Test failed')) }
  }

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  return <>
    <Section
      title={t('Notifications')}
      footer={on && S.reminder?.on
        ? t("Only sent on days you have a routine planned and haven't logged a workout yet.") +
          (S.reminder?.tz ? ' ' + t('Timezone: {0} (auto-detected, updates if you travel).', S.reminder.tz) : '')
        : null}
    >
      <Row icon="bell" iconTint="var(--red)" title={t('Push notifications')} subtitle={t('Rest-timer alerts, even if MAHDI-JYM is closed.')}>
        <Switch checked={on} disabled={busy} onChange={toggle} />
      </Row>
      {on && (
        <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
          <Switch checked={!!S.reminder?.on} onChange={() => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: !s.reminder?.on, tz: localTZ() } })} />
        </Row>
      )}
      {on && S.reminder?.on && <ReminderExtras S={S} setReminder={patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })} />}
    </Section>
    {on && <div style={{ marginTop: -12, marginBottom: 22 }}><Button size="sm" icon="bell" onClick={test}>{t('Send test notification')}</Button></div>}
  </>
}

function RegisterInline({ close, setUser, pushState, pullState, toast }) {
  const nameRef = useRef(null)
  const go = async () => {
    const n = (nameRef.current.value || '').trim()
    if (!n) { toast(t('Enter a name')); return }
    try {
      const u = await passkeyRegister(n); setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); toast(t('Profile created — data moved into it')) }
      else { await pullState(); toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with your device.')}</div>
    <TextField ref={nameRef} placeholder={t('Your name')} maxLength={40} />
    <div style={{ height: 12 }} /><Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}
