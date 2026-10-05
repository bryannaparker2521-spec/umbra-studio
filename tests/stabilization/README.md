# Stabilization regression tests

These tests use synthetic accounts and records, never production data. Node 24 or later is required for `node:sqlite`. Install the repository dependencies first.

Start `node tests/stabilization/stabilization-node-server.cjs` in one terminal. It compiles the actual Worker handlers, creates a disposable in-memory SQLite database from the pre-migration schema, and applies migration 0014. D1 prepared statements and transactional batches are adapted to SQLite; R2 uploads use an in-memory store.

Run the following in order:

```
node tests/stabilization/api-tests.cjs
node tests/stabilization/stabilization-api-tests.cjs
```

For browser coverage, start the frontend development server on port 1420, provide Playwright through `PLAYWRIGHT_MODULE` if it is not installed locally, and optionally specify an installed Chromium browser using `BROWSER_EXECUTABLE`. Then run:

```
node tests/stabilization/stabilization-browser-tests.cjs
```

The browser routes the configured production API hostname to the disposable local server. Speech synthesis is instrumented for deterministic control tests; this does not measure audible voice quality. Close the test servers afterward. Restarting the API server resets all fixture data.

The SQLite adapter verifies real SQL, migrations, referential cleanup and handler behavior, but does not replace a final Cloudflare runtime staging check. No migration or deployment runs against production through these tests.

## Actual Cloudflare runtime

The same suites also pass against local Miniflare/workerd D1 and R2. Instead of the SQLite adapter, start `node tests/stabilization/stabilization-cloudflare-server.cjs` after installing the Worker dependencies. Use only one fixture server at a time; both listen on port 8787. This server applies migration 0014 to an isolated, disposable D1 database and uses synthetic sessions. Run the API suites followed by the browser suite as above. This is a local Cloudflare runtime check, not a remote staging or production deployment.

## Expanded staging coverage

Additional suites: `expanded-browser-tests.cjs`, `staging-extra-api.cjs`, `staging-workspaces.cjs`, and `staging-negative-browser.cjs`. Run them with the same synthetic fixture server and browser environment as the primary suites. Remote staging uses an authenticated local proxy restricted to the staging hostname; never route these suites to production. Temporary random staging sessions expire after eight hours. No staging credentials are committed. The dedicated `wrangler.staging.jsonc` maps both existing binding names exclusively to isolated resources.

For a local UI connected directly to remote staging, copy `.env.example` to the ignored `.env.staging` and run `npm run dev -- --mode staging`. The example contains only the staging API URL. Use authorized staging accounts; no credentials are supplied in source. Default builds retain the existing production API URL. Additional regressions: `staging-existing-api.cjs` and `staging-utility-browser.cjs`.
