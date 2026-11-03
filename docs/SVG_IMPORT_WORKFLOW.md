# Selection during architectural SVG replacement

The architectural SVG import clears selected references and the primary selection only
after its existing reversible transaction commits. A rejected save, item lock or
validation leaves the previous project, selection, zoom and history intact. The error
remains visible, and a successful retry commits one normal replacement.

Previously selection was cleared inside the mutation callback; project rollback did
not restore that separate UI state. This change moves that cleanup after the successful
result check. Source sanitation, locks, explicit binding/asset guards and replacement
semantics stay unchanged. No geometry policy or automatic correction is added.

Production-function tests use fabricated SVG/storage/DOM adapters around the actual
import handler and mutation/save/notification functions. Native parsing/rendering and
household import acceptance remain separate; no household source replacement occurred.
