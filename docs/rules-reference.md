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

---

## Actor Types

### PC

Tracks all ten Characteristics plus Mythic variants, all five resources, an extensible Skill set, acquired Abilities/Traits/Educations, Size, and a gear loadout.

### NPC

Shares the Characteristic structure. Resource tracking includes Wounds, Luck (not always present), XP Payout, and Bestiary Rank (1–5, drives stat scaling). Carries a gear loadout.

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

---

## Item Types

This list is a minimum — additional Item types will be identified during implementation. Weapons and armor are each likely to be their own Item type. Modifications represent a broad and varied category.

**Confirmed Item types:**

### ability

Fields: Name, XP Cost, Prerequisites (referenced ability names and/or other conditions), Effect description. All ability content is module-provided.

### trait

Fields: Name, Effect description. All trait content is module-provided.

### education

Fields: Name, Effect description. All education content is module-provided.

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

Two distinct mechanical subsystems can coexist on the same character.

**Physical Armor**: Locational. Each body location has an independent armor rating. Standard character locations are Head, Arms, Chest, Legs. Vehicles and some character types use different location sets.

**Energy Shields**: Defined by three values — Shield Integrity (total HP), Recharge Delay (rounds after last hit before recharge begins), Recharge Rate (SI restored per round). Energy shield values are provided by items rather than being an item type themselves.

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
