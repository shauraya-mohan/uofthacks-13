# Communify - Quick Reference

## 🚀 Get Started NOW

```bash
cd frontend
npm install
npm run dev
```

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/db/init
```

Open http://localhost:3000 🎉

---

## 🔑 Required API Keys

### Must Have (App works with mock fallback)
- ✅ **Mapbox** - Already configured
- ✅ **MongoDB** - Already configured
- ✅ **Gemini** - Already configured

### Should Have (for full functionality)
- ⚠️ **Cloudinary** - Get at https://cloudinary.com/ (for fast image hosting)

### Nice to Have
- ℹ️ **Amplitude** - Get at https://amplitude.com/ (for analytics)

---

## 📁 Key Files & What They Do

### API Routes (Backend)
```
/api/reports          → GET: list reports, POST: create report
/api/reports/[id]     → DELETE, PATCH: update status
/api/areas            → GET: list areas, POST: create area  
/api/areas/[id]       → DELETE, PATCH: update area
/api/analyze          → POST: analyze image/video with AI
/api/upload           → POST: upload media to Cloudinary
/api/db/init          → POST: initialize database indexes
```

### Pages
```
/                     → Public map with reports
/admin                → Admin dashboard (password: admin)
```

### Core Libraries
```
lib/mongodb.ts        → Database connection
lib/cloudinary.ts     → Image upload utilities
lib/analytics.ts      → Amplitude tracking
lib/geo.ts            → Point-in-polygon, geolocation
lib/types.ts          → TypeScript definitions
```

---

## 🧪 Test Commands

```bash
# Check database connection
curl http://localhost:3000/api/db/init

# List all reports
curl http://localhost:3000/api/reports

# List all areas
curl http://localhost:3000/api/areas

# Check database status
curl http://localhost:3000/api/db/init | jq

# Test analyze endpoint (with a file)
curl -X POST -F "file=@test-image.jpg" http://localhost:3000/api/analyze
```

---

## 🐛 Quick Fixes

### App won't start
```bash
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Database errors
1. Check MongoDB Atlas is accessible
2. Verify IP whitelist (add 0.0.0.0/0)
3. Test connection string
4. Run POST /api/db/init

### Map not loading
- Check `NEXT_PUBLIC_MAPBOX_TOKEN` starts with `pk.`
- Verify token is active on Mapbox dashboard

### Images not uploading to Cloudinary
- Add Cloudinary credentials to `.env.local`
- App will fall back to server-side base64 without Cloudinary

---

## 🎨 UI Components

```
<Map>               → 3D Mapbox map with report pins
<AdminMap>          → Map with drawing tools
<UploadModal>       → Report submission flow
<PinDrawer>         → Report details sidebar
<AdminSidebar>      → Area list and stats
<Toast>             → Notification system
```

---

## 📊 Database Schema

### Reports Collection
```typescript
{
  _id: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  location: {
    type: "Point",
    coordinates: [lng, lat]  // GeoJSON format
  },
  media: {
    type: "image" | "video",
    url: string,
    fileName: string,
    fileSize: number
  },
  ai: {
    category: string,
    severity: "low" | "medium" | "high",
    summary: string,
    confidence: number
  },
  geoMethod: "auto" | "manual",
  status: "open" | "acknowledged" | "resolved",
  routing?: {
    assignedAreaId: string | null,
    matchedBy: "geoWithin" | "manual",
    matchedAt: Date
  }
}
```

### Areas Collection
```typescript
{
  _id: ObjectId,
  name: string,
  createdAt: Date,
  polygon: {
    type: "Polygon",
    coordinates: [[[lng, lat], ...]]  // GeoJSON format
  },
  priority: number,
  isActive: boolean
}
```

---

## 🎯 Feature Status

### ✅ Complete
- User report submission (image)
- AI analysis (Gemini)
- Interactive 3D map
- Admin area drawing
- MongoDB persistence
- Cloudinary media storage with CDN
- Thumbnail generation
- Report filtering by area
- Real-time notifications
- Status management

### ⚠️ Needs Configuration
- Cloudinary credentials (for fast image hosting)
- Amplitude API key (for analytics)

### 🚧 Could Add (If Time)
- Email notifications
- Report export (CSV/JSON)
- Pagination for large datasets
- Advanced filtering/search
- User accounts
- Report comments

---

## 🚀 Deployment Speedrun

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Communify"
git remote add origin <repo-url>
git push -u origin main

# 2. Deploy on Vercel
# - Go to vercel.com
# - Import repo
# - Set root: "frontend"
# - Add all env variables
# - Deploy!

# 3. Initialize production DB
curl -X POST https://your-app.vercel.app/api/db/init
```

Done in 5 minutes! 🎉

---

## 💡 Pro Tips

### For Demo
- Pre-create 5-10 sample reports
- Draw 2-3 admin areas
- Test on mobile (looks great!)
- Use real images of barriers if possible

### For Judges
- Emphasize the AI (Gemini)
- Show admin notification system
- Demonstrate mobile + GPS
- Highlight real-world impact

### Common Gotchas
- Base64 fallback works but not production-ready (use Cloudinary)
- Admin password defaults to "admin"
- Map needs Mapbox token starting with `pk.`

---

## 📞 Help

**Check logs:**
```bash
npm run dev  # Watch console for errors
```

**Common errors:**
- `MONGODB_URI not defined` → Check .env.local
- `Cloudinary upload failed` → Check credentials or use base64 fallback
- `Gemini error` → Check API key or use mock fallback
- `Map not loading` → Check Mapbox token

**Everything is logged to console with clear error messages!**

