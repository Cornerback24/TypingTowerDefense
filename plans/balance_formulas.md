# Tower Defense Balance Formulas

## The ETMPS System

Tower prices are derived from **ETMPS (Effective Threat Mitigation Per Second)**: equivalent enemy `originalThreat` the player no longer has to handle, per second.

ETMPS is evaluated on a **fixed reference field** (not live score), so shop prices stay stable for a run. Typing remains primary DPS. Towers are priced as a small keep-up nudge so spending money helps with regen without becoming the clear button, and so a full-income tower bank cannot outrun late-game spawn rate.

### Global constants (`Config.js`)

| Constant | Role |
|---|---|
| `AVG_PATH_PX` (660) | Mean center-to-edge walk on the 1600×900 canvas. Used for Slow occupancy. |
| `REF_AVG_THREAT` (4) | Typical enemy threat (between Basic 2 and Tough 5). |
| `REF_MORPH_DELTA` (4.5) | Threat dropped per Morph shot under priority targeting. |
| `REF_MORPH_RANGE` (250) | Morph base range; range uptime is `range / 250` (floor 0.85). |
| `MAX_TOWER_RANGE` (500) | Hard cap on Slow and Morph range upgrades. Below full-map coverage from center (~918 to a corner). |
| `LEAK_FRACTION` (0.08) | Slow converts only this slice of delay into equivalent removal. |
| `MORPH_STICKINESS` (0.15) | Morph frees spawn cap and often refills; only this slice of Δthreat sticks. |
| `MORPH_UPTIME` (0.70) | Idle time, typing lock, and untargetable bosses/minions. |
| `BASE_COST_PER_ETMPS` (700) | Dollars per ETMPS for a new tower. Must stay **≳ 600** so `dM/ds` cannot beat post-5000 regen (`dR/ds = 0.001` if all money is spent on towers). |
| `UPG_COST_PER_ETMPS` (875) | 1.25× base; mild extra cost on tall upgrades. |

Target band for a **level-1** tower: about **0.12–0.18 ETMPS** (12–18% of starting regen `R(0) = 1`) and **~$90–$120**.

At score 5000, regen is 10 threat/s and a full-clear player has ~$3000. `$3000 / 700 ≈ 4.3` ETMPS from towers, well under regen. After 5000, regen grows faster than tower power bought with the same income.

---

## Tower ETMPS Calculations

### 1. Slow Tower

Slowing delays enemies; it does not delete spawn threat. Occupancy is the fraction of the walk to the base spent in the aura. `LEAK_FRACTION` turns that delay into equivalent threat/s.

**Formula:**
`ETMPS = maxTargets * REF_AVG_THREAT * (1 - slowAmount) * occupancy * LEAK_FRACTION`

*   `occupancy = range / AVG_PATH_PX`
*   Range upgrades stop at `MAX_TOWER_RANGE` (500).
*   `slowAmount`: speed multiplier (0.5 = half speed). Lower is a stronger slow.

Overlapping Slow auras do not stack (`Math.min` on `speedModifier`).

### 2. Morph Tower

Morph lowers `originalThreat` on the target, which can free the spawn cap. Range near the base already covers most inbound paths, so range is a mild coverage multiplier rather than `range / path`.

**Formula:**
`ETMPS = REF_MORPH_DELTA * shotsPerSec * rangeUptime * MORPH_UPTIME * MORPH_STICKINESS`

*   `shotsPerSec = 1000 / fireRate`
*   `rangeUptime = max(0.85, range / REF_MORPH_RANGE)`
*   Range upgrades stop at `MAX_TOWER_RANGE` (500) and show MAX, same as fire rate.

Fire rate scales as `1 / interval`, so the last steps toward 500ms are expensive.

---

## Cost Application

1. **Base Cost:** `round(ETMPS(baseStats) * BASE_COST_PER_ETMPS)`
2. **Upgrade Cost:** `round((ETMPS(after) - ETMPS(before)) * UPG_COST_PER_ETMPS)`

Shop prices are not hardcoded; they follow these formulas.
