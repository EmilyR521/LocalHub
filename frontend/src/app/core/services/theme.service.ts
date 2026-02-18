import { Injectable, inject, effect } from '@angular/core';
import { UserProfileService } from './user-profile.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private userProfile = inject(UserProfileService);

  constructor() {
    effect(() => {
      const theme = this.userProfile.theme();
      const doc = typeof document !== 'undefined' ? document.documentElement : null;
      if (doc) doc.setAttribute('data-theme', theme);
    });
  }
}
