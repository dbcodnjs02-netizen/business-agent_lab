import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from model import run, metrics

base = dict(beta=4, gamma=0.5, lam=0.25)
S = 60

# Fig1: price paths, no pessimists vs 5% pessimists
fig, ax = plt.subplots(1, 2, figsize=(11, 4), sharey=True)
for a, f in zip(ax, [0.0, 0.05]):
    for s in range(30):
        p = run(seed=s, f_pess=f, **base)[0]
        a.plot(p, lw=0.8, alpha=0.6, color='tab:red' if p.max() >= 150 else 'tab:gray')
    a.axhline(100, color='k', ls='--', lw=0.8)
    a.set_yscale('log'); a.set_xlabel('tick'); a.set_title(f'pessimists f={f:.0%}')
ax[0].set_ylabel('price (log)')
plt.tight_layout(); plt.savefig('fig1_price_paths.png', dpi=130)

# Fig2: effect of pessimist share
f_list = [0, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2]
bub, cr = [], []
for f in f_list:
    r = np.array([metrics(run(seed=s, f_pess=f, **base)[0]) for s in range(S)], float)
    bub.append(r[:, 2].mean()); cr.append(r[:, 3].mean())
plt.figure(figsize=(5.5, 4))
plt.plot([f*100 for f in f_list], bub, 'o-', label='bubble (peak >= 1.5x)')
plt.plot([f*100 for f in f_list], cr, 's-', label='bubble then crash')
plt.xlabel('pessimist share (%)'); plt.ylabel('share of runs'); plt.legend()
plt.tight_layout(); plt.savefig('fig2_pessimist_effect.png', dpi=130)
print(list(zip(f_list, np.round(bub, 2), np.round(cr, 2))))

# Fig3: opinion distribution over time (one bubble run)
for s in range(20):
    p = run(seed=s, **base)[0]
    if p.max() >= 150: break
ticks = (0, 100, 250, 400, 600)
_, _, hist = run(seed=s, snaps=ticks, **base)
fig, ax = plt.subplots(1, len(ticks), figsize=(14, 3), sharey=True)
for a, t in zip(ax, ticks):
    a.hist(hist[t], bins=20, range=(0, 100)); a.set_title(f't={t}'); a.set_xlabel('optimism')
ax[0].set_ylabel('agents')
plt.tight_layout(); plt.savefig('fig3_opinion_distribution.png', dpi=130)
