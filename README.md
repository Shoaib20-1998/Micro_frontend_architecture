# Micro Frontend Architecture — Deep Dive

A hands-on learning repository covering three micro frontend approaches with working code examples, heavy inline annotations, and interview preparation material.

## What's Inside

```
├── Single-Spa/          → Approach 1: Orchestration-based (route-level composition)
├── ModuleFederation/    → Approach 2: Runtime code sharing (component-level composition)
├── Hybrid/              → Approach 3: Single-Spa + Module Federation combined
└── docs/                → Cross-cutting topics (communication, CSS, routing, deps, testing)
```

## Quick Start

Each approach runs independently. Pick one and start the dev servers:

**Single-Spa** (ports 8081, 8082, 9000)
```bash
cd Single-Spa/app-react-home && npm install && npm start &
cd Single-Spa/app-react-dashboard && npm install && npm start &
cd Single-Spa/root-config && npm install && npm start
# Open http://localhost:9000
```

**Module Federation** (ports 3001, 3002, 3000)
```bash
cd ModuleFederation/remote-products && npm install && npm start &
cd ModuleFederation/remote-cart && npm install && npm start &
cd ModuleFederation/host-app && npm install && npm start
# Open http://localhost:3000
```

**Hybrid** (ports 4001, 4002, 4000)
```bash
cd Hybrid/mf-home && npm install && npm start &
cd Hybrid/mf-settings && npm install && npm start &
cd Hybrid/shell && npm install && npm start
# Open http://localhost:4000
```

> Start remotes first, then the host/shell. Order matters for Module Federation and Hybrid.

## The Three Approaches at a Glance

| | Single-Spa | Module Federation | Hybrid |
|---|---|---|---|
| **What it does** | Routes between independent apps | Shares components at runtime | Both — routing + sharing |
| **Composition** | One app per route | Multiple components on one page | Route-based with MF loading |
| **Code loading** | SystemJS + import maps | Webpack 5 remoteEntry.js | Webpack 5 (no SystemJS) |
| **Dependency sharing** | Manual (CDN externals) | Automatic (shared config) | Automatic |
| **Lifecycle management** | Yes (bootstrap/mount/unmount) | No | Yes |
| **Best for** | Multi-framework teams | Same-framework, component sharing | Lifecycle control + dep sharing |

## Recommended Reading Order

If you're preparing for interviews, go through these in order:

### 1. Foundations + Single-Spa
Read [`Single-Spa/README.md`](Single-Spa/README.md) — covers monolith vs micro frontend, core principles, and the Single-Spa approach with interview questions.

Then browse the code: `root-config/src/index.js` → `app-react-home/src/app-name.js` → `app-react-home/src/root.component.js`

### 2. Module Federation
Read [`ModuleFederation/README.md`](ModuleFederation/README.md) — covers runtime loading, shared dependency negotiation, and the host/remote pattern.

Then browse: `host-app/webpack.config.js` → `host-app/src/App.js` → `remote-products/webpack.config.js`

### 3. Hybrid
Read [`Hybrid/README.md`](Hybrid/README.md) — covers why you'd combine both, the mf-loader bridge, and migration strategies.

Then browse: `shell/src/mf-loader.js` → `shell/src/bootstrap.js` → `mf-home/src/single-spa-entry.js`

### 4. Cross-Cutting Topics
- [`docs/communication/README.md`](docs/communication/README.md) — Custom events, event bus, shared store
- [`docs/routing/README.md`](docs/routing/README.md) — Shell-level vs app-level routing
- [`docs/css-isolation/README.md`](docs/css-isolation/README.md) — CSS Modules, Shadow DOM, BEM
- [`docs/shared-deps/README.md`](docs/shared-deps/README.md) — Singleton, version range, eager loading
- [`docs/testing/README.md`](docs/testing/README.md) — Unit, integration, E2E strategies

### 5. Interview Prep
Read [`docs/interview-guide/README.md`](docs/interview-guide/README.md) — decision matrix, 10+ scenario questions, cheat sheet.

## How to Learn From This Repo

Every code file has inline comments explaining **why**, not just what. Don't just read the READMEs — open the actual source files. The annotations connect theory to implementation.

Suggested approach:
1. Read the README for an approach
2. Run the dev servers and click around
3. Open the source files and read the annotations
4. Try breaking things (stop a remote, change a port) and see what happens
5. Review the interview questions and practice answering out loud

## All Documentation Files

| File | What It Covers |
|------|---------------|
| [`Single-Spa/README.md`](Single-Spa/README.md) | Single-Spa approach, foundational concepts, interview prep |
| [`ModuleFederation/README.md`](ModuleFederation/README.md) | Module Federation runtime mechanics, shared deps, interview prep |
| [`Hybrid/README.md`](Hybrid/README.md) | Hybrid approach, mf-loader bridge, migration strategies, interview prep |
| [`docs/communication/README.md`](docs/communication/README.md) | Custom events, event bus, shared store patterns |
| [`docs/routing/README.md`](docs/routing/README.md) | Shell-level vs app-level routing strategies |
| [`docs/css-isolation/README.md`](docs/css-isolation/README.md) | CSS Modules, Shadow DOM, BEM prefix techniques |
| [`docs/shared-deps/README.md`](docs/shared-deps/README.md) | Singleton, version range, eager loading strategies |
| [`docs/testing/README.md`](docs/testing/README.md) | Unit, integration, E2E testing for micro frontends |
| [`docs/interview-guide/README.md`](docs/interview-guide/README.md) | Decision matrix, 10+ scenario questions, cheat sheet |

## Tech Stack

- React 18
- Webpack 5
- single-spa + single-spa-react
- Module Federation (webpack built-in)
- Vanilla JS for cross-cutting demos
