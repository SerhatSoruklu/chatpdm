import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface VisionPageImageDialogData {
  title: string;
  imagePath: string;
  imageAlt: string;
  caption: string;
  description?: string;
  width?: number;
  height?: number;
}

const VISION_IMAGE_DIALOG_TITLE = 'Vision reference';
const VISION_IMAGE_DIALOG_CLOSE_LABEL = 'Close';

@Component({
  selector: 'app-vision-page-image-dialog',
  standalone: true,
  templateUrl: './vision-page-image-dialog.component.html',
  styleUrl: './vision-page-image-dialog.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisionPageImageDialogComponent {
  protected readonly data = inject<VisionPageImageDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogTitle = VISION_IMAGE_DIALOG_TITLE;
  protected readonly closeLabel = VISION_IMAGE_DIALOG_CLOSE_LABEL;
  protected readonly descriptionText = this.data.description ?? this.data.caption;

  constructor(private readonly dialogRef: MatDialogRef<VisionPageImageDialogComponent>) {}

  protected close(): void {
    this.dialogRef.close();
  }
}
