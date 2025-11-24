# Recommendation Algorithms

This module implements the recommendation engine for Toki discovery. It uses the Strategy pattern so algorithms can be added or swapped without touching route logic.

## Structure

- `types.ts` — shared data interfaces (`AlgorithmWeights`, `EventData`, `AlgorithmContext`, `ScoredEvent`)
- `RecommendationStrategy.ts` — contract for scoring strategies
- `WeightedRecommendationAlgorithm.ts` — default personalized implementation
- `AlgorithmFactory.ts` — strategy lookup, caching, and registration
- `index.ts` — public exports

## Default Algorithm

`WeightedRecommendationAlgorithm` combines seven weighted factors sourced from the `algorithm_hyperparameters` table:

1. **w_hist** — similarity to categories the user previously joined or saved
2. **w_social** — friends/connections attending and host relationships
3. **w_pop** — attendance/popularity normalization
4. **w_time** — time decay (upcoming events prioritized)
5. **w_geo** — proximity to the user
6. **w_novel** — novelty boost for unseen categories
7. **w_pen** — duplicate category penalty to diversify results

The algorithm prefetches user context (history, saved categories, connection participation) once per request, scores each event, and applies a diversity penalty across the result set.

## Adding a New Algorithm

1. Create a class implementing `RecommendationStrategy`
2. Register it with `AlgorithmFactory.registerAlgorithm('your-key', new YourAlgorithm())`
3. Update route integration to request your algorithm key when needed

## Integration Notes

- `GET /api/tokis` fetches the latest hyperparameters, scores every event through the factory, and exposes `algorithmScore` in the response.
- Relevance sorting is the default; results are sorted in-memory by score while other sort options still use SQL ordering.



