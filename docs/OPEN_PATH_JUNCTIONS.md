# Explicit open-path terminal junctions

This is a separate source-operation version2 profile. Native-line version1 remains exact.

## Supported selection

Choose two to sixteen distinct native wall/window path owners. For each owner, choose an
open subpath and its start or end terminal deliberately. The selected terminals must
already share exactly one coordinate. Enter a finite drawing-unit target, Preview every
changed owner/incident edge and source impact, then Apply once or Cancel.

Only absolute linear M/L/H/V/Z path syntax supported by the existing parser is eligible.
The selected subpath must be open, have at least two vertices and distinct terminal
coordinates before and after the edit. Closed shapes, internal vertices, repeated-terminal
loops, curves and relative commands are unsupported. No automatic membership, snapping,
adjacency, hosted doors or physical-unit conversion is inferred.

The fabricated demo has a deliberately selectable open perimeter/window terminal pair.
That is a software example, not evidence about an actual household layout. Other owners
or subpaths at equal coordinates remain independent and stationary unless explicitly
selected. One terminal per distinct owner avoids duplicate native-vertex edits.

## Exact owner mapping and preservation

The adapter proves raw unique SVG ownership and every derived edge of the entire owner
against the current parser/extractor. It never recovers owner identity by loosely splitting
an ID at a colon; native owner IDs can themselves contain colons. Derived-ID shadowing,
parser disagreement, unsupported ancestry/style/visibility, hidden/locked or protected
context reject before source writes. Clipping, masks and filters on the owner or any
ancestor are unsupported unless explicitly normalized to `none`; effects are not
evaluated or stripped. The same conservative safety check applies to native-line
eligibility without changing its version1 request/proposal contract.

Composition changes exactly one resolved terminal slot per selected owner. Every other
vertex, subpath, closure flag, source ID and non-path attribute stays intact. Parsing and
serializing may normalize M/H/V command text into M/L; byte-preserving path-command
formatting is not promised. All unselected coordinate meaning must remain exact, and only
the resolved incident edge may change. No dimension/label/calibration or association hash
is silently updated to fit the edit.

Preview binds exact source, project/state/revision and full actual visibility/lock policy.
Apply regenerates the reviewed draft and rechecks protection before one reversible
mutation/history step. Failure rolls back the whole edit; Cancel changes no saved data.
A source-textarea draft cannot override the reviewed operation. Existing report/binding
hashes remain recorded and become stale when the source changes.

## Version and verification boundary

The request uses `sourceOperationContractVersion:2`, operation
`move-explicit-open-path-junction`, explicit `ownerId`, nonnegative `subpathIndex` and
`endpoint` of `start` or `end`, plus current project/state/revision/source bindings and
target. Caller-supplied geometry or policy does not authorize an edit. Native-line v1,
overlay operations, project/declaration formats and historical checker evidence remain
unchanged. The current imported correction router does not advertise this operation.

Fabricated production-function and whole-owner preservation checks do not establish
native XML/input/readability, actual household acceptance or physical accuracy. Preserve
a fresh complete current private UI export before any household reload or edit.
