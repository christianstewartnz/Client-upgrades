import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/sales-lists/versions/compare - Compare two versions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { version_id_1, version_id_2 } = body

    if (!version_id_1 || !version_id_2) {
      return NextResponse.json({ error: 'Both version_id_1 and version_id_2 are required' }, { status: 400 })
    }

    // Call the database function to compare versions
    const { data, error } = await supabase.rpc('compare_sales_list_versions', {
      p_version_id_1: version_id_1,
      p_version_id_2: version_id_2
    })

    if (error) {
      console.error('Error comparing versions:', error)
      return NextResponse.json({ error: 'Failed to compare versions' }, { status: 500 })
    }

    // Get version details for context
    const { data: version1, error: v1Error } = await supabase
      .from('sales_list_versions')
      .select('version_number, version_name, created_at')
      .eq('id', version_id_1)
      .single()

    const { data: version2, error: v2Error } = await supabase
      .from('sales_list_versions')
      .select('version_number, version_name, created_at')
      .eq('id', version_id_2)
      .single()

    if (v1Error || v2Error) {
      console.error('Error fetching version details:', v1Error || v2Error)
      return NextResponse.json({ error: 'Failed to fetch version details' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        comparison: data,
        version1: version1,
        version2: version2
      }
    })
  } catch (error) {
    console.error('Compare versions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
