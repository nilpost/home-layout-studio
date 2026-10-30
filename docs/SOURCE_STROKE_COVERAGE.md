# Declared-source stroke coverage adapter

This isolated foundation inventories an **already parsed SVG tree** and feeds a narrow
style/geometry subset to `StrokeFootprint.line`. It is not loaded by the editor and
changes no HTML, application state, source, IDs, checker capability or saved schema.
Actual browser XML parsing, CSS parsing/computation and rendering remain **unverified**.

## Read-only seam and result

```js
SourceStrokeCoverage.inspect(svgDocumentOrRoot, {
  sourceId: 'fabricated-source',
  sourceHash: 'fixture-digest',
  frameId: 'fixture-root-user-space',
  closedSource: true
});
```

The four context fields must be explicit own fields. Source/frame identity is supplied
by the caller, not recomputed or authenticated by this adapter. `closedSource:true` is
an assertion of a declared-source model, **not proof** that external or ambient CSS is
absent. Coordinates are the declared root SVG user space in drawing units, not screen
pixels or physically calibrated units. The adapter does not map transforms/viewports.

The input is an SVG namespace `Document`, or its SVG root, with `localName`,
`namespaceURI`, `nodeType`, read-only `attributes`, `childNodes`, `textContent` and an
XML `ownerDocument`/`documentElement`/`contentType` context. Prefixed SVG names use their
actual local name and namespace. Foreign namespace lookalikes are unknown, not silently
supported. The module does not parse XML, serialize/sanitize source, call `sourceWithIds`,
generate identifiers, fetch references or write any DOM property.

All actual element descendants are walked and **all original IDs are indexed first**,
including IDs on text, groups and definitions. Duplicate IDs anywhere are visible in
`identityFindings` and conservatively prevent stroke support. Every non-container
primitive or unknown element receives an owner record with its original ID/ref (or
null), tree index, namespace, status, reasons, segment identities and style evidence.
Known structural/metadata containers do not become primitive stroke owners. Their
children still participate in inventory and identity checks. Relevant unsupported
owners such as curves, text, `use`, images and foreign content remain explicit unknowns.

The result separates `inventoryComplete` from `strokeSupportComplete`, with supported,
unknown and documented-exclusion counts. A complete inventory is not complete stroke
support. Global context/style/identity findings prevent a complete-support claim even
when there are zero owners. A traversal/depth limit marks inventory incomplete and
keeps visited owners unknown; it never pretends unvisited content was reviewed.

## Supported geometry and identities

Only these complete owner strokes can be supported:

- Native `line`, with all four explicitly present unitless numeric geometry attributes.
  Its original element ID is its segment identity.
- A fully consumed path consisting of one explicit absolute `M` coordinate pair and
  exactly one explicit absolute `L`, `H` or `V` edge. Its endpoint/segment identity is
  proved against the existing `LayoutGeometry.linearPath` result (`owner:0`).

The underlying line footprint module still enforces horizontal/vertical nondegenerate
geometry and its conservative numeric profile. Missing attributes, units, unmatched
text, relative/implicit commands, curves or multiple edges remain unknown. Full numeric
consumption uses ASCII SVG whitespace; Unicode whitespace is not normalized into a
valid number. No coordinates or physical defaults are supplied.

Multi-edge paths can retain IDs emitted by the actual legacy extractor as **diagnostic
references only**. The entire owner stroke stays unknown: joins and endpoint caps cannot
be modeled by treating each edge as an independent capped line. The adapter does not
claim that this older extractor validates the full grammar of an unsupported path.
Any extracted segment ID shadowed by an original ID, or shared by another claim, makes
all implicated candidate owners unknown. References are never remapped to resolve it.

## Bounded declared-source style model

Presentation attributes, inline declarations and normal stylesheet rules are resolved
for this deliberately closed subset. Each supported stylesheet rule has exactly one
simple tag, `.class` or `#id` selector. Normal cascade uses presentation attributes first,
author specificity/order next, then inline declarations. A child's own declaration
wins before inherited parent style regardless of the parent's selector specificity.
Property evidence records attribute/inline/rule origin, tree indices, selector/order
where relevant and whether the property was inherited. The presentation-attribute
ordering follows [W3C SVG2 styling](https://www.w3.org/TR/SVG2/styling.html#PresentationAttributes).

Required inherited properties are `stroke`, `stroke-width`, `stroke-linecap` and
`stroke-opacity`. Stroke paint is restricted to opaque three/six-digit hex, black or
white; explicit `stroke:none` can be a documented non-stroked exclusion. Width must be
unitless and positive, cap explicit butt/square/round, and stroke opacity explicitly 1.
The candidate must have its **own winning `vector-effect:none`** declaration; it is
not inherited. That property is non-inherited in
[W3C SVG2 vector effects](https://www.w3.org/TR/SVG2/coords.html#VectorEffectProperty).
Every paint ancestor, including root/group/owner, additionally needs its own resolved
`opacity:1`. These opacity/vector conditions are intentionally narrower than SVG's
initial/default behavior; the adapter does not invent missing core style values.

The module ignores a documented group of footprint-irrelevant declarations for its
single-line subset: fill/fill-opacity, color, font family/size/weight, text-anchor and
stroke-linejoin/miterlimit. A single open straight edge has no fill area or join;
its unitless coordinates/explicit solid stroke do not depend on font/color defaults.
These ignored declarations do not extend support to glyphs or multi-edge paths.

The lexer must consume complete stylesheet/inline input. It supports an ASCII CSS
subset only. Complete comments become whitespace, never token concatenation. Quoted
strings, functions, bracketed values/selectors, escapes, at-rules, importance, compound
or conditional selectors, malformed rules/declarations, geometry CSS and unknown
properties are unsupported. Unhandled stylesheet rules conservatively make the whole
source's candidate support unknown rather than guessing which owner they affect.
The only parsed-but-unsupported property exception is `stroke-dasharray` or
`stroke-dashoffset` in a completely consumed simple-selector rule. These declarations
are **local hazards**, not supported dash values. For each directly painted candidate examined for support, matching declarations on
the owner or its SVG ancestors retain hazard evidence in `styleHazards`: original declaration property/value, source
kind, matched node index, stylesheet node/selector/order when applicable, and an
`ancestorContext` flag relative to the candidate. Inline and presentation dash hazards
also retain their source evidence. Definition-content exclusions precede style
resolution and may carry no hazard evidence. Any such hazard keeps the candidate unknown while
unrelated siblings can remain supported; an unmatched simple rule is not global harm.

All matching dash declarations are retained conservatively, including ones a normal
cascade could override. `none`, zero, invalid-looking values and later inline/ID overrides
never erase an unsupported hazard. Ancestor propagation deliberately overapproximates
the effects; it does not claim to resolve dash inheritance or CSS-wide keywords. Both
properties are inherited in [W3C SVG2 stroke dashing](https://www.w3.org/TR/SVG2/painting.html#StrokeDashing).
No dash
value/default is implemented. In a stylesheet, an unparsed rule, unsupported selector, other unsupported
property, importance or function/quoted syntax still prevents support globally,
including when it occurs beside a local dash declaration. External/ambient context
also remains global. Unsupported inline input remains local to the affected
owner/ancestor context, as described below.

Unsupported inline syntax makes the affected owner/descendant context unknown. Class
matching uses ASCII whitespace, so NBSP does not become a class separator. XML attribute
names retain exact case; CSS property names are case-insensitive.

This narrow model means ordinary existing sources can produce **all unknown** results.
That is incomplete adapter coverage, not a reason to rewrite a plan, add defaults or
change source styles merely to obtain a pass. A future reviewed adapter may resolve
more standard CSS/default cases with explicit provenance.

## Unsupported context and exclusions

Transforms, nested SVG placement, ancestor coordinate contexts, clipping, masks,
filters, dashes, markers, unhandled paint/display/visibility and resource attributes
remain visible unknowns, even when an unsupported attribute says `none`. External
stylesheet links, stylesheet processing instructions, doctypes, scripts, animation,
event handlers, adopted stylesheets, exposed external/unowned stylesheet metadata,
disabled/conditional stylesheet state and HTML/ambient document contexts also prevent
support. `closedSource:true` does not override detected hazards. Nothing is fetched.

Valid identified definition content can be excluded as not directly painted; `use`
instances remain unknown. A validated explicit non-stroked owner can be excluded as
`stroke:none`. Identity/context failures still remain unknown rather than disappearing
behind an exclusion. No source item is deleted or declared physically verified.

## Verification and remaining gates

Run `node tests/source-stroke-coverage.mjs`. Tests use **fabricated DOM-shaped trees**;
they verify this read-only seam, not browser parsing/conformance. Cases cover normal
cascade/inheritance, explicit vector/opacity boundaries, all-ID shadows/duplicates,
whole-owner accounting, unsupported curves/use/multi-edge caps, full numeric/CSS
consumption, lexical injection and Unicode-whitespace guards, document hazards,
namespace handling, limits and input immutability. Dash-attribution regressions verify
matched and ancestor provenance, unaffected sibling support, conservative handling of
cascade overrides, unparsed/global fallback and immutable source/output isolation.

Source hashes/frame assertions, actual XML/CSS parser behavior, style integration,
whole paths/joins/curves, live rendering and browser preview/Cancel/Apply/Undo remain
separate acceptance gates. The adapter introduces no saved checker version/coverage
claim, runtime feature, authentication or deployment. Drawing stroke support is not
physical door clearance, construction accuracy, structural safety or code compliance.
