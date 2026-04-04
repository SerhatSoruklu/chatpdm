import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {
  resolvePdmDropdownActiveIndex,
  resolvePdmDropdownNextIndex,
  resolvePdmDropdownSelectedOption,
  type PdmDropdownOption,
  type PdmDropdownValue,
} from './pdm-dropdown.model';

@Component({
  selector: 'app-pdm-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdm-dropdown.component.html',
  styleUrl: './pdm-dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdmDropdownComponent {
  private static nextId = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dropdownId = `pdm-dropdown-${++PdmDropdownComponent.nextId}`;
  private readonly openState = signal(false);
  private readonly activeIndex = signal(0);

  @ViewChild('triggerButton') private triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChildren('optionButton') private optionButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  readonly label = input('');
  readonly options = input<readonly PdmDropdownOption[]>([]);
  readonly value = input<PdmDropdownValue | null>(null);
  readonly align = input<'start' | 'end'>('start');
  readonly disabled = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly selectionChange = output<PdmDropdownValue>();

  protected readonly isOpen = this.openState.asReadonly();
  protected readonly selectedOption = computed(() => (
    resolvePdmDropdownSelectedOption(this.options(), this.value())
  ));
  protected readonly triggerLabel = computed(() => this.selectedOption()?.label ?? 'Select');

  protected toggleMenu(): void {
    if (this.disabled() || this.options().length === 0) {
      return;
    }

    if (this.isOpen()) {
      this.closeMenu();
      return;
    }

    this.openMenu();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.options().length === 0) {
      return;
    }

    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.closeMenu(true);
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();

    if (!this.isOpen()) {
      this.openMenu();
      return;
    }

    this.focusOption(resolvePdmDropdownNextIndex(
      this.activeIndex(),
      event.key,
      this.options(),
    ));
  }

  protected onOptionKeydown(event: KeyboardEvent, index: number): void {
    const option = this.options()[index];

    if (!option || option.disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectOption(option);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu(true);
      return;
    }

    const nextIndex = resolvePdmDropdownNextIndex(index, event.key, this.options());
    if (nextIndex !== index) {
      event.preventDefault();
      this.focusOption(nextIndex);
    }
  }

  protected selectOption(option: PdmDropdownOption): void {
    if (this.disabled() || option.disabled) {
      return;
    }

    this.selectionChange.emit(option.value);
    this.closeMenu(true);
  }

  protected isSelected(option: PdmDropdownOption): boolean {
    return this.value() === option.value;
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (this.host.nativeElement.contains(target)) {
      return;
    }

    this.closeMenu();
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.isOpen()) {
      return;
    }

    event.preventDefault();
    this.closeMenu(true);
  }

  protected get menuId(): string {
    return this.dropdownId;
  }

  protected onTriggerClick(): void {
    this.toggleMenu();
  }

  private openMenu(): void {
    const activeIndex = resolvePdmDropdownActiveIndex(this.options(), this.value());

    this.activeIndex.set(activeIndex);
    this.openState.set(true);

    window.setTimeout(() => {
      this.focusOption(activeIndex);
    });
  }

  private closeMenu(returnFocusToTrigger = false): void {
    this.openState.set(false);

    if (returnFocusToTrigger) {
      window.setTimeout(() => {
        this.triggerButton?.nativeElement.focus();
      });
    }
  }

  private focusOption(index: number): void {
    const buttons = this.optionButtons?.toArray() ?? [];
    const optionButton = buttons[index];

    if (!optionButton) {
      return;
    }

    this.activeIndex.set(index);
    optionButton.nativeElement.focus();
  }
}
