import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { validateEmails } from '@/lib/email';

// DELETE /api/areas/[id] - Delete an area
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid area ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection('areas').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete area:', error);
    return NextResponse.json(
      { error: 'Failed to delete area' },
      { status: 500 }
    );
  }
}

// PATCH /api/areas/[id] - Update area
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid area ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, priority, isActive, notificationEmails } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Handle notification emails update
    if (notificationEmails !== undefined) {
      if (!Array.isArray(notificationEmails)) {
        return NextResponse.json(
          { error: 'notificationEmails must be an array' },
          { status: 400 }
        );
      }

      const { valid, invalid } = validateEmails(notificationEmails);

      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid email addresses: ${invalid.join(', ')}` },
          { status: 400 }
        );
      }

      updateData.notificationEmails = valid;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection('areas').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend format
    const updatedArea = {
      id: result._id?.toString(),
      name: result.name,
      geometry: result.polygon,
      createdAt: result.createdAt.toISOString(),
      notificationEmails: result.notificationEmails || [],
    };

    return NextResponse.json(updatedArea);
  } catch (error) {
    console.error('Failed to update area:', error);
    return NextResponse.json(
      { error: 'Failed to update area' },
      { status: 500 }
    );
  }
}
