# Landmark alignment transaction feedback

Completing three shared landmark pairs reports an aligned original reference only
after the existing reversible mutation commits. If storage, locks or validation rejects
the mutation, the message and landmark-status panel retain the rejection rather than
claiming a fit was saved. Original pose/registration, project revision/token and history
remain unchanged. Matching still ends through the existing cancellation path; restart
matching explicitly to retry. No automatic application or source rewrite is added.

Successful matching keeps the existing similarity fit, registration evidence and Undo/
Redo behavior. Source/revision guards and fitting errors retain their safeguards. The
fit concerns explicitly supplied schematic points and does not establish architectural
or physical accuracy.

Fabricated production-function workflow regressions cover transaction rejection and
success around the actual fitting and mutation functions. Native point input/rendering
and actual household alignment remain separate acceptance; no household alignment was
performed by this patch.
