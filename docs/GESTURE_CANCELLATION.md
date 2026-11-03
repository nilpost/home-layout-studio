# Ordinary pointer gesture cancellation

The drawing surface already routes `pointercancel` to `pointerUp`; that handler must
cancel ordinary gestures rather than treat every termination as a successful release.
Canvas scale handles have their own existing cancellation path, which is unchanged.

## Reproduced defect and scoped repair

Against commit070cd5d, a fabricated same-realm production-handler test reproduced all
nine affected modes: overlay movement, original-reference movement, photo movement,
photo rotation, photo placement, paint, arrow, rectangle and furniture drawing.
Cancelling each incorrectly committed a preview: revision v7 became v8, one storage
write occurred, Undo history grew from1 to2 and Redo shrank from1 to0. The four drawing
modes also consumed nextId21→22. This was a termination/commit defect, independent of
browser rendering or physical geometry interpretation.

`pointerUp` now handles ordinary cancellation after the existing canvas-scale/photo
delegation but before mutation or drawing creation. It clears active/preview state,
restores the exact original overlay/reference snapshot when applicable, renders the
restored model and returns. Cancelled paint/arrow/rect/furniture drafts create nothing,
consume no identity and do not turn on a hidden layer. A single-point cancelled paint
draft never becomes the ordinary-release fallback dot.

`photoPointerUp` restores the entire matching photo snapshot on cancellation, including
null x/y for an originally unplaced photo and all retained metadata. It clears active
and preview state and follows the existing photo-mode/tool cleanup, without calling
`mutate`. This also protects direct calls to the photo termination helper.

No cancellation path writes browser storage, advances revision/state token, appends an
audit entry, or changes Undo/Redo stacks. Restoration targets only the active item,
original reference or photo; unrelated project state remains untouched. Successful
`pointerup` behavior and its normal transactional storage-failure rollback are retained.
Calls with an event object that has no type keep their historical release semantics.

## Verified scope and remaining gate

`tests/gesture-cancellation.mjs` runs actual production pointer down/move/up and photo
handlers, coordinate rounding, clone, source-lock guard, validators, mutation and
storage functions against fabricated state. Domain modules and state share one VM
realm. DOM nodes, screen-to-SVG identity mapping and rendering are simulated; storage
is an injected success/failure adapter. Source/media content is synthetic metadata,
not an actual household project or decoded private image/PDF.

The regression matrix verifies exact state/stacks after cancellation for all nine
modes, zero storage attempts and identity consumption, null placement/full metadata
restoration, preview cleanup, successful release and storage rollback for all nine
modes, plus no-type release compatibility. Existing single/group canvas-scale handle
and durability suites remain passing. After repair the same cancel fixtures retain
revision v7, write0 times, keep Undo/Redo at1/1 and nextId21.

This is code-path acceptance only. Actual browser event dispatch, native pointer
capture/release behavior, visual restoration and delivery to the currently open private
project remain unverified. No browser reload or private-project edit is part of this
repair; no new tool, permission, persisted schema or gesture workflow is introduced.


A later attempt to test native touch cancellation through the supported in-app browser
development capability reported that touch input dispatch is unavailable. No alternate
access or bypass was used. Production-function cancellation tests remain accepted;
native pointer-cancel delivery and visual restoration remain unverified.
