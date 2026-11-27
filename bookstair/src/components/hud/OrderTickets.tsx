import { DRINKS } from '../../data/drinks';
import { isWaiting } from '../../systems/sim/sim';
import { useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';

const MAX_TICKETS = 6;

/** 왼쪽 위 주문표 — 기다리는 손님마다 한 장, 들어온 순서대로. 누르면 그 손님에게 걸어간다 */
export function OrderTickets() {
  const customers = useGameStore((s) => s.sim.customers);
  const walkTo = useGameStore((s) => s.walkTo);
  const orders = customers.filter((c) => isWaiting(c) && c.request).sort((a, b) => a.id - b.id);
  const shown = orders.slice(0, MAX_TICKETS);

  return (
    <ol className="pointer-events-auto flex items-start gap-2" aria-label="주문표">
      {shown.map((c) => {
        const req = c.request!;
        const v = Math.max(0, c.patience / c.patienceMax);
        const bar = v > 0.5 ? 'bg-mint-deep' : v > 0.25 ? 'bg-butter-deep' : 'bg-rose-deep';
        return (
          <li key={c.id} className="animate-rise">
            <button
              type="button"
              className={`glass-strong flex w-[86px] flex-col items-center overflow-hidden rounded-b-2xl rounded-t-md border-t-4 pb-2 text-ink transition hover:-translate-y-0.5 ${
                v <= 0.25 ? 'border-rose-deep animate-pulse' : 'border-wood-500'
              }`}
              onClick={() => walkTo({ x: Math.floor(c.pos.x), y: Math.floor(c.pos.y) }, { kind: 'customer', id: c.id })}
              title="눌러서 이 손님에게 가기"
            >
              <span className="h-1.5 w-full bg-white/60">
                <span className={`block h-full ${bar}`} style={{ width: `${v * 100}%` }} />
              </span>
              <span className="mt-1 text-3xl leading-none">{req.kind === 'drink' ? DRINKS[req.drink].emoji : '📕'}</span>
              <span className="mt-0.5 max-w-full truncate px-1 text-[11px] font-bold">
                {req.kind === 'drink' ? DRINKS[req.drink].name : `#${req.tag} 책`}
              </span>
              <span className="mt-1 size-7 overflow-hidden rounded-full bg-beige-200 ring-2 ring-white">
                <CharacterPortrait look={c.look} expression={v <= 0.35 ? 'sad' : 'neutral'} />
              </span>
            </button>
          </li>
        );
      })}
      {orders.length > MAX_TICKETS && (
        <li className="glass-strong grid h-12 place-items-center rounded-2xl px-3 text-sm font-bold">+{orders.length - MAX_TICKETS}</li>
      )}
    </ol>
  );
}
