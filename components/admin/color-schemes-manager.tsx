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
import { Plus, Edit, Trash2, Palette, ExternalLink, FileText, X } from "lucide-react"
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

interface MaterialItem {
  id: string
  label: string
  value: string
  link: string | null
  isCustom: boolean
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
  
  const getDefaultMaterials = (): MaterialItem[] => [
    { id: "paint", label: "Paint", value: "", link: null, isCustom: false },
    { id: "carpet", label: "Carpet", value: "", link: null, isCustom: false },
    { id: "kitchen_floor", label: "Kitchen Floor", value: "", link: null, isCustom: false },
    { id: "kitchen_splashback", label: "Kitchen Splashback", value: "", link: null, isCustom: false },
    { id: "bathroom_tiles", label: "Bathroom Tiles", value: "", link: null, isCustom: false },
  ]
  
  const [newScheme, setNewScheme] = useState({
    name: "",
    description: "",
    color_board_file: null as string | null,
    materials: getDefaultMaterials(),
    allowedUnitTypes: [] as string[],
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const addColorScheme = () => {
    if (newScheme.name && newScheme.materials.some((material) => material.value && material.value.trim() !== "")) {
      // Convert MaterialItem[] back to the expected ColorScheme materials format
      const materialsObj = newScheme.materials.reduce((acc, material) => {
        acc[material.id] = material.value
        acc[`${material.id}_link`] = material.link
        return acc
      }, {} as any)

      const scheme: ColorScheme = {
        name: newScheme.name,
        description: newScheme.description,
        color_board_file: uploadedFile ? uploadedFile.name : newScheme.color_board_file,
        materials: materialsObj,
        allowedUnitTypes: newScheme.allowedUnitTypes,
        project_id: projectId
      }

      // Store the actual file object if uploaded (in a real app, you'd upload to cloud storage)
      if (uploadedFile) {
        console.log(`Color board file uploaded: ${uploadedFile.name}`)
        // Here you would typically upload to cloud storage and get back a URL
        // For now, we'll simulate this by storing the file name
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
      materials: getDefaultMaterials(),
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
    
    // Convert existing materials format to MaterialItem[]
    const materialsArray: MaterialItem[] = []
    const defaultMaterials = getDefaultMaterials()
    
    // Add default materials with existing values
    defaultMaterials.forEach(defaultMaterial => {
      const value = scheme.materials[defaultMaterial.id as keyof typeof scheme.materials] as string || ""
      const link = scheme.materials[`${defaultMaterial.id}_link` as keyof typeof scheme.materials] as string || null
      materialsArray.push({
        ...defaultMaterial,
        value,
        link
      })
    })
    
    // Add any custom materials that exist in the scheme but not in defaults
    Object.keys(scheme.materials).forEach(key => {
      if (!key.endsWith('_link') && !defaultMaterials.some(dm => dm.id === key)) {
        const value = scheme.materials[key as keyof typeof scheme.materials] as string || ""
        const link = scheme.materials[`${key}_link` as keyof typeof scheme.materials] as string || null
        materialsArray.push({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          value,
          link,
          isCustom: true
        })
      }
    })
    
    setNewScheme({
      name: scheme.name,
      description: scheme.description,
      color_board_file: scheme.color_board_file || null,
      materials: materialsArray,
      allowedUnitTypes: [...scheme.allowedUnitTypes],
    })
    setUploadedFile(null)
    setShowAddDialog(true)
  }

  const updateColorScheme = () => {
    if (
      editingScheme &&
      newScheme.name &&
      newScheme.materials.some((material) => material.value && material.value.trim() !== "")
    ) {
      // Convert MaterialItem[] back to the expected ColorScheme materials format
      const materialsObj = newScheme.materials.reduce((acc, material) => {
        acc[material.id] = material.value
        acc[`${material.id}_link`] = material.link
        return acc
      }, {} as any)

      const updatedSchemes = colorSchemes.map((cs) =>
        cs.id === editingScheme.id
          ? {
              ...cs,
              name: newScheme.name,
              description: newScheme.description,
              color_board_file: uploadedFile ? uploadedFile.name : newScheme.color_board_file,
              materials: materialsObj,
              allowedUnitTypes: newScheme.allowedUnitTypes,
            }
          : cs,
      )

      // Handle file upload for update
      if (uploadedFile) {
        console.log(`Color board file updated: ${uploadedFile.name}`)
        // Here you would typically upload to cloud storage and get back a URL
      }

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

  const addCustomMaterial = () => {
    const newId = `custom_${Date.now()}`
    const newMaterial: MaterialItem = {
      id: newId,
      label: "Custom Material",
      value: "",
      link: null,
      isCustom: true
    }
    setNewScheme(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }))
  }

  const removeMaterial = (materialId: string) => {
    setNewScheme(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== materialId)
    }))
  }

  const updateMaterial = (materialId: string, field: 'label' | 'value' | 'link', value: string) => {
    setNewScheme(prev => ({
      ...prev,
      materials: prev.materials.map(m => 
        m.id === materialId 
          ? { ...m, [field]: field === 'link' ? (value || null) : value }
          : m
      )
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



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Colours and Finishes</CardTitle>
              <CardDescription>Define colour and finish schemes and material selections for units</CardDescription>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Scheme
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingScheme ? "Edit Scheme" : "Add New Scheme"}</DialogTitle>
                  <DialogDescription>
                    Create or edit colour and finish schemes with material selections for your project units
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
                    <Label htmlFor="color-board-file">Colour Board File</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        id="color-board-file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setUploadedFile(file)
                            console.log(`Color board file selected: ${file.name}`)
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
                      Upload a colour board PDF or image file for clients to download
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <Label className="text-lg font-semibold">Materials & Colours</Label>
                        <p className="text-sm text-gray-600">
                          Add at least one material specification. Include supplier links for easy ordering.
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addCustomMaterial}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </Button>
                    </div>
                    <div className="grid gap-4">
                      {newScheme.materials.map((material) => (
                        <div key={material.id} className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                          <div className="col-span-2 flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {material.isCustom ? (
                                <Input
                                  value={material.label}
                                  onChange={(e) => updateMaterial(material.id, 'label', e.target.value)}
                                  placeholder="Material name"
                                  className="w-40 h-7 text-sm font-medium"
                                />
                              ) : (
                                <Label className="font-medium">{material.label}</Label>
                              )}
                              {material.isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMaterial(material.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              title={material.isCustom ? "Remove custom material" : "Remove default material"}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div>
                            <Label htmlFor={`material-${material.id}`} className="text-sm">Specification</Label>
                            <Input
                              id={`material-${material.id}`}
                              value={material.value}
                              onChange={(e) => updateMaterial(material.id, 'value', e.target.value)}
                              placeholder={`${material.label} colour/specification`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`link-${material.id}`} className="text-sm">Supplier Link</Label>
                            <Input
                              id={`link-${material.id}`}
                              value={material.link || ""}
                              onChange={(e) => updateMaterial(material.id, 'link', e.target.value)}
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
                    {editingScheme ? "Update Scheme" : "Add Scheme"}
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
              <p className="text-gray-600 mb-4">No schemes created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Colour and finish schemes define the material selections available to clients for each unit type
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Scheme
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
                        {Object.entries(scheme.materials).map(([key, value]) => {
                          // Skip link keys and empty values
                          if (key.endsWith('_link') || !value) return null

                          const linkKey = `${key}_link`
                          const linkValue = scheme.materials[linkKey as keyof typeof scheme.materials] as string
                          const displayLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')

                          return (
                            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium text-gray-600">{displayLabel}:</span>
                                <span className="ml-1">{value}</span>
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
                          {scheme.color_board_file ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Colour Board: {scheme.color_board_file}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Colour Board</Badge>
                          )}
                        </div>
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
            <CardTitle className="text-lg">Schemes Summary</CardTitle>
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
                      Object.entries(cs.materials).filter(
                        ([key, value]) => key.endsWith('_link') && value
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
