export interface Submission {
  id: string;
  unitId?: string;
  unitNumber: string;
  projectName: string;
  clientName: string;
  colorScheme: string;
  upgradeValue: number;
  status: "draft" | "submitted";
  submittedDate: string;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for detailed submission data
  selectedUpgrades?: {
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    floor_plan_points?: Array<{ x: number; y: number }>;
  }[];
  floorPlanData?: any;
  token?: string;
} 