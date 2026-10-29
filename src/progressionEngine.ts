import type { AppData, RankId } from './types.ts';
import { ACHIEVEMENTS, RANK_CONFIG, RANK_ORDER, TITLES } from './progressionConfig.ts';

export type ProgressionEvents = { achievementIds: string[]; titleIds: string[]; rankUps: RankId[] };
export type ProgressionResult = { data: AppData; events: ProgressionEvents };

export function progressionMetrics(data: AppData) {
  const completed = data.missions.filter(mission => mission.status === 'complete');
  return {
    quests: completed.length,
    streak: Math.max(data.elite.currentStreak, data.elite.longestStreak),
    dungeons: data.dungeons.runs.filter(run => Boolean(run.completedAt)).length,
    ranks: Math.max(0, data.progression.rankHistory.length - 1),
    rareSpecials: completed.filter(mission => mission.period === 'special' && ['RARE', 'EPIC'].includes(mission.specialRarity ?? '')).length,
    japanese: completed.filter(mission => mission.category === 'JAPANESE' || mission.categoryGoal === 'JAPANESE').length,
    study: completed.filter(mission => mission.category === 'INTELLIGENCE').length,
    fitness: completed.filter(mission => ['STRENGTH', 'VITALITY', 'AGILITY'].includes(mission.category)).length,
  };
}

function addXp(data: AppData, amount: number, transactionId: string, source: string, now: number): AppData {
  if (data.progression.rewardTransactions.includes(transactionId)) return data;
  let totalXp = data.profile.totalXp + amount;
  let level = data.profile.level;
  const costForLevel = (current: number) => 100 + (current - 1) * 50;
  while (totalXp >= costForLevel(level)) { totalXp -= costForLevel(level); level += 1; }
  return {
    ...data,
    profile: { ...data.profile, totalXp: data.profile.totalXp + amount, level },
    xpLog: [{ id: transactionId, source, amount, timestamp: now }, ...data.xpLog],
    progression: { ...data.progression, rewardTransactions: [...data.progression.rewardTransactions, transactionId] },
  };
}

function unlockAchievements(data: AppData, now: number, events: ProgressionEvents): AppData {
  const metrics = progressionMetrics(data);
  const unlocked = new Set(data.progression.achievements.map(record => record.id));
  const progress = Object.fromEntries(ACHIEVEMENTS.map(item => [item.id, Math.min(item.target, metrics[item.metric])]));
  let next: AppData = { ...data, progression: { ...data.progression, achievementProgress: { ...data.progression.achievementProgress, ...progress } } };
  for (const achievement of ACHIEVEMENTS) {
    if (metrics[achievement.metric] < achievement.target || unlocked.has(achievement.id)) continue;
    next = { ...next, progression: { ...next.progression, achievements: [...next.progression.achievements, { id: achievement.id, unlockedAt: now }] } };
    next = addXp(next, achievement.rewardXp, `achievement:${achievement.id}`, achievement.name, now);
    events.achievementIds.push(achievement.id);
    unlocked.add(achievement.id);
  }
  return next;
}

function canAdvance(data: AppData, nextRank: RankId): boolean {
  const requirement = RANK_CONFIG[data.progression.rank].next;
  if (!requirement || RANK_ORDER.indexOf(nextRank) !== RANK_ORDER.indexOf(data.progression.rank) + 1) return false;
  const metrics = progressionMetrics(data);
  return data.profile.level >= requirement.level && metrics.quests >= requirement.quests && metrics.dungeons >= requirement.dungeons && data.progression.achievements.length >= requirement.achievements;
}

function advanceRanks(data: AppData, now: number, events: ProgressionEvents): AppData {
  let next = data;
  while (true) {
    const rankIndex = RANK_ORDER.indexOf(next.progression.rank);
    const nextRank = RANK_ORDER[rankIndex + 1];
    if (!nextRank || !canAdvance(next, nextRank)) return next;
    const previous = next.progression.rank;
    next = {
      ...next,
      progression: { ...next.progression, rank: nextRank, rankHistory: [...next.progression.rankHistory, { rank: nextRank, earnedAt: now, reason: `Requirements cleared from ${previous}-Rank` }] },
      activityLog: [{ id: `rank:${nextRank}:${now}`, kind: 'rank-up', title: `${nextRank === 'NATIONAL' ? 'National Level' : `${nextRank}-Rank`} earned`, detail: `Rank requirements cleared from ${previous}-Rank.`, timestamp: now }, ...next.activityLog],
    };
    events.rankUps.push(nextRank);
    next = unlockAchievements(next, now, events);
  }
}

function unlockTitles(data: AppData, now: number, events: ProgressionEvents): AppData {
  const metrics = progressionMetrics(data);
  const earned = new Set(data.progression.titles.map(record => record.id));
  let next = data;
  for (const title of TITLES) {
    if (earned.has(title.id)) continue;
    const unlocked = title.condition.metric === 'shop-title'
      ? next.inventory.some(item => item.itemId === title.condition.target) || next.shopHistory.some(entry => entry.itemId === title.condition.target && entry.kind === 'purchase')
      : title.condition.metric === 'rank'
      ? RANK_ORDER.indexOf(next.progression.rank) >= RANK_ORDER.indexOf(title.condition.target as RankId)
      : title.id === 'awakening'
        ? Boolean(next.profile.setupComplete)
        : metrics[title.condition.metric] >= Number(title.condition.target);
    if (!unlocked) continue;
    next = { ...next, profile: title.id === 'awakening' && next.progression.equippedTitleId === 'awakening' ? { ...next.profile, title: title.name } : next.profile, progression: { ...next.progression, titles: [...next.progression.titles, { id: title.id, unlockedAt: now }] }, unlockedTitles: [...new Set([...next.unlockedTitles, title.name])] };
    events.titleIds.push(title.id);
    earned.add(title.id);
  }
  return next;
}

export function evaluateProgression(data: AppData, now = Date.now()): ProgressionResult {
  const events: ProgressionEvents = { achievementIds: [], titleIds: [], rankUps: [] };
  let next = unlockAchievements(data, now, events);
  next = advanceRanks(next, now, events);
  next = unlockAchievements(next, now, events);
  next = unlockTitles(next, now, events);
  return { data: next, events };
}

export function equipTitle(data: AppData, titleId: string): AppData {
  const title = TITLES.find(item => item.id === titleId);
  if (!title || !data.progression.titles.some(item => item.id === titleId)) return data;
  return { ...data, profile: { ...data.profile, title: title.name }, progression: { ...data.progression, equippedTitleId: titleId } };
}
