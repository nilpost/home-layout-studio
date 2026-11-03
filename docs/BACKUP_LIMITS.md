# Backup aggregate size

Normal JSON export measures the exact complete serialized text, including indentation,
escaping, metadata and embedded media, against the existing import budget of80,000,000
JavaScript string code units. An exactly-at-limit file remains supported; a larger file
is rejected visibly before creating a download. No media is truncated, skipped, deleted
or recompressed, and project/history/selection/storage remain unchanged.

This matches the existing aggregate guard on the read-only recovery page. It does not
raise the import limit or add large-project backup support. Preserve existing private
backups and original media. Do not delete images to fit a backup before independently
preserving the project. Larger projects need a separately designed preservation path.

UTF8 file size may exceed the character budget for non-ASCII text. The guard uses the
same string-length measure as import, rather than incorrectly rejecting an otherwise
supported file based on Blob byte size. Existing snapshot export semantics, missing-media
checks and transaction failures retain their behavior. All other schema/media validation
requirements still apply when restoring; aggregate size alone does not certify a backup.

Fabricated production-function tests exercise real80Mboundaries, aggregate photos,
Unicode/escaping, complete roundtrip, snapshot races and media failures. Text-capturing
Blob adapters avoid redundant large byte allocations. Native browser download/import,
streaming, memory exhaustion and crash-safe multi-image preservation remain unverified.
