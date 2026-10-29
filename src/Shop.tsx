import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Clock3, Gem, Gift, LockKeyhole, RotateCw, Shield, Sparkles, Sword, Zap } from 'lucide-react';
import { categoryNames, getShopItem, shopCatalog } from './shopEngine';
import type { AppData, ShopCategory, ShopItem } from './types';

type Props = {
  data: AppData; now: number;
  onPurchase: (id: string) => Promise<boolean>;
  onUse: (id: string, missionId?: string) => Promise<boolean>;
  onEquip: (id: string) => Promise<void>;
  onCreateReward: (name: string, description: string, price: number) => Promise<boolean>;
};
const categories: (ShopCategory | 'all')[] = ['all', 'mission-supplies', 'progression', 'hunter-equipment', 'custom-rewards'];
const iconMap = { rotate: RotateCw, clock: Clock3, zap: Zap, gem: Gem, shield: Shield, sparkles: Sparkles, gift: Gift, sword: Sword } as const;
const categoryLabel = (category: ShopCategory | 'all') => category === 'all' ? 'ALL ITEMS' : categoryNames[category];

export function ShopScreen({ data, now, onPurchase, onUse, onEquip, onCreateReward }: Props) {
  const [view, setView] = useState<'catalog' | 'inventory' | 'history'>('catalog');
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customPrice, setCustomPrice] = useState(20);
  const purchasePending = useRef(false);
  const customItems = data.customRewards.map(reward => getShopItem(data, reward.id)).filter((item): item is ShopItem => Boolean(item));
  const catalog = [...shopCatalog, ...customItems].filter(item => category === 'all' || item.category === category);
  const inventory = data.inventory.map(entry => ({ entry, item: getShopItem(data, entry.itemId) })).filter((value): value is { entry: AppData['inventory'][number]; item: ShopItem } => Boolean(value.item));
  const canUse = (item: ShopItem, missionId?: string) => {
    if (item.effect === 'xp-booster') return !data.activeBoosts.some(boost => boost.kind === 'xp');
    if (item.effect === 'gold-booster') return !data.activeBoosts.some(boost => boost.kind === 'gold');
    if (item.effect === 'recovery-pass') return data.missions.some(mission => mission.id === missionId && mission.status === 'failed' && data.shopHistory.some(entry => entry.kind === 'use' && entry.itemId === 'recovery-flow' && entry.questId === missionId));
    if (item.effect === 'deadline-extension') return data.missions.some(mission => mission.id === missionId && ['active', 'recovery'].includes(mission.status) && Boolean(mission.dueAt && mission.dueAt > now) && !data.shopHistory.some(entry => entry.kind === 'use' && entry.itemId === item.id && entry.questId === missionId));
    return false;
  };
  const submitCustom = async (event: FormEvent) => { event.preventDefault(); if (await onCreateReward(customName, customDescription, customPrice)) { setCustomName(''); setCustomDescription(''); setCustomPrice(20); setCustomOpen(false); } };
  const confirmPurchase = async () => {
    if (!selected || purchasePending.current) return;
    purchasePending.current = true;
    try { if (await onPurchase(selected.id)) setSelected(null); }
    finally { purchasePending.current = false; }
  };

  return <>
    <div className="shop-heading"><div><span className="muted-label">ARISE / SYSTEM EXCHANGE</span><h1>HUNTER’S SHOP<span className="period">.</span></h1><p>Spend earned Gold on useful supplies, progression boosts, and personal rewards.</p></div><div className="shop-balance"><Gem size={17}/><span><small>GOLD HELD</small><b>{data.wallet.gold.toLocaleString()}</b></span></div></div>
    <div className="shop-tabs">{(['catalog', 'inventory', 'history'] as const).map(mode => <button key={mode} className={view === mode ? 'active' : ''} onClick={() => setView(mode)}>{mode === 'catalog' ? 'SHOP' : mode.toUpperCase()}<small>{mode === 'inventory' ? data.inventory.reduce((sum, entry) => sum + entry.quantity, 0) : mode === 'history' ? data.shopHistory.length : shopCatalog.filter(item => item.available).length + customItems.length}</small></button>)}</div>

    {view === 'catalog' && <>
      <div className="shop-category-row">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{categoryLabel(item)}</button>)}</div>
      {category === 'all' || category === 'custom-rewards' ? <section className="custom-reward-callout"><div><Gift size={19}/><span><b>PERSONAL REWARDS</b><small>Choose something you will enjoy offline and set its Gold price.</small></span></div><button className="primary-small" onClick={() => setCustomOpen(!customOpen)}>{customOpen ? 'CLOSE' : 'CREATE REWARD'}</button>{customOpen && <form className="custom-reward-form" onSubmit={submitCustom}><label>REWARD NAME<input value={customName} maxLength={40} required onChange={e => setCustomName(e.target.value)} placeholder="Movie night"/></label><label>DESCRIPTION<input value={customDescription} maxLength={120} onChange={e => setCustomDescription(e.target.value)} placeholder="A reward you plan to enjoy"/></label><label>PRICE IN GOLD<input type="number" min={1} max={10000} required value={customPrice} onChange={e => setCustomPrice(Number(e.target.value))}/></label><button className="complete-button" type="submit">ADD PERSONAL REWARD <Check size={13}/></button></form>}</section> : null}
      <div className="shop-grid">{catalog.map(item => <ShopCard key={item.id} item={item} owned={data.inventory.find(entry => entry.itemId === item.id)?.quantity ?? 0} gold={data.wallet.gold} onSelect={() => setSelected(item)}/>)}</div>
    </>}

    {view === 'inventory' && <section className="inventory-list">{inventory.length ? inventory.map(({ entry, item }) => <article className="inventory-card" key={item.id}><ShopIcon item={item}/><div className="inventory-info"><div className="shop-item-tags"><span className={`rarity rarity-${item.rarity}`}>{item.rarity.toUpperCase()}</span><span>{categoryNames[item.category]}</span></div><h3>{item.name}<small>×{entry.quantity}</small></h3><p>{item.description}</p>{item.effect === 'profile-title' && <small>{data.profile.title === item.titleValue ? 'CURRENTLY EQUIPPED' : 'COSMETIC TITLE · NO STAT BONUS'}</small>}{item.effect === 'xp-booster' && data.activeBoosts.some(boost => boost.kind === 'xp') && <small>ACTIVE · {data.activeBoosts.find(boost => boost.kind === 'xp')?.remainingCompletions} QUESTS REMAINING</small>}{item.effect === 'gold-booster' && data.activeBoosts.some(boost => boost.kind === 'gold') && <small>ACTIVE · {data.activeBoosts.find(boost => boost.kind === 'gold')?.remainingCompletions} QUESTS REMAINING</small>}
          {item.effect === 'profile-title' ? <button className="quiet-button" onClick={() => void onEquip(item.id)} disabled={data.profile.title === item.titleValue}>{data.profile.title === item.titleValue ? 'EQUIPPED' : 'EQUIP TITLE'}</button>
            : ['xp-booster', 'gold-booster'].includes(item.effect) ? <button className="complete-button" onClick={() => void onUse(item.id)} disabled={!canUse(item)}>{canUse(item) ? 'ACTIVATE · NEXT 3 QUESTS' : 'BOOST ACTIVE'} <Zap size={13}/></button>
              : item.effect === 'recovery-pass' || item.effect === 'deadline-extension' ? <TargetedUse item={item} data={data} now={now} canUse={canUse} onUse={onUse}/>
                : <small>Effect is unavailable.</small>}
        </div></article>) : <div className="empty-state"><div className="empty-icon"><Gift size={22}/></div><h3>INVENTORY EMPTY</h3><p>Buy an item from the shop and it will appear here.</p></div>}</section>}

    {view === 'history' && <section className="shop-history-list">{data.shopHistory.length ? data.shopHistory.slice(0, 100).map(entry => <div className="shop-history-row" key={entry.transactionId}><span className={`history-kind kind-${entry.kind}`}>{entry.kind.toUpperCase()}</span><div><b>{entry.itemName}</b><small>{new Date(entry.timestamp).toLocaleString()}{entry.detail ? ` · ${entry.detail}` : ''}</small></div>{entry.amount !== undefined && <strong className={entry.amount < 0 ? 'spent' : ''}>{entry.amount < 0 ? '−' : '+'}{Math.abs(entry.amount)} G</strong>}</div>) : <div className="empty-state"><div className="empty-icon"><HistoryIcon/></div><h3>NO SHOP ACTIVITY</h3><p>Purchases, uses, and claimed rewards will be recorded here.</p></div>}</section>}

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="modal purchase-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">SYSTEM / PURCHASE REVIEW</span><h2>{selected.effect === 'custom-reward' ? 'CLAIM REWARD?' : 'CONFIRM PURCHASE?'}</h2></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close">×</button></div><div className="purchase-item"><ShopIcon item={selected}/><div><b>{selected.name}</b><p>{selected.description}</p></div></div><div className="purchase-price"><span>PRICE</span><b><Gem size={15}/> {selected.price} GOLD</b><small>Balance after: {Math.max(0, data.wallet.gold - selected.price)} G</small></div>{(!selected.available || selected.effect === 'locked') && <p className="purchase-restriction"><LockKeyhole size={14}/>{selected.lockedReason}</p>}{data.wallet.gold < selected.price && <p className="purchase-restriction">You need {selected.price - data.wallet.gold} more Gold.</p>}<button className="submit-button" disabled={!selected.available || selected.effect === 'locked' || (selected.maxOwned !== undefined && (data.inventory.find(entry => entry.itemId === selected.id)?.quantity ?? 0) >= selected.maxOwned)} onClick={() => void confirmPurchase()}>{data.wallet.gold < selected.price ? 'INSUFFICIENT GOLD' : selected.effect === 'custom-reward' ? 'CLAIM WITH GOLD' : 'CONFIRM PURCHASE'} <Gem size={14}/></button></section></div>}
  </>;
}

function ShopCard({ item, owned, gold, onSelect }: { item: ShopItem; owned: number; gold: number; onSelect: () => void }) {
  const maxed = item.maxOwned !== undefined && owned >= item.maxOwned;
  return <article className={`shop-card ${!item.available ? 'shop-locked' : ''}`}><div className="shop-card-top"><ShopIcon item={item}/><span className={`rarity rarity-${item.rarity}`}>{item.rarity.toUpperCase()}</span></div><div className="shop-item-tags"><span>{categoryNames[item.category]}</span>{item.consumable && <span>CONSUMABLE</span>}{owned > 0 && <span>OWNED {owned}</span>}</div><h3>{item.name}</h3><p>{item.description}</p>{!item.available && <small className="locked-note"><LockKeyhole size={12}/>{item.lockedReason}</small>}<div className="shop-card-bottom"><b><Gem size={14}/>{item.price} G</b><button className="quiet-button" disabled={!item.available || maxed} onClick={onSelect}>{!item.available ? 'LOCKED' : maxed ? 'OWNED' : gold < item.price ? `NEED ${item.price - gold} G` : item.effect === 'custom-reward' ? 'CLAIM' : 'DETAILS'}</button></div></article>;
}

function ShopIcon({ item }: { item: ShopItem }) { const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Gift; return <span className={`shop-icon rarity-${item.rarity}`}><Icon size={19}/></span>; }
function TargetedUse({ item, data, now, canUse, onUse }: { item: ShopItem; data: AppData; now: number; canUse: (item: ShopItem, missionId?: string) => boolean; onUse: (id: string, missionId?: string) => Promise<boolean> }) {
  const candidates = data.missions.filter(mission => item.effect === 'recovery-pass' ? mission.status === 'failed' && data.shopHistory.some(entry => entry.kind === 'use' && entry.itemId === 'recovery-flow' && entry.questId === mission.id) : ['active', 'recovery'].includes(mission.status) && Boolean(mission.dueAt && mission.dueAt > now) && !data.shopHistory.some(entry => entry.kind === 'use' && entry.itemId === item.id && entry.questId === mission.id));
  const [missionId, setMissionId] = useState(candidates[0]?.id ?? '');
  return <div className="targeted-use"><select aria-label={`Choose quest for ${item.name}`} value={candidates.some(mission => mission.id === missionId) ? missionId : candidates[0]?.id ?? ''} onChange={event => setMissionId(event.target.value)}><option value="">CHOOSE ELIGIBLE QUEST</option>{candidates.map(mission => <option key={mission.id} value={mission.id}>{mission.title}</option>)}</select><button className="complete-button" disabled={!canUse(item, missionId)} onClick={() => void onUse(item.id, missionId)}>{item.effect === 'recovery-pass' ? 'OPEN RECOVERY' : 'EXTEND 24H'} <Check size={13}/></button></div>;
}
function HistoryIcon() { return <Gift size={22}/>; }



