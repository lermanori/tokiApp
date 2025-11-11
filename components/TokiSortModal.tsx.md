# File: components/TokiSortModal.tsx

### Summary
Reusable modal for choosing how events are ordered on Explore and Discover/Map. Exposes a simple controlled API via `value`, `onChange`, and `onApply`.

### Fixes Applied log
- problem: Users could filter events but had no control over ordering, making discovery less intuitive.
- solution: Added a shared sort modal with common presets (Relevance, Date, Distance, Popularity, Created, Title) and a consistent footer Apply button.

### How Fixes Were Implemented
- Implemented `TokiSortModal` as a controlled component with `SortKey` and `SortState` types to ensure clarity.
- Simple visual states: selected row highlights and a bullet indicator.
- Modal mirrors the filters modal style (header, list, footer).


