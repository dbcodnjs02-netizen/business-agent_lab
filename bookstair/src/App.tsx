import { useEffect } from 'react';
import { INTERIOR } from './data/furniture';
import { CafeView } from './screens/CafeView';
import { PlayScreen } from './screens/PlayScreen';
import { decodeSnapshot } from './systems/social/social';
import { useGameStore } from './store/useGameStore';

export default function App() {
  const startVisit = useGameStore((s) => s.startVisit);
  const playing = useGameStore((s) => s.screen === 'play' && !s.visiting);

  // 공유 링크(?visit=...)로 들어오면 그 서점을 구경
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('visit');
    const store = code && decodeSnapshot(code, INTERIOR);
    if (store) startVisit(store);
  }, [startVisit]);

  // 영업은 전체화면, 단골·도감·이웃 서점은 인스타그램형 메뉴 화면
  return playing ? <PlayScreen /> : <CafeView />;
}
