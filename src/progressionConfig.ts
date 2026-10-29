import type { RankId } from './types.ts';

export type RankRequirement = { level: number; quests: number; dungeons: number; achievements: number };
export const RANK_ORDER: RankId[] = ['E', 'D', 'C', 'B', 'A', 'S', 'NATIONAL'];
export const RANK_CONFIG: Record<RankId, { label: string; emblem: string; next?: RankRequirement }> = {
  E: { label: 'E-RANK', emblem: '◇', next: { level: 3, quests: 5, dungeons: 0, achievements: 1 } },
  D: { label: 'D-RANK', emblem: '◈', next: { level: 6, quests: 15, dungeons: 0, achievements: 3 } },
  C: { label: 'C-RANK', emblem: '✦', next: { level: 12, quests: 40, dungeons: 1, achievements: 6 } },
  B: { label: 'B-RANK', emblem: '✧', next: { level: 20, quests: 80, dungeons: 3, achievements: 10 } },
  A: { label: 'A-RANK', emblem: '⬡', next: { level: 32, quests: 160, dungeons: 6, achievements: 7 } },
  S: { label: 'S-RANK', emblem: '✹', next: { level: 50, quests: 300, dungeons: 12, achievements: 9 } },
  NATIONAL: { label: 'NATIONAL LEVEL', emblem: '✷' },
};

export type AchievementMetric = 'quests' | 'streak' | 'dungeons' | 'ranks' | 'rareSpecials' | 'japanese' | 'study' | 'fitness';
export type AchievementDefinition = { id: string; name: string; description: string; category: string; rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'; metric: AchievementMetric; target: number; rewardXp: number };
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-quest', name: 'First Quest Completed', description: 'Complete your first quest using its configured verification.', category: 'QUESTS', rarity: 'COMMON', metric: 'quests', target: 1, rewardXp: 10 },
  { id: 'quest-streak-7', name: 'Seven-Day Quest Streak', description: 'Complete at least one daily quest on seven streak days. Rest days preserve a streak.', category: 'PROGRESSION', rarity: 'RARE', metric: 'streak', target: 7, rewardXp: 30 },
  { id: 'first-dungeon', name: 'First Dungeon Cleared', description: 'Complete every stage of a dungeon.', category: 'DUNGEONS', rarity: 'UNCOMMON', metric: 'dungeons', target: 1, rewardXp: 30 },
  { id: 'hundred-quests', name: 'Century of Clears', description: 'Complete 100 verified quests.', category: 'QUESTS', rarity: 'EPIC', metric: 'quests', target: 100, rewardXp: 100 },
  { id: 'first-rank-up', name: 'First Hunter Rank Upgrade', description: 'Earn your first rank beyond E-Rank.', category: 'PROGRESSION', rarity: 'UNCOMMON', metric: 'ranks', target: 1, rewardXp: 20 },
  { id: 'rare-special-clear', name: 'Rare Special Quest Cleared', description: 'Complete a Rare or Epic special quest.', category: 'EXPLORATION', rarity: 'RARE', metric: 'rareSpecials', target: 1, rewardXp: 35 },
  { id: 'japanese-milestone', name: 'First Japanese Learning Milestone', description: 'Complete five Japanese learning quests.', category: 'JAPANESE', rarity: 'UNCOMMON', metric: 'japanese', target: 5, rewardXp: 25 },
  { id: 'study-five', name: 'Knowledge Seeker', description: 'Complete five Intelligence study quests.', category: 'STUDY', rarity: 'COMMON', metric: 'study', target: 5, rewardXp: 20 },
  { id: 'fitness-ten', name: 'Steady Training', description: 'Complete ten Strength, Vitality, or Agility quests.', category: 'FITNESS', rarity: 'UNCOMMON', metric: 'fitness', target: 10, rewardXp: 25 },
];

export type TitleCondition = { metric: AchievementMetric | 'rank' | 'shop-title'; target: number | string };
export type TitleDefinition = { id: string; name: string; description: string; icon: string; rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'; condition: TitleCondition };
export const TITLES: TitleDefinition[] = [
  { id: 'awakening', name: 'The Awakening', description: 'Complete your Hunter registration.', icon: '✦', rarity: 'COMMON', condition: { metric: 'quests', target: 0 } },
  { id: 'iron-will', name: 'Iron Will', description: 'Complete ten quests.', icon: '⬟', rarity: 'UNCOMMON', condition: { metric: 'quests', target: 10 } },
  { id: 'knowledge-seeker', name: 'Knowledge Seeker', description: 'Complete five Intelligence study quests.', icon: '⌘', rarity: 'COMMON', condition: { metric: 'study', target: 5 } },
  { id: 'shadow-scholar', name: 'Shadow Scholar', description: 'Complete ten Japanese learning quests.', icon: '影', rarity: 'RARE', condition: { metric: 'japanese', target: 10 } },
  { id: 'monarch-resolve', name: "Monarch's Resolve", description: 'Reach S-Rank.', icon: '♛', rarity: 'LEGENDARY', condition: { metric: 'rank', target: 'S' } },
  { id: 'dungeon-breaker', name: 'Dungeon Breaker', description: 'Clear a dungeon.', icon: '⚔', rarity: 'RARE', condition: { metric: 'dungeons', target: 1 } },
  { id: 'rising-hunter', name: 'Rising Hunter', description: 'Earn D-Rank.', icon: '⬡', rarity: 'UNCOMMON', condition: { metric: 'rank', target: 'D' } },
  { id: 'shadow-regent', name: 'Shadow Regent', description: 'Unlock the cosmetic title from the Hunter’s Shop.', icon: '♜', rarity: 'EPIC', condition: { metric: 'shop-title', target: 'title-shadow-regent' } },
];

export const SPECIAL_CONFIG = {
  randomCooldownMs: 24 * 60 * 60 * 1000,
  maxConcurrentActive: 5,
  rarityWeights: { COMMON: 64, UNCOMMON: 25, RARE: 9, EPIC: 2 } as const,
};
