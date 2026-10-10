
const API_URL = "http://localhost:5001/api/purchase-orders";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrderItemInput {
  product_id: number;
  quantity_ordered: number;
  unit_cost?: number;
}

export interface PurchaseOrderInput {
  supplier_id: number;
  order_date: string;
  expected_delivery_date?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | string;
  line_total: number | string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  created_by: number;
  created_by_name: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Something went wrong with the purchase order request."
    );
  }

  return result;
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const result = await request<PurchaseOrder[]>(API_URL);
  return result.data;
}

export async function getPurchaseOrderById(
  id: number
): Promise<PurchaseOrder> {
  const result = await request<PurchaseOrder>(`${API_URL}/${id}`);
  return result.data;
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput
): Promise<{ id: number; po_number: string }> {
  const result = await request<{ id: number; po_number: string }>(API_URL, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.data;
}

export async function updatePurchaseOrder(
  id: number,
  input: PurchaseOrderInput
): Promise<void> {
  await request<unknown>(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updatePurchaseOrderStatus(
  id: number,
  status: "ORDERED" | "CANCELLED"
): Promise<void> {
  await request<unknown>(`${API_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface ReceivedPurchaseOrderItem {
  item_id: number;
  quantity: number;
}

export async function receivePurchaseOrder(
  id: number,
  items: ReceivedPurchaseOrderItem[]
): Promise<{ status: PurchaseOrderStatus }> {
  const result = await request<{ status: PurchaseOrderStatus }>(
    `${API_URL}/${id}/receive`,
    {
      method: "POST",
      body: JSON.stringify({ items }),
    }
  );

  return result.data;
}
