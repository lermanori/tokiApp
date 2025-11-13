# File: AlgorithmFactory.ts

### Summary
Provides a factory and cache for recommendation algorithm strategies, defaulting to the weighted implementation.

### Fixes Applied log
-problem: No centralized way to obtain or swap recommendation algorithms.
-solution: Added `AlgorithmFactory` with lazy initialization, registration, and cache clearing.

### How Fixes Were Implemented
-problem: Needed to reuse algorithm instances and support future strategies.
-solution: Implemented `getAlgorithm`, `registerAlgorithm`, and `clearCache`, wiring the default to `WeightedRecommendationAlgorithm`.

