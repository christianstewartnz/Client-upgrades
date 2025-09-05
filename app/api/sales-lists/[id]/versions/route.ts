import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sales-lists/[id]/versions - Get all versions for a sales list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const salesListId = resolvedParams.id

    const { data, error } = await supabase
      .from('sales_list_versions')
      .select('*')
      .eq('sales_list_id', salesListId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Error fetching sales list versions:', error)
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Sales list versions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sales-lists/[id]/versions - Create a new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const salesListId = resolvedParams.id
    const body = await request.json()
    const { version_name, description, created_by } = body

    if (!created_by) {
      return NextResponse.json({ error: 'created_by is required' }, { status: 400 })
    }

    // Call the database function to create version
    const { data, error } = await supabase.rpc('create_sales_list_version', {
      p_sales_list_id: salesListId,
      p_version_name: version_name || null,
      p_description: description || null,
      p_created_by: created_by
    })

    if (error) {
      console.error('Error creating sales list version:', error)
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
    }

    // Fetch the created version details
    const { data: versionData, error: fetchError } = await supabase
      .from('sales_list_versions')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) {
      console.error('Error fetching created version:', fetchError)
      return NextResponse.json({ error: 'Version created but failed to fetch details' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: versionData })
  } catch (error) {
    console.error('Create version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
