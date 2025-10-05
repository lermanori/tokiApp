# File: components/DiscoverMap.web.tsx

### Summary
Web map component using Leaflet. Now fetches marker colors from the centralized `CATEGORY_COLORS`.

### Fixes Applied log
- problem: Category color mapping was hard-coded and inconsistent with other parts of the app.
- solution: Replaced local switch with `CATEGORY_COLORS` lookup.
- problem: Cluster popup showed raw HTML because content was injected as a string and DOM listeners were attached imperatively.
- solution: Rendered popup content as React elements and removed imperative listeners; links use `onClick` to call navigation.

### How Fixes Were Implemented
- Imported `CATEGORY_COLORS` from `utils/categories`.
- Simplified `getCategoryColorForMap` to `CATEGORY_COLORS[category] || '#666666'`.
- Replaced HTML string generation with `{group.items.map(...)}` JSX inside `Popup` and simplified marker `eventHandlers`.
