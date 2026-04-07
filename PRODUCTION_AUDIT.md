# Pulse Production Audit (App + Server Actions)

Date: 2026-04-07

## Scope

- Full app architecture and integration audit (frontend + server actions + routing)
- Verify server action usage across app routes/components
- Identify logic gaps and production-readiness improvements
- Security/monitoring checks intentionally excluded per request

---

## Executive Summary

The app has a strong base: App Router structure is coherent, Clerk auth/onboarding flows are mostly integrated, core posting/replies flow works, and search/community/profile/thread pages are now interconnected.

Key work still required for production-grade reliability is mostly around:

1. Type hardening (remove broad `any` usage in high-traffic flows)
2. Consistent ID model usage (`clerk user id` vs `mongo user id`) in all operations
3. Better separation of webhook/internal actions vs user-facing/admin actions
4. A small set of UX consistency and state-refresh edge cases

---

## Server Actions Audit

### `lib/actions/user.actions.ts`

- `fetchUser` -> **Used** in onboarding, home, create, search, activity, profile, thread pages
- `updateUser` -> **Used** in `AccountProfile`
- `fetchUserPosts` -> **Used** in `ThreadsTab`
- `fetchUsers` -> **Used** in search results
- `getActivity` -> **Used** in activity page

Status: **All exported user actions are used**

Notes:
- `getActivity(userId)` expects Mongo `_id` and is currently called with `_id` string on activity page. This is correct.
- `fetchUser(userId)` expects Clerk user id (`User.id`). This is used correctly in most places.

---

### `lib/actions/thread.actions.ts`

- `fetchPosts` -> **Used** in feed
- `createThread` -> **Used** in post form
- `deleteThread` -> **Used** in `PostCard`
- `fetchThreadById` -> **Used** in thread details page
- `addCommentToThread` -> **Used** in comment form
- `toggleLikeThread` -> **Used** in `PostCard`
- `toggleRepostThread` -> **Used** in `PostCard`

Status: **All exported thread actions are used**

Notes:
- Likes/reposts are now implemented with optimistic UI and server revalidation.
- `createThread` returns created thread id and is correctly used for direct routing to `/thread/[id]`.

---

### `lib/actions/community.actions.ts`

- `createCommunity` -> **Used** by Clerk webhook route
- `fetchCommunityDetails` -> **Used** in community details page
- `fetchCommunityPosts` -> **Used** in shared `ThreadsTab` for community mode
- `fetchCommunities` -> **Used** in communities listing page
- `addMemberToCommunity` -> **Used** by webhook + internal join wrapper
- `removeUserFromCommunity` -> **Used** by webhook + internal leave/admin wrappers
- `updateCommunityInfo` -> **Used** by webhook + internal admin update wrapper
- `deleteCommunity` -> **Used** by webhook + admin delete wrapper

New admin/user operations added:
- `joinCommunity` -> **Used** by `CommunityActions`
- `leaveCommunity` -> **Used** by `CommunityActions`
- `removeMemberFromCommunityAsAdmin` -> **Used** by `MemberRow`
- `deleteCommunityAsAdmin` -> **Used** by `CommunityActions`
- `updateCommunityInfoAsAdmin` -> **Exported, not yet wired in UI**

Status: **Core community actions are used; one admin action intentionally staged**

---

## Architecture & Logic Findings

### 1) ID Consistency (Critical)

Current model uses both:
- Clerk user id (`User.id` string)
- Mongo user `_id` (ObjectId string)

Observed pattern:
- Thread author references Mongo `_id` (correct for schema)
- UI ownership checks for delete/like/repost now use app user id (`userInfo.id`) in some places

Recommendation:
- Define a strict convention doc:
  - `authUserId` = Clerk id
  - `appUserId` = `User.id` (also Clerk id in your schema)
  - `dbUserObjectId` = Mongo `_id`
- Centralize a mapper helper in `lib/mappers` for all thread/community/user DTO conversion.

---

### 2) Webhook vs App-side Community Membership (High)

Both webhook membership events and app-side join/leave operations are now active.

Risk:
- If both flows are enabled simultaneously for same user action, duplicate operations can occur.

Recommendation:
- Choose one source of truth for membership updates:
  - Either webhook-only sync
  - Or app actions + webhook idempotent guard
- Add idempotency checks before push/pull writes (already partly present, but keep consistent).

---

### 3) Thread/community references (High)

`Thread.community` schema is ObjectId ref; some older delete logic still queries with string `communityId` directly.

Recommendation:
- In `deleteCommunity`, normalize to community Mongo `_id` before deleting related threads/users.
- Add helper to resolve `community.id -> community._id` once and reuse.

---

### 4) UI Action Ownership (Medium)

Thread/card delete is hidden client-side for non-owners and should remain.

Recommendation:
- Add server-side ownership check inside `deleteThread` as final authority (currently UI and path checks do most of the work).

---

### 5) Search debounce + loading (Implemented)

Search now debounces from `q` params and includes loading states.

Recommendation:
- Keep route transition debounce at 250-350ms (already ~350ms) for a balance of responsiveness and load.

---

### 6) Emoji button behavior (Platform constraint)

Browser cannot programmatically trigger OS `Win + .` emoji panel due to security constraints.

Current implementation:
- Uses native bridge hook `window.electron?.openEmojiPanel()` when available.

Recommendation:
- If web-only deployment: replace with in-app emoji picker.
- If desktop shell: implement `openEmojiPanel()` in preload/native layer.

---

## Feature Status Matrix

- Auth/onboarding flow: **Working**
- Feed with DB pagination: **Working**
- Thread detail + comments: **Working**
- Like/repost optimistic toggles: **Working**
- Search (server-driven + debounce + pagination): **Working**
- Activity timeline: **Working**
- Communities list/details: **Working**
- Community admin controls: **Implemented (delete/remove member), update UI pending**
- Right sidebar route behavior: **Working (home only)**

---

## Open Gaps Before Production Cut

1. Wire `updateCommunityInfoAsAdmin` into an admin-only community settings UI.
2. Add server ownership guard in `deleteThread`.
3. Normalize community deletion cleanup using ObjectId-safe queries.
4. Replace remaining broad `any` in `thread/[id]`, `Feed`, and action files.
5. Resolve React effect warning in `ThemeProvider` (avoid direct setState in effect body path).
6. Standardize timestamp formatting helper across cards/pages.

---

## Suggested Refactor Plan (Low-Risk Sequence)

Phase 1 (Safe)
- Add mapper utilities (`threadMapper`, `communityMapper`) and replace inline mapping blocks.
- Add explicit DTO types for feed/thread/activity/community responses.

Phase 2 (Logic Hardening)
- Implement server-side ownership checks (`deleteThread`, admin-only community mutations).
- Normalize community deletion internals with resolved Mongo `_id`.

Phase 3 (UX Polish)
- Community settings modal/page for admin updates.
- In-app emoji picker fallback for web.
- Unified skeleton states for tabs and details pages.

---

## Final Readiness Verdict

Current state: **Near-production feature-complete for core social flows**, with a short hardening backlog.

After addressing the listed open gaps (especially ID consistency + server ownership + remaining type hardening), the app is in strong shape for a professional Threads-like deployment.
