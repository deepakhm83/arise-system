import test from 'node:test';
import assert from 'node:assert/strict';
import { playSystemSound, primeSystemAudio, scaledPeak, shouldPlayClick, shouldPlaySound, soundEvents } from '../src/sound.ts';

test('sound controls respect off state and the configured volume', () => {
  assert.equal(shouldPlaySound({ sound: false, volume: 1 }), false);
  assert.equal(shouldPlaySound({ sound: true, volume: 0 }), false);
  assert.equal(shouldPlaySound({ sound: true, volume: 0.6 }), true);
  assert.equal(shouldPlayClick({ sound: false, volume: 0.6 }), true);
  assert.equal(shouldPlayClick({ sound: false, clickFeedback: false, volume: 0.6 }), false);
  assert.equal(shouldPlayClick({ sound: true, volume: 0 }), false);
  assert.ok(scaledPeak(0.5, 0.4) < scaledPeak(1, 0.4));
  assert.equal(scaledPeak(0, 0.4), 0.0001);
});

test('audio cue library covers app and future encounter event names', () => {
  for (const event of ['quest-available', 'deadline-warning', 'daily-quest-generated', 'mission-accepted', 'mission-complete', 'quest-failed', 'recovery', 'xp-gained', 'level-up', 'rare-reward', 'gold-earned', 'purchase-success', 'purchase-rejected', 'item-used', 'rare-item', 'dungeon-entry', 'boss-encounter', 'class-advancement', 'major-event']) assert.ok(soundEvents.includes(event), event);
});

test('sounds wait for a gesture, respect the master toggle, and fail safely when iOS suspends audio', async () => {
  let created = 0; let started = 0; let audioInstance;
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {} });
  class FakeAudioContext {
    constructor() { created++; this.state = 'running'; this.currentTime = 1; this.destination = node(); audioInstance = this; }
    createDelay() { const value = node(); value.delayTime = { value: 0 }; return value; }
    createGain() { const value = node(); value.gain = param(); return value; }
    createOscillator() { const value = node(); value.frequency = param(); value.start = () => { started++; }; value.stop = () => {}; return value; }
    createBiquadFilter() { const value = node(); value.frequency = param(); value.Q = { value: 0 }; return value; }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  globalThis.window = { AudioContext: FakeAudioContext, setTimeout: () => 0 };
  playSystemSound('notification', { sound: true, volume: 1 });
  assert.equal(created, 0);
  primeSystemAudio({ sound: false, volume: 1 });
  assert.equal(created, 0);
  primeSystemAudio({ sound: true, volume: 0.5 });
  playSystemSound('mission-complete', { sound: true, volume: 0.5 });
  assert.equal(created, 1);
  assert.equal(started, 3);
  playSystemSound('notification', { sound: false, volume: 1 });
  assert.equal(started, 3);
  audioInstance.state = 'suspended'; audioInstance.resume = () => Promise.reject(new Error('iOS audio is blocked'));
  primeSystemAudio({ sound: true, volume: 1 });
  playSystemSound('notification', { sound: true, volume: 1 });
  await Promise.resolve();
  assert.equal(started, 3);
});
