import type React from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, session } = useAuth();

  if (status === "loading") {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <div className="w-full space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-56 w-full rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
