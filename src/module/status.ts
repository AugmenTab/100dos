// The sheet-facing status palette. Fully replaces Foundry's default
// CONFIG.statusEffects rather than appending to it — core's ~34 defaults
// include categories deliberately excluded here (dead, fly, hover, burrow
// among them), so leaving them in place would leak those statuses onto
// both the Token HUD and the sheet palette, which both read from this
// same registry. Confirmed against PF1e's own Buffs tab, which does the
// same wholesale replacement.
export type StatusId =
  | "asleep"
  | "blinded"
  | "bleedingOut"
  | "choking"
  | "concussed"
  | "deafened"
  | "disorientated"
  | "ensnared"
  | "flinch"
  | "gasping"
  | "helpless"
  | "invisible"
  | "lost"
  | "pinned"
  | "shellshock"
  | "slowed"
  | "stunned"
  | "tinnitus"
  | "unconscious"
  | "visionLoss"
  | "weakened"
  | "whiplash"
  | "winded";

// Display order for the sheet palette. Deliberately not alphabetical.
export const STATUS_IDS: StatusId[] = [
  "asleep",
  "blinded",
  "bleedingOut",
  "choking",
  "concussed",
  "deafened",
  "disorientated",
  "ensnared",
  "flinch",
  "gasping",
  "helpless",
  "invisible",
  "lost",
  "pinned",
  "shellshock",
  "slowed",
  "stunned",
  "tinnitus",
  "unconscious",
  "visionLoss",
  "weakened",
  "whiplash",
  "winded",
];

// TODO: wireframe-only placeholders drawn from Foundry's bundled generic
// icon set — approximate stand-ins for statuses with no direct core
// equivalent. Bespoke status artwork will eventually replace these.
const STATUS_ICONS: Record<StatusId, string> = {
  asleep: "icons/svg/sleep.svg",
  blinded: "icons/svg/blind.svg",
  bleedingOut: "icons/svg/blood.svg",
  choking: "icons/svg/hazard.svg",
  concussed: "icons/svg/daze.svg",
  deafened: "icons/svg/deaf.svg",
  disorientated: "icons/svg/eye.svg",
  ensnared: "icons/svg/net.svg",
  flinch: "icons/svg/combat.svg",
  gasping: "icons/svg/aura.svg",
  helpless: "icons/svg/falling.svg",
  invisible: "icons/svg/invisible.svg",
  lost: "icons/svg/direction.svg",
  pinned: "icons/svg/padlock.svg",
  shellshock: "icons/svg/explosion.svg",
  slowed: "icons/svg/walk.svg",
  stunned: "icons/svg/lightning.svg",
  tinnitus: "icons/svg/sound-off.svg",
  unconscious: "icons/svg/unconscious.svg",
  visionLoss: "icons/svg/light-off.svg",
  weakened: "icons/svg/down.svg",
  whiplash: "icons/svg/thrust.svg",
  winded: "icons/svg/degen.svg",
};

export function registerStatusEffects(): void {
  CONFIG.statusEffects = STATUS_IDS.map((id) => ({
    id,
    name: `DOS100.status.${id}`,
    img: STATUS_ICONS[id],
  }));
}
