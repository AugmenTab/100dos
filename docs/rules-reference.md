# 100DOS Rules Reference

Living reference for the mechanical framework of the 100DOS system as implemented in Foundry VTT. Contains schema-relevant facts only — no setting-specific content. Update as implementation reveals new requirements or corrects earlier assumptions.

---

## Core Resolution Mechanic

100DOS uses a d100 percentile roll-under system. Every test resolves by rolling equal to or under a target Characteristic value. Success or failure scales in **Degrees**: one Degree per 10 points of margin between the roll and the target.

- **Critical Success**: Natural roll of 01
- **Critical Failure**: Natural roll of 100
- Difficulty modifiers apply directly to the target number, not the roll

---

## Characteristics

Ten Characteristics define every character. They group into three domains but the grouping is presentational — all ten function identically in tests.

| Characteristic | Abbreviation | Domain |
|---|---|---|
| Strength | STR | Physical |
| Toughness | TOU | Physical |
| Agility | AGI | Physical |
| Warfare Range | WFR | Combat |
| Warfare Melee | WFM | Combat |
| Intellect | INT | Mental |
| Perception | PER | Mental |
| Courage | CRG | Personality |
| Charisma | CHA | Personality |
| Leadership | LDR | Personality |

Characteristics are derived values — composed from multiple inputs including base values and bonuses from equipment, augmentations, and other sources. Tests roll against the derived Characteristic, not any single input in isolation.

**Characteristic Modifier**: The tens digit of a Characteristic value (e.g., 35 → Modifier 3). Derived from the Characteristic. Damage, carry weight, and many other values key off modifiers rather than raw Characteristics.

**Mythic Characteristics**: A second layer of bonus values on top of base Characteristics. Not universal to all character types. Some formulas use the Mythic value directly rather than as a modifier, so they are tracked separately.

**Characteristic Flags**: Each Characteristic carries two independent boolean flags.

- **Active/Inactive**: Some character types (e.g., Sentinels, certain Forerunner creatures, Cyborgs) have Characteristics fully deactivated — removed from calculation rather than set to zero. The inactive flag controls this.
- **Advanceable/Non-advanceable**: Not all Characteristics on all character types can be advanced. This flag controls whether advancements are permitted for a given Characteristic.

Both flags are potentially addressable via the Changes system.

---

## Resources

Five resource types appear on actor sheets.

| Resource | Notes |
|---|---|
| **Wounds** | Current and maximum. Maximum is derived. |
| **Luck** | Current and maximum. Spending Luck is recoverable; Burning Luck is permanent — maximum decreases. Current and maximum are independent. |
| **Experience (XP)** | Total accumulated and total spent both matter independently. |
| **Credits (cR)** | Currency. |
| **Support Points (SP)** | Discrete resource consumed during play. Replenishment mechanism is setting-specific. |

**Item-owned resources**: Many item types (not only abilities) carry current/maximum counters for setting-specific pools or limited-use tracking. The replenishment model is configurable per item:

- **Period-based**: Automatically replenishes on a defined trigger (per encounter, daily, per rest, etc.)
- **Charge-based**: A finite pool of charges that depletes and is not automatically refilled — spent permanently until restocked (e.g., wands)
- **Non-replenishing**: No automatic recovery; current value changes only through explicit action (e.g., Oripathy counting toward a death threshold)

---

## Actor Types

### PC

Tracks all ten Characteristics plus Mythic variants, all five resources, an extensible Skill set, acquired Abilities/Traits/Educations, Size, and a gear loadout. Also carries Natural Armor (standalone numeric value), Hardpoints by body location (see Hardpoints section), and informational text fields for physical attributes (Height, Weight — not mechanically enforced).

### NPC

Shares the Characteristic structure. Resource tracking includes Wounds, Luck (not always present), XP Payout, and Bestiary Rank (1–5, drives stat scaling). Carries a gear loadout. Also carries Natural Armor and Hardpoints by body location.

### Vehicle

Largely distinct from character actors, but will reference other actor types to represent crew and calculate certain values.

| Field Group | Fields |
|---|---|
| Mobility | Top Speed, Accelerate, Brake (all in MpT), Maneuver (evasion test modifier) |
| Crew | Crew minimum, Complement capacity, named positions |
| Armor | Five locations: Weapon, Mobility, Engine, Optics, Hull — each with independent armor rating |
| Breakpoints | Five independent tracks (WEP, MOB, ENG, OP, HUL), current and max each |
| Weapon Points | Total budget and allocated amount |
| Size | Drives grid occupation, reach, and some combat interactions |
| Weapons | Linked loadout |
| Conceal | How effectively the vehicle hides from sensors — opposes Sensor in detection tests |
| Sensor | The vehicle's ability to spot concealed vehicles — opposes Conceal in detection tests |

### companion *(planned, not yet designed)*

A persistent follower NPC linked to a specific PC. Appears in multiple settings (Ghost in Destiny, War Dog in Titanfall/Frontier, etc.). The linking mechanism and any resource-sharing behavior between a companion and its owner are undecided.

### group *(planned, not yet designed)*

Represents a party or collective entity. Intended to accommodate party-level resources (e.g., a shared Luck pool). What fields it tracks and how it relates to member actors is not yet understood well enough to design.

---

## Item Types

This list is a minimum — additional Item types will be identified during implementation. Weapons and armor are each likely to be their own Item type. Modifications represent a broad and varied category.

**Confirmed Item types:**

### race

Covers the biological baseline of a character.

Fields: Base Characteristics (all ten), Mythic Characteristics, a flag controlling whether Mythic Characteristics advance for NPCs of this race, race-granted Abilities and Educations, Tier, XP Cost.

Settings with sub-races represent them as separate Race items rather than nested structures.

### soldierType

Covers the faction or occupation framework through which a character advances.

Fields: Characteristic Advancements by tier (Simple through Mastery), faction/occupation-granted Abilities and Educations, Training (weapon training categories granted), Tier, XP Cost.

### ability

Fields: Name, XP Cost, Prerequisites (referenced ability names and/or other conditions), Effect description. All ability content is module-provided.

### trait

Fields: Name, Effect description. All trait content is module-provided.

### education

Fields: Name, Effect description. All education content is module-provided.

### effect

Represents a temporary or conditional modifier — a buff, debuff, spell effect, cover bonus, status effect, or similar. Carries a Changes list that is applied when the effect is active.

Effects have an active/inactive toggle that can be set manually. Optionally time-based: when a duration expires, the effect de-activates automatically. Duration tracking ties into the Foundry combat tracker and system clock.

### outlier

A character-specific modifier item that applies bonuses via the Changes system. Unlike standard abilities, Outliers can cost Luck (in addition to or instead of XP). Whether this is a standalone item type or a subtype of a more generic item is undecided.

### spell

Spells are a confirmed Item type. Fields are not yet fully specified.

---

## Undecided Item Types

**Upbringing / Environment / Lifestyle**: Character background factors present in the sourcebook. Will likely be unified under a single item type (possibly with others) and applied to the actor. Schema is undecided. Soldier Type selection does not mechanically enforce a particular Upbringing.

**Jobs** (Paranoia Station setting): A confirmed item type with fields including Description, Traits, Access Locations, PDA Programs, and Starting Equipment. No XP Cost and no Characteristic Advancements. Requires a deeper dive before implementation.

**Specialization Packs**: Bundles of granted Abilities and Skills at specified training tiers (e.g., `Athletics (Trained)`, `Camouflage (+10)`), observed as granted by certain Soldier Types or acquired independently. Whether these become a dedicated item type is undecided.

---

## Skills

Skills provide a flat bonus to the Characteristic used when rolling them. The training tier determines the size of that bonus and whether an untrained penalty applies.

| Tier | Effect |
|---|---|
| Untrained | Penalty applies (Basic: -20, Advanced: -40) |
| Trained | No penalty, no bonus |
| +10 | +10 to the governing Characteristic for that test |
| +20 | +20 to the governing Characteristic for that test |

Each skill has a governing Characteristic or set of Characteristics and a classification of Basic or Advanced. The classification determines the untrained penalty.

The system will initialize a default set of skills on new PC sheets. Additional skills can be added to accommodate any setting. No specific skill list is hardcoded — all skill content is module-provided or user-defined.

---

## Armor

Three distinct armor subsystems can coexist on the same character.

**Physical Armor**: Locational. Each body location has an independent armor rating. Standard character locations are Head, Arms, Chest, Legs. Vehicles and some character types use different location sets.

**Natural Armor**: A standalone numeric armor value tracked directly on PC and NPC actors. Not derived solely from equipped items.

**Energy Shields**: Defined by three values — Shield Integrity (total HP), Recharge Delay (rounds after last hit before recharge begins), Recharge Rate (SI restored per round). Energy shield values are provided by items rather than being an item type themselves.

---

## Hardpoints

A body-location capacity system governing how many cybernetics or integrated items can be installed at each location. Confirmed as a core system, not setting-specific.

| Location | Default Capacity |
|---|---|
| Head | 3 |
| Chest | 6 |
| Arms | 3 per arm |
| Legs | 4 per leg |

Default capacities can be adjusted — either directly or via the Changes system; the mechanism is undecided. Cybernetics are linked to a body location. When that location takes damage, the cybernetic's breakpoints take damage.

---

## Blood Sugar / Strain

Both "Blood Sugar" (observed in at least one setting) and "Strain" (observed in others) describe a mechanic tracking the cumulative biological cost of cybernetic implants against a character threshold. Whether these are mechanically identical across settings or differ in any meaningful way has not been fully verified — they are recorded here together as likely the same schema but that equivalence is not confirmed.

---

## Size Categories

Size affects reach, grid occupation, carry capacity, and some combat interactions.

| Category | Height Range |
|---|---|
| Mini | 0.1–0.5 m |
| Small | 0.51–1.4 m |
| Normal | 1.41–2.0 m |
| Large | 2.01–3.0 m |
| Huge | 3.01–3.5 m |
| Hulking | 3.51–4.0 m |
| Giant | 4.01–4.5 m |
| Immense | 4.51–6.0 m |
| Massive | 6.01–10.0 m |
| Great | 10.01–40.0 m |
| Monumental | 40.01–120.0 m |
| Colossal | 120.01–500.0 m |
| Vast | 500.01–1,000.0 m |
| Unscalable | 1,001+ m |

---

## Open Questions

**Buildings**: Not expected to be a standard actor or item type. If modeled at all, a non-placeable actor is the more likely path. Undecided.

**Ship-specific vehicle fields**: Ships observed in splatbooks carry additional fields not present on standard vehicles — Manpower (a resource), Ship Type classification (Corvette through Supercarrier), and Ship Size derived from a length/width/height sum. Whether these belong on the vehicle schema universally, as ship-subtype fields, or elsewhere is undecided.

**Weapon modification tiers**: At least one splatbook uses Standard/Variant/Unique as a tier classification on weapon modifications. Whether this is a core item field or setting-specific content is undecided.
