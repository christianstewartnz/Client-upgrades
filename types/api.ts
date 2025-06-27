export interface APIResponse<T = any> {
  data?: T;
  error?: string;
}

// Add more specific API request/response types as needed 