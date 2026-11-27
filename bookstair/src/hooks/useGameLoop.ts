import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable);

/**
 * 영업 화면의 게임 루프 — 매 프레임 키 입력을 읽어 tick 을 부른다.
 * WASD·방향키 이동, Space/E 상호작용, Q 내려놓기, Esc 일시정지.
 */
export function useGameLoop() {
  const held = useRef(new Set<string>());

  useEffect(() => {
    const { interact, dropCarry, setPaused } = useGameStore.getState();
    const playing = () => {
      const s = useGameStore.getState();
      return s.screen === 'play' && s.activeTab !== 'interior' && !s.talkingTo && !s.guestbookFor && !s.dayReport;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || !playing()) return;
      if (e.code in MOVE_KEYS) {
        held.current.add(e.code);
        e.preventDefault();
      } else if ((e.code === 'Space' || e.code === 'KeyE') && !e.repeat) {
        e.preventDefault();
        interact();
      } else if (e.code === 'KeyQ') {
        dropCarry();
      } else if (e.code === 'Escape') {
        setPaused(!useGameStore.getState().paused);
      }
    };
    const onUp = (e: KeyboardEvent) => held.current.delete(e.code);
    const clear = () => held.current.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);

    let last = performance.now();
    let frame = requestAnimationFrame(function loop(now) {
      // 탭이 백그라운드였다가 돌아와도 한 번에 너무 많이 진행하지 않도록 제한
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      let dx = 0;
      let dy = 0;
      held.current.forEach((code) => {
        dx += MOVE_KEYS[code][0];
        dy += MOVE_KEYS[code][1];
      });
      useGameStore.getState().tick(dt, { dx, dy });
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, []);
}
