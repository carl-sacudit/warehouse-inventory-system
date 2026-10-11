const API_BASE_URL = "http://localhost:5001";
const API_URL = `${API_BASE_URL}/api/products`;

export interface Product {
  id: number;
  category_id: number | null;
  supplier_id: number | null;
  sku: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number | string;
  reorder_level: number;
  category_name?: string | null;
  supplier_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
}

export interface ProductInput {
  category_id?: number | null;
  supplier_id?: number | null;
  sku: string;
  name: string;
  description?: string;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  reorder_level: number;
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
    "Content-Type": "application/json",
    ...options?.headers,
  },
});

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Something went wrong. Please try again."
    );
  }

  return result as ApiResponse<T>;
}

export function getProductImageUrl(imageUrl: string): string {
  return imageUrl.startsWith("http")
    ? imageUrl
    : `${API_BASE_URL}${imageUrl}`;
}

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const result = await response.json() as ApiResponse<{ image_url: string }>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to upload product image.");
  }

  return result.data.image_url;
}

export async function getProducts(): Promise<Product[]> {
  const result = await request<Product[]>(API_URL);
  return result.data;
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const result = await request<ProductCategory[]>(`${API_URL}/categories`);
  return result.data;
}

export async function createProduct(
  product: ProductInput
): Promise<void> {
  await request<{ id: number }>(API_URL, {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(
  id: number,
  product: ProductInput
): Promise<void> {
  await request<unknown>(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(
  id: number
): Promise<void> {
  await request<unknown>(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}
