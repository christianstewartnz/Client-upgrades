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
  project_id: string
  unit_type_id: string
  floor_plan_file: File | null
  floor_plan_url?: string
  status: "active" | "inactive"
  username: string
  password: string
  sales_list_assignments?: string[] // Array of sales list IDs this unit is assigned to
}

export interface SalesList {
  id: string
  project_id: string
  name: string
  description?: string
  status: "active" | "inactive" | "closed"
  created_at: string
  updated_at: string
} 