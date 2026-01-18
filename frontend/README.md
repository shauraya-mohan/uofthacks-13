# Communify

A web app for reporting and mapping accessibility barriers. Users upload photos/videos of barriers, AI analyzes them, and results appear as pins on an interactive map. Admins can define responsibility areas and see which reports fall inside.

## Quick Start (60-second Demo)

1. **Install & Run**
   ```bash
   npm install
   cp .env.example .env.local
   # Add your Mapbox token to .env.local
   npm run dev
   ```

2. **Get a Mapbox Token**
   - Go to [mapbox.com](https://account.mapbox.com/)
   - Create a free account
   - Copy your default public token
   - Paste it in `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`

3. **Demo the App**
   - Open [http://localhost:3000](http://localhost:3000)
   - Click "Report Barrier" → upload any image
   - Allow geolocation (or click map to set location)
   - Click "Analyze" → see AI results (mock mode)
   - Click "Submit" → pin appears on map!
   - Click the pin to see details

4. **Try Admin Panel**
   - Go to [http://localhost:3000/admin](http://localhost:3000/admin)
   - Password: `admin` (or your `NEXT_PUBLIC_ADMIN_PASSWORD`)
   - Draw polygons on the map to define responsibility areas
   - See which reports fall in each area

## Features

### Public Map (`/`)
- Interactive Mapbox map with report pins
- Pins colored by severity: red (high), yellow (medium), green (low)
- Click pins to see details in a drawer
- Report barriers with photo/video upload
- Auto geolocation (falls back to manual map click)
- AI-powered analysis (mock mode or real Gemini)

### Admin Panel (`/admin`)
- Password-protected access
- Draw responsibility area polygons on the map
- See report counts per area
- Filter/highlight reports by area
- Toast notifications for new reports in monitored areas

## Environment Variables

```bash
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx        # Mapbox public token
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas connection string

# Cloudinary (recommended for image hosting)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx  # Your Cloudinary cloud name
CLOUDINARY_API_KEY=xxx                 # Cloudinary API key
CLOUDINARY_API_SECRET=xxx              # Cloudinary API secret

# Optional
NEXT_PUBLIC_ADMIN_PASSWORD=admin       # Admin panel password
GEMINI_API_KEY=xxx                     # Google Gemini for AI analysis
CLOUDINARY_FOLDER=communify       # Upload folder (default: communify)
```

## Cloudinary Setup (Image Hosting)

Communify uses Cloudinary for fast image hosting with CDN delivery. This replaces storing large images directly in MongoDB.

### How to Set Up

1. **Create a Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com/) and sign up (free tier available)
   - The free tier includes 25 GB storage and 25 GB bandwidth/month

2. **Get Your Credentials**
   - Go to Dashboard > Settings > API Keys
   - Copy your:
     - **Cloud Name** (appears at the top of the dashboard)
     - **API Key**
     - **API Secret** (click "Reveal" to see it)

3. **Add to Environment Variables**
   ```bash
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### How the Upload Flow Works

1. **User selects an image** in the upload modal
2. **Client requests a signed upload** from `/api/cloudinary/signature`
3. **Client uploads directly to Cloudinary** (reduces server load)
4. **Cloudinary returns** `secure_url`, `public_id`, dimensions, and file size
5. **Client generates thumbnail URL** using Cloudinary transformations
6. **Report is saved to MongoDB** with only URLs and metadata (no raw image data)

### Thumbnail Strategy

- **Thumbnail** (400px width): Used in map popups for fast feed loading
- **Full image** (original): Used in detail view when user clicks on a report

Cloudinary transformations are applied via URL:
```
https://res.cloudinary.com/{cloud}/image/upload/w_400,q_auto,f_auto/{public_id}
```

### Backwards Compatibility

- Existing reports without Cloudinary URLs continue to work
- Old base64/data URLs are still supported for display
- New uploads use Cloudinary automatically when configured
- If Cloudinary is not configured, falls back to server-side upload

## Mock Mode

If `GEMINI_API_KEY` is not set, the app uses **deterministic mock analysis**:
- Category, severity, and summary are derived from file metadata (name, type, size)
- Same file always produces the same result
- Demo works without any AI API keys

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Map**: Mapbox GL JS + Mapbox Draw
- **Styling**: Tailwind CSS
- **Storage**: localStorage (no database needed)
- **AI**: Google Gemini (optional)

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Public map page
│   │   ├── admin/page.tsx        # Admin dashboard
│   │   ├── api/analyze/route.ts  # AI analysis endpoint
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Tailwind + custom styles
│   ├── components/
│   │   ├── Map.tsx               # Mapbox map with pins
│   │   ├── AdminMap.tsx          # Map with draw controls
│   │   ├── UploadModal.tsx       # Report creation flow
│   │   ├── PinDrawer.tsx         # Report details drawer
│   │   ├── AdminSidebar.tsx      # Area list + counts
│   │   ├── AdminPasswordGate.tsx # Login screen
│   │   └── Toast.tsx             # Notifications
│   ├── hooks/
│   │   ├── useReports.ts         # Reports state + localStorage
│   │   └── useAreas.ts           # Admin areas state + localStorage
│   └── lib/
│       ├── types.ts              # TypeScript interfaces
│       ├── storage.ts            # localStorage helpers
│       └── geo.ts                # Point-in-polygon + geolocation
├── .env.example                  # Environment template
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## localStorage Keys

- `communify:reports` - Array of Report objects
- `communify:areas` - Array of AdminArea polygons

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Notes

- Media files are stored as blob URLs (memory only, not persisted across page reloads in terms of the actual file data - only metadata is persisted)
- For a production app, you'd want to upload media to cloud storage
- The point-in-polygon algorithm handles simple polygons including holes

## License

MIT
