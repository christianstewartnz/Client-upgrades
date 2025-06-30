"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Portal state
  const [currentStep, setCurrentStep] = useState(1)
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([])
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([])
  const [unitTypeId, setUnitTypeId] = useState<string>("")
  const [unitId, setUnitId] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [clientData, setClientData] = useState<ClientData>({
    project_name: "",
    development_company: "",
    unit_number: "",
    unit_type: "",
    color_scheme: "",
    upgrades: [],
    is_submitted: false,
  })

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('client-session')
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession)
        setIsAuthenticated(true)
        setUnitId(sessionData.unitId)
        setUsername(sessionData.username)
        fetchClientData(sessionData.unitId)
      } catch (error) {
        localStorage.removeItem('client-session')
        router.push('/')
      }
    } else {
      // No session found, redirect to login
      router.push('/')
    }
  }, [router])



  // Fetch client data after authentication
  const fetchClientData = async (unitId: string) => {
    try {
      setLoading(true)
      
      // Fetch unit data
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
        .eq('id', unitId)
        .single()

      if (unitError || !unitData) {
        throw new Error('Failed to load unit data')
      }

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
      setFloorPlanUrl(unitData.floor_plan_url || '')

      // Fetch color schemes for this unit type and project
      const { data: schemesData, error: schemesError } = await supabase
        .from('color_schemes')
        .select('*')
        .eq('project_id', unitData.project_id)

      if (!schemesError) {
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

      if (!upgradesError) {
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

      // Load saved progress from localStorage
      const savedData = localStorage.getItem(`client-data-${unitId}`)
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

    } catch (error) {
      console.error('Error fetching client data:', error)
      handleLogout()
    } finally {
      setLoading(false)
    }
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('client-session')
    localStorage.removeItem(`client-data-${unitId}`)
    setIsAuthenticated(false)
    setClientData({
      project_name: "",
      development_company: "",
      unit_number: "",
      unit_type: "",
      color_scheme: "",
      upgrades: [],
      is_submitted: false,
    })
    setCurrentStep(1)
    router.push('/')
  }

  // Helper function to check for electrical upgrades
  const hasElectricalUpgrades = (upgrades: ClientUpgrade[]) => {
    return upgrades.some((upgrade) => upgrade.category === "Electrical" || upgrade.category === "Lighting")
  }

  const saveProgress = () => {
    localStorage.setItem(`client-data-${unitId}`, JSON.stringify(clientData))
  }

  const updateColorScheme = (scheme: string) => {
    setClientData((prev: ClientData) => ({ ...prev, color_scheme: scheme }))
  }

  const updateUpgrades = (upgrades: ClientUpgrade[]) => {
    setClientData((prev: ClientData) => ({ ...prev, upgrades }))
  }

  const submitSelections = () => {
    const finalData = { ...clientData, is_submitted: true }
    setClientData(finalData)
    localStorage.setItem(`client-data-${unitId}`, JSON.stringify(finalData))
    setCurrentStep(5)
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

  // Show redirect message if not authenticated (should redirect automatically)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin" />
          <span className="text-lg text-gray-500">Redirecting to login...</span>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin" />
          <span className="text-lg text-gray-500">Loading your unit data...</span>
        </div>
      </div>
    )
  }

  // Show completion page
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
                Thank you for completing your unit customization. Your selections have been submitted.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show main portal
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader 
        project_name={clientData.project_name} 
        development_company={clientData.development_company}
        onLogout={handleLogout}
      />

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
                  (currentStep === 1 && !clientData.color_scheme) || 
                  (currentStep === 3 && !canProceedFromFloorPlan())
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