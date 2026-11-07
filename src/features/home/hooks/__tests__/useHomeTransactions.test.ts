// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionFormValues } from "@/features/transaction/schemas/transaction.schema";
import type { TTransaction } from "@/features/transaction/types";
import { useHomeTransactions } from "../useHomeTransactions";

const updateTransaction = vi.fn();
const addToList = vi.fn();

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/observability/client", () => ({ track: vi.fn() }));
vi.mock("@/features/transaction/stores/transaction.store", () => ({
  useTransactionMutations: () => ({
    createTransaction: vi.fn(),
    updateTransaction,
    deleteTransaction: vi.fn(),
  }),
}));
vi.mock("@/features/list/stores/list.store", () => ({
  useAddToList: () => ({ mutate: addToList }),
  useLists: () => ({
    lists: [
      { id: "private", name: "Privada", isPrivate: true, currency: "PEN" },
      { id: "trip", name: "Viaje", isPrivate: false, currency: "PEN" },
    ],
  }),
}));

const transaction = { id: "t1", description: "Taxi", amount: 10, type: "expense", categoryId: "c1", transactionDate: "2026-11-01", listId: "private" } as TTransaction;
const values = { description: "Taxi", amount: 10, type: "expense", categoryId: "c1", transactionDate: "2026-11-01" } as TransactionFormValues;

function setup() {
  const toast = vi.fn();
  const hook = renderHook(() =>
    useHomeTransactions({ listId: "private", openForm: vi.fn(), onCreated: vi.fn(), toast }),
  );
  act(() => hook.result.current.startEditing(transaction));
  return { ...hook, toast };
}

beforeEach(() => vi.clearAllMocks());

describe("useHomeTransactions al editar", () => {
  it("expone la lista actual del movimiento para preseleccionarla en el formulario", () => {
    const { result } = setup();

    expect(result.current.editingListId).toBe("private");
  });

  it("elegir otra lista guarda los cambios y mueve el movimiento a esa lista", () => {
    const { result } = setup();

    act(() => result.current.submitForm(values, null, "trip"));

    expect(updateTransaction).toHaveBeenCalledWith(transaction, values);
    expect(addToList).toHaveBeenCalledWith(
      { listId: "trip", transactionIds: ["t1"] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("si la lista no cambia solo actualiza el movimiento", () => {
    const { result } = setup();

    act(() => result.current.submitForm(values, null, "private"));

    expect(updateTransaction).toHaveBeenCalledOnce();
    expect(addToList).not.toHaveBeenCalled();
  });
});
