import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDungeon, DUNGEONS, startDungeon } from '../src/dungeonEngine.ts';

function appData() {
  return {
    profile: { name: 'TEST', title: 'Awakening', level: 1, totalXp: 0, joinedAt: 0 },
    missions: [], xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 0 }, inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: [],
    preferences: { categories: [], availableMinutes: 60, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0 },
    elite: { enabled: false, currentStreak: 0, longestStreak: 0, restDays: [] }, settings: { sound: false, volume: .5 }, updatedAt: 0,
    progression: { rank: 'E', rankHistory: [{ rank: 'E', earnedAt: 0, reason: 'Start' }], achievements: [], achievementProgress: {}, titles: [], equippedTitleId: 'awakening', rewardTransactions: [] },
    specialQuests: { nextRandomAt: 99999, offerHistory: [], processedMilestones: [] }, dungeons: { runs: [], completedIds: [] },
  };
}

test('dungeon stages unlock in order and the clear bonus is transaction-protected', () => {
  const dungeon = DUNGEONS[0];
  let data = startDungeon(appData(), dungeon.id, 1000).data;
  assert.equal(data.dungeons.runs[0].currentStage, 0);
  for (let stageIndex = 0; stageIndex < dungeon.stages.length; stageIndex++) {
    const missionId = data.dungeons.runs[0].stages[data.dungeons.runs[0].currentStage].missionId;
    data = { ...data, missions: data.missions.map(mission => mission.id === missionId ? { ...mission, status: 'complete' } : mission) };
    const result = advanceDungeon(data, missionId, 2000 + stageIndex);
    data = result.data;
    assert.equal(result.stageAdvanced, true);
    if (stageIndex < dungeon.stages.length - 1) assert.equal(data.dungeons.runs[0].currentStage, stageIndex + 1);
    else assert.equal(result.dungeonCleared, dungeon.title);
  }
  assert.ok(data.dungeons.completedIds.includes(dungeon.id));
  assert.equal(data.wallet.gold, 8);
  const repeated = advanceDungeon(data, data.dungeons.runs[0].stages.at(-1).missionId, 3000);
  assert.equal(repeated.stageAdvanced, false);
  assert.equal(repeated.data.wallet.gold, 8);
});

test('only one dungeon can run at a time and unknown dungeon ids do nothing', () => {
  const first = startDungeon(appData(), DUNGEONS[0].id, 1000);
  const activeMissionId = first.data.dungeons.runs[0].stages[0].missionId;
  assert.equal(advanceDungeon(first.data, activeMissionId, 1500).stageAdvanced, false);
  assert.ok(startDungeon(first.data, DUNGEONS[1].id, 2000).error);
  assert.equal(startDungeon(appData(), 'missing', 1000).error, 'DUNGEON NOT FOUND');
});
