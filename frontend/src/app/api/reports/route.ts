import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DbReport } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper to safely convert date to ISO string
function toISOString(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  return date.toISOString();
}

// GET /api/reports - List all reports with optional pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    // Default limit to 100 reports to prevent slow queries
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const status = searchParams.get('status'); // Optional status filter
    const severity = searchParams.get('severity'); // Optional severity filter
    const includeMedia = searchParams.get('includeMedia') !== 'false'; // Default true for backwards compat

    const db = await getDatabase();

    // Build query filter
    const filter: Record<string, unknown> = {};
    if (status && ['draft', 'open', 'acknowledged', 'in_progress', 'resolved'].includes(status)) {
      filter.status = status;
    }
    if (severity && ['low', 'medium', 'high'].includes(severity)) {
      filter['content.severity'] = severity;
    }

    // Get total count for pagination metadata
    // Use estimatedDocumentCount for better performance when no filter is applied
    const hasFilter = Object.keys(filter).length > 0;
    const total = hasFilter
      ? await db.collection<DbReport>('reports').countDocuments(filter)
      : await db.collection<DbReport>('reports').estimatedDocumentCount();

    // Build query with pagination - always apply limit to avoid slow queries
    const effectiveLimit = Math.min(limit, 500); // Cap at 500 to prevent huge queries

    // Use projection to fetch needed fields
    // Exclude media.url by default to avoid loading large base64 data
    // Short Cloudinary URLs will be lost, but single report fetch will get them
    const projection = includeMedia
      ? {
          _id: 1,
          createdAt: 1,
          location: 1,
          media: 1,
          aiDraft: 1,
          content: 1,
          geoMethod: 1,
          status: 1,
          ai: 1,
        }
      : {
          _id: 1,
          createdAt: 1,
          location: 1,
          'media.type': 1,
          'media.fileName': 1,
          'media.fileSize': 1,
          aiDraft: 1,
          content: 1,
          geoMethod: 1,
          status: 1,
          ai: 1,
        };

    const cursor = db
      .collection<DbReport>('reports')
      .find(filter)
      .project(projection)
      .sort({ createdAt: -1 })
      .allowDiskUse()
      .limit(effectiveLimit);

    // Apply pagination if page is specified
    if (page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      cursor.skip(skip);
    }

    const reports = await cursor.toArray();

    // Transform to match frontend Report type
    // Handle both old schema (ai field) and new schema (aiDraft/content fields)
    const transformedReports = reports
      .map((report) => {
        try {
          // Support old schema: 'ai' field with summary instead of title/description
          const legacyAi = (report as Record<string, unknown>).ai as {
            category?: string;
            severity?: string;
            summary?: string;
            confidence?: number;
          } | undefined;

          // Determine values from new schema or fall back to legacy schema
          const category = report.content?.category ?? report.aiDraft?.category ?? legacyAi?.category ?? 'other';
          const severity = report.content?.severity ?? report.aiDraft?.severity ?? legacyAi?.severity ?? 'medium';
          const title = report.content?.title ?? report.aiDraft?.title ?? '';
          const description = report.content?.description ?? report.aiDraft?.description ?? legacyAi?.summary ?? '';
          const suggestedFix = report.content?.suggestedFix ?? report.aiDraft?.suggestedFix ?? '';
          const confidence = report.aiDraft?.confidence ?? legacyAi?.confidence ?? 0;

          return {
            id: report._id?.toString(),
            createdAt: toISOString(report.createdAt),
            coordinates: {
              lat: report.location?.coordinates?.[1] ?? 0,
              lng: report.location?.coordinates?.[0] ?? 0,
            },
            mediaUrl: report.media?.url ?? '',
            mediaType: report.media?.type ?? 'image',
            fileName: report.media?.fileName ?? '',
            fileSize: report.media?.fileSize ?? 0,
            thumbnailUrl: report.media?.thumbnailUrl || null,
            cloudinaryPublicId: report.media?.cloudinaryPublicId || null,
            imageWidth: report.media?.imageWidth || null,
            imageHeight: report.media?.imageHeight || null,
            imageBytes: report.media?.imageBytes || null,
            aiDraft: {
              title: report.aiDraft?.title ?? title,
              description: report.aiDraft?.description ?? description,
              suggestedFix: report.aiDraft?.suggestedFix ?? suggestedFix,
              category: report.aiDraft?.category ?? category,
              severity: report.aiDraft?.severity ?? severity,
              confidence: confidence,
              generatedAt: toISOString(report.aiDraft?.generatedAt),
              estimatedCost: report.aiDraft?.estimatedCost,
            },
            content: {
              title: title || 'Accessibility Barrier',
              description: description,
              suggestedFix: suggestedFix,
              category: category,
              severity: severity,
              isEdited: report.content?.isEdited ?? false,
            },
            geoMethod: report.geoMethod ?? 'manual',
            status: report.status ?? 'open',
          };
        } catch (err) {
          console.error('Failed to transform report:', report._id, err);
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Return with pagination metadata if pagination was requested
    if (page > 0 && limit > 0) {
      return NextResponse.json({
        data: transformedReports,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Return flat array for backwards compatibility
    return NextResponse.json(transformedReports);
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      coordinates,
      mediaUrl,
      mediaType,
      fileName,
      fileSize,
      // New Cloudinary fields (nullable)
      thumbnailUrl,
      cloudinaryPublicId,
      imageWidth,
      imageHeight,
      imageBytes,
      aiDraft,  // AI-generated content
      content,  // User's final content (may be edited)
      geoMethod
    } = body;

    // Validate mediaUrl - reject blob URLs as they won't persist
    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Media URL is required' },
        { status: 400 }
      );
    }

    if (mediaUrl.startsWith('blob:')) {
      return NextResponse.json(
        { error: 'Invalid media URL. Blob URLs are not allowed. Please upload the file first.' },
        { status: 400 }
      );
    }

    // Validate that URL is either a valid HTTP(S) URL or a data URL
    const isValidUrl = mediaUrl.startsWith('http://') ||
                       mediaUrl.startsWith('https://') ||
                       mediaUrl.startsWith('data:');
    if (!isValidUrl) {
      return NextResponse.json(
        { error: 'Invalid media URL format. Must be HTTP(S) or data URL.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Create the report document
    const now = new Date();

    // Determine if user edited the AI draft
    const isEdited =
      content.title !== aiDraft.title ||
      content.description !== aiDraft.description ||
      content.suggestedFix !== aiDraft.suggestedFix ||
      content.category !== aiDraft.category ||
      content.severity !== aiDraft.severity;

    const report: DbReport = {
      createdAt: now,
      updatedAt: now,
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat], // GeoJSON uses [lng, lat]
      },
      media: {
        type: mediaType,
        url: mediaUrl,
        fileName,
        fileSize,
        // New Cloudinary fields (nullable for backwards compatibility)
        thumbnailUrl: thumbnailUrl || null,
        cloudinaryPublicId: cloudinaryPublicId || null,
        imageWidth: imageWidth || null,
        imageHeight: imageHeight || null,
        imageBytes: imageBytes || null,
      },
      aiDraft: {
        title: aiDraft.title,
        description: aiDraft.description,
        suggestedFix: aiDraft.suggestedFix,
        category: aiDraft.category,
        severity: aiDraft.severity,
        confidence: aiDraft.confidence,
        generatedAt: now,
        estimatedCost: aiDraft.estimatedCost,
      },
      content: {
        title: content.title,
        description: content.description,
        suggestedFix: content.suggestedFix,
        category: content.category,
        severity: content.severity,
        isEdited,
      },
      geoMethod,
      status: 'open',
    };

    // Try to find matching area for routing
    const matchingArea = await db.collection('areas').findOne({
      polygon: {
        $geoIntersects: {
          $geometry: report.location,
        },
      },
      isActive: true,
    });

    if (matchingArea) {
      report.routing = {
        assignedAreaId: matchingArea._id.toString(),
        matchedBy: 'geoWithin',
        matchedAt: now,
      };
    }

    const result = await db.collection<DbReport>('reports').insertOne(report);

    // Return the created report in frontend format
    const createdReport = {
      id: result.insertedId.toString(),
      createdAt: report.createdAt.toISOString(),
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      mediaUrl: report.media.url,
      mediaType: report.media.type,
      fileName: report.media.fileName,
      fileSize: report.media.fileSize,
      thumbnailUrl: report.media.thumbnailUrl || null,
      cloudinaryPublicId: report.media.cloudinaryPublicId || null,
      imageWidth: report.media.imageWidth || null,
      imageHeight: report.media.imageHeight || null,
      imageBytes: report.media.imageBytes || null,
      aiDraft: {
        title: report.aiDraft.title,
        description: report.aiDraft.description,
        suggestedFix: report.aiDraft.suggestedFix,
        category: report.aiDraft.category,
        severity: report.aiDraft.severity,
        confidence: report.aiDraft.confidence,
        generatedAt: report.aiDraft.generatedAt.toISOString(),
        estimatedCost: report.aiDraft.estimatedCost,
      },
      content: {
        title: report.content.title,
        description: report.content.description,
        suggestedFix: report.content.suggestedFix,
        category: report.content.category,
        severity: report.content.severity,
        isEdited: report.content.isEdited,
      },
      geoMethod: report.geoMethod,
      status: report.status,
    };

    return NextResponse.json(createdReport, { status: 201 });
  } catch (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
