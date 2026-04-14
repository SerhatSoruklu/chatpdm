import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  MCPP_HERO_IMAGE_BUTTON_LABEL,
  MCPP_HERO_IMAGE_CAPTION,
  MCPP_HERO_IMAGE_DIALOG_CLOSE_LABEL,
  MCPP_HERO_IMAGE_DIALOG_TITLE,
  MCPP_HERO_IMAGE_ALT,
  MCPP_HERO_IMAGE_PATH,
  MCPP_PAGE_TITLE,
} from './military-constraints-compiler-page.constants';
import { MilitaryConstraintsCompilerImageDialogComponent } from './military-constraints-compiler-image-dialog.component';

interface PackOverviewCard {
  readonly packId: string;
  readonly title: string;
  readonly copy: string;
}

interface ContractCard {
  readonly label: string;
  readonly copy: string;
}

@Component({
  selector: 'app-military-constraints-compiler-page',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './military-constraints-compiler-page.component.html',
  styleUrl: './military-constraints-compiler-page.component.css',
})
export class MilitaryConstraintsCompilerPageComponent {
  constructor(private readonly dialog: MatDialog) {}

  protected readonly pageTitle = MCPP_PAGE_TITLE;
  protected readonly heroImagePath = MCPP_HERO_IMAGE_PATH;
  protected readonly heroImageAlt = MCPP_HERO_IMAGE_ALT;
  protected readonly heroImageCaption = MCPP_HERO_IMAGE_CAPTION;
  protected readonly heroImageDialogTitle = MCPP_HERO_IMAGE_DIALOG_TITLE;
  protected readonly heroImageDialogCloseLabel = MCPP_HERO_IMAGE_DIALOG_CLOSE_LABEL;
  protected readonly heroImageButtonLabel = MCPP_HERO_IMAGE_BUTTON_LABEL;
  protected readonly exampleJson = `{
  "packId": "mil-us-medical-protection-core-v0.1.0",
  "facts": {
    "target": {
      "protectedClass": "MEDICAL",
      "lossOfProtectionStatus": "NOT_LOST"
    },
    "action": {
      "kind": "STRIKE"
    },
    "authority": {
      "designatedActionAuthorized": false
    }
  }
}`;

  protected readonly whatItIsCards: readonly ContractCard[] = [
    {
      label: 'Deterministic',
      copy: 'The same validated pack and the same structured facts produce the same decision.',
    },
    {
      label: 'Refusal-first',
      copy: 'Missing or unresolved facts refuse explicitly instead of being guessed.',
    },
    {
      label: 'Bounded',
      copy: 'The compiler stays inside the validated pack surface and declared jurisdiction.',
    },
    {
      label: 'Traceable',
      copy: 'Every outcome preserves rule trace, authority trace, and refusal reason.',
    },
  ] as const;

  protected readonly whatItIsNotItems: readonly string[] = [
    'Not a tactical decision console',
    'Not a military advice system',
    'Not a natural-language interpreter',
    'Not a strategy engine',
    'Not a targeting recommender',
    'Not a freeform scenario analyzer',
  ] as const;

  protected readonly decisionStates: readonly ContractCard[] = [
    {
      label: 'ALLOWED',
      copy: 'The structured facts satisfy the validated pack.',
    },
    {
      label: 'REFUSED',
      copy: 'A required constraint fails at a checked stage.',
    },
    {
      label: 'REFUSED_INCOMPLETE',
      copy: 'The system cannot decide because required facts are missing.',
    },
  ] as const;

  protected readonly packOverview: readonly PackOverviewCard[] = [
    {
      packId: 'Pack 1',
      title: 'Baseline strike / legal floor',
      copy: 'Core reference slice for the admissibility kernel.',
    },
    {
      packId: 'Pack 2',
      title: 'Maritime VBSS / access control',
      copy: 'Boarding and authority-gating slice with narrow mission scope.',
    },
    {
      packId: 'Pack 3',
      title: 'Medical / protected object',
      copy: 'Protected medical object logic with explicit loss-of-protection handling.',
    },
    {
      packId: 'Pack 4',
      title: 'Civilian / school protection',
      copy: 'Protected civilian object logic with explicit scope and authority gates.',
    },
    {
      packId: 'Pack 5',
      title: 'Protected-person states',
      copy: 'Protected-person logic for civilians, hors de combat, and related states.',
    },
  ] as const;

  openHeroImageDialog(): void {
    this.dialog.open(MilitaryConstraintsCompilerImageDialogComponent, {
      width: 'calc(100vw - 32px)',
      maxWidth: '1120px',
      maxHeight: 'calc(100dvh - 32px)',
      autoFocus: false,
      panelClass: 'pdm-mcc-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: this.heroImageDialogTitle,
        imagePath: this.heroImagePath,
        imageAlt: this.heroImageAlt,
        caption: this.heroImageCaption,
        closeLabel: this.heroImageDialogCloseLabel,
      },
    });
  }
}
