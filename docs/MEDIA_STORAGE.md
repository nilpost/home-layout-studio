# Media transaction settlement

The normal editor publishes read/write media results to its in-memory cache only after
the IndexedDB transaction completes. Request success is not sufficient: a transaction
may fail later. Aborts, request/transaction errors and synchronous setup/request failures
reject the operation instead of remaining pending or reporting an uncommitted result.
This follows the [IndexedDB transaction lifecycle](https://www.w3.org/TR/IndexedDB/#transaction-lifecycle).

Successful cached reads retain their fast path; failed overwrites leave an earlier
cached value intact. A missing completed read stays missing. Failed reads cannot
produce a successful JSON backup, and failed imported media writes cannot replace
project metadata. Known-input completeness preflight remains unchanged.

Fabricated event-controlled tests execute real media helpers and export/import callers.
They reproduce write-abort hangs and premature read/cache success before later failure.
Native browser/storage acceptance is separate. Completion here does not certify disk
flush or power-loss durability. No media cleanup/deletion, database recovery, cache
invalidation policy or cross-store atomicity was added; earlier successful writes in a
later failed multi-image import may still remain unreferenced.
