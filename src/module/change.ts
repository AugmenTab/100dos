export type ChangeMode = "add" | "set";

export interface ChangeSourceRef {
  id: string;
  name: string;
}

export interface ChangeData {
  // Stable identity used when removing a change via the UI.
  id: string;
  enabled: boolean;
  target: string;
  mode: ChangeMode;
  formula: string;
  source: ChangeSourceRef;
}

export interface ConditionalChangeData {
  // Stable identity used when removing a change via the UI.
  id: string;
  enabled: boolean;
  target: string;
  value: string;
  source: ChangeSourceRef;
}
