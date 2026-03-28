import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { getPublicPageContent } from './public-page.content';
import type { PublicPageKey } from './public-page.types';

@Component({
  selector: 'app-public-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-page.component.html',
  styleUrl: './public-page.component.css',
})
export class PublicPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly content = computed(() => {
    const pageKey = this.routeData()['pageKey'] as PublicPageKey;
    return getPublicPageContent(pageKey);
  });
}
