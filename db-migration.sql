-- Zomato Platform Integration - Database Migration
-- This migration adds platform_name column to reviews table and creates necessary RPCs

-- 1. Add platform_name column to reviews table (if it doesn't exist)
-- This is a non-destructive migration that preserves existing rows
ALTER TABLE IF EXISTS reviews
ADD COLUMN platform_name TEXT DEFAULT 'GigFolio';

-- 2. Create index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_reviews_platform_user 
ON reviews(user_id, platform_name);

-- 3. Get worker platform rating RPC
CREATE OR REPLACE FUNCTION get_worker_platform_rating(
  p_user_id UUID,
  p_platform_name TEXT
)
RETURNS TABLE(
  user_id UUID,
  platform_name TEXT,
  platform_score NUMERIC,
  tier TEXT,
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    p_platform_name::TEXT as platform_name,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0::NUMERIC) as platform_score,
    CASE 
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.80 THEN 'Diamond Top Performer'
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.50 THEN 'Gold Verified'
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.00 THEN 'Silver Active'
      ELSE 'Bronze Starter'
    END as tier,
    COUNT(*)::BIGINT as total_reviews
  FROM reviews r
  WHERE r.user_id = p_user_id
    AND LOWER(COALESCE(r.platform_name, 'GigFolio')) = LOWER(p_platform_name)
  GROUP BY r.user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Get platform recent reviews RPC
CREATE OR REPLACE FUNCTION get_platform_recent_reviews(
  p_user_id UUID,
  p_platform_name TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  review_id UUID,
  user_id UUID,
  rating INT,
  review_text TEXT,
  reviewer_name TEXT,
  platform_name TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as review_id,
    r.user_id,
    r.rating,
    r.review_text,
    r.reviewer_name,
    COALESCE(r.platform_name, 'GigFolio') as platform_name,
    r.created_at
  FROM reviews r
  WHERE r.user_id = p_user_id
    AND LOWER(COALESCE(r.platform_name, 'GigFolio')) = LOWER(p_platform_name)
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. Get worker platform breakdown RPC
CREATE OR REPLACE FUNCTION get_worker_platform_breakdown(p_user_id UUID)
RETURNS TABLE(
  platform_name TEXT,
  platform_score NUMERIC,
  tier TEXT,
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(r.platform_name, 'GigFolio')::TEXT as platform_name,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0::NUMERIC) as platform_score,
    CASE 
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.80 THEN 'Diamond Top Performer'
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.50 THEN 'Gold Verified'
      WHEN COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) >= 4.00 THEN 'Silver Active'
      ELSE 'Bronze Starter'
    END as tier,
    COUNT(*)::BIGINT as total_reviews
  FROM reviews r
  WHERE r.user_id = p_user_id
  GROUP BY COALESCE(r.platform_name, 'GigFolio')
  ORDER BY total_reviews DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Update add_user_rating RPC to handle platform_name
CREATE OR REPLACE FUNCTION add_user_rating(
  p_user_id UUID,
  p_rating INT,
  p_review_text TEXT,
  p_platform_name TEXT,
  p_reviewer_name TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  new_gig_score NUMERIC,
  tier TEXT,
  total_reviews BIGINT
) AS $$
DECLARE
  v_rating_clamped INT;
  v_gig_score NUMERIC;
  v_tier TEXT;
  v_total_reviews BIGINT;
BEGIN
  -- Validate inputs
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  IF TRIM(COALESCE(p_platform_name, '')) = '' THEN
    RAISE EXCEPTION 'Platform name cannot be empty';
  END IF;

  v_rating_clamped := LEAST(5, GREATEST(1, p_rating));

  -- Insert review with platform name
  INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
  VALUES (p_user_id, v_rating_clamped, p_review_text, p_platform_name, COALESCE(p_reviewer_name, 'Anonymous'), NOW());

  -- Calculate GigFolio score (all platforms combined)
  SELECT 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0::NUMERIC),
    COUNT(*)::BIGINT
  INTO v_gig_score, v_total_reviews
  FROM reviews
  WHERE user_id = p_user_id;

  -- Determine tier based on GigFolio score
  v_tier := CASE 
    WHEN v_gig_score >= 4.80 THEN 'Diamond Top Performer'
    WHEN v_gig_score >= 4.50 THEN 'Gold Verified'
    WHEN v_gig_score >= 4.00 THEN 'Silver Active'
    ELSE 'Bronze Starter'
  END;

  -- Update user with new GigFolio score
  UPDATE users
  SET gig_score = v_gig_score,
      tier = v_tier,
      total_reviews = v_total_reviews,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    true::BOOLEAN as success,
    p_user_id as user_id,
    v_gig_score as new_gig_score,
    v_tier as tier,
    v_total_reviews as total_reviews;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant appropriate RLS permissions (assuming anon role for frontend)
GRANT EXECUTE ON FUNCTION get_worker_platform_rating TO anon;
GRANT EXECUTE ON FUNCTION get_platform_recent_reviews TO anon;
GRANT EXECUTE ON FUNCTION get_worker_platform_breakdown TO anon;
GRANT EXECUTE ON FUNCTION add_user_rating TO anon;

-- 8. Verify users table has required columns
-- The following columns should exist on the users table:
-- - user_id (UUID, primary key)
-- - gig_id (TEXT, unique)
-- - legal_name (TEXT)
-- - gig_score (NUMERIC)
-- - tier (TEXT)
-- - total_reviews (BIGINT)
-- - updated_at (TIMESTAMP)

-- Sample seed data (for testing):
-- INSERT INTO users (user_id, gig_id, legal_name, gig_score, tier, total_reviews, created_at, updated_at)
-- VALUES 
--   ('550e8400-e29b-41d4-a716-446655440000', 'GIG123456', 'Test Worker', 4.85, 'Diamond Top Performer', 12, NOW(), NOW());
