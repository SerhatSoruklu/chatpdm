import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import type {
  LegalValidatorContractSnapshot,
  LegalValidatorIntakeRequest,
  LegalValidatorIntakeResponse,
  LegalValidatorOrchestrateRequest,
  LegalValidatorOrchestrateResponse,
  LegalValidatorRunExportResponse,
  LegalValidatorRunReportResponse,
  LegalValidatorReplayRequest,
  LegalValidatorReplayResponse,
  LegalValidatorRunInspectionResponse,
} from '../../pages/legal-validator-workbench-page/legal-validator-workbench-page.model';
import type {
  LegalValidatorFrontDoorContract,
  LegalValidatorIntakeContract,
  LegalValidatorOrchestrateContract,
  LegalValidatorReplayContract,
  LegalValidatorRunsContract,
} from '../../pages/legal-validator-workbench-page/legal-validator-workbench-page.model';

@Injectable({
  providedIn: 'root',
})
export class LegalValidatorWorkbenchService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  readonly apiOrigin = resolveApiOrigin(this.document);

  loadContracts(): Observable<LegalValidatorContractSnapshot> {
    return forkJoin({
      frontDoor: this.http.get<LegalValidatorFrontDoorContract>(`${this.apiOrigin}/api/v1/legal-validator`),
      intake: this.http.get<LegalValidatorIntakeContract>(`${this.apiOrigin}/api/v1/legal-validator/intake`),
      orchestrate: this.http.get<LegalValidatorOrchestrateContract>(`${this.apiOrigin}/api/v1/legal-validator/orchestrate`),
      replay: this.http.get<LegalValidatorReplayContract>(`${this.apiOrigin}/api/v1/legal-validator/replay`),
      runs: this.http.get<LegalValidatorRunsContract>(`${this.apiOrigin}/api/v1/legal-validator/runs`),
    });
  }

  runIntake(request: LegalValidatorIntakeRequest): Observable<LegalValidatorIntakeResponse> {
    return this.http.post<LegalValidatorIntakeResponse>(`${this.apiOrigin}/api/v1/legal-validator/intake`, request);
  }

  runOrchestrate(request: LegalValidatorOrchestrateRequest): Observable<LegalValidatorOrchestrateResponse> {
    return this.http.post<LegalValidatorOrchestrateResponse>(`${this.apiOrigin}/api/v1/legal-validator/orchestrate`, request);
  }

  runReplay(request: LegalValidatorReplayRequest): Observable<LegalValidatorReplayResponse> {
    return this.http.post<LegalValidatorReplayResponse>(`${this.apiOrigin}/api/v1/legal-validator/replay`, request);
  }

  loadInspection(validationRunId: string): Observable<LegalValidatorRunInspectionResponse> {
    return this.http.get<LegalValidatorRunInspectionResponse>(
      `${this.apiOrigin}/api/v1/legal-validator/runs/${encodeURIComponent(validationRunId)}`,
    );
  }

  loadReport(validationRunId: string): Observable<LegalValidatorRunReportResponse> {
    return this.http.get<LegalValidatorRunReportResponse>(
      `${this.apiOrigin}/api/v1/legal-validator/runs/${encodeURIComponent(validationRunId)}/report`,
    );
  }

  loadExport(validationRunId: string): Observable<LegalValidatorRunExportResponse> {
    return this.http.get<LegalValidatorRunExportResponse>(
      `${this.apiOrigin}/api/v1/legal-validator/runs/${encodeURIComponent(validationRunId)}/export`,
    );
  }
}
