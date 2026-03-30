import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-example-preview',
  standalone: true,
  templateUrl: './example-preview.component.html',
  styleUrl: './example-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplePreviewComponent {}
