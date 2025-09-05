"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, UserPlus, Eye, Mail, DollarSign, Home, Building2, ArrowLeft, Edit2, Check, X, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Unit {
  id: string
  unit_number: string
  unit_type_id: string
  status: string
  unit_type?: {
    name: string
    bedrooms: number
    bathrooms: number
    size_m2: number
  }
}

interface SalesListUnit {
  id: string
  sales_list_id: string
  unit_id: string
  list_price: number | null
  sold_price: number | null
  status: 'available' | 'reserved' | 'sold' | 'withdrawn' | 'not_in_list'
  notes: string | null
  unit: Unit
  client?: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  isInSalesList: boolean
}

interface SalesList {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive' | 'closed'
  created_at: string
}

export default function SalesListPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [salesLists, setSalesLists] = useState<SalesList[]>([])
  const [activeSalesList, setActiveSalesList] = useState<SalesList | null>(null)
  const [salesListUnits, setSalesListUnits] = useState<SalesListUnit[]>([])
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddUnitsDialog, setShowAddUnitsDialog] = useState(false)
  const [showAssignClientDialog, setShowAssignClientDialog] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<SalesListUnit | null>(null)
  
  const [newSalesListForm, setNewSalesListForm] = useState({
    name: '',
    description: ''
  })
  
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    listPrice: '',
    soldPrice: ''
  })
  const [editingPrices, setEditingPrices] = useState<{[key: string]: {listPrice?: boolean, soldPrice?: boolean}}>({})
  const [tempPrices, setTempPrices] = useState<{[key: string]: {listPrice?: string, soldPrice?: string}}>({})
  const [updatingPrice, setUpdatingPrice] = useState<string | null>(null)

  // Fetch project data
  useEffect(() => {
    fetchSalesLists()
    fetchProjectUnits() // Fetch all units for this project
  }, [projectId])

  // Fetch sales list units when active list changes
  useEffect(() => {
    if (activeSalesList) {
      fetchSalesListUnits()
    }
  }, [activeSalesList])

  const fetchProjectUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          unit_type:unit_types(name, bedrooms, bathrooms, size_m2)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('unit_number')

      if (error) throw error
      setAvailableUnits(data || [])
    } catch (error) {
      console.error('Error fetching project units:', error)
    }
  }

  const fetchSalesLists = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_lists')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setSalesLists(data || [])
      if (data && data.length > 0 && !activeSalesList) {
        setActiveSalesList(data[0])
      }
    } catch (error) {
      console.error('Error fetching sales lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesListUnits = async () => {
    if (!activeSalesList) return

    try {
      // Get all units for this project
      const allUnits = availableUnits

      // Get sales list configuration for units in this sales list
      const { data: salesListData, error: salesError } = await supabase
        .from('sales_list_units')
        .select('*')
        .eq('sales_list_id', activeSalesList.id)

      if (salesError) throw salesError

      // Get client assignments for all units
      const unitIds = allUnits.map(unit => unit.id)
      let clientData: any[] = []
      
      if (unitIds.length > 0) {
        const { data: clients, error: clientError } = await supabase
          .from('unit_clients')
          .select(`
            unit_id,
            client:clients(id, name, email, phone)
          `)
          .in('unit_id', unitIds)
          .eq('role', 'purchaser')

        if (!clientError) {
          clientData = clients || []
        }
      }

      // Merge all data: show all units, with sales list config if they're in the list
      const unitsWithAllData = allUnits.map(unit => {
        const salesListConfig = salesListData?.find(slu => slu.unit_id === unit.id)
        const client = clientData.find(c => c.unit_id === unit.id)?.client

        return {
          id: salesListConfig?.id || `temp-${unit.id}`, // Use sales list unit id if exists
          sales_list_id: activeSalesList.id,
          unit_id: unit.id,
          list_price: salesListConfig?.list_price || null,
          sold_price: salesListConfig?.sold_price || null,
          status: salesListConfig?.status || 'not_in_list',
          notes: salesListConfig?.notes || null,
          unit: unit,
          client: client,
          isInSalesList: !!salesListConfig
        }
      })

      setSalesListUnits(unitsWithAllData)
    } catch (error) {
      console.error('Error fetching sales list units:', error)
    }
  }

  const fetchAvailableUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          unit_type:unit_types(name, bedrooms, bathrooms, size_m2)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')

      if (error) throw error

      // Filter out units already in the current sales list
      const usedUnitIds = salesListUnits.map(slu => slu.unit_id)
      const available = data?.filter(unit => !usedUnitIds.includes(unit.id)) || []
      
      setAvailableUnits(available)
    } catch (error) {
      console.error('Error fetching available units:', error)
    }
  }

  const createSalesList = async () => {
    if (!newSalesListForm.name.trim()) return

    try {
      const { data, error } = await supabase
        .from('sales_lists')
        .insert({
          project_id: projectId,
          name: newSalesListForm.name.trim(),
          description: newSalesListForm.description.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      setSalesLists(prev => [data, ...prev])
      setActiveSalesList(data)
      setNewSalesListForm({ name: '', description: '' })
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Error creating sales list:', error)
      alert('Error creating sales list')
    }
  }

  const assignClient = async () => {
    if (!selectedUnit || !clientForm.name.trim() || !clientForm.email.trim()) return

    try {
      // First, create or find the client
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', clientForm.email.trim())
        .single()

      let clientId = existingClient?.id

      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: clientForm.name.trim(),
            email: clientForm.email.trim(),
            phone: clientForm.phone.trim() || null
          })
          .select('id')
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Create unit-client relationship
      const { error: relationError } = await supabase
        .from('unit_clients')
        .upsert({
          unit_id: selectedUnit.unit_id,
          client_id: clientId,
          sales_list_id: activeSalesList?.id,
          purchase_price: clientForm.soldPrice ? parseFloat(clientForm.soldPrice) : null,
          reservation_date: new Date().toISOString(),
          role: 'purchaser',
          status: 'active'
        })

      if (relationError) throw relationError

      // Update sales list unit status and prices
      const { error: statusError } = await supabase
        .from('sales_list_units')
        .update({ 
          status: 'reserved',
          list_price: clientForm.listPrice ? parseFloat(clientForm.listPrice) : null,
          sold_price: clientForm.soldPrice ? parseFloat(clientForm.soldPrice) : null
        })
        .eq('id', selectedUnit.id)

      if (statusError) throw statusError

      // Refresh data
      await fetchSalesListUnits()
      setClientForm({ name: '', email: '', phone: '', listPrice: '', soldPrice: '' })
      setShowAssignClientDialog(false)
      setSelectedUnit(null)

    } catch (error) {
      console.error('Error assigning client:', error)
      alert('Error assigning client')
    }
  }

  const sendInvitation = async (unit: SalesListUnit) => {
    if (!unit.client) return

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.unit_id,
          client: {
            name: unit.client.name,
            email: unit.client.email,
            phone: unit.client.phone
          },
          expiresInDays: 14
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      alert(`Invitation sent! Link: ${data.link}`)
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Error sending invitation')
    }
  }

  const addUnitToSalesList = async (unit: SalesListUnit) => {
    if (!activeSalesList) return

    try {
      const { error } = await supabase
        .from('sales_list_units')
        .insert({
          sales_list_id: activeSalesList.id,
          unit_id: unit.unit_id,
          status: 'available'
        })

      if (error) throw error

      // Refresh the data
      await fetchSalesListUnits()
    } catch (error) {
      console.error('Error adding unit to sales list:', error)
      alert('Error adding unit to sales list')
    }
  }

  const startEditingPrice = (unitId: string, priceType: 'listPrice' | 'soldPrice', currentValue: number | null) => {
    setEditingPrices(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [priceType]: true }
    }))
    setTempPrices(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [priceType]: currentValue?.toString() || '' }
    }))
  }

  const cancelEditingPrice = (unitId: string, priceType: 'listPrice' | 'soldPrice') => {
    setEditingPrices(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [priceType]: false }
    }))
    setTempPrices(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [priceType]: undefined }
    }))
  }

  const updatePrice = async (unitId: string, priceType: 'listPrice' | 'soldPrice') => {
    try {
      setUpdatingPrice(unitId)
      const newPrice = tempPrices[unitId]?.[priceType]
      const priceValue = newPrice && newPrice.trim() !== '' ? parseFloat(newPrice) : null

      const column = priceType === 'listPrice' ? 'list_price' : 'sold_price'
      
      const { error } = await supabase
        .from('sales_list_units')
        .update({ [column]: priceValue })
        .eq('unit_id', unitId)
        .eq('sales_list_id', activeSalesList?.id)

      if (error) throw error

      // Update local state
      setSalesListUnits(prev => prev.map(unit => 
        unit.unit_id === unitId 
          ? { ...unit, [priceType === 'listPrice' ? 'list_price' : 'sold_price']: priceValue }
          : unit
      ))

      // Clear editing state
      cancelEditingPrice(unitId, priceType)
    } catch (error) {
      console.error('Error updating price:', error)
      alert('Failed to update price')
    } finally {
      setUpdatingPrice(null)
    }
  }

  const removePrice = async (unitId: string, priceType: 'listPrice' | 'soldPrice') => {
    try {
      setUpdatingPrice(unitId)
      const column = priceType === 'listPrice' ? 'list_price' : 'sold_price'
      
      const { error } = await supabase
        .from('sales_list_units')
        .update({ [column]: null })
        .eq('unit_id', unitId)
        .eq('sales_list_id', activeSalesList?.id)

      if (error) throw error

      // Update local state
      setSalesListUnits(prev => prev.map(unit => 
        unit.unit_id === unitId 
          ? { ...unit, [priceType === 'listPrice' ? 'list_price' : 'sold_price']: null }
          : unit
      ))
    } catch (error) {
      console.error('Error removing price:', error)
      alert('Failed to remove price')
    } finally {
      setUpdatingPrice(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/admin/projects/${projectId}`}>
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Button>
      </Link>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sales Lists</h1>
          <p className="text-gray-600">Manage unit sales and client assignments</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Sales List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Sales List</DialogTitle>
              <DialogDescription>Create a new sales list for this project</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Sales List Name</Label>
                <Input
                  id="name"
                  value={newSalesListForm.name}
                  onChange={(e) => setNewSalesListForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Phase 1, Building A, etc."
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newSalesListForm.description}
                  onChange={(e) => setNewSalesListForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this sales list"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSalesList} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales List Tabs */}
      {salesLists.length > 0 && (
        <div className="flex gap-2 border-b">
          {salesLists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveSalesList(list)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeSalesList?.id === list.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}

      {/* Sales List Content */}
      {activeSalesList ? (
        <Card>
          <CardHeader>
                          <div>
                <CardTitle>{activeSalesList.name}</CardTitle>
                <CardDescription>{activeSalesList.description}</CardDescription>
              </div>
          </CardHeader>
          <CardContent>
            {salesListUnits.length === 0 ? (
              <div className="text-center py-8">
                <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No units found for this project</p>
                <p className="text-sm text-gray-500">Create units in the Units section to see them here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Sales Status</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Listed Price</TableHead>
                    <TableHead>Sold Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesListUnits.map(unit => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.unit.unit_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{unit.unit.unit_type?.name}</p>
                          <p className="text-sm text-gray-500">
                            {unit.unit.unit_type?.bedrooms}BR • {unit.unit.unit_type?.bathrooms}BA • {unit.unit.unit_type?.size_m2}m²
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          unit.status === 'available' ? 'default' :
                          unit.status === 'reserved' ? 'secondary' :
                          unit.status === 'sold' ? 'default' : 
                          unit.status === 'not_in_list' ? 'outline' : 'outline'
                        }>
                          {unit.status === 'not_in_list' ? 'Not in Sales List' : unit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {unit.client ? (
                          <div>
                            <p className="font-medium">{unit.client.name}</p>
                            <p className="text-sm text-gray-500">{unit.client.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingPrices[unit.unit_id]?.listPrice ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={tempPrices[unit.unit_id]?.listPrice || ''}
                                onChange={(e) => setTempPrices(prev => ({
                                  ...prev,
                                  [unit.unit_id]: { ...prev[unit.unit_id], listPrice: e.target.value }
                                }))}
                                className="w-24 h-8"
                                placeholder="0"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePrice(unit.unit_id, 'listPrice')}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEditingPrice(unit.unit_id, 'listPrice')}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="min-w-[80px]">
                                {unit.list_price ? `$${unit.list_price.toLocaleString()}` : '-'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingPrice(unit.unit_id, 'listPrice', unit.list_price)}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {unit.list_price && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removePrice(unit.unit_id, 'listPrice')}
                                  disabled={updatingPrice === unit.unit_id}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingPrices[unit.unit_id]?.soldPrice ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={tempPrices[unit.unit_id]?.soldPrice || ''}
                                onChange={(e) => setTempPrices(prev => ({
                                  ...prev,
                                  [unit.unit_id]: { ...prev[unit.unit_id], soldPrice: e.target.value }
                                }))}
                                className="w-24 h-8"
                                placeholder="0"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePrice(unit.unit_id, 'soldPrice')}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEditingPrice(unit.unit_id, 'soldPrice')}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="min-w-[80px]">
                                {unit.sold_price ? `$${unit.sold_price.toLocaleString()}` : '-'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingPrice(unit.unit_id, 'soldPrice', unit.sold_price)}
                                disabled={updatingPrice === unit.unit_id}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {unit.sold_price && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removePrice(unit.unit_id, 'soldPrice')}
                                  disabled={updatingPrice === unit.unit_id}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {unit.status === 'not_in_list' ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addUnitToSalesList(unit)}
                            >
                              <Building2 className="w-4 h-4" />
                            </Button>
                          ) : !unit.client ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => { setSelectedUnit(unit); setShowAssignClientDialog(true) }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendInvitation(unit)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No sales lists created yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Sales List
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assign Client Dialog */}
      <Dialog open={showAssignClientDialog} onOpenChange={setShowAssignClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Client - Unit {selectedUnit?.unit.unit_number}</DialogTitle>
            <DialogDescription>Assign a client to this unit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientForm.name}
                onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={clientForm.phone}
                onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+64 21 123 4567"
              />
            </div>
                            <div>
                  <Label htmlFor="listPrice">Listed Price</Label>
                  <Input
                    id="listPrice"
                    type="number"
                    value={clientForm.listPrice}
                    onChange={(e) => setClientForm(prev => ({ ...prev, listPrice: e.target.value }))}
                    placeholder="650000"
                  />
                </div>
                <div>
                  <Label htmlFor="soldPrice">Sold Price</Label>
                  <Input
                    id="soldPrice"
                    type="number"
                    value={clientForm.soldPrice}
                    onChange={(e) => setClientForm(prev => ({ ...prev, soldPrice: e.target.value }))}
                    placeholder="620000"
                  />
                </div>
            <div className="flex gap-2">
              <Button onClick={assignClient} className="flex-1">Assign Client</Button>
              <Button variant="outline" onClick={() => setShowAssignClientDialog(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 