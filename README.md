# MobilityCursor 🦽

**AI-powered accessibility barrier reporting platform built for UofTHacks 13**

Report and track accessibility barriers using computer vision and geospatial mapping to make cities more accessible for everyone.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-blue?logo=openai)
![TwelveLabs](https://img.shields.io/badge/TwelveLabs-Video%20AI-purple)

---

## 🚀 Features

### User Features
- 📸 **Photo/Video Upload** - Capture accessibility barriers on the go
- 🤖 **AI Analysis** - Automatically categorize and assess severity using OpenAI & TwelveLabs
- 📍 **GPS Integration** - Auto-detect location or manually place on map
- 🗺️ **Interactive 3D Map** - View all reported barriers with Mapbox
- 🎨 **Modern UI** - Clean, responsive interface with dark mode

### Admin Features
- 🎯 **Responsibility Areas** - Draw polygons to define managed zones
- 📊 **Area Analytics** - See report counts and severity breakdown per area
- 🔔 **Real-time Notifications** - Get alerted when reports appear in your areas
- ✏️ **Area Management** - Rename, edit, and delete responsibility zones
- 📈 **Dashboard** - Monitor all reports with filtering and highlighting

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas with geospatial indexing
- **Map**: Mapbox GL JS + Mapbox Draw
- **AI**: OpenAI GPT-4o Vision (images), TwelveLabs (videos)
- **Media Storage**: Cloudinary (with base64 fallback)

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Mapbox account (free tier)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd uofthacks-13

# Install dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🔑 Environment Variables

Create `frontend/.env.local` with:

```bash
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mobilify

# Optional (app works with fallbacks)
OPENAI_API_KEY=sk-your_key_here
TWELVELABS_API_KEY=tlk_your_key_here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

See `.env.example` for detailed setup instructions.

---

## 🎯 Sponsor Tracks

### 🛍️ **Shopify** - AI
- ✅ OpenAI GPT-4o Vision for image analysis
- ✅ TwelveLabs for video understanding
- ✅ Automatic categorization and severity detection
- ✅ Natural language summaries

### 🎬 **TwelveLabs** - Video
- ✅ Video indexing and semantic search
- ✅ Accessibility barrier detection in videos
- ✅ Multi-modal analysis (visual + conversation)

---

## 📖 Documentation

- **Setup Guide**: `SETUP_GUIDE.md` - Deployment and configuration
- **Quick Reference**: `QUICK_REFERENCE.md` - Commands and API docs
- **Project Analysis**: `PROJECT_ANALYSIS.md` - Technical overview
- **Test Status**: `TEST_STATUS.md` - What's working and tested

---

## 🗺️ Project Structure

```
uofthacks-13/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Main map page
│   │   │   ├── admin/page.tsx        # Admin dashboard
│   │   │   └── api/                  # API routes
│   │   ├── components/               # React components
│   │   ├── hooks/                    # Custom hooks
│   │   └── lib/                      # Utilities and types
│   ├── public/                       # Static assets
│   └── package.json
└── README.md
```

---

## 🧪 Testing

```bash
# Initialize database indexes
curl -X POST http://localhost:3000/api/db/init

# Check database status
curl http://localhost:3000/api/db/init

# List all reports
curl http://localhost:3000/api/reports

# List all areas
curl http://localhost:3000/api/areas
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy!

See `SETUP_GUIDE.md` for detailed instructions.

---

## 🏆 Team

Built with ❤️ for UofTHacks 13

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Mapbox** - Beautiful 3D maps
- **OpenAI** - Image analysis
- **TwelveLabs** - Video understanding
- **MongoDB** - Geospatial database
- **UofTHacks** - Amazing hackathon! 🎉

