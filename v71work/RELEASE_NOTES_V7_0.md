# VERTX CORE v7.0 NOVA OS

## UI / iPhone usability
- Fixed overlapping order summary, bottom navigation, material cards and section headings.
- Added VisualViewport-aware browser bottom guard for iPhone/in-app browsers.
- Removed sticky material-group headers that were covering cards while scrolling.
- Fixed horizontal overflow / blue background strip on the right side.
- Rebuilt material card hierarchy: favorite at the upper-right, material settings separated, larger quantity stepper.
- Unified Home, Order, Plan and material editor onto the NOVA white/blue palette.
- Added larger bottom safe area so the last material stays tappable above fixed controls.

## System stability
- Current screen is stored on body and existing last-screen/site/order-draft persistence remains enabled.
- Browser viewport changes update the safe bottom offset automatically.

## CORE AI 7
- Adaptive image compression based on number of drawings to reduce upload time.
- 90-second analysis timeout with a readable retry message.
- Company material vocabulary (display names, aliases and categories) is sent to drawing AI.
- Learning examples increased from 8 to 12 for each analysis.
- Corrected final orders are also saved locally as a company-scoped fallback, while cloud learning remains the primary store.
- AI cache remains company-scoped and invalidates when learning data changes.
- Model remains configurable with OPENAI_MODEL; v7 improves speed mainly through adaptive preprocessing and caching without silently changing the configured model.

AI output remains a proposal. A human must verify quantities before an order is finalized.
