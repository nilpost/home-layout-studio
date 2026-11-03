# Source-junction request contract

The site uses this separate namespace for explicit native-line junction proposals.
It is not accepted by the imported overlay/full-source correction router. No live provider
or imported-operation capability is advertised. Existing overlay, project and historical
checker contracts remain unchanged.

`SourceJunctions.validateRequest(input)` validates and detaches only the following
request shape:

```json
{
  "sourceOperationContractVersion": 1,
  "operation": "move-explicit-line-junction",
  "projectId": "synthetic-project",
  "stateToken": "synthetic-state",
  "baseRevision": "v0",
  "baseSourceHash": "synthetic-source",
  "members": [
    {"segmentId": "synthetic-wall-a", "endpoint": "b"},
    {"segmentId": "synthetic-wall-b", "endpoint": "a"}
  ],
  "target": [12.5, 24]
}
```

Members are ordered, 2–16 distinct segment identities, one endpoint (`a` or `b`) per line.
Target coordinates must be finite numbers within ±1e9 drawing units. Fractional values
are permitted by this request syntax; the separate integer-only ring metric profile is
unrelated. Identity strings contain no whitespace/control characters and are at most
300 characters, with revision bounded to 100. Unknown/version/namespace fields, accessor,
hidden, symbol, inherited and sparse data reject. Inputs are not serialized or mutated.

Passing syntax validation establishes no current source identity, actual native-line
ownership, coincident endpoints, visibility, locks, protected-label exclusion, permission
or physical accuracy. The site adapter resolves actual current native geometry and policy
and uses the reviewed atomic transaction described in [junction editing](JUNCTION_EDITING.md).
Do not route these requests through existing full-source replacement or overlay v1 paths.

`SourceJunctions.propose(request,trustedContext)` checks current project/state/revision/
source bindings, exact common origin, edit eligibility, no-op/collapse and detached
before/after geometry. The trusted context contains a policy snapshot and native-line
records resolved by the adapter, never supplied as authoritative evidence by an imported
request. Unselected coincident supported endpoints remain stationary diagnostics.
`revalidate(proposal,trustedContext)` regenerates and compares the complete proposal;
it does not apply caller-supplied geometry or authorization.

The site rechecks exact source/policy/project state, recomposes the reviewed native draft,
then commits once through source protection and persistence/history guards. No metrics,
physical units or association hashes are invented. The module alone is not an access
control; authenticated project authorization remains a deployment gate.

Fabricated request/proposal and production-workflow regressions are registered in
`npm test`. Native XML/input/private acceptance and complete HLS-107 remain separate.
