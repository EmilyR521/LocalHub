import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [RouterOutlet, NavigationBarComponent],
  templateUrl: './user-management.component.html',
})
export class UserManagementComponent {
  readonly userManagementNavItems: NavigationBarItem[] = [
    { label: 'My profile', route: 'profile', exact: true },
    { label: 'All users', route: 'users' },
  ];
}
