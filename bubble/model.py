"""Bounded-confidence opinion dynamics + price feedback (bubble/crash toy model)."""
import numpy as np


def run(eps=20, mu=0.3, beta=1.0, gamma=0.5, f_pess=0.0, f_fund=0.3,
        n=300, T=600, k=0.01, pess_op=20.0, noise=1.0, lam=0.25, seed=0):
    rng = np.random.default_rng(seed)
    op = rng.uniform(0, 100, n)
    npess = int(round(f_pess * n))
    fixed = np.zeros(n, bool)
    fixed[:npess] = True
    op[fixed] = pess_op
    fund = np.zeros(n, bool)                      # value investors (anchor-sensitive)
    idx = np.arange(npess, n)
    fund[rng.choice(idx, int(f_fund * len(idx)), replace=False)] = True
    P = 100.0
    prices = [P]
    means = [op.mean()]
    for _ in range(T):
        # 1) pairwise bounded-confidence talks
        perm = rng.permutation(n)
        a, b = perm[: n // 2], perm[n // 2:]
        d = op[b] - op[a]
        ok = np.abs(d) <= eps
        move_a = ok & ~fixed[a]
        move_b = ok & ~fixed[b]
        op[a[move_a]] += mu * d[move_a]
        op[b[move_b]] -= mu * d[move_b]
        # 2) price from demand (+ small news shock)
        D = (op.mean() - 50) / 50
        misp = P / 100.0 - 1
        ret = k * (D - lam * misp) + noise * 0.003 * rng.standard_normal()
        P *= 1 + ret
        # 3) feedback: trend followers chase returns, value investors fade mispricing
        trend = ~fixed & ~fund
        op[trend] += beta * ret * 100
        op[fund & ~fixed] -= gamma * misp * 20
        op = np.clip(op, 0, 100)
        prices.append(P)
        means.append(op.mean())
    return np.array(prices), np.array(means), op


def metrics(prices):
    peak = prices.max()
    t_peak = prices.argmax()
    trough = prices[t_peak:].min()
    drawdown = 1 - trough / peak
    bubble = peak >= 1.5 * 100
    crash = bubble and drawdown >= 0.3
    return peak / 100, drawdown, bubble, crash
