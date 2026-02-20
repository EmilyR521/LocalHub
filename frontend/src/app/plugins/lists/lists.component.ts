import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListsService } from './services/lists.service';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="page-header">
      <h1>Lists</h1>
      <p class="subtitle">Create bulleted lists or checklists. Checklist items show struck through when checked.</p>
    </header>
    <router-outlet />
  `,
})
export class ListsComponent implements OnInit {
  private listsService = inject(ListsService);

  ngOnInit(): void {
    this.listsService.load();
  }
}
