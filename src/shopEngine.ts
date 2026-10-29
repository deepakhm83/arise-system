import type { ActiveBoost, AppData, CustomReward, InventoryEntry, ShopHistoryEntry, ShopItem } from './types.ts';

export const shopCatalog: ShopItem[] = [
  { id: 'recovery-pass', name: 'Recovery Pass', description: 'After using a quest’s included recovery attempt, spend this pass to reopen that missed quest for one additional recovery attempt.', category: 'mission-supplies', price: 18, rarity: 'rare', icon: 'rotate', effect: 'recovery-pass', consumable: true, maxOwned: 5, available: true },
  { id: 'deadline-extension', name: 'Deadline Extension', description: 'Add 24 hours to one active quest with a future deadline. Each quest can receive one extension.', category: 'mission-supplies', price: 12, rarity: 'common', icon: 'clock', effect: 'deadline-extension', consumable: true, maxOwned: 5, available: true },
  { id: 'xp-booster', name: 'XP Resonance', description: 'Use to increase XP from your next three completed quests by 25%. Verification rules still apply.', category: 'progression', price: 30, rarity: 'rare', icon: 'zap', effect: 'xp-booster', consumable: true, maxOwned: 5, available: true },
  { id: 'gold-booster', name: 'Gold Resonance', description: 'Use to increase Gold from your next three completed quests by 25%.', category: 'progression', price: 30, rarity: 'rare', icon: 'gem', effect: 'gold-booster', consumable: true, maxOwned: 5, available: true },
  { id: 'title-shadow-regent', name: 'Shadow Regent', description: 'Unlock the profile title “Shadow Regent”. Cosmetic only; it does not change attributes or rewards.', category: 'hunter-equipment', price: 80, rarity: 'epic', icon: 'shield', effect: 'profile-title', consumable: false, maxOwned: 1, available: true, titleValue: 'Shadow Regent' },
  { id: 'skill-point-token', name: 'Skill Point Token', description: 'Reserved for a future skill system. This item cannot be purchased yet.', category: 'progression', price: 40, rarity: 'epic', icon: 'sparkles', effect: 'locked', consumable: false, maxOwned: 1, available: false, lockedReason: 'Skill progression is not available yet.' },
];

export const categoryNames: Record<ShopItem['category'], string> = {
  'mission-supplies': 'MISSION SUPPLIES', progression: 'PROGRESSION', 'hunter-equipment': 'HUNTER EQUIPMENT', 'custom-rewards': 'CUSTOM REWARDS',
};
export function getShopItem(data: AppData, itemId: string): ShopItem | undefined {
  const fixed = shopCatalog.find(item => item.id === itemId);
  if (fixed) return fixed;
  const reward = data.customRewards.find(item => item.id === itemId);
  return reward ? { id: reward.id, name: reward.name, description: reward.description, category: 'custom-rewards', price: reward.price, rarity: 'common', icon: 'gift', effect: 'custom-reward', consumable: false, available: true } : undefined;
}
const transaction = (data: AppData, entry: ShopHistoryEntry) => ({ ...data, shopHistory: [entry, ...data.shopHistory] });

export function purchaseShopItem(data: AppData, itemId: string, now: number, transactionId: string): { data: AppData; error?: string; item?: ShopItem } {
  if (data.shopHistory.some(entry => entry.transactionId === transactionId)) return { data, item: getShopItem(data, itemId) };
  const item = getShopItem(data, itemId);
  if (!item) return { data, error: 'ITEM NOT FOUND' };
  if (!item.available || item.effect === 'locked') return { data, error: item.lockedReason ?? 'ITEM UNAVAILABLE' };
  const owned = data.inventory.find(entry => entry.itemId === item.id)?.quantity ?? 0;
  if (item.maxOwned !== undefined && owned >= item.maxOwned) return { data, error: 'OWNERSHIP LIMIT REACHED' };
  if (!Number.isSafeInteger(item.price) || item.price < 0) return { data, error: 'INVALID ITEM PRICE' };
  if (data.wallet.gold < item.price) return { data, error: 'NOT ENOUGH GOLD' };
  const history: ShopHistoryEntry = { id: transactionId, transactionId, kind: item.effect === 'custom-reward' ? 'custom-reward' : 'purchase', itemId, itemName: item.name, amount: -item.price, timestamp: now, detail: item.effect === 'custom-reward' ? 'Self-managed reward claimed.' : 'Purchased from Hunter’s Shop.' };
  const nextInventory: InventoryEntry[] = item.effect === 'custom-reward' ? data.inventory : owned ? data.inventory.map(entry => entry.itemId === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...data.inventory, { itemId, quantity: 1, purchasedAt: now }];
  const goldEntry = { id: transactionId, transactionId, source: item.effect === 'custom-reward' ? `Claimed: ${item.name}` : `Shop: ${item.name}`, amount: -item.price, timestamp: now, kind: item.effect === 'custom-reward' ? 'custom-reward' as const : 'spent' as const, itemId };
  const next = { ...data, wallet: { gold: data.wallet.gold - item.price }, inventory: nextInventory, goldLog: [goldEntry, ...data.goldLog] };
  return { data: transaction(next, history), item };
}

function consumeInventory(data: AppData, item: ShopItem): InventoryEntry[] {
  return data.inventory.flatMap(entry => entry.itemId !== item.id ? [entry] : entry.quantity > 1 ? [{ ...entry, quantity: entry.quantity - 1 }] : []);
}
export function useShopItem(data: AppData, itemId: string, missionId: string | undefined, now: number, transactionId: string): { data: AppData; error?: string; item?: ShopItem } {
  if (data.shopHistory.some(entry => entry.transactionId === transactionId)) return { data, item: getShopItem(data, itemId) };
  const item = getShopItem(data, itemId);
  if (!item || !data.inventory.some(entry => entry.itemId === itemId && entry.quantity > 0)) return { data, error: 'ITEM NOT IN INVENTORY' };
  let missions = data.missions;
  let boosts: ActiveBoost[] = data.activeBoosts;
  let questId: string | undefined;
  let detail = '';
  if (item.effect === 'recovery-pass') {
    const mission = data.missions.find(entry => entry.id === missionId);
    const freeRecoveryUsed = data.shopHistory.some(entry => entry.kind === 'use' && entry.questId === missionId && entry.itemId === 'recovery-flow');
    if (!mission || mission.status !== 'failed' || !freeRecoveryUsed) return { data, error: 'RECOVERY PASS REQUIRES A QUEST THAT ALREADY USED ITS INCLUDED RECOVERY.' };
    questId = mission.id; detail = `Extra recovery opened for ${mission.title}.`;
    const nextDay = new Date(now); nextDay.setDate(nextDay.getDate() + 1); nextDay.setHours(23, 59, 59, 999);
    missions = missions.map(entry => entry.id === mission.id ? { ...entry, status: 'recovery', previousStatus: 'failed', dueAt: nextDay.getTime(), timerRunning: false } : entry);
  } else if (item.effect === 'deadline-extension') {
    const mission = data.missions.find(entry => entry.id === missionId);
    const alreadyExtended = data.shopHistory.some(entry => entry.kind === 'use' && entry.itemId === itemId && entry.questId === missionId);
    if (!mission || !['active', 'recovery'].includes(mission.status) || !mission.dueAt || mission.dueAt <= now || alreadyExtended) return { data, error: 'SELECT AN ACTIVE QUEST WITH A FUTURE DEADLINE THAT HAS NOT BEEN EXTENDED.' };
    questId = mission.id; detail = `Deadline extended 24 hours for ${mission.title}.`;
    missions = missions.map(entry => entry.id === mission.id ? { ...entry, dueAt: entry.dueAt! + 24 * 60 * 60 * 1000 } : entry);
  } else if (item.effect === 'xp-booster' || item.effect === 'gold-booster') {
    const kind = item.effect === 'xp-booster' ? 'xp' : 'gold';
    if (boosts.some(boost => boost.kind === kind)) return { data, error: `A ${kind.toUpperCase()} BOOST IS ALREADY ACTIVE.` };
    boosts = [...boosts, { id: transactionId, kind, multiplier: 1.25, remainingCompletions: 3, itemId }];
    detail = `+25% ${kind.toUpperCase()} on your next three completed quests.`;
  } else {
    return { data, error: 'THIS ITEM DOES NOT HAVE A USE ACTION.' };
  }
  const history: ShopHistoryEntry = { id: transactionId, transactionId, kind: 'use', itemId, itemName: item.name, timestamp: now, questId, detail };
  return { data: transaction({ ...data, missions, activeBoosts: boosts, inventory: consumeInventory(data, item) }, history), item };
}

export function equipShopItem(data: AppData, itemId: string, now: number, transactionId: string): { data: AppData; error?: string } {
  if (data.shopHistory.some(entry => entry.transactionId === transactionId)) return { data };
  const item = getShopItem(data, itemId);
  if (!item || item.effect !== 'profile-title' || !data.inventory.some(entry => entry.itemId === itemId)) return { data, error: 'TITLE NOT OWNED' };
  const entry: ShopHistoryEntry = { id: transactionId, transactionId, kind: 'equip', itemId, itemName: item.name, timestamp: now, detail: 'Profile title equipped.' };
  const titleId = itemId === 'title-shadow-regent' ? 'shadow-regent' : `shop:${itemId}`;
  return { data: transaction({ ...data, profile: { ...data.profile, title: item.titleValue ?? item.name }, progression: { ...data.progression, equippedTitleId: titleId } }, entry) };
}

export function createCustomReward(data: AppData, name: string, description: string, price: number, now: number): { data: AppData; error?: string } {
  const cleanName = name.trim().slice(0, 40); const cleanDescription = description.trim().slice(0, 120);
  if (!cleanName) return { data, error: 'ADD A NAME FOR YOUR REWARD.' };
  if (!Number.isSafeInteger(price) || price < 1 || price > 10000) return { data, error: 'PRICE MUST BE BETWEEN 1 AND 10,000 GOLD.' };
  const reward: CustomReward = { id: `custom:${crypto.randomUUID()}`, name: cleanName, description: cleanDescription || 'A personal reward you will enjoy offline.', price, createdAt: now };
  return { data: { ...data, customRewards: [reward, ...data.customRewards] } };
}

export function applyCompletionBoosts(data: AppData, xp: number, gold: number): { xp: number; gold: number; activeBoosts: ActiveBoost[] } {
  const xpBoost = data.activeBoosts.find(boost => boost.kind === 'xp');
  const goldBoost = data.activeBoosts.find(boost => boost.kind === 'gold');
  const next = data.activeBoosts.flatMap(boost => {
    if (boost.kind !== 'xp' && boost.kind !== 'gold') return [boost];
    return boost.remainingCompletions > 1 ? [{ ...boost, remainingCompletions: boost.remainingCompletions - 1 }] : [];
  });
  return { xp: xpBoost ? Math.round(xp * xpBoost.multiplier) : xp, gold: goldBoost ? Math.round(gold * goldBoost.multiplier) : gold, activeBoosts: next };
}

export function itemById(data: AppData, id: string) { return getShopItem(data, id); }
