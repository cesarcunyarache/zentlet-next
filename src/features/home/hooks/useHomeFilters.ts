import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useLists } from "@/features/list/stores/list.store";
import { useDisplayPreferences } from "@/features/preference/hooks/useDisplayPreferences";
import { periodRange } from "@/features/transaction/lib/format";
import type { Period, TransactionFilters, TransactionType } from "@/features/transaction/types";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PERIOD: Period = "all";

export function useHomeFilters() {
  const { feedPeriod, setFeedPeriod } = useDisplayPreferences();
  const [chosenPeriod, setChosenPeriod] = useState<Period | null>(null);
  const period = chosenPeriod ?? feedPeriod ?? DEFAULT_PERIOD;
  const [kind, setKind] = useState<TransactionType | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [chosenListId, setChosenListId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery] = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);

  const { lists } = useLists();
  const privateList = lists.find((list) => list.isPrivate);
  const selectedList = lists.find((list) => list.id === chosenListId) ?? privateList;
  const listId = selectedList?.id ?? null;

  const range = periodRange(period);
  const summaryFilters = { ...range, listId: listId ?? undefined };
  const feedFilters: TransactionFilters = {
    ...summaryFilters,
    type: kind ?? undefined,
    categoryId: categoryId ?? undefined,
    q: debouncedQuery || undefined,
  };

  function changePeriod(next: Period) {
    setChosenPeriod(next);
    setFeedPeriod(next);
    setCategoryId(null);
  }

  function changeList(next: string | null) {
    setChosenListId(next);
    setCategoryId(null);
  }

  function toggleSearch() {
    if (isSearching) setQuery("");
    setIsSearching((current) => !current);
  }

  function clearNarrowingFilters() {
    setCategoryId(null);
    setKind(null);
  }

  return {
    period,
    kind,
    categoryId,
    query,
    isSearching,
    selectedList,
    listId,
    range,
    summaryFilters,
    feedFilters,
    changePeriod,
    changeKind: setKind,
    changeCategory: setCategoryId,
    changeList,
    changeQuery: setQuery,
    toggleSearch,
    clearNarrowingFilters,
  };
}
