import { useMemo } from 'react';
import { analyzeLayout } from '../systems/interior/connections';
import { roomOf, useGameStore } from './useGameStore';

/** 현재 배치의 연결 상태·좌석·도서 풀·메뉴 (배치가 바뀌거나 매장이 넓어질 때만 다시 계산) */
export function useLayoutAnalysis() {
  const layout = useGameStore((s) => s.layout);
  const room = useGameStore((s) => roomOf(s.level));
  return useMemo(() => analyzeLayout(layout, room), [layout, room]);
}
