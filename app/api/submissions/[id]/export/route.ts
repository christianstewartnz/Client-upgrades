import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import fs from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { exportTypes } = await request.json()
    const resolvedParams = await params
    const submissionId = resolvedParams.id

    // Fetch submission data
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const selectedUpgrades = submission.selected_upgrades ? JSON.parse(submission.selected_upgrades) : []

    // Also need to fetch the color scheme details
    let colorSchemeDetails = null
    if (submission.color_scheme) {
      const { data: colorScheme } = await supabase
        .from('color_schemes')
        .select('*')
        .ilike('name', submission.color_scheme)
        .single()
      
      colorSchemeDetails = colorScheme
    }

    const pdfs: { [key: string]: Buffer } = {}

    // Generate Finishes PDF
    if (exportTypes.includes('finishes')) {
      const finishesPdf = await generateFinishesPDF(submission, colorSchemeDetails)
      pdfs['finishes.pdf'] = finishesPdf
    }

    // Generate Upgrades PDF
    if (exportTypes.includes('upgrades')) {
      const upgradesPdf = await generateUpgradesPDF(submission, selectedUpgrades)
      pdfs['upgrades.pdf'] = upgradesPdf
    }

    // Generate Floor Plan PDF (if electrical upgrades exist)
    if (exportTypes.includes('floorplan')) {
      const hasElectricalUpgrades = selectedUpgrades.some((upgrade: any) => 
        upgrade.category === 'Electrical' || upgrade.category === 'Lighting'
      )
      
      if (hasElectricalUpgrades) {
        // Get unit details to fetch floor plan URL
        let unitDetails = null
        if (submission.unit_id) {
          const { data: unit } = await supabase
            .from('units')
            .select('floor_plan_url')
            .eq('id', submission.unit_id)
            .single()
          unitDetails = unit
        }
        
        const floorPlanPdf = await generateFloorPlanPDF(submission, selectedUpgrades, unitDetails)
        pdfs['electrical-plan.pdf'] = floorPlanPdf
      }
    }

    // If multiple PDFs requested, create ZIP
    if (Object.keys(pdfs).length > 1) {
      const zip = new JSZip()
      
      Object.entries(pdfs).forEach(([filename, buffer]) => {
        zip.file(filename, buffer)
      })

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
      
      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="submission-${submission.unit_number}-documents.zip"`
        }
      })
    } else {
      // Single PDF
      const [filename, buffer] = Object.entries(pdfs)[0]
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

async function generateFinishesPDF(submission: any, colorSchemeDetails: any): Promise<Buffer> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Header
  doc.setFontSize(20)
  doc.text('Finishes Selection', pageWidth / 2, 30, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`Unit: ${submission.unit_number}`, 20, 50)
  doc.text(`Project: ${submission.project_name}`, 20, 60)
  doc.text(`Date: ${submission.submitted_date}`, 20, 70)
  
  // Color scheme section
  doc.setFontSize(16)
  doc.text('Selected Finishes Scheme', 20, 95)
  
  doc.setFontSize(12)
  doc.text(`Scheme: ${submission.color_scheme || 'Not selected'}`, 20, 110)
  
  let yPosition = 125
  
  // Define the standard material fields
  const materialFields = [
    { key: 'paint', label: 'Paint', linkKey: 'paint_link' },
    { key: 'carpet', label: 'Carpet', linkKey: 'carpet_link' },
    { key: 'kitchen_floor', label: 'Kitchen Floor', linkKey: 'kitchen_floor_link' },
    { key: 'kitchen_splashback', label: 'Kitchen Splashback', linkKey: 'kitchen_splashback_link' },
    { key: 'bathroom_tiles', label: 'Bathroom Tiles', linkKey: 'bathroom_tiles_link' },
  ]
  
  // Check if we have color scheme details with materials
  if (colorSchemeDetails?.materials) {
    doc.setFontSize(14)
    doc.text('Materials & Finishes:', 20, yPosition)
    yPosition += 15
    
    let materials: any
    try {
      // Handle both JSON string and object formats
      materials = typeof colorSchemeDetails.materials === 'string' 
        ? JSON.parse(colorSchemeDetails.materials) 
        : colorSchemeDetails.materials
    } catch (e) {
      materials = colorSchemeDetails.materials
    }
    
    // If materials is an object (expected format), convert to display format
    if (materials && typeof materials === 'object') {
      materialFields.forEach(field => {
        const materialValue = materials[field.key]
        const linkValue = materials[field.linkKey]
        
        if (materialValue && materialValue.trim()) {
          doc.setFontSize(11)
          doc.text(`• ${field.label}: ${materialValue}`, 25, yPosition)
          yPosition += 8
          
          // Add supplier link if available
          if (linkValue && linkValue.trim()) {
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text(`  Supplier: ${linkValue}`, 30, yPosition)
            doc.setTextColor(0, 0, 0)
            yPosition += 6
          }
          
          yPosition += 2
          
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 30
          }
        }
      })
      
      // Handle any custom materials that might exist
      Object.keys(materials).forEach(key => {
        if (!key.endsWith('_link') && !materialFields.some(f => f.key === key)) {
          const value = materials[key]
          const linkValue = materials[`${key}_link`]
          
          if (value && value.trim()) {
            doc.setFontSize(11)
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
            doc.text(`• ${label}: ${value}`, 25, yPosition)
            yPosition += 8
            
            if (linkValue && linkValue.trim()) {
              doc.setFontSize(9)
              doc.setTextColor(100, 100, 100)
              doc.text(`  Supplier: ${linkValue}`, 30, yPosition)
              doc.setTextColor(0, 0, 0)
              yPosition += 6
            }
            
            yPosition += 2
            
            if (yPosition > 250) {
              doc.addPage()
              yPosition = 30
            }
          }
        }
      })
    }
  } else {
    // Fallback for when no detailed color scheme is found
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text('Material specifications not available for this scheme.', 20, yPosition)
    yPosition += 10
    doc.text('Please contact your sales representative for detailed material information.', 20, yPosition)
    doc.setTextColor(0, 0, 0)
  }
  
  return Buffer.from(doc.output('arraybuffer'))
}

async function generateUpgradesPDF(submission: any, selectedUpgrades: any[]): Promise<Buffer> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Header
  doc.setFontSize(20)
  doc.text('Upgrade Selections', pageWidth / 2, 30, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`Unit: ${submission.unit_number}`, 20, 50)
  doc.text(`Project: ${submission.project_name}`, 20, 60)
  doc.text(`Date: ${submission.submitted_date}`, 20, 70)
  
  let yPosition = 95
  
  if (selectedUpgrades.length > 0) {
    doc.setFontSize(16)
    doc.text('Selected Upgrades', 20, yPosition)
    yPosition += 20
    
    selectedUpgrades.forEach((upgrade, index) => {
      doc.setFontSize(12)
      doc.text(`${index + 1}. ${upgrade.name}`, 20, yPosition)
      yPosition += 8
      
      doc.setFontSize(10)
      doc.text(`   Category: ${upgrade.category}`, 20, yPosition)
      yPosition += 6
      doc.text(`   Quantity: ${upgrade.quantity}`, 20, yPosition)
      yPosition += 6
      doc.text(`   Unit Price: $${upgrade.price?.toLocaleString()}`, 20, yPosition)
      yPosition += 6
      doc.text(`   Total: $${(upgrade.price * upgrade.quantity).toLocaleString()}`, 20, yPosition)
      yPosition += 15
      
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }
    })
    
    // Totals
    yPosition += 10
    doc.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 10
    
    const subtotal = submission.upgrade_value
    const gst = Math.round(subtotal * 0.15)
    const total = subtotal + gst
    
    doc.setFontSize(12)
    doc.text(`Subtotal: $${subtotal.toLocaleString()}`, pageWidth - 80, yPosition, { align: 'right' })
    yPosition += 10
    doc.text(`GST (15%): $${gst.toLocaleString()}`, pageWidth - 80, yPosition, { align: 'right' })
    yPosition += 10
    doc.setFontSize(14)
    doc.text(`Total (incl. GST): $${total.toLocaleString()}`, pageWidth - 80, yPosition, { align: 'right' })
    
  } else {
    doc.setFontSize(14)
    doc.text('No upgrades selected', 20, yPosition)
  }
  
  return Buffer.from(doc.output('arraybuffer'))
}

async function generateFloorPlanPDF(submission: any, selectedUpgrades: any[], unitDetails: any): Promise<Buffer> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Header
  doc.setFontSize(20)
  doc.text('Electrical Plan Markups', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`Unit: ${submission.unit_number}`, 20, 35)
  doc.text(`Project: ${submission.project_name}`, 20, 42)
  doc.text(`Date: ${submission.submitted_date}`, 20, 49)
  
  // Filter electrical upgrades
  const electricalUpgrades = selectedUpgrades.filter(upgrade => 
    upgrade.category === 'Electrical' || upgrade.category === 'Lighting'
  )
  
  let hasFloorPlan = false
  
  // Try to load and embed the actual floor plan PDF
  if (unitDetails?.floor_plan_url) {
    try {
      // Convert relative URL to file path
      const floorPlanPath = path.join(process.cwd(), 'public', unitDetails.floor_plan_url)
      
      // Check if file exists
      const fileExists = await fs.access(floorPlanPath).then(() => true).catch(() => false)
      
      if (fileExists) {
        // Read the floor plan PDF file
        const floorPlanBuffer = await fs.readFile(floorPlanPath)
        
        // For now, we'll add the floor plan as a background and overlay markers
        // Note: jsPDF doesn't directly support PDF import, so we'll create a visual representation
        hasFloorPlan = true
        
        // Add floor plan placeholder (since jsPDF can't directly import PDFs)
        doc.setFillColor(240, 240, 240)
        doc.rect(20, 60, pageWidth - 40, 140, 'F')
        
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('Floor Plan: ' + path.basename(unitDetails.floor_plan_url), 25, 70)
        doc.text('(Original floor plan with electrical upgrade locations marked)', 25, 80)
        doc.setTextColor(0, 0, 0)
        
        // Draw upgrade markers on the floor plan area
        let markerY = 90
        electricalUpgrades.forEach((upgrade, upgradeIndex) => {
          if (upgrade.floor_plan_points && upgrade.floor_plan_points.length > 0) {
            upgrade.floor_plan_points.forEach((point: any, pointIndex: number) => {
              // Get upgrade symbol and color
              const symbol = getUpgradeSymbol(upgrade.name)
              
              // Calculate position within floor plan area (normalized)
              // Assuming the original coordinates are relative to a 800x600 area
              const normalizedX = 20 + ((point.x / 800) * (pageWidth - 40))
              const normalizedY = 90 + ((point.y / 400) * 100) // Scale to fit in the floor plan area
              
                             // Draw marker circle
               const rgb = hexToRgb(symbol.color)
               doc.setFillColor(rgb.r, rgb.g, rgb.b)
               doc.circle(normalizedX, normalizedY, 3, 'F')
              
              // Draw marker text
              doc.setFontSize(8)
              doc.setTextColor(255, 255, 255)
              doc.text(symbol.symbol, normalizedX - 1, normalizedY + 1, { align: 'center' })
              doc.setTextColor(0, 0, 0)
            })
          }
        })
      }
    } catch (error) {
      console.error('Error loading floor plan:', error)
    }
  }
  
  // Add legend below floor plan
  let yPosition = hasFloorPlan ? 210 : 60
  
  if (electricalUpgrades.length > 0) {
    doc.setFontSize(16)
    doc.text('Electrical Upgrade Legend', 20, yPosition)
    yPosition += 15
    
    electricalUpgrades.forEach((upgrade, index) => {
      const symbol = getUpgradeSymbol(upgrade.name)
      
             // Draw legend item
       const rgb = hexToRgb(symbol.color)
       doc.setFillColor(rgb.r, rgb.g, rgb.b)
       doc.circle(25, yPosition - 2, 2, 'F')
      
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text(symbol.symbol, 25 - 1, yPosition - 1, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      doc.setFontSize(11)
      doc.text(`${symbol.symbol} - ${upgrade.name}`, 35, yPosition)
      
      if (upgrade.floor_plan_points && upgrade.floor_plan_points.length > 0) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`(${upgrade.floor_plan_points.length} location${upgrade.floor_plan_points.length > 1 ? 's' : ''} marked)`, 35, yPosition + 6)
        doc.setTextColor(0, 0, 0)
        yPosition += 12
      } else {
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text('(No locations marked)', 35, yPosition + 6)
        doc.setTextColor(0, 0, 0)
        yPosition += 12
      }
      
      yPosition += 5
      
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = 30
      }
    })
    
    // Add footer note
    yPosition += 10
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Note: This document shows the approximate locations of electrical upgrades.', 20, yPosition)
    yPosition += 6
    doc.text('For exact placement details, refer to the digital floor plan in the client portal.', 20, yPosition)
    if (hasFloorPlan) {
      yPosition += 6
      doc.text('Original floor plan file: ' + path.basename(unitDetails?.floor_plan_url || ''), 20, yPosition)
    }
    
  } else {
    doc.setFontSize(14)
    doc.text('No electrical upgrades selected', 20, yPosition)
  }
  
  return Buffer.from(doc.output('arraybuffer'))
}

// Helper function to get upgrade symbol and color
function getUpgradeSymbol(upgradeName: string) {
  if (upgradeName.toLowerCase().includes("power outlets") || upgradeName.toLowerCase().includes("power points")) {
    return { symbol: "PP", color: "#3B82F6" } // Blue
  }
  if (upgradeName.toLowerCase().includes("usb")) {
    return { symbol: "USB", color: "#10B981" } // Green
  }
  if (upgradeName.toLowerCase().includes("light") || upgradeName.toLowerCase().includes("lighting")) {
    return { symbol: "L", color: "#F59E0B" } // Yellow
  }
  if (upgradeName.toLowerCase().includes("switch")) {
    return { symbol: "SW", color: "#8B5CF6" } // Purple
  }
  if (upgradeName.toLowerCase().includes("dimmer")) {
    return { symbol: "DIM", color: "#EF4444" } // Red
  }
  return { symbol: "E", color: "#6B7280" } // Gray for other electrical
}

// Helper function to convert hex color to RGB for jsPDF
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
} 