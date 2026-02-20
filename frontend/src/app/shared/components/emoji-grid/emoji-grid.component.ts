import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { EMOJI_GRID_LIST } from './emoji-grid.constants';

const DEFAULT_EMOJI = '👤';

@Component({
  selector: 'app-emoji-grid',
  standalone: true,
  templateUrl: './emoji-grid.component.html',
  styleUrl: './emoji-grid.component.scss',
})
export class EmojiGridComponent {
  private host = inject(ElementRef);

  /** Current selected emoji (shown on trigger). */
  value = input<string>(DEFAULT_EMOJI);

  /** Emitted when user selects an emoji. */
  valueChange = output<string>();

  readonly emojis = EMOJI_GRID_LIST;
  readonly open = signal(false);

  get displayValue(): string {
    const v = this.value();
    return (typeof v === 'string' && v.trim()) ? v.trim() : DEFAULT_EMOJI;
  }

  toggle(): void {
    this.open.update((o) => !o);
  }

  select(emoji: string): void {
    this.valueChange.emit(emoji);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node;
    const hostEl = this.host.nativeElement as HTMLElement;
    if (hostEl.contains(target)) return;
    this.open.set(false);
  }
}
