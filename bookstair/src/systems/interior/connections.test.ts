import { describe, expect, it } from 'vitest';
import type { Book } from '../../types/content';
import { analyzeLayout, availableBooks, memoBoardSpot, seatVisitors } from './connections';
import { place, testCtx as ctx } from './testCatalog';

describe('소파 ↔ 책상 연결', () => {
  it('소파 바로 앞에 책상이 있으면 연결되고 좌석 수만큼 자리가 생긴다', () => {
    const a = analyzeLayout([place('s', 'sofa', 0, 1), place('d', 'desk', 0, 2)], ctx);
    expect(a.seatLinks).toEqual([{ seatUid: 's', deskUid: 'd' }]);
    expect(a.seatSlots).toEqual([
      { seatUid: 's', x: 0, y: 1 },
      { seatUid: 's', x: 1, y: 1 },
    ]);
  });

  it('한 칸만 걸쳐도 연결', () => {
    const a = analyzeLayout([place('s', 'sofa', 1, 1), place('d', 'desk', 2, 2)], ctx);
    expect(a.seatLinks).toHaveLength(1);
  });

  it('책상을 등지고 있으면 연결되지 않는다', () => {
    // 소파가 위(rotation 2)를 보는데 책상은 아래에 있음
    const a = analyzeLayout([place('s', 'sofa', 0, 1, 2), place('d', 'desk', 0, 2)], ctx);
    expect(a.seatLinks).toEqual([]);
    expect(a.warnings).toContainEqual({ kind: 'seat_without_desk', uid: 's' });
    expect(a.warnings).toContainEqual({ kind: 'desk_without_seat', uid: 'd' });
  });

  it('옆으로 붙기만 한 책상은 연결되지 않는다', () => {
    const a = analyzeLayout([place('s', 'sofa', 0, 1), place('d', 'desk', 2, 1)], ctx);
    expect(a.seatLinks).toEqual([]);
  });

  it('마주 보는 소파 두 개가 책상 하나를 공유', () => {
    const a = analyzeLayout(
      [place('top', 'sofa', 0, 0), place('d', 'desk', 0, 1), place('bottom', 'sofa', 0, 2, 2)],
      ctx,
    );
    expect(a.seatLinks.map((l) => l.seatUid)).toEqual(['top', 'bottom']);
  });

  it('책상 정원을 넘으면 desk_full 경고', () => {
    const a = analyzeLayout(
      [
        place('c1', 'chair', 0, 0),
        place('c2', 'chair', 1, 0),
        place('d', 'desk', 0, 1),
        place('c3', 'chair', 0, 2, 2),
      ],
      ctx,
    );
    expect(a.seatLinks.map((l) => l.seatUid)).toEqual(['c1', 'c2']);
    expect(a.warnings).toContainEqual({ kind: 'desk_full', uid: 'c3', deskUid: 'd' });
  });
});

describe('책장·커피머신 제공 기능', () => {
  it('책장 분야·권수, 커피머신 메뉴를 모은다', () => {
    const a = analyzeLayout([place('s', 'shelf', 0, 0), place('b', 'brewer', 3, 0)], ctx);
    expect(a.shelf).toEqual({ capacity: 3, genres: ['위로'] });
    expect(a.menu).toEqual(['americano']);
    expect(a.browseSpots).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(a.counterSpots).toEqual([{ x: 3, y: 1 }]);
    expect(a.warnings.map((w) => w.kind)).not.toContain('no_bookshelf');
  });

  it('없으면 경고', () => {
    const kinds = analyzeLayout([], ctx).warnings.map((w) => w.kind);
    expect(kinds).toEqual(['no_bookshelf', 'no_brewer']);
  });

  it('availableBooks: 분야가 맞는 책만, 권수 제한까지', () => {
    const book = (id: string, tags: Book['tags']): Book => ({ id, title: '', author: '', tone: 'wood', tags, quotes: [] });
    const books = [book('a', ['위로']), book('b', ['도전']), book('c', ['휴식', '위로']), book('d', ['위로'])];
    expect(availableBooks({ capacity: 2, genres: ['위로'] }, books).map((b) => b.id)).toEqual(['a', 'c']);
  });
});

describe('seatVisitors', () => {
  it('자리 수만큼만 손님을 앉힌다', () => {
    const slots = [{ seatUid: 's', x: 0, y: 0 }];
    expect(seatVisitors(['g1', 'g2'], slots)).toEqual([{ guestId: 'g1', slot: slots[0] }]);
  });
});

describe('memoBoardSpot', () => {
  it('커피머신 옆 빈 칸 (앞 공간은 피함)', () => {
    expect(memoBoardSpot([place('b', 'brewer', 1, 0)], ctx)).toEqual({ x: 2, y: 0 });
    expect(memoBoardSpot([place('b', 'brewer', 1, 0), place('t', 'table', 2, 0)], ctx)).toEqual({ x: 0, y: 0 });
  });

  it('커피머신이 없으면 null', () => {
    expect(memoBoardSpot([], ctx)).toBeNull();
  });
});
