# Tower Defense Balance Formulas

## The ETMPS System

The game uses a dynamic, automated pricing system rather than manually set prices for towers and their upgrades. This ensures that every upgrade and new tower is perfectly balanced according to its mathematical utility.

The core metric used to calculate all costs is **ETMPS (Effective Threat Mitigation Per Second)**.

ETMPS attempts to quantify exactly how much "Threat" a tower is mitigating (or eliminating) per second of active gameplay.

### Global Pricing Constants

All base costs and upgrade costs are derived by multiplying the calculated ETMPS by global economic constants found in `Config.js`:

*   **`BASE_COST_PER_ETMPS = 60`**: Determines the initial purchase price of a tower.
*   **`UPG_COST_PER_ETMPS = 75`**: Determines the cost of upgrading a tower based on the *marginal* increase in ETMPS. This makes tall builds (heavily upgrading a few towers) competitively viable against wide builds (spamming many level 1 towers).

---

## Tower ETMPS Calculations

### 1. Slow Tower
The Slow Tower mitigates threat by delaying enemies. 

**Formula:**
`ETMPS = (maxTargets * 10) * slowPercentage * 0.1 * rangeModifier`

*   `maxTargets`: The maximum number of enemies the tower can slow at once.
*   `10`: The assumed average Threat value of the targets being slowed.
*   `slowPercentage`: How much of the enemy's speed is removed (e.g., a 0.5 slow amount removes 50% of the speed, so `1.0 - 0.5 = 0.5`).
*   `0.1`: An active modifier assuming the tower isn't always hitting its maximum theoretical value.
*   `rangeModifier`: The tower's range divided by its base range (`range / 200`), penalizing low range and rewarding high range.

### 2. Morph Tower
The Morph Tower mitigates threat by permanently downgrading enemies to lower tiers.

**Formula:**
`ETMPS = mitigationRate * rangeModifier`

*   `mitigationRate`: Calculated as `5 / fireRateSec`. This assumes an average threat reduction of 5 points (e.g., downgrading a Tough enemy [5] to a Basic enemy [2]) every time the tower fires.
*   `rangeModifier`: The tower's range divided by its base range (`range / 250`).

---

## Cost Application

1. **Base Cost:** 
   Calculated simply by evaluating the ETMPS of the tower's base stats and multiplying by `BASE_COST_PER_ETMPS`.
   *Example:* Base Morph Tower ETMPS * 60 = Base Cost.

2. **Upgrade Cost:**
   Evaluates the ETMPS of the current stats, then evaluates the ETMPS if the upgrade were applied. The difference (Marginal ETMPS) is multiplied by `UPG_COST_PER_ETMPS`.
   *Example:* `(New_ETMPS - Old_ETMPS) * 75 = Upgrade Cost`.
