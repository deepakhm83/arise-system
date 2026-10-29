import { ArrowLeft, Award, ChevronRight, Compass, Crown, Flame, Gem, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import type { AppData, RankId } from './types.ts';
import { ACHIEVEMENTS, RANK_CONFIG, RANK_ORDER, TITLES } from './progressionConfig.ts';
import { progressionMetrics } from './progressionEngine.ts';
import { DUNGEONS } from './dungeonEngine.ts';

const rankRequirements = (data: AppData) => {
  const rank = data.progression.rank;
  const requirements = RANK_CONFIG[rank].next;
  if (!requirements) return undefined;
  const metrics = progressionMetrics(data);
  const next = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
  return { next, items: [
    { label: 'CHARACTER LEVEL', current: data.profile.level, target: requirements.level },
    { label: 'QUESTS CLEARED', current: metrics.quests, target: requirements.quests },
    { label: 'DUNGEONS CLEARED', current: metrics.dungeons, target: requirements.dungeons },
    { label: 'ACHIEVEMENTS', current: data.progression.achievements.length, target: requirements.achievements },
  ] };
};

export function PlayerProgress({ data, onOpen, onAcceptSpecial, onDeclineSpecial, onDeferSpecial, onOpenMission }: { data: AppData; onOpen: (tab: 'titles' | 'achievements' | 'rank-history' | 'dungeons') => void; onAcceptSpecial: (id: string) => void; onDeclineSpecial: (id: string) => void; onDeferSpecial: (id: string) => void; onOpenMission: (id: string) => void }) {
  const requirement = rankRequirements(data);
  const unlocked = data.progression.achievements;
  const recent = unlocked.slice().sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 2);
  const title = TITLES.find(item => item.id === data.progression.equippedTitleId);
  const activeSpecial = data.missions.find(item => item.period === 'special' && ['offered', 'active', 'recovery'].includes(item.status));
  const activeDungeon = data.dungeons.runs.find(run => !run.completedAt);
  const activeDungeonDefinition = activeDungeon && DUNGEONS.find(item => item.id === activeDungeon.dungeonId);
  const rank = RANK_CONFIG[data.progression.rank];
  return <section className="progress-hub">
    <div className="rank-feature"><div className="rank-emblem" aria-label={`${rank.label} emblem`}>{rank.emblem}</div><div className="rank-feature-copy"><span className="muted-label">CURRENT HUNTER RANK</span><b>{rank.label}</b><small>{title?.name ?? data.profile.title} · EQUIPPED</small></div><button className="text-button" onClick={() => onOpen('rank-history')}>RANK HISTORY <ChevronRight size={13}/></button></div>
    {requirement ? <div className="rank-requirements"><div className="rank-next-label">NEXT RANK <b>{requirement.next === 'NATIONAL' ? 'NATIONAL LEVEL' : `${requirement.next}-RANK`}</b></div><div className="rank-criteria">{requirement.items.map(item => <div className="rank-criterion" key={item.label}><span>{item.label}</span><b>{item.current}/{item.target}</b><i><em style={{ width: `${item.target ? Math.min(100, item.current / item.target * 100) : 100}%` }}/></i></div>)}</div></div> : <div className="rank-criteria rank-max"><Crown size={16}/> NATIONAL LEVEL REACHED · PRESTIGIOUS FINAL TIER</div>}
    <div className="progress-shortcuts"><button onClick={() => onOpen('titles')}><Award size={15}/><span><b>TITLES</b><small>{data.progression.titles.length}/{TITLES.length} collected</small></span><ChevronRight size={13}/></button><button onClick={() => onOpen('achievements')}><Trophy size={15}/><span><b>ACHIEVEMENTS</b><small>{unlocked.length}/{ACHIEVEMENTS.length} unlocked</small></span><ChevronRight size={13}/></button><button onClick={() => onOpen('dungeons')}><Compass size={15}/><span><b>DUNGEONS</b><small>{data.dungeons.completedIds.length} cleared · {data.dungeons.runs.filter(run => !run.completedAt).length} active</small></span><ChevronRight size={13}/></button></div>
    {activeDungeon && activeDungeonDefinition && <button className="active-dungeon-chip" onClick={() => onOpen('dungeons')}><Compass size={15}/><span><b>ACTIVE DUNGEON · {activeDungeonDefinition.title}</b><small>STAGE {Math.min(activeDungeon.currentStage + 1, activeDungeon.stages.length)} / {activeDungeonDefinition.stages.length}</small></span><ChevronRight size={13}/></button>}
    <div className="recent-achievements"><div className="section-heading"><div><span className="section-index">RECENT /</span><h2>ACHIEVEMENTS</h2></div><button className="text-button" onClick={() => onOpen('achievements')}>ALL <ChevronRight size={12}/></button></div>{recent.length ? recent.map(record => { const achievement = ACHIEVEMENTS.find(item => item.id === record.id); return achievement ? <div className="recent-achievement" key={record.id}><Trophy size={15}/><span><b>{achievement.name}</b><small>{new Date(record.unlockedAt).toLocaleDateString()}</small></span><i>{achievement.rarity}</i></div> : null; }) : <p className="collection-empty">Your first achievement unlocks when you clear a verified quest.</p>}</div>
    <div className="streak-rule"><Flame size={14}/><span><b>{data.elite.currentStreak} DAY STREAK</b><small>Complete a daily quest for each streak day. Scheduled rest days and paused days protect the streak; a missed day ends the current streak but keeps your longest.</small></span></div>
    {activeSpecial && <SpecialQuestPanel mission={activeSpecial} onAccept={() => onAcceptSpecial(activeSpecial.id)} onDecline={() => onDeclineSpecial(activeSpecial.id)} onDefer={() => onDeferSpecial(activeSpecial.id)} onOpen={() => onOpenMission(activeSpecial.id)}/>}
  </section>;
}

export function SpecialQuestPanel({ mission, onAccept, onDecline, onDefer, onOpen }: { mission: AppData['missions'][number]; onAccept: () => void; onDecline: () => void; onDefer: () => void; onOpen: () => void }) {
  return <article className={`special-panel rarity-${(mission.specialRarity ?? 'COMMON').toLowerCase()}`} role="region" aria-live="polite" aria-label={`${mission.specialRarity ?? 'Common'} special quest ${mission.title}`}><div className="special-panel-head"><Sparkles size={16}/><span>SPECIAL QUEST · {mission.specialKind === 'milestone' ? 'MILESTONE · ONE TIME' : mission.optional ? 'OPTIONAL EVENT · REPEATS AFTER COOLDOWN' : 'TIME-LIMITED EVENT'}</span><b>{mission.specialRarity}</b></div><h3>{mission.title}</h3><div className="special-tags"><span>{mission.category}</span><span>{mission.difficulty}</span><span>{mission.estimatedMinutes ?? 0} MIN</span></div><p>{mission.description}</p><small className="special-progression-note">Verified completion may advance related titles or achievements. The System checks recorded quest activity.</small><div className="special-rewards"><span><Zap size={12}/> +{mission.xp} XP</span><span><Gem size={12}/> +{mission.gold} G</span>{mission.dueAt && <small>ENDS {new Date(mission.dueAt).toLocaleString()}</small>}</div><div className="special-actions">{mission.status === 'offered' ? <><button className="complete-button" onClick={onAccept}>ACCEPT</button><button className="quiet-button" onClick={onDefer} disabled={(mission.deferCount ?? 0) >= 1}>DEFER 24H</button>{mission.optional && <button className="quiet-button" onClick={onDecline}>DECLINE</button>}</> : <button className="complete-button" onClick={onOpen}>OPEN QUEST</button>}</div></article>;
}

export function TitlesScreen({ data, onBack, onEquip }: { data: AppData; onBack: () => void; onEquip: (id: string) => void }) {
  const metrics = progressionMetrics(data);
  return <><CollectionHeader index="06" title="TITLES" subtitle="Earn a name through the work you do." onBack={onBack}/><div className="collection-list">{TITLES.map(title => {
    const record = data.progression.titles.find(item => item.id === title.id);
    const hasShopTitle = title.condition.metric === 'shop-title' && (data.inventory.some(item => item.itemId === title.condition.target) || data.shopHistory.some(entry => entry.itemId === title.condition.target && entry.kind === 'purchase'));
    const current = title.condition.metric === 'shop-title' ? Number(hasShopTitle) : title.condition.metric === 'rank' ? RANK_ORDER.indexOf(data.progression.rank) : title.condition.metric === 'quests' && title.condition.target === 0 ? Number(data.profile.setupComplete) : metrics[title.condition.metric as keyof typeof metrics];
    const target = title.condition.metric === 'shop-title' ? 1 : title.condition.metric === 'rank' ? RANK_ORDER.indexOf(title.condition.target as RankId) : Number(title.condition.target);
    const progress = title.condition.metric === 'shop-title' ? (hasShopTitle ? 'UNLOCKED' : 'OWN FROM THE HUNTER’S SHOP') : title.condition.metric === 'rank' ? `${data.progression.rank} / ${title.condition.target}` : `${Math.min(current, target)} / ${target}`;
    const equipped = data.progression.equippedTitleId === title.id;
    return <article className={`collection-card ${record ? 'is-unlocked' : ''}`} key={title.id}><div className={`collection-icon rarity-${title.rarity.toLowerCase()}`}>{title.icon}</div><div className="collection-copy"><div className="collection-label"><b>{title.name}</b><i>{title.rarity}</i></div><p>{title.description}</p><small>{record ? `UNLOCKED ${new Date(record.unlockedAt).toLocaleDateString()}` : `PROGRESS ${progress}`}</small>{record && <button className={equipped ? 'quiet-button title-equipped' : 'complete-button'} disabled={equipped} onClick={() => onEquip(title.id)}>{equipped ? 'EQUIPPED' : 'EQUIP TITLE'}</button>}</div></article>;
  })}</div></>;
}

export function AchievementsScreen({ data, onBack }: { data: AppData; onBack: () => void }) {
  const metrics = progressionMetrics(data);
  return <><CollectionHeader index="07" title="ACHIEVEMENTS" subtitle="Progress is earned through recorded app activity." onBack={onBack}/><div className="collection-list">{ACHIEVEMENTS.map(achievement => {
    const record = data.progression.achievements.find(item => item.id === achievement.id);
    const progress = Math.min(achievement.target, metrics[achievement.metric]);
    return <article className={`collection-card ${record ? 'is-unlocked' : ''}`} key={achievement.id}><div className={`collection-icon rarity-${achievement.rarity.toLowerCase()}`}><Trophy size={19}/></div><div className="collection-copy"><div className="collection-label"><b>{achievement.name}</b><i>{achievement.rarity}</i></div><p>{achievement.description}</p><div className="achievement-progress"><span>{record ? `UNLOCKED ${new Date(record.unlockedAt).toLocaleDateString()}` : `${achievement.category} · ${progress}/${achievement.target}`}</span><b>{achievement.rewardXp} XP</b></div>{!record && <i className="progress-track"><em style={{ width: `${progress / achievement.target * 100}%` }}/></i>}</div></article>;
  })}</div></>;
}

export function RankHistoryScreen({ data, onBack }: { data: AppData; onBack: () => void }) {
  return <><CollectionHeader index="08" title="RANK HISTORY" subtitle="Permanent record of each earned Hunter rank." onBack={onBack}/><div className="rank-timeline">{data.progression.rankHistory.slice().reverse().map((record, index) => <article className="rank-history-card" key={`${record.rank}-${record.earnedAt}-${index}`}><div className="rank-history-emblem">{RANK_CONFIG[record.rank].emblem}</div><div><b>{RANK_CONFIG[record.rank].label}</b><p>{record.reason}</p><small>{new Date(record.earnedAt).toLocaleString()}</small></div></article>)}</div>{rankRequirements(data) && <p className="system-note"><Shield size={15}/> Next rank progress is shown on the Player screen. Rank changes are deterministic and never use random chance.</p>}</>;
}

export function RankCelebration({ rank, onClose }: { rank: RankId; onClose: () => void }) {
  const config = RANK_CONFIG[rank];
  return <div className="modal-backdrop rank-celebration-backdrop" role="dialog" aria-modal="true" aria-labelledby="rank-celebration-title"><section className="rank-celebration"><div className="rank-celebration-ring"><span>{config.emblem}</span></div><span className="eyebrow">SYSTEM / RANK ASCENSION</span><h1 id="rank-celebration-title">RANK UP</h1><h2>{config.label}</h2><p>Your recorded progress met every configured Hunter-rank condition.</p><button className="submit-button" onClick={onClose}>CONTINUE <ChevronRight size={15}/></button></section></div>;
}

export function UnlockCelebration({ name, description, rarity, icon, kind, onClose }: { name: string; description: string; rarity: string; icon: string; kind: 'TITLE' | 'ACHIEVEMENT'; onClose: () => void }) {
  return <div className="modal-backdrop rank-celebration-backdrop" role="dialog" aria-modal="true" aria-labelledby="unlock-title"><section className="rank-celebration unlock-celebration"><div className="rank-celebration-ring"><span>{icon}</span></div><span className="eyebrow">SYSTEM / {kind} UNLOCKED · {rarity}</span><h1 id="unlock-title">{name}</h1><p>{description}</p><button className="submit-button" onClick={onClose}>CONTINUE <ChevronRight size={15}/></button></section></div>;
}

export function DungeonsScreen({ data, onBack, onStart, onOpenMission }: { data: AppData; onBack: () => void; onStart: (id: string) => void; onOpenMission: (id: string) => void }) {
  const activeRun = data.dungeons.runs.find(run => !run.completedAt);
  const activeDungeon = activeRun && DUNGEONS.find(dungeon => dungeon.id === activeRun.dungeonId);
  const stageMission = activeRun && data.missions.find(mission => mission.id === activeRun.stages[activeRun.currentStage]?.missionId);
  return <><CollectionHeader index="09" title="DUNGEONS" subtitle="Multi-stage challenges. Clear every gate to claim the dungeon." onBack={onBack}/>{activeRun && activeDungeon && <section className="active-dungeon"><div className="muted-label">ACTIVE DUNGEON · {activeDungeon.theme}</div><h2>{activeDungeon.title}</h2><div className="dungeon-stage-list">{activeDungeon.stages.map((stage, index) => <div className={`dungeon-stage ${index < activeRun.currentStage ? 'stage-cleared' : index === activeRun.currentStage ? 'stage-current' : ''}`} key={stage.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{stage.title}</b><small>{index < activeRun.currentStage ? 'CLEARED' : index === activeRun.currentStage ? 'CURRENT GATE' : 'LOCKED'}</small></div>)}</div>{stageMission && <button className="complete-button" onClick={() => onOpenMission(stageMission.id)}>CONTINUE CURRENT STAGE <ChevronRight size={14}/></button>}</section>}<div className="dungeon-grid">{DUNGEONS.map(dungeon => {
    const completed = data.dungeons.completedIds.includes(dungeon.id);
    const runCount = data.dungeons.runs.filter(run => run.dungeonId === dungeon.id).length;
    return <article className="dungeon-card" key={dungeon.id}><div className="dungeon-card-mark"><Compass size={21}/></div><span className="muted-label">{dungeon.stages.length} STAGES · {runCount} RUNS</span><h3>{dungeon.title}</h3><p>{dungeon.theme}</p><small>{dungeon.stages.map(stage => stage.title).join(' → ')}</small>{completed && <b className="dungeon-cleared">CLEARED BEFORE</b>}<button className="complete-button" disabled={Boolean(activeRun)} onClick={() => onStart(dungeon.id)}>{activeRun ? 'ANOTHER DUNGEON ACTIVE' : 'ENTER DUNGEON'}</button></article>;
  })}</div><section className="dungeon-records"><h2>CLEAR RECORDS</h2>{data.dungeons.runs.filter(run => run.completedAt).length ? data.dungeons.runs.filter(run => run.completedAt).slice().reverse().map(run => <p key={`${run.dungeonId}-${run.startedAt}`}>{DUNGEONS.find(item => item.id === run.dungeonId)?.title} · {new Date(run.completedAt!).toLocaleDateString()}</p>) : <p>No dungeon clears recorded yet. Each stage uses its configured timer, checklist, measurable result, or reflection.</p>}</section></>;
}

function CollectionHeader({ index, title, subtitle, onBack }: { index: string; title: string; subtitle: string; onBack: () => void }) {
  return <><button className="text-button collection-back" onClick={onBack}><ArrowLeft size={14}/> PLAYER</button><div className="page-title"><div className="title-index">SYSTEM MODULE <b>{index}</b></div><h1>{title}<span className="period">.</span></h1><p>{subtitle}</p></div></>;
}
