import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CanonicalSignatureService } from '../../core/signature/canonical-signature.service';
import { VisionPageImageDialogComponent } from './vision-page-image-dialog.component';

interface VisionSectionCard {
  title: string;
  copy: string;
}

interface VisionStage {
  label: string;
  title: string;
  copy: string;
}

@Component({
  selector: 'app-vision-page',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './vision-page.component.html',
  styleUrl: './vision-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisionPageComponent {
  protected readonly signatureVerification$: ReturnType<
    CanonicalSignatureService['loadCanonicalSignatureVerification']
  >;
  constructor(
    private readonly dialog: MatDialog,
    private readonly canonicalSignatureService: CanonicalSignatureService,
  ) {
    this.signatureVerification$ = this.canonicalSignatureService.loadCanonicalSignatureVerification();
  }

  protected readonly heroImagePath = '/assets/vision/refused-vision-page.png?v=20260414-1';
  protected readonly heroImageAlt =
    'Refused vision page reference image showing the ChatPDM vision hero strip';
  protected readonly heroImageTitle = 'Refused vision page';
  protected readonly heroImageCaption = 'Open the full image in a dialog.';

  protected readonly instabilitySignals = [
    'Images can be fabricated',
    'Text can be manipulated',
    'Media can be misleading',
    'Meaning often remains unclear even when something looks correct',
  ] as const;

  protected readonly infrastructureTraits = [
    'deterministic',
    'bounded',
    'source-backed',
    'refusal-capable',
    'open source',
    'durable',
  ] as const;

  protected readonly expansionStages: readonly VisionStage[] = [
    {
      label: 'Stage 1',
      title: 'Governance concepts',
      copy: 'Start where ambiguity already breaks institutions, rules, and public decision systems.',
    },
    {
      label: 'Stage 2',
      title: 'Adjacent institutional concepts',
      copy: 'Expand only into nearby structures once concept stability has been validated.',
    },
    {
      label: 'Stage 3',
      title: 'Other high-stakes domains',
      copy: 'Move into domains such as education, healthcare, and technical systems only after reliability has been earned.',
    },
  ];

  protected readonly futureDomains = [
    'education',
    'healthcare',
    'technical systems',
  ] as const;

  protected readonly continuityCards: readonly VisionSectionCard[] = [
    {
      title: 'Inspectable',
      copy: 'The system must remain readable and auditable by others, not only operable by its original builder.',
    },
    {
      title: 'Extensible',
      copy: 'Future contributors must be able to extend domains without breaking the admission discipline that gives the system value.',
    },
    {
      title: 'Continuous',
      copy: 'MIT licensing matters because the system should outlast its creator and remain maintainable over time.',
    },
  ];

  openHeroImageDialog(): void {
    this.dialog.open(VisionPageImageDialogComponent, {
      width: 'calc(100vw - 24px)',
      maxWidth: '1240px',
      maxHeight: 'calc(100dvh - 24px)',
      autoFocus: false,
      panelClass: 'pdm-vision-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: this.heroImageTitle,
        imagePath: this.heroImagePath,
        imageAlt: this.heroImageAlt,
        caption: this.heroImageCaption,
      },
    });
  }
}
