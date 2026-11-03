# Explicit single-axis dimension chains

This HLS-106 increment compares the sum of declared source span dimensions against a
separate declared source total. It avoids the tautological comparison of geometric
span lengths against the same geometric outer length. Geometry is used to verify the
user-selected spans form the intended ordered straight chain; no chain is inferred.

Load `measurement-anchors.js` before `measurement-chains.js`.
`MeasurementChains.validate(chains,{projectId})` returns detached records; absent legacy
data yields `[]`. Each record has `id`, `projectId`, ordered distinct `spanAnchorIds`
(2 to 8), separate `totalAnchorId`, `sourceHashAtCreation`, optional ISO UTC `createdAt`.
IDs reject spaces, control characters and lengths over 300. Maximum 1,000 chains.
Duplicate chain IDs or repeated anchor references reject. Orphan references remain in
saved metadata and produce unknown findings. `createChain` accepts the same fields but
uses `sourceHash` to initialize `sourceHashAtCreation`.

`review({chains,anchors,projectId,segments,dimensions,calibration,tolerancePercent,
sourceHash})` returns `{findings,total,checked,status}`. It consumes the existing anchor
schema and geometry/dimension model. Every chain produces one detached finding with
`chainId`, `code`, `status`, `severity`, `affectedIds`, `measured`, `expected`, `unit`,
`errorPercent`, `evidence`. `measured` is the declared span sum in mm; `expected` is the
declared total in mm. Evidence retains original units/values and separate geometric
anchor comparisons, endpoints, topology, source hashes and every unknown reason.

All referenced anchors must exist uniquely and pass the existing anchor input verification
gates: current project/source identity, resolved finite endpoints/dimensions, verified unit
and calibration, explicit tolerance. An anchor comparison may itself disagree geometrically
while its inputs remain verified; that separate failed comparison stays in evidence and
the project anchor report. It does not suppress a legitimate declared chain contradiction.
Source units mm/cm/m convert explicitly; unknown/mixed expressions and area units remain
unknown. Calibration/unit status is declarative evidence, not independent survey proof.

The ordered span intervals must be collinear on x or y, contiguous, nonoverlapping and
monotonic. Either ascending or descending order is supported. Each anchor's start/end
orientation may be reversed independently. The total's outer endpoints must match the
chain's outer endpoints. No sorting, snapping, gap filling or topology guessing occurs.
Numerical geometry equality uses a fixed conservative `1e-7` drawing-unit epsilon.
This is a floating-point comparison guard, not a construction allowance or source accuracy
claim. Coordinates outside +/-1e9 drawing units are unknown. Zero/near-zero spans,
diagonals, offsets, gaps, overlaps, backtracking and missing geometry remain unknown.

Only an explicit finite `tolerancePercent` in [0,100] permits verified pass/fail of the
declared sum. Missing tolerance, stale chain/anchor source hashes, provisional calibration,
inferred units, ambiguous references and overflow produce unknown, even if a numerical
sum can be shown. Relative error is signed `100*(sum/total-1)`; the absolute value is
compared with the user's tolerance. No construction threshold is supplied by default.

`checked` counts verified chain comparisons only. No chains means overall unknown;
any verified disagreement means fail, otherwise an unknown chain makes overall unknown.
Coverage applies only to these explicitly selected chains. No complete-project review,
room/level coverage, branched network, wall route, door width, structural safety,
regulatory or as-built result follows. A source edit requires deliberate re-confirmation,
not automatic rebinding. The UI must capture/recheck project state and use reversible
mutation history when adding/removing chains; this pure module applies nothing.
