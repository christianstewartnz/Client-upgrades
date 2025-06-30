import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const unitId = formData.get('unitId') as string
    const file = formData.get('file') as File

    if (!unitId || !file) {
      return NextResponse.json({ error: 'Missing unitId or file' }, { status: 400 })
    }

    // Create a unique filename
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${safeFileName}`
    
    // Create directory if it doesn't exist
    const dirPath = join(process.cwd(), 'public', 'floor-plans')
    try {
      await mkdir(dirPath, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }
    
    // Save file to public directory
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(dirPath, fileName)
    await writeFile(filePath, buffer)

    // Update the unit's floor plan file in the database (store relative path)
    const publicPath = `/floor-plans/${fileName}`
    const { data, error } = await supabase
      .from('units')
      .update({ floor_plan_url: publicPath })
      .eq('id', unitId)
      .select()

    if (error) {
      console.error('Database error updating floor plan:', error)
      return NextResponse.json({ 
        error: `Failed to update floor plan: ${error.message}` 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      unit: data[0],
      fileName: fileName,
      url: publicPath
    })

  } catch (error) {
    console.error('Error updating floor plan:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 