"use client"

import { Label } from "@/components/ui/label"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import type { ClientData, ClientUpgrade, FloorPlanPoint } from '@/types/client'
import type { ColorScheme } from '@/types/color-scheme'

interface ReviewSubmitStepProps {
  client_data: ClientData;
  on_submit: () => void;
  available_color_schemes?: ColorScheme[];
}

export function ReviewSubmitStep({ client_data, on_submit, available_color_schemes }: ReviewSubmitStepProps) {
  const [confirmation_checked, setConfirmationChecked] = useState(false)

  const calculateSubtotal = () => {
    return client_data.upgrades.reduce((total: number, upgrade: ClientUpgrade) => total + upgrade.price * upgrade.quantity, 0)
  }

  const calculateGST = () => {
    return calculateSubtotal() * 0.15
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST()
  }

  const getColorSchemeDetails = (schemeId: string) => {
    // First try to find from available color schemes
    if (available_color_schemes) {
      const foundScheme = available_color_schemes.find(scheme => 
        scheme.id === schemeId || scheme.name.toLowerCase() === schemeId.toLowerCase()
      )
      if (foundScheme) {
        return {
          name: foundScheme.name,
          materials: foundScheme.materials
        }
      }
    }

    // Fallback to hardcoded schemes for backwards compatibility
    const fallbackSchemes: Record<string, any> = {
      light: {
        name: "Light",
        materials: {
          paint: "White",
          carpet: "Light Grey",
          kitchen_floor: "Light Oak",
          kitchen_splashback: "White Gloss",
          bathroom_tiles: "White Gloss",
        },
      },
      neutral: {
        name: "Neutral",
        materials: {
          paint: "Warm Beige",
          carpet: "Taupe",
          kitchen_floor: "Natural Oak",
          kitchen_splashback: "Cream Gloss",
          bathroom_tiles: "Grey Gloss",
        },
      },
      dark: {
        name: "Dark",
        materials: {
          paint: "Charcoal Grey",
          carpet: "Dark Grey",
          kitchen_floor: "Dark Oak",
          kitchen_splashback: "Black Gloss",
          bathroom_tiles: "Black Gloss",
        },
      },
    }
    return fallbackSchemes[schemeId] || { name: schemeId, materials: {} }
  }

  const groupedUpgrades = client_data.upgrades.reduce(
    (acc: Record<string, ClientUpgrade[]>, upgrade: ClientUpgrade) => {
      if (!acc[upgrade.category]) {
        acc[upgrade.category] = []
      }
      acc[upgrade.category].push(upgrade)
      return acc
    },
    {} as Record<string, ClientUpgrade[]>,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Review & Submit</CardTitle>
          <CardDescription>
            Please review your selections before submitting. Once submitted, changes may require additional approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unit Information */}
          <div>
            <h3 className="font-semibold mb-3">Unit Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>
                <span className="font-medium">Unit:</span> {client_data.unit_number}
              </p>
              <p>
                <span className="font-medium">Type:</span> {client_data.unit_type}
              </p>
              <p>
                <span className="font-medium">Project:</span> {client_data.project_name}
              </p>
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <h3 className="font-semibold mb-3">Selected Color Scheme</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {getColorSchemeDetails(client_data.color_scheme).name}
              </Badge>

              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700">Material Selections:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const schemeDetails = getColorSchemeDetails(client_data.color_scheme)
                    const materialFields = [
                      { key: "paint", label: "Paint", linkKey: "paint_link" },
                      { key: "carpet", label: "Carpet", linkKey: "carpet_link" },
                      { key: "kitchen_floor", label: "Kitchen Floor", linkKey: "kitchen_floor_link" },
                      { key: "kitchen_splashback", label: "Kitchen Splashback", linkKey: "kitchen_splashback_link" },
                      { key: "bathroom_tiles", label: "Bathroom Tiles", linkKey: "bathroom_tiles_link" },
                    ]

                    return materialFields.map((field) => {
                      const materialValue = schemeDetails.materials[field.key as keyof typeof schemeDetails.materials] as string
                      const linkValue = schemeDetails.materials[field.linkKey as keyof typeof schemeDetails.materials] as string | null

                      if (!materialValue) return null

                      return (
                        <div key={field.key} className="flex items-center justify-between p-3 bg-white rounded border">
                          <div className="flex-1">
                            <span className="font-medium text-gray-600">{field.label}:</span>
                            <span className="ml-2 text-sm">{materialValue}</span>
                          </div>
                          {linkValue && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-3 text-xs px-2 py-1 h-auto"
                              onClick={() => window.open(linkValue, '_blank', 'noopener,noreferrer')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              More Info
                            </Button>
                          )}
                        </div>
                      )
                    }).filter(Boolean)
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Upgrades */}
          {client_data.upgrades.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Selected Upgrades</h3>
              <div className="space-y-4">
                {Object.entries(groupedUpgrades).map(([category, upgrades]) => (
                  <div key={category} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">{category}</h4>
                    <div className="space-y-3">
                      {upgrades.map((upgrade) => (
                        <div key={upgrade.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{upgrade.name}</span>
                              {upgrade.quantity > 1 && <span className="text-gray-600 ml-2">× {upgrade.quantity}</span>}
                            </div>
                            <span className="font-medium">${(upgrade.price * upgrade.quantity).toLocaleString()}</span>
                          </div>

                          {/* Show floor plan points for electrical upgrades */}
                          {upgrade.floor_plan_points && upgrade.floor_plan_points.length > 0 && (
                            <div className="ml-4 text-sm">
                              <span className="text-gray-600">Locations: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {upgrade.floor_plan_points.map((point: FloorPlanPoint, index: number) => (
                                  <Badge key={point.id} variant="outline" className="text-xs">
                                    Location {index + 1}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Summary */}
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Cost Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (15%):</span>
                    <span>${calculateGST().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="mt-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmation"
                checked={confirmation_checked}
                onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
              />
              <Label htmlFor="confirmation" className="text-sm">
                I confirm that all selections are correct and I understand that changes after submission may require
                additional approval.
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <Button onClick={on_submit} disabled={!confirmation_checked} className="w-full">
              Submit Selections
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
