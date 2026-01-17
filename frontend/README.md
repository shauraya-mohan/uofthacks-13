# MobilityCursor

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
- AI-powered analysis (mock mode or real OpenAI)

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

# Optional
NEXT_PUBLIC_ADMIN_PASSWORD=admin       # Admin panel password
OPENAI_API_KEY=sk-xxx                  # Real AI analysis (images only)
TWELVELABS_API_KEY=xxx                 # Future: video analysis
```

## Mock Mode

If `OPENAI_API_KEY` is not set, the app uses **deterministic mock analysis**:
- Category, severity, and summary are derived from file metadata (name, type, size)
- Same file always produces the same result
- Demo works without any AI API keys

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Map**: Mapbox GL JS + Mapbox Draw
- **Styling**: Tailwind CSS
- **Storage**: localStorage (no database needed)
- **AI**: OpenAI GPT-4o Vision (optional)

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

- `mobilitycursor:reports` - Array of Report objects
- `mobilitycursor:areas` - Array of AdminArea polygons

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
