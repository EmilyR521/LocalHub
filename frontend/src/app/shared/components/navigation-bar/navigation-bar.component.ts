import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** One item in the nav: either a router link (route set) or a tab button (value set, emits on click). */
export interface NavigationBarItem {
  /** Button/link label */
  label: string;
  /** If set, render as router link to this route (relative or absolute). */
  route?: string;
  /** For router links: use exact match for routerLinkActive (e.g. for default/root child). */
  exact?: boolean;
  /** If set and route is not set, render as button and emit this value on click (tab mode). */
  value?: string;
}

@Component({
  selector: 'app-navigation-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navigation-bar.component.html',
})
export class NavigationBarComponent {
  /** Nav items: use route for links, value for tab buttons. */
  items = input.required<NavigationBarItem[]>();
  /** Aria label for the nav (e.g. "Runner views"). */
  ariaLabel = input<string | undefined>(undefined);
  /** In tab mode: the currently selected item value (for .active class). */
  selected = input<string | undefined>(undefined);
  /** In tab mode: emitted when a tab button is clicked. */
  selectedChange = output<string>();

  isLink(item: NavigationBarItem): boolean {
    return item.route !== undefined && item.route !== null;
  }

  onTabClick(value: string): void {
    this.selectedChange.emit(value);
  }
}
