import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './seo/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.start();
  }
}
