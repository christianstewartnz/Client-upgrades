"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ExternalLink, Download } from "lucide-react"
import type { ColorScheme } from "@/types/color-scheme"

interface ColorSchemeStepProps {
  selected_scheme: string
  on_scheme_change: (scheme: string) => void
  unit_type: string
  unit_number: string
  available_color_schemes?: ColorScheme[]
}

export function ColorSchemeStep({ selected_scheme, on_scheme_change, unit_type, unit_number, available_color_schemes }: ColorSchemeStepProps) {
  // Fallback to mock data if no real schemes provided
  const fallbackSchemes = [
    {
      id: "light",
      name: "Light",
      description: "Bright whites and soft neutrals for an airy, spacious feel",
      color_board_file: null,
      materials: {
        paint: "White",
        paint_link: null,
        carpet: "Light Grey", 
        carpet_link: null,
        kitchen_floor: "Light Oak",
        kitchen_floor_link: null,
        kitchen_splashback: "White Gloss",
        kitchen_splashback_link: null,
        bathroom_tiles: "White Gloss",
        bathroom_tiles_link: null,
      },
      allowedUnitTypes: [],
      project_id: ""
    },
    {
      id: "neutral", 
      name: "Neutral",
      description: "Warm beiges and greys for a sophisticated, timeless look",
      color_board_file: null,
      materials: {
        paint: "Warm Beige",
        paint_link: null,
        carpet: "Taupe",
        carpet_link: null,
        kitchen_floor: "Natural Oak", 
        kitchen_floor_link: null,
        kitchen_splashback: "Cream Gloss",
        kitchen_splashback_link: null,
        bathroom_tiles: "Grey Gloss",
        bathroom_tiles_link: null,
      },
      allowedUnitTypes: [],
      project_id: ""
    },
    {
      id: "dark",
      name: "Dark", 
      description: "Rich charcoals and deep tones for a modern, dramatic aesthetic",
      color_board_file: null,
      materials: {
        paint: "Charcoal Grey",
        paint_link: null,
        carpet: "Dark Grey",
        carpet_link: null,
        kitchen_floor: "Dark Oak",
        kitchen_floor_link: null,
        kitchen_splashback: "Black Gloss", 
        kitchen_splashback_link: null,
        bathroom_tiles: "Black Gloss",
        bathroom_tiles_link: null,
      },
      allowedUnitTypes: [],
      project_id: ""
    },
  ]

  const colorSchemes = available_color_schemes && available_color_schemes.length > 0 
    ? available_color_schemes 
    : fallbackSchemes

  const materialFields = [
    { key: "paint", label: "Paint", linkKey: "paint_link" },
    { key: "carpet", label: "Carpet", linkKey: "carpet_link" },
    { key: "kitchen_floor", label: "Kitchen Floor", linkKey: "kitchen_floor_link" },
    { key: "kitchen_splashback", label: "Kitchen Splashback", linkKey: "kitchen_splashback_link" },
    { key: "bathroom_tiles", label: "Bathroom Tiles", linkKey: "bathroom_tiles_link" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Select Finishes</CardTitle>
        <CardDescription>
          Choose your preferred finishes for {unit_number}. This will determine the overall aesthetic of your
          unit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selected_scheme} onValueChange={on_scheme_change}>
          <div className="grid gap-6">
            {colorSchemes.map((scheme) => (
              <div key={scheme.id || scheme.name} className="flex items-center space-x-3">
                <RadioGroupItem value={scheme.id || scheme.name} id={scheme.id || scheme.name} />
                <Label htmlFor={scheme.id || scheme.name} className="flex-1 cursor-pointer">
                  <div className="border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{scheme.name}</h3>
                        <p className="text-gray-600 text-sm">{scheme.description}</p>
                      </div>
                      {scheme.color_board_file && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // In a real implementation, this would download from cloud storage
                            // For now, we'll just show an alert
                            alert(`Downloading colorboard: ${scheme.color_board_file}`)
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Colorboard
                        </Button>
                      )}
                    </div>

                    {/* Material Details */}
                    <div className="px-4 py-3 border-t bg-gray-50">
                      <h4 className="font-medium text-center mb-3 text-gray-700 text-sm">Material Selections</h4>
                      <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-3 gap-2">
                          {materialFields.map((field) => {
                            const materialValue = scheme.materials[field.key as keyof typeof scheme.materials] as string
                            const linkValue = scheme.materials[field.linkKey as keyof typeof scheme.materials] as string | null

                            if (!materialValue) return null

                            return (
                              <div key={field.key} className="bg-white rounded border shadow-sm p-2 text-center hover:shadow-md transition-shadow">
                                <div className="mb-2">
                                  <h5 className="font-medium text-gray-800 text-xs mb-1">{field.label}</h5>
                                  <p className="text-gray-600 text-xs leading-tight">{materialValue}</p>
                                </div>
                                {linkValue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-2 py-1 h-6 w-full"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      window.open(linkValue, '_blank', 'noopener,noreferrer')
                                    }}
                                  >
                                    <ExternalLink className="w-2 h-2 mr-1" />
                                    Details
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
