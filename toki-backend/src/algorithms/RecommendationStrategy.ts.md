# File: RecommendationStrategy.ts

### Summary
Declares the strategy interface contract for recommendation algorithms, exposing scoring and identification methods.

### Fixes Applied log
-problem: No abstraction for interchangeable recommendation algorithms.
-solution: Added `RecommendationStrategy` interface with `scoreEvents` and `getName` signatures.

### How Fixes Were Implemented
-problem: Provide consistent API for future algorithm implementations.
-solution: Exported an interface referencing shared types to be implemented by concrete strategies.



