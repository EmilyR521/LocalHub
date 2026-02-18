# LocalHub Architecture

Homelab/local web server application suite with a dashboard hub and plugin apps. Express.js backend, Angular frontends, server-stored JSON files for persistent storage.

---

## 1. High-Level Structure

```
LocalHub/
├── backend/                 # Express API
│   ├── src/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── plugins/
│   │   │   ├── index.ts           # Plugin loader & registry
│   │   │   ├── store.ts           # JSON file store abstraction
│   │   │   └── {plugin-id}/       # Per-plugin server logic (optional)
│   │   └── routes/
│   │       ├── health.ts
│   │       └── ...
│   ├── data/                # Persistent JSON (gitignored)
│   │   ├── hub.json
│   │   └── plugins/
│   │       ├── my-app/
│   │       │   └── state.json
│   │       └── another-app/
│   │           └── *.json
│   └── package.json
│
├── frontend/                # Single Angular app (hub + plugins)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # Singletons, guards, interceptors
│   │   │   ├── shared/            # Shared components/pipes
│   │   │   ├── hub/               # Dashboard shell & layout
│   │   │   │   ├── hub.component.ts
│   │   │   │   ├── hub.routes.ts
│   │   │   └── ...
│   │   │   └── plugins/           # One module per plugin app
│   │   │       ├── plugin-registry.ts
│   │   │       ├── plugin-a/
│   │   │       │   ├── plugin-a.module.ts
│   │   │       │   ├── plugin-a.routes.ts
│   │   │       └── ...
│   │   ├── environments/
│   │   └── ...
│   └── angular.json
│
└── package.json             # Optional root scripts
```

---

## 2. Backend (Express)

### 2.1 Responsibilities

- Serve REST API for the hub and all plugins.
- Expose a **JSON file store** API that plugins (and hub) use for persistence.
- Optionally serve the Angular build in production.

### 2.2 JSON Store Abstraction

- **Path convention**: `data/plugins/{pluginId}/{filename}.json`.
- **API shape**:
  - `GET  /api/plugins/:pluginId/store/:key` — read one JSON file.
  - `PUT  /api/plugins/:pluginId/store/:key` — write one JSON file (body = JSON).
  - `GET  /api/plugins/:pluginId/store` — list keys (e.g. list files in that plugin’s folder).
- **Store module** (`plugins/store.ts`):
  - Resolve path from `pluginId` + `key`; sanitize to avoid path traversal.
  - Use `fs.readFileSync` / `fs.writeFileSync` (or async) and `JSON.parse` / `JSON.stringify`.
  - Ensure `data/plugins/<pluginId>/` exists before write.

This gives each plugin a simple key–value style persistence without a database.

### 2.3 Plugin Integration on the Server

- **Option A (recommended)**: No dynamic “plugin process.” One Express app; plugins are just Angular feature modules. All plugin persistence goes through the same store API (`/api/plugins/:pluginId/store/...`). Backend only needs to know `pluginId` (and optionally an allow-list in config).
- **Option B**: If a plugin needs custom server logic, add under `backend/src/plugins/{plugin-id}/` a small router and register it in `plugins/index.ts`, e.g. `app.use('/api/plugins/my-app', myAppRouter)`. That router can use the same store helper for its plugin’s JSON files.

### 2.4 Config and Env

- Port, `data` directory path, optional CORS origin, and list of allowed `pluginId`s can come from env or a small `config` module (`config.ts`).

---

## 3. Frontend (Angular)

### 3.1 Single SPA with Lazy-Loaded Plugins

- **Hub**: Root layout (sidebar/top nav), dashboard widgets, and `<router-outlet>` for plugin content.
- **Plugins**: Lazy-loaded feature modules; each plugin has its own routing config and declares its routes (e.g. `plugins/my-app`, `plugins/my-app/settings`).

### 3.2 Plugin Registry

- **`plugin-registry.ts`**: Array of plugin descriptors:

```ts
export interface PluginManifest {
  id: string;
  name: string;
  path: string;           // route prefix, e.g. 'my-app'
  icon?: string;
  order?: number;
}
export const PLUGINS: PluginManifest[] = [
  { id: 'my-app', name: 'My App', path: 'my-app', order: 1 },
  { id: 'another-app', name: 'Another App', path: 'another-app', order: 2 },
];
```

- Hub reads `PLUGINS` to build the sidebar/tiles and to build the route config.

### 3.3 Routing

- **App routes** (`app.routes.ts`):
  - `''` or `hub` → hub (dashboard).
  - For each plugin: `plugins/:pluginPath/*` → load the corresponding plugin module (e.g. `loadChildren` to `plugin-a.routes.ts`). Map `pluginPath` to the right module (e.g. `my-app` → PluginAModule).
- **Lazy loading**: Each plugin’s `*-routes.ts` uses `loadChildren` so the plugin bundle loads only when the user opens that app.

### 3.4 API Access from Angular

- **Shared service**: e.g. `PluginStoreService` in `core/` that takes `pluginId` and `key` and calls `GET/PUT /api/plugins/:pluginId/store/:key`.
- Plugins use this service so all persistence goes through the same backend store API.

---

## 4. Data (JSON) Conventions

- **Hub**: e.g. `data/hub.json` for dashboard layout, user preferences, which plugins are visible, etc.
- **Per plugin**: `data/plugins/{pluginId}/*.json`; each plugin chooses its own key names (e.g. `state.json`, `settings.json`, or multiple keys). Backend only enforces `pluginId` and safe `key` (filename).

Optional: version key in each JSON file for future migrations.

---

## 5. Security (Homelab)

- Bind to `localhost` or a trusted LAN IP.
- If you add auth later: JWT or session cookie; same Express app can protect `/api/*`.
- Validate and sanitize `pluginId` and `key` so paths stay under `data/plugins/<pluginId>/`.
- CORS: allow only your Angular origin (or localhost in dev).

---

## 6. Development Workflow

- **Backend**: `npm run dev` in `backend/` (e.g. `ts-node-dev` or `nodemon`).
- **Frontend**: `ng serve` in `frontend/` with proxy to the Express API (e.g. `/api` → `http://localhost:3000`).
- **Production**: Build Angular (`ng build`), serve `frontend/dist/` from Express (or nginx); run Express on one port.

---

## 7. Summary

| Layer        | Technology   | Role |
|-------------|-------------|------|
| Hub UI      | Angular     | Shell, dashboard, nav, plugin discovery from registry |
| Plugin UI   | Angular     | Lazy-loaded feature modules, each with own routes |
| API         | Express     | REST; health, config, and `/api/plugins/:id/store/...` |
| Persistence | JSON files  | `data/plugins/{pluginId}/{key}.json`, one store API for all plugins |

Single codebase (monorepo), one Express backend, one Angular SPA, and a clear place to add new plugin apps (new Angular modules + optional backend routes) that all use server-stored JSON for persistence.
