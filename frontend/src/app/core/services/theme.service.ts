import { Injectable, inject, effect } from '@angular/core';
import { UserProfileService, CUSTOM_THEME_KEYS } from './user-profile.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private userProfile = inject(UserProfileService);

  constructor() {
    effect(() => {
      const theme = this.userProfile.theme();
      const customTheme = this.userProfile.customTheme();
      const doc = typeof document !== 'undefined' ? document.documentElement : null;
      if (!doc) return;
      doc.setAttribute('data-theme', theme);
      if (theme === 'custom') {
        const allowed = new Set(CUSTOM_THEME_KEYS);
        for (const [key, value] of Object.entries(customTheme)) {
          if (value && allowed.has(key as (typeof CUSTOM_THEME_KEYS)[number])) {
            doc.style.setProperty(key, value);
          }
        }
      } else {
        for (const key of CUSTOM_THEME_KEYS) {
          doc.style.removeProperty(key);
        }
      }
    });
  }
}
