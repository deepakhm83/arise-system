import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCompletionBoosts, createCustomReward, equipShopItem, purchaseShopItem, shopCatalog, useShopItem } from '../src/shopEngine.ts';

function appData(overrides = {}) {
  return {
    profile: { name: 'TEST', title: 'Awakening', level: 1, totalXp: 0, joinedAt: 1 },
    missions: [], xpLog: [], goldLog: [], activityLog: [], sentNotices: [], wallet: { gold: 100 },
    inventory: [], shopHistory: [], customRewards: [], activeBoosts: [], unlockedTitles: ['Awakening'],
    preferences: { categories: ['INTELLIGENCE'], availableMinutes: 30, difficulty: 'NORMAL', maxDailyQuests: 3, rerollDate: '', rerollsUsed: 0 },
    elite: { enabled: false, currentStreak: 0, longestStreak: 0, restDays: [] },
    settings: { sound: false, volume: 0.5 }, updatedAt: 1,
    ...overrides,
  };
}

test('shop purchase charges once, adds inventory, and records a traceable transaction', () => {
  const first = purchaseShopItem(appData(), 'xp-booster', 100, 'purchase-1');
  assert.equal(first.data.wallet.gold, 70);
  assert.deepEqual(first.data.inventory, [{ itemId: 'xp-booster', quantity: 1, purchasedAt: 100 }]);
  assert.equal(first.data.goldLog[0].amount, -30);
  assert.equal(first.data.goldLog[0].transactionId, 'purchase-1');
  const repeated = purchaseShopItem(first.data, 'xp-booster', 101, 'purchase-1');
  assert.equal(repeated.data.wallet.gold, 70);
  assert.equal(repeated.data.inventory[0].quantity, 1);
  assert.equal(repeated.data.shopHistory.length, 1);
});

test('unaffordable and locked purchases preserve wallet, inventory, and histories', () => {
  const poor = appData({ wallet: { gold: 1 } });
  const failed = purchaseShopItem(poor, 'xp-booster', 100, 'poor-purchase');
  assert.equal(failed.error, 'NOT ENOUGH GOLD');
  assert.equal(failed.data.wallet.gold, 1);
  assert.equal(failed.data.inventory.length, 0);
  assert.equal(failed.data.goldLog.length, 0);
  const locked = purchaseShopItem(appData(), 'skill-point-token', 100, 'locked-purchase');
  assert.match(locked.error, /not available/i);
  assert.equal(locked.data.wallet.gold, 100);
});

test('consumable booster activates for three quest completions then expires', () => {
  const bought = purchaseShopItem(appData(), 'xp-booster', 100, 'buy-xp');
  const used = useShopItem(bought.data, 'xp-booster', undefined, 120, 'use-xp');
  assert.equal(used.error, undefined);
  assert.equal(used.data.inventory.length, 0);
  let first = applyCompletionBoosts(used.data, 40, 8);
  assert.equal(first.xp, 50);
  assert.equal(first.gold, 8);
  assert.equal(first.activeBoosts[0].remainingCompletions, 2);
  first = applyCompletionBoosts({ ...used.data, activeBoosts: first.activeBoosts }, 40, 8);
  first = applyCompletionBoosts({ ...used.data, activeBoosts: first.activeBoosts }, 40, 8);
  assert.equal(first.xp, 50);
  assert.deepEqual(first.activeBoosts, []);
});

test('deadline extension applies exactly once to an eligible mission', () => {
  const mission = { id: 'quest-1', title: 'Study', status: 'active', dueAt: 5000 };
  const bought = purchaseShopItem(appData({ missions: [mission] }), 'deadline-extension', 100, 'buy-ext');
  const used = useShopItem(bought.data, 'deadline-extension', mission.id, 1000, 'use-ext');
  assert.equal(used.data.missions[0].dueAt, 5000 + 86400000);
  assert.equal(used.data.inventory.length, 0);
  const secondPass = purchaseShopItem(used.data, 'deadline-extension', 200, 'buy-ext-2');
  const secondUse = useShopItem(secondPass.data, 'deadline-extension', mission.id, 2000, 'use-ext-2');
  assert.match(secondUse.error, /not been extended/i);
  assert.equal(secondUse.data.inventory[0].quantity, 1);
});

test('Recovery Pass requires the included recovery flow and preserves items when invalid', () => {
  const mission = { id: 'quest-2', title: 'Walk', status: 'failed', dueAt: 5000 };
  const bought = purchaseShopItem(appData({ missions: [mission] }), 'recovery-pass', 100, 'buy-pass');
  const invalid = useShopItem(bought.data, 'recovery-pass', mission.id, 1000, 'use-invalid');
  assert.match(invalid.error, /included recovery/i);
  assert.equal(invalid.data.inventory[0].quantity, 1);
  const eligibleData = { ...bought.data, shopHistory: [{ transactionId: 'free', id: 'free', kind: 'use', itemId: 'recovery-flow', itemName: 'Included Recovery', timestamp: 50, questId: mission.id }] };
  const valid = useShopItem(eligibleData, 'recovery-pass', mission.id, 1000, 'use-pass');
  assert.equal(valid.data.missions[0].status, 'recovery');
  assert.equal(valid.data.inventory.length, 0);
});

test('custom rewards validate price and are claimed through the same Gold ledger', () => {
  const created = createCustomReward(appData(), 'Movie night', 'Friday', 25, 300);
  assert.equal(created.error, undefined);
  assert.equal(created.data.customRewards[0].price, 25);
  const claim = purchaseShopItem(created.data, created.data.customRewards[0].id, 400, 'claim-1');
  assert.equal(claim.data.wallet.gold, 75);
  assert.equal(claim.data.goldLog[0].kind, 'custom-reward');
  assert.equal(claim.data.inventory.length, 0);
  assert.equal(claim.data.shopHistory[0].kind, 'custom-reward');
  assert.equal(createCustomReward(appData(), 'No price', '', 0, 1).error, 'PRICE MUST BE BETWEEN 1 AND 10,000 GOLD.');
});

test('purchased equipment unlocks and equips a cosmetic title without a stat claim', () => {
  const bought = purchaseShopItem(appData(), 'title-shadow-regent', 100, 'buy-title');
  assert.equal(bought.data.wallet.gold, 20);
  assert.equal(bought.data.inventory[0].itemId, 'title-shadow-regent');
  const equipped = equipShopItem(bought.data, 'title-shadow-regent', 200, 'equip-title');
  assert.equal(equipped.error, undefined);
  assert.equal(equipped.data.profile.title, 'Shadow Regent');
  assert.equal(equipped.data.shopHistory[0].kind, 'equip');
});

test('catalog prices are non-negative and items define explicit effects', () => {
  assert.ok(shopCatalog.every(item => Number.isSafeInteger(item.price) && item.price >= 0 && item.effect));
});

test('sound preference, inventory, Gold, and purchase history survive the app data save format', () => {
  const purchased = purchaseShopItem(appData({ settings: { sound: true, volume: 0.35 } }), 'deadline-extension', 500, 'persist-purchase');
  const reloaded = JSON.parse(JSON.stringify(purchased.data));
  assert.deepEqual(reloaded.settings, { sound: true, volume: 0.35 });
  assert.equal(reloaded.wallet.gold, 88);
  assert.equal(reloaded.inventory[0].itemId, 'deadline-extension');
  assert.equal(reloaded.shopHistory[0].transactionId, 'persist-purchase');
  assert.equal(reloaded.goldLog[0].transactionId, 'persist-purchase');
});
