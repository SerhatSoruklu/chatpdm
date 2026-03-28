import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

type ChatPdmLogoVariant = 'header' | 'footer';
type ChatPdmLogoRenderMode = 'css' | 'svg';

@Component({
  selector: 'app-chatpdm-logo',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './chatpdm-logo.component.html',
  styleUrl: './chatpdm-logo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pdm-logo',
    '[class.pdm-logo--footer]': 'variant() === "footer"',
  },
})
export class ChatPdmLogoComponent {
  readonly variant = input<ChatPdmLogoVariant>('header');
  readonly renderMode = input<ChatPdmLogoRenderMode>('css');
  readonly wordmark = input('ChatPDM');

  protected readonly assetPath = computed(() =>
    this.variant() === 'footer'
      ? '/assets/chatpdm/logo/chatpdm-logo-footer.svg'
      : '/assets/chatpdm/logo/chatpdm-logo-header.svg',
  );

  protected readonly altText = computed(() =>
    this.variant() === 'footer' ? 'ChatPDM footer logo' : 'ChatPDM logo',
  );
}
