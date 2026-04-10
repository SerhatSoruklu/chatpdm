import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  RMG_DIAGRAM_CLOSE_LABEL,
  RMG_DIAGRAM_DIALOG_TITLE,
} from './risk-mapping-governance-page.constants';

export interface RiskMappingGovernanceImageDialogData {
  title: string;
  imagePath: string;
  imageAlt: string;
  caption: string;
}

@Component({
  selector: 'app-risk-mapping-governance-image-dialog',
  standalone: true,
  templateUrl: './risk-mapping-governance-image-dialog.component.html',
  styleUrl: './risk-mapping-governance-image-dialog.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskMappingGovernanceImageDialogComponent {
  protected readonly data = inject<RiskMappingGovernanceImageDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogTitle = RMG_DIAGRAM_DIALOG_TITLE;
  protected readonly closeLabel = RMG_DIAGRAM_CLOSE_LABEL;

  constructor(private readonly dialogRef: MatDialogRef<RiskMappingGovernanceImageDialogComponent>) {}

  protected close(): void {
    this.dialogRef.close();
  }
}
