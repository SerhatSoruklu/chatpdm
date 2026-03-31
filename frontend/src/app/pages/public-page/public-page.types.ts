export interface PublicPageQuestion {
  question: string;
  answer: string;
}

export interface PublicPageAction {
  label: string;
  route: string;
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
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'data-retention'
  | 'acceptable-use'
  | 'terms'
  | 'cookies'
  | 'docs'
  | 'developers'
  | 'handbooks'
  | 'not-found';
