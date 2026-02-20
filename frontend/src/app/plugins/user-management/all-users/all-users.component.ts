import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserProfileService } from '../../../core/services/user-profile.service';

const USERS_API = '/api/plugins/user-management/users';
const CALENDAR_DISCONNECT = '/api/plugins/calendar/google/disconnect';
const STRAVA_DISCONNECT = '/api/plugins/strava/disconnect';

export interface UserListItem {
  id: string;
  name: string;
  emoji: string;
}

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './all-users.component.html',
})
export class AllUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private userProfile = inject(UserProfileService);

  readonly usersList = signal<UserListItem[]>([]);
  readonly switchingUser = signal(false);

  readonly currentUserId = computed(() => this.userProfile.profile()?.id ?? null);
  readonly usersForSelect = computed(() => {
    const list = this.usersList();
    const current = this.userProfile.profile();
    const id = current?.id;
    if (!id) return list;
    if (list.some((u) => u.id === id)) return list;
    return [
      ...list,
      {
        id,
        name: (current?.name && current.name.trim()) || 'New user',
        emoji: current?.emoji || '👤',
      },
    ];
  });

  ngOnInit(): void {
    this.userProfile.load();
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<{ users: UserListItem[] }>(USERS_API).subscribe({
      next: (res) => this.usersList.set(res.users ?? []),
      error: () => this.usersList.set([]),
    });
  }

  onUserSelect(userId: string): void {
    const currentId = this.currentUserId();
    if (userId === currentId || !userId) return;
    if (!currentId) {
      this.doSwitchUser(userId);
      return;
    }
    this.switchingUser.set(true);
    this.disconnectUserFromExternalApps(currentId).subscribe({
      next: () => this.doSwitchUser(userId),
      error: () => this.doSwitchUser(userId),
      complete: () => this.switchingUser.set(false),
    });
  }

  private disconnectUserFromExternalApps(userId: string | null) {
    if (!userId) return forkJoin([]);
    const headers = { 'X-User-Id': userId };
    return forkJoin({
      calendar: this.http.post(CALENDAR_DISCONNECT, {}, { headers }).pipe(catchError(() => of(null))),
      strava: this.http.post(STRAVA_DISCONNECT, {}, { headers }).pipe(catchError(() => of(null))),
    });
  }

  private doSwitchUser(userId: string): void {
    this.userProfile.switchUser(userId);
    this.loadUsers();
  }

  addUser(): void {
    const newId = UserProfileService.generateUserId();
    this.userProfile.switchUser(newId);
    this.loadUsers();
  }
}
