import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sales-lists/versions/[versionId] - Get version details with units
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const resolvedParams = await params
    const versionId = resolvedParams.versionId

    // Get version details
    const { data: version, error: versionError } = await supabase
      .from('sales_list_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (versionError) {
      console.error('Error fetching version:', versionError)
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Get version units
    const { data: units, error: unitsError } = await supabase
      .from('sales_list_version_units')
      .select('*')
      .eq('version_id', versionId)
      .order('unit_number')

    if (unitsError) {
      console.error('Error fetching version units:', unitsError)
      return NextResponse.json({ error: 'Failed to fetch version units' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        version,
        units
      }
    })
  } catch (error) {
    console.error('Version details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sales-lists/versions/[versionId] - Delete a version (if not current)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const resolvedParams = await params
    const versionId = resolvedParams.versionId

    // Check if version is current
    const { data: version, error: checkError } = await supabase
      .from('sales_list_versions')
      .select('is_current')
      .eq('id', versionId)
      .single()

    if (checkError) {
      console.error('Error checking version:', checkError)
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    if (version.is_current) {
      return NextResponse.json({ error: 'Cannot delete current version' }, { status: 400 })
    }

    // Delete version (cascade will delete related units)
    const { error } = await supabase
      .from('sales_list_versions')
      .delete()
      .eq('id', versionId)

    if (error) {
      console.error('Error deleting version:', error)
      return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
