import { CommonModule, DOCUMENT } from '@angular/common';
import {
  OnDestroy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { resolveApiOrigin } from '../core/api/api-origin';
import {
  ZEROGLARE_PUBLIC_MARKER_CODES,
  getZeroGlareMarkerDetails,
} from './zeroglare-marker-contract';

type ZeroglareMarkerId = string;

interface ZeroglareAnalyzeSignal {
  code?: string;
  detected?: boolean;
}

type ZeroglareDiagnosticStatus = 'clear' | 'pressure' | 'fail';

interface ZeroglareDiagnosticSummary {
  state: ZeroglareDiagnosticStatus;
  clearCount: number;
  pressureCount: number;
  failCount: number;
  markerCount: number;
}

interface ZeroglareAnalyzeResponse {
  status?: ZeroglareDiagnosticStatus;
  summary?: {
    state?: ZeroglareDiagnosticStatus;
    clear_count?: number;
    pressure_count?: number;
    fail_count?: number;
    marker_count?: number;
  };
  normalized_input_preview?: string | null;
  normalized_input_length?: number;
  normalized_input_truncated?: boolean;
  markers?: readonly string[];
  signals?: readonly ZeroglareAnalyzeSignal[];
  diagnostics?: {
    input?: {
      normalized_query?: string;
    };
    summary?: {
      active_signals?: readonly string[];
    };
    signals?: readonly ZeroglareAnalyzeSignal[];
  };
}

interface ZeroglareAnalysisResult {
  status: ZeroglareDiagnosticStatus;
  summary: ZeroglareDiagnosticSummary;
  normalizedInputPreview?: string;
  normalizedInputLength?: number;
  normalizedInputTruncated: boolean;
  markers: ZeroglareMarkerId[];
}

const MAX_INPUT_CHARS = 100_000;
const MAX_RENDER_CHARS = 2_000;
const FRONTEND_LIMIT_MESSAGE = 'Character limit reached. Maximum 100,000 characters allowed.';
const BACKEND_LIMIT_MESSAGE = 'Input exceeds maximum allowed size.';
const GENERIC_ERROR_MESSAGE = 'Zeroglare diagnostics are unavailable. Check that the backend is running on port 4301.';

@Component({
  selector: 'app-zeroglare-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './zeroglare.component.html',
  styleUrl: './zeroglare.component.css',
})
export class ZeroglareComponent implements OnInit, OnDestroy {
  @ViewChild('zeroglareInput') private readonly inputField?: ElementRef<HTMLTextAreaElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly apiOrigin = resolveApiOrigin(this.document);
  private pressureChart: { destroy: () => void } | null = null;
  private pressureChartRenderToken = 0;
  private abortController: AbortController | null = null;

  protected readonly MAX_INPUT_CHARS = MAX_INPUT_CHARS;
  protected readonly MAX_RENDER_CHARS = MAX_RENDER_CHARS;
  protected hasInput = false;
  protected inputLength = 0;
  protected isInputOverLimit = false;
  protected isAnalyzing = false;
  protected validationMessage = '';
  protected errorMessage = '';
  protected analysisResult: ZeroglareAnalysisResult | null = null;

  ngOnInit(): void {
    const view = this.document.defaultView;

    if (!view?.location.search) {
      return;
    }

    view.history.replaceState(view.history.state, '', `${view.location.pathname}${view.location.hash}`);
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
    this.clearPressureChart();
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    const nextLength = target?.value.length ?? 0;
    const nextHasInput = nextLength > 0;
    const nextOverLimit = nextLength > MAX_INPUT_CHARS;

    if (
      nextLength === this.inputLength
      && nextHasInput === this.hasInput
      && nextOverLimit === this.isInputOverLimit
    ) {
      return;
    }

    this.inputLength = nextLength;
    this.hasInput = nextHasInput;
    this.isInputOverLimit = nextOverLimit;
    this.errorMessage = '';
    this.validationMessage = nextOverLimit ? FRONTEND_LIMIT_MESSAGE : '';
    this.cdr.markForCheck();
  }

  protected async analyze(): Promise<void> {
    const query = this.inputField?.nativeElement.value.trim() ?? '';

    if (!query || this.isAnalyzing) {
      return;
    }

    if (this.inputLength > MAX_INPUT_CHARS) {
      this.validationMessage = FRONTEND_LIMIT_MESSAGE;
      this.cdr.detectChanges();
      return;
    }

    this.validationMessage = '';
    this.errorMessage = '';
    this.analysisResult = null;
    this.clearPressureChart();
    this.isAnalyzing = true;
    this.cdr.detectChanges();

    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    try {
      const response = await fetch(`${this.apiOrigin}/api/v1/zeroglare/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          input: query,
        }),
      });

      const body = await response.json().catch(() => null) as ZeroglareAnalyzeResponse & {
        error?: {
          code?: string;
          message?: string;
        };
      } | null;

      if (!response.ok) {
        const backendErrorCode = typeof body?.error === 'string'
          ? body.error
          : body?.error?.code;

        this.errorMessage = response.status === 413 || backendErrorCode === 'INPUT_TOO_LARGE'
          ? BACKEND_LIMIT_MESSAGE
          : GENERIC_ERROR_MESSAGE;
        this.cdr.detectChanges();
        return;
      }

      if (!body) {
        this.errorMessage = GENERIC_ERROR_MESSAGE;
        this.cdr.detectChanges();
        return;
      }

      const responseBody = body as ZeroglareAnalyzeResponse;
      const markers = this.extractMarkers(responseBody);
      const summary = this.resolveSummary(responseBody, markers);
      const normalizedInput = this.resolveNormalizedInputPreview(responseBody);

      this.analysisResult = {
        status: responseBody.status ?? summary.state,
        summary,
        normalizedInputPreview: normalizedInput.preview,
        normalizedInputLength: normalizedInput.length > 0 ? normalizedInput.length : undefined,
        normalizedInputTruncated: normalizedInput.truncated,
        markers,
      };
      this.cdr.detectChanges();
      const chartResult = this.analysisResult;
      this.document.defaultView?.setTimeout(() => {
        if (this.analysisResult === chartResult && chartResult) {
          void this.renderPressureChart(chartResult);
        }
      }, 0);
    } catch (_error) {
      if ((_error as DOMException | null)?.name === 'AbortError') {
        return;
      }

      this.errorMessage = GENERIC_ERROR_MESSAGE;
      this.cdr.detectChanges();
    } finally {
      this.isAnalyzing = false;
      if (this.abortController === controller) {
        this.abortController = null;
      }
      this.cdr.detectChanges();
    }
  }

  protected getMarkerTitle(marker: string): string {
    return getZeroGlareMarkerDetails(marker)?.label ?? marker;
  }

  protected getMarkerDescription(marker: string): string {
    return getZeroGlareMarkerDetails(marker)?.description
      ?? 'Diagnostic pressure detected by Zeroglare.';
  }

  protected getStatusLabel(status: ZeroglareDiagnosticStatus): string {
    switch (status) {
      case 'clear':
        return 'Clear';
      case 'pressure':
        return 'Pressure';
      case 'fail':
        return 'Fail';
      default:
        return 'Clear';
    }
  }

  protected getStatusCopy(status: ZeroglareDiagnosticStatus): string {
    switch (status) {
      case 'clear':
        return 'No diagnostic pressure markers were detected.';
      case 'pressure':
        return 'Signal pressure is present, but not at fail intensity.';
      case 'fail':
        return 'Signal pressure crossed the fail boundary.';
      default:
        return 'No diagnostic pressure markers were detected.';
    }
  }

  protected trackByMarker(_index: number, marker: string): string {
    return marker;
  }

  private extractMarkers(response: ZeroglareAnalyzeResponse): ZeroglareMarkerId[] {
    if (Array.isArray(response.markers) && response.markers.length > 0) {
      return ZEROGLARE_PUBLIC_MARKER_CODES.filter((marker) => response.markers?.includes(marker));
    }

    const activeSignals =
      response.diagnostics?.summary?.active_signals?.length
        ? response.diagnostics.summary.active_signals
        : response.diagnostics?.signals?.filter((signal) => signal.detected).map((signal) => signal.code ?? '') ?? [];

    const activeSignalSet = new Set(
      activeSignals.filter((marker) => ZEROGLARE_PUBLIC_MARKER_CODES.includes(marker)),
    );

    return ZEROGLARE_PUBLIC_MARKER_CODES.filter((marker) => activeSignalSet.has(marker));
  }

  private resolveSummary(
    response: ZeroglareAnalyzeResponse,
    markers: ZeroglareMarkerId[],
  ): ZeroglareDiagnosticSummary {
    const markerCount = markers.length;
    const responseSummary = response.summary;
    const state = response.status
      ?? responseSummary?.state
      ?? this.deriveStatusFromMarkers(markerCount);

    if (responseSummary) {
      return {
        state,
        clearCount: responseSummary.clear_count ?? (state === 'clear' ? 1 : 0),
        pressureCount: responseSummary.pressure_count ?? (state === 'pressure' ? markerCount : 0),
        failCount: responseSummary.fail_count ?? (state === 'fail' ? markerCount : 0),
        markerCount: responseSummary.marker_count ?? markerCount,
      };
    }

    return {
      state,
      clearCount: state === 'clear' ? 1 : 0,
      pressureCount: state === 'pressure' ? markerCount : 0,
      failCount: state === 'fail' ? markerCount : 0,
      markerCount,
    };
  }

  private resolveNormalizedInputPreview(response: ZeroglareAnalyzeResponse): {
    preview?: string;
    length: number;
    truncated: boolean;
  } {
    const preview = response.normalized_input_preview
      ?? response.diagnostics?.input?.normalized_query
      ?? null;

    if (!preview) {
      return {
        preview: undefined,
        length: response.normalized_input_length ?? 0,
        truncated: Boolean(response.normalized_input_truncated),
      };
    }

    const displayText = this.getDisplayText(preview);

    return {
      preview: displayText || undefined,
      length: response.normalized_input_length ?? preview.length,
      truncated: response.normalized_input_truncated ?? preview.length > this.MAX_RENDER_CHARS,
    };
  }

  private deriveStatusFromMarkers(markerCount: number): ZeroglareDiagnosticStatus {
    if (markerCount === 0) {
      return 'clear';
    }

    if (markerCount >= 3) {
      return 'fail';
    }

    return 'pressure';
  }

  private async renderPressureChart(result: ZeroglareAnalysisResult): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const renderToken = ++this.pressureChartRenderToken;
      const { default: ApexCharts } = await import('apexcharts');

      if (renderToken !== this.pressureChartRenderToken) {
        return;
      }

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      if (renderToken !== this.pressureChartRenderToken) {
        return;
      }

      const host = this.document.querySelector<HTMLDivElement>('.pdm-zeroglare__chart');

      if (!host) {
        return;
      }

      this.clearPressureChart();

      const chart = new ApexCharts(host, this.buildChartOptions(result));
      this.pressureChart = chart;
      await chart.render();
    } catch (_error) {
      this.clearPressureChart();
    }
  }

  private buildChartOptions(result: ZeroglareAnalysisResult): Record<string, unknown> {
    return {
      chart: {
        type: 'bar',
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: false },
        foreColor: '#cbd5e1',
        height: 238,
        parentHeightOffset: 0,
        sparkline: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '56%',
          borderRadius: 6,
          distributed: true,
        },
      },
      dataLabels: {
        enabled: true,
        offsetX: 8,
        style: {
          colors: ['#f8fafc'],
          fontSize: '12px',
          fontWeight: '600',
        },
      },
      series: [
        {
          name: 'Pressure level',
          data: [
            result.summary.clearCount,
            result.summary.pressureCount,
            result.summary.failCount,
          ],
        },
      ],
      colors: ['#60a5fa', '#f59e0b', '#f87171'],
      xaxis: {
        categories: ['Clear', 'Pressure', 'Fail'],
        labels: {
          style: {
            colors: ['#cbd5e1'],
            fontSize: '12px',
            fontWeight: 500,
          },
        },
      },
      yaxis: {
        labels: {
          minWidth: 96,
          maxWidth: 96,
          offsetX: 8,
          style: {
            colors: ['#cbd5e1'],
            fontSize: '12px',
            fontWeight: 600,
          },
        },
      },
      grid: {
        borderColor: 'rgba(148, 163, 184, 0.16)',
        strokeDashArray: 4,
        padding: {
          left: 18,
          right: 12,
          top: 0,
          bottom: 0,
        },
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
      },
      responsive: [
        {
          breakpoint: 599,
          options: {
            chart: {
              height: 192,
            },
            yaxis: {
              labels: {
                minWidth: 88,
                maxWidth: 88,
                offsetX: 4,
              },
            },
            grid: {
              padding: {
                left: 12,
                right: 8,
              },
            },
          },
        },
      ],
    };
  }

  private clearPressureChart(): void {
    this.pressureChartRenderToken += 1;

    if (!this.pressureChart) {
      return;
    }

    this.pressureChart.destroy();
    this.pressureChart = null;
  }

  private getDisplayText(text: string | null | undefined): string {
    if (!text) {
      return '';
    }

    return text.length > this.MAX_RENDER_CHARS
      ? `${text.slice(0, this.MAX_RENDER_CHARS)}...`
      : text;
  }
}
