import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LegalValidatorWorkbenchService } from '../../core/legal-validator/legal-validator-workbench.service';
import {
  buildIntakeRequest,
  buildOrchestrateRequest,
  buildReplayRequest,
  createBlankLegalValidatorWorkbenchDraft,
  splitDelimitedText,
  type LegalValidatorContractSnapshot,
  type LegalValidatorIntakeResponse,
  type LegalValidatorOrchestratePhase,
  type LegalValidatorOrchestrateResponse,
  type LegalValidatorRunExportResponse,
  type LegalValidatorRunReportResponse,
  type LegalValidatorReplayResponse,
  type LegalValidatorRunInspectionResponse,
  type LegalValidatorWorkbenchDraft,
} from './legal-validator-workbench-page.model';
import {
  LEGAL_VALIDATOR_WORKBENCH_PAGE_TITLE,
  LEGAL_VALIDATOR_WORKBENCH_ROUTE_PATH,
} from './legal-validator-workbench-page.constants';

interface LoadState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  errorMessage: string | null;
}

function createLoadState<T>(status: LoadState<T>['status'] = 'idle'): LoadState<T> {
  return {
    status,
    data: null,
    errorMessage: null,
  };
}

function isHex64(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isPrefixedRuntimeId(value: string, prefix: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith(prefix) && trimmed.length > prefix.length;
}

@Component({
  selector: 'app-legal-validator-workbench-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './legal-validator-workbench-page.component.html',
  styleUrl: './legal-validator-workbench-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalValidatorWorkbenchPageComponent implements OnInit {
  private readonly workbenchApi = inject(LegalValidatorWorkbenchService);

  protected readonly pageTitle = LEGAL_VALIDATOR_WORKBENCH_PAGE_TITLE;
  protected readonly pageRoute = LEGAL_VALIDATOR_WORKBENCH_ROUTE_PATH;
  protected readonly apiOrigin = this.workbenchApi.apiOrigin;
  protected readonly draft: LegalValidatorWorkbenchDraft = createBlankLegalValidatorWorkbenchDraft();
  protected readonly contractsState = signal<LoadState<LegalValidatorContractSnapshot>>(
    createLoadState<LegalValidatorContractSnapshot>(),
  );
  protected readonly intakeState = signal<LoadState<LegalValidatorIntakeResponse>>(
    createLoadState<LegalValidatorIntakeResponse>(),
  );
  protected readonly orchestrateState = signal<LoadState<LegalValidatorOrchestrateResponse>>(
    createLoadState<LegalValidatorOrchestrateResponse>(),
  );
  protected readonly replayState = signal<LoadState<LegalValidatorReplayResponse>>(
    createLoadState<LegalValidatorReplayResponse>(),
  );
  protected readonly inspectionState = signal<LoadState<LegalValidatorRunInspectionResponse>>(
    createLoadState<LegalValidatorRunInspectionResponse>(),
  );
  protected readonly reportState = signal<LoadState<LegalValidatorRunReportResponse>>(
    createLoadState<LegalValidatorRunReportResponse>(),
  );
  protected readonly exportState = signal<LoadState<LegalValidatorRunExportResponse>>(
    createLoadState<LegalValidatorRunExportResponse>(),
  );

  ngOnInit(): void {
    void this.loadContracts();
  }

  protected canRunIntake(): boolean {
    return [
      isPrefixedRuntimeId(this.draft.matterId, 'matter-'),
      hasText(this.draft.matterTitle),
      hasText(this.draft.matterJurisdiction),
      hasText(this.draft.matterPracticeArea),
      hasText(this.draft.matterCreatedBy),
      isPrefixedRuntimeId(this.draft.sourceDocumentId, 'source-document-'),
    ].every(Boolean);
  }

  protected canRunOrchestrate(): boolean {
    const baseFieldsFilled = [
      isPrefixedRuntimeId(this.draft.matterId, 'matter-'),
      hasText(this.draft.matterJurisdiction),
      hasText(this.draft.matterPracticeArea),
      isPrefixedRuntimeId(this.draft.sourceDocumentId, 'source-document-'),
      isPrefixedRuntimeId(this.draft.doctrineArtifactId, 'artifact-'),
      isPrefixedRuntimeId(this.draft.validationRunId, 'validation-run-'),
      hasText(this.draft.traceResolverVersion),
      this.draft.traceInputHash.trim().length > 0,
    ].every(Boolean);

    if (!baseFieldsFilled || !isHex64(this.draft.traceInputHash)) {
      return false;
    }

    const validationDecisionReady =
      this.draft.validationStatus === 'valid'
      || this.draft.validationReason.trim().length > 0
      || splitDelimitedText(this.draft.validationRuleIdsText).length > 0;

    if (this.draft.resolverStatus === 'success') {
      const matchBasisReady = (() => {
        if (this.draft.resolverMatchBasis === 'manual_override') {
          return isPrefixedRuntimeId(this.draft.resolverOverrideId, 'override-');
        }

        if (this.draft.resolverMatchBasis === 'exact_synonym') {
          return hasText(this.draft.resolverSynonymTerm);
        }

        return true;
      })();

      return validationDecisionReady && matchBasisReady && [
        isPrefixedRuntimeId(this.draft.resolverMappingId, 'mapping-'),
        hasText(this.draft.resolverConceptId),
        hasText(this.draft.resolverRuleId),
      ].every(Boolean);
    }

    return hasText(this.draft.resolverReason) && validationDecisionReady;
  }

  protected canRunReplay(): boolean {
    return isPrefixedRuntimeId(this.draft.validationRunId, 'validation-run-');
  }

  protected canLoadInspection(): boolean {
    return isPrefixedRuntimeId(this.draft.validationRunId, 'validation-run-');
  }

  protected canLoadReport(): boolean {
    return this.canLoadInspection();
  }

  protected canLoadExport(): boolean {
    return this.canLoadInspection();
  }

  protected exportHref(): string | null {
    if (!this.canLoadExport()) {
      return null;
    }

    return `${this.apiOrigin}/api/v1/legal-validator/runs/${encodeURIComponent(this.draft.validationRunId.trim())}/export`;
  }

  protected contractCards(): readonly ContractCard[] {
    const snapshot = this.contractsState().data;

    if (!snapshot) {
      return [];
    }

    return [
      {
        title: 'Scope lock',
        endpoint: `${this.apiOrigin}/api/v1/legal-validator`,
        contractVersion: snapshot.frontDoor.contractVersion,
        status: snapshot.frontDoor.status,
        allowedOperations: snapshot.frontDoor.allowedOperations,
        allowedOutcomes: snapshot.frontDoor.allowedOutcomes,
        detail: 'Front door contract for the validator boundary envelope.',
      },
      {
        title: 'Intake',
        endpoint: `${this.apiOrigin}/api/v1/legal-validator/intake`,
        contractVersion: snapshot.intake.contractVersion,
        status: snapshot.intake.status,
        allowedOperations: snapshot.intake.allowedOperations,
        allowedOutcomes: snapshot.intake.allowedOutcomes,
        detail: 'Matter intake and source-document linkage contract.',
      },
      {
        title: 'Orchestrate',
        endpoint: `${this.apiOrigin}/api/v1/legal-validator/orchestrate`,
        contractVersion: snapshot.orchestrate.contractVersion,
        status: snapshot.orchestrate.status,
        allowedOperations: snapshot.orchestrate.phaseOrder,
        allowedOutcomes: snapshot.orchestrate.allowedOutcomes,
        detail: 'Runtime phase contract for the legal validator engine.',
      },
      {
        title: 'Replay',
        endpoint: `${this.apiOrigin}/api/v1/legal-validator/replay`,
        contractVersion: snapshot.replay.contractVersion,
        status: snapshot.replay.status,
        allowedOperations: snapshot.replay.allowedOperations,
        allowedOutcomes: snapshot.replay.allowedOutcomes,
        detail: 'True replay contract for preserved validation runs.',
      },
      {
        title: 'Run inspection',
        endpoint: `${this.apiOrigin}/api/v1/legal-validator/runs/:validationRunId`,
        contractVersion: snapshot.runs.contractVersion,
        status: snapshot.runs.status,
        allowedOperations: snapshot.runs.allowedOperations,
        allowedOutcomes: snapshot.runs.allowedOutcomes,
        detail: 'Read-only inspection contract for persisted runtime truth.',
      },
    ] as const;
  }

  protected async loadContracts(): Promise<void> {
    this.contractsState.set(createLoadState<LegalValidatorContractSnapshot>('loading'));

    try {
      const contracts = await firstValueFrom(this.workbenchApi.loadContracts());

      this.contractsState.set({
        status: 'ready',
        data: contracts,
        errorMessage: null,
      });
    } catch (error) {
      this.contractsState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator contracts could not be loaded.'),
      });
    }
  }

  protected async runIntake(): Promise<void> {
    if (!this.canRunIntake()) {
      this.intakeState.set({
        status: 'error',
        data: null,
        errorMessage: 'Enter a persisted matter id and source-document id before running intake.',
      });
      return;
    }

    this.intakeState.set(createLoadState<LegalValidatorIntakeResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.runIntake(buildIntakeRequest(this.draft)));

      this.intakeState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });
    } catch (error) {
      this.intakeState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator intake request did not complete.'),
      });
    }
  }

  protected async runOrchestrate(): Promise<void> {
    if (!this.canRunOrchestrate()) {
      this.orchestrateState.set({
        status: 'error',
        data: null,
        errorMessage: 'Fill the runtime ids with persisted validator artifacts before orchestrating.',
      });
      return;
    }

    this.orchestrateState.set(createLoadState<LegalValidatorOrchestrateResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.runOrchestrate(buildOrchestrateRequest(this.draft)));

      this.orchestrateState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });

      if (response.final.validationRunId) {
        this.draft.validationRunId = response.final.validationRunId;
        await this.loadInspection();
      }
    } catch (error) {
      this.orchestrateState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator orchestration request did not complete.'),
      });
    }
  }

  protected async runReplay(): Promise<void> {
    if (!this.canRunReplay()) {
      this.replayState.set({
        status: 'error',
        data: null,
        errorMessage: 'Enter a persisted validation-run id before replaying.',
      });
      return;
    }

    this.replayState.set(createLoadState<LegalValidatorReplayResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.runReplay(buildReplayRequest(this.draft)));

      this.replayState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });
    } catch (error) {
      this.replayState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator replay request did not complete.'),
      });
    }
  }

  protected async loadInspection(): Promise<void> {
    if (!this.canLoadInspection()) {
      this.inspectionState.set({
        status: 'error',
        data: null,
        errorMessage: 'Enter a persisted validation-run id before loading inspection.',
      });
      return;
    }

    this.inspectionState.set(createLoadState<LegalValidatorRunInspectionResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.loadInspection(this.draft.validationRunId.trim()));

      this.inspectionState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });

      await this.loadReport();
    } catch (error) {
      this.inspectionState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator run inspection could not be loaded.'),
      });
    }
  }

  protected async loadReport(): Promise<void> {
    if (!this.canLoadReport()) {
      this.reportState.set({
        status: 'error',
        data: null,
        errorMessage: 'Enter a persisted validation-run id before loading the report.',
      });
      return;
    }

    this.reportState.set(createLoadState<LegalValidatorRunReportResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.loadReport(this.draft.validationRunId.trim()));

      this.reportState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });
    } catch (error) {
      this.reportState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator run report could not be loaded.'),
      });
    }
  }

  protected async loadExport(): Promise<void> {
    if (!this.canLoadExport()) {
      this.exportState.set({
        status: 'error',
        data: null,
        errorMessage: 'Enter a persisted validation-run id before loading the export.',
      });
      return;
    }

    this.exportState.set(createLoadState<LegalValidatorRunExportResponse>('loading'));

    try {
      const response = await firstValueFrom(this.workbenchApi.loadExport(this.draft.validationRunId.trim()));

      this.exportState.set({
        status: 'ready',
        data: response,
        errorMessage: null,
      });
    } catch (error) {
      this.exportState.set({
        status: 'error',
        data: null,
        errorMessage: this.describeError(error, 'The legal-validator run export could not be loaded.'),
      });
    }
  }

  protected phaseOutputJson(phase: LegalValidatorOrchestratePhase): string {
    return this.prettyJson(phase.output);
  }

  protected prettyJson(value: unknown): string {
    return JSON.stringify(value ?? null, null, 2);
  }

  protected segmentRange(segment: LegalValidatorRunInspectionResponse['sourceSegments'][number]): string {
    return `${segment.charStart} - ${segment.charEnd}`;
  }

  protected traceListLabel(trace: Record<string, unknown>, key: string): string {
    const value = trace[key];

    if (!Array.isArray(value)) {
      return 'None';
    }

    const entries = value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim());

    return entries.length > 0 ? entries.join(', ') : 'None';
  }

  protected replayComparisonLabel(replayState: LoadState<LegalValidatorReplayResponse>): string {
    const response = replayState.data;

    if (!response) {
      return 'Unavailable';
    }

    if (!response.final.replayComparison) {
      return 'Unavailable';
    }

    return response.final.replayComparison.ok === true ? 'Matched' : 'Mismatch';
  }

  protected reportComparisonLabel(reportState: LoadState<LegalValidatorRunReportResponse>): string {
    const response = reportState.data;

    if (!response) {
      return 'Unavailable';
    }

    if (!response.report.replay.replayComparison) {
      return 'Unavailable';
    }

    return response.report.replay.replayComparison.ok === true ? 'Matched' : 'Mismatch';
  }

  protected exportComparisonLabel(exportState: LoadState<LegalValidatorRunExportResponse>): string {
    const response = exportState.data;

    if (!response) {
      return 'Unavailable';
    }

    if (!response.report.replay.replayComparison) {
      return 'Unavailable';
    }

    return response.report.replay.replayComparison.ok === true ? 'Matched' : 'Mismatch';
  }

  private describeError(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      const backendError = error.error?.error;

      if (backendError && typeof backendError === 'object') {
        const message = backendError.message;

        if (typeof message === 'string' && message.trim().length > 0) {
          return `${backendError.code || 'error'}: ${message}`;
        }
      }

      if (typeof error.message === 'string' && error.message.trim().length > 0) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallbackMessage;
  }
}

interface ContractCard {
  title: string;
  endpoint: string;
  contractVersion: string;
  status: string;
  allowedOperations: readonly string[];
  allowedOutcomes: readonly string[];
  detail: string;
}
