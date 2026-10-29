import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLocalDays, awardMissionCompletion, checklistSatisfied, dayDifference, elapsedTimerMs,
  generateDailyQuests, localDateKey, recordDailyStreak, updateDeadlineStatuses,
  validateResult,
} from '../src/questEngine.ts';

function appData(overrides = {}) {
  return {
    profile: { name: 'TEST', title: 'Awakening', level: 1, totalXp: 0, joinedAt: 0 },
    missions: [], xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 0 }, inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: ['Awakening'],
    preferences: { categories: ['INTELLIGENCE', 'STRENGTH', 'VITALITY', 'AGILITY', 'DISCIPLINE', 'PERSONAL DEVELOPMENT'], availableMinutes: 60, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0 },
    elite: { enabled: true, currentStreak: 0, longestStreak: 0, restDays: [] },
    settings: { sound: false, volume: 0.5 }, updatedAt: 0,
    ...overrides,
  };
}

test('daily quest generation is bounded, local-date keyed, and idempotent', () => {
  const now = new Date(2026, 9, 29, 10, 0);
  const first = generateDailyQuests(appData(), now);
  assert.equal(first.generated, 3);
  assert.ok(first.data.missions.every(m => m.status === 'offered' && m.generatedDate === localDateKey(now)));
  const second = generateDailyQuests(first.data, now);
  assert.equal(second.generated, 0);
  assert.equal(second.data.missions.length, 3);
});

test('expired quests become overdue and are never auto-failed', () => {
  const data = appData({ missions: [
    { id: 'a', status: 'active', dueAt: 100, timerRunning: true },
    { id: 'b', status: 'offered', dueAt: 100 },
    { id: 'c', status: 'complete', dueAt: 100 },
  ] });
  const updated = updateDeadlineStatuses(data, 101);
  assert.equal(updated.missions[0].status, 'overdue');
  assert.equal(updated.missions[0].timerRunning, false);
  assert.equal(updated.missions[1].status, 'offered');
  assert.equal(updated.missions[2].status, 'complete');
});

test('verification helpers reject invalid results and enforce required checklist steps', () => {
  const mission = { minimumResult: 5, checklistRequired: 2, checklistDone: ['a'], checklist: ['a', 'b', 'c'] };
  assert.equal(validateResult(mission, 4), false);
  assert.equal(validateResult(mission, 5), true);
  assert.equal(validateResult(mission, Number.NaN), false);
  assert.equal(checklistSatisfied(mission), false);
  assert.equal(checklistSatisfied({ ...mission, checklistDone: ['a', 'b'] }), true);
});

test('timer elapsed time includes only the running interval', () => {
  assert.equal(elapsedTimerMs({ elapsedMs: 5000, timerRunning: true, timerStartedAt: 1000 }, 4000), 8000);
  assert.equal(elapsedTimerMs({ elapsedMs: 5000, timerRunning: false, timerStartedAt: 1000 }, 4000), 5000);
});

test('quest completion awards XP and Gold once and a second settlement is idempotent', () => {
  const data = appData({ missions: [{ id: 'clear-once', title: 'Read', status: 'active', xp: 25, gold: 5 }] });
  const first = awardMissionCompletion(data, 'clear-once', 1000);
  assert.equal(first.applied, true);
  assert.equal(first.data.profile.totalXp, 25);
  assert.equal(first.data.wallet.gold, 5);
  assert.equal(first.data.xpLog.length, 1);
  assert.equal(first.data.goldLog.length, 1);
  assert.equal(first.data.missions[0].status, 'complete');
  const duplicate = awardMissionCompletion(first.data, 'clear-once', 1001);
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.data.profile.totalXp, 25);
  assert.equal(duplicate.data.wallet.gold, 5);
  assert.equal(duplicate.data.goldLog.length, 1);
});

test('quest completion applies active XP and Gold boosters only to this limited completion', () => {
  const data = appData({
    missions: [{ id: 'boosted', title: 'Practice', status: 'active', xp: 20, gold: 8 }],
    activeBoosts: [
      { id: 'xp', kind: 'xp', multiplier: 1.25, remainingCompletions: 3, itemId: 'xp-booster' },
      { id: 'gold', kind: 'gold', multiplier: 1.25, remainingCompletions: 3, itemId: 'gold-booster' },
    ],
  });
  const settled = awardMissionCompletion(data, 'boosted', 1200);
  assert.equal(settled.xp, 25);
  assert.equal(settled.gold, 10);
  assert.equal(settled.data.wallet.gold, 10);
  assert.deepEqual(settled.data.activeBoosts.map(boost => boost.remainingCompletions), [2, 2]);
});

test('rest days protect Elite streak gaps and local calendar arithmetic', () => {
  assert.equal(dayDifference('2026-10-29', '2026-11-01'), 3);
  assert.equal(addLocalDays('2026-10-31', 1), '2026-11-01');
  const elite = { enabled: true, currentStreak: 4, longestStreak: 4, lastStreakDate: '2026-10-29', restDays: ['2026-10-30', '2026-10-31'] };
  const next = recordDailyStreak(elite, '2026-11-01');
  assert.equal(next.currentStreak, 5);
  assert.equal(next.longestStreak, 5);
});
