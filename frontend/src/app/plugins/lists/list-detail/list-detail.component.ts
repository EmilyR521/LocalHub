import { Component, OnInit, ElementRef, Injector, inject, signal, effect, viewChild, afterNextRender } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListsService } from '../services/lists.service';
import type { List, ListItem, ListType } from '../models/list.model';
import { EmojiGridComponent } from '../../../shared/components/emoji-grid/emoji-grid.component';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [RouterLink, EmojiGridComponent],
  templateUrl: './list-detail.component.html',
})
export class ListDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listsService = inject(ListsService);

  private currentId = signal<string | null>(null);
  private listSignal = signal<List | null>(null);
  readonly list = this.listSignal.asReadonly();

  readonly editingTitle = signal(false);
  readonly editingItemId = signal<string | null>(null);
  private readonly injector = inject(Injector);
  private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private readonly itemInputRef = viewChild<ElementRef<HTMLInputElement>>('itemInput');

  constructor() {
    effect(() => {
      const id = this.currentId();
      const all = this.listsService.lists();
      if (id) {
        const found = all.find((l) => l.id === id);
        this.listSignal.set(found ?? null);
      } else {
        this.listSignal.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.listsService.load();
    this.route.paramMap.subscribe((params) => {
      this.currentId.set(params.get('id'));
    });
  }

  setTitle(title: string): void {
    const list = this.listSignal();
    if (!list) return;
    this.listSignal.set({ ...list, title: title.trim() || list.title });
    this.save();
  }

  startEditTitle(): void {
    this.editingTitle.set(true);
    afterNextRender(() => {
      this.titleInputRef()?.nativeElement?.focus();
    }, { injector: this.injector });
  }

  finishEditTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.setTitle(value);
    this.editingTitle.set(false);
  }

  startEditItem(item: ListItem): void {
    this.editingItemId.set(item.id);
    afterNextRender(() => {
      this.itemInputRef()?.nativeElement?.focus();
    }, { injector: this.injector });
  }

  closeEditItem(): void {
    this.editingItemId.set(null);
  }

  finishEditTitleField(item: ListItem, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.setItemTitle(item, value);
  }

  finishEditDetailsField(item: ListItem, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.setItemDetails(item, value);
  }

  setIcon(icon: string): void {
    const list = this.listSignal();
    if (!list) return;
    this.listSignal.set({ ...list, icon: icon.trim() || undefined });
    this.save();
  }

  setType(type: ListType): void {
    const list = this.listSignal();
    if (!list) return;
    const items = list.items.map((it) => ({
      ...it,
      checked: type === 'checklist' ? (it.checked ?? false) : undefined,
    }));
    this.listSignal.set({ ...list, type, items });
    this.save();
  }

  toggleItem(item: ListItem): void {
    const list = this.listSignal();
    if (!list || list.type !== 'checklist') return;
    const items = list.items.map((i) =>
      i.id === item.id ? { ...i, checked: !i.checked } : i
    );
    this.listSignal.set({ ...list, items });
    this.save();
  }

  setItemTitle(item: ListItem, title: string): void {
    const list = this.listSignal();
    if (!list) return;
    const items = list.items.map((i) =>
      i.id === item.id ? { ...i, title: title.trim() } : i
    );
    this.listSignal.set({ ...list, items });
    this.save();
  }

  setItemDetails(item: ListItem, details: string): void {
    const list = this.listSignal();
    if (!list) return;
    const val = details.trim();
    const items = list.items.map((i) =>
      i.id === item.id ? { ...i, details: val || undefined } : i
    );
    this.listSignal.set({ ...list, items });
    this.save();
  }

  addItem(): void {
    const list = this.listSignal();
    if (!list) return;
    const newItem = this.listsService.addItem(list, '');
    this.listSignal.set({
      ...list,
      items: [...list.items, newItem],
    });
    this.save();
    this.editingItemId.set(newItem.id);
  }

  removeItem(item: ListItem): void {
    const list = this.listSignal();
    if (!list) return;
    this.listSignal.set({
      ...list,
      items: list.items.filter((i) => i.id !== item.id),
    });
    this.save();
  }

  save(): void {
    const list = this.listSignal();
    if (list) this.listsService.save(list);
  }

  deleteList(): void {
    const list = this.listSignal();
    if (!list) return;
    if (confirm(`Delete "${list.title}"?`)) {
      this.listsService.deleteList(list.id);
      this.router.navigate(['/plugins/lists']);
    }
  }
}
