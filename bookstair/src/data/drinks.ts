import type { Drink, DrinkId } from '../types/content';

export const DRINKS: Record<DrinkId, Drink> = {
  americano: { id: 'americano', name: '아메리카노', emoji: '☕', price: 40 },
  'barley-latte': { id: 'barley-latte', name: '보리차 라떼', emoji: '🥛', price: 50 },
  'hot-choco': { id: 'hot-choco', name: '핫초코', emoji: '🍫', price: 45 },
  chamomile: { id: 'chamomile', name: '캐모마일 티', emoji: '🌼', price: 45 },
  'yuja-tea': { id: 'yuja-tea', name: '유자차', emoji: '🍋', price: 45 },
};
