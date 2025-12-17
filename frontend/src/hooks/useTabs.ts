import { useState } from "react";
import type { Tab } from "../types";

export function useTabs(initialTab: Tab = "farmerStock") {
  const [tab, setTab] = useState<Tab>(initialTab);

  return {
    tab,
    setTab,
  };
}


