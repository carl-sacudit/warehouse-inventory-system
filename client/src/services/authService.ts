
const API_URL = "http://localhost:5001/api";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: "ADMIN" | "WAREHOUSE_MANAGER" | "INVENTORY_STAFF";
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: AuthUser;
  };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Something went wrong. Please try again."
    );
  }

  return result as T;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const result = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!result.data?.user) {
      throw new Error("Login response did not contain user information.");
    }

    return result.data.user;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const result = await request<AuthResponse>("/auth/me");

    if (!result.data?.user) {
      throw new Error("Unable to retrieve the current user.");
    }

    return result.data.user;
  },

  async logout(): Promise<void> {
    await request("/auth/logout", {
      method: "POST",
    });
  },
};