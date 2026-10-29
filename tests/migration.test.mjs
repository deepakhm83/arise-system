import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradeData } from '../src/db.ts';

test('older saved data keeps existing progression and settings while receiving safe module defaults', () => {
  const legacy = {
    profile: { name: 'Hunter', title: 'Awakening', level: 4, totalXp: 425, joinedAt: 1234 },
    missions: [{ id: 'saved-quest', title: 'Study', category: 'MIND', difficulty: 'NORMAL', xp: 30, status: 'complete', completedAt: 900, createdAt: 800 }],
    xpLog: [{ id: 'xp-old', source: 'Saved quest', amount: 30, timestamp: 900 }],
    goldLog: [{ id: 'gold-old', source: 'Saved quest', amount: 6, timestamp: 900 }],
    wallet: { gold: 27 }, preferences: { categories: ['INTELLIGENCE'], availableMinutes: 30, difficulty: 'HARD', maxDailyQuests: 2, rerollDate: '2026-10-28', rerollsUsed: 1 },
    elite: { enabled: true, currentStreak: 4, longestStreak: 8, restDays: ['2026-10-28'] }, settings: { sound: false, volume: .3 },
  };
  const data = upgradeData(legacy);
  assert.equal(data.profile.name, 'Hunter');
  assert.equal(data.profile.totalXp, 425);
  assert.equal(data.profile.level, 4);
  assert.equal(data.missions[0].status, 'complete');
  assert.equal(data.missions[0].category, 'INTELLIGENCE');
  assert.equal(data.wallet.gold, 27);
  assert.equal(data.settings.sound, false);
  assert.equal(data.settings.clickFeedback, true);
  assert.equal(data.settings.volume, .3);
  assert.equal(data.elite.longestStreak, 8);
  assert.equal(data.progression.rank, 'E');
  assert.deepEqual(data.progression.achievements, []);
  assert.deepEqual(data.dungeons.completedIds, []);
  assert.ok(data.specialQuests.nextRandomAt > Date.now());
  const explicitlyMuted = upgradeData({ ...legacy, settings: { sound: false, clickFeedback: false, volume: .3 } });
  assert.equal(explicitlyMuted.settings.sound, false);
  assert.equal(explicitlyMuted.settings.clickFeedback, false);
});
