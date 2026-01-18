import { MongoClient, Db } from 'mongodb';

// Lazy initialization to avoid build-time errors
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// In development, use a global variable so the MongoClient is not recreated on hot reload
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add MONGODB_URI to your .env file');
  }

  const options = {};

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export default getClientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('mobilify');
}

// Estimated repair cost
export interface DbEstimatedCost {
  amount: number;      // Cost in CAD dollars
  unit: string;        // e.g., "total", "per unit", "per meter"
  quantity?: number;   // Optional quantity for calculation
}

// Database types matching our schema
export interface DbReport {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;

  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };

  media: {
    type: 'image' | 'video';
    url: string;
    fileName: string;
    fileSize: number;
    // New Cloudinary fields (nullable for backwards compatibility)
    thumbnailUrl?: string | null;
    cloudinaryPublicId?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    imageBytes?: number | null;
  };

  // AI-generated draft (preserved for analytics/ML improvement)
  aiDraft: {
    title: string;
    description: string;
    suggestedFix: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    generatedAt: Date;
    estimatedCost?: DbEstimatedCost; // AI-estimated repair cost
  };

  // User's final content (may be edited from AI draft)
  content: {
    title: string;
    description: string;
    suggestedFix: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    isEdited: boolean;
  };

  geoMethod: 'auto' | 'manual';

  status: 'draft' | 'open' | 'acknowledged' | 'in_progress' | 'resolved';

  routing?: {
    assignedAreaId: string | null;
    matchedBy: 'geoWithin' | 'manual' | null;
    matchedAt: Date | null;
  };
}

export interface DbArea {
  _id?: string;
  name: string;
  createdAt: Date;

  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };

  priority: number;
  isActive: boolean;
}
