const API_URL = "http://localhost:5001/api/sales-orders";

export interface SalesOrderItemInput {
  product_id: number;
  quantity: number;
  unit_selling_price: number;
}

export interface SalesOrderInput {
  customer_name?: string | null;
  items: SalesOrderItemInput[];
}

export interface SalesOrder {
  id: number;
  sale_number: string;
  customer_name: string | null;
  created_by: number;
  created_by_name: string;
  total_revenue: number | string;
  total_cost: number | string;
  gross_profit: number | string;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const result = await response.json() as ApiResponse<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Sales order request failed.");
  }

  return result.data;
}

export function getSalesOrders(): Promise<SalesOrder[]> {
  return request<SalesOrder[]>(API_URL);
}

export function createSalesOrder(
  input: SalesOrderInput
): Promise<Pick<SalesOrder, "id" | "sale_number" | "total_revenue" | "total_cost" | "gross_profit">> {
  return request(API_URL, {
    method: "POST",
    body: JSON.stringify(input),
  });
}