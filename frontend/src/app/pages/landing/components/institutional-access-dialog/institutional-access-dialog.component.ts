import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { ManagedAccessService } from '../../../../core/managed-access/managed-access.service';
import {
  ManagedAccessChallenge,
  ManagedAccessDeploymentPreferenceId,
  ManagedAccessDnsTxtChallenge,
  ManagedAccessIndustryOptionId,
  ManagedAccessRequestPayload,
  ManagedAccessRequestReceipt,
  ManagedAccessVerificationMethodId,
  ManagedAccessWebsiteFileChallenge,
} from '../../../../core/managed-access/managed-access.types';

type InstitutionalAccessSectionId = 'verification' | 'institution' | 'review';

interface InstitutionalAccessSection {
  id: InstitutionalAccessSectionId;
  sequence: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
}

interface VerificationMethodOption {
  id: ManagedAccessVerificationMethodId;
  label: string;
  title: string;
  copy: string;
  availability: 'operational' | 'stronger';
  availabilityLabel: string;
}

interface SelectionOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface ReviewRow {
  label: string;
  value: string;
}

interface ValidationSnapshot {
  institutionName: boolean;
  companyDomain: boolean;
  industry: boolean;
  deploymentPreference: boolean;
  workEmail: boolean;
  institutionStepComplete: boolean;
}

type ManagedAccessRequestSubmissionState = 'idle' | 'submitting' | 'submitted' | 'error';
type ManagedAccessVerificationRefreshState = 'idle' | 'refreshing' | 'error';

const INSTITUTIONAL_ACCESS_SECTIONS: readonly InstitutionalAccessSection[] = [
  {
    id: 'verification',
    sequence: '01',
    label: 'Verification',
    eyebrow: 'Verification path',
    title: 'Choose an organizational control method.',
    summary:
      'Managed access begins with a bounded verification path that matches institutional control requirements.',
  },
  {
    id: 'institution',
    sequence: '02',
    label: 'Institution',
    eyebrow: 'Institutional intent',
    title: 'Capture the operating boundary before review.',
    summary:
      'Institutional identity, domain boundary, and deployment posture are collected before managed access enters trust review.',
  },
  {
    id: 'review',
    sequence: '03',
    label: 'Review',
    eyebrow: 'Managed access boundary',
    title: 'Review the current managed access record.',
    summary:
      'This review surface summarizes the current institutional intent record before managed access enters trust review.',
  },
];

const VERIFICATION_METHODS: readonly VerificationMethodOption[] = [
  {
    id: 'work_email',
    label: 'Work Email',
    title: 'Operational verification path',
    copy:
      'Send a secure email link to confirm control of an institutional work mailbox before trust review.',
    availability: 'operational',
    availabilityLabel: 'Operational now',
  },
  {
    id: 'dns_txt',
    label: 'DNS TXT',
    title: 'Stronger organization proof',
    copy:
      'Publish a domain TXT record to prove organizational control at the DNS layer before trust review.',
    availability: 'stronger',
    availabilityLabel: 'Stronger proof',
  },
  {
    id: 'website_file',
    label: 'Website File',
    title: 'Public domain verification file',
    copy:
      'Host a verification file on the declared website boundary to prove stronger institutional control.',
    availability: 'stronger',
    availabilityLabel: 'Stronger proof',
  },
];

const INDUSTRY_OPTIONS: readonly SelectionOption<ManagedAccessIndustryOptionId>[] = [
  { value: 'banking_financial_services', label: 'Banking / Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'legal', label: 'Legal' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'education', label: 'Education' },
  { value: 'standards_certification', label: 'Standards / Certification' },
  { value: 'government_public_sector', label: 'Government / Public Sector' },
  { value: 'enterprise_policy_compliance', label: 'Enterprise Policy / Compliance' },
  { value: 'other', label: 'Other' },
];

const DEPLOYMENT_PREFERENCE_OPTIONS: readonly SelectionOption<ManagedAccessDeploymentPreferenceId>[] = [
  { value: 'hosted_by_chatpdm', label: 'Hosted by ChatPDM' },
  { value: 'private_runtime_later', label: 'Private runtime later' },
  { value: 'exploring_options', label: 'Exploring options' },
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function isReasonableDomain(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value);
}

function isReasonableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function describeChallengeFailureReason(reason: string | null): string | null {
  switch (reason) {
    case 'dns_lookup_unavailable':
      return 'DNS TXT verification is not yet visible. Wait for propagation and refresh again.';
    case 'dns_txt_record_not_found_or_mismatch':
      return 'The expected DNS TXT record was not found or did not match the required value.';
    case 'website_file_not_found':
      return 'The verification file was not found at the required website path.';
    case 'website_file_unreachable':
      return 'The verification file could not be read from the declared website boundary.';
    case 'website_file_fetch_unavailable':
      return 'The verification file could not be checked at this time. Refresh again in a moment.';
    case 'website_file_content_mismatch':
      return 'The verification file content did not match the expected payload.';
    case 'challenge_expired':
      return 'This stronger-proof challenge has expired. Submit a fresh managed access request to continue.';
    default:
      return null;
  }
}

@Component({
  selector: 'app-institutional-access-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './institutional-access-dialog.component.html',
  styleUrl: './institutional-access-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionalAccessDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<InstitutionalAccessDialogComponent>);
  private readonly managedAccessService = inject(ManagedAccessService);

  protected readonly sections = INSTITUTIONAL_ACCESS_SECTIONS;
  protected readonly verificationMethods = VERIFICATION_METHODS;
  protected readonly industryOptions = INDUSTRY_OPTIONS;
  protected readonly deploymentPreferenceOptions = DEPLOYMENT_PREFERENCE_OPTIONS;
  protected readonly activeSectionIndex = signal(0);
  protected readonly selectedVerificationMethod = signal<ManagedAccessVerificationMethodId>('work_email');
  protected readonly institutionName = signal('');
  protected readonly companyDomain = signal('');
  protected readonly industry = signal<ManagedAccessIndustryOptionId | ''>('');
  protected readonly deploymentPreference = signal<ManagedAccessDeploymentPreferenceId | ''>('');
  protected readonly workEmail = signal('');
  protected readonly requestSubmissionState = signal<ManagedAccessRequestSubmissionState>('idle');
  protected readonly verificationRefreshState = signal<ManagedAccessVerificationRefreshState>('idle');
  protected readonly requestSubmissionError = signal<string | null>(null);
  protected readonly verificationRefreshError = signal<string | null>(null);
  protected readonly clipboardFeedback = signal<string | null>(null);
  protected readonly requestReceipt = signal<ManagedAccessRequestReceipt | null>(null);

  protected readonly activeSection = computed(
    () => this.sections[this.activeSectionIndex()] ?? this.sections[0],
  );
  protected readonly isFirstSection = computed(() => this.activeSectionIndex() === 0);
  protected readonly isReviewStep = computed(() => this.activeSection().id === 'review');
  protected readonly isWorkEmailPath = computed(
    () => this.selectedVerificationMethod() === 'work_email',
  );
  protected readonly isDnsTxtPath = computed(
    () => this.selectedVerificationMethod() === 'dns_txt',
  );
  protected readonly isWebsiteFilePath = computed(
    () => this.selectedVerificationMethod() === 'website_file',
  );
  protected readonly isStrongerProofPath = computed(() => !this.isWorkEmailPath());
  protected readonly isRequestSubmitting = computed(
    () => this.requestSubmissionState() === 'submitting',
  );
  protected readonly isRequestCreated = computed(() => this.requestReceipt() !== null);
  protected readonly isRequestRefreshing = computed(
    () => this.verificationRefreshState() === 'refreshing',
  );
  protected readonly isActionPending = computed(
    () => this.isRequestSubmitting() || this.isRequestRefreshing(),
  );
  protected readonly isRequestEditingLocked = computed(
    () => this.isRequestCreated() || this.isActionPending(),
  );
  protected readonly selectedVerificationMethodOption = computed(
    () => this.verificationMethods.find((method) => method.id === this.selectedVerificationMethod()) ?? this.verificationMethods[0],
  );
  protected readonly selectedMethodBoundaryNotice = computed(() => {
    if (this.isWorkEmailPath()) {
      return null;
    }

    if (this.isDnsTxtPath()) {
      return 'DNS TXT verification provides stronger organization proof and upgrades the institutional trust record once verified.';
    }

    return 'Website file verification provides stronger organization proof and upgrades the institutional trust record once verified.';
  });
  protected readonly validation = computed<ValidationSnapshot>(() => {
    const institutionNameValue = normalizeText(this.institutionName());
    const companyDomainValue = normalizeDomain(this.companyDomain());
    const workEmailValue = this.workEmail().trim().toLowerCase();

    const institutionNameValid = institutionNameValue.length > 0;
    const companyDomainValid = isReasonableDomain(companyDomainValue);
    const industryValid = this.industry() !== '';
    const deploymentPreferenceValid = this.deploymentPreference() !== '';
    const workEmailValid = isReasonableEmail(workEmailValue);

    return {
      institutionName: institutionNameValid,
      companyDomain: companyDomainValid,
      industry: industryValid,
      deploymentPreference: deploymentPreferenceValid,
      workEmail: workEmailValid,
      institutionStepComplete: (
        institutionNameValid
        && companyDomainValid
        && industryValid
        && deploymentPreferenceValid
        && workEmailValid
      ),
    };
  });
  protected readonly canAdvance = computed(() => {
    if (this.isRequestEditingLocked()) {
      return false;
    }

    if (this.activeSection().id === 'verification') {
      return true;
    }

    if (this.activeSection().id === 'institution') {
      return this.validation().institutionStepComplete;
    }

    return true;
  });
  protected readonly canSubmitRequest = computed(() => (
    this.isReviewStep()
    && !this.isRequestCreated()
    && this.validation().institutionStepComplete
    && !this.isActionPending()
  ));
  protected readonly currentChallenge = computed<ManagedAccessChallenge | null>(() => (
    this.requestReceipt()?.challenge ?? null
  ));
  protected readonly dnsTxtChallenge = computed<ManagedAccessDnsTxtChallenge | null>(() => {
    const challenge = this.currentChallenge();
    return challenge?.type === 'dns_txt' ? challenge : null;
  });
  protected readonly websiteFileChallenge = computed<ManagedAccessWebsiteFileChallenge | null>(() => {
    const challenge = this.currentChallenge();
    return challenge?.type === 'website_file' ? challenge : null;
  });
  protected readonly websiteFileDownloadHref = computed(() => {
    const challenge = this.websiteFileChallenge();

    if (!challenge) {
      return null;
    }

    return `data:text/plain;charset=utf-8,${encodeURIComponent(challenge.content)}`;
  });
  protected readonly canRefreshStrongerProof = computed(() => {
    const receipt = this.requestReceipt();

    return !!receipt
      && this.isReviewStep()
      && receipt.verificationMethod !== 'work_email'
      && receipt.verificationState !== 'verified'
      && receipt.verificationState !== 'expired'
      && !this.isActionPending();
  });
  protected readonly primaryActionLabel = computed(() => {
    const receipt = this.requestReceipt();

    if (!this.isReviewStep()) {
      return 'Next';
    }

    if (this.isRequestSubmitting()) {
      if (this.isWorkEmailPath()) {
        return 'Sending verification email…';
      }

      if (this.isDnsTxtPath()) {
        return 'Generating DNS challenge…';
      }

      return 'Generating website file…';
    }

    if (this.isRequestRefreshing()) {
      return 'Refreshing verification status…';
    }

    if (!receipt) {
      if (this.isWorkEmailPath()) {
        return 'Send verification email';
      }

      if (this.isDnsTxtPath()) {
        return 'Generate DNS challenge';
      }

      return 'Generate website file';
    }

    if (receipt.verificationMethod === 'work_email' || receipt.verificationState === 'verified' || receipt.verificationState === 'expired') {
      return 'Close';
    }

    if (receipt.verificationMethod === 'dns_txt') {
      return 'Refresh DNS status';
    }

    return 'Refresh website file status';
  });
  protected readonly secondaryActionLabel = computed(() => (
    this.isRequestCreated() ? 'Close' : 'Back'
  ));
  protected readonly reviewRows = computed<ReviewRow[]>(() => [
    {
      label: 'Verification Method',
      value: this.selectedVerificationMethodOption().label,
    },
    {
      label: 'Institution Name',
      value: normalizeText(this.institutionName()),
    },
    {
      label: 'Company Domain',
      value: normalizeDomain(this.companyDomain()),
    },
    {
      label: 'Industry',
      value: this.optionLabel(this.industryOptions, this.industry()),
    },
    {
      label: 'Deployment Preference',
      value: this.optionLabel(this.deploymentPreferenceOptions, this.deploymentPreference()),
    },
    {
      label: 'Work Email',
      value: this.workEmail().trim().toLowerCase(),
    },
  ]);
  protected readonly challengeFailureMessage = computed(() => (
    describeChallengeFailureReason(this.requestReceipt()?.challengeFailureReason ?? null)
  ));
  protected readonly reviewPhaseNote = computed(() => {
    const receipt = this.requestReceipt();

    if (!receipt) {
      if (this.isWorkEmailPath()) {
        return 'A secure work email link will confirm organizational control before trust review.';
      }

      return 'Successful stronger organization proof upgrades the institutional trust record before trust review.';
    }

    if (receipt.verificationMethod === 'work_email') {
      return 'Verification email sent. Work email verification is required before trust review can continue.';
    }

    if (receipt.verificationState === 'verified') {
      return 'Stronger organization proof is verified. The institutional trust record is now stronger before any later private deployment path.';
    }

    if (receipt.verificationState === 'expired') {
      return 'This stronger-proof challenge expired before verification completed. Submit a fresh request to continue.';
    }

    if (receipt.verificationState === 'failed') {
      return 'Stronger organization proof has not yet been confirmed. Correct the challenge on your domain boundary and refresh again.';
    }

    return 'Stronger organization proof is pending. Publish the exact challenge and refresh verification status when ready.';
  });

  protected close(): void {
    if (this.isActionPending()) {
      return;
    }

    this.dialogRef.close();
  }

  protected selectSection(index: number): void {
    if (index < 0 || index >= this.sections.length) {
      return;
    }

    if (this.isRequestEditingLocked()) {
      return;
    }

    if (index === 2 && !this.validation().institutionStepComplete) {
      return;
    }

    this.activeSectionIndex.set(index);
  }

  protected selectVerificationMethod(method: VerificationMethodOption): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.selectedVerificationMethod.set(method.id);
    this.resetWorkingMessages();
  }

  protected handleSecondaryAction(): void {
    if (this.isActionPending()) {
      return;
    }

    if (this.isRequestCreated()) {
      this.close();
      return;
    }

    this.goBack();
  }

  protected async handlePrimaryAction(): Promise<void> {
    if (!this.isReviewStep()) {
      if (!this.canAdvance()) {
        return;
      }

      this.activeSectionIndex.update((index) => index + 1);
      return;
    }

    const receipt = this.requestReceipt();

    if (!receipt) {
      await this.submitManagedAccessRequest();
      return;
    }

    if (
      receipt.verificationMethod === 'work_email'
      || receipt.verificationState === 'verified'
      || receipt.verificationState === 'expired'
    ) {
      this.close();
      return;
    }

    await this.refreshStrongerProofVerification();
  }

  protected updateInstitutionName(value: string): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.institutionName.set(value);
    this.resetWorkingMessages();
  }

  protected updateCompanyDomain(value: string): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.companyDomain.set(value);
    this.resetWorkingMessages();
  }

  protected updateIndustry(value: ManagedAccessIndustryOptionId | ''): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.industry.set(value);
    this.resetWorkingMessages();
  }

  protected updateDeploymentPreference(value: ManagedAccessDeploymentPreferenceId | ''): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.deploymentPreference.set(value);
    this.resetWorkingMessages();
  }

  protected updateWorkEmail(value: string): void {
    if (this.isRequestEditingLocked()) {
      return;
    }

    this.workEmail.set(value);
    this.resetWorkingMessages();
  }

  protected fieldValue(field: 'institutionName' | 'companyDomain' | 'workEmail'): string {
    switch (field) {
      case 'institutionName':
        return this.institutionName();
      case 'companyDomain':
        return this.companyDomain();
      case 'workEmail':
        return this.workEmail();
      default:
        return '';
    }
  }

  protected fieldInvalid(field: keyof Omit<ValidationSnapshot, 'institutionStepComplete'>): boolean {
    const validation = this.validation();

    switch (field) {
      case 'institutionName':
        return this.fieldValue('institutionName').trim() !== '' && !validation.institutionName;
      case 'companyDomain':
        return this.fieldValue('companyDomain').trim() !== '' && !validation.companyDomain;
      case 'industry':
        return this.industry() !== '' && !validation.industry;
      case 'deploymentPreference':
        return this.deploymentPreference() !== '' && !validation.deploymentPreference;
      case 'workEmail':
        return this.workEmail().trim() !== '' && !validation.workEmail;
      default:
        return false;
    }
  }

  protected showRequiredState(field: keyof Omit<ValidationSnapshot, 'institutionStepComplete'>): boolean {
    const validation = this.validation();

    switch (field) {
      case 'institutionName':
        return !validation.institutionName && this.institutionName().trim() === '';
      case 'companyDomain':
        return !validation.companyDomain && this.companyDomain().trim() === '';
      case 'industry':
        return !validation.industry && this.industry() === '';
      case 'deploymentPreference':
        return !validation.deploymentPreference && this.deploymentPreference() === '';
      case 'workEmail':
        return !validation.workEmail && this.workEmail().trim() === '';
      default:
        return false;
    }
  }

  protected optionLabel<TValue extends string>(
    options: readonly SelectionOption<TValue>[],
    value: TValue | '',
  ): string {
    return options.find((option) => option.value === value)?.label ?? 'Not set';
  }

  protected reviewStateLabel(): string {
    const receipt = this.requestReceipt();

    if (!receipt) {
      if (this.isWorkEmailPath()) {
        return 'Ready for email verification';
      }

      if (this.isDnsTxtPath()) {
        return 'Ready to issue DNS TXT challenge';
      }

      return 'Ready to issue website file challenge';
    }

    if (receipt.verificationMethod === 'work_email') {
      return 'Verification email sent';
    }

    switch (receipt.verificationState) {
      case 'verified':
        return 'Stronger proof verified';
      case 'failed':
        return 'Stronger proof not yet detected';
      case 'expired':
        return 'Challenge expired';
      default:
        return 'Stronger proof pending';
    }
  }

  protected async copyText(value: string, successLabel: string): Promise<void> {
    try {
      const clipboard = globalThis.navigator?.clipboard;

      if (!clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await clipboard.writeText(value);
      this.clipboardFeedback.set(successLabel);
    } catch {
      this.clipboardFeedback.set('Copy is not available in this browser context.');
    }
  }

  protected workEmailFieldLabel(): string {
    return this.isWorkEmailPath() ? 'Work email' : 'Work email contact';
  }

  private goBack(): void {
    if (this.isFirstSection()) {
      return;
    }

    this.activeSectionIndex.update((index) => index - 1);
  }

  private buildRequestPayload(): ManagedAccessRequestPayload {
    return {
      verificationMethod: this.selectedVerificationMethod(),
      institutionName: normalizeText(this.institutionName()),
      companyDomain: normalizeDomain(this.companyDomain()),
      industry: this.industry() as ManagedAccessIndustryOptionId,
      deploymentPreference: this.deploymentPreference() as ManagedAccessDeploymentPreferenceId,
      workEmail: this.workEmail().trim().toLowerCase(),
    };
  }

  private resetWorkingMessages(): void {
    if (this.isRequestCreated()) {
      return;
    }

    this.requestSubmissionState.set('idle');
    this.verificationRefreshState.set('idle');
    this.requestSubmissionError.set(null);
    this.verificationRefreshError.set(null);
    this.clipboardFeedback.set(null);
  }

  private async submitManagedAccessRequest(): Promise<void> {
    if (!this.canSubmitRequest()) {
      return;
    }

    this.requestSubmissionState.set('submitting');
    this.requestSubmissionError.set(null);
    this.verificationRefreshError.set(null);
    this.clipboardFeedback.set(null);

    try {
      const receipt = await firstValueFrom(
        this.managedAccessService.createRequest(this.buildRequestPayload()),
      );

      this.requestReceipt.set(receipt);
      this.requestSubmissionState.set('submitted');
    } catch (error) {
      this.requestSubmissionState.set('error');
      this.requestSubmissionError.set(this.resolveApiErrorMessage(
        error,
        'The managed access request could not be created. Try again in a moment.',
      ));
    }
  }

  private async refreshStrongerProofVerification(): Promise<void> {
    const receipt = this.requestReceipt();

    if (!receipt || receipt.verificationMethod === 'work_email' || !this.canRefreshStrongerProof()) {
      return;
    }

    this.verificationRefreshState.set('refreshing');
    this.verificationRefreshError.set(null);
    this.clipboardFeedback.set(null);

    try {
      const updatedReceipt = await firstValueFrom(
        receipt.verificationMethod === 'dns_txt'
          ? this.managedAccessService.verifyDnsChallenge({ requestId: receipt.requestId })
          : this.managedAccessService.verifyWebsiteFileChallenge({ requestId: receipt.requestId }),
      );

      this.requestReceipt.set(updatedReceipt);
      this.verificationRefreshState.set('idle');
    } catch (error) {
      this.verificationRefreshState.set('error');
      this.verificationRefreshError.set(this.resolveApiErrorMessage(
        error,
        'Verification status could not be refreshed. Try again in a moment.',
      ));
    }
  }

  private resolveApiErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      const errorMessage = this.readApiErrorMessage(error.error);

      if (errorMessage) {
        return errorMessage;
      }
    }

    return fallbackMessage;
  }

  private readApiErrorMessage(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const apiError = (value as { error?: { message?: unknown } }).error;

    return typeof apiError?.message === 'string' && apiError.message.trim()
      ? apiError.message
      : null;
  }
}
