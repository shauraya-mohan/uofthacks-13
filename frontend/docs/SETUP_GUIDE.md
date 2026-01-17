# MobilityCursor - Setup & Deployment Guide

**Last Updated:** January 17, 2026  
**Status:** Ready for testing and deployment

---

## 🚀 QUICK START (5 minutes)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Variables
Your `.env.local` file should already exist with these values:
- ✅ Mapbox token configured
- ✅ OpenAI API key configured  
- ✅ MongoDB URI configured
- ⚠️ TwelveLabs API key needed (optional but recommended)
- ⚠️ Cloudinary credentials needed (optional but recommended)

### 3. Initialize Database
```bash
# Start the dev server
npm run dev

# In another terminal, initialize MongoDB indexes:
curl -X POST http://localhost:3000/api/db/init
```

Expected response:
```json
{
  "success": true,
  "message": "Database indexes created successfully"
}
```

### 4. Test the App
Open http://localhost:3000 and:
1. Click "Report Barrier"
2. Upload an image
3. Confirm location
4. Submit report
5. See it appear on the map!

---

## 🔑 GETTING API KEYS

### TwelveLabs (Required for video analysis)
1. Go to https://twelvelabs.io/
2. Sign up for free account
3. Go to Dashboard → API Keys
4. Copy your API key
5. Add to `.env.local`:
   ```
   TWELVELABS_API_KEY=tlk_your_api_key_here
   ```

### Cloudinary (Recommended for media storage)
1. Go to https://cloudinary.com/
2. Sign up for free account (generous free tier)
3. Go to Dashboard
4. Copy your credentials
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

**Note:** Without Cloudinary, app will use base64 encoding (works but not ideal for production).

### Amplitude (Optional - for analytics)
1. Go to https://analytics.amplitude.com/
2. Sign up and create a project
3. Copy your API key
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key
   ```

---

## 📊 TESTING CHECKLIST

### Basic Functionality
- [ ] App loads without errors
- [ ] Map displays correctly
- [ ] Can submit image report
- [ ] Can submit video report  
- [ ] Reports appear on map
- [ ] Can click pins to see details
- [ ] Admin panel accessible at /admin

### Database Operations
- [ ] Reports persist in MongoDB
- [ ] Can delete reports
- [ ] Areas persist in MongoDB
- [ ] Can rename areas
- [ ] Can delete areas

### AI Analysis
- [ ] Images analyzed with OpenAI (or mock if no key)
- [ ] Videos analyzed with TwelveLabs (or mock if no key)
- [ ] Analysis results display correctly
- [ ] Severity colors correct (red/yellow/green)

### Media Storage
- [ ] With Cloudinary: Media uploads and displays
- [ ] Without Cloudinary: Base64 fallback works
- [ ] Media persists after page refresh

### Admin Features
- [ ] Password gate works (password: admin)
- [ ] Can draw responsibility areas
- [ ] Reports highlight when area selected
- [ ] Notifications for new reports in areas
- [ ] Area rename persists to database

---

## 🐛 TROUBLESHOOTING

### "Failed to connect to MongoDB"
**Problem:** Database connection string incorrect or database not accessible

**Solution:**
1. Check MongoDB Atlas dashboard
2. Verify IP whitelist (add 0.0.0.0/0 for development)
3. Verify user credentials
4. Check connection string format in `.env.local`

### "Cloudinary upload failed"
**Problem:** Cloudinary credentials incorrect or missing

**Solution:**
1. Verify all three Cloudinary variables set correctly
2. Check API secret doesn't have extra spaces
3. App will fall back to base64 if Cloudinary fails (check console)

### "Video analysis not working"
**Problem:** TwelveLabs API key missing or video processing failed

**Solution:**
1. Verify `TWELVELABS_API_KEY` in `.env.local`
2. Check API key is valid (test on TwelveLabs dashboard)
3. App will fall back to mock analysis if TwelveLabs fails
4. Check console for detailed error messages

### Map not displaying
**Problem:** Mapbox token invalid or missing

**Solution:**
1. Verify `NEXT_PUBLIC_MAPBOX_TOKEN` starts with `pk.`
2. Check token is active on Mapbox dashboard
3. Token must be public (starts with pk, not sk)

### Analysis taking too long
**Problem:** Video analysis can take 1-5 minutes for TwelveLabs indexing

**Expected behavior:**
- Images: 1-2 seconds with OpenAI
- Videos: 30 seconds - 5 minutes with TwelveLabs (first time)
- Fallback: <1 second mock analysis

---

## 🚀 DEPLOYMENT (Vercel - Recommended)

### Prerequisites
- GitHub account
- Vercel account (free)

### Step 1: Push to GitHub
```bash
cd /Users/shauraya/Desktop/uofthacks-13
git init
git add .
git commit -m "Initial commit - MobilityCursor"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com/
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. Add Environment Variables (copy from `.env.local`):
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
   - `MONGODB_URI`
   - `OPENAI_API_KEY`
   - `TWELVELABS_API_KEY`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `NEXT_PUBLIC_AMPLITUDE_API_KEY` (optional)

6. Click "Deploy"

### Step 3: Initialize Production Database
After deployment completes:
```bash
curl -X POST https://your-app.vercel.app/api/db/init
```

### Step 4: Test Production
1. Visit your Vercel URL
2. Test report submission
3. Test admin panel
4. Verify all features work

---

## 📈 PERFORMANCE TIPS

### For Demo/Hackathon
- Use Cloudinary free tier (plenty for demo)
- MongoDB Atlas free tier (M0) is sufficient
- Keep videos under 50MB
- Limit to ~100 reports for smooth map performance

### For Production
- [ ] Implement pagination for reports API
- [ ] Add caching layer (Redis)
- [ ] Use CDN for static assets
- [ ] Upgrade MongoDB cluster
- [ ] Add rate limiting
- [ ] Implement error tracking (Sentry)
- [ ] Add monitoring (Datadog, New Relic)

---

## 🎯 SPONSOR TRACK REQUIREMENTS

### Amplitude (Self-improving Product) ✅
**Status:** Ready
- All events tracked (report_start, media_selected, etc.)
- User journey instrumented
- **Next step:** Add Amplitude API key to see analytics

### Shopify (AI) ✅
**Status:** Ready
- OpenAI Vision for image analysis
- TwelveLabs for video analysis
- **Talking points:** 
  - AI categorizes barriers automatically
  - Severity detection
  - Natural language summaries
  - Multi-modal analysis (images + videos)

### TwelveLabs (Video) ✅
**Status:** Ready (pending API key)
- Video upload implemented
- Video analysis integrated
- Semantic search for accessibility barriers
- **Next step:** Add TwelveLabs API key to enable

---

## 📝 DEMO SCRIPT

### For Judges (2-3 minutes)

**1. Problem Statement (30s)**
"Mobility-impaired individuals face countless accessibility barriers daily - broken sidewalks, missing ramps, blocked paths. Currently, there's no centralized system to report and track these issues."

**2. Solution Demo (90s)**
- Open app on phone
- Click "Report Barrier"
- Take photo of barrier (or use sample)
- GPS auto-detects location
- AI analyzes: "Broken sidewalk, high severity"
- Submit → Pin appears on map
- Click pin to see details

**3. Admin View (60s)**
- Switch to admin panel
- Draw responsibility area on map
- Show reports within area highlighted
- Demonstrate filtering by area
- Show notification system

**4. Tech Highlights (30s)**
"Built with Next.js, MongoDB, and integrates three key technologies:
- **OpenAI Vision** for image analysis
- **TwelveLabs** for video understanding
- **Amplitude** for product analytics

All deployed on Vercel with real-time mapping via Mapbox."

---

## 🔗 USEFUL LINKS

- **Local Dev:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **Cloudinary Dashboard:** https://cloudinary.com/console
- **TwelveLabs Dashboard:** https://api.twelvelabs.io/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Analysis:** `/PROJECT_ANALYSIS.md`

---

## ✅ FINAL CHECKLIST

Before demo/submission:
- [ ] All environment variables configured
- [ ] Database initialized
- [ ] At least 5-10 sample reports created
- [ ] Admin areas defined
- [ ] Tested on mobile device
- [ ] Tested on desktop
- [ ] Screenshots/video recorded
- [ ] README updated
- [ ] Deployed to Vercel
- [ ] Production database seeded

---

## 🆘 NEED HELP?

Check console for error messages:
```bash
# Frontend logs
npm run dev

# Check database
curl http://localhost:3000/api/db/init

# Test API endpoints
curl http://localhost:3000/api/reports
curl http://localhost:3000/api/areas
```

Common errors are logged to console with clear messages. Most issues are environment variable related.

