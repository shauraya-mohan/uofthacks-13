import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DbReport } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/reports - List all reports with optional pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const status = searchParams.get('status'); // Optional status filter
    const severity = searchParams.get('severity'); // Optional severity filter

    const db = await getDatabase();

    // Build query filter
    const filter: any = {};
    if (status && ['open', 'acknowledged', 'resolved'].includes(status)) {
      filter.status = status;
    }
    if (severity && ['low', 'medium', 'high'].includes(severity)) {
      filter['ai.severity'] = severity;
    }

    // Get total count for pagination metadata
    const total = await db.collection<DbReport>('reports').countDocuments(filter);

    // Build query with optional pagination
    let query = db
      .collection<DbReport>('reports')
      .find(filter)
      .sort({ createdAt: -1 });

    // Apply pagination only if both page and limit are provided and valid
    if (page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    } else if (limit > 0) {
      // Just limit without page
      query = query.limit(limit);
    }

    const reports = await query.toArray();

    // Transform to match frontend Report type
    const transformedReports = reports.map((report) => ({
      id: report._id?.toString(),
      createdAt: report.createdAt.toISOString(),
      coordinates: {
        lat: report.location.coordinates[1],
        lng: report.location.coordinates[0],
      },
      mediaUrl: report.media.url,
      mediaType: report.media.type,
      fileName: report.media.fileName,
      fileSize: report.media.fileSize,
      analysis: {
        category: report.ai.category,
        severity: report.ai.severity,
        summary: report.ai.summary,
        confidence: report.ai.confidence,
      },
      geoMethod: report.geoMethod,
      status: report.status,
    }));

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
    const { coordinates, mediaUrl, mediaType, fileName, fileSize, analysis, geoMethod } = body;

    const db = await getDatabase();

    // Create the report document
    const now = new Date();
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
      },
      ai: {
        category: analysis.category,
        severity: analysis.severity,
        summary: analysis.summary,
        confidence: analysis.confidence,
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
      analysis: {
        category: report.ai.category,
        severity: report.ai.severity,
        summary: report.ai.summary,
        confidence: report.ai.confidence,
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
