-- Create algorithm hyperparameters table
-- Stores the weights for the recommendation algorithm

CREATE TABLE IF NOT EXISTS algorithm_hyperparameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  w_hist NUMERIC(5,4) DEFAULT 0.20,
  w_social NUMERIC(5,4) DEFAULT 0.15,
  w_pop NUMERIC(5,4) DEFAULT 0.20,
  w_time NUMERIC(5,4) DEFAULT 0.15,
  w_geo NUMERIC(5,4) DEFAULT 0.20,
  w_novel NUMERIC(5,4) DEFAULT 0.10,
  w_pen NUMERIC(5,4) DEFAULT 0.05,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id)
);

-- Insert default values (single row configuration)
INSERT INTO algorithm_hyperparameters (id) 
VALUES (gen_random_uuid()) 
ON CONFLICT DO NOTHING;

-- Add comment explaining each weight
COMMENT ON COLUMN algorithm_hyperparameters.w_hist IS 'SimilarityToPastLiked: How much user liked similar events in the past';
COMMENT ON COLUMN algorithm_hyperparameters.w_social IS 'SocialBoost: Boost if friends/connections are going';
COMMENT ON COLUMN algorithm_hyperparameters.w_pop IS 'Popularity: How popular/trending the event is';
COMMENT ON COLUMN algorithm_hyperparameters.w_time IS 'TimeDecay: Recency boost - sooner events score higher';
COMMENT ON COLUMN algorithm_hyperparameters.w_geo IS 'Proximity: Closer events score higher';
COMMENT ON COLUMN algorithm_hyperparameters.w_novel IS 'NoveltyBoost: Boost for new/diverse event types';
COMMENT ON COLUMN algorithm_hyperparameters.w_pen IS 'DuplicateCategoryPenalty: Penalty for too many same-category events';


