"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, MapPin, Info } from "lucide-react"
import type { FloorPlanPoint, ClientUpgrade } from '@/types/client'

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
        // For PDFs, we'll set up the overlay after the PDF loads
        const container = containerRef.current
        if (container) {
          // Set standard dimensions for PDF display
          const containerWidth = container.clientWidth
          const canvasWidth = Math.min(containerWidth, 800)
          const canvasHeight = canvasWidth * 1.2 // Standard PDF aspect ratio

          setImageDimensions({ width: canvasWidth, height: canvasHeight })
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
        ctx.arc(point.x, point.y, 16, 0, 2 * Math.PI)
        ctx.fillStyle = point.color
        ctx.fill()
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw symbol text
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 10px Arial"
        ctx.textAlign = "center"
        ctx.fillText(point.symbol, point.x, point.y + 3)
      })
    }
    img.src = planUrl
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!selectedUpgradeId) return

    const element = isPdf ? overlayRef.current : canvasRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const selectedUpgrade = electricalUpgrades.find((u) => u.id === selectedUpgradeId)
    if (!selectedUpgrade) return

    // Check if we've reached the quantity limit for this upgrade
    const existingPointsForUpgrade = allPoints.filter((p) => p.upgrade_id === selectedUpgradeId)
    if (existingPointsForUpgrade.length >= selectedUpgrade.quantity) return

    const { symbol, color } = getUpgradeSymbol(selectedUpgrade.name)

    const newPoint: FloorPlanPoint = {
      id: `point-${Date.now()}`,
      x,
      y,
      label: `${selectedUpgrade.name} #${existingPointsForUpgrade.length + 1}`,
      upgrade_id: selectedUpgradeId,
      upgrade_name: selectedUpgrade.name,
      symbol,
      color,
    }

    const updatedPoints = [...allPoints, newPoint]
    setAllPoints(updatedPoints)

    // Update the upgrade with the new point
    updateUpgradePoints(
      selectedUpgradeId,
      updatedPoints.filter((p) => p.upgrade_id === selectedUpgradeId),
    )
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

    // Update the upgrade with the removed point
    updateUpgradePoints(
      pointToRemove.upgrade_id,
      updatedPoints.filter((p) => p.upgrade_id === pointToRemove.upgrade_id),
    )
  }

  const getPointsForUpgrade = (upgradeId: string) => {
    return allPoints.filter((p) => p.upgrade_id === upgradeId)
  }

  const getTotalPointsNeeded = () => {
    return electricalUpgrades.reduce((sum, upgrade) => sum + upgrade.quantity, 0)
  }

  const getTotalPointsPlaced = () => {
    return allPoints.length
  }

  const canProceed = () => {
    return electricalUpgrades.every((upgrade) => {
      const placedPoints = getPointsForUpgrade(upgrade.id).length
      return placedPoints === upgrade.quantity
    })
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
              {isSelecting ? "Stop Selecting" : "Start Selecting"}
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
              Click "Start Selecting" then click on the floor plan to place{" "}
              {electricalUpgrades.find(u => u.id === selectedUpgradeId)?.name} locations.
              {isPdf && " Note: Click directly on the floor plan area, not the PDF viewer controls."}
            </p>
          </div>
        )}

        {/* Floor Plan Display */}
        <div ref={containerRef} className="border rounded-lg overflow-hidden bg-gray-50 relative">
          {isPdf ? (
            <>
              {/* PDF Embed */}
              <iframe
                src={planUrl}
                className="w-full h-96 border-0"
                title="Floor Plan PDF"
                onLoad={() => setImageLoaded(true)}
              />
              {/* Overlay for click detection */}
              <div
                ref={overlayRef}
                onClick={handleClick}
                className={`absolute inset-0 ${isSelecting ? "cursor-crosshair" : "cursor-default"}`}
                style={{ 
                  width: imageDimensions.width || '100%', 
                  height: imageDimensions.height || '100%' 
                }}
              >
                {/* Render points on overlay */}
                {allPoints.map((point) => (
                  <div
                    key={point.id}
                    className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg"
                    style={{
                      backgroundColor: point.color,
                      left: `${point.x - 16}px`,
                      top: `${point.y - 16}px`,
                    }}
                  >
                    {point.symbol}
                  </div>
                ))}
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
