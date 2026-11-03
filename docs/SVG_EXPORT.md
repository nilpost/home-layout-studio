# SVG export error feedback

SVG export reports storage/media/serialization failures inside the site instead of
leaving an unhandled rejected operation. Failures before download creation produce no download or success
message. Existing changed-project and missing/not-ready original-preview guards keep
their behavior. Successful export retains the current viewBox, original-preview
embedding and removal of transient preview/hit/selection layers from the clone.

The exporter does not alter saved project/source geometry or create a revision. Its
existing matching-cancellation and DOM cloning behavior remain. An SVG deliverable is
private and is not a complete project backup; retain complete JSON and original media.

Fabricated production-function tests combine real media transaction reads with an
event-controlled IndexedDB adapter and fabricated SVG clone/serializer objects. Native
browser rendering/downloads and household export acceptance remain separate. No media
deletion, geometry changes or architectural/physical certification is added.
