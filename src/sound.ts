export type SoundEvent =
  | 'ui-click' | 'notification' | 'quest-available' | 'deadline-warning' | 'urgent-quest'
  | 'mission-accepted' | 'mission-complete' | 'daily-quest-generated' | 'quest-failed' | 'recovery'
  | 'xp-gained' | 'level-up' | 'rank-up' | 'achievement' | 'skill-unlocked' | 'rare-reward'
  | 'gold-earned' | 'purchase-success' | 'purchase-rejected' | 'item-used' | 'rare-item'
  | 'special-quest' | 'dungeon-entry' | 'dungeon-clear' | 'boss-encounter' | 'class-advancement' | 'major-event' | 'streak-milestone';
export type SoundSettings = { sound: boolean; clickFeedback?: boolean; volume: number };
export const soundEvents: SoundEvent[] = [
  'ui-click', 'notification', 'quest-available', 'deadline-warning', 'urgent-quest', 'mission-accepted', 'mission-complete',
  'daily-quest-generated', 'quest-failed', 'recovery', 'xp-gained', 'level-up', 'rank-up', 'achievement',
  'skill-unlocked', 'rare-reward', 'gold-earned', 'purchase-success', 'purchase-rejected', 'item-used',
  'rare-item', 'special-quest', 'dungeon-entry', 'dungeon-clear', 'boss-encounter', 'class-advancement', 'major-event', 'streak-milestone',
];
type Note = { hz: number; endHz?: number; at: number; duration: number; wave: OscillatorType; peak: number };
const cues: Record<SoundEvent, Note[]> = {
  'ui-click': [{ hz: 880, at: 0, duration: .055, wave: 'sine', peak: .3 }],
  notification: [{ hz: 540, at: 0, duration: .14, wave: 'sine', peak: .35 }],
  'quest-available': [{ hz: 392, endHz: 523, at: 0, duration: .23, wave: 'triangle', peak: .5 }, { hz: 784, at: .12, duration: .26, wave: 'sine', peak: .25 }],
  'deadline-warning': [{ hz: 620, endHz: 470, at: 0, duration: .24, wave: 'triangle', peak: .4 }, { hz: 620, endHz: 470, at: .3, duration: .24, wave: 'triangle', peak: .4 }],
  'urgent-quest': [{ hz: 220, endHz: 440, at: 0, duration: .42, wave: 'sawtooth', peak: .32 }, { hz: 880, at: .32, duration: .22, wave: 'sine', peak: .3 }],
  'mission-accepted': [{ hz: 330, endHz: 440, at: 0, duration: .18, wave: 'triangle', peak: .35 }, { hz: 523, at: .12, duration: .2, wave: 'sine', peak: .34 }],
  'mission-complete': [{ hz: 392, at: 0, duration: .3, wave: 'sine', peak: .38 }, { hz: 587, at: .1, duration: .34, wave: 'triangle', peak: .38 }, { hz: 784, at: .22, duration: .46, wave: 'sine', peak: .42 }],
  'daily-quest-generated': [{ hz: 262, endHz: 392, at: 0, duration: .36, wave: 'triangle', peak: .32 }, { hz: 523, at: .2, duration: .34, wave: 'sine', peak: .28 }],
  'quest-failed': [{ hz: 294, endHz: 196, at: 0, duration: .34, wave: 'triangle', peak: .38 }, { hz: 147, at: .2, duration: .3, wave: 'sine', peak: .34 }],
  recovery: [{ hz: 220, endHz: 330, at: 0, duration: .34, wave: 'sine', peak: .3 }, { hz: 440, at: .19, duration: .4, wave: 'triangle', peak: .4 }],
  'xp-gained': [{ hz: 659, at: 0, duration: .11, wave: 'sine', peak: .2 }, { hz: 880, at: .09, duration: .17, wave: 'triangle', peak: .24 }],
  'level-up': [{ hz: 196, endHz: 392, at: 0, duration: .5, wave: 'triangle', peak: .38 }, { hz: 523, at: .24, duration: .52, wave: 'sine', peak: .45 }, { hz: 784, at: .46, duration: .68, wave: 'triangle', peak: .48 }],
  'rank-up': [{ hz: 146, endHz: 293, at: 0, duration: .62, wave: 'sawtooth', peak: .35 }, { hz: 440, at: .24, duration: .6, wave: 'triangle', peak: .42 }, { hz: 587, at: .48, duration: .8, wave: 'sine', peak: .45 }],
  achievement: [{ hz: 440, at: 0, duration: .18, wave: 'triangle', peak: .3 }, { hz: 554, at: .12, duration: .2, wave: 'sine', peak: .34 }, { hz: 740, at: .25, duration: .4, wave: 'sine', peak: .38 }],
  'skill-unlocked': [{ hz: 220, endHz: 440, at: 0, duration: .46, wave: 'sine', peak: .35 }, { hz: 660, at: .22, duration: .48, wave: 'triangle', peak: .42 }, { hz: 990, at: .43, duration: .58, wave: 'sine', peak: .35 }],
  'rare-reward': [{ hz: 174, endHz: 349, at: 0, duration: .58, wave: 'triangle', peak: .36 }, { hz: 523, at: .24, duration: .6, wave: 'sine', peak: .4 }, { hz: 784, at: .48, duration: .8, wave: 'triangle', peak: .48 }],
  'gold-earned': [{ hz: 740, at: 0, duration: .12, wave: 'sine', peak: .25 }, { hz: 988, at: .1, duration: .21, wave: 'triangle', peak: .28 }],
  'purchase-success': [{ hz: 392, at: 0, duration: .14, wave: 'triangle', peak: .3 }, { hz: 587, at: .11, duration: .25, wave: 'sine', peak: .36 }],
  'purchase-rejected': [{ hz: 247, endHz: 196, at: 0, duration: .27, wave: 'triangle', peak: .32 }],
  'item-used': [{ hz: 330, endHz: 494, at: 0, duration: .28, wave: 'sine', peak: .3 }, { hz: 659, at: .19, duration: .32, wave: 'triangle', peak: .28 }],
  'rare-item': [{ hz: 130, endHz: 261, at: 0, duration: .65, wave: 'triangle', peak: .38 }, { hz: 392, at: .25, duration: .64, wave: 'sine', peak: .43 }, { hz: 784, at: .5, duration: .85, wave: 'triangle', peak: .48 }],
  'special-quest': [{ hz: 164, endHz: 330, at: 0, duration: .46, wave: 'sawtooth', peak: .3 }, { hz: 494, at: .22, duration: .45, wave: 'sine', peak: .35 }],
  'dungeon-entry': [{ hz: 82, endHz: 164, at: 0, duration: .74, wave: 'sawtooth', peak: .28 }, { hz: 246, at: .32, duration: .68, wave: 'triangle', peak: .3 }],
  'dungeon-clear': [{ hz: 196, endHz: 392, at: 0, duration: .38, wave: 'triangle', peak: .4 }, { hz: 523, at: .18, duration: .42, wave: 'sine', peak: .42 }, { hz: 784, at: .38, duration: .6, wave: 'triangle', peak: .45 }],
  'boss-encounter': [{ hz: 55, endHz: 110, at: 0, duration: .86, wave: 'sawtooth', peak: .3 }, { hz: 165, endHz: 82, at: .25, duration: .72, wave: 'triangle', peak: .3 }, { hz: 330, at: .7, duration: .52, wave: 'sine', peak: .32 }],
  'class-advancement': [{ hz: 110, endHz: 220, at: 0, duration: .66, wave: 'triangle', peak: .34 }, { hz: 330, at: .28, duration: .58, wave: 'sine', peak: .4 }, { hz: 660, at: .56, duration: .78, wave: 'triangle', peak: .44 }],
  'major-event': [{ hz: 73, endHz: 146, at: 0, duration: .72, wave: 'sawtooth', peak: .3 }, { hz: 220, at: .27, duration: .7, wave: 'triangle', peak: .36 }, { hz: 440, at: .54, duration: .85, wave: 'sine', peak: .42 }],
  'streak-milestone': [{ hz: 196, at: 0, duration: .35, wave: 'triangle', peak: .36 }, { hz: 392, at: .18, duration: .42, wave: 'sine', peak: .4 }, { hz: 587, at: .37, duration: .58, wave: 'triangle', peak: .46 }],
};

let context: AudioContext | undefined;
export const shouldPlaySound = (settings: SoundSettings) => settings.sound && Number.isFinite(settings.volume) && settings.volume > 0;
export const shouldPlayClick = (settings: SoundSettings) => settings.clickFeedback !== false && Number.isFinite(settings.volume) && settings.volume > 0;
export const scaledPeak = (volume: number, peak: number) => Math.max(.0001, Math.min(1, volume) * peak * .12);

function getContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const host = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext ?? host.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    context ??= new AudioContextClass({ latencyHint: 'interactive' });
    return context;
  } catch { return undefined; }
}

/** Call from a user gesture (pointer/touch/key); iOS Safari will otherwise suspend audio. */
export function primeSystemAudio(settings: SoundSettings): void {
  if (!shouldPlaySound(settings)) return;
  const audio = getContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => {});
}

/** Small tactile cue for every user tap, even when quest and reward sounds are disabled. */
export function playUiClick(settings: SoundSettings): void {
  if (!shouldPlayClick(settings)) return;
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') {
    void audio.resume().then(() => playCue(audio, 'ui-click', settings.volume)).catch(() => {});
    return;
  }
  playCue(audio, 'ui-click', settings.volume);
}

function playCue(audio: AudioContext, event: SoundEvent, volume: number): void {
  if (audio.state !== 'running') return;
  const start = audio.currentTime + .015;
  try {
    const delay = audio.createDelay(.4); delay.delayTime.value = .13;
    const echo = audio.createGain(); echo.gain.value = .09;
    delay.connect(echo); echo.connect(audio.destination);
    for (const note of cues[event]) {
      const oscillator = audio.createOscillator(); const envelope = audio.createGain(); const filter = audio.createBiquadFilter();
      const at = start + note.at; const peak = scaledPeak(volume, note.peak);
      oscillator.type = note.wave; oscillator.frequency.setValueAtTime(note.hz, at);
      if (note.endHz) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, note.endHz), at + note.duration);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(note.hz < 180 ? 720 : 2100, at); filter.Q.value = .7;
      envelope.gain.setValueAtTime(.0001, at); envelope.gain.exponentialRampToValueAtTime(peak, at + Math.min(.035, note.duration / 3));
      envelope.gain.exponentialRampToValueAtTime(.0001, at + note.duration);
      oscillator.connect(filter); filter.connect(envelope); envelope.connect(audio.destination); envelope.connect(delay);
      oscillator.start(at); oscillator.stop(at + note.duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
    }
    window.setTimeout(() => { delay.disconnect(); echo.disconnect(); }, 1600);
  } catch { /* Optional audio must never interrupt app actions. */ }
}

/** Plays only after the app has a gesture-unlocked audio context; never autoplays on render. */
export function playSystemSound(event: SoundEvent, settings: SoundSettings): void {
  if (!shouldPlaySound(settings)) return;
  const audio = context;
  if (!audio || audio.state !== 'running') return;
  playCue(audio, event, settings.volume);
}
