import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/sales-lists/versions/[versionId]/restore - Restore sales list from version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const resolvedParams = await params
    const versionId = resolvedParams.versionId
    const body = await request.json()
    const { created_by } = body

    if (!created_by) {
      return NextResponse.json({ error: 'created_by is required' }, { status: 400 })
    }

    // Call the database function to restore from version
    const { data, error } = await supabase.rpc('restore_sales_list_from_version', {
      p_version_id: versionId,
      p_created_by: created_by
    })

    if (error) {
      console.error('Error restoring from version:', error)
      return NextResponse.json({ error: 'Failed to restore from version' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Restore version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
