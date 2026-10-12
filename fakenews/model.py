"""Bounded-confidence belief dynamics with spreaders and a one-shot fact-check."""
import numpy as np


def run(eps=20, mu=0.3, n=300, T=400, f_spread=0.05, spread_op=95.0, spread_rate=3,
        t_fc=None, reach=0.5, fc_val=10.0, eps_fc=40, mu_fc=0.3, target=None,
        seed=0, snaps=()):
    """belief 0-100 = how strongly an agent believes the fake news.
    spreaders: fixed belief, start `spread_rate` extra contacts per tick.
    fact-check at tick t_fc: a `reach` share of agents hear fc_val; they move by mu_fc
    only if |belief - fc_val| <= eps_fc (otherwise ignored).
    target: None=random reach, 'mid'=only agents with belief 30-70 (reachable & undecided)."""
    rng = np.random.default_rng(seed)
    op = rng.beta(2, 4, n) * 100
    ns = int(round(f_spread * n))
    fixed = np.zeros(n, bool); fixed[:ns] = True
    op[fixed] = spread_op
    spread_idx = np.where(fixed)[0]
    believers = [(op[~fixed] > 50).mean()]
    mean = [op[~fixed].mean()]
    hist = {0: op.copy()} if 0 in snaps else {}
    for t in range(T):
        # ordinary pairwise talks
        perm = rng.permutation(n)
        a, b = perm[: n // 2], perm[n // 2:]
        d = op[b] - op[a]
        ok = np.abs(d) <= eps
        ma, mb = ok & ~fixed[a], ok & ~fixed[b]
        op[a[ma]] += mu * d[ma]
        op[b[mb]] -= mu * d[mb]
        # spreaders repeatedly talk to random people
        for _ in range(spread_rate):
            tgt = rng.integers(0, n, len(spread_idx))
            dd = spread_op - op[tgt]
            ok2 = (np.abs(dd) <= eps) & ~fixed[tgt]
            op[tgt[ok2]] += mu * dd[ok2]
        # one-shot fact-check
        if t_fc is not None and t == t_fc:
            free = np.where(~fixed)[0]
            if target == 'mid':
                free = free[(op[free] >= 30) & (op[free] <= 70)]
            k = int(round(reach * len(free)))
            who = rng.choice(free, min(k, len(free)), replace=False)
            dd = fc_val - op[who]
            ok3 = np.abs(dd) <= eps_fc
            op[who[ok3]] += mu_fc * dd[ok3]
        op = np.clip(op, 0, 100)
        believers.append((op[~fixed] > 50).mean())
        mean.append(op[~fixed].mean())
        if t + 1 in snaps:
            hist[t + 1] = op.copy()
    out = dict(believers=np.array(believers), mean=np.array(mean))
    if snaps:
        out['hist'] = hist
    out['op'] = op
    return out
