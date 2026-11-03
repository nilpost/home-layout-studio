# Project reset selection context

Reset demo clears selected references, primary selection and the range-selection
anchor only after the new project saves successfully. Source IDs reused by the demo
cannot inherit the previous project's selection or become targets of a later batch
action without a new selection. A cancelled or failed reset retains its previous
project, selection/anchor, zoom and history. Existing reset/UndoRedo model semantics
and generic demo geometry remain unchanged.

The previous reset cleared only primary selection; stale reference IDs could still
match newly created demo source elements and be hidden by a subsequent batch action.
The repair adds selection-context cleanup after the successful save guard. It does
not remove private stored media or automatically apply any proposal.

Production-function tests use fabricated SVG/DOM/storage adapters to exercise the
reset and selection/batch-action paths. Native browser reset and household acceptance
remain separate. No household reset or source/physical change was performed.
