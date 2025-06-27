"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Home, Bed, Bath, Ruler } from "lucide-react"
import type { UnitType } from '../../types/unit'

interface UnitTypesManagerProps {
  unitTypes: UnitType[]
  onUnitTypesChange: (unitTypes: UnitType[]) => void
  projectId?: string
}

export function UnitTypesManager({ unitTypes, onUnitTypesChange, projectId }: UnitTypesManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUnitType, setEditingUnitType] = useState<UnitType | null>(null)
  const [newUnitType, setNewUnitType] = useState({
    name: "",
    description: "",
    bedrooms: 1,
    bathrooms: 1,
    size_m2: 50,
  })

  const addUnitType = () => {
    if (newUnitType.name && projectId) {
      const unitType = {
        name: newUnitType.name,
        description: newUnitType.description,
        bedrooms: newUnitType.bedrooms,
        bathrooms: newUnitType.bathrooms,
        size_m2: newUnitType.size_m2,
        allowedColorSchemes: [],
        allowedUpgrades: [],
        project_id: projectId
      }
      onUnitTypesChange([...unitTypes, unitType])
      setNewUnitType({ name: "", description: "", bedrooms: 1, bathrooms: 1, size_m2: 50 })
      setShowAddDialog(false)
    }
  }

  const deleteUnitType = (id: string) => {
    onUnitTypesChange(unitTypes.filter((ut) => ut.id !== id))
  }

  const editUnitType = (unitType: UnitType) => {
    setEditingUnitType(unitType)
    setNewUnitType({
      name: unitType.name,
      description: unitType.description,
      bedrooms: unitType.bedrooms,
      bathrooms: unitType.bathrooms,
      size_m2: unitType.size_m2,
    })
    setShowAddDialog(true)
  }

  const updateUnitType = () => {
    if (editingUnitType && newUnitType.name) {
      const updatedUnitTypes = unitTypes.map((ut) =>
        ut.id === editingUnitType.id
          ? {
              ...ut,
              name: newUnitType.name,
              description: newUnitType.description,
              bedrooms: newUnitType.bedrooms,
              bathrooms: newUnitType.bathrooms,
              size_m2: newUnitType.size_m2,
            }
          : ut,
      )

      onUnitTypesChange(updatedUnitTypes)
      setEditingUnitType(null)
      setNewUnitType({ name: "", description: "", bedrooms: 1, bathrooms: 1, size_m2: 50 })
      setShowAddDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Unit Types</CardTitle>
              <CardDescription>Define the different types of units in your project</CardDescription>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Unit Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingUnitType ? "Edit Unit Type" : "Add New Unit Type"}</DialogTitle>
                  <DialogDescription>
                    Create a new unit type that will be available for units in this project
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="unitTypeName">Unit Type Name</Label>
                    <Input
                      id="unitTypeName"
                      value={newUnitType.name}
                      onChange={(e) => setNewUnitType((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Type A, Studio, 1 Bedroom"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unitTypeDescription">Description</Label>
                    <Textarea
                      id="unitTypeDescription"
                      value={newUnitType.description}
                      onChange={(e) => setNewUnitType((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this unit type..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        min="0"
                        max="10"
                        value={newUnitType.bedrooms}
                        onChange={(e) =>
                          setNewUnitType((prev) => ({ ...prev, bedrooms: Number.parseInt(e.target.value) || 1 }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={newUnitType.bathrooms}
                        onChange={(e) =>
                          setNewUnitType((prev) => ({ ...prev, bathrooms: Number.parseFloat(e.target.value) || 1 }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="size_m2">Size (m²)</Label>
                      <Input
                        id="size_m2"
                        type="number"
                        min="20"
                        max="500"
                        value={newUnitType.size_m2}
                        onChange={(e) =>
                          setNewUnitType((prev) => ({ ...prev, size_m2: Number.parseInt(e.target.value) || 50 }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={editingUnitType ? updateUnitType : addUnitType} className="flex-1">
                      {editingUnitType ? "Update Unit Type" : "Add Unit Type"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddDialog(false)
                        setEditingUnitType(null)
                        setNewUnitType({ name: "", description: "", bedrooms: 1, bathrooms: 1, size_m2: 50 })
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {unitTypes.length === 0 ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No unit types created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Unit types define the different layouts and configurations available in your project
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Unit Type
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {unitTypes.map((unitType) => (
                <div key={unitType.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{unitType.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{unitType.description}</p>

                    <div className="flex gap-4 mb-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Bed className="w-4 h-4" />
                        {unitType.bedrooms} bed{unitType.bedrooms !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Bath className="w-4 h-4" />
                        {unitType.bathrooms} bath{unitType.bathrooms !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Ruler className="w-4 h-4" />
                        {unitType.size_m2}m²
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="outline">{unitType.allowedColorSchemes.length} color schemes</Badge>
                      <Badge variant="outline">{unitType.allowedUpgrades.length} upgrades</Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => editUnitType(unitType)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteUnitType(unitType.id || "")}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {unitTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{unitTypes.length}</div>
                <div className="text-sm text-gray-600">Unit Types</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((unitTypes.reduce((sum, ut) => sum + ut.bedrooms, 0) / unitTypes.length) * 10) / 10}
                </div>
                <div className="text-sm text-gray-600">Avg Bedrooms</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((unitTypes.reduce((sum, ut) => sum + ut.bathrooms, 0) / unitTypes.length) * 10) / 10}
                </div>
                <div className="text-sm text-gray-600">Avg Bathrooms</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(unitTypes.reduce((sum, ut) => sum + ut.size_m2, 0) / unitTypes.length)}
                </div>
                <div className="text-sm text-gray-600">Avg Size (m²)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {unitTypes.reduce((sum, ut) => sum + ut.allowedUpgrades.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Upgrades</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
