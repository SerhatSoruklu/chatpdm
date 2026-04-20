import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CanonicalSignatureService } from '../../core/signature/canonical-signature.service';
import { VisionPageImageDialogComponent } from './vision-page-image-dialog.component';

interface VisionSectionCard {
  title: string;
  copy: string;
}

interface VisionImageCard {
  title: string;
  caption: string;
  description: string;
  imagePath: string;
  imageAlt: string;
  width: number;
  height: number;
  wide: boolean;
}

interface VisionStage {
  label: string;
  title: string;
  copy: string;
}

interface VisionFutureDomainChip {
  label: string;
  tone: 'education' | 'healthcare' | 'technical-systems';
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
  protected readonly heroImagePath = '/assets/vision/refused-vision-page.webp?v=20260420-1';
  protected readonly heroImageAlt =
    'Refused vision page reference image showing the ChatPDM vision hero strip';
  protected readonly heroImageTitle = 'Refused vision page';
  protected readonly heroImageCaption = 'Inspect the validation pipeline.';

  protected readonly whyThisMattersNowCards: readonly VisionImageCard[] = [
    {
      title: 'Reality can be fabricated',
      caption: 'Faces, memories, and moments can be forged in seconds.',
      description:
        'A believable image can still be synthetic. The surface may look real while the underlying scene was generated, altered, or never existed.',
      imagePath: '/assets/vision/why-this-matters/vision-fabricated-image-87f8d2c79d.webp',
      imageAlt: 'Symbolic vision card for fabricated imagery in ChatPDM',
      width: 1402,
      height: 1122,
      wide: false,
    },
    {
      title: 'Words can be twisted',
      caption: 'Perfect fluency can hide a deliberate bend in meaning.',
      description:
        'Text can remain fluent while meaning shifts underneath it. Rewriting, emphasis, and small edits can distort interpretation without looking obviously broken.',
      imagePath: '/assets/vision/why-this-matters/vision-manipulated-text-0afce9a374.webp',
      imageAlt: 'Symbolic vision card for manipulated text in ChatPDM',
      width: 1402,
      height: 1122,
      wide: false,
    },
    {
      title: 'Framing can deceive',
      caption: 'A clear surface can still conceal the wrong story.',
      description:
        'Framing changes perception. A cropped or selectively presented scene can imply a story that reverses once the full context is visible.',
      imagePath: '/assets/vision/why-this-matters/vision-misleading-media-c8e89d8d7c.webp',
      imageAlt: 'Symbolic vision card for misleading media framing in ChatPDM',
      width: 1536,
      height: 1024,
      wide: false,
    },
    {
      title: 'Meaning often remains unclear even when something looks correct',
      caption: 'Meaning often remains incomplete, even when the picture appears almost whole.',
      description:
        'Confidence, polish, and structure can create the appearance of validity. Something can look complete and trustworthy while still lacking support, scope, or grounding.',
      imagePath: '/assets/vision/why-this-matters/vision-confidence-without-grounding-9b8d94a8ed.webp',
      imageAlt: 'Symbolic vision card for confident wording without grounding in ChatPDM',
      width: 1402,
      height: 1122,
      wide: true,
    },
  ];

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
      copy: 'Start where ambiguity already fractures the foundations we depend on.',
    },
    {
      label: 'Stage 2',
      title: 'Adjacent institutional concepts',
      copy: 'Expand only into nearby structures once concept stability has been proven.',
    },
    {
      label: 'Stage 3',
      title: 'Other high-stakes domains',
      copy: 'Move into education, healthcare, and technical systems only after reliability has been genuinely earned.',
    },
  ];

  protected readonly futureDomains: readonly VisionFutureDomainChip[] = [
    { label: 'education', tone: 'education' },
    { label: 'healthcare', tone: 'healthcare' },
    { label: 'technical systems', tone: 'technical-systems' },
  ] as const;

  protected readonly continuityCards: readonly VisionSectionCard[] = [
    {
      title: 'Inspectable',
      copy: 'It must remain readable and auditable by anyone, not just operable by its original builder.',
    },
    {
      title: 'Extensible',
      copy: 'Future contributors must be able to expand domains without breaking the strict admission discipline that gives the system value.',
    },
    {
      title: 'Continuous',
      copy: 'True infrastructure should endure beyond any one person.',
    },
  ];

  openHeroImageDialog(): void {
    this.dialog.open(VisionPageImageDialogComponent, {
      width: 'calc(100vw - 24px)',
      maxWidth: '1240px',
      maxHeight: 'calc(100dvh - 24px)',
      ariaLabel: this.heroImageTitle,
      panelClass: 'pdm-vision-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: this.heroImageTitle,
        imagePath: this.heroImagePath,
        imageAlt: this.heroImageAlt,
        caption: this.heroImageCaption,
        description:
          'This diagram shows ChatPDM as a bounded sequence: input, normalization, classification, validation, and refusal or allowance. It frames the runtime as disciplined execution, not a generic editorial visual.',
        width: 676,
        height: 1024,
      },
    });
  }

  protected openWhyThisMattersNowDialog(card: VisionImageCard): void {
    this.dialog.open(VisionPageImageDialogComponent, {
      width: 'calc(100vw - 24px)',
      maxWidth: '1240px',
      maxHeight: 'calc(100dvh - 24px)',
      ariaLabel: card.title,
      panelClass: 'pdm-vision-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: card.title,
        imagePath: card.imagePath,
        imageAlt: card.imageAlt,
        caption: card.caption,
        description: card.description,
        width: card.width,
        height: card.height,
      },
    });
  }
}
