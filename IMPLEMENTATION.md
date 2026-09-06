# Zomato Platform Integration - Implementation Guide

## Overview
This integration adds Zomato as a separate platform to GigFolio, maintaining independent platform ratings while preserving existing GigFolio functionality.

## Architecture

### Frontend
- **Login**: Gig ID or UUID-based authentication
- **Profile**: Displays both Zomato-specific and GigFolio ratings side-by-side
- **Reviews**: Platform-aware review submission with toast notifications
- **Platform Breakdown**: Shows ratings across all platforms

### Backend (Supabase)
- **Platform-specific ratings**: Calculated only from Zomato reviews
- **GigFolio score**: Combined rating across all platforms
- **Separate data storage**: Platform name stored with each review

## Database Schema

### reviews table (modified)
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- rating (INT, 1-5)
- review_text (TEXT)
- reviewer_name (TEXT)
- platform_name (TEXT) -- NEW: stores "Zomato", "GigFolio", etc.
- created_at (TIMESTAMP)
```

### users table (existing)
```sql
- user_id (UUID, primary key)
- gig_id (TEXT)
- legal_name (TEXT)
- gig_score (NUMERIC) -- GigFolio combined score
- tier (TEXT) -- GigFolio tier
- total_reviews (BIGINT) -- GigFolio total review count
```

## RPC Functions

### 1. `get_worker_platform_rating(p_user_id, p_platform_name)`
Returns platform-specific rating data.

**Parameters:**
- `p_user_id`: Worker UUID
- `p_platform_name`: "Zomato" (exact case-sensitive match, case-insensitive matching in SQL)

**Returns:**
```json
{
  "user_id": "uuid",
  "platform_name": "Zomato",
  "platform_score": 4.85,
  "tier": "Diamond Top Performer",
  "total_reviews": 5
}
```

**Tier Logic:**
- Score >= 4.80: Diamond Top Performer
- Score >= 4.50: Gold Verified
- Score >= 4.00: Silver Active
- Score < 4.00: Bronze Starter

### 2. `get_platform_recent_reviews(p_user_id, p_platform_name, p_limit)`
Returns recent reviews for a specific platform.

**Parameters:**
- `p_user_id`: Worker UUID
- `p_platform_name`: "Zomato"
- `p_limit`: Number of reviews (default 5)

**Returns:**
```json
[
  {
    "review_id": "uuid",
    "user_id": "uuid",
    "rating": 5,
    "review_text": "Great delivery!",
    "reviewer_name": "John D.",
    "platform_name": "Zomato",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### 3. `get_worker_platform_breakdown(p_user_id)`
Returns rating summary for all platforms.

**Parameters:**
- `p_user_id`: Worker UUID

**Returns:**
```json
[
  {
    "platform_name": "Zomato",
    "platform_score": 4.85,
    "tier": "Diamond Top Performer",
    "total_reviews": 5
  },
  {
    "platform_name": "GigFolio",
    "platform_score": 4.72,
    "tier": "Gold Verified",
    "total_reviews": 12
  }
]
```

### 4. `add_user_rating(p_user_id, p_rating, p_review_text, p_platform_name, p_reviewer_name)`
Submits a review and updates ratings.

**Parameters:**
- `p_user_id`: Worker UUID
- `p_rating`: 1-5 star rating
- `p_review_text`: Review text (or null)
- `p_platform_name`: "Zomato"
- `p_reviewer_name`: Reviewer name (or "Anonymous")

**Returns:**
```json
{
  "success": true,
  "user_id": "uuid",
  "new_gig_score": 4.75,
  "tier": "Gold Verified",
  "total_reviews": 13
}
```

**Side Effects:**
- Inserts review record with platform_name
- Updates `users.gig_score` (ALL platforms combined)
- Updates `users.tier` (based on GigFolio score)
- Updates `users.total_reviews` (ALL platforms combined)

## Frontend Implementation

### Environment Setup
```bash
npm install @supabase/supabase-js
```

### Create `.env.local`
```
VITE_SUPABASE_URL=https://kblhngnyyaxphzecftet.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SZK2GACanKrb4iI9j0KfVQ_Bq51EW8p
```

### File Structure
```
src/
├── main.jsx          (React app with login and profile)
├── styles.css        (Existing styling)
└── lib/
    └── supabase.js   (Supabase client)
```

## UI Features

### Login Page
- Toggle between Gig ID and UUID login
- Real-time validation
- Error handling with messaging

### Profile Page
**Left Column:**
- Zomato Rating (red, #e23744)
- Zomato Tier
- Zomato Review Count
- GigFolio Score (green, #22c55e)
- GigFolio Tier
- GigFolio Review Count

**Right Column:**
- Review submission form (rating selector, text area, name input)
- Error states and validation
- Loading state on submit
- Submit button disabled while processing

**Below:**
- Recent Zomato reviews (5 max)
- Empty state if no reviews
- Platform breakdown grid (all platforms)

### Toast Notifications
- Success: Green background, 4s auto-dismiss
- Error: Red background, 4s auto-dismiss

## Data Flow

### On Login
1. Query `users` table by gig_id or user_id
2. Load: user_id, gig_id, legal_name, gig_score, tier, total_reviews
3. Display profile page

### On Profile Load
1. Call `get_worker_platform_rating("Zomato")` → Zomato rating card
2. Call `get_platform_recent_reviews("Zomato", limit=5)` → Recent reviews
3. Call `get_worker_platform_breakdown()` → Platform breakdown

### On Review Submit
1. Call `add_user_rating(..., platform_name="Zomato")`
2. On success: Update GigFolio score in state
3. Call `get_worker_platform_rating("Zomato")` → Refresh Zomato rating
4. Show success toast
5. Refresh recent reviews and platform breakdown

## Testing Checklist

### Login
- [ ] Login with valid Gig ID
- [ ] Login with valid UUID
- [ ] Error on invalid Gig ID
- [ ] Error on invalid UUID
- [ ] Switch between login types

### Profile Display
- [ ] Zomato rating loads correctly
- [ ] GigFolio score displays separately
- [ ] Tiers calculated correctly
- [ ] Review counts are platform-specific
- [ ] Platform breakdown shows all platforms

### Review Submission
- [ ] Submit 1-star review
- [ ] Submit 3-star review
- [ ] Submit 5-star review
- [ ] Ratings update independently
- [ ] GigFolio score updates
- [ ] Zomato score updates
- [ ] Platform count increments
- [ ] No validation errors on valid input

### Data Integrity
- [ ] Platform name stored exactly as "Zomato"
- [ ] Zomato reviews don't affect other platform ratings
- [ ] GigFolio score combines all platforms
- [ ] Reviews persist after page refresh
- [ ] Anonymous reviews work

## Deployment

### Build
```bash
npm install
npm run build
```

### Environment
Ensure these variables are set in production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Database
Run the migration from `db-migration.sql` in Supabase SQL editor before deploying frontend.

## Error Handling

### Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| Invalid Gig ID | User not found | Check database, verify ID format |
| Invalid UUID | User not found | Check database, verify UUID format |
| Failed to load Zomato rating | RPC error | Check RPC exists and permissions |
| Failed to submit review | RPC error | Verify review data and RLS |
| Rating must be between 1 and 5 | Invalid rating | Validate input before submit |
| Platform name cannot be empty | Null platform name | Ensure "Zomato" is passed |

## Performance Considerations

- Recent reviews query limited to 5 by default
- Platform breakdown groups by platform_name
- No N+1 queries (single RPC calls)
- Loading states prevent multiple submissions
- Toast auto-dismiss prevents notification buildup

## Security Notes

- No service-role key exposed in frontend
- Only safe read/write RPCs available to anon role
- Platform name validated in RPC
- Rating values clamped 1-5
- No private fields displayed (email, phone, tokens)
- RLS policies should restrict to user's own data

## Migration Path (Existing Projects)

If adding to an existing GigFolio project:

1. Run migration to add `platform_name` column (non-destructive)
2. Existing reviews default to 'GigFolio'
3. New Zomato reviews tagged with 'Zomato'
4. Ratings automatically separated by platform
5. No existing data loss
6. Backward compatible with existing review system
