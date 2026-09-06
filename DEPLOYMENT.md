# Zomato Platform Integration - Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (see TESTING.md)
- [ ] No console errors or warnings
- [ ] Build completes successfully (`npm run build`)
- [ ] Bundle size acceptable (< 150KB gzipped)
- [ ] No hardcoded credentials in code
- [ ] Environment variables documented
- [ ] Code reviewed and approved

### Database
- [ ] Migration script reviewed
- [ ] Backup of production database created
- [ ] Migration tested on staging database
- [ ] RPC functions verified to exist
- [ ] Sample data loaded and verified
- [ ] RLS policies reviewed and preserved
- [ ] Indexes created for performance

### Environment
- [ ] Supabase project created and verified
- [ ] API keys generated (anon key only)
- [ ] Database schema initialized
- [ ] Connection tested from application
- [ ] Staging environment configured
- [ ] Production environment ready

### Documentation
- [ ] README.md complete and accurate
- [ ] IMPLEMENTATION.md technical docs ready
- [ ] TESTING.md test cases prepared
- [ ] Error handling documented
- [ ] Rollback procedures documented
- [ ] Support contacts established

## Step-by-Step Deployment

### Phase 1: Database Preparation

#### 1.1 Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: `gigfolio-zomato` (or similar)
   - Database password: Strong password (store securely)
   - Region: Choose closest to users
4. Wait for project initialization (2-3 minutes)

#### 1.2 Backup Existing Data
If migrating from existing GigFolio project:
```bash
# Export existing data
pg_dump --host=your-host --username=postgres --password \
  --table=reviews --table=users \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.3 Apply Migration

1. In Supabase Dashboard, go to SQL Editor
2. Create new query, paste contents of `db-migration.sql`
3. Review carefully:
   - Verify table names match your schema
   - Check column names and types
   - Ensure RLS policies are preserved
4. Run migration
5. Verify success: No errors, all functions created

#### 1.4 Verify Migration

Run these SQL commands to verify:

```sql
-- Check platform_name column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'reviews' AND column_name = 'platform_name';
-- Expected: 1 row

-- Verify RPC functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'get_worker%' OR routine_name = 'add_user_rating'
ORDER BY routine_name;
-- Expected: 4 rows (get_worker_platform_rating, get_platform_recent_reviews, 
--                   get_worker_platform_breakdown, add_user_rating)

-- Check existing data preserved
SELECT COUNT(*) as review_count FROM reviews;
-- Expected: > 0 if migrating existing data

-- Check indexes created
SELECT indexname FROM pg_indexes WHERE tablename = 'reviews';
-- Expected: idx_reviews_platform_user and other indexes
```

#### 1.5 Load Test Data

```sql
-- Test user 1 (UUID login test)
INSERT INTO users (user_id, gig_id, legal_name, gig_score, tier, total_reviews, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'GIG123456', 'Demo Worker', 4.60, 'Gold Verified', 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Test user 2 (Gig ID login test)
INSERT INTO users (user_id, gig_id, legal_name, gig_score, tier, total_reviews, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'GIG789012', 'Test Partner', 3.95, 'Bronze Starter', 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Sample reviews
INSERT INTO reviews (user_id, rating, review_text, platform_name, reviewer_name, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 5, 'Excellent!', 'Zomato', 'User A', NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440001', 4, 'Good service', 'Zomato', 'User B', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
```

### Phase 2: Application Deployment

#### 2.1 Configure Environment

Create `.env.local` or environment variables in hosting platform:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

**DO NOT** include service-role key or any production secrets.

#### 2.2 Build Application

```bash
# Install dependencies
npm ci  # Use ci for reproducible installs in production

# Build
npm run build

# Output location: dist/

# Verify build
ls -lah dist/
# Should see:
# - index.html
# - assets/index-*.css
# - assets/index-*.js
```

#### 2.3 Test Production Build Locally

```bash
npm run preview
# Open http://localhost:4173
# Test login with:
#   UUID: 550e8400-e29b-41d4-a716-446655440001
#   Gig ID: GIG123456
# Verify all features work
```

#### 2.4 Deploy to Hosting

**Option A: Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
# Follow prompts:
# - Link to existing project or create new
# - Configure environment variables
# - Deploy
```

**Option B: Netlify**
1. Connect GitHub repository
2. Configure build command: `npm run build`
3. Configure publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy

**Option C: AWS S3 + CloudFront**
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Option D: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

```bash
docker build -t gigfolio-zomato .
docker run -p 3000:3000 -e VITE_SUPABASE_URL=... gigfolio-zomato
```

### Phase 3: Post-Deployment Verification

#### 3.1 Smoke Tests
1. Open deployed application in browser
2. Test login with valid Gig ID
3. Verify profile loads
4. Test login with valid UUID
5. Submit test review
6. Verify review appears
7. Logout and login again
8. Verify data persists

#### 3.2 Error Handling Tests
1. Test login with invalid Gig ID → Error message
2. Test login with invalid UUID → Error message
3. Test review with no rating → Error message
4. Test review with no text → Error message
5. Verify error messages are clear and actionable

#### 3.3 Performance Checks
1. Measure page load time: `< 2 seconds`
2. Measure login time: `< 500ms`
3. Measure review submit time: `< 1 second`
4. Check Network tab for unnecessary requests
5. Check bundle size in Network tab

#### 3.4 Browser/Device Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (on Mac)
- [ ] Safari (on iPhone)
- [ ] Chrome (on Android)
- [ ] Tablet (iPad or Android tablet)

#### 3.5 Database Verification
```sql
-- Verify data integrity
SELECT 
  COUNT(*) as total_reviews,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT platform_name) as platforms
FROM reviews;

-- Check for any null platform_name
SELECT COUNT(*) FROM reviews WHERE platform_name IS NULL;
-- Expected: 0 (unless migrated existing data without platform_name)

-- Verify RPC performance
-- Time execution of: SELECT * FROM get_worker_platform_rating(...)
-- Expected: < 100ms
```

### Phase 4: Monitoring & Alerting

#### 4.1 Application Monitoring
Set up monitoring for:
- Page load time (Google Lighthouse)
- Error rate (Sentry, LogRocket)
- User engagement (Mixpanel, Amplitude)
- Uptime (Uptime.com, Pingdom)

#### 4.2 Database Monitoring
In Supabase Dashboard:
1. Go to Database → Monitoring
2. Set alerts for:
   - Connection count > 50
   - Query time > 1 second
   - Disk usage > 80%
3. Configure alert email addresses

#### 4.3 Error Logging
```javascript
// Optional: Add error logging to main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

#### 4.4 Real User Monitoring
Add Google Analytics or similar:
```html
<!-- In index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### Phase 5: Documentation & Handover

#### 5.1 Create Runbook
Document for ops team:
- How to access production database
- How to check application status
- How to respond to common alerts
- Escalation contacts
- Disaster recovery procedures

#### 5.2 Create KPI Dashboard
Track:
- DAU (Daily Active Users)
- Average reviews per user
- Platform rating distribution
- Error rate
- Page load time

#### 5.3 Team Training
- [ ] Frontend team trained on codebase
- [ ] Backend team trained on RPC functions
- [ ] Ops team trained on monitoring
- [ ] Support team trained on troubleshooting
- [ ] Documentation reviewed by all

## Rollback Procedures

### Scenario 1: Critical Bug Found Post-Deploy

**If < 1 hour old:**
```bash
# Option A: Re-deploy previous version
git checkout previous_version_tag
npm run build
# Redeploy to hosting platform
```

**If > 1 hour old:**
```bash
# Option B: Use Vercel/Netlify rollback
# In Vercel Dashboard:
# - Go to Deployments
# - Find previous working deployment
# - Click → Promote to Production

# In Netlify:
# - Go to Deploys
# - Right-click previous deploy
# - Select "Restore"
```

### Scenario 2: Database Issues

**If migration caused problems:**
```bash
# Restore from backup
psql < backup_20240115_120000.sql

# OR in Supabase:
# - Go to Settings → Backups
# - Select previous backup
# - Click Restore (creates new instance)
```

**If RPC functions broken:**
```sql
-- Drop broken function
DROP FUNCTION IF EXISTS get_worker_platform_rating;

-- Re-create from working version
-- (Run known-good SQL from version control)
```

### Scenario 3: Performance Degradation

**If response time > 1 second:**

1. Check Supabase logs for slow queries
2. Analyze RPC execution plans:
```sql
EXPLAIN ANALYZE
SELECT * FROM get_worker_platform_rating(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Zomato'
);
```
3. Add indexes if needed
4. Scale database if CPU/memory high

### Scenario 4: Data Corruption

**If reviews show wrong platform_name:**
```sql
-- Find affected records
SELECT * FROM reviews WHERE platform_name NOT IN ('Zomato', 'GigFolio', '...');

-- Fix if possible
UPDATE reviews 
SET platform_name = 'Zomato'
WHERE platform_name LIKE 'zomato%' OR platform_name = 'ZOMATO';

-- Or delete if unfixable
DELETE FROM reviews WHERE platform_name IS NULL;
```

## Post-Deployment Checklist

- [ ] Application accessible from public URL
- [ ] Login works with test credentials
- [ ] Profile loads with correct data
- [ ] Reviews submit and appear
- [ ] Ratings calculated correctly
- [ ] Platform breakdown shows all platforms
- [ ] Error handling working
- [ ] Toast notifications display
- [ ] Responsive design verified
- [ ] Page load time < 2 seconds
- [ ] No console errors
- [ ] Database verified correct
- [ ] Monitoring/alerts set up
- [ ] Backup procedure tested
- [ ] Team trained on runbook
- [ ] Documentation updated
- [ ] Support tickets ready

## Support & Escalation

### Tier 1 Support (Frontend)
- Check browser console for errors
- Clear cache and refresh
- Try incognito/private mode
- Test on different browser

### Tier 2 Support (Database)
- Check Supabase logs
- Verify RPC functions exist
- Test RPC directly in SQL editor
- Check user exists in database

### Tier 3 Support (Infrastructure)
- Check hosting platform status
- Verify environment variables
- Check database backups
- Review disaster recovery procedures

### Emergency Contacts
- On-call Engineer: [PHONE]
- Database Administrator: [EMAIL]
- Infrastructure Lead: [EMAIL]
- Product Manager: [EMAIL]

## Success Criteria

✅ **Deployment successful when:**
1. All smoke tests pass
2. No critical errors in logs
3. Page load time < 2 seconds
4. All features functional
5. User can complete full journey (login → review → logout)
6. Database verified intact
7. Monitoring and alerts active
8. Team trained and ready
9. Rollback procedure tested
10. Documentation complete

---

**Deployment Date**: [TO BE FILLED]  
**Deployed By**: [TO BE FILLED]  
**Approved By**: [TO BE FILLED]  
**Notes**: [TO BE FILLED]
