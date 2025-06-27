"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { Upgrade } from "@/types/upgrade"
import type { ClientUpgrade } from '@/types/client'

interface UpgradeOptionsStepProps {
  selected_upgrades: ClientUpgrade[]
  on_upgrades_change: (upgrades: ClientUpgrade[]) => void
  unit_type: string
  unit_type_id: string
  available_upgrades?: Upgrade[]
  loading?: boolean
}

interface RequiredUpgrade extends Required<Pick<Upgrade, 'id' | 'name' | 'description' | 'category' | 'price' | 'max_quantity'>> {
  project_id: string;
  allowedUnitTypes: string[];
}

export function UpgradeOptionsStep({ selected_upgrades, on_upgrades_change, unit_type, unit_type_id, available_upgrades, loading }: UpgradeOptionsStepProps) {
  // Fallback upgrades for demo/development
  const fallbackUpgrades: Upgrade[] = [
    {
      id: "1",
      name: "Additional Power Points",
      description: "Extra electrical outlets",
      category: "Electrical",
      price: 150,
      max_quantity: 10,
      project_id: "demo",
      allowedUnitTypes: [],
    },
    {
      id: "2",
      name: "USB Power Points",
      description: "Combined power and USB outlets",
      category: "Electrical",
      price: 200,
      max_quantity: 5,
      project_id: "demo",
      allowedUnitTypes: [],
    },
    {
      id: "3",
      name: "LED Downlights",
      description: "Energy efficient lighting",
      category: "Lighting",
      price: 120,
      max_quantity: 8,
      project_id: "demo",
      allowedUnitTypes: [],
    },
    {
      id: "4",
      name: "Stone Benchtop Upgrade",
      description: "Premium stone kitchen surfaces",
      category: "Kitchen",
      price: 3500,
      max_quantity: 1,
      project_id: "demo",
      allowedUnitTypes: [],
    },
    {
      id: "5",
      name: "Smart Home Package",
      description: "Home automation system",
      category: "Technology",
      price: 2500,
      max_quantity: 1,
      project_id: "demo",
      allowedUnitTypes: [],
    },
  ]

  // Filter available upgrades for this unit type, or use fallback
  const upgrades = available_upgrades && available_upgrades.length > 0 
    ? available_upgrades.filter(upgrade => 
        upgrade.allowedUnitTypes && upgrade.allowedUnitTypes.includes(unit_type_id)
      )
    : fallbackUpgrades

  const updateQuantity = (upgradeId: string, quantity: number) => {
    const upgrade = upgrades.find((u) => u.id === upgradeId)
    if (!upgrade || !upgrade.id) {
      console.warn('Upgrade not found:', upgradeId)
      return
    }

    const updatedUpgrades = selected_upgrades.filter((u) => u.id !== upgradeId)

    if (quantity > 0) {
      const newUpgrade: ClientUpgrade = {
        id: upgrade.id,
        name: upgrade.name,
        description: upgrade.description,
        category: upgrade.category,
        price: upgrade.price,
        quantity: Math.min(quantity, upgrade.max_quantity),
      }
      updatedUpgrades.push(newUpgrade)
    }

    on_upgrades_change(updatedUpgrades)
  }

  const getQuantity = (upgradeId: string) => {
    const selected = selected_upgrades.find((u) => u.id === upgradeId)
    return selected ? selected.quantity : 0
  }

  const calculateSubtotal = () => {
    return selected_upgrades.reduce((total, upgrade) => total + upgrade.price * upgrade.quantity, 0)
  }

  const calculateGST = () => {
    return calculateSubtotal() * 0.15
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST()
  }

  const categories = [...new Set(upgrades.map((u) => u.category))]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Select Upgrade Options</CardTitle>
          <CardDescription>
            Choose additional features and upgrades for your {unit_type} unit. All prices exclude GST.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading upgrade options...</h3>
              <p className="text-gray-600">
                Fetching available upgrades for your unit type.
              </p>
            </div>
          ) : upgrades.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upgrade options available</h3>
              <p className="text-gray-600">
                No upgrade options have been configured for your unit type yet.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">{category}</h3>
                <div className="space-y-4">
                  {upgrades
                    .filter((u) => u.category === category)
                    .filter((u) => u.id) // Only show upgrades with valid IDs
                    .map((upgrade) => (
                      <div key={upgrade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{upgrade.name}</h4>
                          <p className="text-sm text-gray-600">{upgrade.description}</p>
                          <p className="text-sm font-medium text-green-600 mt-1">
                            ${upgrade.price.toLocaleString()} (excl. GST)
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label htmlFor={`qty-${upgrade.id!}`} className="text-sm">
                            Qty:
                          </Label>
                          <Input
                            id={`qty-${upgrade.id!}`}
                            type="number"
                            min="0"
                            max={upgrade.max_quantity}
                            value={getQuantity(upgrade.id!)}
                            onChange={(e) => updateQuantity(upgrade.id!, Number.parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <div className="text-right min-w-[100px]">
                            <p className="font-medium">${(upgrade.price * getQuantity(upgrade.id!)).toLocaleString()}</p>
                          </div>
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

      {selected_upgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selected_upgrades.map((upgrade) => (
                <div key={upgrade.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{upgrade.name}</p>
                    <p className="text-sm text-gray-600">Qty: {upgrade.quantity}</p>
                  </div>
                  <p className="font-medium">${(upgrade.price * upgrade.quantity).toLocaleString()}</p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p className="font-medium">${calculateSubtotal().toLocaleString()}</p>
              </div>
              <div className="flex justify-between">
                <p>GST (15%)</p>
                <p className="font-medium">${calculateGST().toLocaleString()}</p>
              </div>
              <Separator />
              <div className="flex justify-between">
                <p className="font-bold">Total</p>
                <p className="font-bold">${calculateTotal().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
