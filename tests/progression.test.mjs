import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProgression, equipTitle } from '../src/progressionEngine.ts';

function appData(overrides = {}) {
  return {
    profile: { name: 'TEST', title: 'Awakening', level: 1, totalXp: 0, joinedAt: 0, setupComplete: true },
    missions: [], xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 0 }, inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: ['Awakening'],
    preferences: { categories: ['INTELLIGENCE', 'JAPANESE'], availableMinutes: 60, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0, interests: [] },
    elite: { enabled: true, currentStreak: 0, longestStreak: 0, restDays: [] }, settings: { sound: true, volume: .5 }, updatedAt: 0,
    progression: { rank: 'E', rankHistory: [{ rank: 'E', earnedAt: 0, reason: 'Start' }], achievements: [], achievementProgress: {}, titles: [], equippedTitleId: 'awakening', rewardTransactions: [] },
    specialQuests: { nextRandomAt: 90000, offerHistory: [], processedMilestones: [] }, dungeons: { runs: [], completedIds: [] },
    ...overrides,
  };
}
const done = (id, category = 'INTELLIGENCE', extra = {}) => ({ id, title: id, category, status: 'complete', completedAt: 1, period: 'one-time', ...extra });

test('achievement progress unlocks once and its XP reward transaction is idempotent', () => {
  const data = appData({ missions: [done('one')] });
  const first = evaluateProgression(data, 100);
  assert.ok(first.events.achievementIds.includes('first-quest'));
  assert.equal(first.data.profile.totalXp, 10);
  const second = evaluateProgression(first.data, 200);
  assert.equal(second.events.achievementIds.length, 0);
  assert.equal(second.data.profile.totalXp, 10);
  assert.equal(second.data.progression.rewardTransactions.filter(id => id === 'achievement:first-quest').length, 1);
});

test('rank advancement follows configured criteria and writes a permanent rank record', () => {
  const data = appData({
    profile: { name: 'TEST', title: 'Awakening', level: 3, totalXp: 250, joinedAt: 0, setupComplete: true },
    missions: Array.from({ length: 5 }, (_, index) => done(`q${index}`)),
  });
  const result = evaluateProgression(data, 500);
  assert.equal(result.data.progression.rank, 'D');
  assert.equal(result.data.progression.rankHistory.at(-1).rank, 'D');
  assert.deepEqual(result.events.rankUps, ['D']);
  assert.ok(result.events.achievementIds.includes('first-rank-up'));
  assert.equal(evaluateProgression(result.data, 600).events.rankUps.length, 0);
});

test('titles have explicit unlock conditions and only earned titles can be equipped', () => {
  const locked = appData();
  assert.equal(equipTitle(locked, 'iron-will').progression.equippedTitleId, 'awakening');
  const earned = evaluateProgression({ ...locked, missions: Array.from({ length: 10 }, (_, index) => done(`q${index}`)) }, 1000).data;
  assert.ok(earned.progression.titles.some(record => record.id === 'iron-will'));
  assert.equal(equipTitle(earned, 'iron-will').profile.title, 'Iron Will');
});

test('Japanese, dungeon, and rare special achievements read their real completion records', () => {
  const data = appData({ missions: [
    done('jp-1', 'JAPANESE', { period: 'daily' }),
    done('rare-1', 'INTELLIGENCE', { period: 'special', specialRarity: 'RARE' }),
  ], dungeons: { runs: [{ dungeonId: 'language-gate', startedAt: 1, completedAt: 2, currentStage: 3, stages: [] }], completedIds: ['language-gate'] } });
  const result = evaluateProgression(data, 2000);
  assert.ok(result.events.achievementIds.includes('first-dungeon'));
  assert.ok(result.events.achievementIds.includes('rare-special-clear'));
  assert.equal(result.data.progression.achievementProgress['japanese-milestone'], 1);
});

test('seven-day achievement uses the saved longest fair streak and remains permanently unlocked', () => {
  const data = appData({ elite: { enabled: true, currentStreak: 0, longestStreak: 7, restDays: [] } });
  const first = evaluateProgression(data, 100);
  assert.ok(first.data.progression.achievements.some(record => record.id === 'quest-streak-7'));
  const later = evaluateProgression({ ...first.data, elite: { ...first.data.elite, currentStreak: 0, longestStreak: 7 } }, 200);
  assert.ok(later.data.progression.achievements.some(record => record.id === 'quest-streak-7'));
});
