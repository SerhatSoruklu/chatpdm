import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface ReasoningLayerRow {
  label: string;
  role: string;
  goodAt: string;
  mustNeverDo: string;
  statusTitle: string;
  statusNote: string;
  tone: 'active' | 'future';
}

interface ReasoningPriorityStep {
  rank: string;
  title: string;
  copy: string;
  tone: 'active' | 'bounded' | 'advisory' | 'clarifying';
}

interface DeterministicReason {
  title: string;
  copy: string;
}

@Component({
  selector: 'app-reasoning-structure-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reasoning-structure-page.component.html',
  styleUrl: './reasoning-structure-page.component.css',
})
export class ReasoningStructurePageComponent {
  protected readonly activeTruths = [
    'ChatPDM currently operates on a deterministic main core.',
    'This is the only authoritative reasoning layer live in the public runtime today.',
    'Canonical concepts, admitted comparisons, refusal, and review state remain anchored there.',
  ] as const;

  protected readonly reasoningLayers: readonly ReasoningLayerRow[] = [
    {
      label: 'Deterministic reasoning',
      role: 'Main core',
      goodAt: 'Exact definitions, hard boundaries, refusal, and structural validation.',
      mustNeverDo: 'Guess, soften invalid structure, or produce unsupported output.',
      statusTitle: 'Active now',
      statusNote: 'Authoritative public runtime layer.',
      tone: 'active',
    },
    {
      label: 'Symbolic / modal logic',
      role: 'Rule interpreter',
      goodAt: 'Formal relations, permissions, obligations, and conditional structures.',
      mustNeverDo: 'Override deterministic definitions or self-admit into runtime.',
      statusTitle: 'Not part of runtime',
      statusNote: 'Future bounded layer.',
      tone: 'future',
    },
    {
      label: 'Fuzzy reasoning',
      role: 'Ambiguity scaler',
      goodAt: 'Degrees, partial fit, and soft thresholds for advisory analysis.',
      mustNeverDo: 'Produce final truth claims or soften runtime boundaries.',
      statusTitle: 'Not part of runtime',
      statusNote: 'Future bounded layer.',
      tone: 'future',
    },
    {
      label: 'Probabilistic reasoning',
      role: 'Hypothesis layer',
      goodAt: 'Likelihoods, uncertainty modeling, and candidate hypotheses.',
      mustNeverDo: 'Define concepts, finalize validity, or write into canon.',
      statusTitle: 'Not part of runtime',
      statusNote: 'Future bounded layer.',
      tone: 'future',
    },
    {
      label: 'Heuristic reasoning',
      role: 'Fast shortcut layer',
      goodAt: 'Efficient approximations, triage, and prioritization.',
      mustNeverDo: 'Replace validated reasoning or bypass refusal.',
      statusTitle: 'Not part of runtime',
      statusNote: 'Future bounded layer.',
      tone: 'future',
    },
    {
      label: 'Dialogical reasoning',
      role: 'Clarification layer',
      goodAt: 'Asking for clarification, reducing ambiguity, and guiding interaction.',
      mustNeverDo: 'Redefine system rules or resolve canonically.',
      statusTitle: 'Not part of runtime',
      statusNote: 'Future bounded layer.',
      tone: 'future',
    },
  ] as const;

  protected readonly prioritySteps: readonly ReasoningPriorityStep[] = [
    {
      rank: '1',
      title: 'Deterministic core',
      copy: 'Final. This layer alone can produce trusted public outputs.',
      tone: 'active',
    },
    {
      rank: '2',
      title: 'Symbolic / modal',
      copy: 'Conditional and bounded. It may interpret formal structure, but not overrule canon.',
      tone: 'bounded',
    },
    {
      rank: '3',
      title: 'Fuzzy / probabilistic / heuristic',
      copy: 'Advisory only. These modes may suggest, rank, or pressure-test without deciding truth.',
      tone: 'advisory',
    },
    {
      rank: '4',
      title: 'Dialogical',
      copy: 'Clarifying only. It may reduce ambiguity in interaction, but not rewrite system law.',
      tone: 'clarifying',
    },
  ] as const;

  protected readonly deterministicReasons: readonly DeterministicReason[] = [
    {
      title: 'Trust requires fixed boundaries',
      copy: 'Public outputs cannot be dependable if concept meaning changes with context or convenience.',
    },
    {
      title: 'Ambiguity must be refused before it is softened',
      copy: 'The system must reject unsupported structure first, rather than masking it with tentative interpretation.',
    },
    {
      title: 'Flexibility without a hard core creates drift',
      copy: 'If softer reasoning enters before invariants are locked, runtime guarantees collapse over time.',
    },
  ] as const;
}
