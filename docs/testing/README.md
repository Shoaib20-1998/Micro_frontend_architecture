# Testing Strategies for Micro Frontends

> **Learning Goal:** Understand how to test micro frontend architectures at three levels — unit, integration, and end-to-end — and articulate the trade-offs, ownership models, and CI/CD considerations in a senior-level interview.

## The Testing Pyramid for Micro Frontends

The classic testing pyramid (many unit tests, fewer integration tests, fewest E2E tests) applies to micro frontends, but with a twist: the **boundaries between levels map directly to the architectural boundaries** between micro frontends.

```
        ╱  E2E Tests  ╲          ← Composed app in a real browser
       ╱  (Cypress)    ╲            All MFs running, real network
      ╱─────────────────╲
     ╱ Integration Tests ╲       ← Cross-MF communication contracts
    ╱  (Jest)              ╲        Event bus, shared store, events
   ╱────────────────────────╲
  ╱      Unit Tests          ╲   ← Individual MF components
 ╱       (Jest + RTL)         ╲     One team, one CI pipeline
╱──────────────────────────────╲
```

| Level | What It Tests | Speed | Reliability | Catches |
|-------|--------------|-------|-------------|---------|
| **Unit** | Single MF component in isolation | ⚡ Fast (ms) | 🟢 Very reliable | Rendering bugs, logic errors, edge cases |
| **Integration** | Communication between MFs | 🔄 Medium (seconds) | 🟡 Reliable | Contract mismatches, event name typos, payload shape errors |
| **E2E** | Composed app in real browser | 🐢 Slow (minutes) | 🔴 Can be flaky | MF loading failures, CSS conflicts, routing issues, runtime dep mismatches |

## Testing Level Details

### Unit Tests (`unit-test-example.js`)

**What:** Test individual micro frontend components in complete isolation. No host app, no other MFs, no Module Federation runtime.

**How:** Import the component source file directly (not through the federated module system) and render it with React Testing Library.

**Key principle:** Module Federation is a *deployment* concern, not a *testing* concern. Your unit tests should never know the component will be served as a federated remote.

**Ownership:** Each team owns and runs their own unit tests in their own CI pipeline. Zero cross-team dependencies.

```
Team A's CI Pipeline          Team B's CI Pipeline
┌──────────────────┐          ┌──────────────────┐
│ git push         │          │ git push         │
│ npm install      │          │ npm install      │
│ npm test (unit)  │ ← fast   │ npm test (unit)  │ ← fast
│ npm run build    │          │ npm run build    │
│ deploy           │          │ deploy           │
└──────────────────┘          └──────────────────┘
```

### Integration Tests (`integration-test-example.js`)

**What:** Test the communication contracts between micro frontends — event names, payload shapes, state schemas.

**How:** Use real implementations of the communication layer (EventBus, SharedStore) and simulate MF behaviors (publishing events, updating state) in Jest.

**Key principle:** Test the *contract*, not the implementation. If Team A renames an event or changes a payload shape, the integration test should catch it before it reaches production.

**Ownership challenge:** Who writes these tests?
- **Option A:** Consuming team writes them (they care most about the contract)
- **Option B:** Platform team writes them (neutral ground)
- **Option C:** Both teams collaborate on a shared contract test suite (ideal but requires coordination)

### E2E Tests (`e2e-test-example.js`)

**What:** Test the fully composed application in a real browser with all micro frontends running.

**How:** Cypress visits the host app URL and interacts with the page. Module Federation loads remotes over the network, just like production.

**Key principle:** Test *critical user journeys* that cross MF boundaries, not every feature. Keep E2E test count low — they're expensive.

**Operational challenge:** All services must be running before tests start. In CI, this means docker-compose or startup scripts with health checks.

## Strategy Comparison

| Criteria | Unit | Integration | E2E |
|----------|------|-------------|-----|
| **Execution speed** | Milliseconds | Seconds | Minutes |
| **Infrastructure needed** | None (Jest + JSDOM) | None (Jest + JSDOM) | All MF servers + browser |
| **Flakiness risk** | Very low | Low | High (network, timing) |
| **Debugging difficulty** | Easy (one component) | Medium (two+ modules) | Hard (full stack) |
| **Run frequency** | Every commit | Every commit | Nightly / pre-release |
| **Team ownership** | Single team | Shared / consuming team | Platform / QA team |
| **What it misses** | Cross-MF issues | Visual/layout issues | Nothing (but expensive) |
| **Setup complexity** | Minimal | Minimal | High (multi-service orchestration) |

## CI/CD Considerations

### Pipeline Architecture

Micro frontend CI/CD is fundamentally different from monolith CI/CD because each MF deploys independently. Testing must account for this.

```
┌─────────────────────────────────────────────────────────┐
│                    PER-MF PIPELINE                       │
│  (runs on every push to a MF's repo/directory)          │
│                                                         │
│  ┌──────────┐   ┌───────────────┐   ┌──────────────┐   │
│  │  Unit    │──▶│  Integration  │──▶│  Build &     │   │
│  │  Tests   │   │  Tests        │   │  Deploy MF   │   │
│  └──────────┘   └───────────────┘   └──────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  COMPOSED PIPELINE                        │
│  (runs nightly or on release branches)                   │
│                                                         │
│  ┌──────────────┐   ┌──────────┐   ┌────────────────┐  │
│  │  Start all   │──▶│  E2E     │──▶│  Report &      │  │
│  │  MF servers  │   │  Tests   │   │  Notify teams  │  │
│  └──────────────┘   └──────────┘   └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key CI/CD Challenges

1. **Version matrix:** When MF-A deploys v2, does it still work with MF-B v1? Integration tests should cover the version combinations that exist in production.

2. **Deployment order:** If MF-A depends on a new event from MF-B, MF-B must deploy first. Integration tests catch this if they run against the *deployed* versions, not just local code.

3. **Rollback testing:** If MF-A v2 breaks the composed app, can you roll back to v1 without breaking MF-B? E2E tests against the rollback version validate this.

4. **Shared dependency updates:** When React is updated in one MF, the singleton sharing in Module Federation means all MFs get the new version. A shared dependency update should trigger E2E tests across all MFs.

### Recommended Test Distribution

| Test Type | When to Run | Duration Budget | Failure Action |
|-----------|-------------|-----------------|----------------|
| Unit tests | Every commit | < 2 minutes | Block merge |
| Integration tests | Every commit | < 5 minutes | Block merge |
| E2E (smoke) | Every deploy | < 10 minutes | Block deploy |
| E2E (full suite) | Nightly | < 30 minutes | Alert on-call team |

---

## Interview Preparation

### Question 1: How do you structure a testing strategy for a micro frontend architecture?

**Model Answer:**

"I use the testing pyramid adapted for micro frontend boundaries. At the base, each team writes unit tests for their own micro frontend using Jest and React Testing Library — these run in the team's CI pipeline with zero external dependencies and test components in complete isolation from Module Federation.

In the middle, integration tests verify the communication contracts between micro frontends. I test the actual event bus and shared store implementations, not mocks, to ensure that when Team A publishes a `cart:item-added` event, the payload shape matches what Team B expects. These tests catch contract drift — like when one team renames an event or changes a payload field without coordinating.

At the top, E2E tests use Cypress to test the fully composed application with all micro frontends running in a real browser. I keep these focused on critical user journeys that cross MF boundaries — like browsing products and adding to cart. E2E tests are expensive, so I run a smoke suite on every deploy and the full suite nightly.

The key insight is that each testing level maps to an architectural boundary: unit tests stay within one MF, integration tests cross the communication layer, and E2E tests validate the composed whole."

### Question 2: What are the biggest challenges with E2E testing in a micro frontend architecture, and how do you address them?

**Model Answer:**

"The three biggest challenges are environment orchestration, flakiness, and ownership.

For orchestration, you need all micro frontends running before tests start. I use docker-compose in CI to spin up the host and all remotes with health checks, and `wait-on` to block test execution until every service responds. The startup order matters — remotes must be ready before the host fetches their `remoteEntry.js`.

For flakiness, Module Federation adds network hops that unit tests don't have. I increase Cypress timeouts to account for the MF loading sequence (fetch remoteEntry → negotiate shared deps → load component), use `cy.intercept()` to simulate remote failures deterministically instead of actually stopping servers, and configure Cypress to retry failed tests twice in CI.

For ownership, E2E tests cross team boundaries — no single team owns the composed experience. I advocate for a platform or QA team that maintains the E2E suite, with each feature team contributing test scenarios for their critical journeys. The E2E suite runs nightly and alerts the on-call team on failure, rather than blocking individual team deployments."

### Question 3: How do you test the communication layer between micro frontends without running the full application?

**Model Answer:**

"Integration tests. I import the actual communication modules — the event bus, shared store, or custom event utilities — into a Jest test and simulate the behavior of multiple micro frontends.

For example, to test that the Products MF's 'add to cart' event reaches the Cart MF, I create a fresh EventBus instance, subscribe a mock Cart handler, publish the event with the expected payload, and assert the handler received the correct data. I also test error isolation — if the Cart handler throws, the Nav handler should still receive the event.

For the shared store, I test the late-mount scenario: MF-A sets state, then MF-B mounts later and calls `getState()` — it should see MF-A's update even though it wasn't subscribed when the update happened. This is the key advantage of a store over events, and it's a common source of bugs when teams switch from events to shared state.

These tests use real implementations, not mocks, because the point is to verify the actual communication path. They run in milliseconds in Jest's JSDOM environment — no servers, no browsers — so they're fast enough to run on every commit."

### Question 4: A team deploys a new version of their micro frontend and it breaks the composed application. How would your testing strategy have caught this?

**Model Answer:**

"It depends on what broke. If the MF's component crashes on render, their unit tests should have caught it — that's a failure in the team's own CI pipeline. If the MF changed an event name or payload shape, integration tests against the communication contract should have caught it — assuming both teams maintain a shared contract test suite.

If the break is a Module Federation issue — like a shared dependency version mismatch or a missing exposed module — that's where E2E smoke tests on deploy are critical. Before the deploy goes live, a smoke suite verifies that the host can load the new remote and render it without triggering the ErrorBoundary.

The gap in most testing strategies is the version matrix: does MF-A v2 work with MF-B v1? I'd address this with contract testing — each MF publishes its communication contract (event names, payload schemas, exposed modules), and CI verifies that the new version's contract is backward-compatible with what other MFs expect. Tools like Pact can formalize this, but even a simple JSON schema check in CI catches most breaking changes."

---

## Files in This Module

| File | Description |
|------|-------------|
| `unit-test-example.js` | Annotated Jest + React Testing Library unit test for a remote MF component (ProductList) |
| `integration-test-example.js` | Annotated integration tests for EventBus, SharedStore, and CustomEvent communication |
| `e2e-test-example.js` | Annotated Cypress E2E tests for the composed Module Federation application |
| `README.md` | This file — strategy comparison, CI/CD considerations, and interview prep |
