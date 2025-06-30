"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, MapPin, Info, ZoomIn, ZoomOut, Maximize, Move, RotateCcw } from "lucide-react"
import type { FloorPlanPoint, ClientUpgrade } from '@/types/client'
import { PDFCanvas } from './pdf-canvas'

interface FloorPlanStepProps {
  selected_upgrades: ClientUpgrade[]
  on_upgrades_change: (upgrades: ClientUpgrade[]) => void
  unit_type: string
  unit_id?: string
  floor_plan_url?: string
}

export function FloorPlanStep({
  selected_upgrades,
  on_upgrades_change,
  unit_type,
  unit_id,
  floor_plan_url,
}: FloorPlanStepProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null)
  const [allPoints, setAllPoints] = useState<FloorPlanPoint[]>([])

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // Use provided floor plan URL or fallback to placeholder
  const planUrl = floor_plan_url || "/placeholder.svg?height=600&width=800"
  const isPdf = planUrl.toLowerCase().endsWith('.pdf')

  // Get electrical and lighting upgrades only
  const electricalUpgrades = selected_upgrades.filter(
    (upgrade) => upgrade.category === "Electrical" || upgrade.category === "Lighting",
  )

  // Define symbols and colors for different upgrade types
  const getUpgradeSymbol = (upgradeName: string) => {
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

  useEffect(() => {
    if (planUrl) {
      if (isPdf) {
        // For PDFs, set proper A4 dimensions
        const container = containerRef.current
        if (container) {
          // A4 aspect ratio: 210mm x 297mm ≈ 1:1.414
          const containerWidth = container.clientWidth
          const maxWidth = Math.min(containerWidth - 40, 800) // Leave space for controls
          const pdfWidth = maxWidth
          const pdfHeight = maxWidth * 1.414 // A4 aspect ratio
          
          setImageDimensions({ width: pdfWidth, height: pdfHeight })
          setImageLoaded(true)
        }
      } else if (canvasRef.current) {
        // Handle images as before
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const img = new Image()

        img.onload = () => {
          const container = containerRef.current
          if (container) {
            const containerWidth = container.clientWidth
            const aspectRatio = img.height / img.width
            const canvasWidth = Math.min(containerWidth, 800)
            const canvasHeight = canvasWidth * aspectRatio

            canvas.width = canvasWidth
            canvas.height = canvasHeight

            setImageDimensions({ width: canvasWidth, height: canvasHeight })

            // Draw the floor plan
            ctx?.drawImage(img, 0, 0, canvasWidth, canvasHeight)
            setImageLoaded(true)

            // Redraw existing points
            drawPoints()
          }
        }

        img.src = planUrl
      }
    }
  }, [planUrl, isPdf])

  useEffect(() => {
    if (imageLoaded) {
      drawPoints()
    }
  }, [allPoints, imageLoaded])

  useEffect(() => {
    loadExistingPoints()
  }, [selected_upgrades])

  const loadExistingPoints = () => {
    const existingPoints: FloorPlanPoint[] = []
    electricalUpgrades.forEach((upgrade) => {
      if (upgrade.floor_plan_points) {
        existingPoints.push(...upgrade.floor_plan_points)
      }
    })
    setAllPoints(existingPoints)
  }

  const drawPoints = () => {
    if (isPdf) {
      // For PDFs, points are handled by the overlay div
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !imageLoaded || !planUrl) return

    // Redraw the image first
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height)

      // Draw all points
      allPoints.forEach((point) => {
        // Draw circle background
        ctx.beginPath()
        ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI)
        ctx.fillStyle = point.color
        ctx.fill()
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw symbol text
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 8px Arial"
        ctx.textAlign = "center"
        ctx.fillText(point.symbol, point.x, point.y + 2)
      })
    }
    img.src = planUrl
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!selectedUpgradeId || !isSelecting || isPanning) return

    const element = isPdf ? overlayRef.current : canvasRef.current
    if (!element) return

    let x, y
    if (isPdf) {
      // For PDFs, convert screen coordinates to PDF coordinates
      const coords = screenToPdfCoordinates(event.clientX, event.clientY)
      x = coords.x
      y = coords.y
    } else {
      // For images, use direct coordinates
      const rect = element.getBoundingClientRect()
      x = event.clientX - rect.left
      y = event.clientY - rect.top
    }

    const selectedUpgrade = electricalUpgrades.find((u) => u.id === selectedUpgradeId)
    if (!selectedUpgrade) return

    // Check if we've reached the quantity limit for this upgrade
    const existingPointsForUpgrade = allPoints.filter((p) => p.upgrade_id === selectedUpgradeId)
    if (existingPointsForUpgrade.length >= selectedUpgrade.quantity) {
      return
    }

    // Create new point
    const upgradeSymbol = getUpgradeSymbol(selectedUpgrade.name)
    const newPoint: FloorPlanPoint = {
      id: Date.now().toString(),
      x,
      y,
      upgrade_id: selectedUpgradeId,
      upgrade_name: selectedUpgrade.name,
      label: `${upgradeSymbol.symbol} ${existingPointsForUpgrade.length + 1}`,
      symbol: upgradeSymbol.symbol,
      color: upgradeSymbol.color,
    }

    // Add to all points
    const updatedPoints = [...allPoints, newPoint]
    setAllPoints(updatedPoints)

    // Update the upgrade with new floor plan points
    const updatedPointsForUpgrade = [...existingPointsForUpgrade, newPoint]
    updateUpgradePoints(selectedUpgradeId, updatedPointsForUpgrade)

    // If we've reached the quantity, stop selecting
    if (updatedPointsForUpgrade.length >= selectedUpgrade.quantity) {
      setIsSelecting(false)
      setSelectedUpgradeId(null)
    }
  }

  const updateUpgradePoints = (upgradeId: string, points: FloorPlanPoint[]) => {
    const updatedUpgrades = selected_upgrades.map((upgrade) =>
      upgrade.id === upgradeId ? { ...upgrade, floor_plan_points: points } : upgrade,
    )
    on_upgrades_change(updatedUpgrades)
  }

  const removePoint = (pointId: string) => {
    const pointToRemove = allPoints.find((p) => p.id === pointId)
    if (!pointToRemove) return

    const updatedPoints = allPoints.filter((p) => p.id !== pointId)
    setAllPoints(updatedPoints)

    const updatedPointsForUpgrade = updatedPoints.filter((p) => p.upgrade_id === pointToRemove.upgrade_id)
    updateUpgradePoints(pointToRemove.upgrade_id, updatedPointsForUpgrade)
  }

  const getPointsForUpgrade = (upgradeId: string) => {
    return allPoints.filter((p) => p.upgrade_id === upgradeId)
  }

  const getTotalPointsNeeded = () => {
    return electricalUpgrades.reduce((total, upgrade) => total + upgrade.quantity, 0)
  }

  const getTotalPointsPlaced = () => {
    return allPoints.length
  }

  const canProceed = () => {
    return getTotalPointsPlaced() >= getTotalPointsNeeded()
  }

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.25))
  }

  const handleFitToWidth = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Pan functionality
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0 && !isSelecting) { // Left mouse button and not in selecting mode
      setIsPanning(true)
      setLastPanPoint({ x: event.clientX, y: event.clientY })
      event.preventDefault()
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isPanning && !isSelecting) {
      const deltaX = event.clientX - lastPanPoint.x
      const deltaY = event.clientY - lastPanPoint.y
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setLastPanPoint({ x: event.clientX, y: event.clientY })
      event.preventDefault()
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
  }

  // Convert screen coordinates to PDF coordinates accounting for zoom and pan
  const screenToPdfCoordinates = (screenX: number, screenY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return { x: screenX, y: screenY }
    
    // For canvas-based PDF, coordinates are relative to the container
    const x = (screenX - rect.left - pan.x) / zoom
    const y = (screenY - rect.top - pan.y) / zoom
    
    return { x, y }
  }

  if (!planUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No floor plan available for this unit type.</p>
          <p className="text-sm text-gray-400 mt-1">Please contact the development team for assistance.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Locations on Floor Plan
        </CardTitle>
        <CardDescription>
          Click on the floor plan to select locations for electrical upgrades. You must place all required points before
          proceeding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upgrade Selection */}
        {electricalUpgrades.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Select an upgrade to place:</h4>
            <div className="flex flex-wrap gap-2">
              {electricalUpgrades.map((upgrade) => {
                const placedCount = getPointsForUpgrade(upgrade.id).length
                const isComplete = placedCount >= upgrade.quantity
                const isSelected = selectedUpgradeId === upgrade.id
                
                return (
                  <Button
                    key={upgrade.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedUpgradeId(isSelected ? null : upgrade.id)}
                    disabled={isComplete}
                    className={`flex items-center gap-2 ${
                      isComplete ? "bg-green-50 border-green-200 text-green-700" : ""
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: getUpgradeSymbol(upgrade.name).color }}
                    />
                    {upgrade.name} ({placedCount}/{upgrade.quantity})
                    {isComplete && <span className="text-green-600">✓</span>}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={isSelecting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelecting(!isSelecting)}
              disabled={getTotalPointsPlaced() >= getTotalPointsNeeded() || !selectedUpgradeId}
            >
              {isSelecting ? "Stop Selecting" : "Start Placing Points"}
            </Button>
            {allPoints.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setAllPoints([])}>
                Clear All
              </Button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {getTotalPointsPlaced()} / {getTotalPointsNeeded()} locations selected
          </div>
        </div>

        {selectedUpgradeId && !isSelecting && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <Info className="w-4 h-4 inline mr-1" />
              Click "Start Placing Points" then click on the floor plan to place{" "}
              {electricalUpgrades.find(u => u.id === selectedUpgradeId)?.name} locations.
              {isPdf && " Use zoom and pan controls to navigate to the exact location."}
            </p>
          </div>
        )}

        {/* Zoom Controls - Only show for PDFs */}
        {isPdf && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
            <span className="text-sm font-medium text-gray-700">View Controls:</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleFitToWidth} title="Fit to Width">
                <Maximize className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView} title="Reset View">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Move className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">
                {isSelecting ? "Click to place points" : "Drag to pan, use controls to zoom"}
              </span>
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </div>
        )}

        {/* Floor Plan Display */}
        <div ref={containerRef} className="border rounded-lg overflow-hidden bg-gray-50 relative">
          {isPdf ? (
            <>
              {/* Enhanced PDF Viewer */}
              <div 
                className="relative bg-white"
                style={{ 
                  height: '600px',
                  overflow: 'hidden',
                  cursor: isPanning ? 'grabbing' : (isSelecting ? 'crosshair' : 'grab'),
                  userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {/* PDF Canvas Component */}
                <PDFCanvas
                  pdfUrl={planUrl}
                  width={imageDimensions.width}
                  height={imageDimensions.height}
                  zoom={zoom}
                  pan={pan}
                  onLoadComplete={(success) => setImageLoaded(success)}
                />

                {/* Overlay for click detection and points */}
                <div
                  ref={overlayRef}
                  onClick={handleClick}
                  className="absolute inset-0"
                  style={{ 
                    zIndex: 10,
                    pointerEvents: 'auto' // Always allow pointer events for both clicking and panning
                  }}
                >
                  {/* Render points on overlay */}
                  {allPoints.map((point) => (
                    <div
                      key={point.id}
                      className="absolute w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white shadow-lg pointer-events-none"
                      style={{
                        backgroundColor: point.color,
                        left: `${(point.x * zoom) + pan.x - 10}px`,
                        top: `${(point.y * zoom) + pan.y - 10}px`,
                        transform: `scale(${Math.max(0.8, 1/zoom)})`, // Keep points readable at all zoom levels
                        zIndex: 20,
                      }}
                    >
                      {point.symbol}
                    </div>
                  ))}
                </div>

                {/* Instructions overlay */}
                {!isSelecting && (
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs px-3 py-2 rounded pointer-events-none">
                    Drag to pan • Use zoom controls above
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Image Canvas */
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              className={`max-w-full h-auto ${isSelecting ? "cursor-crosshair" : "cursor-default"}`}
              style={{ display: "block" }}
            />
          )}
        </div>

        {/* Selected Points List */}
        {allPoints.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Selected Locations:</h4>
            <div className="flex flex-wrap gap-2">
              {allPoints.map((point) => (
                <Badge key={point.id} variant="secondary" className="flex items-center gap-1">
                  {point.label}
                  <button
                    onClick={() => removePoint(point.id)}
                    className="ml-1 hover:text-red-500 focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
