"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, MapPin } from "lucide-react"
import type { FloorPlanPoint } from '@/types/client'

interface FloorPlanSelectorProps {
  floor_plan_url: string
  selected_points: FloorPlanPoint[]
  on_points_change: (points: FloorPlanPoint[]) => void
  max_points?: number
  upgrade_type: string
}

export function FloorPlanSelector({
  floor_plan_url,
  selected_points,
  on_points_change,
  max_points = 10,
  upgrade_type,
}: FloorPlanSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (floor_plan_url && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Set canvas size to match container
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

      img.src = floor_plan_url
    }
  }, [floor_plan_url])

  useEffect(() => {
    if (imageLoaded) {
      drawPoints()
    }
  }, [selected_points, imageLoaded])

  const drawPoints = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !imageLoaded) return

    // Redraw the image first
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height)

      // Draw all points
      selected_points.forEach((point, index) => {
        // Draw point circle
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = "#3B82F6"
        ctx.fill()
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw point number
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.fillText((index + 1).toString(), point.x, point.y + 4)
      })
    }
    img.src = floor_plan_url
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || selected_points.length >= max_points) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const newPoint: FloorPlanPoint = {
      id: `point-${Date.now()}`,
      x,
      y,
      label: `${upgrade_type} #${selected_points.length + 1}`,
      upgrade_id: `${upgrade_type.toLowerCase()}-${Date.now()}`,
      upgrade_name: upgrade_type,
      symbol: upgrade_type.substring(0, 2).toUpperCase(),
      color: "#3B82F6", // Default blue color
    }

    on_points_change([...selected_points, newPoint])
  }

  const removePoint = (pointId: string) => {
    const updatedPoints = selected_points
      .filter((p) => p.id !== pointId)
      .map((point, index) => ({
        ...point,
        label: `${upgrade_type} #${index + 1}`,
      }))
    on_points_change(updatedPoints)
  }

  const clearAllPoints = () => {
    on_points_change([])
  }

  if (!floor_plan_url) {
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
          Click on the floor plan to select locations for {upgrade_type.toLowerCase()}. You can select up to {max_points}{" "}
          locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={isSelecting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelecting(!isSelecting)}
              disabled={selected_points.length >= max_points}
            >
              {isSelecting ? "Stop Selecting" : "Start Selecting"}
            </Button>
            {selected_points.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllPoints}>
                Clear All
              </Button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {selected_points.length} / {max_points} locations selected
          </div>
        </div>

        {/* Floor Plan Canvas */}
        <div ref={containerRef} className="border rounded-lg overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`max-w-full h-auto ${isSelecting ? "cursor-crosshair" : "cursor-default"}`}
            style={{ display: "block" }}
          />
        </div>

        {/* Selected Points List */}
        {selected_points.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Selected Locations:</h4>
            <div className="flex flex-wrap gap-2">
              {selected_points.map((point, index) => (
                <Badge key={point.id} variant="secondary" className="flex items-center gap-1">
                  {index + 1}. {upgrade_type}
                  <button onClick={() => removePoint(point.id)} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isSelecting && selected_points.length < max_points && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Selection Mode Active:</strong> Click anywhere on the floor plan to add a location for{" "}
              {upgrade_type.toLowerCase()}.
            </p>
          </div>
        )}

        {selected_points.length >= max_points && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Maximum Reached:</strong> You've selected the maximum number of locations ({max_points}) for this
              upgrade.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
