"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Palette, ExternalLink } from "lucide-react"
import type { ColorScheme } from '@/types/color-scheme'

interface UnitType {
  id: string
  name: string
  description: string
  bedrooms: number
  bathrooms: number
  size_m2: number
  allowedColorSchemes: string[]
  allowedUpgrades: string[]
}

interface ColorSchemesManagerProps {
  colorSchemes: ColorScheme[]
  unitTypes: UnitType[]
  onColorSchemesChange: (colorSchemes: ColorScheme[]) => void
  projectId: string
}

export function ColorSchemesManager({ colorSchemes, unitTypes, onColorSchemesChange, projectId }: ColorSchemesManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingScheme, setEditingScheme] = useState<ColorScheme | null>(null)
  const [newScheme, setNewScheme] = useState({
    name: "",
    description: "",
    color_board_file: null as string | null,
    materials: {
      paint: "",
      paint_link: "" as string | null,
      carpet: "",
      carpet_link: "" as string | null,
      kitchen_floor: "",
      kitchen_floor_link: "" as string | null,
      kitchen_splashback: "",
      kitchen_splashback_link: "" as string | null,
      bathroom_tiles: "",
      bathroom_tiles_link: "" as string | null,
    },
    allowedUnitTypes: [] as string[],
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const addColorScheme = () => {
    if (newScheme.name && Object.values(newScheme.materials).some((material) => material && material.trim() !== "")) {
      const scheme: ColorScheme = {
        name: newScheme.name,
        description: newScheme.description,
        materials: newScheme.materials,
        allowedUnitTypes: newScheme.allowedUnitTypes,
        project_id: projectId
      }

      onColorSchemesChange([...colorSchemes, scheme])
      resetForm()
      setShowAddDialog(false)
    }
  }

  const resetForm = () => {
    setNewScheme({
      name: "",
      description: "",
      color_board_file: null,
      materials: {
        paint: "",
        paint_link: null,
        carpet: "",
        carpet_link: null,
        kitchen_floor: "",
        kitchen_floor_link: null,
        kitchen_splashback: "",
        kitchen_splashback_link: null,
        bathroom_tiles: "",
        bathroom_tiles_link: null,
      },
      allowedUnitTypes: [],
    })
    setUploadedFile(null)
    setEditingScheme(null)
  }

  const deleteColorScheme = (id: string) => {
    onColorSchemesChange(colorSchemes.filter((cs) => cs.id !== id))
  }

  const editColorScheme = (scheme: ColorScheme) => {
    setEditingScheme(scheme)
    setNewScheme({
      name: scheme.name,
      description: scheme.description,
      color_board_file: scheme.color_board_file || null,
      materials: { ...scheme.materials },
      allowedUnitTypes: [...scheme.allowedUnitTypes],
    })
    setUploadedFile(null)
    setShowAddDialog(true)
  }

  const updateColorScheme = () => {
    if (
      editingScheme &&
      newScheme.name &&
      Object.values(newScheme.materials).some((material) => material && material.trim() !== "")
    ) {
      const updatedSchemes = colorSchemes.map((cs) =>
        cs.id === editingScheme.id
          ? {
              ...cs,
              name: newScheme.name,
              description: newScheme.description,
              materials: newScheme.materials,
              allowedUnitTypes: newScheme.allowedUnitTypes,
            }
          : cs,
      )

      onColorSchemesChange(updatedSchemes)
      resetForm()
      setShowAddDialog(false)
    }
  }

  const toggleUnitType = (unitTypeId: string) => {
    const updatedTypes = newScheme.allowedUnitTypes.includes(unitTypeId)
      ? newScheme.allowedUnitTypes.filter((id) => id !== unitTypeId)
      : [...newScheme.allowedUnitTypes, unitTypeId]

    setNewScheme((prev) => ({ ...prev, allowedUnitTypes: updatedTypes }))
  }

  const updateMaterial = (materialKey: keyof ColorScheme["materials"], value: string | null) => {
    setNewScheme((prev) => ({
      ...prev,
      materials: {
        ...prev.materials,
        [materialKey]: value,
      },
    }))
  }

  const getUnitTypeNames = (unitTypeIds: string[]) => {
    return unitTypeIds
      .map((id) => {
        const unitType = unitTypes.find((ut) => ut.id === id);
        const name = unitType?.name;
        return name || "Unknown";
      })
      .join(", ");
  }

  const materialFields = [
    { key: "paint", label: "Paint", linkKey: "paint_link" },
    { key: "carpet", label: "Carpet", linkKey: "carpet_link" },
    { key: "kitchen_floor", label: "Kitchen Floor", linkKey: "kitchen_floor_link" },
    { key: "kitchen_splashback", label: "Kitchen Splashback", linkKey: "kitchen_splashback_link" },
    { key: "bathroom_tiles", label: "Bathroom Tiles", linkKey: "bathroom_tiles_link" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Color Schemes</CardTitle>
              <CardDescription>Define color schemes and material selections for units</CardDescription>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Color Scheme
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingScheme ? "Edit Color Scheme" : "Add New Color Scheme"}</DialogTitle>
                  <DialogDescription>
                    Create or edit a color scheme with material selections for your project units
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheme-name">Name *</Label>
                      <Input
                        id="scheme-name"
                        value={newScheme.name}
                        onChange={(e) => setNewScheme((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Modern Light, Classic Dark"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheme-description">Description</Label>
                      <Input
                        id="scheme-description"
                        value={newScheme.description}
                        onChange={(e) => setNewScheme((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the color scheme"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="color-board-file">Color Board File</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        id="color-board-file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setUploadedFile(file)
                            // For now, we'll just store the file name
                            // In a real implementation, you'd upload to cloud storage
                            setNewScheme((prev) => ({ ...prev, color_board_file: file.name }))
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {uploadedFile && (
                        <p className="text-sm text-green-600 mt-1">✓ {uploadedFile.name} selected</p>
                      )}
                      {newScheme.color_board_file && !uploadedFile && (
                        <p className="text-sm text-blue-600 mt-1">Current: {newScheme.color_board_file}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a color board PDF or image file for clients to download
                    </p>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold">Materials & Colors</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Add at least one material specification. Include supplier links for easy ordering.
                    </p>
                    <div className="grid gap-4">
                      {materialFields.map((field) => (
                        <div key={field.key} className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`material-${field.key}`}>{field.label}</Label>
                            <Input
                              id={`material-${field.key}`}
                              value={newScheme.materials[field.key as keyof typeof newScheme.materials] as string}
                              onChange={(e) => updateMaterial(field.key as keyof ColorScheme["materials"], e.target.value)}
                              placeholder={`${field.label} color/specification`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`link-${field.key}`}>Supplier Link</Label>
                            <Input
                              id={`link-${field.key}`}
                              value={(newScheme.materials[field.linkKey as keyof typeof newScheme.materials] as string) || ""}
                              onChange={(e) => updateMaterial(field.linkKey as keyof ColorScheme["materials"], e.target.value || null)}
                              placeholder="https://supplier.com/product"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Applicable Unit Types</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {unitTypes.map((unitType) => (
                        <div key={unitType.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`scheme-unit-type-${unitType.id}`}
                            checked={newScheme.allowedUnitTypes.includes(unitType.id)}
                            onCheckedChange={() => toggleUnitType(unitType.id)}
                          />
                          <Label htmlFor={`scheme-unit-type-${unitType.id}`} className="text-sm">
                            {unitType.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {unitTypes.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">No unit types available. Create unit types first.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={editingScheme ? updateColorScheme : addColorScheme} className="flex-1">
                    {editingScheme ? "Update Color Scheme" : "Add Color Scheme"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false)
                      resetForm()
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {colorSchemes.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No color schemes created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Color schemes define the material selections available to clients for each unit type
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Color Scheme
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {colorSchemes.map((scheme) => (
                <div key={scheme.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{scheme.name}</h3>
                        <Badge variant="secondary">{scheme.description}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-3">
                        {materialFields.map((field) => {
                          const materialValue = scheme.materials[field.key as keyof typeof scheme.materials] as string
                          const linkValue = scheme.materials[field.linkKey as keyof typeof scheme.materials] as string

                          if (!materialValue) return null

                          return (
                            <div key={field.key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium text-gray-600">{field.label}:</span>
                                <span className="ml-1">{materialValue}</span>
                              </div>
                              {linkValue && (
                                <a
                                  href={linkValue}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Available for:</span>
                          {scheme.allowedUnitTypes.length > 0 ? (
                            <span className="text-xs text-blue-600">
                              {getUnitTypeNames(scheme.allowedUnitTypes)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No unit types assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editColorScheme(scheme)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteColorScheme(scheme.id!)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {colorSchemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Color Schemes Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{colorSchemes.length}</div>
                <div className="text-sm text-gray-600">Total Schemes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {colorSchemes.filter((cs) => cs.allowedUnitTypes.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Assigned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {colorSchemes.reduce((sum, cs) => {
                    return (
                      sum +
                      Object.values(cs.materials).filter(
                        (value, index) => index % 2 === 1 && value, // Count only link fields that have values
                      ).length
                    )
                  }, 0)}
                </div>
                <div className="text-sm text-gray-600">Supplier Links</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
