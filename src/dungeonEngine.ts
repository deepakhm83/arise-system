import type { AppData, DungeonRun, Mission } from './types.ts';

export type DungeonDefinition = { id: string; title: string; theme: string; minRank: number; stages: { id: string; title: string; objective: string; category: string; verification: Mission['verification']; minutes: number; xp: number; gold: number }[] };
export const DUNGEONS: DungeonDefinition[] = [
  { id: 'electrical-labyrinth', title: 'Electrical Labyrinth', theme: 'Circuit analysis and electrical engineering', minRank: 0, stages: [
    { id: 'map-the-circuit', title: 'Map the Circuit', objective: 'Study one circuit or electrical concept, then write down the key relationships.', category: 'INTELLIGENCE', verification: 'reflection', minutes: 20, xp: 35, gold: 7 },
    { id: 'solve-the-gate', title: 'Solve the Gate', objective: 'Work through three relevant practice problems and record your result.', category: 'INTELLIGENCE', verification: 'quantity', minutes: 25, xp: 45, gold: 9 },
    { id: 'boss-ohms-law', title: 'Boss Gate · Final Review', objective: 'Explain the circuit method in your own words and complete a short focused review.', category: 'INTELLIGENCE', verification: 'reflection', minutes: 20, xp: 55, gold: 11 },
  ] },
  { id: 'language-gate', title: 'Language Gate', theme: 'Japanese language learning', minRank: 0, stages: [
    { id: 'kana-entry', title: 'Kana Entry', objective: 'Practise kana or a small Japanese vocabulary set, then note what you covered.', category: 'JAPANESE', verification: 'timer', minutes: 15, xp: 30, gold: 6 },
    { id: 'grammar-seal', title: 'Grammar Seal', objective: 'Study one grammar point and write two example sentences.', category: 'JAPANESE', verification: 'reflection', minutes: 20, xp: 40, gold: 8 },
    { id: 'language-boss', title: 'Boss Gate · Recall Trial', objective: 'Review the material without looking at notes, then record what you remembered.', category: 'JAPANESE', verification: 'reflection', minutes: 15, xp: 50, gold: 10 },
  ] },
  { id: 'training-grounds', title: 'Training Grounds', theme: 'Safe fitness, mobility, and coordination', minRank: 0, stages: [
    { id: 'warm-up', title: 'Recovery Check', objective: 'Choose rest, gentle mobility, a comfortable walk, or badminton practice appropriate for today.', category: 'VITALITY', verification: 'reflection', minutes: 10, xp: 20, gold: 4 },
    { id: 'movement-session', title: 'Movement Session', objective: 'Complete a self-paced activity you chose. Skip if ill or injured; no exercise is required through pain.', category: 'AGILITY', verification: 'timer', minutes: 15, xp: 30, gold: 6 },
    { id: 'coordination-boss', title: 'Boss Gate · Cooldown', objective: 'Finish with gentle cooldown or rest and note how the session felt.', category: 'VITALITY', verification: 'reflection', minutes: 5, xp: 35, gold: 7 },
  ] },
  { id: 'focus-dungeon', title: 'Focus Dungeon', theme: 'Study and personal development', minRank: 0, stages: [
    { id: 'clear-distractions', title: 'Clear the Noise', objective: 'Choose one useful task and set up a distraction-light workspace.', category: 'DISCIPLINE', verification: 'checklist', minutes: 5, xp: 20, gold: 4 },
    { id: 'focus-session', title: 'Focused Session', objective: 'Work on your selected task for a focused session, then record what moved forward.', category: 'PERSONAL DEVELOPMENT', verification: 'timer', minutes: 20, xp: 35, gold: 7 },
    { id: 'focus-boss', title: 'Boss Gate · Reflection', objective: 'Summarize one thing you learned or accomplished and choose a small next step.', category: 'PERSONAL DEVELOPMENT', verification: 'reflection', minutes: 10, xp: 40, gold: 8 },
  ] },
];

function missionForStage(dungeon: DungeonDefinition, stageIndex: number, runStart: number, now: number, data: AppData): Mission {
  const stage = dungeon.stages[stageIndex];
  const rankIndex = ['E', 'D', 'C', 'B', 'A', 'S', 'NATIONAL'].indexOf(data.progression.rank);
  const difficulty = rankIndex >= 4 ? 'HARD' : rankIndex <= 1 ? 'EASY' : 'NORMAL';
  const fitnessFocus = ({ consistency: 'a consistency goal', coordination: 'a coordination or badminton goal', mobility: 'a mobility and recovery goal' } as Record<string, string>)[data.preferences.fitnessGoal ?? ''] ?? 'your general wellbeing goal';
  const objective = ['STRENGTH', 'VITALITY', 'AGILITY'].includes(stage.category) ? `${stage.objective} Adapt the effort to ${fitnessFocus}. Rest or skip if ill, injured, or in pain.` : stage.objective;
  const checklist = stage.verification === 'checklist' ? ['Prepare the task', 'Complete one focused step', 'Review what remains'] : undefined;
  return {
    id: `dungeon:${dungeon.id}:${runStart}:${stageIndex}`, title: stage.title, description: objective,
    category: stage.category, difficulty, xp: stage.xp, gold: stage.gold, status: 'active', createdAt: now,
    acceptedAt: now, period: 'long-term', verification: stage.verification, estimatedMinutes: stage.minutes,
    minimumSeconds: stage.verification === 'timer' ? stage.minutes * 60 : undefined,
    minimumResult: stage.verification === 'quantity' ? 3 : undefined, resultUnit: stage.verification === 'quantity' ? 'problems' : undefined,
    checklist, checklistRequired: checklist?.length, checklistDone: [], elapsedMs: 0, timerRunning: false, attempts: [],
    dungeonId: dungeon.id, dungeonStage: stageIndex,
  };
}

export function startDungeon(data: AppData, dungeonId: string, now: number): { data: AppData; error?: string } {
  const dungeon = DUNGEONS.find(item => item.id === dungeonId);
  if (!dungeon) return { data, error: 'DUNGEON NOT FOUND' };
  if (data.dungeons.runs.some(run => !run.completedAt)) return { data, error: 'FINISH OR PAUSE YOUR ACTIVE DUNGEON FIRST' };
  if (['E', 'D', 'C', 'B', 'A', 'S', 'NATIONAL'].indexOf(data.progression.rank) < dungeon.minRank) return { data, error: 'RANK REQUIREMENT NOT MET' };
  const mission = missionForStage(dungeon, 0, now, now, data);
  const run: DungeonRun = { dungeonId, startedAt: now, currentStage: 0, stages: [{ id: dungeon.stages[0].id, missionId: mission.id }] };
  return { data: { ...data, dungeons: { ...data.dungeons, runs: [...data.dungeons.runs, run] }, missions: [mission, ...data.missions], activityLog: [{ id: `dungeon-start:${dungeonId}:${now}`, kind: 'dungeon-start', title: `${dungeon.title} entered`, detail: dungeon.theme, timestamp: now }, ...data.activityLog] } };
}

function grantDungeonClear(data: AppData, dungeon: DungeonDefinition, now: number): AppData {
  const transactionId = `dungeon-clear:${dungeon.id}:${data.dungeons.runs.find(run => run.dungeonId === dungeon.id && run.completedAt === now)?.startedAt ?? now}`;
  if (data.progression.rewardTransactions.includes(transactionId)) return data;
  const bonusXp = 40;
  const bonusGold = 8;
  const total = data.profile.totalXp + bonusXp;
  let level = data.profile.level;
  let remaining = total;
  while (remaining >= 100 + (level - 1) * 50) { remaining -= 100 + (level - 1) * 50; level += 1; }
  return {
    ...data,
    profile: { ...data.profile, totalXp: total, level },
    wallet: { gold: data.wallet.gold + bonusGold },
    xpLog: [{ id: transactionId, source: `${dungeon.title} clear bonus`, amount: bonusXp, timestamp: now }, ...data.xpLog],
    goldLog: [{ id: transactionId, transactionId, source: `${dungeon.title} clear bonus`, amount: bonusGold, timestamp: now, kind: 'earned' }, ...data.goldLog],
    progression: { ...data.progression, rewardTransactions: [...data.progression.rewardTransactions, transactionId] },
  };
}

export function advanceDungeon(data: AppData, missionId: string, now: number): { data: AppData; stageAdvanced: boolean; dungeonCleared?: string } {
  if (data.missions.find(mission => mission.id === missionId)?.status !== 'complete') return { data, stageAdvanced: false };
  const run = data.dungeons.runs.find(item => !item.completedAt && item.stages[item.currentStage]?.missionId === missionId);
  if (!run) return { data, stageAdvanced: false };
  const dungeon = DUNGEONS.find(item => item.id === run.dungeonId);
  if (!dungeon) return { data, stageAdvanced: false };
  const stages = run.stages.map((stage, index) => index === run.currentStage ? { ...stage, completedAt: now } : stage);
  const nextIndex = run.currentStage + 1;
  if (nextIndex >= dungeon.stages.length) {
    const completedRun = { ...run, currentStage: nextIndex, stages, completedAt: now };
    let next: AppData = { ...data, dungeons: { ...data.dungeons, runs: data.dungeons.runs.map(item => item === run ? completedRun : item), completedIds: data.dungeons.completedIds.includes(dungeon.id) ? data.dungeons.completedIds : [...data.dungeons.completedIds, dungeon.id] }, activityLog: [{ id: `dungeon-clear:${dungeon.id}:${run.startedAt}`, kind: 'dungeon-clear', title: `${dungeon.title} cleared`, detail: `${dungeon.stages.length} stages completed.`, timestamp: now }, ...data.activityLog] };
    next = grantDungeonClear(next, dungeon, now);
    return { data: next, stageAdvanced: true, dungeonCleared: dungeon.title };
  }
  const nextMission = missionForStage(dungeon, nextIndex, run.startedAt, now, data);
  const nextRun: DungeonRun = { ...run, currentStage: nextIndex, stages: [...stages, { id: dungeon.stages[nextIndex].id, missionId: nextMission.id }] };
  return { data: { ...data, dungeons: { ...data.dungeons, runs: data.dungeons.runs.map(item => item === run ? nextRun : item) }, missions: [nextMission, ...data.missions], activityLog: [{ id: `dungeon-stage:${missionId}`, kind: 'dungeon-stage', title: `${dungeon.title} stage advanced`, detail: `${nextIndex + 1}/${dungeon.stages.length} · ${dungeon.stages[nextIndex].title}`, timestamp: now }, ...data.activityLog] }, stageAdvanced: true };
}
