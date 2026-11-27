import type { Book } from '../../types/content';
import type { CurationEvent, CurationGrade, GuestPreferences, Reward } from '../../types/guest';

export const DEFAULT_CURATION_REWARDS: Record<CurationGrade, Reward> = {
  perfect: { exp: 40, coins: 150, reputation: 3 },
  good: { exp: 20, coins: 80, reputation: 1 },
  miss: { exp: 5, coins: 30 },
};

/**
 * 추천한 책의 등급.
 * - 싫어하는 태그가 있거나 고민 태그와 하나도 안 맞으면 miss
 * - 점수 = 고민 태그 일치 × 2 + 취향 태그 일치, 4점 이상이면 perfect
 */
export function gradeCuration(book: Book, event: CurationEvent, prefs: GuestPreferences): CurationGrade {
  if (book.tags.some((t) => prefs.dislikedBookTags.includes(t))) return 'miss';
  const needHits = book.tags.filter((t) => event.needTags.includes(t)).length;
  if (needHits === 0) return 'miss';
  const likedHits = book.tags.filter((t) => prefs.likedBookTags.includes(t)).length;
  return needHits * 2 + likedHits >= 4 ? 'perfect' : 'good';
}

export function curationReward(event: CurationEvent, grade: CurationGrade): Reward {
  return event.rewards?.[grade] ?? DEFAULT_CURATION_REWARDS[grade];
}
