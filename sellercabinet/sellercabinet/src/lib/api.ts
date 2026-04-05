import { env } from "@/lib/env";
import type {
  AccountProfileResponse,
  ApiSession,
  AuthTokenResponse,
  BranchResponse,
  BranchStockResponse,
  CreateBranchRequest,
  CreateProductRequest,
  CreateStockReceiptRequest,
  InventoryMovementResponse,
  LoginRequest,
  OrderResponse,
  ProductResponse,
  RegisterRequest,
  StockReceiptResponse,
} from "@/types/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

function extractCollection<T>(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    const firstArray = Object.values(record).find((value) => Array.isArray(value));
    if (Array.isArray(firstArray)) {
      return firstArray as T[];
    }
  }

  throw new Error("Unexpected collection response");
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "Не удалось выполнить запрос";

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  registerMerchant(payload: RegisterRequest) {
    return request<AuthTokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload: LoginRequest) {
    return request<AuthTokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me(token: string) {
    return request<AccountProfileResponse>("/api/v1/auth/me", {
      token,
    });
  },
  createBranch(token: string, payload: CreateBranchRequest) {
    return request<BranchResponse>("/api/v1/merchant/branches", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    });
  },
  createProduct(token: string, payload: CreateProductRequest) {
    return request<ProductResponse>("/api/v1/merchant/products", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    });
  },
  async getBranches(token: string) {
    const payload = await request<unknown>("/api/v1/merchant/branches", {
      token,
    });

    return extractCollection<BranchResponse>(payload, [
      "branches",
      "items",
      "content",
      "data",
      "results",
    ]);
  },
  async getProducts(token: string) {
    const payload = await request<unknown>("/api/v1/merchant/products", {
      token,
    });

    return extractCollection<ProductResponse>(payload, [
      "products",
      "items",
      "content",
      "data",
      "results",
    ]);
  },
  getStockReceipts(token: string) {
    return request<StockReceiptResponse[]>("/api/v1/merchant/stock-receipts", {
      token,
    });
  },
  createStockReceipt(token: string, payload: CreateStockReceiptRequest) {
    return request<StockReceiptResponse>("/api/v1/merchant/stock-receipts", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    });
  },
  getBranchStocks(token: string, branchId: number) {
    return request<BranchStockResponse[]>(
      `/api/v1/merchant/branches/${branchId}/stocks`,
      { token },
    );
  },
  getInventoryMovements(token: string, branchId: number, limit = 100) {
    return request<InventoryMovementResponse[]>(
      `/api/v1/merchant/branches/${branchId}/inventory-movements?limit=${limit}`,
      { token },
    );
  },
  getOrderBoard(token: string) {
    return request<OrderResponse[]>("/api/v1/merchant/orders/board", {
      token,
    });
  },
  confirmOrder(token: string, orderId: number) {
    return request<OrderResponse>(`/api/v1/merchant/orders/${orderId}/confirm`, {
      method: "POST",
      token,
    });
  },
  markOrderAssembling(token: string, orderId: number) {
    return request<OrderResponse>(`/api/v1/merchant/orders/${orderId}/assembling`, {
      method: "POST",
      token,
    });
  },
  markOrderReady(token: string, orderId: number) {
    return request<OrderResponse>(`/api/v1/merchant/orders/${orderId}/ready`, {
      method: "POST",
      token,
    });
  },
  handOffOrder(token: string, orderId: number) {
    return request<OrderResponse>(`/api/v1/merchant/orders/${orderId}/handed-off`, {
      method: "POST",
      token,
    });
  },
};

export function toSession(response: AuthTokenResponse): ApiSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    role: response.role,
    accountId: response.accountId,
    organizationId: response.organizationId,
  };
}
