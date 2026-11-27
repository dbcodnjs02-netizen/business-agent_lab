// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from './App';
import { NEIGHBOR_STORES } from './data/neighbors';
import { roomOf, useGameStore } from './store/useGameStore';

// 실제 DOM 에 앱을 띄우고 모드를 바꿔가며 렌더링 오류가 없는지 확인

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// 프레임 루프는 끄고 tick 을 직접 부른다 (계속 렌더링되면 act 가 끝나지 않음)
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('cancelAnimationFrame', () => undefined);

it('영업 화면 · 인테리어 · 메뉴 · 방문 · 방명록 · 대화 · 결산이 오류 없이 뜬다', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const el = document.body.appendChild(document.createElement('div'));
  const root = createRoot(el);
  const store = useGameStore.getState;
  const text = () => document.body.textContent ?? '';

  // 처음엔 빈 가게 + 튜토리얼 인사
  await act(async () => root.render(<App />));
  expect(store().layout).toEqual([]);
  expect(text()).toContain('가게 꾸미기 시작');

  // 튜토리얼: 책상 2 → 의자 4 → 커피머신 → 편집 완료
  await act(async () => store().startTutorial());
  expect(text()).toContain('책상 2개 놓기');
  await act(async () => {
    store().placeFromInventory('desk', 2, 4, 0);
    store().placeFromInventory('desk', 6, 4, 0);
  });
  expect(store().tutorial).toBe('chairs');
  await act(async () => {
    store().placeFromInventory('armchair', 2, 3, 0);
    store().placeFromInventory('armchair', 3, 3, 0);
    store().placeFromInventory('armchair', 6, 5, 2);
    store().placeFromInventory('armchair', 7, 5, 2);
  });
  expect(store().tutorial).toBe('coffee');
  await act(async () => store().placeFromInventory('coffee-machine', 4, 0, 0));
  expect(store().tutorial).toBe('open');
  await act(async () => store().setTab('cafe'));
  expect(store().tutorial).toBe('serve');
  expect(text()).toContain('일차');

  await act(async () => {
    for (let i = 0; i < 300; i++) store().tick(0.1, { dx: 0, dy: 0 });
  });
  expect(store().sim.customers.length).toBeGreaterThan(0);

  // 키보드 이동과 상호작용
  const before = store().player.pos;
  await act(async () => {
    for (let i = 0; i < 5; i++) store().tick(0.05, { dx: 1, dy: 0 });
    store().interact();
  });
  expect(store().player.pos).not.toEqual(before);

  await act(async () => store().setTab('interior'));
  expect(text()).toContain('보관함');
  await act(async () => store().setTab('cafe'));

  // 메뉴(인스타그램형)
  await act(async () => store().setScreen('menu'));
  expect(text()).toContain('추천 이웃 서점');
  await act(async () => store().setTab('guests'));
  expect(text()).toContain('손님 도감');

  await act(async () => store().startVisit(NEIGHBOR_STORES[0]));
  expect(text()).toContain('달빛 서점');

  await act(async () => store().openGuestbook('moonlight'));
  await act(() => new Promise((r) => setTimeout(r, 10)));
  expect(text()).toContain('붙이기');
  await act(async () => store().closeGuestbook());

  await act(async () => store().endVisit());
  // 1레벨 가게엔 아직 동물 손님이 오지 않는다
  expect(store().level).toBe(1);
  expect(store().guestsInCafe).toEqual([]);
  // 레벨이 오르면 매장이 넓어지고, 5레벨이면 단골 후보 + 알바 1자리
  await act(async () => useGameStore.setState({ level: 5 }));
  expect(roomOf(5).grid.cols).toBeGreaterThan(roomOf(1).grid.cols);
  await act(async () => store().startNextDay());
  const guest = store().guestsInCafe[0];
  expect(guest).toBeDefined();
  // 처음 온 손님 캐스팅: 실패하면 오늘은 돌아가고, 성공하면 단골
  await act(async () => store().openConversation(guest));
  expect(text()).toContain('처음 온 손님');
  await act(async () => {
    store().resolveCasting(guest, 'miss');
    store().closeConversation();
  });
  expect(store().guestsInCafe).toEqual([]);
  await act(async () => store().resolveCasting(guest, 'perfect'));
  expect(store().guestProgress[guest].isRegular).toBe(true);

  // 알바 고용 (자리 1개) → 상점 탭에 근무 중으로 보임
  await act(async () => store().setTab('shop'));
  expect(text()).toContain('알바 고용');
  await act(async () => {
    expect(store().hireStaff('minji')).toEqual({ ok: true });
    expect(store().hireStaff('junho')).toMatchObject({ ok: false });
  });
  expect(store().workers).toHaveLength(1);
  expect(text()).toContain('근무 중');

  // 영업 마감 → 결산
  await act(async () => store().setScreen('play'));
  await act(async () => {
    useGameStore.setState({ minutes: 1319.9 });
    store().tick(0.1);
  });
  expect(text()).toContain('결산');
  expect(text()).toContain('알바 일당');
  await act(async () => store().startNextDay());
  expect(store().dayReport).toBeNull();
  expect(store().workers).toHaveLength(1);
  // 알바와 함께 영업 — 렌더링 오류 없이 돌아간다
  await act(async () => {
    for (let i = 0; i < 200; i++) store().tick(0.1, { dx: 0, dy: 0 });
  });

  await act(async () => root.unmount());
  expect(errors).not.toHaveBeenCalled();
}, 20_000);
