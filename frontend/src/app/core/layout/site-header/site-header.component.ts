import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { ChatPdmLogoComponent } from '../../brand/chatpdm-logo/chatpdm-logo.component';
import { SITE_PRIMARY_NAV_ITEMS, SITE_SUPPORT_EMAIL } from '../site-navigation.data';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ChatPdmLogoComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
})
export class SiteHeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navItems = SITE_PRIMARY_NAV_ITEMS;
  protected readonly supportEmail = SITE_SUPPORT_EMAIL;
  protected readonly isMobileNavOpen = signal(false);

  constructor() {
    const subscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.isMobileNavOpen.set(false));

    this.destroyRef.onDestroy(() => subscription.unsubscribe());

    effect(() => {
      const isOpen = this.isMobileNavOpen();
      const body = this.document?.body;
      const documentElement = this.document?.documentElement;

      body?.classList.toggle('pdm-mobile-nav-open', isOpen);
      documentElement?.classList.toggle('pdm-mobile-nav-open', isOpen);
    });

    this.destroyRef.onDestroy(() => {
      this.document?.body?.classList.remove('pdm-mobile-nav-open');
      this.document?.documentElement?.classList.remove('pdm-mobile-nav-open');
    });
  }

  protected openMobileNav(): void {
    this.isMobileNavOpen.set(true);
  }

  protected closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }
}
