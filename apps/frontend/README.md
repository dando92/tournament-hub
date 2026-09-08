# Frontend

The React and Vite web application, and the browser gateway for the whole
stack: in Docker its nginx serves the built page and proxies `/api/` and
`/realtime/` across the private Compose network, so the browser only ever
talks to one origin.

Run these from the repository root.

## Development

```bash
npm run dev:dependencies
npm run dev
```

Vite serves `http://localhost:5173` and proxies the same two paths to the API
and realtime processes running on the host.

## Verification

```bash
npm run test --workspace=@tournament-hub/frontend
npm run lint --workspace=@tournament-hub/frontend
```

## Runtime configuration

`PUBLIC_API_URL` and `PUBLIC_REALTIME_URL` are read by the container at start
and written to `/runtime-config.js`, which the page reads before it makes its
first request. Changing either needs a container restart, not a rebuild —
which is what lets one built image serve any deployment.

## Layout

```text
src/
  app/       The shell, the router, and the one place axios is configured
  pages/     One file per address the router can reach
  features/  A feature owns its api/, model/ and ui/ folders
  shared/    Components, hooks and libraries with no feature of their own
```

Only `app/providers.tsx` and a feature's `api/` modules may import axios; the
architecture check enforces it.
