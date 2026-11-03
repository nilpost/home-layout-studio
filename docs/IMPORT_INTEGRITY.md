# Imported object allocation integrity

A project import derives the next shared item/comment identifier before any SVG or
media processing or saved-state replacement. Explicit counters must be positive safe
integers below Number.MAX_SAFE_INTEGER. Digit-only legacy strings remain supported;
an absent counter starts from1. The derived counter must exceed every existing
item/comment numeric suffix and remain usable. Photos use independent UUID identities.

Unsafe, fractional, negative, zero, exhausted or malformed counters and unrepresentable
suffixes reject visibly. They cannot write media or metadata, replace current geometry,
consume history or change selection. Ordinary mutation validation also rejects an
allocation reaching exhaustion and uses the existing transaction rollback. The editor
does not silently rename existing objects or reset an unsafe counter.

Production-function tests reproduce the old duplicate-ID defect at2^53, where increment
no longer advances. They cover invalid input, suffix overflow, normal legacy inference,
repeated actual pointer creation and exhaustion rollback. Full project round trips
and browser input remain distinct checks; this patch was verified with fabricated
production-function adapters while native browser access was unavailable.

Saved startup rejects explicitly malformed counters without clearing stored data;
read-only recovery remains available. This change does not migrate legacy startup
records missing a counter, repair already corrupt projects, or remove orphaned media.

## Complete embedded media before writes

Import checks every required photo and original-source/preview data field before the
first media write. An incomplete later photo or original reference cancels without
leaving earlier images from that rejected file in storage. Existing MIME/schema and
size checks retain their bounds. No existing image is deleted or rewritten.

This preflight is not a cross-store transaction or image-decoder certification. A later
storage failure, concurrent-state rejection or crash can still leave unreferenced newly
written media; the live project remains protected by its existing guards. Automatic
cleanup and full media transaction handling require separate review.
