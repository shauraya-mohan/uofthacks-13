import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DbReport } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { deleteFromCloudinary } from '@/lib/cloudinary';

const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Helper to safely convert date to ISO string
function toISOString(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  return date.toISOString();
}

// GET /api/reports/[id] - Get a single report with full media data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const report = await db.collection<DbReport>('reports').findOne({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: new ObjectId(id) as any,
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend Report type
    const transformedReport = {
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
        title: report.aiDraft?.title ?? '',
        description: report.aiDraft?.description ?? '',
        suggestedFix: report.aiDraft?.suggestedFix ?? '',
        category: report.aiDraft?.category ?? 'other',
        severity: report.aiDraft?.severity ?? 'medium',
        confidence: report.aiDraft?.confidence ?? 0,
        generatedAt: toISOString(report.aiDraft?.generatedAt),
        estimatedCost: report.aiDraft?.estimatedCost,
      },
      content: {
        title: report.content?.title ?? '',
        description: report.content?.description ?? '',
        suggestedFix: report.content?.suggestedFix ?? '',
        category: report.content?.category ?? 'other',
        severity: report.content?.severity ?? 'medium',
        isEdited: report.content?.isEdited ?? false,
      },
      geoMethod: report.geoMethod ?? 'manual',
      status: report.status ?? 'open',
    };

    return NextResponse.json(transformedReport);
  } catch (error) {
    console.error('Failed to fetch report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // First, fetch the report to get cloudinaryPublicId for cleanup
    const report = await db.collection<DbReport>('reports').findOne({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: new ObjectId(id) as any,
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if public_id exists
    const publicId = report.media?.cloudinaryPublicId;
    if (publicId && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET && CLOUDINARY_CLOUD_NAME) {
      try {
        await deleteFromCloudinary(
          publicId,
          CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET,
          CLOUDINARY_CLOUD_NAME
        );
        console.log(`Deleted Cloudinary image: ${publicId}`);
      } catch (cloudinaryError) {
        // Log but don't fail the delete operation
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
      }
    }

    // Delete from MongoDB
    const result = await db.collection('reports').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id] - Update report status or cost
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, aiDraft } = body;

    // Validate status if provided
    const validStatuses = ['open', 'acknowledged', 'in_progress', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: open, acknowledged, in_progress, or resolved' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    // Update cost if aiDraft with estimatedCost is provided
    if (aiDraft?.estimatedCost) {
      updateData['aiDraft.estimatedCost'] = {
        amount: aiDraft.estimatedCost.amount,
        unit: aiDraft.estimatedCost.unit,
        quantity: aiDraft.estimatedCost.quantity,
      };
    }

    const result = await db.collection('reports').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: result,
    });
  } catch (error) {
    console.error('Failed to update report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

