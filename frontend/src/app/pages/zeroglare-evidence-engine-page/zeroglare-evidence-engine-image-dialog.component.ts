import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ZEE_INFOGRAPHIC_CLOSE_LABEL, ZEE_INFOGRAPHIC_DIALOG_TITLE } from './zeroglare-evidence-engine-page.constants';

export interface ZeeInfographicDialogData {
  title: string;
  imagePath: string;
  imageAlt: string;
  caption: string;
}

@Component({
  selector: 'app-zee-infographic-dialog',
  standalone: true,
  templateUrl: './zeroglare-evidence-engine-image-dialog.component.html',
  styleUrl: './zeroglare-evidence-engine-image-dialog.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZeeInfographicDialogComponent {
  protected readonly data = inject<ZeeInfographicDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogTitle = ZEE_INFOGRAPHIC_DIALOG_TITLE;
  protected readonly closeLabel = ZEE_INFOGRAPHIC_CLOSE_LABEL;

  constructor(private readonly dialogRef: MatDialogRef<ZeeInfographicDialogComponent>) {}

  protected close(): void {
    this.dialogRef.close();
  }
}
