import { describe, expect, it } from 'vitest';
import type { Book } from '../../types/content';
import type { CurationEvent, Episode, GuestDefinition } from '../../types/guest';
import { lookFromSeed } from '../characters/look';
import { gradeCuration } from './curation';
import {
  MAX_FRIENDSHIP_LEVEL,
  chatterFor,
  createProgress,
  gainExp,
  nextCurationEvent,
  pickGreeting,
  unlockEpisodes,
} from './friendship';

const guest: GuestDefinition = {
  id: 'g',
  name: '테스트',
  title: '',
  look: lookFromSeed(1),
  personality: [],
  bio: '',
  idleAction: 'read',
  chatter: [{ text: '안녕' }, { text: '친해졌네', minLevel: 2 }],
  preferences: { favoriteDrinks: [], likedBookTags: ['도전'], dislikedBookTags: ['그리움'] },
  greetings: [
    { minLevel: 3, scriptId: 'greet.3' },
    { minLevel: 0, scriptId: 'greet.0' },
  ],
  episodes: ['ep1', 'ep2'],
  curationEvents: ['cur1', 'cur2'],
  castingEvent: 'cast',
};

const episodes: Record<string, Episode> = {
  ep1: { id: 'ep1', title: '', summary: '', requiredLevel: 1, scriptId: 'x' },
  ep2: { id: 'ep2', title: '', summary: '', requiredLevel: 3, scriptId: 'x' },
};

const event = (id: string, requiredLevel: number): CurationEvent => ({
  id,
  requiredLevel,
  introScriptId: 'x',
  worry: '',
  needTags: ['시작', '용기'],
  reactions: { perfect: 'x', good: 'x', miss: 'x' },
});
const events = { cur1: event('cur1', 0), cur2: event('cur2', 2) };

describe('gainExp', () => {
  it('필요 exp 를 채우면 레벨업하고 남은 exp 를 이월', () => {
    const r = gainExp(createProgress('g'), 25, guest, episodes);
    expect(r.progress).toMatchObject({ friendshipLevel: 1, exp: 5 });
    expect(r.levelsGained).toBe(1);
  });

  it('한 번에 여러 레벨을 올리고 에피소드를 해제', () => {
    const r = gainExp(createProgress('g'), 20 + 40 + 70, guest, episodes);
    expect(r.progress.friendshipLevel).toBe(3);
    expect(r.newlyUnlocked).toEqual(['ep1', 'ep2']);
  });

  it('최대 레벨에서 멈추고 exp 는 0', () => {
    const r = gainExp(createProgress('g'), 99999, guest, episodes);
    expect(r.progress).toMatchObject({ friendshipLevel: MAX_FRIENDSHIP_LEVEL, exp: 0 });
  });

  it('음수 exp 는 무시', () => {
    expect(gainExp(createProgress('g', 1, 5), -10, guest, episodes).progress.exp).toBe(5);
  });
});

describe('unlockEpisodes', () => {
  it('이미 해제한 에피소드는 다시 해제하지 않는다', () => {
    const first = unlockEpisodes(createProgress('g', 3), guest, episodes);
    const again = unlockEpisodes(first.progress, guest, episodes);
    expect(first.newlyUnlocked).toEqual(['ep1', 'ep2']);
    expect(again.newlyUnlocked).toEqual([]);
  });
});

describe('대사·이벤트 선택', () => {
  it('pickGreeting: 정의 순서와 무관하게 가장 높은 단계', () => {
    expect(pickGreeting(guest, 0)).toBe('greet.0');
    expect(pickGreeting(guest, 4)).toBe('greet.3');
  });

  it('nextCurationEvent: 완료한 이벤트와 레벨 미달 이벤트는 건너뜀', () => {
    expect(nextCurationEvent(guest, createProgress('g', 1), events)?.id).toBe('cur1');
    const done = { ...createProgress('g', 1), completedCurations: ['cur1'] };
    expect(nextCurationEvent(guest, done, events)).toBeNull();
    expect(nextCurationEvent(guest, { ...done, friendshipLevel: 2 }, events)?.id).toBe('cur2');
  });
});

describe('gradeCuration', () => {
  const book = (tags: Book['tags']): Book => ({ id: '', title: '', author: '', tone: 'wood', tags, quotes: [] });
  const ev = events.cur1;

  it('고민 태그 2개 일치 → perfect', () => {
    expect(gradeCuration(book(['시작', '용기']), ev, guest.preferences)).toBe('perfect');
  });
  it('고민 1개 + 취향 1개 → good', () => {
    expect(gradeCuration(book(['시작', '도전']), ev, guest.preferences)).toBe('good');
  });
  it('고민 태그 불일치 → miss', () => {
    expect(gradeCuration(book(['휴식']), ev, guest.preferences)).toBe('miss');
  });
  it('싫어하는 태그가 섞이면 miss', () => {
    expect(gradeCuration(book(['시작', '용기', '그리움']), ev, guest.preferences)).toBe('miss');
  });
});

describe('chatterFor', () => {
  it('친밀도가 오르면 혼잣말이 늘어난다', () => {
    expect(chatterFor(guest, 0).map((l) => l.text)).toEqual(['안녕']);
    expect(chatterFor(guest, 2)).toHaveLength(2);
  });
});
