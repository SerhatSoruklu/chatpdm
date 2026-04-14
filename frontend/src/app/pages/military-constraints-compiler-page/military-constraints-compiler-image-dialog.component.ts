import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MilitaryConstraintsCompilerImageDialogData {
  title: string;
  imagePath: string;
  imageAlt: string;
  caption: string;
  closeLabel: string;
}

@Component({
  selector: 'app-military-constraints-compiler-image-dialog',
  standalone: true,
  templateUrl: './military-constraints-compiler-image-dialog.component.html',
  styleUrl: './military-constraints-compiler-image-dialog.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilitaryConstraintsCompilerImageDialogComponent {
  protected readonly data = inject<MilitaryConstraintsCompilerImageDialogData>(MAT_DIALOG_DATA);

  constructor(
    private readonly dialogRef: MatDialogRef<MilitaryConstraintsCompilerImageDialogComponent>,
  ) {}

  protected close(): void {
    this.dialogRef.close();
  }
}
