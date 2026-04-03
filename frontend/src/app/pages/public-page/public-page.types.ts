export interface PublicPageQuestion {
  question: string;
  answer: string;
}

export interface PublicPageAction {
  label: string;
  route: string;
}

export interface PublicPageLink {
  label: string;
  route: string;
  note?: string;
  fragment?: string;
}

export interface PublicPageContact {
  label: string;
  email: string;
  note?: string;
}

export interface PublicPageSection {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  questions?: readonly PublicPageQuestion[];
  contacts?: readonly PublicPageContact[];
  links?: readonly PublicPageLink[];
}

export interface PublicPageContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly PublicPageSection[];
  action?: PublicPageAction;
}

export type PublicPageKey =
  | 'about'
  | 'what-is-chatpdm'
  | 'how-it-works'
  | 'zeroglare'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'data-retention'
  | 'acceptable-use'
  | 'terms'
  | 'cookies'
  | 'scope-model'
  | 'docs'
  | 'developers'
  | 'source-model'
  | 'handbooks'
  | 'handbooks-concept-authoring'
  | 'handbooks-review-admission'
  | 'handbooks-source-usage'
  | 'handbooks-rejection-handling'
  | 'handbooks-comparison-authoring'
  | 'handbooks-runtime-discipline'
  | 'not-found';
