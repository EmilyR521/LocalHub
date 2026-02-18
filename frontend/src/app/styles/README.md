# Shared styles

Global styles for the hub and all plugin apps. Imported once from `src/styles.scss`.

| File | Purpose |
|------|--------|
| `_variables.scss` | CSS custom properties (colors, spacing, radius) |
| `_base.scss` | Reset, body, base links |
| `_layout.scss` | Hub shell: `.layout`, `.sidebar`, `.nav`, `.main`, `.user` |
| `_page-header.scss` | `.page-header`, `.subtitle` for plugin/dashboard pages |
| `_cards.scss` | `.card`, `.card-title`, `.welcome` |
| `_form-fields.scss` | `.field`, `.hint`, `.checkbox-label`, `.emoji-*`, `.plugin-list`, `.actions`, `.error-msg` |
| `buttons.scss` | `.btn`, `.btn.primary`, `.btn.secondary` |
| `_tables.scss` | `.data-table-wrap`, `.data-table`, `.status-badge`, `.panel-overlay`, `.panel`, `.panel-actions` |
| `_settings-drawer.scss` | `.plugin-with-settings`, `.plugin-toolbar`, `.settings-cog-btn`, `.settings-drawer-overlay`, `.settings-drawer`, `.settings-drawer-header`, `.settings-drawer-body` |
| `index.scss` | Imports all partials (used by `src/styles.scss`) |

Use these class names in components for consistent look across the app. New plugins should rely on these shared classes; add new partials only for app-wide patterns.
