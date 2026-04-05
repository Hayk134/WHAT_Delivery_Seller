import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/app/app-shell";
import { AuthGuard } from "@/components/app/auth-guard";
import { AuthPage } from "@/pages/auth-page";
import { BranchesPage } from "@/pages/branches-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { OrderBoardPage } from "@/pages/order-board-page";
import { OrganizationPage } from "@/pages/organization-page";
import { ProductsPage } from "@/pages/products-page";
import { StockPage } from "@/pages/stock-page";

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrderBoardPage /> },
      { path: "branches", element: <BranchesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "organization", element: <OrganizationPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
