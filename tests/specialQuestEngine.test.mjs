import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, offerSpecialQuest, weightedPick } from '../src/specialQuestEngine.ts';

function appData(overrides = {}) {
  return {
    profile: { name: 'TEST', title: 'Awakening', level: 2, totalXp: 100, joinedAt: 7 },
    missions: [], xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 0 }, inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: [],
    preferences: { categories: ['INTELLIGENCE', 'JAPANESE', 'AGILITY', 'PERSONAL DEVELOPMENT'], availableMinutes: 60, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0, interests: [] },
    elite: { enabled: true, currentStreak: 0, longestStreak: 0, restDays: [] }, settings: { sound: true, volume: .5 }, updatedAt: 0,
    progression: { rank: 'E', rankHistory: [{ rank: 'E', earnedAt: 0, reason: 'Start' }], achievements: [], achievementProgress: {}, titles: [], equippedTitleId: 'awakening', rewardTransactions: [] },
    specialQuests: { nextRandomAt: 1000, offerHistory: [], processedMilestones: [] }, dungeons: { runs: [], completedIds: [] },
    ...overrides,
  };
}

test('weighted selection is reproducible with a seeded random generator', () => {
  const pool = [{ id: 'common', weight: 64 }, { id: 'rare', weight: 9 }, { id: 'epic', weight: 2 }];
  const sample = seed => { const random = createSeededRng(seed); return Array.from({ length: 20 }, () => weightedPick(pool, item => item.weight, random).id); };
  assert.deepEqual(sample(42), sample(42));
  assert.notDeepEqual(sample(42), sample(43));
  assert.equal(weightedPick([], () => 1, () => .5), undefined);
  assert.equal(weightedPick(pool, item => item.weight, () => 0).id, 'common');
  assert.equal(weightedPick(pool, item => item.weight, () => .999999).id, 'epic');
});

test('random offers respect cooldown, active quest limits, and persist the next eligible time', () => {
  const data = appData({ specialQuests: { nextRandomAt: 2000, offerHistory: [], processedMilestones: [] } });
  assert.equal(offerSpecialQuest(data, 1999, () => 0).offered, undefined);
  const result = offerSpecialQuest(data, 2000, () => 0);
  assert.ok(result.offered);
  assert.equal(result.data.specialQuests.nextRandomAt, 2000 + 24 * 60 * 60 * 1000);
  assert.equal(result.data.specialQuests.offerHistory.length, 1);
  assert.equal(offerSpecialQuest(result.data, result.data.specialQuests.nextRandomAt - 1, () => 0).offered, undefined);
});

test('milestone offers process once and declining does not re-offer or erase progression', () => {
  const data = appData({ progression: { rank: 'E', rankHistory: [{ rank: 'E', earnedAt: 0, reason: 'Start' }], achievements: [{ id: 'first-quest', unlockedAt: 1 }], achievementProgress: {}, titles: [], equippedTitleId: 'awakening', rewardTransactions: [] } });
  const first = offerSpecialQuest(data, 100, () => 0);
  assert.equal(first.offered.specialKind, 'milestone');
  assert.ok(first.data.specialQuests.processedMilestones.includes('first-quest-rift'));
  const declined = { ...first.data, missions: first.data.missions.map(mission => ({ ...mission, status: 'declined' })) };
  const later = offerSpecialQuest(declined, 100 + 7 * 24 * 60 * 60 * 1000, () => 0);
  assert.notEqual(later.offered?.templateId, 'circuit-rift');
  assert.ok(later.data.progression.achievements.some(record => record.id === 'first-quest'));
});

test('personalization filters quests by interests, available time, and recent physical activity', () => {
  const data = appData({ preferences: { categories: ['INTELLIGENCE'], availableMinutes: 10, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0, interests: ['JAPANESE'] } });
  const result = offerSpecialQuest({ ...data, specialQuests: { nextRandomAt: 10, offerHistory: [], processedMilestones: [] } }, 10, () => 0);
  assert.equal(result.offered, undefined);
});

test('special selection respects the concurrent mission cap', () => {
  const missions = Array.from({ length: 5 }, (_, index) => ({ id: `active-${index}`, status: 'active' }));
  const data = appData({ missions });
  assert.equal(offerSpecialQuest(data, 1000, () => 0).offered, undefined);
});
