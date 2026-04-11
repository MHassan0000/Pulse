# Media Upload Implementation Plan (UploadThing + Feed/Profile Media)

## Objective

Implement production-grade image/video uploads for thread posts using UploadThing, fully integrated with existing auth, feed, thread detail, activity, and profile/community media tabs.

This is a plan only (no feature implementation yet).

## Scope

- Add image/video attachments to new threads (and optionally comments only if explicitly approved).
- Persist media metadata in MongoDB with thread records.
- Render media in feed, thread detail, and profile/community media tabs.
- Add media filtering for `Media` tabs in user/community profiles.
- Keep existing pagination/infinite scroll performance characteristics.
- Enforce file limits, type constraints, and safe rendering.

## Existing Baseline (Current App)

- UploadThing is already configured in `app/api/uploadthing/core.ts` and `lib/uploadthing.ts`.
- Thread data model currently stores text + relations (`lib/models/thread.model.ts`) but no media fields.
- Posting UI is markdown-first (`components/forms/PostThread.tsx`).
- Feed is cursor-based infinite (`fetchPostsCursor` + `FeedInfinite`).
- Profile/community tabs are paginated and server-rendered (`ThreadsTab`, `ProfileTabPanel`, `Pagination`).
- Serialization boundary rules are strict (plain objects only between server/client).

## Proposed Data Model Changes

### Thread schema extension

Add a media array field on thread documents:

- `media: [{ kind, url, width, height, durationSec, bytes, mimeType, providerKey, posterUrl }]`

Recommended constraints:

- `kind`: enum `"image" | "video"`
- `url`: required, https only
- `mimeType`: required
- `bytes`: required
- `width`, `height`: optional for both kinds
- `durationSec`, `posterUrl`: optional for video
- `providerKey`: UploadThing key for moderation/deletion workflows

Indexes:

- Keep current feed indexes.
- Add optional partial index to accelerate media-tab queries:
  - `{ author: 1, createdAt: -1 }` with partial filter `media.0 exists`
  - `{ community: 1, createdAt: -1 }` with partial filter `media.0 exists`

## UploadThing Design

### Route configuration

Update file route to support images + videos with strict limits:

- Images: e.g. up to 8 MB each
- Videos: e.g. up to 100 MB each (or your product target)
- Max file count per post: e.g. 4 total

Middleware metadata should include:

- authenticated `userId`
- optional client-side `intent` (`thread_media`)

On upload complete:

- Return structured metadata needed by post composer.
- Avoid server logs.

### Validation & security

- Enforce allowed MIME types both client and server side.
- Sanitize/validate URL and metadata in server action before DB write.
- Reject unknown providers or malformed payload.

## Server Action & Validation Changes

### Thread validation schema

Extend `lib/validations/thread.ts` to accept optional media array with strict zod schema:

- URL format checks
- MIME and kind consistency checks
- Max media items
- Per-item max bytes

### `createThread` contract

Update `createThread` input to include `media`.

Flow:

1. Resolve Clerk user -> Mongo user (existing path).
2. Validate media payload.
3. Persist text + media atomically to thread.
4. Continue existing user/community thread linkage.
5. Revalidate path as currently done.

### Read paths

Ensure media is selected and serialized in all thread fetchers:

- `fetchPostsCursor`
- `fetchThreadById`
- `fetchUserPosts`
- `fetchUserRepliesReceived`
- `fetchCommunityPosts`

All must return plain serializable media objects.

## UI/UX Changes

### Post composer (`PostThread`)

Add media picker and upload queue:

- Multi-select image/video files.
- Preview cards with remove action.
- Upload progress/state + failure retry.
- Block submit while uploads are pending.
- Submit merged payload: markdown text + uploaded media metadata.

### Feed + thread rendering

Enhance `PostCard` rendering:

- Image grid layout responsive for 1..4 items.
- Video player with poster + controls.
- Lazy loading for media.
- Fixed aspect ratio boxes to avoid CLS.

### Media tab activation (profile/community)

- User profile `Media` tab: fetch only threads containing media.
- Community profile `Media` tab: same for community threads.
- Keep pagination behavior consistent with existing `threadsPage` model.

## Query & Performance Plan

- Keep feed cursor page size bounded (already present).
- Return lightweight payloads in list endpoints (avoid deep nested populations beyond what card needs).
- Use optimized image delivery (Next Image for images).
- Consider transcoding strategy for large videos if needed later.
- Add limits to prevent oversized request payloads on create thread.

## Integration Points to Update

- `lib/models/thread.model.ts` (schema)
- `lib/validations/thread.ts` (zod)
- `components/forms/PostThread.tsx` (upload + previews + submit payload)
- `lib/actions/thread.actions.ts` (create + serializers + fetchers)
- `lib/actions/user.actions.ts` and `lib/actions/community.actions.ts` (media-aware tab fetches)
- `components/feed/PostCard.tsx` (media renderer)
- `components/profile/ThreadsTab.tsx` + profile/community tab pages (media mode wiring)
- `app/api/uploadthing/core.ts` (route constraints + metadata)

## Rollout Sequence

1. Data model + schema migration-compatible changes.
2. Validation updates.
3. UploadThing route updates.
4. Composer upload UX + payload wiring.
5. Create thread action media persistence.
6. Read serializers + feed/thread renderers.
7. Media tabs activation for profile/community.
8. Performance pass + query tuning.
9. End-to-end QA and regression testing.

## Testing Strategy

### Unit/logic

- Validation rejects invalid media payloads.
- Serialization outputs plain objects only.
- `createThread` rejects oversized/invalid media.

### Integration

- Upload image/video then post -> visible on feed and thread detail.
- Profile media tab shows only media threads.
- Community media tab shows only media threads.
- Pagination still works for threads/replies/media.

### Regression

- Existing text-only posting remains unchanged.
- Likes/reposts/deletes still work on media posts.
- Activity and replies flows unchanged.

### Performance checks

- Initial feed payload size under target.
- Scroll smoothness with media-heavy feed.
- No layout shift spikes.

## Operational Considerations

- Environment variables for UploadThing must exist in all environments.
- Define retention/deletion policy for orphaned uploads (upload succeeded, post failed).
- Add optional admin/moderation hook for media removal.
- Add observability metrics (upload failures, create-thread failure rate, media render errors).

## Risks & Mitigations

- Large video payload impact: enforce strict limits + lazy loading.
- Serialization regressions: centralize media serializers in actions.
- Storage cost growth: enforce caps + monitor usage.
- UX complexity in composer: staged upload with clear pending/error states.

## Acceptance Criteria

- Users can upload allowed images/videos and publish threads.
- Media renders correctly in feed, thread detail, and media tabs.
- Profile/community media tabs are fully functional and paginated.
- All server responses crossing server->client boundary are plain objects.
- Production build passes and no runtime errors from serialization.
- No debug console logging in app codepaths.
