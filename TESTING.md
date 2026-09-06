# Zomato Platform Integration - Testing Guide

## Prerequisites
- Supabase project set up with the migration applied
- Test data in the database
- Environment variables configured

## Test Users (Create These in Supabase)

### Test User 1 - UUID Login
```sql
INSERT INTO users (user_id, gig_id, legal_name, gig_score, tier, total_reviews, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'GIG123456', 'Test Worker One', 4.60, 'Gold Verified', 8, NOW(), NOW());
```

### Test User 2 - Gig ID Login
```sql
INSERT INTO users (user_id, gig_id, legal_name, gig_score, tier, total_reviews, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'GIG789012', 'Test Worker Two', 3.95, 'Bronze Starter', 5, NOW(), NOW());
```

### Seed Initial Reviews
```sql
-- Existing GigFolio reviews for User 1
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 5, 'Excellent service!', 'GigFolio', 'Alice', NOW() - INTERVAL '10 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 4, 'Good delivery', 'GigFolio', 'Bob', NOW() - INTERVAL '5 days');

-- Initial Zomato reviews for User 1
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 5, 'Amazing Zomato experience!', 'Zomato', 'Charlie', NOW() - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 4, 'Good on Zomato', 'Zomato', 'Diana', NOW() - INTERVAL '1 day');
```

## Test Scenarios

### Test 1: Login with Gig ID
**Step 1:** Open the application  
**Step 2:** Select "Gig ID" login type  
**Step 3:** Enter `GIG123456`  
**Step 4:** Click "Login"

**Expected Results:**
- ✅ Login succeeds
- ✅ Profile page loads
- ✅ Gig ID and UUID displayed (legal_name: "Test Worker One")
- ✅ No error message

---

### Test 2: Login with UUID
**Step 1:** On login page, select "UUID" login type  
**Step 2:** Enter `550e8400-e29b-41d4-a716-446655440001`  
**Step 3:** Click "Login"

**Expected Results:**
- ✅ Login succeeds
- ✅ Same profile loads as Test 1
- ✅ No error message

---

### Test 3: Invalid Gig ID Login
**Step 1:** Select "Gig ID" login type  
**Step 2:** Enter `INVALID123`  
**Step 3:** Click "Login"

**Expected Results:**
- ✅ Error message: "Invalid Gig ID. User not found."
- ✅ User stays on login page
- ✅ Can retry with valid ID

---

### Test 4: Invalid UUID Login
**Step 1:** Select "UUID" login type  
**Step 2:** Enter `00000000-0000-0000-0000-000000000000`  
**Step 3:** Click "Login"

**Expected Results:**
- ✅ Error message: "Invalid UUID. User not found."
- ✅ User stays on login page

---

### Test 5: Profile Page - Ratings Display
**Setup:** Logged in as Test User 1  

**Verify:**
- ✅ **Zomato Rating Card (Left):**
  - Score: 4.50 (average of 5, 4)
  - Tier: Gold Verified
  - Review count: 2
  - Red color (#e23744)
  - Stars filled appropriately
  
- ✅ **GigFolio Score Card (Left, below Zomato):**
  - Score: 4.50 (average of all 4 reviews: 5, 4, 5, 4)
  - Tier: Gold Verified
  - Review count: 4
  - Green color (#22c55e)
  - Stars filled appropriately

**Key Assertion:** Zomato score (2 reviews) ≠ GigFolio score (4 reviews)

---

### Test 6: Review Submission - 5 Star Zomato Review
**Setup:** Logged in, on profile page  

**Step 1:** In review form, click the 5th star  
**Step 2:** Enter review text: "Outstanding Zomato delivery!"  
**Step 3:** Enter name: "Test Reviewer"  
**Step 4:** Click "Submit Review"

**Expected Results During Submit:**
- ✅ Submit button disabled
- ✅ Loading spinner visible
- ✅ No duplicate submissions possible

**Expected Results After Success:**
- ✅ Success toast appears: "Review submitted successfully!"
- ✅ Form clears (rating, text, name reset)
- ✅ Zomato rating card updates:
  - Score: 4.67 (average of 5, 4, 5)
  - Review count: 3
- ✅ GigFolio score updates:
  - Score: 4.60 (average of 5, 4, 5, 4, 5)
  - Review count: 5
- ✅ New review appears in "Recent Zomato Reviews"

---

### Test 7: Review Submission - 1 Star Review
**Step 1:** Click 1st star  
**Step 2:** Enter review: "Poor service this time"  
**Step 3:** Leave name blank (anonymous)  
**Step 4:** Submit

**Expected Results:**
- ✅ Reviewer name shows as "Anonymous"
- ✅ Zomato score decreases appropriately
- ✅ GigFolio score reflects the new 1-star rating
- ✅ Review appears with 1-star rating in recent reviews

---

### Test 8: Review Submission - 3 Star Review
**Step 1:** Click 3rd star  
**Step 2:** Enter review: "Average experience"  
**Step 3:** Submit

**Expected Results:**
- ✅ 3-star review appears in recent reviews
- ✅ Ratings update correctly
- ✅ No errors

---

### Test 9: Platform Breakdown Display
**Setup:** After submitting multiple reviews  

**Verify:**
- ✅ Platform breakdown shows grid of cards
- ✅ Zomato card highlighted in light red (#fff5f6)
- ✅ Each platform shows:
  - Platform name
  - Score (2 decimal places)
  - Star rating
  - Review count
- ✅ Multiple platforms displayed (if reviews from other platforms exist)
- ✅ Scores match individual platform calculations

---

### Test 10: Recent Reviews Display
**Setup:** On profile page with existing Zomato reviews  

**Verify:**
- ✅ Recent Zomato Reviews section shows
- ✅ Maximum 5 reviews displayed
- ✅ Each review shows:
  - Star rating (1-5 stars)
  - Reviewer name (or "Anonymous")
  - Review text
  - Newest first (by created_at DESC)
- ✅ Empty state message if no reviews

---

### Test 11: Empty State - No Zomato Reviews
**Setup:** Test User 2 (no Zomato reviews yet)  

**Verify:**
- ✅ "No reviews for Zomato yet..." message displays
- ✅ Message positioned in card with padding
- ✅ Form still available to submit review

---

### Test 12: Logout and Re-login
**Step 1:** Click logout button in top-right  
**Step 2:** Verify redirected to login page  
**Step 3:** Login again with same/different credentials

**Expected Results:**
- ✅ Successfully logs out
- ✅ Returns to login page with form cleared
- ✅ Re-login works
- ✅ Same profile loads

---

### Test 13: Form Validation - Missing Rating
**Step 1:** Skip rating selection  
**Step 2:** Enter review text  
**Step 3:** Click Submit

**Expected Results:**
- ✅ Error message: "Please select a rating"
- ✅ Review not submitted
- ✅ Error appears above submit button

---

### Test 14: Form Validation - Missing Review Text
**Step 1:** Select a rating  
**Step 2:** Leave review text blank  
**Step 3:** Click Submit

**Expected Results:**
- ✅ Error message: "Please write a review"
- ✅ Review not submitted

---

### Test 15: Cross-Platform Review Test
**Prerequisites:** User with reviews from multiple platforms

**Step 1:** From Test User 1, verify platform breakdown shows GigFolio and Zomato  
**Step 2:** Submit a new review as "Zomato"  
**Step 3:** Verify:
- ✅ Zomato score updates
- ✅ Zomato review count increments
- ✅ GigFolio score updates
- ✅ GigFolio review count increments
- ✅ Other platforms (if any) unchanged

---

### Test 16: Score Calculation Edge Cases

#### Edge Case A: Single 5-star review
```sql
DELETE FROM reviews WHERE user_id = '550e8400-e29b-41d4-a716-446655440002';
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 5, 'Perfect!', 'Zomato', 'Alice', NOW());
```
**Verify:** Score = 5.00, Tier = "Diamond Top Performer"

#### Edge Case B: Mix of 1 and 5 stars
```sql
DELETE FROM reviews WHERE user_id = '550e8400-e29b-41d4-a716-446655440002';
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 5, 'Great!', 'Zomato', 'Alice', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 1, 'Bad', 'Zomato', 'Bob', NOW());
```
**Verify:** Score = 3.00, Tier = "Bronze Starter"

#### Edge Case C: Boundary score 4.80
```sql
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 5, '', 'Zomato', 'A', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 5, '', 'Zomato', 'B', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 5, '', 'Zomato', 'C', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 5, '', 'Zomato', 'D', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 4, '', 'Zomato', 'E', NOW());
```
**Verify:** Score = 4.80, Tier = "Diamond Top Performer"

---

### Test 17: Data Persistence
**Step 1:** Submit a review  
**Step 2:** Refresh page (F5)  
**Step 3:** Verify review still shows in recent reviews  
**Step 4:** Logout and login again  
**Step 5:** Verify review persists

**Expected Results:**
- ✅ Review appears after refresh
- ✅ Review appears after logout/login
- ✅ Ratings reflect new review
- ✅ No data loss

---

### Test 18: Loading States
**Step 1:** Click login button and observe  
**Step 2:** On profile page, click submit review and observe  

**Expected Results:**
- ✅ Login button shows spinner and "Logging in..."
- ✅ Submit button shows spinner and "Submitting..."
- ✅ Both buttons disabled while loading
- ✅ Spinners rotate smoothly

---

### Test 19: Responsive Design
**Step 1:** Open on desktop (1920px)  
**Step 2:** Resize to tablet (768px)  
**Step 3:** Resize to mobile (375px)

**Expected Results:**
- ✅ Login card centered and readable
- ✅ Profile grid responsive (2 columns → 1 column)
- ✅ Review form readable on mobile
- ✅ Platform breakdown grid adjusts
- ✅ No text overflow
- ✅ Touch-friendly buttons on mobile

---

## Integration Tests

### Integration Test 1: Full User Journey
1. Login with UUID
2. View profile and ratings
3. Submit 5-star review with name
4. Verify review appears
5. Verify ratings updated
6. Logout
7. Login with Gig ID
8. Verify same profile and review

**Expected:** All steps succeed, no data loss

### Integration Test 2: Concurrent Reviews
1. Open app in two browser tabs
2. In Tab A: Submit 5-star review
3. In Tab B: Refresh page
4. Verify new review visible in Tab B

**Expected:** Cross-tab data consistency

---

## Database Verification

### Verify Migration Applied
```sql
-- Check platform_name column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'reviews' AND column_name = 'platform_name';
```
**Expected:** Returns 1 row with platform_name

### Verify RPC Functions Exist
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_worker_platform_rating',
    'get_platform_recent_reviews',
    'get_worker_platform_breakdown',
    'add_user_rating'
  );
```
**Expected:** Returns 4 rows

### Verify Sample Data
```sql
SELECT COUNT(*) FROM reviews WHERE platform_name = 'Zomato';
SELECT DISTINCT platform_name FROM reviews ORDER BY platform_name;
```
**Expected:** Reviews exist, platform names are distinct

---

## Performance Testing

### Test: Large Review Load
```sql
-- Add 100 reviews to a user
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
SELECT 
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (random() * 4 + 1)::int,
  'Review ' || generate_series(1, 100),
  CASE WHEN random() > 0.5 THEN 'Zomato' ELSE 'GigFolio' END,
  'User ' || generate_series(1, 100),
  NOW() - (generate_series(1, 100) || ' days')::interval;
```

**Test:** Profile page should load in < 2 seconds

---

## Rollback Plan (If Issues Found)

1. Remove platform_name references from frontend
2. Revert database migration (platform_name becomes nullable)
3. Update RPCs to ignore platform_name filtering
4. Revert to single GigFolio rating system

---

## Sign-Off Checklist

- [ ] All 19 test scenarios pass
- [ ] Build completes without errors
- [ ] No console warnings or errors
- [ ] Database migration applied successfully
- [ ] RPC functions verified in database
- [ ] Environment variables configured
- [ ] Responsive design verified
- [ ] Toast notifications working
- [ ] Error handling working
- [ ] Data persistence verified
- [ ] Cross-platform reviews don't interfere
- [ ] Platform-specific ratings display separately
- [ ] GigFolio and Zomato scores never conflate
