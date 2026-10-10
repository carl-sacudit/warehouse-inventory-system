export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface SupplierInput {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const API_URL = "http://localhost:5001/api/suppliers";

async function handleResponse<T>(
  response: Response
): Promise<T> {
  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Something went wrong with the supplier request."
    );
  }

  return result.data;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const response = await fetch(API_URL, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse<Supplier[]>(response);
}

export async function getSupplierById(
  id: number
): Promise<Supplier> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse<Supplier>(response);
}

export async function createSupplier(
  input: SupplierInput
): Promise<{ id: number }> {
  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return handleResponse<{ id: number }>(response);
}

export async function updateSupplier(
  id: number,
  input: SupplierInput
): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  await handleResponse<unknown>(response);
}

export async function deleteSupplier(
  id: number
): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  await handleResponse<unknown>(response);
}
