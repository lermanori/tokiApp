# File: index.ts

### Summary
Aggregates and re-exports the recommendation algorithm module APIs for convenient imports elsewhere in the codebase.

### Fixes Applied log
-problem: Consumers lacked a single entry point for algorithm exports.
-solution: Re-exported shared types, strategy interface, weighted implementation, and factory.

### How Fixes Were Implemented
-problem: Simplify imports for downstream modules.
-solution: Created `index.ts` that consolidates exports from the algorithms directory components.

