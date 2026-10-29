import type { ActivityEntry, AppData, EliteState, Mission, MissionStatus } from './types.ts';
import { applyCompletionBoosts } from './shopEngine.ts';

export type QuestTemplate = Pick<Mission, 'title' | 'description' | 'category' | 'verification' | 'estimatedMinutes' | 'minimumSeconds' | 'checklist' | 'checklistRequired' | 'minimumResult' | 'resultUnit'> & { id: string; baseXp: number };
export const categoryIcons: Record<string, string> = { INTELLIGENCE: 'INT', STRENGTH: 'STR', VITALITY: 'VIT', AGILITY: 'AGI', DISCIPLINE: 'DIS', 'PERSONAL DEVELOPMENT': 'DEV', JAPANESE: '日本' };
export const categories = Object.keys(categoryIcons);
export const templates: QuestTemplate[] = [
  { id: 'study-25', title: 'Focused Study', description: 'Study one topic without distractions for 25 minutes.', category: 'INTELLIGENCE', verification: 'timer', estimatedMinutes: 25, minimumSeconds: 1200, baseXp: 30 },
  { id: 'review-notes', title: 'Review Your Notes', description: 'Review one set of notes and write down three key points.', category: 'INTELLIGENCE', verification: 'checklist', estimatedMinutes: 15, checklist: ['Choose a set of notes', 'Review the material', 'Write three key points'], checklistRequired: 3, baseXp: 25 },
  { id: 'strength-20', title: 'Strength Session', description: 'Do 20 minutes of safe, self-paced strength or bodyweight exercise.', category: 'STRENGTH', verification: 'standard', estimatedMinutes: 20, baseXp: 30 },
  { id: 'walk-20', title: 'Comfortable Walk', description: 'Take a comfortable 20-minute walk. Slow down or stop if you feel unwell.', category: 'VITALITY', verification: 'timer', estimatedMinutes: 20, minimumSeconds: 900, baseXp: 25 },
  { id: 'mobility-10', title: 'Gentle Mobility', description: 'Try ten minutes of comfortable mobility or stretching. Skip anything painful.', category: 'VITALITY', verification: 'timer', estimatedMinutes: 10, minimumSeconds: 600, baseXp: 18 },
  { id: 'beginner-movement', title: 'Beginner Movement', description: 'Choose a gentle beginner-friendly movement session at a comfortable pace. Rest if tired or unwell.', category: 'STRENGTH', verification: 'reflection', estimatedMinutes: 15, baseXp: 22 },
  { id: 'recovery-check', title: 'Recovery Check-In', description: 'Take a few minutes to plan a restful break that suits you today.', category: 'VITALITY', verification: 'reflection', estimatedMinutes: 5, baseXp: 15 },
  { id: 'sleep-plan', title: 'Prepare for Rest', description: 'Set a realistic wind-down reminder for tonight.', category: 'VITALITY', verification: 'standard', estimatedMinutes: 5, baseXp: 15 },
  { id: 'sport-practice', title: 'Coordination Practice', description: 'Practise a sport or coordination skill for 15 minutes at a comfortable pace.', category: 'AGILITY', verification: 'timer', estimatedMinutes: 15, minimumSeconds: 600, baseXp: 25 },
  { id: 'badminton-footwork', title: 'Badminton Footwork', description: 'Practise relaxed badminton footwork or racket coordination for 15 minutes. Pause if anything hurts.', category: 'AGILITY', verification: 'timer', estimatedMinutes: 15, minimumSeconds: 600, baseXp: 25 },
  { id: 'problems-5', title: 'Practice Problems', description: 'Solve at least five practice problems from a subject you are learning.', category: 'AGILITY', verification: 'quantity', estimatedMinutes: 20, minimumResult: 5, resultUnit: 'problems', baseXp: 25 },
  { id: 'planned-task', title: 'Planned Responsibility', description: 'Complete one responsibility you planned for today.', category: 'DISCIPLINE', verification: 'checklist', estimatedMinutes: 20, checklist: ['Name the responsibility', 'Complete the planned task', 'Review what remains'], checklistRequired: 2, baseXp: 25 },
  { id: 'routine-reset', title: 'Routine Reset', description: 'Spend ten minutes preparing one small thing for tomorrow.', category: 'DISCIPLINE', verification: 'standard', estimatedMinutes: 10, baseXp: 20 },
  { id: 'language-15', title: 'Language Practice', description: 'Practise a language for 15 focused minutes.', category: 'PERSONAL DEVELOPMENT', verification: 'timer', estimatedMinutes: 15, minimumSeconds: 600, baseXp: 25 },
  { id: 'japanese-15', title: 'Japanese Study Sprint', description: 'Study Japanese vocabulary, kana, or grammar for 15 focused minutes.', category: 'JAPANESE', verification: 'timer', estimatedMinutes: 15, minimumSeconds: 600, baseXp: 25 },
  { id: 'read-15', title: 'Read to Grow', description: 'Read a book or article of your choice for 15 minutes.', category: 'PERSONAL DEVELOPMENT', verification: 'timer', estimatedMinutes: 15, minimumSeconds: 600, baseXp: 20 },
];

export function localDateKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function localDayEnd(key: string): number { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day, 23, 59, 59, 999).getTime(); }
export function addLocalDays(key: string, days: number): string { const [year, month, day] = key.split('-').map(Number); const date = new Date(year, month - 1, day); date.setDate(date.getDate() + days); return localDateKey(date); }
export function dayDifference(from: string, to: string): number { const parse = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((parse(to) - parse(from)) / 86400000); }
const xpMultiplier: Record<string, number> = { EASY: 0.8, NORMAL: 1, HARD: 1.2 };
export function rewardForDifficulty(baseXp: number, difficulty: string) { const xp = Math.max(5, Math.round(baseXp * (xpMultiplier[difficulty] ?? 1))); return { xp, gold: Math.max(1, Math.round(xp / 5)) }; }
export function generateDailyQuests(data: AppData, now = new Date()): { data: AppData; generated: number } {
  const date = localDateKey(now);
  if (data.dailyGeneratedDate === date || (data.elite.pauseUntil && data.elite.pauseUntil >= date)) return { data, generated: 0 };
  const prefs = data.preferences;
  const allowed = prefs.categories.length ? prefs.categories : categories;
  const fitnessCategories = ['STRENGTH', 'VITALITY', 'AGILITY'];
  const fitnessPaused = Boolean(prefs.fitnessPausedUntil && prefs.fitnessPausedUntil >= date);
  const selectedActivities = prefs.fitnessActivities ?? ['walking', 'mobility', 'badminton'];
  const activityForTemplate: Record<string, string> = { 'walk-20': 'walking', 'mobility-10': 'mobility', 'beginner-movement': 'beginner-workout', 'badminton-footwork': 'badminton', 'sport-practice': 'badminton' };
  const lastFitness = data.missions.filter(mission => mission.status === 'complete' && fitnessCategories.includes(mission.category) && mission.completedAt).reduce((latest, mission) => Math.max(latest, mission.completedAt ?? 0), 0);
  const needsRecovery = lastFitness > 0 && now.getTime() - lastFitness < 20 * 60 * 60 * 1000;
  const available = templates.filter(template => {
    if (!allowed.includes(template.category) || (template.estimatedMinutes ?? 0) > prefs.availableMinutes) return false;
    if (!fitnessCategories.includes(template.category)) return true;
    if (fitnessPaused) return false;
    if (needsRecovery && template.id !== 'recovery-check') return false;
    const activity = activityForTemplate[template.id];
    return !activity || selectedActivities.includes(activity);
  });
  const limit = Math.max(1, Math.min(prefs.maxDailyQuests, 3));
  const recentTemplateIds = new Set(data.missions.filter(m => m.period === 'daily' && m.generatedDate && dayDifference(m.generatedDate, date) <= 2 && dayDifference(m.generatedDate, date) >= 0).map(m => m.templateId));
  const rotation = Math.abs([...date].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7));
  const candidates = available.filter(template => !recentTemplateIds.has(template.id));
  const preferredFitness = prefs.fitnessGoal === 'coordination' ? 'badminton' : prefs.fitnessGoal === 'mobility' ? 'mobility' : prefs.fitnessGoal === 'consistency' ? 'walking' : undefined;
  const pool = (candidates.length >= limit ? candidates : available).slice().sort((a, b) => Number(activityForTemplate[a.id] !== preferredFitness) - Number(activityForTemplate[b.id] !== preferredFitness) || a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const selected: QuestTemplate[] = [];
  while (selected.length < limit && pool.length) selected.push(pool.splice(rotation % pool.length, 1)[0]);
  const dueAt = localDayEnd(date);
  const missions = selected.map(template => {
    const reward = rewardForDifficulty(template.baseXp, prefs.difficulty);
    return { ...template, id: `daily:${date}:${template.id}`, xp: reward.xp, gold: reward.gold, difficulty: prefs.difficulty, status: 'offered' as const, period: 'daily' as const, createdAt: now.getTime(), dueAt, generatedDate: date, attempts: [], checklistDone: [], elapsedMs: 0, timerRunning: false };
  }).filter(mission => !data.missions.some(existing => existing.id === mission.id));
  const activity: ActivityEntry | undefined = missions.length ? { id: `generated:${date}`, kind: 'generated', title: 'Daily quests generated', detail: `${missions.length} quests are ready to review.`, timestamp: now.getTime() } : undefined;
  return { data: { ...data, missions: [...data.missions, ...missions], dailyGeneratedDate: date, activityLog: activity ? [activity, ...data.activityLog] : data.activityLog }, generated: missions.length };
}
export function updateDeadlineStatuses(data: AppData, now: number): AppData {
  let changed = false;
  const missions = data.missions.map(mission => {
    if ((mission.status === 'active' || mission.status === 'recovery') && mission.dueAt && mission.dueAt < now) { changed = true; return { ...mission, status: 'overdue' as MissionStatus, timerRunning: false }; }
    return mission;
  });
  return changed ? { ...data, missions } : data;
}
export function recordDailyStreak(elite: EliteState, date: string): EliteState {
  if (elite.restDays.includes(date) || (elite.pauseUntil && elite.pauseUntil >= date) || elite.lastStreakDate === date) return elite;
  if (!elite.lastStreakDate) return { ...elite, currentStreak: 1, longestStreak: Math.max(1, elite.longestStreak), lastStreakDate: date };
  const gap = dayDifference(elite.lastStreakDate, date);
  let protectedGap = gap > 0;
  for (let offset = 1; offset < gap; offset++) { const gapDate = addLocalDays(elite.lastStreakDate, offset); if (!elite.restDays.includes(gapDate) && !(elite.pauseUntil && elite.pauseUntil >= gapDate)) protectedGap = false; }
  const currentStreak = protectedGap ? elite.currentStreak + 1 : 1;
  return { ...elite, currentStreak, longestStreak: Math.max(currentStreak, elite.longestStreak), lastStreakDate: date };
}
export function checklistSatisfied(mission: Mission): boolean { const required = mission.checklistRequired ?? mission.checklist?.length ?? 0; return (mission.checklistDone?.length ?? 0) >= required && required > 0; }
export function validateResult(mission: Mission, value: number): boolean { return Number.isFinite(value) && value >= (mission.minimumResult ?? 1) && value > 0; }
export function elapsedTimerMs(mission: Mission, now: number): number { return (mission.elapsedMs ?? 0) + (mission.timerRunning && mission.timerStartedAt ? Math.max(0, now - mission.timerStartedAt) : 0); }

export function awardMissionCompletion(data: AppData, missionId: string, now: number): { data: AppData; applied: boolean; xp: number; gold: number; level: number } {
  const mission = data.missions.find(entry => entry.id === missionId);
  if (!mission || !['active', 'recovery'].includes(mission.status)) return { data, applied: false, xp: 0, gold: 0, level: data.profile.level };
  const reward = applyCompletionBoosts(data, mission.xp, mission.gold);
  const totalXp = data.profile.totalXp + reward.xp; let level = data.profile.level; let remaining = totalXp;
  const xpForLevel = (current: number) => 100 + (current - 1) * 50;
  while (remaining >= xpForLevel(level)) { remaining -= xpForLevel(level); level++; }
  const xpId = crypto.randomUUID(); const goldId = crypto.randomUUID();
  const updatedMission = { ...mission, status: 'complete' as const, completedAt: now, timerRunning: false, timerStartedAt: undefined };
  return {
    data: {
      ...data, profile: { ...data.profile, totalXp, level }, wallet: { gold: data.wallet.gold + reward.gold }, activeBoosts: reward.activeBoosts,
      missions: data.missions.map(entry => entry.id === missionId ? updatedMission : entry),
      xpLog: [{ id: xpId, source: mission.title, amount: reward.xp, timestamp: now }, ...data.xpLog],
      goldLog: [{ id: goldId, transactionId: goldId, source: mission.title, amount: reward.gold, timestamp: now, questId: missionId, kind: 'earned' }, ...data.goldLog],
    }, applied: true, xp: reward.xp, gold: reward.gold, level,
  };
}

