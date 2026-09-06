# Zomato Integration - Quick Reference Guide

## 🚀 Quick Start (5 minutes)

### 1. Setup
```bash
npm install
```

### 2. Configure
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://kblhngnyyaxphzecftet.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SZK2GACanKrb4iI9j0KfVQ_Bq51EW8p
```

### 3. Database
1. Open Supabase Dashboard → SQL Editor
2. Copy-paste entire contents of `db-migration.sql`
3. Click "Execute"
4. Verify: Run queries in "Database Verification" section below

### 4. Run
```bash
npm run dev
# Open http://localhost:5173
```

### 5. Test
**Login with test credentials:**
- **UUID**: `550e8400-e29b-41d4-a716-446655440001`
- **Gig ID**: `GIG123456`

---

## 📋 Key Concepts

### Platform Scores (MUST KNOW)
| Term | Calculation | Display |
|------|-------------|---------|
| **Zomato Score** | Average of Zomato reviews only | Red (#e23744) |
| **GigFolio Score** | Average of ALL reviews | Green (#22c55e) |
| **NEVER confuse them** | Different calculations, different displays | Never mix |

### Example
Worker with reviews:
- Zomato: 5★, 4★ → Zomato score = 4.50
- GigFolio: 5★, 4★, 5★, 4★ → GigFolio score = 4.50
- BUT if 6th review from another platform (3★):
  - Zomato: still 4.50 (unchanged)
  - GigFolio: now 4.40 (average of all 5)

---

## 🔑 Environment Variables

```env
# REQUIRED - Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx

# NEVER include service-role key!
# NEVER commit .env.local to git!
```

---

## 📊 Database Verification

Quick checks after running migration:

```sql
-- 1. Check platform_name column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'reviews' AND column_name = 'platform_name';
-- Expected: Returns 1 row

-- 2. Check RPC functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%worker%'
OR routine_name = 'add_user_rating'
ORDER BY routine_name;
-- Expected: Returns 4 rows

-- 3. Check anon role can execute RPCs
SELECT has_function_privilege('anon', 'get_worker_platform_rating(uuid, text)', 'execute');
-- Expected: true

-- 4. Check test data exists
SELECT COUNT(*) FROM users;
-- Expected: > 0
```

---

## 💻 File Structure

### Frontend Code
```
src/
├── main.jsx              ← React app (LOGIN + PROFILE pages)
├── lib/
│   └── supabase.js      ← Supabase client init
└── styles.css           ← All styling
```

### Key Components
**LoginPage**: 
- Toggle Gig ID vs UUID
- Form validation
- Error handling

**ProfilePage**:
- Left: Rating cards (Zomato + GigFolio)
- Right: Review submission form
- Below: Recent reviews + Platform breakdown

### Data Flow
```
User Login
  ↓
Query users table (by gig_id or user_id)
  ↓
Load ProfilePage
  ↓
Call 3 RPCs in parallel:
  1. get_worker_platform_rating("Zomato")
  2. get_platform_recent_reviews("Zomato")
  3. get_worker_platform_breakdown()
  ↓
Display ratings + reviews
  ↓
User submits review
  ↓
Call add_user_rating(..., "Zomato")
  ↓
Refresh all data
```

---

## 🔌 RPC Functions at a Glance

### get_worker_platform_rating
```javascript
// Get Zomato rating
const { data } = await supabase.rpc('get_worker_platform_rating', {
  p_user_id: userUUID,
  p_platform_name: 'Zomato'  // MUST BE 'Zomato'
});
// Returns: { platform_score: 4.85, tier: 'Diamond...', total_reviews: 5 }
```

### get_platform_recent_reviews
```javascript
// Get 5 recent Zomato reviews
const { data } = await supabase.rpc('get_platform_recent_reviews', {
  p_user_id: userUUID,
  p_platform_name: 'Zomato',
  p_limit: 5
});
// Returns: [{ rating: 5, review_text: '...', reviewer_name: 'Alice', ... }]
```

### get_worker_platform_breakdown
```javascript
// Get all platforms
const { data } = await supabase.rpc('get_worker_platform_breakdown', {
  p_user_id: userUUID
});
// Returns: [{ platform_name: 'Zomato', platform_score: 4.85, ... }, ...]
```

### add_user_rating
```javascript
// Submit review (MOST IMPORTANT)
const { data } = await supabase.rpc('add_user_rating', {
  p_user_id: userUUID,
  p_rating: 5,                    // 1-5 ONLY
  p_review_text: 'Great!',
  p_platform_name: 'Zomato',      // MUST BE 'Zomato'
  p_reviewer_name: 'John'         // or null for "Anonymous"
});
// Returns: { success: true, new_gig_score: 4.75, ... }
```

---

## ⚙️ Configuration

### Changing Platform Name
Search `main.jsx` for `"Zomato"` string, replace with new platform:
```javascript
// Line ~150 - RPC calls
p_platform_name: "Zomato"  // Change this

// Line ~200 - Review submit
p_platform_name: "Zomato"  // Change this
```
**NO database changes needed** - schema is dynamic!

### Styling Colors
```css
/* Zomato (red) */
#e23744  /* Primary red */
#fff5f6  /* Light red background */
#c82f3c  /* Dark red for errors */

/* GigFolio (green) */
#22c55e  /* Primary green */

/* Neutral */
#d9dade  /* Borders */
#e8e8eb  /* Light borders */
#666    /* Secondary text */
#999    /* Tertiary text */
```

---

## 🧪 Testing Essentials

### Test Login
```
Gig ID: GIG123456
UUID: 550e8400-e29b-41d4-a716-446655440001
```

### Test Review Submission
1. Rate: 5 stars
2. Text: "Test review"
3. Name: "Tester" (or leave blank for anonymous)
4. Submit
5. Verify:
   - Toast: "Review submitted successfully!"
   - Rating updates
   - Review appears in recent reviews

### Test Form Validation
- No rating: "Please select a rating"
- No text: "Please write a review"

### Test Error Cases
| Error | Expected Message |
|-------|-----------------|
| Invalid Gig ID | "Invalid Gig ID. User not found." |
| Invalid UUID | "Invalid UUID. User not found." |
| Network error | "Failed to..." |

---

## 🚨 Common Issues & Fixes

### Login Fails
```
❌ "User not found"
✅ Check:
  1. Test user exists in DB: SELECT * FROM users;
  2. Gig ID/UUID matches exactly
  3. Environment variables correct
```

### Review Won't Submit
```
❌ "Failed to submit review"
✅ Check:
  1. Rating selected (1-5)
  2. Review text not empty
  3. Platform name is "Zomato" (case-sensitive)
  4. RPC exists: SELECT routine_name FROM information_schema.routines;
```

### Ratings Don't Update
```
❌ Scores stay same after review
✅ Check:
  1. Review actually submitted (check reviews table)
  2. Platform name in DB matches "Zomato"
  3. Refresh page (F5) - UI might not auto-update
  4. Re-login - triggers fresh data load
```

### Styling Issues
```
❌ Colors wrong, layout broken
✅ Check:
  1. styles.css loaded: <link> in index.html
  2. CSS minified in build: npm run build
  3. Clear browser cache: Ctrl+Shift+Del
```

---

## 📈 Build & Deploy

### Local Build
```bash
npm run build
# Output: dist/
# Size: ~109 KB gzipped
# Time: ~5 seconds
```

### Preview Built App
```bash
npm run preview
# Open http://localhost:4173
```

### Deploy Options
- **Vercel**: `vercel --prod`
- **Netlify**: Connect GitHub, auto-deploy
- **AWS S3**: `aws s3 sync dist/ s3://bucket`
- **Docker**: See DEPLOYMENT.md

---

## 🔐 Security Checklist

- [ ] NO service-role key in code
- [ ] NO credentials in git
- [ ] ONLY anon-key in `.env.local`
- [ ] ONLY safe RPCs exposed to frontend
- [ ] Rating validated (1-5)
- [ ] Platform name validated (non-empty)
- [ ] No private fields displayed

---

## 📚 Documentation Map

| Need | File |
|------|------|
| Architecture overview | [IMPLEMENTATION.md](IMPLEMENTATION.md) |
| Test procedures | [TESTING.md](TESTING.md) |
| Deploy checklist | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Setup instructions | [README.md](README.md) |
| Project status | [DELIVERABLES.md](DELIVERABLES.md) |
| Tier rules & schemas | [IMPLEMENTATION.md](IMPLEMENTATION.md#tier-rules) |

---

## 🎯 Key Takeaways

1. **Platform Matters**: Always pass `"Zomato"` to RPCs
2. **Ratings Separate**: Zomato score ≠ GigFolio score
3. **Non-Destructive**: Existing data survives migration
4. **Responsive**: Works on desktop, tablet, mobile
5. **Secure**: No service-role keys exposed
6. **Tested**: 19 test scenarios included
7. **Documented**: 5 comprehensive guides
8. **Production Ready**: Builds without errors

---

## 📞 Support

### Quick Answers
- Check [README.md](README.md) Troubleshooting section
- Search issue in [TESTING.md](TESTING.md)
- Review [IMPLEMENTATION.md](IMPLEMENTATION.md) for architecture

### Complex Issues
- Check Supabase logs (Dashboard → Logs)
- Test RPC directly in SQL editor
- Verify user exists: `SELECT * FROM users WHERE user_id = '...';`
- Check reviews: `SELECT * FROM reviews WHERE user_id = '...';`

### Emergency Rollback
```bash
# Revert to previous version
git checkout previous_tag
npm run build
# Redeploy
```

---

## 🔄 Workflow Quick Commands

```bash
# Development
npm run dev                    # Start local dev server

# Testing
npm run build                 # Build for production
npm run preview               # Test production build locally

# Database (in Supabase)
SELECT COUNT(*) FROM reviews; # Check review count
SELECT * FROM users LIMIT 1;  # Check user data
SELECT routine_name FROM information_schema.routines; # Check RPCs

# Debugging
# Browser console: F12
# Check network tab for API calls
# Check Supabase logs for RPC errors
```

---

**Last Updated**: 2024-01-15  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
