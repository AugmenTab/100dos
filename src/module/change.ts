export type ChangeMode = "add" | "set";

export type ChangeSourceRef = {
  id: string;
  name: string;
};

export type ChangeData = {
  // Stable identity used when removing a change via the UI.
  id: string;
  enabled: boolean;
  target: string;
  mode: ChangeMode;
  formula: string;
  source: ChangeSourceRef;
};

export type ConditionalChangeData = {
  // Stable identity used when removing a change via the UI.
  id: string;
  enabled: boolean;
  target: string;
  value: string;
  source: ChangeSourceRef;
};

export type Changes = {
  computed: ChangeData[];
  conditional: ConditionalChangeData[];
};
