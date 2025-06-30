"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Settings, Zap, Copy, Search } from "lucide-react"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface UpgradeOption {
  id?: string
  name: string
  description: string
  category: string
  price: number
  max_quantity: number | null
  allowed_unit_types: string[]
  project_id: string
}

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

interface PreviousProject {
  id: string
  name: string
  upgradeOptions: UpgradeOption[]
}

interface UpgradeOptionsManagerProps {
  upgradeOptions: UpgradeOption[]
  unitTypes: UnitType[]
  onUpgradeOptionsChange: (upgradeOptions: UpgradeOption[]) => void
  projectId: string
}

const categories = ["Build", "Electrical", "Kitchen", "Flooring", "Bathroom", "Lighting", "Security", "Other"]



export function UpgradeOptionsManager({
  upgradeOptions,
  unitTypes,
  onUpgradeOptionsChange,
  projectId,
}: UpgradeOptionsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeOption | null>(null)
  const [activeTab, setActiveTab] = useState("new")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")
  const [previousProjects, setPreviousProjects] = useState<PreviousProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [newUpgrade, setNewUpgrade] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    max_quantity: 1 as number | null,
    allowed_unit_types: [] as string[],
  })

  useEffect(() => {
    const fetchPreviousProjects = async () => {
      if (!projectId) {
        console.log('No projectId provided, skipping projects fetch')
        setLoadingProjects(false)
        return
      }

      setLoadingProjects(true)
      try {
        console.log('Fetching projects, current projectId:', projectId)
        
        // Fetch all projects except the current one
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .neq('id', projectId)

        console.log('Projects query result:', { projects, projectsError })

        if (projectsError) {
          console.error('Error fetching projects:', projectsError)
          return
        }

        // For each project, fetch its upgrade options
        const projectsWithUpgrades: PreviousProject[] = []
        
        for (const project of projects || []) {
          const { data: upgrades, error: upgradesError } = await supabase
            .from('upgrade_options')
            .select('*')
            .eq('project_id', project.id)

          if (upgradesError) {
            console.error('Error fetching upgrades for project:', project.id, upgradesError)
            continue
          }

          // Only include projects that have upgrade options
          if (upgrades && upgrades.length > 0) {
            projectsWithUpgrades.push({
              id: project.id,
              name: project.name,
              upgradeOptions: upgrades.map((upgrade: any) => ({
                id: upgrade.id,
                name: upgrade.name,
                description: upgrade.description || '',
                category: upgrade.category,
                price: upgrade.price,
                max_quantity: upgrade.max_quantity,
                allowed_unit_types: upgrade.allowed_unit_types || [],
                project_id: upgrade.project_id,
              }))
            })
          }
        }

        setPreviousProjects(projectsWithUpgrades)
      } catch (error) {
        console.error('Error fetching previous projects:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchPreviousProjects()
  }, [projectId])

  const addUpgrade = () => {
    if (newUpgrade.name && newUpgrade.category && newUpgrade.price > 0) {
      // Check for duplicate upgrade names in the current project
      const isDuplicate = upgradeOptions.some(
        (existingUpgrade) => existingUpgrade.name.toLowerCase() === newUpgrade.name.toLowerCase()
      )

      if (isDuplicate) {
        alert(`An upgrade option named "${newUpgrade.name}" already exists in this project. Please choose a different name.`)
        return
      }

      const upgrade: UpgradeOption = {
        name: newUpgrade.name,
        description: newUpgrade.description,
        category: newUpgrade.category,
        price: newUpgrade.price,
        max_quantity: newUpgrade.max_quantity,
        allowed_unit_types: newUpgrade.allowed_unit_types,
        project_id: projectId
      }

      onUpgradeOptionsChange([...upgradeOptions, upgrade])
      resetForm()
      setShowAddDialog(false)
    }
  }

  const resetForm = () => {
    setNewUpgrade({
      name: "",
      description: "",
      category: "",
      price: 0,
      max_quantity: 1 as number | null,
      allowed_unit_types: [],
    })
    setEditingUpgrade(null)
    setActiveTab("new")
  }

  const deleteUpgrade = (id: string) => {
    onUpgradeOptionsChange(upgradeOptions.filter((u) => u.id !== id))
  }

  const editUpgrade = (upgrade: UpgradeOption) => {
    setEditingUpgrade(upgrade)
    setNewUpgrade({
      name: upgrade.name,
      description: upgrade.description,
      category: upgrade.category,
      price: upgrade.price,
      max_quantity: upgrade.max_quantity,
      allowed_unit_types: upgrade.allowed_unit_types,
    })
    setActiveTab("new")
    setShowAddDialog(true)
  }

  const updateUpgrade = () => {
    if (editingUpgrade && newUpgrade.name && newUpgrade.category && newUpgrade.price > 0) {
      // Check for duplicate upgrade names in the current project (excluding the current upgrade being edited)
      const isDuplicate = upgradeOptions.some(
        (existingUpgrade) => 
          existingUpgrade.id !== editingUpgrade.id && 
          existingUpgrade.name.toLowerCase() === newUpgrade.name.toLowerCase()
      )

      if (isDuplicate) {
        alert(`An upgrade option named "${newUpgrade.name}" already exists in this project. Please choose a different name.`)
        return
      }

      const updatedUpgrades = upgradeOptions.map((u) =>
        u.id === editingUpgrade.id
          ? {
              ...u,
              name: newUpgrade.name,
              description: newUpgrade.description,
              category: newUpgrade.category,
              price: newUpgrade.price,
              max_quantity: newUpgrade.max_quantity,
              allowed_unit_types: newUpgrade.allowed_unit_types,
            }
          : u,
      )

      onUpgradeOptionsChange(updatedUpgrades)
      resetForm()
      setShowAddDialog(false)
    }
  }

  const copyFromPrevious = (previousUpgrade: UpgradeOption) => {
    setNewUpgrade({
      name: previousUpgrade.name,
      description: previousUpgrade.description,
      category: previousUpgrade.category,
      price: 0, // Reset price for new project
      max_quantity: previousUpgrade.max_quantity,
      allowed_unit_types: [], // Reset unit types for new project
    })
    setActiveTab("new")
  }

  const toggleUnitType = (unitTypeId: string) => {
    const updatedTypes = newUpgrade.allowed_unit_types.includes(unitTypeId)
      ? newUpgrade.allowed_unit_types.filter((id) => id !== unitTypeId)
      : [...newUpgrade.allowed_unit_types, unitTypeId]

    setNewUpgrade((prev) => ({ ...prev, allowed_unit_types: updatedTypes }))
  }

  const getUnitTypeNames = (unitTypeIds: string[]) => {
    return unitTypeIds
      .map((id) => {
        const unitType = unitTypes.find((ut) => ut.id === id);
        return unitType?.name || "Unknown";
      })
      .join(", ");
  }

  const groupedUpgrades = upgradeOptions.reduce(
    (acc, upgrade) => {
      if (!acc[upgrade.category]) {
        acc[upgrade.category] = []
      }
      acc[upgrade.category].push(upgrade)
      return acc
    },
    {} as Record<string, UpgradeOption[]>,
  )

  const filteredPreviousUpgrades = previousProjects
    .filter((project: PreviousProject) => !selectedProject || selectedProject === "all" || project.id === selectedProject)
    .flatMap((project: PreviousProject) =>
      project.upgradeOptions
        .filter(
          (upgrade: UpgradeOption) =>
            upgrade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            upgrade.category.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .map((upgrade: UpgradeOption) => ({ 
          ...upgrade, 
          projectName: project.name,
          alreadyExists: upgradeOptions.some(
            (existingUpgrade) => existingUpgrade.name.toLowerCase() === upgrade.name.toLowerCase()
          )
        })),
    )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Upgrade Options</CardTitle>
              <CardDescription>Define upgrade options available to clients</CardDescription>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Upgrade Option
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingUpgrade ? "Edit Upgrade Option" : "Add New Upgrade Option"}</DialogTitle>
                  <DialogDescription>Create upgrade options that clients can select for their units</DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new">Create New</TabsTrigger>
                    <TabsTrigger value="previous" disabled={editingUpgrade !== null}>
                      Copy from Previous Projects
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="new" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="upgradeName">Upgrade Name</Label>
                        <Input
                          id="upgradeName"
                          value={newUpgrade.name}
                          onChange={(e) => setNewUpgrade((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Additional Power Outlets"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newUpgrade.category}
                          onValueChange={(value) => setNewUpgrade((prev) => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newUpgrade.description}
                        onChange={(e) => setNewUpgrade((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the upgrade..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price (excl. GST)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newUpgrade.price}
                          onChange={(e) =>
                            setNewUpgrade((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor="max_quantity">Maximum Quantity</Label>
                        <div className="space-y-2">
                          <Input
                            id="max_quantity"
                            type="number"
                            min="1"
                            value={newUpgrade.max_quantity || ""}
                            onChange={(e) => setNewUpgrade({ 
                              ...newUpgrade, 
                              max_quantity: parseInt(e.target.value) || 1
                            })}
                            disabled={newUpgrade.max_quantity === null}
                            className={newUpgrade.max_quantity === null ? "bg-gray-100 text-gray-400" : ""}
                            placeholder={newUpgrade.max_quantity === null ? "Unlimited" : "Enter quantity"}
                          />
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="unlimited_quantity"
                              checked={newUpgrade.max_quantity === null}
                              onCheckedChange={(checked) => {
                                setNewUpgrade({ 
                                  ...newUpgrade, 
                                  max_quantity: checked ? null : 1 
                                })
                              }}
                            />
                            <Label htmlFor="unlimited_quantity" className="text-sm">
                              No maximum (unlimited)
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Applicable Unit Types</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {unitTypes.map((unitType) => (
                          <div key={unitType.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`unit-type-${unitType.id}`}
                              checked={newUpgrade.allowed_unit_types.includes(unitType.id)}
                              onCheckedChange={() => toggleUnitType(unitType.id)}
                            />
                            <Label htmlFor={`unit-type-${unitType.id}`} className="text-sm">
                              {unitType.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {unitTypes.length === 0 && (
                        <p className="text-sm text-gray-500 mt-2">No unit types available. Create unit types first.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="previous" className="space-y-4">
                    {loadingProjects ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading previous projects...</p>
                      </div>
                    ) : previousProjects.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No previous projects with upgrade options found</p>
                        <p className="text-sm text-gray-500 mt-2">Create some upgrade options in other projects first</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="projectFilter">Filter by Project</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                              <SelectTrigger>
                                <SelectValue placeholder="All projects" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All projects</SelectItem>
                                {previousProjects.map((project: PreviousProject) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                      <div>
                        <Label htmlFor="search">Search Upgrades</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or category..."
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {filteredPreviousUpgrades.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No upgrades found matching your criteria</div>
                      ) : (
                        <div className="space-y-2 p-4">
                          {filteredPreviousUpgrades.map((upgrade: any) => (
                            <div
                              key={`${upgrade.projectName}-${upgrade.id}`}
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                upgrade.alreadyExists ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{upgrade.name}</h4>
                                  <Badge variant="outline">{upgrade.category}</Badge>
                                  {upgrade.alreadyExists && (
                                    <Badge variant="secondary" className="text-xs">
                                      Already exists
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{upgrade.description}</p>
                                <p className="text-xs text-gray-500 mt-1">From: {upgrade.projectName}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyFromPrevious(upgrade)}
                                className="flex items-center gap-1"
                                disabled={upgrade.alreadyExists}
                              >
                                <Copy className="w-3 h-3" />
                                {upgrade.alreadyExists ? 'Already Added' : 'Copy'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4">
                  <Button onClick={editingUpgrade ? updateUpgrade : addUpgrade} className="flex-1">
                    {editingUpgrade ? "Update Upgrade" : "Add Upgrade"}
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
          {upgradeOptions.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No upgrade options created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Upgrade options allow clients to customize their units with additional features
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Upgrade Option
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedUpgrades).map(([category, upgrades]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                    {category === "Electrical" && <Zap className="w-5 h-5" />}
                    {category} ({upgrades.length})
                  </h3>
                  <div className="grid gap-3">
                    {upgrades.map((upgrade) => (
                      <div key={upgrade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-medium">{upgrade.name}</h4>
                            <Badge variant="secondary">${upgrade.price.toLocaleString()}</Badge>
                            <Badge variant="outline">
                              Max: {upgrade.max_quantity === null ? "Unlimited" : upgrade.max_quantity}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{upgrade.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Available for:</span>
                            {upgrade.allowed_unit_types.length > 0 ? (
                              <span className="text-xs text-blue-600">
                                {getUnitTypeNames(upgrade.allowed_unit_types)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No unit types assigned</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => editUpgrade(upgrade)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => upgrade.id && deleteUpgrade(upgrade.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {upgradeOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upgrade Options Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{upgradeOptions.length}</div>
                <div className="text-sm text-gray-600">Total Options</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{Object.keys(groupedUpgrades).length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  $
                  {Math.round(
                    upgradeOptions.reduce((sum, u) => sum + u.price, 0) / upgradeOptions.length,
                  ).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Avg Price</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  ${upgradeOptions.reduce((sum, u) => sum + u.price, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
