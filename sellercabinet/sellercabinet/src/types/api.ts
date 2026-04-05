export type AccountRole = "CUSTOMER" | "COURIER" | "MERCHANT_ADMIN" | "MODERATOR";
export type AccountStatus = "ACTIVE" | "BLOCKED";
export type OrganizationStatus = "ACTIVE" | "BLOCKED";
export type BranchStatus = "ACTIVE" | "BLOCKED";
export type ProductStatus = "ACTIVE" | "ARCHIVED";
export type MeasureUnit = "PIECE" | "KILOGRAM";
export type InventoryMovementType =
  | "RECEIPT"
  | "RESERVATION_CREATED"
  | "RESERVATION_RELEASED"
  | "WRITE_OFF"
  | "MANUAL_ADJUSTMENT";
export type OrderStatus =
  | "AWAITING_STORE_CONFIRMATION"
  | "ASSEMBLING"
  | "READY_FOR_PICKUP"
  | "COURIER_ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: "MERCHANT_ADMIN";
  organizationName: string;
  organizationLegalName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  role: AccountRole;
  accountId: number;
  organizationId: number | null;
}

export interface AccountProfileResponse {
  id: number;
  email: string;
  fullName: string;
  role: AccountRole;
  status: AccountStatus;
  organizationId: number | null;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  legalName: string;
  status: OrganizationStatus;
}

export interface BranchResponse {
  id: number;
  organizationId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: BranchStatus;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ProductResponse {
  id: number;
  organizationId: number;
  name: string;
  measure: MeasureUnit;
  priceMinor: number;
  status: ProductStatus;
}

export interface CreateProductRequest {
  name: string;
  measure: MeasureUnit;
  priceMinor: number;
}

export interface StockReceiptItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateStockReceiptRequest {
  branchId: number;
  items: StockReceiptItemRequest[];
}

export interface StockReceiptLineResponse {
  productId: number;
  productName: string;
  measure: MeasureUnit;
  quantity: number;
}

export interface StockReceiptResponse {
  id: number;
  branchId: number;
  branchName: string;
  createdByAccountId: number;
  createdAt: string;
  items: StockReceiptLineResponse[];
}

export interface BranchStockResponse {
  branchId: number;
  productId: number;
  productName: string;
  measure: MeasureUnit;
  availableQuantity: number;
  reservedQuantity: number;
  onHandQuantity: number;
}

export interface InventoryMovementResponse {
  id: number;
  branchId: number;
  productId: number;
  productName: string;
  measure: MeasureUnit;
  orderId?: number | null;
  receiptId?: number | null;
  actorAccountId?: number | null;
  movementType: InventoryMovementType;
  deltaAvailableQuantity: number;
  deltaReservedQuantity: number;
  availableAfterQuantity: number;
  reservedAfterQuantity: number;
  onHandAfterQuantity: number;
  note?: string | null;
  createdAt: string;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  measure: MeasureUnit;
  quantity: number;
  priceMinor: number;
  lineTotalMinor: number;
}

export interface CourierInfoResponse {
  courierId: number;
  courierName: string;
}

export interface OrderStatusHistoryResponse {
  status: OrderStatus;
  changedBy: string;
  changedAt: string;
  note?: string | null;
}

export interface OrderResponse {
  id: number;
  customerAccountId: number;
  organizationId: number;
  branchId: number;
  branchName: string;
  courier?: CourierInfoResponse | null;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  customerComment?: string | null;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalAmountMinor: number;
  courierPayoutMinor: number;
  rating?: number | null;
  reviewComment?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
  history: OrderStatusHistoryResponse[];
}

export interface OrderRealtimeEvent {
  type: string;
  orderId: number;
  status?: OrderStatus | null;
  courierLatitude?: number | null;
  courierLongitude?: number | null;
  message?: string | null;
  createdAt: string;
}

export interface InventoryRealtimeEvent {
  type: string;
  branchId: number;
  productId: number;
  stock: BranchStockResponse;
  movement?: InventoryMovementResponse | null;
  createdAt: string;
}

export interface ErrorResponse {
  message: string;
}

export interface ApiSession {
  accessToken: string;
  refreshToken: string;
  role: AccountRole;
  accountId: number;
  organizationId: number | null;
}

export interface LocalReceipt {
  receiptId: number;
  branchId: number;
  items: StockReceiptItemRequest[];
  createdAt: string;
}

export interface MerchantWorkspaceState {
  organizationId: number;
  branches: BranchResponse[];
  products: ProductResponse[];
  receipts: LocalReceipt[];
}
