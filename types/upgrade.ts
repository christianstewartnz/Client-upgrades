export interface Upgrade {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  max_quantity: number;
  project_id: string;
  allowedUnitTypes: string[];
}

// UpgradeOption is used for admin CRUD and includes allowedUnitTypes
export interface UpgradeOption extends Upgrade {}
