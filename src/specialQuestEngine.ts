import type { AppData, Mission, SpecialRarity } from './types.ts';
import { localDateKey } from './questEngine.ts';
import { SPECIAL_CONFIG } from './progressionConfig.ts';

export type SpecialQuestDefinition = {
  id: string; title: string; description: string; category: string; difficulty: string; verification: Mission['verification'];
  minutes: number; xp: number; gold: number; rarity: SpecialRarity; interests?: string[]; minRank?: number;
  milestoneId?: string; milestoneAchievement?: string;
};

export const SPECIAL_QUEST_POOL: SpecialQuestDefinition[] = [
  { id: 'circuit-rift', title: 'Circuit Rift', description: 'Trace one electrical circuit and explain its behavior in your own notes.', category: 'INTELLIGENCE', difficulty: 'NORMAL', verification: 'reflection', minutes: 25, xp: 45, gold: 9, rarity: 'COMMON', interests: ['ELECTRICAL ENGINEERING', 'STUDY'], milestoneId: 'first-quest-rift', milestoneAchievement: 'first-quest' },
  { id: 'kana-gate', title: 'Kana Gate', description: 'Practise a small set of Japanese kana or vocabulary, then record what you reviewed.', category: 'JAPANESE', difficulty: 'NORMAL', verification: 'timer', minutes: 15, xp: 35, gold: 7, rarity: 'UNCOMMON', interests: ['JAPANESE', 'LANGUAGES'] },
  { id: 'training-ground', title: 'Training Grounds', description: 'Choose a comfortable walk, mobility session, or badminton footwork practice. Stop if you feel unwell or in pain.', category: 'AGILITY', difficulty: 'NORMAL', verification: 'reflection', minutes: 20, xp: 35, gold: 7, rarity: 'COMMON', interests: ['FITNESS', 'BADMINTON'] },
  { id: 'focus-gate', title: 'Focus Gate', description: 'Complete one focused study or personal-development session and note one useful takeaway.', category: 'PERSONAL DEVELOPMENT', difficulty: 'HARD', verification: 'timer', minutes: 30, xp: 60, gold: 12, rarity: 'RARE', interests: ['STUDY', 'PERSONAL DEVELOPMENT'] },
  { id: 'streak-echo', title: 'Streak Echo', description: 'Choose one manageable daily quest and complete it using its configured verification. Rest days remain protected.', category: 'DISCIPLINE', difficulty: 'HARD', verification: 'reflection', minutes: 20, xp: 60, gold: 12, rarity: 'RARE', milestoneId: 'seven-day-streak-echo', milestoneAchievement: 'quest-streak-7' },
  { id: 'dungeon-echo', title: 'Dungeon Echo', description: 'Review a skill from a cleared dungeon and complete one small practice objective.', category: 'PERSONAL DEVELOPMENT', difficulty: 'HARD', verification: 'reflection', minutes: 20, xp: 60, gold: 12, rarity: 'RARE', milestoneId: 'first-dungeon-echo', milestoneAchievement: 'first-dungeon' },
  { id: 'rank-breaker', title: 'Rank Breaker Trial', description: 'Complete a challenging learning session and reflect on the strategy you used.', category: 'INTELLIGENCE', difficulty: 'HARD', verification: 'reflection', minutes: 30, xp: 75, gold: 15, rarity: 'EPIC', interests: ['ELECTRICAL ENGINEERING', 'STUDY'], minRank: 1, milestoneId: 'rank-d-trial' },
];

export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(items: readonly T[], getWeight: (item: T) => number, random: () => number): T | undefined {
  const eligible = items.map(item => ({ item, weight: getWeight(item) })).filter(row => Number.isFinite(row.weight) && row.weight > 0);
  const total = eligible.reduce((sum, row) => sum + row.weight, 0);
  if (!eligible.length || total <= 0) return undefined;
  let needle = Math.min(.999999999999, Math.max(0, random())) * total;
  for (const row of eligible) { needle -= row.weight; if (needle < 0) return row.item; }
  return eligible.at(-1)?.item;
}

function activeCount(data: AppData): number {
  return data.missions.filter(mission => ['offered', 'active', 'recovery'].includes(mission.status)).length;
}
function specialActive(data: AppData): number {
  return data.missions.filter(mission => mission.period === 'special' && ['offered', 'active', 'recovery'].includes(mission.status)).length;
}
function interestEligible(definition: SpecialQuestDefinition, data: AppData): boolean {
  if (!definition.interests?.length) return true;
  const selected = data.preferences.interests ?? [];
  return selected.length === 0 || definition.interests.some(interest => selected.includes(interest));
}
function eligible(definition: SpecialQuestDefinition, data: AppData, now: number): boolean {
  if (data.missions.some(mission => mission.period === 'special' && mission.templateId === definition.id && ['offered', 'active', 'complete', 'recovery'].includes(mission.status))) return false;
  if ((definition.minRank ?? 0) > ['E', 'D', 'C', 'B', 'A', 'S', 'NATIONAL'].indexOf(data.progression.rank)) return false;
  if (definition.id === 'training-ground' && data.missions.some(mission => mission.completedAt && mission.completedAt > now - 24 * 60 * 60 * 1000 && ['STRENGTH', 'VITALITY', 'AGILITY'].includes(mission.category))) return false;
  if (!definition.milestoneId && data.missions.some(mission => mission.status === 'complete' && mission.completedAt && mission.completedAt > now - 12 * 60 * 60 * 1000 && mission.category === definition.category)) return false;
  return interestEligible(definition, data) && (definition.minutes <= data.preferences.availableMinutes || data.preferences.availableMinutes <= 0);
}

function makeMission(definition: SpecialQuestDefinition, now: number, kind: 'random' | 'milestone'): Mission {
  const id = `special:${definition.id}:${now}`;
  return {
    id, templateId: definition.id, title: definition.title, description: definition.description, category: definition.category,
    difficulty: definition.difficulty, xp: definition.xp, gold: definition.gold, status: 'offered', createdAt: now,
    dueAt: now + 48 * 60 * 60 * 1000, period: 'special', verification: definition.verification,
    estimatedMinutes: definition.minutes, minimumSeconds: definition.verification === 'timer' ? Math.max(60, definition.minutes * 60) : undefined,
    elapsedMs: 0, checklistDone: [], attempts: [], generatedDate: localDateKey(new Date(now)),
    specialRarity: definition.rarity, specialKind: kind, milestoneId: definition.milestoneId, optional: kind === 'random',
  };
}

function withOffer(data: AppData, definition: SpecialQuestDefinition, now: number, kind: 'random' | 'milestone'): AppData {
  const mission = makeMission(definition, now, kind);
  const eventId = `${kind}:${definition.id}:${now}`;
  return {
    ...data,
    missions: [mission, ...data.missions],
    specialQuests: {
      ...data.specialQuests,
      nextRandomAt: kind === 'random' ? now + SPECIAL_CONFIG.randomCooldownMs : data.specialQuests.nextRandomAt,
      offerHistory: [...data.specialQuests.offerHistory, eventId],
      lastRandomQuestId: kind === 'random' ? definition.id : data.specialQuests.lastRandomQuestId,
      processedMilestones: kind === 'milestone' && definition.milestoneId
        ? [...data.specialQuests.processedMilestones, definition.milestoneId]
        : data.specialQuests.processedMilestones,
    },
    activityLog: [{ id: eventId, kind: 'special-offer', title: 'Special quest appeared', detail: `${mission.title} · ${kind === 'milestone' ? 'milestone unlocked' : mission.specialRarity}`, timestamp: now }, ...data.activityLog],
  };
}

export function offerSpecialQuest(data: AppData, now: number, random: () => number): { data: AppData; offered?: Mission } {
  if (activeCount(data) >= SPECIAL_CONFIG.maxConcurrentActive || specialActive(data) > 0) return { data };
  const milestones: SpecialQuestDefinition[] = [
    ...SPECIAL_QUEST_POOL.filter(definition => definition.milestoneAchievement && data.progression.achievements.some(record => record.id === definition.milestoneAchievement && definition.milestoneId !== undefined && !data.specialQuests.processedMilestones.includes(definition.milestoneId))),
    ...SPECIAL_QUEST_POOL.filter(definition => definition.milestoneId === 'rank-d-trial' && data.progression.rank !== 'E' && !data.specialQuests.processedMilestones.includes('rank-d-trial')),
  ];
  const milestone = milestones.find(definition => eligible(definition, data, now));
  if (milestone) {
    const next = withOffer(data, milestone, now, 'milestone');
    return { data: next, offered: next.missions[0] };
  }
  if (now < data.specialQuests.nextRandomAt) return { data };
  const candidates = SPECIAL_QUEST_POOL.filter(definition => !definition.milestoneId && eligible(definition, data, now));
  if (!candidates.length) return { data: { ...data, specialQuests: { ...data.specialQuests, nextRandomAt: now + SPECIAL_CONFIG.randomCooldownMs } } };
  const selected = weightedPick(candidates, definition => SPECIAL_CONFIG.rarityWeights[definition.rarity], random);
  if (!selected) return { data };
  const next = withOffer(data, selected, now, 'random');
  return { data: next, offered: next.missions[0] };
}

export function declineSpecialQuest(data: AppData, missionId: string, now: number): AppData {
  const mission = data.missions.find(item => item.id === missionId && item.period === 'special' && item.status === 'offered');
  if (!mission) return data;
  return {
    ...data,
    missions: data.missions.map(item => item.id === missionId ? { ...item, status: 'declined' as const } : item),
    activityLog: [{ id: `declined:${mission.id}`, kind: 'special-declined', title: 'Optional special quest declined', detail: mission.title, timestamp: now }, ...data.activityLog],
  };
}
