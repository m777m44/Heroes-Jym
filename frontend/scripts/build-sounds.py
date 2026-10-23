#!/usr/bin/env python3
"""9.0 — render the celebration sound packs to public/sounds/<pack>/<kind>.mp3.

Every sound is synthesized here from scratch (no samples, so no licences): additive brass with a
filter that opens on the attack, string and choir pads, taiko, timpani, 808s, claps, risers,
cymbals, FM bells, plucked harps, a crowd — through a generated stereo hall and a limiter.
Deterministic (fixed seeds), so re-running gives the same files.

    python3 frontend/scripts/build-sounds.py            (needs numpy, scipy, soundfile)

Packs: champion (default), epic, neon, royal, arcade, zen.   Kinds: milestone, goal, water, plan,
workout, fast. The app's 'classic' pack is the original Web Audio synth (lib/celebrate.js), no files.
"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sounds')
rng = np.random.default_rng(9)


def N(sec):
    return int(round(sec * SR))


def t_(n):
    return np.arange(n) / SR


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    n = name.strip()
    base = names[n[0]]
    i = 1
    if len(n) > 2 and n[1] in '#b':
        base += 1 if n[1] == '#' else -1
        i = 2
    octave = int(n[i:])
    return 440.0 * 2 ** ((base + (octave - 4) * 12) / 12)


class Mix:
    def __init__(self, sec):
        self.L = np.zeros(N(sec))
        self.R = np.zeros(N(sec))

    def add(self, x, at, pan=0.0, gain=1.0):
        a = N(at)
        if a >= len(self.L):
            return
        x = x[: len(self.L) - a] * gain
        p = (pan + 1) * np.pi / 4
        self.L[a:a + len(x)] += x * np.cos(p)
        self.R[a:a + len(x)] += x * np.sin(p)

    def add2(self, L, R, at, gain=1.0):
        a = N(at)
        n = min(len(L), len(self.L) - a)
        if n <= 0:
            return
        self.L[a:a + n] += L[:n] * gain
        self.R[a:a + n] += R[:n] * gain


# ---- envelopes and filters -----------------------------------------------------------------------
def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.3, hold=None):
    t = t_(n)
    dur = n / SR
    hold = dur - r if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    e = np.where(t >= hold, s * np.clip(1 - (t - hold) / max(r, 1e-4), 0, 1), e)
    return e


def env_perc(n, a=0.002, decay=4.0):
    t = t_(n)
    return np.minimum(1, t / max(a, 1e-5)) * np.exp(-t * decay)


def lp(x, fc, order=2):
    fc = min(fc, SR * 0.45)
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)


def noise(n):
    return rng.standard_normal(n)


def sweep_filter(x, f0, f1, kind='band', width=0.6, blocks=48):
    """A filter whose centre glides from f0 to f1 (exponentially), done in overlapping blocks."""
    n = len(x)
    out = np.zeros(n)
    win = np.hanning(2 * (n // blocks) + 2)
    step = n // blocks
    for i in range(blocks):
        f = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        a, b = max(0, i * step - step), min(n, i * step + step + 2)
        seg = x[a:b]
        if kind == 'band':
            y = bp(seg, f * (1 - width / 2), f * (1 + width))
        elif kind == 'low':
            y = lp(seg, f)
        else:
            y = hp(seg, f)
        w = win[: len(y)] if len(win) >= len(y) else np.hanning(len(y))
        out[a:b] += y * w[: len(y)]
    return out


# ---- oscillators -----------------------------------------------------------------------------------
def additive(f, n, bright, kind='saw', vib=0.0, vib_rate=5.5, max_h=40):
    """Band-limited oscillator; `bright` (array or number) sets how many harmonics speak (a filter)."""
    t = t_(n)
    ph = 2 * np.pi * f * t
    if vib:
        ramp = np.clip((t - 0.25) / 0.4, 0, 1)
        ph = ph + (vib * f / vib_rate) * ramp * np.sin(2 * np.pi * vib_rate * t)
    out = np.zeros(n)
    hmax = int(min(max_h, (SR / 2.2) / f))
    b = np.asarray(bright, dtype=float)
    for k in range(1, hmax + 1):
        if kind == 'square' and k % 2 == 0:
            continue
        amp = (1.0 / k) * np.exp(-(k - 1) / np.maximum(b, 0.3))
        if kind == 'tri':
            if k % 2 == 0:
                continue
            amp = (1.0 / (k * k)) * np.exp(-(k - 1) / np.maximum(b, 0.3))
        out += amp * np.sin(k * ph)
    return out


def brass(f, dur, vol=1.0, bright=9.0, vib=0.006):
    n = N(dur + 0.05)
    t = t_(n)
    b = 1.8 + (bright - 1.8) * np.minimum(1, t / 0.06) * (0.55 + 0.45 * np.exp(-t * 2.2))
    x = sum(additive(f * 2 ** (c / 1200), n, b, vib=vib if dur > 0.45 else 0) for c in (-9, 0, 8)) / 3
    return x * env_adsr(n, 0.03, 0.12, 0.82, min(0.22, dur * 0.4)) * vol


def trumpet(f, dur, vol=1.0):
    n = N(dur + 0.04)
    t = t_(n)
    b = 3 + 11 * np.minimum(1, t / 0.035) * (0.6 + 0.4 * np.exp(-t * 3))
    x = additive(f, n, b, vib=0.004 if dur > 0.4 else 0)
    return hp(x, 300) * env_adsr(n, 0.018, 0.08, 0.85, min(0.12, dur * 0.35)) * vol


def strings(f, dur, vol=1.0, attack=0.35):
    n = N(dur)
    x = sum(additive(f * 2 ** (c / 1200), n, 7.0, vib=0.004) for c in (-14, -5, 0, 6, 13)) / 5
    return lp(x, 3800) * env_adsr(n, attack, 0.2, 0.9, min(0.6, dur * 0.4)) * vol


def choir(f, dur, vol=1.0, attack=0.3):
    n = N(dur)
    x = sum(additive(f * 2 ** (c / 1200), n, 14.0, vib=0.007, vib_rate=5.0) for c in (-10, 0, 9)) / 3
    y = 1.0 * bp(x, 650, 1000) + 0.6 * bp(x, 1000, 1350) + 0.25 * bp(x, 2500, 3200)   # "ah"
    return y * env_adsr(n, attack, 0.2, 0.9, min(0.7, dur * 0.45)) * vol * 2.2


def bell(f, dur=1.6, vol=1.0, ratio=3.5, index=2.2):
    n = N(dur)
    t = t_(n)
    mod = index * np.exp(-t * 3.2) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * env_perc(n, 0.002, 3.0 / dur * 2) * vol


def pluck(f, dur=1.4, vol=1.0, damp=0.996):
    n = N(dur)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return lp(out, 6000) * vol


def kick(dur=0.5, f0=150, f1=46, vol=1.0, click=0.3):
    n = N(dur)
    t = t_(n)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6.5)
    x[: N(0.004)] += click * noise(N(0.004))
    return np.tanh(x * 1.6) * vol


def sub_drop(dur=1.0, f0=110, f1=34, vol=1.0):
    n = N(dur)
    t = t_(n)
    f = f1 + (f0 - f1) * np.exp(-t * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * vol


def taiko(dur=1.1, vol=1.0, f0=95):
    n = N(dur)
    t = t_(n)
    body = np.sin(2 * np.pi * np.cumsum(f0 * (0.78 + 0.22 * np.exp(-t * 10))) / SR) * np.exp(-t * 4.2)
    slap = bp(noise(n), 250, 2200) * np.exp(-t * 24)
    ring = np.sin(2 * np.pi * f0 * 2.3 * t) * np.exp(-t * 9) * 0.35
    return np.tanh((body * 0.85 + slap * 1.0 + ring) * 1.4) * vol


def timpani(f=note('C2'), dur=1.6, vol=1.0):
    n = N(dur)
    t = t_(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 2.6), (1.5, 0.5, 3.5), (1.98, 0.3, 4.5), (2.44, 0.15, 6)))
    x += lp(noise(n), 600) * np.exp(-t * 30) * 0.5
    return x * vol


def snare(dur=0.25, vol=1.0):
    n = N(dur)
    t = t_(n)
    return (bp(noise(n), 1500, 7000) * np.exp(-t * 18) * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5) * vol


def clap(vol=1.0):
    n = N(0.4)
    t = t_(n)
    x = np.zeros(n)
    for k, off in enumerate((0, 0.011, 0.022)):
        a = N(off)
        m = N(0.012)
        x[a:a + m] += bp(noise(m), 900, 2600) * (1 - k * 0.15)
    x += bp(noise(n), 900, 2800) * np.exp(-t * 14) * 0.45
    return x * vol


def crash(dur=2.6, vol=1.0, bright=5500):
    n = N(dur)
    t = t_(n)
    x = hp(noise(n), bright) * np.exp(-t * 2.0)
    for f in rng.uniform(3000, 9000, 12):
        x += 0.05 * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * rng.uniform(1.5, 4))
    return x * env_perc(n, 0.001, 0) * vol


def riser(dur=0.7, vol=1.0, f0=400, f1=9000):
    n = N(dur)
    t = t_(n)
    x = sweep_filter(noise(n), f0, f1, 'band', 0.8, blocks=40)
    x = x * (t / dur) ** 2.2
    return x * vol


def gong(f=note('A1'), dur=3.0, vol=1.0):
    n = N(dur)
    t = t_(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t + 0.3 * np.sin(2 * np.pi * 0.7 * t)) * np.exp(-t * d)
            for r, a, d in ((1, 1, 0.9), (1.47, 0.6, 1.2), (2.09, 0.5, 1.4), (2.56, 0.35, 1.8), (3.9, 0.2, 2.6)))
    return x * np.minimum(1, t / 0.03) * vol


def bowl(f, dur=3.4, vol=1.0):
    n = N(dur)
    t = t_(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * (1 + 0.25 * np.sin(2 * np.pi * (1.1 + r * 0.3) * t)) * np.exp(-t * d)
            for r, a, d in ((1, 1, 0.7), (2.76, 0.45, 1.1), (5.4, 0.2, 1.8), (8.93, 0.08, 2.6)))
    return x * np.minimum(1, t / 0.01) * vol


def chip(f, dur, vol=1.0, kind='square', duty_vib=0.0):
    n = N(dur)
    t = t_(n)
    if kind == 'square':
        x = np.sign(np.sin(2 * np.pi * f * t + duty_vib * np.sin(2 * np.pi * 6 * t)))
    else:
        x = 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    return lp(x, 9000) * env_adsr(n, 0.004, 0.05, 0.75, min(0.06, dur * 0.3)) * vol


def supersaw(f, dur, vol=1.0, cutoff=5000):
    n = N(dur)
    x = sum(additive(f * 2 ** (c / 1200), n, 18.0) for c in (-28, -17, -8, 0, 8, 17, 28)) / 5
    return lp(x, cutoff) * env_adsr(n, 0.006, 0.18, 0.65, min(0.25, dur * 0.4)) * vol


def crowd(dur=2.6, vol=1.0, claps=True):
    n = N(dur)
    t = t_(n)
    swell = np.clip(t / 0.35, 0, 1) * np.clip((dur - t) / (dur * 0.55), 0, 1)
    x = np.zeros(n)
    for _ in range(14):                                       # voices: "heyyy" — formant-ish noise
        f = rng.uniform(500, 1400)
        am = 0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(2, 6) * t + rng.uniform(0, 6))
        x += bp(noise(n), f * 0.8, f * 1.25) * am
    x = x / 14 * 2.2
    if claps:
        for _ in range(int(dur * 42)):
            at = rng.uniform(0, dur * 0.9)
            c = clap(0.22 * rng.uniform(0.5, 1))
            a = N(at)
            m = min(len(c), n - a)
            x[a:a + m] += c[:m] * swell[a] * 1.4
    return x * swell * vol


# ---- space and mastering ---------------------------------------------------------------------------
def hall_ir(sec=2.2, damp=0.6):
    n = N(sec)
    t = t_(n)
    irs = []
    for ch in range(2):
        x = noise(n) * np.exp(-t * (3.2 / sec) * 2.2)
        early = np.zeros(n)
        for d in rng.uniform(0.008, 0.07, 9):
            early[N(d)] += rng.uniform(0.3, 0.8) * (1 if rng.random() > 0.5 else -1)
        x = lp(x, 9000 * damp + 1500) + early
        x[: N(0.012)] *= np.linspace(0, 1, N(0.012))
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


def short_rms_db(L, R):
    m = (L + R) / 2
    w = int(0.4 * SR)
    r = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, 'valid'))
    return 20 * np.log10(r.max() + 1e-12)


def finish(mix, name, wet=0.22, room=2.2, tail=0.25, target_db=-1.6, comp=0.42, loud=-11.0):
    """Hall, then mastering for a PHONE speaker: nothing below ~95 Hz (a phone can't play it and it
    would only eat headroom), gentle compression, a soft clipper driven until the loudest 400 ms
    reach `loud` dBFS, a peak ceiling at `target_db` and short fades."""
    L, R = mix.L, mix.R
    irL, irR = hall_ir(room)
    wl = fftconvolve(L, irL)[: len(L)]
    wr = fftconvolve(R, irR)[: len(R)]
    L = L + wet * wl * 2.2
    R = R + wet * wr * 2.2
    L, R = hp(L, 120, 4), hp(R, 120, 4)
    st = np.maximum(np.abs(L), np.abs(R))
    envl = np.zeros_like(st)
    a_att, a_rel = np.exp(-1 / (0.003 * SR)), np.exp(-1 / (0.12 * SR))
    e = 0.0
    for i in range(0, len(st), 32):
        v = st[i:i + 32].max()
        e = a_att * e + (1 - a_att) * v if v > e else a_rel * e + (1 - a_rel) * v
        envl[i:i + 32] = e
    peak = np.percentile(envl, 99.5) + 1e-9
    thr = peak * comp
    gain = np.where(envl > thr, (thr + (envl - thr) * 0.3) / np.maximum(envl, 1e-9), 1.0)
    L, R = L * gain, R * gain
    m = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    L, R = L / m, R / m
    k = 10 ** (target_db / 20)
    for drive in (1.0, 1.15, 1.3, 1.5, 1.75, 2.0, 2.3):
        Lc, Rc = np.tanh(L * drive) / np.tanh(drive), np.tanh(R * drive) / np.tanh(drive)
        if short_rms_db(Lc * k, Rc * k) >= loud:
            break
    L, R = Lc, Rc
    fade = N(tail)
    w = np.ones(len(L))
    w[-fade:] = np.linspace(1, 0, fade) ** 2
    w[: N(0.004)] = np.linspace(0, 1, N(0.004))
    out = np.stack([L * w * k, R * w * k], axis=1)
    path = os.path.join(OUT, name + '.mp3')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # an MP3 can overshoot the source by a few dB after the encoder's filtering: decode, check the
    # real peak and re-encode quieter until it stays under -1 dBFS
    scale = 1.0
    for _ in range(5):
        sf.write(path, (out * scale).astype(np.float32), SR, format='MP3', bitrate_mode='VARIABLE', compression_level=0.45)
        y, _sr = sf.read(path)
        pk = float(np.abs(y).max())
        if pk <= 10 ** (-1.0 / 20):
            break
        scale *= 10 ** (-1.15 / 20) / pk
    return path


def chord(m, names, at, dur, inst, vol, spread=0.6):
    for i, nm in enumerate(names):
        p = -spread + 2 * spread * (i / max(1, len(names) - 1))
        f = note(nm)
        w = float(np.clip((f / 196.0) ** 0.7, 0.4, 1.0))
        m.add(inst(f, dur, vol * w), at, pan=p)


def sparkle(m, names, at, step=0.06, vol=0.25, dur=1.2, ratio=3.5):
    for i, nm in enumerate(names):
        m.add(bell(note(nm), dur, vol, ratio=ratio), at + i * step, pan=-0.5 + i * (1.0 / max(1, len(names) - 1)))


# ---- packs -----------------------------------------------------------------------------------------
def champion():
    P = 'champion/'
    # goal: riser → stadium hit (brass + choir + strings + taiko + crash) → trumpet motif → crowd
    m = Mix(4.4)
    m.add(riser(0.62, 0.35), 0.0)
    for i, d in enumerate((0.0, 0.16, 0.30, 0.42, 0.52)):
        m.add(snare(0.2, 0.18 + i * 0.07), d, pan=0.15)
    hit = 0.62
    m.add(kick(0.6, vol=1.0), hit); m.add(taiko(1.2, 0.9), hit); m.add(sub_drop(1.0, vol=0.55), hit)
    m.add(crash(2.8, 0.38), hit)
    chord(m, ['C3', 'G3', 'C4', 'E4', 'G4'], hit, 1.9, brass, 0.30)
    chord(m, ['C4', 'E4', 'G4', 'C5'], hit, 2.4, choir, 0.16)
    chord(m, ['C3', 'G3', 'E4', 'C5'], hit, 2.6, strings, 0.12)
    for i, nm in enumerate(['G4', 'C5', 'E5', 'G5']):
        m.add(trumpet(note(nm), 0.18 if i < 3 else 1.1, 0.30), hit + 0.55 + i * 0.13, pan=0.25)
    m.add(kick(0.5, vol=0.7), hit + 0.94); m.add(taiko(0.9, 0.6), hit + 0.94)
    sparkle(m, ['C6', 'E6', 'G6', 'C7'], hit + 1.15, vol=0.12)
    m.add(crowd(3.0, 0.55), hit + 0.2)
    finish(m, P + 'goal')

    m = Mix(2.6)
    m.add(riser(0.28, 0.25, 800, 9000), 0.0)
    hit = 0.28
    m.add(kick(0.5, vol=0.9), hit); m.add(taiko(0.9, 0.6), hit); m.add(crash(1.8, 0.25), hit)
    chord(m, ['G3', 'D4', 'G4', 'B4', 'D5'], hit, 1.1, brass, 0.30)
    chord(m, ['G4', 'B4', 'D5'], hit, 1.3, choir, 0.12)
    sparkle(m, ['G5', 'B5', 'D6', 'G6'], hit + 0.2, vol=0.14)
    m.add(crowd(1.9, 0.38), hit + 0.1)
    finish(m, P + 'milestone')

    m = Mix(2.3)
    for i, f in enumerate((340, 420, 520, 640, 780)):
        n = N(0.12); tt = t_(n)
        blip = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.4 * tt / 0.12)) / SR) * env_perc(n, 0.004, 22)
        m.add(blip, i * 0.07, pan=-0.4 + i * 0.2, gain=0.5)
    for i, nm in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5']):
        m.add(pluck(note(nm), 1.5, 0.55), 0.38 + i * 0.07, pan=-0.5 + i * 0.2)
    chord(m, ['D4', 'A4', 'F#5'], 0.42, 1.6, strings, 0.10)
    sparkle(m, ['A5', 'D6', 'F#6'], 0.85, vol=0.12, ratio=4.0)
    finish(m, P + 'water', wet=0.3)

    m = Mix(5.2)
    for i in range(14):
        m.add(timpani(note('C2'), 0.6, 0.15 + i * 0.045), i * 0.05 * (1 - i / 30), pan=-0.2)
    m.add(riser(0.75, 0.3), 0.0)
    hit = 0.75
    m.add(kick(0.6, vol=1.0), hit); m.add(taiko(1.2, 0.9), hit); m.add(crash(2.4, 0.35), hit)
    chord(m, ['C3', 'G3', 'C4', 'E4', 'G4', 'C5'], hit, 0.85, brass, 0.26)
    chord(m, ['C4', 'E4', 'G4'], hit, 0.95, choir, 0.13)
    hit2 = hit + 0.9
    m.add(kick(0.6, vol=1.0), hit2); m.add(taiko(1.3, 1.0), hit2); m.add(sub_drop(1.2, vol=0.6), hit2); m.add(crash(3.0, 0.42), hit2)
    chord(m, ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5'], hit2, 2.2, brass, 0.30)
    chord(m, ['D4', 'F#4', 'A4', 'D5'], hit2, 2.6, choir, 0.17)
    chord(m, ['D3', 'A3', 'F#4', 'D5'], hit2, 2.8, strings, 0.13)
    for i, nm in enumerate(['A4', 'D5', 'F#5', 'A5', 'D6']):
        m.add(trumpet(note(nm), 0.16 if i < 4 else 1.3, 0.26), hit2 + 0.5 + i * 0.12, pan=0.3)
    sparkle(m, ['D6', 'F#6', 'A6', 'D7'], hit2 + 1.2, vol=0.12)
    m.add(crowd(3.2, 0.6), hit2 + 0.1)
    finish(m, P + 'plan')

    m = Mix(4.2)
    for i in range(10):
        m.add(snare(0.18, 0.12 + i * 0.05), i * 0.055, pan=0.1)
    hit = 0.6
    m.add(kick(0.6, vol=1.0), hit); m.add(taiko(1.2, 0.95), hit); m.add(crash(2.6, 0.36), hit)
    chord(m, ['F3', 'C4', 'F4', 'A4', 'C5'], hit, 1.6, brass, 0.30)
    chord(m, ['F3', 'C4', 'A4'], hit, 2.2, strings, 0.12)
    for i, nm in enumerate(['C5', 'F5', 'A5', 'C6']):
        m.add(trumpet(note(nm), 0.15 if i < 3 else 1.2, 0.28), hit + 0.42 + i * 0.12, pan=-0.25)
    m.add(kick(0.5, vol=0.8), hit + 0.78); m.add(taiko(0.9, 0.7), hit + 0.78)
    sparkle(m, ['C7', 'A6', 'F6', 'C6', 'A5'], hit + 1.25, step=0.07, vol=0.11)
    m.add(crowd(2.8, 0.5), hit + 0.25)
    finish(m, P + 'workout')

    m = Mix(3.6)
    m.add(gong(note('A2'), 3.4, 0.5), 0.0)
    chord(m, ['A3', 'E4', 'C5'], 0.05, 1.5, choir, 0.15)
    chord(m, ['C4', 'G4', 'E5'], 1.25, 2.2, choir, 0.18)
    chord(m, ['C3', 'G3', 'E4'], 1.25, 2.3, strings, 0.12)
    sparkle(m, ['E5', 'G5', 'C6', 'E6'], 1.35, step=0.11, vol=0.14, dur=1.8)
    finish(m, P + 'fast', wet=0.32, room=2.8)


def epic():
    P = 'epic/'
    def base(sec, root, hits, big=True):
        m = Mix(sec)
        for i, at in enumerate(hits):
            m.add(taiko(1.2, 0.7 + 0.1 * i, f0=85), at, pan=(-0.3 if i % 2 else 0.3))
            m.add(lp(noise(N(0.1)), 400) * np.exp(-t_(N(0.1)) * 30), at, gain=0.4)
        return m
    m = base(4.4, 'D', [0.0, 0.28, 0.42, 0.62])
    m.add(riser(0.62, 0.22, 300, 6000), 0.0)
    hit = 0.82
    m.add(taiko(1.6, 1.0, 70), hit); m.add(sub_drop(1.4, 90, 32, 0.7), hit); m.add(crash(3.0, 0.32, 4500), hit)
    chord(m, ['D2', 'A2', 'D3', 'F3', 'A3'], hit, 2.6, brass, 0.30)
    chord(m, ['D4', 'F4', 'A4', 'D5'], hit, 3.0, choir, 0.2)
    for i, nm in enumerate(['D4', 'A4', 'D5', 'F5'] * 2):
        m.add(strings(note(nm), 0.16, 0.12, attack=0.01), hit + 0.1 + i * 0.12, pan=0.4)
    m.add(gong(note('D3'), 3.0, 0.26), hit)
    finish(m, P + 'goal', wet=0.3, room=2.8)

    m = base(2.8, 'G', [0.0, 0.2])
    hit = 0.38
    m.add(taiko(1.3, 1.0, 72), hit); m.add(crash(2.0, 0.25, 4500), hit)
    chord(m, ['G2', 'D3', 'G3', 'Bb3'], hit, 1.6, brass, 0.30)
    chord(m, ['G4', 'Bb4', 'D5'], hit, 1.9, choir, 0.16)
    finish(m, P + 'milestone', wet=0.3, room=2.6)

    m = Mix(2.6)
    for i, nm in enumerate(['A4', 'C#5', 'E5', 'A5', 'C#6', 'E6']):
        m.add(pluck(note(nm), 1.6, 0.5), i * 0.08, pan=-0.6 + i * 0.24)
    chord(m, ['A3', 'E4', 'C#5'], 0.1, 2.2, strings, 0.12)
    chord(m, ['A4', 'C#5', 'E5'], 0.4, 2.0, choir, 0.1)
    finish(m, P + 'water', wet=0.34, room=2.6)

    m = base(5.4, 'C', [0.0, 0.18, 0.36, 0.5, 0.62, 0.72])
    hit = 0.9
    m.add(taiko(1.5, 1.0, 70), hit); m.add(crash(2.0, 0.28, 4500), hit)
    chord(m, ['C3', 'G3', 'C4', 'Eb4'], hit, 0.9, brass, 0.26)
    hit2 = hit + 0.95
    m.add(taiko(1.8, 1.1, 66), hit2); m.add(sub_drop(1.6, 90, 30, 0.7), hit2); m.add(crash(3.2, 0.36, 4500), hit2)
    chord(m, ['C2', 'G2', 'C3', 'E3', 'G3', 'C4'], hit2, 2.8, brass, 0.3)
    chord(m, ['C4', 'E4', 'G4', 'C5'], hit2, 3.0, choir, 0.22)
    chord(m, ['C3', 'G3', 'E4', 'C5'], hit2, 3.0, strings, 0.14)
    m.add(gong(note('C3'), 3.2, 0.3), hit2)
    finish(m, P + 'plan', wet=0.32, room=3.0)

    m = base(4.4, 'E', [0.0, 0.14, 0.28, 0.4, 0.5, 0.58])
    hit = 0.72
    m.add(taiko(1.6, 1.0, 70), hit); m.add(crash(2.8, 0.3, 4500), hit)
    chord(m, ['E2', 'B2', 'E3', 'G#3', 'B3'], hit, 2.4, brass, 0.3)
    chord(m, ['E4', 'G#4', 'B4'], hit, 2.6, choir, 0.18)
    for i, nm in enumerate(['B4', 'E5', 'G#5', 'B5']):
        m.add(trumpet(note(nm), 0.14 if i < 3 else 1.0, 0.2), hit + 0.4 + i * 0.12)
    finish(m, P + 'workout', wet=0.3, room=2.8)

    m = Mix(3.8)
    m.add(gong(note('F2'), 3.6, 0.55), 0.0)
    chord(m, ['F3', 'C4', 'Ab4'], 0.1, 1.6, choir, 0.18)
    chord(m, ['Ab3', 'Eb4', 'C5'], 1.3, 2.4, choir, 0.2)
    chord(m, ['Ab2', 'Eb3', 'C4'], 1.3, 2.4, strings, 0.12)
    finish(m, P + 'fast', wet=0.36, room=3.2)


def neon():
    P = 'neon/'
    def pump(x, at_list, sec):
        g = np.ones(len(x))
        for at in at_list:
            a = N(at)
            n = min(N(0.25), len(g) - a)
            if n > 0:
                g[a:a + n] *= 0.25 + 0.75 * np.clip(np.arange(n) / n, 0, 1) ** 1.5
        return x * g

    def laser(at_f=1800, dur=0.35, vol=0.3):
        n = N(dur); t = t_(n)
        f = at_f * np.exp(-t * 9) + 120
        return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 9) * vol * 0.4

    m = Mix(4.0)
    for i in range(12):
        m.add(snare(0.15, 0.08 + i * 0.045), 0.6 * (1 - (1 - i / 12) ** 1.6), pan=0.1)
    m.add(riser(0.7, 0.34, 600, 12000), 0.0)
    hit = 0.72
    beats = [hit + k * 0.4 for k in range(6)]
    for b in beats:
        m.add(kick(0.45, 160, 45, 0.95), b)
    m.add(sub_drop(1.4, 100, 36, 0.7), hit)
    st = np.zeros(N(2.6))
    for nm in ['A3', 'C4', 'E4', 'A4', 'C5']:
        x = supersaw(note(nm), 2.4, 0.22, 6500)
        st[: len(x)] += x
    st = pump(st, [k * 0.4 for k in range(7)], 2.6)
    m.add(st, hit, pan=-0.25); m.add(st, hit + 0.012, pan=0.25)
    for i, nm in enumerate(['A5', 'C6', 'E6', 'A6', 'E6', 'C6', 'A6', 'E7']):
        m.add(chip(note(nm), 0.1, 0.12, 'square'), hit + 0.2 + i * 0.1, pan=(-0.5 if i % 2 else 0.5))
    m.add(laser(2200), hit + 0.05, pan=-0.6); m.add(laser(1700), hit + 0.45, pan=0.6)
    m.add(crash(2.0, 0.22, 7000), hit)
    finish(m, P + 'goal', wet=0.16, room=1.6)

    m = Mix(2.2)
    hit = 0.12
    m.add(kick(0.4, 160, 45, 0.7), hit); m.add(clap(0.5), hit + 0.2)
    st = sum(supersaw(note(nm), 0.9, 0.46) for nm in ['E4', 'G#4', 'B4', 'E5'])
    m.add(st, hit, pan=-0.2); m.add(st, hit + 0.01, pan=0.2)
    for i, nm in enumerate(['E5', 'G#5', 'B5', 'E6']):
        m.add(chip(note(nm), 0.09, 0.17), hit + 0.15 + i * 0.08, pan=0.4)
    finish(m, P + 'milestone', wet=0.16, room=1.5)

    m = Mix(2.4)
    for i, nm in enumerate(['C5', 'G5', 'E5', 'C6', 'G5', 'E6']):
        n = N(0.22); tt = t_(n)
        x = additive(note(nm), n, 6.0) * env_perc(n, 0.003, 14)
        m.add(x, i * 0.09, pan=(-0.6 if i % 2 else 0.6), gain=0.35)
        m.add(x * 0.4, i * 0.09 + 0.27, pan=(0.6 if i % 2 else -0.6), gain=0.35)   # echo
    m.add(supersaw(note('C4'), 1.4, 0.12, 2500), 0.55)
    finish(m, P + 'water', wet=0.22, room=1.8)

    m = Mix(4.8)
    m.add(riser(0.9, 0.36, 400, 12000), 0.0)
    for i in range(16):
        m.add(snare(0.14, 0.06 + i * 0.035), 0.88 * (1 - (1 - i / 16) ** 1.7))
    hit = 0.92
    for k in range(8):
        m.add(kick(0.45, 160, 44, 1.0), hit + k * 0.38)
    m.add(sub_drop(1.6, 110, 34, 0.75), hit)
    st = np.zeros(N(3.2))
    for nm in ['F3', 'A3', 'C4', 'F4', 'A4', 'C5']:
        x = supersaw(note(nm), 3.0, 0.2, 7000); st[: len(x)] += x
    st = pump(st, [k * 0.38 for k in range(9)], 3.2)
    m.add(st, hit, pan=-0.3); m.add(st, hit + 0.014, pan=0.3)
    for i, nm in enumerate(['F5', 'A5', 'C6', 'F6', 'C6', 'A5', 'C6', 'F6', 'A6', 'C7']):
        m.add(chip(note(nm), 0.09, 0.11), hit + 0.2 + i * 0.095, pan=(-0.5 if i % 2 else 0.5))
    m.add(laser(2400), hit, pan=-0.6); m.add(laser(2000), hit + 0.76, pan=0.6); m.add(crash(2.4, 0.24, 7000), hit)
    finish(m, P + 'plan', wet=0.16, room=1.6)

    m = Mix(3.6)
    for i in range(8):
        m.add(kick(0.3, 140, 50, 0.4 + i * 0.07), i * 0.075)
    hit = 0.62
    m.add(kick(0.45, 160, 44, 1.0), hit); m.add(sub_drop(1.2, 100, 34, 0.7), hit); m.add(clap(0.6), hit)
    st = sum(supersaw(note(nm), 1.8, 0.22, 6500) for nm in ['D4', 'F#4', 'A4', 'D5'])
    m.add(st, hit, pan=-0.25); m.add(st, hit + 0.012, pan=0.25)
    for i, nm in enumerate(['A5', 'D6', 'F#6', 'A6']):
        m.add(chip(note(nm), 0.11, 0.13), hit + 0.25 + i * 0.1)
    m.add(laser(2000), hit + 0.1, pan=0.5)
    finish(m, P + 'workout', wet=0.16, room=1.6)

    m = Mix(3.4)
    st = sum(supersaw(note(nm), 3.0, 0.14, 1800) for nm in ['A3', 'E4', 'C5'])
    m.add(st * env_adsr(len(st), 0.8, 0.3, 0.8, 1.2), 0.0)
    for i, nm in enumerate(['E5', 'A5', 'C6', 'E6']):
        m.add(bell(note(nm), 1.6, 0.2, ratio=2.0, index=1.2), 1.0 + i * 0.16, pan=-0.4 + i * 0.27)
    finish(m, P + 'fast', wet=0.3, room=2.4)


def royal():
    P = 'royal/'
    def fanfare(m, at, notes, vol=0.32, pan=0.2):
        t = at
        for nm, d in notes:
            if nm:
                m.add(trumpet(note(nm), d * 0.92, vol), t, pan=pan)
                m.add(trumpet(note(nm) * 0.5 * 2 ** (3 / 12) * 2 ** (4 / 12), d * 0.92, vol * 0.45), t, pan=-pan)   # a second voice a 6th below
            t += d
        return t
    m = Mix(4.2)
    end = fanfare(m, 0.0, [('G4', 0.11), ('G4', 0.11), ('G4', 0.11), ('C5', 0.38), ('G4', 0.16), ('C5', 0.16), ('E5', 0.9)])
    for i in range(8):
        m.add(timpani(note('G2'), 0.5, 0.15 + i * 0.05), i * 0.045, pan=-0.3)
    hit = 0.71
    m.add(timpani(note('C2'), 2.0, 1.0), hit); m.add(crash(2.6, 0.3), hit)
    chord(m, ['C3', 'G3', 'C4', 'E4', 'G4'], hit + 0.32, 2.4, brass, 0.22)
    chord(m, ['C3', 'G3', 'E4', 'C5'], hit, 2.8, strings, 0.12)
    m.add(timpani(note('G2'), 1.2, 0.7), hit + 0.32)
    m.add(timpani(note('C2'), 1.6, 0.9), end - 0.9)
    sparkle(m, ['C6', 'E6', 'G6', 'C7'], end - 0.6, vol=0.1)
    finish(m, P + 'goal', wet=0.3, room=2.6)

    m = Mix(2.5)
    fanfare(m, 0.0, [('C5', 0.1), ('C5', 0.1), ('G5', 0.75)])
    m.add(timpani(note('C2'), 1.6, 0.8), 0.2); m.add(crash(1.6, 0.18), 0.2)
    chord(m, ['C4', 'G4', 'E5'], 0.2, 1.6, strings, 0.12)
    finish(m, P + 'milestone', wet=0.3, room=2.4)

    m = Mix(2.5)
    for i, nm in enumerate(['G4', 'B4', 'D5', 'G5', 'B5', 'D6', 'G6']):
        m.add(pluck(note(nm), 1.6, 0.42), i * 0.06, pan=-0.6 + i * 0.2)
    chord(m, ['G3', 'D4', 'B4'], 0.1, 2.0, strings, 0.12)
    finish(m, P + 'water', wet=0.32, room=2.6)

    m = Mix(5.0)
    end = fanfare(m, 0.0, [('C5', 0.12), ('C5', 0.12), ('C5', 0.12), ('G5', 0.4), ('E5', 0.14), ('G5', 0.14), ('C6', 1.2)], vol=0.32)
    for i in range(12):
        m.add(timpani(note('C2'), 0.5, 0.12 + i * 0.05), i * 0.04)
    hit = 0.76
    m.add(timpani(note('C2'), 2.0, 1.0), hit); m.add(crash(2.4, 0.3), hit)
    chord(m, ['C3', 'G3', 'C4', 'E4', 'G4', 'C5'], hit + 0.36, 3.0, brass, 0.22)
    chord(m, ['C3', 'G3', 'E4', 'C5'], hit, 3.4, strings, 0.13)
    chord(m, ['C4', 'E4', 'G4', 'C5'], hit + 0.36, 3.0, choir, 0.14)
    m.add(timpani(note('G2'), 1.4, 0.8), end - 1.2); m.add(timpani(note('C2'), 2.0, 1.0), end - 0.9); m.add(crash(3.0, 0.36), end - 0.9)
    sparkle(m, ['G6', 'C7', 'E7'], end - 0.6, vol=0.1)
    finish(m, P + 'plan', wet=0.3, room=2.8)

    m = Mix(4.0)
    end = fanfare(m, 0.0, [('D5', 0.1), ('D5', 0.1), ('D5', 0.1), ('A5', 0.34), ('F#5', 0.14), ('A5', 0.14), ('D6', 0.95)], vol=0.3)
    hit = 0.3
    m.add(timpani(note('D2'), 1.8, 0.9), hit); m.add(crash(2.4, 0.26), hit + 0.34)
    chord(m, ['D3', 'A3', 'D4', 'F#4', 'A4'], hit + 0.34, 2.4, brass, 0.22)
    chord(m, ['D3', 'A3', 'F#4', 'D5'], hit, 2.8, strings, 0.12)
    m.add(timpani(note('A2'), 1.2, 0.7), end - 0.95); m.add(timpani(note('D2'), 1.6, 0.9), end - 0.6)
    finish(m, P + 'workout', wet=0.3, room=2.6)

    m = Mix(3.6)
    chord(m, ['F3', 'C4', 'A4'], 0.0, 1.6, strings, 0.14)
    chord(m, ['Bb3', 'F4', 'D5'], 1.0, 1.4, strings, 0.14)
    chord(m, ['C4', 'G4', 'E5'], 1.8, 1.8, choir, 0.16)
    m.add(trumpet(note('C5'), 1.4, 0.18), 1.8, pan=0.2)
    finish(m, P + 'fast', wet=0.34, room=3.0)


def arcade():
    P = 'arcade/'
    def melody(m, at, notes, kind='square', vol=0.22, pan=0.15):
        t = at
        for nm, d in notes:
            if nm:
                m.add(chip(note(nm), d * 0.9, vol, kind, duty_vib=0.0), t, pan=pan)
            t += d
        return t
    def drums(m, at, n, step):
        for i in range(n):
            m.add(lp(noise(N(0.05)), 7000) * np.exp(-t_(N(0.05)) * 60), at + i * step, gain=0.3)
    m = Mix(3.0)
    end = melody(m, 0.0, [('C5', 0.09), ('E5', 0.09), ('G5', 0.09), ('C6', 0.09), ('E6', 0.09), ('G6', 0.32), ('E6', 0.12), ('G6', 0.7)])
    melody(m, 0.0, [('C3', 0.18), ('G3', 0.18), ('C4', 0.36), ('G3', 0.12), ('C4', 0.8)], 'tri', 0.3, -0.15)
    drums(m, 0.0, 8, 0.09)
    for i in range(6):
        m.add(chip(note('B6') * (1 + i * 0.08), 0.05, 0.12), end - 0.6 + i * 0.05, pan=0.4)
    finish(m, P + 'goal', wet=0.1, room=1.2, target_db=-2.4)

    m = Mix(1.6)
    melody(m, 0.0, [('B5', 0.07), ('E6', 0.6)])
    finish(m, P + 'milestone', wet=0.1, room=1.0, target_db=-2.4)

    m = Mix(1.8)
    melody(m, 0.0, [('G5', 0.06), ('B5', 0.06), ('D6', 0.06), ('G6', 0.06), ('B6', 0.06), ('D7', 0.4)], 'tri', 0.3)
    finish(m, P + 'water', wet=0.12, room=1.2, target_db=-2.4)

    m = Mix(3.8)
    end = melody(m, 0.0, [('G4', 0.1), ('C5', 0.1), ('E5', 0.1), ('G5', 0.1), ('C6', 0.1), ('E6', 0.1), ('G6', 0.35), ('E6', 0.12), ('C6', 0.12), ('D6', 0.12), ('G6', 0.9)])
    melody(m, 0.0, [('C3', 0.2), ('E3', 0.2), ('G3', 0.2), ('C4', 0.45), ('G3', 0.36), ('C4', 1.0)], 'tri', 0.3, -0.15)
    drums(m, 0.0, 14, 0.1)
    finish(m, P + 'plan', wet=0.1, room=1.2, target_db=-2.4)

    m = Mix(2.8)
    melody(m, 0.0, [('E5', 0.08), ('G5', 0.08), ('E6', 0.08), ('C6', 0.08), ('D6', 0.08), ('G6', 0.7)])
    melody(m, 0.0, [('C4', 0.16), ('G3', 0.16), ('C4', 0.8)], 'tri', 0.3, -0.15)
    drums(m, 0.0, 6, 0.08)
    finish(m, P + 'workout', wet=0.1, room=1.2, target_db=-2.4)

    m = Mix(2.6)
    melody(m, 0.0, [('A5', 0.16), ('E5', 0.16), ('A5', 0.16), ('C6', 0.16), ('E6', 0.9)], 'tri', 0.3)
    finish(m, P + 'fast', wet=0.14, room=1.4, target_db=-2.4)


def zen():
    P = 'zen/'
    def marimba(f, dur=1.2, vol=1.0):
        n = N(dur); t = t_(n)
        return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 8)) * env_perc(n, 0.002, 4.5) * vol
    def chimes(m, at, n=7, vol=0.12):
        for i in range(n):
            f = note(['E6', 'G6', 'A6', 'B6', 'D7', 'E7', 'G7'][i % 7])
            m.add(bell(f, 2.0, vol * rng.uniform(0.6, 1), ratio=2.76, index=0.6), at + i * rng.uniform(0.07, 0.16), pan=rng.uniform(-0.7, 0.7))
    m = Mix(4.4)
    m.add(bowl(note('A3'), 4.0, 0.5), 0.0, pan=-0.2)
    for i, nm in enumerate(['A4', 'C#5', 'E5', 'A5', 'B5', 'C#6']):
        m.add(marimba(note(nm), 1.4, 0.4), 0.3 + i * 0.13, pan=-0.5 + i * 0.2)
    chord(m, ['A3', 'E4', 'C#5'], 0.2, 3.4, strings, 0.08)
    chimes(m, 1.2)
    finish(m, P + 'goal', wet=0.38, room=3.2, target_db=-2.4, loud=-12.5)

    m = Mix(2.6)
    m.add(bowl(note('E4'), 2.4, 0.45), 0.0)
    for i, nm in enumerate(['E5', 'G#5', 'B5']):
        m.add(marimba(note(nm), 1.2, 0.36), 0.1 + i * 0.12, pan=-0.3 + i * 0.3)
    finish(m, P + 'milestone', wet=0.38, room=3.0, target_db=-2.4, loud=-13)

    m = Mix(2.6)
    for i in range(5):
        n = N(0.16); tt = t_(n)
        f = 600 + i * 120
        m.add(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * tt / 0.16)) / SR) * env_perc(n, 0.005, 18), i * 0.09, pan=-0.4 + i * 0.2, gain=0.32)
    chimes(m, 0.5, 6, 0.1)
    finish(m, P + 'water', wet=0.4, room=3.0, target_db=-2.4, loud=-13)

    m = Mix(5.0)
    m.add(bowl(note('D3'), 4.6, 0.55), 0.0, pan=-0.2); m.add(bowl(note('A3'), 4.0, 0.35), 0.8, pan=0.3)
    for i, nm in enumerate(['D5', 'F#5', 'A5', 'D6', 'E6', 'F#6', 'A6']):
        m.add(marimba(note(nm), 1.4, 0.36), 0.3 + i * 0.14, pan=-0.6 + i * 0.2)
    chord(m, ['D3', 'A3', 'F#4', 'D5'], 0.3, 4.2, strings, 0.08)
    chimes(m, 1.6, 9)
    finish(m, P + 'plan', wet=0.4, room=3.4, target_db=-2.4, loud=-12.5)

    m = Mix(4.0)
    m.add(gong(note('G2'), 3.6, 0.34), 0.0)
    for i, nm in enumerate(['G4', 'B4', 'D5', 'G5', 'D5', 'B5', 'G5']):
        m.add(marimba(note(nm), 1.3, 0.38), 0.2 + i * 0.12, pan=-0.5 + i * 0.16)
    chimes(m, 1.1)
    finish(m, P + 'workout', wet=0.38, room=3.2, target_db=-2.4, loud=-12.5)

    m = Mix(4.4)
    m.add(bowl(note('F3'), 4.2, 0.4), 0.0)
    m.add(bowl(note('C4'), 3.6, 0.3), 0.6, pan=0.3)
    chord(m, ['F3', 'C4', 'A4'], 0.3, 3.8, strings, 0.08)
    chimes(m, 1.4, 7, 0.12)
    finish(m, P + 'fast', wet=0.42, room=3.6, target_db=-2.4, loud=-13)


if __name__ == '__main__':
    for fn in (champion, epic, neon, royal, arcade, zen):
        fn()
        print('rendered', fn.__name__)
