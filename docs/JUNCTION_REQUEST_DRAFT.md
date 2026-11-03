# Preparatory source-junction request syntax

This standalone draft module is not loaded by the editor. It does not provide a junction
editing control, imported-operation router, geometry proposal, source adapter or Apply.
No new source-operation capability is advertised to agents. Existing operation and
project/checker contracts remain unchanged.

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
or physical accuracy. Those checks require a future trusted current-source/policy adapter
and reviewed atomic transaction. Do not route these requests through existing full-source
replacement or overlay v1 paths. The draft namespace can be refined before integration.

The preparatory regression suite uses fabricated records and is registered in `npm test`.
No complete HLS-107 acceptance or user-facing junction capability is claimed.
