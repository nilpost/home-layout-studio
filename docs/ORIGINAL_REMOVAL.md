# Original-reference removal feedback

Remove original reports success and switches to the selection tool only after the
existing reversible transaction commits. If storage, item locks or validation rejects
the removal, the original reference, revision/token, history/redo and current tool
remain intact, and the rejection message stays visible. Missing-reference removal is
inert. A successful retry creates one Undo entry; Undo/Redo restore/remove the reference.

The previous handler ignored a failed transaction and announced removal while the
reference remained. Four fabricated production-function regressions cover quota failure
and retry with Undo/Redo, a real item lock, validation rejection and no-reference no-op.
They run the actual handler, mutation, local save and notification functions. Browser
rendering/input and actual household removal are separate acceptance; no private media
record deletion or cleanup is performed.
