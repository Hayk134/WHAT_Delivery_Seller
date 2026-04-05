import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { readWorkspace, writeWorkspace } from "@/lib/storage";
import type {
  BranchResponse,
  LocalReceipt,
  MerchantWorkspaceState,
  ProductResponse,
} from "@/types/api";

interface MerchantWorkspaceContextValue {
  workspace: MerchantWorkspaceState;
  addBranch: (branch: BranchResponse) => void;
  addProduct: (product: ProductResponse) => void;
  addReceipt: (receipt: LocalReceipt) => void;
}

const MerchantWorkspaceContext =
  createContext<MerchantWorkspaceContextValue | null>(null);

function createInitialState(organizationId: number): MerchantWorkspaceState {
  return {
    organizationId,
    branches: [],
    products: [],
    receipts: [],
  };
}

export function MerchantWorkspaceProvider({
  organizationId,
  token,
  children,
}: {
  organizationId: number;
  token: string;
  children: ReactNode;
}) {
  const [workspace, setWorkspace] = useState<MerchantWorkspaceState>(() => {
    return readWorkspace(organizationId) ?? createInitialState(organizationId);
  });

  useEffect(() => {
    setWorkspace(readWorkspace(organizationId) ?? createInitialState(organizationId));
  }, [organizationId]);

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([api.getBranches(token), api.getProducts(token)]).then(
      ([branchesResult, productsResult]) => {
        if (isCancelled) {
          return;
        }

        setWorkspace((current) => ({
          ...current,
          organizationId,
          branches:
            branchesResult.status === "fulfilled"
              ? mergeById(branchesResult.value, current.branches)
              : current.branches,
          products:
            productsResult.status === "fulfilled"
              ? mergeById(productsResult.value, current.products)
              : current.products,
        }));
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [organizationId, token]);

  useEffect(() => {
    writeWorkspace(workspace);
  }, [workspace]);

  const value = useMemo<MerchantWorkspaceContextValue>(
    () => ({
      workspace,
      addBranch: (branch) => {
        setWorkspace((current) => ({
          ...current,
          branches: [branch, ...current.branches.filter((item) => item.id !== branch.id)],
        }));
      },
      addProduct: (product) => {
        setWorkspace((current) => ({
          ...current,
          products: [product, ...current.products.filter((item) => item.id !== product.id)],
        }));
      },
      addReceipt: (receipt) => {
        setWorkspace((current) => ({
          ...current,
          receipts: [
            receipt,
            ...current.receipts.filter((item) => item.receiptId !== receipt.receiptId),
          ],
        }));
      },
    }),
    [workspace],
  );

  return (
    <MerchantWorkspaceContext.Provider value={value}>
      {children}
    </MerchantWorkspaceContext.Provider>
  );
}

export function useMerchantWorkspace() {
  const context = useContext(MerchantWorkspaceContext);

  if (!context) {
    throw new Error(
      "useMerchantWorkspace must be used within MerchantWorkspaceProvider",
    );
  }

  return context;
}

function mergeById<T extends { id: number }>(primary: T[], secondary: T[]) {
  const seen = new Set<number>();
  const result: T[] = [];

  for (const item of [...primary, ...secondary]) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}
