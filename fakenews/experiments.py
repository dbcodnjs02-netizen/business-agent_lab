import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from model import run

S = 60
BASE = dict(eps=25, spread_op=60, f_spread=0.05, spread_rate=1, mu=0.1, T=600)

def final(**kw):
    return np.array([run(seed=s, **{**BASE, **kw})['believers'][-1] for s in range(S)])

# Fig1: believers over time, no fact-check vs checks at different times (reach 100%)
fig, ax = plt.subplots(figsize=(6.5, 4))
t_list = [None, 60, 120, 180, 240]
for t in t_list:
    tr = np.mean([run(seed=s, t_fc=t, reach=1.0, mu_fc=0.3, **BASE)['believers'] for s in range(S)], 0)
    ax.plot(tr, label='no fact-check' if t is None else f'fact-check @ t={t}')
ax.set_xlabel('tick'); ax.set_ylabel('share of believers (>50)'); ax.legend(fontsize=8)
plt.tight_layout(); plt.savefig('fig1_believers_over_time.png', dpi=130)

# Fig2: timing sweep
ts = [0, 60, 90, 120, 150, 180, 210, 240, 300, 400]
res = {}
for name, kw in {'broad (reach 100%, mu_fc 0.1)': dict(reach=1.0, mu_fc=0.1),
                 'strong (reach 100%, mu_fc 0.3)': dict(reach=1.0, mu_fc=0.3),
                 'targeted (undecided 30-70 only, mu_fc 0.3)': dict(reach=1.0, mu_fc=0.3, target='mid')}.items():
    res[name] = [final(t_fc=t, **kw).mean() for t in ts]
base = final().mean()
plt.figure(figsize=(6.5, 4))
for k, v in res.items(): plt.plot(ts, v, 'o-', label=k)
plt.axhline(base, color='k', ls='--', lw=0.8, label='no fact-check')
plt.xlabel('fact-check time (tick)'); plt.ylabel('final believers share'); plt.legend(fontsize=7)
plt.tight_layout(); plt.savefig('fig2_timing.png', dpi=130)
print("no FC", round(base, 2))
for k, v in res.items(): print(k, np.round(v, 2))

# Fig3: fact-check message bound eps_fc (can the message reach believers?) at t=150
eps_fc_list = [10, 20, 30, 40, 50, 70]
e3 = [final(t_fc=150, reach=1.0, mu_fc=0.3, eps_fc=e).mean() for e in eps_fc_list]
plt.figure(figsize=(5.5, 4))
plt.plot(eps_fc_list, e3, 'o-'); plt.xlabel('fact-check reach bound eps_fc'); plt.ylabel('final believers share')
plt.tight_layout(); plt.savefig('fig3_eps_fc.png', dpi=130)
print("eps_fc", dict(zip(eps_fc_list, np.round(e3, 2))))

# Fig4: belief distribution over time, with late fact-check
ticks = (0, 120, 200, 300, 600)
o = run(seed=0, t_fc=150, reach=1.0, mu_fc=0.3, snaps=ticks, **BASE)
fig, ax = plt.subplots(1, 5, figsize=(14, 3), sharey=True)
for a, t in zip(ax, ticks):
    a.hist(o['hist'][t], bins=20, range=(0, 100)); a.set_title(f't={t}'); a.set_xlabel('belief')
ax[0].set_ylabel('agents'); plt.tight_layout(); plt.savefig('fig4_belief_distribution.png', dpi=130)
