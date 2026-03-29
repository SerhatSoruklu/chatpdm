export type PolicyCompanionKey = 'acceptable-use' | 'data-retention';

export type PolicyCompanionTone = 'slate' | 'blue' | 'green' | 'amber';

export interface PolicyCompanionStat {
  label: string;
  value: string;
  detail: string;
}

export interface PolicyCompanionCard {
  eyebrow?: string;
  title: string;
  detail: string;
  bullets?: readonly string[];
  tone?: PolicyCompanionTone;
}

export interface PolicyCompanionLane {
  label: string;
  title: string;
  detail: string;
  bullets?: readonly string[];
  tone?: PolicyCompanionTone;
}

export interface PolicyCompanionStep {
  label: string;
  title: string;
  detail: string;
  outcome?: string;
  tone?: PolicyCompanionTone;
}

export interface PolicyCompanionTrace {
  label: string;
  path: string;
  lines: string;
  reason: string;
}

export type PolicyCompanionSection =
  | {
      kind: 'cards';
      title: string;
      intro?: string;
      cards: readonly PolicyCompanionCard[];
      columns?: 2 | 3;
    }
  | {
      kind: 'lanes';
      title: string;
      intro?: string;
      lanes: readonly PolicyCompanionLane[];
    }
  | {
      kind: 'timeline';
      title: string;
      intro?: string;
      steps: readonly PolicyCompanionStep[];
    }
  | {
      kind: 'traces';
      title: string;
      intro?: string;
      traces: readonly PolicyCompanionTrace[];
    };

export interface PolicyCompanionDefinition {
  key: PolicyCompanionKey;
  route: string;
  publicRoute: string;
  publicLabel: string;
  title: string;
  subtitle: string;
  intro: string;
  stateNote: string;
  traceabilityLabel: string;
  scopeBullets: readonly string[];
  stats: readonly PolicyCompanionStat[];
  sections: readonly PolicyCompanionSection[];
}

export type PolicyCompanionRegistry = Record<PolicyCompanionKey, PolicyCompanionDefinition>;
