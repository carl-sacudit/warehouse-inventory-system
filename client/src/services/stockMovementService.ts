export type MovementType = "IN" | "OUT";

export interface StockMovement {
id: number;
product_id: number;
movement_type: MovementType | "ADJUSTMENT";
quantity: number;
reference_note: string | null;
created_at: string;
product_name: string;
sku: string;
}

export interface CreateStockMovementInput {
product_id: number;
movement_type: MovementType;
quantity: number;
reference_note?: string;
}



const API_URL = "http://localhost:5001/api/stock-movements";

async function handleResponse<T>(response: Response): Promise<T> {
const result = await response.json();

if (!response.ok || !result.success) {
throw new Error(
result.message || "Something went wrong with the stock movement request."
);
}

return result.data as T;
}

export async function getStockMovements(): Promise<StockMovement[]> {
const response = await fetch(API_URL, {
method: "GET",
credentials: "include",
});

return handleResponse<StockMovement[]>(response);
}

export async function createStockMovement(
input: CreateStockMovementInput
): Promise<{ id: number; remaining_quantity: number }> {
const response = await fetch(API_URL, {
method: "POST",
credentials: "include",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify(input),
});

return handleResponse<{
id: number;
remaining_quantity: number;
}>(response);
}
