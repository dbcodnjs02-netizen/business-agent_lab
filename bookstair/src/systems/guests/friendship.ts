import type { ChatterLine } from '../../types/character';
import type { ScriptId } from '../../types/content';
import type {
  CurationEvent,
  CurationEventId,
  Episode,
  EpisodeId,
  GuestDefinition,
  GuestId,
  GuestProgress,
} from '../../types/guest';

export const MAX_FRIENDSHIP_LEVEL = 5;

/** index = 현재 레벨, 값 = 다음 레벨까지 필요한 exp */
const EXP_TO_NEXT = [20, 40, 70, 110, 160] as const;

/** 최대 레벨이면 null */
export function expToNext(level: number): number | null {
  return level >= MAX_FRIENDSHIP_LEVEL ? null : EXP_TO_NEXT[level];
}

export function createProgress(guestId: GuestId, friendshipLevel = 0, exp = 0, isRegular = true): GuestProgress {
  return { guestId, isRegular, friendshipLevel, exp, unlockedEpisodes: [], completedCurations: [], visitCount: 0 };
}

/** 현재 레벨로 열 수 있는 에피소드를 해제 */
export function unlockEpisodes(
  progress: GuestProgress,
  guest: GuestDefinition,
  episodes: Record<EpisodeId, Episode>,
): { progress: GuestProgress; newlyUnlocked: EpisodeId[] } {
  const newlyUnlocked = guest.episodes.filter((id) => {
    const ep = episodes[id];
    return ep && ep.requiredLevel <= progress.friendshipLevel && !progress.unlockedEpisodes.includes(id);
  });
  if (newlyUnlocked.length === 0) return { progress, newlyUnlocked };
  return {
    progress: { ...progress, unlockedEpisodes: [...progress.unlockedEpisodes, ...newlyUnlocked] },
    newlyUnlocked,
  };
}

export interface ExpGain {
  progress: GuestProgress;
  levelsGained: number;
  newlyUnlocked: EpisodeId[];
}

/** exp 추가 → 레벨업(여러 단계 가능) → 에피소드 해제 */
export function gainExp(
  progress: GuestProgress,
  amount: number,
  guest: GuestDefinition,
  episodes: Record<EpisodeId, Episode>,
): ExpGain {
  let level = progress.friendshipLevel;
  let exp = progress.exp + Math.max(0, amount);
  let need = expToNext(level);
  while (need !== null && exp >= need) {
    exp -= need;
    level += 1;
    need = expToNext(level);
  }
  if (need === null) exp = 0;

  const { progress: next, newlyUnlocked } = unlockEpisodes(
    { ...progress, friendshipLevel: level, exp },
    guest,
    episodes,
  );
  return { progress: next, levelsGained: level - progress.friendshipLevel, newlyUnlocked };
}

/** 레벨 조건을 만족하는 인사 중 가장 높은 단계 (없으면 가장 낮은 단계) */
export function pickGreeting(guest: GuestDefinition, level: number): ScriptId {
  const byLevel = [...guest.greetings].sort((a, b) => a.minLevel - b.minLevel);
  return (byLevel.filter((g) => g.minLevel <= level).pop() ?? byLevel[0]).scriptId;
}

/** 레벨 조건을 만족하고 아직 완료하지 않은 첫 큐레이션 이벤트 */
export function nextCurationEvent(
  guest: GuestDefinition,
  progress: GuestProgress,
  events: Record<CurationEventId, CurationEvent>,
): CurationEvent | null {
  for (const id of guest.curationEvents) {
    const ev = events[id];
    if (ev && ev.requiredLevel <= progress.friendshipLevel && !progress.completedCurations.includes(id)) {
      return ev;
    }
  }
  return null;
}

/** 지금 친밀도에서 매장 혼잣말로 나올 수 있는 대사 */
export function chatterFor(guest: GuestDefinition, level: number): ChatterLine[] {
  return guest.chatter.filter((line) => (line.minLevel ?? 0) <= level);
}
