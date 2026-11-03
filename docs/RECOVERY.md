# Saved browser data recovery

Open `recovery.html` on the exact same origin (scheme, hostname and port) as the
editor. The **Back up saved browser data** link opens this separate page. It loads
no editor/domain startup or migration code. Inspect the saved data, then explicitly
export a complete private backup before trying to reload or repair the editor.

Recovery reads the existing editor metadata key and referenced media from the existing
private image database. It never writes, clears, deletes, upgrades or resets project
data. It preserves unknown metadata and exact embedded media strings. This copies
what was saved; it cannot retrieve unsaved work from a lost or closed page or certify
that the saved project will pass current editor validation.

The metadata snapshot must remain identical during media loading and before export.
If it changes, inspect again rather than combining different revisions. Missing or
malformed references/media, corrupt metadata, missing database/store, blocked access
and unsupported existing-database discovery stop complete export. Recovery does not
create a database to make it appear that media exists.

The JSON download is private: keep it outside public repositories and served folders.
After a complete backup is preserved, import or load it through the normal editor's
validation/review path. Exporting a backup does not authorize a reset, overwrite,
deployment, sharing or physical plan correction.

Tests use fabricated metadata/media and explicit storage/database adapters. Native
browser and actual project preservation are separate acceptance steps.


## Validation and limitations

The parser rejects duplicate object keys (including escaped equivalents), numeric
rounding/underflow, unsupported schema versions and excessive structures rather than
silently exporting changed metadata. Media is copied as exact saved base64 strings;
supported photo/raster MIME types are PNG, JPEG and WebP, with PDF/SVG original sources
also supported. Other formats stop complete export; no decoding validity is certified.

Fifty-seven runtime cases cover explicit control ordering, metadata loss rejection,
existing-database discovery/upgrade races, read-only transaction completion, missing or
conflicting media, stale snapshots, blocked access and an8MB media regression.
Independent review adds seven probes. Native browser acceptance with a fabricated
photo and original image compared normal export, recovery export and subsequent normal
export exactly apart from timestamp; cross-tab writes invalidated the inspection.

Startup also preserves absence of optional roomBoundaries in older saved projects,
while retaining explicitly empty/populated collections. Existing startup tests and
eight independent probes verify no storage/media writes or metadata normalization.
A fresh complete saved project was preserved before editor startup and the resulting
normal export matched every project field and embedded media item except exportedAt.
No source edits or corrections were applied during that acceptance.

Recovery preserves saved data, not unsaved state from a lost page. It does not fetch
external linked attachments, prove a media file decodes, repair malformed storage or
establish architectural correctness.
