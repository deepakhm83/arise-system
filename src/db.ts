import { openDB, type DBSchema } from 'idb';
import type { AppData, Mission } from './types';
import { categories } from './questEngine.ts';
interface AriseDB extends DBSchema { state: { key: 'main'; value: AppData } }
export const defaultData: AppData = {
  profile: { name: 'HUNTER', title: 'Awakening', level: 1, totalXp: 0, joinedAt: Date.now() },
  missions: [
    { id: 'focus-01', title: 'Focused Study', description: 'Complete one distraction-free study session.', category: 'INTELLIGENCE', difficulty: 'EASY', xp: 30, gold: 6, status: 'active', createdAt: Date.now(), period: 'one-time', verification: 'timer', minimumSeconds: 1200, elapsedMs: 0, timerRunning: false, attempts: [] },
    { id: 'move-01', title: 'Move Your Body', description: 'Do 20 minutes of exercise or play a sport.', category: 'STRENGTH', difficulty: 'NORMAL', xp: 45, gold: 9, status: 'active', createdAt: Date.now(), period: 'one-time', verification: 'standard', attempts: [] },
    { id: 'learn-01', title: 'Skill Practice', description: 'Spend 15 minutes practising a skill you want to grow.', category: 'PERSONAL DEVELOPMENT', difficulty: 'EASY', xp: 25, gold: 5, status: 'active', createdAt: Date.now(), period: 'one-time', verification: 'timer', minimumSeconds: 600, elapsedMs: 0, timerRunning: false, attempts: [] },
  ],
  xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 0 },
  inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: ['Awakening'],
  preferences: { categories: [...categories], availableMinutes: 30, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0 },
  elite: { enabled: false, currentStreak: 0, longestStreak: 0, restDays: [] },
  progression: { rank: 'E', rankHistory: [{ rank: 'E', earnedAt: Date.now(), reason: 'Starting Hunter rank' }], achievements: [], achievementProgress: {}, titles: [], equippedTitleId: 'awakening', rewardTransactions: [] },
  specialQuests: { nextRandomAt: Date.now() + 24 * 60 * 60 * 1000, offerHistory: [], processedMilestones: [] },
  dungeons: { runs: [], completedIds: [] },
  settings: { sound: true, clickFeedback: true, volume: 0.5 }, updatedAt: Date.now(),
};
let dbPromise: ReturnType<typeof openDB<AriseDB>> | undefined;
function getDb() { dbPromise ??= openDB<AriseDB>('arise-system', 1, { upgrade(db) { db.createObjectStore('state'); } }); return dbPromise; }
export function upgradeData(raw: Partial<AppData> & Record<string, unknown>): AppData {
  const saved = raw as Partial<AppData>;
  const missions: Mission[] = (Array.isArray(saved.missions) ? saved.missions : defaultData.missions).map((oldMission, index) => {
    const mission = oldMission as Mission & { status: string; category: string };
    const categoryAliases: Record<string, string> = { MIND: 'INTELLIGENCE', BODY: 'STRENGTH', GROWTH: 'PERSONAL DEVELOPMENT' };
    const status = ['offered', 'active', 'complete', 'overdue', 'failed', 'recovery'].includes(mission.status) ? mission.status : 'active';
    return { ...mission, category: categoryAliases[mission.category] ?? mission.category, status: status as Mission['status'], gold: Number.isFinite(mission.gold) ? mission.gold : Math.max(1, Math.round((mission.xp || 20) / 5)), period: mission.period ?? 'one-time', verification: mission.verification ?? (index === 0 ? 'timer' : 'standard'), createdAt: mission.createdAt ?? Date.now(), elapsedMs: mission.elapsedMs ?? 0, timerRunning: mission.timerRunning ?? false, checklistDone: mission.checklistDone ?? [], attempts: mission.attempts ?? [] };
  });
  return {
    ...defaultData, ...saved, profile: { ...defaultData.profile, ...saved.profile }, missions,
    xpLog: Array.isArray(saved.xpLog) ? saved.xpLog.filter(entry => entry && typeof entry.id === 'string' && Number.isFinite(entry.amount) && Number.isFinite(entry.timestamp)) : [], activityLog: Array.isArray(saved.activityLog) ? saved.activityLog : [], sentNotices: Array.isArray(saved.sentNotices) ? saved.sentNotices : [],
    wallet: { gold: Number.isFinite(saved.wallet?.gold) ? Math.max(0, saved.wallet!.gold) : 0 },
    inventory: Array.isArray(saved.inventory) ? saved.inventory.filter(entry => entry && typeof entry.itemId === 'string' && Number.isSafeInteger(entry.quantity) && entry.quantity > 0).map(entry => ({ itemId: entry.itemId, quantity: Math.min(999, entry.quantity), purchasedAt: Number.isFinite(entry.purchasedAt) ? entry.purchasedAt : Date.now() })) : [],
    shopHistory: Array.isArray(saved.shopHistory) ? saved.shopHistory.filter(entry => entry && typeof entry.transactionId === 'string' && typeof entry.itemId === 'string' && typeof entry.itemName === 'string').slice(0, 1000) : [],
    customRewards: Array.isArray(saved.customRewards) ? saved.customRewards.filter(entry => entry && typeof entry.id === 'string' && typeof entry.name === 'string' && Number.isSafeInteger(entry.price) && entry.price > 0) : [],
    activeBoosts: Array.isArray(saved.activeBoosts) ? saved.activeBoosts.filter(entry => entry && ['xp', 'gold'].includes(entry.kind) && Number.isSafeInteger(entry.remainingCompletions) && entry.remainingCompletions > 0 && Number.isFinite(entry.multiplier)).map(entry => ({ ...entry, remainingCompletions: Math.min(3, entry.remainingCompletions), multiplier: Math.max(1, Math.min(1.25, entry.multiplier)) })) : [],
    unlockedTitles: Array.isArray(saved.unlockedTitles) ? saved.unlockedTitles.filter(title => typeof title === 'string') : [saved.profile?.title ?? defaultData.profile.title],
    goldLog: Array.isArray(saved.goldLog) ? saved.goldLog.filter(entry => entry && typeof entry.id === 'string' && typeof entry.source === 'string' && Number.isFinite(entry.amount) && Number.isFinite(entry.timestamp)).map(entry => ({ ...entry, transactionId: entry.transactionId ?? entry.id, kind: entry.kind ?? (entry.amount < 0 ? 'spent' as const : 'earned' as const) })) : [],
    preferences: { ...defaultData.preferences, ...saved.preferences, categories: saved.preferences?.categories ?? [...categories], interests: saved.preferences?.interests ?? [], fitnessActivities: saved.preferences?.fitnessActivities ?? ['walking', 'mobility', 'badminton'], fitnessGoal: saved.preferences?.fitnessGoal ?? 'general' },
    elite: { ...defaultData.elite, ...saved.elite, restDays: saved.elite?.restDays ?? [] },
    progression: {
      ...defaultData.progression, ...saved.progression,
      rank: saved.progression?.rank ?? 'E',
      rankHistory: Array.isArray(saved.progression?.rankHistory) && saved.progression!.rankHistory.length ? saved.progression!.rankHistory : [{ rank: saved.progression?.rank ?? 'E', earnedAt: saved.profile?.joinedAt ?? Date.now(), reason: 'Starting Hunter rank' }],
      achievements: Array.isArray(saved.progression?.achievements) ? saved.progression!.achievements : [],
      achievementProgress: saved.progression?.achievementProgress ?? {},
      titles: Array.isArray(saved.progression?.titles) ? saved.progression!.titles : [],
      equippedTitleId: saved.progression?.equippedTitleId ?? 'awakening',
      rewardTransactions: Array.isArray(saved.progression?.rewardTransactions) ? saved.progression!.rewardTransactions : [],
    },
    specialQuests: { ...defaultData.specialQuests, ...saved.specialQuests, nextRandomAt: saved.specialQuests?.nextRandomAt ?? Date.now() + 24 * 60 * 60 * 1000, offerHistory: saved.specialQuests?.offerHistory ?? [], processedMilestones: saved.specialQuests?.processedMilestones ?? [] },
    dungeons: { ...defaultData.dungeons, ...saved.dungeons, runs: saved.dungeons?.runs ?? [], completedIds: saved.dungeons?.completedIds ?? [] },
    settings: { sound: typeof saved.settings?.sound === 'boolean' ? saved.settings.sound : defaultData.settings.sound, clickFeedback: typeof saved.settings?.clickFeedback === 'boolean' ? saved.settings.clickFeedback : true, volume: Number.isFinite(saved.settings?.volume) ? Math.max(0, Math.min(1, saved.settings!.volume)) : defaultData.settings.volume }, updatedAt: saved.updatedAt ?? Date.now(),
  } as AppData;
}
export async function loadData(): Promise<AppData> { const db = await getDb(); const saved = await db.get('state', 'main'); if (saved) { const upgraded = upgradeData(saved as AppData & Record<string, unknown>); await db.put('state', upgraded, 'main'); return upgraded; } await db.put('state', defaultData, 'main'); return defaultData; }
export async function saveData(data: AppData) { const db = await getDb(); await db.put('state', { ...data, updatedAt: Date.now() }, 'main'); }
