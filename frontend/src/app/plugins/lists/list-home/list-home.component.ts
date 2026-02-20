import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ListsService } from '../services/lists.service';
import type { List } from '../models/list.model';

@Component({
  selector: 'app-list-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './list-home.component.html',
})
export class ListHomeComponent {
  private listsService = inject(ListsService);
  private router = inject(Router);

  readonly lists = this.listsService.lists;

  createList(): void {
    const list = this.listsService.createList();
    this.listsService.save(list);
    this.router.navigate(['/plugins/lists', list.id]);
  }

  deleteList(list: List, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete "${list.title}"?`)) {
      this.listsService.deleteList(list.id);
    }
  }

  listTypeLabel(type: List['type']): string {
    return type === 'checklist' ? 'Checklist' : 'Bulleted';
  }
}
