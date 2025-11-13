# File: types.ts

### Summary
Defines shared types for the recommendation algorithm, including weight configuration, event payload shape, scored event output, and algorithm execution context.

### Fixes Applied log
-problem: Missing shared type definitions for recommendation strategy.
-solution: Added interfaces for weights, events, scored events, and algorithm context.

### How Fixes Were Implemented
-problem: Introduced `AlgorithmWeights`, `EventData`, `ScoredEvent`, and `AlgorithmContext` to standardize data exchanged between strategies and route integrations.
-solution: Created `types.ts` exporting the interfaces for reuse across algorithm modules and route logic.

