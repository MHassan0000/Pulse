# Performance Optimization Implementation Plan (Production Ready)

## Objective

Make the Pulse app measurably faster, more resilient, and more professional in production by improving:

- perceived UX speed (loading, interactions, scrolling)
- backend response times (API + server actions)
- database efficiency (query/index health)
- runtime stability and observability
- release confidence through performance gates

---

## App Context (Current)

- **Framework:** Next.js App Router (`next@16`), React 19
- **Auth:** Clerk
- **Database:** MongoDB + Mongoose
- **Media:** UploadThing (images/videos)
- **UI Patterns:** Server Components + client interactive feed/cards, infinite scroll
- **Notable heavy areas:** feed hydration, thread detail tree rendering, markdown editor, media rendering, like/repost actions

---

## Success Metrics (Targets)

Track at **P75** for real users in production:

1. **LCP**: `< 2.5s` (homepage/feed)
2. **INP**: `< 200ms` (like/repost, tab switches, pagination)
3. **CLS**: `< 0.1`
4. **TTFB**:
   - feed API: `< 400ms`
   - server actions (like/repost): `< 250ms`
5. **Error rate**: `< 0.5%` for API/server actions
6. **Build budget:** initial JS by route reduced by at least `20%` on high-traffic routes

---

## Phase 0 — Baseline & Instrumentation (Must Do First)

### 0.1 Add production telemetry

- Integrate error/perf monitoring (Sentry or equivalent) for:
  - server action failures
  - API route latency
  - client-side route errors
- Capture Web Vitals using `useReportWebVitals` and send to analytics backend.

### 0.2 Add timing instrumentation

- Wrap critical functions with timing + outcome tags:
  - `fetchPostsCursor`
  - `fetchThreadById`
  - profile/community fetchers
  - `toggleLikeThread`, `toggleRepostThread`
- Record DB query durations + counts per request.

### 0.3 Establish baseline dashboard

- Create a simple dashboard/table for:
  - route render time
  - API p50/p75/p95
  - action failure rates
  - DB slow queries

**Exit criteria:** team has objective baseline before tuning.

---

## Phase 1 — Database & Data Access Optimization

### 1.1 Query/index audit (high priority)

- Audit all frequent queries and ensure exact index support:
  - feed: `parentId + _id(desc)` cursor scans
  - profile threads/replies/media filters
  - community posts/media filters
  - activity queries
- Validate via Mongo `explain("executionStats")` and confirm no collection scans on hot paths.

### 1.2 Remove expensive over-population

- Minimize `.populate(...)` to only fields rendered above the fold.
- Prefer explicit projections (`select`) for every read query.
- For nested thread trees, load shallow by default and lazy-load deeper replies on demand.

### 1.3 Lean + serialization hygiene

- Keep `.lean()` on all read-heavy endpoints.
- Standardize DTO serializer helpers to avoid repeated transformations and reduce CPU overhead.

**Exit criteria:** p75 DB query time reduced by >= 30% on feed/thread/profile endpoints.

---

## Phase 2 — API + Server Action Performance

### 2.1 Action reliability and low-latency interactions

- Keep like/repost actions atomic (already addressed).
- Prevent unnecessary full-path revalidation for tiny state changes (likes/reposts):
  - prefer local optimistic state + periodic sync
  - revalidate only when data model requires server canonical refresh

### 2.2 Separate hot reads from heavy server component work

- Feed cursor API should return only fields used by cards.
- Move non-critical side data to deferred/lazy fetches.

### 2.3 Consistent error semantics

- Use typed error responses for actions/APIs.
- Add retry/backoff for transient network/database failures where safe.

**Exit criteria:** actions become consistently fast and non-blocking for UI.

---

## Phase 3 — Frontend Rendering & Bundle Optimization

### 3.1 Reduce hydration + client JS

- Convert non-interactive sections to pure Server Components where possible.
- Dynamically import heavy client modules:
  - markdown editor
  - any large dialog/forms not needed on first paint

### 3.2 Feed rendering efficiency

- Keep card component stable and memoize expensive derived calculations.
- If feed size grows, introduce virtualization/windowing for long lists.

### 3.3 Route-level bundle budgets

- Add bundle analyzer in CI and enforce route size budgets.

**Exit criteria:** homepage and thread pages ship less JS and improve interactivity metrics.

---

## Phase 4 — Media Delivery Optimization

### 4.1 Image/video strategy

- Keep resilient URL handling for UploadThing.
- For large media lists, use lower-cost preview mode first, full quality on demand.
- Add explicit poster/thumbnail strategy for videos to reduce initial decode cost.

### 4.2 Caching headers and CDN usage

- Ensure media/static assets have long-lived cache headers.
- Verify `Cache-Control` for API responses where safe.

### 4.3 Progressive loading polish

- Prioritize above-fold media only.
- Keep below-fold content lazy.

**Exit criteria:** media-heavy feed remains smooth on mid-range mobile devices.

---

## Phase 5 — Responsiveness & UX Consistency Hardening

### 5.1 Device matrix QA

- Validate all primary surfaces on:
  - iPhone SE/13/15 sizes
  - common Android mid-size viewport
  - tablet portrait/landscape
  - desktop widths (1280/1440/1920)

### 5.2 Interaction consistency

- Verify all critical click targets (buttons, toggles, nav items) have consistent feedback and states.
- Confirm loading/disabled states for network actions.

### 5.3 Scroll behavior

- Home feed smooth scrolling only (Lenis): keep subtle values and disable for reduced motion users.
- Ensure no scroll-jank conflicts with nested scroll containers.

**Exit criteria:** no major layout/interaction regressions across target devices.

---

## Phase 6 — Production Readiness Controls

### 6.1 CI performance gates

Add CI checks:

- `npm run lint`
- `npm run build`
- Lighthouse CI on critical routes (`/`, `/thread/[id]`, `/profile/[id]`)
- Bundle-size diff checks

### 6.2 Rollout strategy

- Ship optimizations in small batches behind flags when possible.
- Canary release to subset of traffic.
- Monitor error/perf dashboards for 24-48h before full rollout.

### 6.3 Rollback plan

- Keep revert-ready commits per optimization batch.
- For risky optimizations, support env flag fallback.

---

## Detailed Work Breakdown (Actionable)

## Week 1 (Baseline + Quick Wins)

- [ ] Add telemetry + web vitals capture
- [ ] Add action/API timing wrappers
- [ ] Audit feed/profile/community query plans
- [ ] Remove obvious over-population fields

## Week 2 (Backend/DB heavy)

- [ ] Finalize index adjustments from explain plans
- [ ] Reduce thread detail deep tree loading (lazy depth)
- [ ] Normalize response DTOs and projections

## Week 3 (Frontend/Bundles)

- [ ] Dynamic import heavy editor paths
- [ ] Add bundle analyzer + budget alerts
- [ ] Apply memoization/virtualization where needed

## Week 4 (Hardening + rollout)

- [ ] Full responsive regression pass
- [ ] Lighthouse CI baseline vs optimized comparison
- [ ] Canary deploy + monitor + full rollout

---

## Risks & Mitigations

- **Risk:** Over-caching stale data
  - **Mitigation:** tag-based invalidation + narrow cache scopes
- **Risk:** Query/index changes impacting write performance
  - **Mitigation:** benchmark writes before and after; avoid over-indexing
- **Risk:** UX regressions from aggressive lazy loading
  - **Mitigation:** stage rollout with visual QA matrix
- **Risk:** Media fallback complexity
  - **Mitigation:** centralize URL normalization logic and test fixtures

---

## Definition of Done (Production Ready)

- All checks green in CI (`lint`, `build`, Lighthouse thresholds)
- P75 metrics meet target windows for key routes/actions
- No critical errors in monitoring for 7 days post-rollout
- Device responsiveness QA complete across defined matrix
- Performance playbook documented for future features

---

## Optional Next-Step Enhancements (Post-Plan)

- Edge caching for read-heavy anonymous endpoints
- Background precomputation for activity/feed ranking
- A/B test interaction micro-optimizations for engagement
