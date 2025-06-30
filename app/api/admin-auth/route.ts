import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Username and password are required' 
      }, { status: 400 })
    }

    // For demo purposes, we'll use simple credentials
    // In production, this should check against a proper admin users table
    const validAdmins = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'administrator', password: 'admin2024', role: 'admin' },
      { username: 'demo', password: 'demo', role: 'admin' },
      { username: 'test', password: 'test', role: 'admin' },
      { username: 'manager', password: 'password', role: 'admin' },
      { username: 'user', password: 'password', role: 'admin' },
      { username: 'root', password: 'root', role: 'admin' },
      // Add more admin users as needed
    ]

    const admin = validAdmins.find(
      a => a.username === username && a.password === password
    )

    if (!admin) {
      console.log('Admin authentication failed for username:', username)
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    // Return admin data (excluding password)
    return NextResponse.json({
      success: true,
      admin: {
        username: admin.username,
        role: admin.role
      }
    })

  } catch (error) {
    console.error('Admin auth error:', error)
    
    // Ensure we always return JSON, even for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Authentication failed: ' + errorMessage },
      { status: 500 }
    )
  }
} 