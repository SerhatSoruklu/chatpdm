import type {
  HomepageWalkthroughCard,
  HomepageWalkthroughMode,
  HomepageWalkthroughModeOption,
  HomepageWalkthroughRenderedCard,
} from './landing-page.types';

export const HOMEPAGE_WALKTHROUGH_MODE_OPTIONS: HomepageWalkthroughModeOption[] = [
  {
    mode: 'plain',
    label: 'Plain language',
  },
  {
    mode: 'technical',
    label: 'Technical details',
  },
];

const HOMEPAGE_WALKTHROUGH_CARDS: HomepageWalkthroughCard[] = [
  {
    id: 'analyzed-text',
    sequence: '01',
    plain: {
      label: 'Input',
      title: 'What is being processed?',
      copy: 'ZeroGlare preserves the text exactly as it was written.',
      resultLine: 'Captures the input',
      pipelineStage: 'input',
    },
    technical: {
      label: 'Input',
      title: 'Input capture',
      copy: 'The raw text is accepted without paraphrase or expansion.',
      resultLine: 'Exact input boundary',
      pipelineStage: 'input',
    },
  },
  {
    id: 'signal-detection',
    sequence: '02',
    plain: {
      label: 'Signals',
      title: 'What signals are present?',
      copy: 'It scans for marker patterns, boundary cues, and structural signals in the text.',
      resultLine: 'Detects the signals',
      pipelineStage: 'scan / detect',
    },
    technical: {
      label: 'Detection',
      title: 'Marker detection',
      copy: 'The pipeline scans for registered marker families, signal patterns, and structural cues.',
      resultLine: 'Registered markers only',
      pipelineStage: 'detect',
    },
  },
  {
    id: 'structural-interpretation',
    sequence: '03',
    plain: {
      label: 'Structure',
      title: 'What structure is present?',
      copy: 'It checks how the text is framed and whether it stays within the declared structure.',
      resultLine: 'Identifies the pattern',
      pipelineStage: 'parse / classify',
    },
    technical: {
      label: 'Structure',
      title: 'Structural classification',
      copy: 'The text is parsed into bounded structural patterns without open-ended drift.',
      resultLine: 'Bounded parse path',
      pipelineStage: 'parse / classify',
    },
  },
  {
    id: 'boundary-validation',
    sequence: '04',
    plain: {
      label: 'Boundary',
      title: 'Does it stay within scope?',
      copy: 'It checks whether the text remains stable, bounded, and supportable.',
      resultLine: 'Checks stability',
      pipelineStage: 'boundary check',
    },
    technical: {
      label: 'Boundary',
      title: 'Boundary validation',
      copy: 'Domain and boundary checks are applied before any result is returned.',
      resultLine: 'Boundary check first',
      pipelineStage: 'boundary / scope',
    },
  },
  {
    id: 'constraint-enforcement',
    sequence: '05',
    plain: {
      label: 'Rules',
      title: 'Does it pass the rules?',
      copy: "It validates the text against ZeroGlare's authored rules.",
      resultLine: 'Applies the constraints',
      pipelineStage: 'validate / enforce',
    },
    technical: {
      label: 'Enforcement',
      title: 'Constraint enforcement',
      copy: 'The output is validated against explicit enforcement rules and refusal conditions.',
      resultLine: 'Enforces refusal conditions',
      pipelineStage: 'validate / enforce',
    },
  },
  {
    id: 'structured-result',
    sequence: '06',
    plain: {
      label: 'Outcome',
      title: 'Structured result',
      copy: 'ZeroGlare returns a structured response when the input passes, or an explicit refusal when it does not.',
      resultLine: 'Returns the outcome',
      pipelineStage: 'analysis / refusal',
    },
    technical: {
      label: 'Outcome',
      title: 'Binary outcome',
      copy: 'The system returns structured output or refusal, with no silent ambiguity handling.',
      resultLine: 'No silent drift',
      pipelineStage: 'analysis / refusal',
    },
  },
];

export function buildHomepageWalkthroughCards(
  mode: HomepageWalkthroughMode,
): HomepageWalkthroughRenderedCard[] {
  return HOMEPAGE_WALKTHROUGH_CARDS.map((card) => ({
    ...card,
    view: card[mode],
  }));
}
