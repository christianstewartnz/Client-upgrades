"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ClientHeader } from "@/components/client/client-header"
import { StepIndicator } from "@/components/client/step-indicator"
import { ColorSchemeStep } from "@/components/client/color-scheme-step"
import { UpgradeOptionsStep } from "@/components/client/upgrade-options-step"
import { ReviewSubmitStep } from "@/components/client/review-submit-step"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Save } from "lucide-react"
import { FloorPlanStep } from "@/components/client/floor-plan-step"
import type { ClientData, ClientUpgrade } from '@/types/client'
import type { ColorScheme } from '@/types/color-scheme'
import type { Upgrade } from '@/types/upgrade'
import { supabase } from '@/lib/supabase'

export default function ClientPortal() {
  const params = useParams()
  const token = params.token as string
  const [currentStep, setCurrentStep] = useState(1)
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([])
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([])
  const [unitTypeId, setUnitTypeId] = useState<string>("")
  const [unitId, setUnitId] = useState<string>("")
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [clientData, setClientData] = useState<ClientData>({
    project_name: "Riverside Gardens",
    development_company: "Premier Developments Ltd",
    unit_number: "A-101",
    unit_type: "Type A",
    color_scheme: "",
    upgrades: [],
    is_submitted: false,
  })

  // Fetch client data and color schemes from database
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true)
        
        // Fetch unit data based on token (assuming token maps to username/unit)
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select(`
            id,
            unit_number,
            project_id,
            unit_type_id,
            username,
            floor_plan_url
          `)
          .eq('username', token)
          .single()

        if (unitError || !unitData) {
          console.log('Unit not found for token, using demo data')
        } else {
          // Fetch project details
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', unitData.project_id)
            .single()

          // Fetch unit type details
          const { data: unitTypeData } = await supabase
            .from('unit_types')
            .select('name')
            .eq('id', unitData.unit_type_id)
            .single()

          // Update client data with real information
          setClientData(prev => ({
            ...prev,
            project_name: projectData?.name || 'Unknown Project',
            unit_number: unitData.unit_number,
            unit_type: unitTypeData?.name || 'Unknown Type',
          }))
          setUnitTypeId(unitData.unit_type_id)
          setUnitId(unitData.id)
          setFloorPlanUrl(unitData.floor_plan_url || '')

          // Fetch color schemes for this unit type and project
          const { data: schemesData, error: schemesError } = await supabase
            .from('color_schemes')
            .select('*')
            .eq('project_id', unitData.project_id)

          if (schemesError) {
            console.error('Error fetching color schemes:', schemesError)
          } else {
            // Filter schemes that are allowed for this unit type
            const allowedSchemes = schemesData?.filter(scheme => {
              const allowedTypes = scheme.applicableunittypes
              return allowedTypes && allowedTypes.includes(unitData.unit_type_id)
            }) || []
            
            setColorSchemes(allowedSchemes)
          }

          // Fetch upgrade options for this project
          const { data: upgradesData, error: upgradesError } = await supabase
            .from('upgrade_options')
            .select('*')
            .eq('project_id', unitData.project_id)

          if (upgradesError) {
            console.error('Error fetching upgrades:', upgradesError)
          } else {
            // Map upgrade options to Upgrade type
            const mappedUpgrades: Upgrade[] = upgradesData?.map(option => ({
              id: option.id,
              name: option.name,
              description: option.description,
              category: option.category,
              price: option.price,
              max_quantity: option.max_quantity,
              project_id: option.project_id,
              allowedUnitTypes: option.allowed_unit_types || []
            })) || []
            
            setAvailableUpgrades(mappedUpgrades)
          }
        }
      } catch (error) {
        console.error('Error fetching client data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClientData()
    
    // Load saved progress from localStorage
    const savedData = localStorage.getItem(`client-data-${token}`)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      setClientData(prev => ({ ...prev, ...parsed }))
      // Determine current step based on saved data
      if (parsed.is_submitted) {
        setCurrentStep(5) // Confirmation step
      } else if (parsed.upgrades?.length > 0 && hasElectricalUpgrades(parsed.upgrades)) {
        setCurrentStep(4) // Review step (if floor plan completed)
      } else if (parsed.upgrades?.length > 0) {
        setCurrentStep(3) // Floor plan step
      } else if (parsed.color_scheme) {
        setCurrentStep(2) // Upgrades step
      }
    }
  }, [token])

  // Add helper function to check for electrical upgrades
  const hasElectricalUpgrades = (upgrades: ClientUpgrade[]) => {
    return upgrades.some((upgrade) => upgrade.category === "Electrical" || upgrade.category === "Lighting")
  }

  const saveProgress = async () => {
    try {
      // Save to localStorage immediately for responsive UX
      localStorage.setItem(`client-data-${token}`, JSON.stringify(clientData))
      
      // Also save draft to database if we have enough data
      if (unitId && (clientData.color_scheme || clientData.upgrades.length > 0)) {
        const draftData = {
          ...clientData,
          is_submitted: false,
          unit_id: unitId,
          token: token,
          client_name: `Client ${clientData.unit_number}`,
          selected_upgrades: clientData.upgrades
        }

        await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(draftData)
        })
      }
    } catch (error) {
      console.error('Error saving progress:', error)
      // Still saved to localStorage, so not critical
    }
  }

  const updateColorScheme = (scheme: string) => {
    setClientData((prev: ClientData) => ({ ...prev, color_scheme: scheme }))
  }

  const updateUpgrades = (upgrades: ClientUpgrade[]) => {
    setClientData((prev: ClientData) => ({ ...prev, upgrades }))
  }

  const submitSelections = async () => {
    try {
      const submissionData = {
        ...clientData,
        is_submitted: true,
        unit_id: unitId,
        token: token,
        client_name: `Client ${clientData.unit_number}`, // Default name, could be enhanced
        selected_upgrades: clientData.upgrades
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })

      if (response.ok) {
        const finalData = { ...clientData, is_submitted: true }
        setClientData(finalData)
        localStorage.setItem(`client-data-${token}`, JSON.stringify(finalData))
        setCurrentStep(5)
      } else {
        console.error('Failed to submit selections')
        // Could add user notification here
      }
    } catch (error) {
      console.error('Error submitting selections:', error)
      // Could add user notification here
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && clientData.color_scheme) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Check if we need floor plan step
      if (hasElectricalUpgrades(clientData.upgrades)) {
        setCurrentStep(3)
      } else {
        setCurrentStep(4) // Skip to review
      }
    } else if (currentStep === 3) {
      setCurrentStep(4)
    }
    saveProgress()
  }

  const prevStep = () => {
    if (currentStep === 4) {
      // Check if we came from floor plan or upgrades
      if (hasElectricalUpgrades(clientData.upgrades)) {
        setCurrentStep(3)
      } else {
        setCurrentStep(2)
      }
    } else if (currentStep === 3) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const canProceedFromFloorPlan = () => {
    const electricalUpgrades = clientData.upgrades.filter(
      (upgrade: ClientUpgrade) => upgrade.category === "Electrical" || upgrade.category === "Lighting",
    )

    if (electricalUpgrades.length === 0) return true

    return electricalUpgrades.every((upgrade: ClientUpgrade) => {
      const placedPoints = upgrade.floor_plan_points?.length || 0
      return placedPoints === upgrade.quantity
    })
  }

  if (clientData.is_submitted && currentStep === 5) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientHeader project_name={clientData.project_name} development_company={clientData.development_company} />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Selections Submitted Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Thank you for completing your unit customization. Your selections have been submitted to{" "}
                {clientData.development_company}.
              </p>
              <p className="text-sm text-gray-500">
                Unit: {clientData.unit_number} | Reference: {token}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your customization portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader project_name={clientData.project_name} development_company={clientData.development_company} />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <StepIndicator currentStep={currentStep} />
        </div>

        <div className="mb-6">
          {currentStep === 1 && (
            <ColorSchemeStep
              selected_scheme={clientData.color_scheme}
              on_scheme_change={updateColorScheme}
              unit_type={clientData.unit_type}
              unit_number={clientData.unit_number}
              available_color_schemes={colorSchemes}
            />
          )}
          {currentStep === 2 && (
            <UpgradeOptionsStep
              selected_upgrades={clientData.upgrades}
              on_upgrades_change={updateUpgrades}
              unit_type={clientData.unit_type}
              unit_type_id={unitTypeId}
              available_upgrades={availableUpgrades}
              loading={loading}
            />
          )}
          {currentStep === 3 && (
            <FloorPlanStep
              selected_upgrades={clientData.upgrades}
              on_upgrades_change={updateUpgrades}
              unit_type={clientData.unit_type}
              unit_id={unitId}
              floor_plan_url={floorPlanUrl}
            />
          )}
          {currentStep === 4 && (
            <ReviewSubmitStep 
              client_data={clientData} 
              on_submit={submitSelections}
              available_color_schemes={colorSchemes}
            />
          )}
        </div>

        <div className="flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={saveProgress} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>

            {currentStep < 4 && (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !clientData.color_scheme) || (currentStep === 3 && !canProceedFromFloorPlan())
                }
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
