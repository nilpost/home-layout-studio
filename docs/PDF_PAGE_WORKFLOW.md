# PDF page rendering context

A page change retains both the complete starting project snapshot and the identity of
its original-reference object. Before committing a rendered preview, both must remain
current. Undo/Redo can restore equal metadata in a different object; such a pending
render rejects instead of updating a detached reference and falsely reporting success.

The existing transaction, locks and save rollback remain responsible for committed
page/preview changes. Original PDF bytes, source geometry and unrelated alignment
metadata remain unchanged. A stale render may leave a newly staged preview unreferenced;
no automatic media deletion or cross-store atomicity is added.

Fabricated production-function tests cover controlled asynchronous rendering and
history transitions. Real PDF decoding, browser rendering and household page changes
remain separate acceptance.
