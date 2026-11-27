import { describe, expect, it } from 'vitest';
import { isLook } from '../systems/characters/look';
import { gradeCuration } from '../systems/guests/curation';
import { chatterFor } from '../systems/guests/friendship';
import { analyzeLayout } from '../systems/interior/connections';
import { sanitizeLayout } from '../systems/interior/grid';
import { BOOKS } from './books';
import { CUSTOMER_TYPES } from './customers';
import { DRINKS } from './drinks';
import { FURNITURE, INITIAL_INVENTORY, INITIAL_LAYOUT, INTERIOR } from './furniture';
import { ALL_REGULARS, CURATION_EVENTS, EPISODES, GUESTS, castingCandidate, createInitialGuestProgress, guestsForDay } from './guests';
import { NEIGHBOR_STORES } from './neighbors';
import { SCRIPTS } from './scripts';

// 콘텐츠 데이터의 ID 연결이 끊기지 않았는지 검사

describe('손님 콘텐츠 연결', () => {
  for (const guest of Object.values(GUESTS)) {
    describe(guest.name, () => {
      it('인사·에피소드·이벤트 대사가 모두 존재', () => {
        const scriptIds = [
          ...guest.greetings.map((g) => g.scriptId),
          ...guest.episodes.map((id) => EPISODES[id]?.scriptId),
          ...[guest.castingEvent, ...guest.curationEvents].flatMap((id) => {
            const ev = CURATION_EVENTS[id];
            return ev ? [ev.introScriptId, ...Object.values(ev.reactions)] : [`<missing event ${id}>`];
          }),
        ];
        const missing = scriptIds.filter((id) => !id || !SCRIPTS[id]);
        expect(missing).toEqual([]);
      });

      it('외형이 유효하고, 처음 만났을 때도 혼잣말이 있다', () => {
        expect(isLook(guest.look)).toBe(true);
        expect(chatterFor(guest, 0).length).toBeGreaterThan(0);
      });

      it('모든 큐레이션 이벤트에 perfect 를 받을 수 있는 책이 있다', () => {
        for (const id of [guest.castingEvent, ...guest.curationEvents]) {
          const ev = CURATION_EVENTS[id];
          const grades = BOOKS.map((b) => gradeCuration(b, ev, guest.preferences));
          expect(grades, id).toContain('perfect');
        }
      });
    });
  }

  it('오늘의 손님은 모두 정의되어 있다', () => {
    expect(ALL_REGULARS.filter((id) => !GUESTS[id])).toEqual([]);
  });

  it('처음엔 단골이 없고, 단골 후보가 날마다 돌아가며 한 명씩 온다', () => {
    const p = createInitialGuestProgress();
    expect(Object.values(p).filter((x) => x.isRegular)).toEqual([]);
    expect(guestsForDay(1, p)).toEqual(['seoyun']);
    expect(guestsForDay(2, p)).toEqual(['dogyeom']);
    // 오늘 캐스팅에 실패해 돌아간 손님은 다시 오지 않는다
    expect(castingCandidate(1, p, ['seoyun'])).toBeNull();
    // 단골이 되면 매일 오고, 후보는 남은 손님 중에서
    const cast = { ...p, seoyun: { ...p.seoyun, isRegular: true } };
    expect(guestsForDay(1, cast)).toEqual(['seoyun', 'dogyeom']);
    expect(guestsForDay(2, cast)).toEqual(['seoyun', 'harin']);
    const all = Object.fromEntries(ALL_REGULARS.map((id) => [id, { ...p[id], isRegular: true }]));
    expect(guestsForDay(5, all)).toEqual(ALL_REGULARS);
  });

  it('가게가 4레벨이 되기 전엔 단골 후보가 오지 않는다 (이미 단골이면 온다)', () => {
    const p = createInitialGuestProgress();
    expect(guestsForDay(1, p, [], 3)).toEqual([]);
    expect(guestsForDay(1, p, [], 4)).toEqual(['seoyun']);
    const cast = { ...p, seoyun: { ...p.seoyun, isRegular: true } };
    expect(guestsForDay(1, cast, [], 1)).toEqual(['seoyun']);
  });
});

describe('처음 가게 (튜토리얼)', () => {
  it('빈 가게에서 시작하고, 보관함엔 책상 2 · 의자 4 · 커피머신 1', () => {
    expect(INITIAL_LAYOUT).toEqual([]);
    expect(INITIAL_INVENTORY).toEqual({ desk: 2, armchair: 4, 'coffee-machine': 1 });
  });

  it('보관함 가구만으로 의자 4개가 모두 책상에 연결되고 커피 메뉴가 생기는 배치가 있다', () => {
    const p = (uid: string, furnitureId: string, x: number, y: number, rotation: 0 | 1 | 2 | 3 = 0) => ({ uid, furnitureId, x, y, rotation });
    const layout = [
      p('d1', 'desk', 2, 4),
      p('d2', 'desk', 6, 4),
      p('c1', 'armchair', 2, 3),
      p('c2', 'armchair', 3, 3),
      p('c3', 'armchair', 6, 5, 2),
      p('c4', 'armchair', 7, 5, 2),
      p('m', 'coffee-machine', 4, 0),
    ];
    const used = layout.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.furnitureId]: (acc[x.furnitureId] ?? 0) + 1 }), {});
    expect(used).toEqual(INITIAL_INVENTORY);
    expect(sanitizeLayout(layout, INTERIOR)).toHaveLength(layout.length);
    const a = analyzeLayout(layout, INTERIOR);
    expect(a.seatSlots).toHaveLength(4);
    expect(a.menu.length).toBeGreaterThan(0);
  });

  it('보관함 가구는 카탈로그에 있다', () => {
    expect(Object.keys(INITIAL_INVENTORY).filter((id) => !FURNITURE[id])).toEqual([]);
  });
});

describe('이웃 서점 목업', () => {
  for (const store of NEIGHBOR_STORES) {
    it(`${store.storeName}: 배치가 규칙을 통과`, () => {
      expect(sanitizeLayout(store.layout, INTERIOR)).toHaveLength(store.layout.length);
    });
  }

  it('독서가 외형이 모두 유효', () => {
    const bad = NEIGHBOR_STORES.flatMap((s) => s.readers.filter((r) => !isLook(r.look)).map((r) => r.id));
    expect(bad).toEqual([]);
  });

  it('독서가 id 는 전체에서 유일', () => {
    const ids = NEIGHBOR_STORES.flatMap((s) => s.readers.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('손님 도감 유형', () => {
  it('일반 손님은 모두 사람이고 외형·좋아하는 음료가 유효', () => {
    for (const t of CUSTOMER_TYPES) {
      expect(isLook(t.look), t.id).toBe(true);
      expect(t.look.species ?? 'human', t.id).toBe('human');
      expect(DRINKS[t.favoriteDrink], t.id).toBeDefined();
    }
  });

  it('단골은 모두 동물', () => {
    expect(Object.values(GUESTS).filter((g) => (g.look.species ?? 'human') === 'human')).toEqual([]);
  });

  it('유형 id 는 유일', () => {
    expect(new Set(CUSTOMER_TYPES.map((t) => t.id)).size).toBe(CUSTOMER_TYPES.length);
  });
});
