export interface UnitType {
  id: string
  name: string
  description: string
  bedrooms: number
  bathrooms: number
  size_m2: number
  allowedColorSchemes: string[]
  allowedUpgrades: string[]
  project_id: string
}

export interface Unit {
  id: string
  unit_number: string
  unit_type_id: string
  floor_plan_file: File | null
  floor_plan_url?: string
  status: "active" | "inactive"
  username: string
  password: string
} 