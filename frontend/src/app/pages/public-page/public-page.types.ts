export interface PublicPageQuestion {
  question: string;
  answer: string;
}

export interface PublicPageAction {
  label: string;
  route: string;
}

export interface PublicPageSection {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  questions?: readonly PublicPageQuestion[];
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
  | 'how-it-works'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'data-retention'
  | 'docs'
  | 'developers'
  | 'handbooks'
  | 'api'
  | 'not-found';
