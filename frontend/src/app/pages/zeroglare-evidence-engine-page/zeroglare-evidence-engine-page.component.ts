import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  ZEE_INFOGRAPHIC_ALT,
  ZEE_INFOGRAPHIC_PATH,
  ZEE_PAGE_TITLE,
} from './zeroglare-evidence-engine-page.constants';
import { ZEE_PAGE_CONTENT } from './zeroglare-evidence-engine-page.model';
import { ZeeInfographicDialogComponent } from './zeroglare-evidence-engine-image-dialog.component';

@Component({
  selector: 'app-zeroglare-evidence-engine-page',
  standalone: true,
  imports: [RouterLink, MatDialogModule],
  templateUrl: './zeroglare-evidence-engine-page.component.html',
  styleUrl: './zeroglare-evidence-engine-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZeroglareEvidenceEnginePageComponent {
  constructor(private readonly dialog: MatDialog) {}

  protected readonly pageTitle = ZEE_PAGE_TITLE;
  protected readonly infographicPath = ZEE_INFOGRAPHIC_PATH;
  protected readonly infographicAlt = ZEE_INFOGRAPHIC_ALT;
  protected readonly content = ZEE_PAGE_CONTENT;

  openInfographicDialog(): void {
    this.dialog.open(ZeeInfographicDialogComponent, {
      width: 'calc(100vw - 32px)',
      maxWidth: '1120px',
      maxHeight: 'calc(100dvh - 32px)',
      autoFocus: false,
      panelClass: 'pdm-zee-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: this.pageTitle,
        imagePath: this.infographicPath,
        imageAlt: this.infographicAlt,
        caption: this.content.pipeline.caption,
      },
    });
  }
}
