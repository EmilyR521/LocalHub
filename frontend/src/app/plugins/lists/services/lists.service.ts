import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { List, ListItem } from '../models/list.model';

const PLUGIN_ID = 'lists';
const STORE_KEY = 'lists';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

@Injectable({ providedIn: 'root' })
export class ListsService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private listsSignal = signal<List[]>([]);
  readonly lists = this.listsSignal.asReadonly();

  private userId = computed(() => this.userProfile.profile().id);
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.listsSignal.set([]);
        if (id) this.fetchLists(id);
      }
    });
  }

  load(): void {
    const id = this.userId();
    if (!id) {
      this.listsSignal.set([]);
      return;
    }
    this.fetchLists(id);
  }

  private fetchLists(id: string): void {
    this.store.get<List[]>(PLUGIN_ID, STORE_KEY, id).subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        this.listsSignal.set(arr.map(normalizeList));
      },
      error: () => this.listsSignal.set([]),
    });
  }

  save(list: List): void {
    const id = this.userId();
    if (!id) return;
    const current = this.listsSignal();
    const index = current.findIndex((l) => l.id === list.id);
    const next =
      index >= 0
        ? current.map((l, i) => (i === index ? list : l))
        : [...current, list];
    this.listsSignal.set(next);
    this.store.put(PLUGIN_ID, STORE_KEY, next, id).subscribe({
      error: () => this.listsSignal.set(current),
    });
  }

  deleteList(listId: string): void {
    const id = this.userId();
    if (!id) return;
    const current = this.listsSignal();
    const next = current.filter((l) => l.id !== listId);
    this.listsSignal.set(next);
    this.store.put(PLUGIN_ID, STORE_KEY, next, id).subscribe({
      error: () => this.listsSignal.set(current),
    });
  }

  createList(): List {
    return {
      id: generateId(),
      title: 'Untitled list',
      type: 'bulleted',
      icon: '📋',
      items: [],
    };
  }

  addItem(list: List, title?: string): ListItem {
    const item: ListItem = {
      id: generateId(),
      title: (title ?? '').trim(),
      ...(list.type === 'checklist' ? { checked: false } : {}),
    };
    return item;
  }
}

const DEFAULT_LIST_ICON = '📋';

function normalizeList(l: unknown): List {
  if (l && typeof l === 'object' && 'id' in l && 'title' in l && 'type' in l && 'items' in l) {
    const o = l as Record<string, unknown>;
    const type = o['type'] === 'checklist' ? 'checklist' : 'bulleted';
    const icon = typeof o['icon'] === 'string' && o['icon'].trim() ? String(o['icon']).trim() : undefined;
    const items = Array.isArray(o['items'])
      ? (o['items'] as unknown[]).map(normalizeItem)
      : [];
    return {
      id: String(o['id']),
      title: String(o['title']),
      type,
      icon: icon || undefined,
      items,
    };
  }
  return {
    id: generateId(),
    title: 'Untitled list',
    type: 'bulleted',
    items: [],
  };
}

function normalizeItem(i: unknown): ListItem {
  if (i && typeof i === 'object' && 'id' in i) {
    const o = i as Record<string, unknown>;
    const title = typeof o['title'] === 'string' ? o['title'] : (typeof o['text'] === 'string' ? o['text'] : '');
    const details = typeof o['details'] === 'string' ? o['details'] : undefined;
    return {
      id: String(o['id']),
      title: String(title),
      ...(details !== undefined && details !== '' ? { details } : {}),
      checked: typeof o['checked'] === 'boolean' ? o['checked'] : false,
    };
  }
  return { id: generateId(), title: '' };
}
