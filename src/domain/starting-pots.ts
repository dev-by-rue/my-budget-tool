import type { Pot } from "./types";

export const createStartingPots = (): Pot[] => {
  const pots: Array<Omit<Pot, "id">> = [
    { name: "Essentials", sortOrder: 0, system: false, category: "standard" },
    { name: "Debts", sortOrder: 1, system: false, category: "standard" },
    {
      name: "Subscriptions",
      sortOrder: 2,
      system: false,
      category: "standard",
    },
    {
      name: "Long Term Savings Goals",
      sortOrder: 3,
      system: true,
      category: "long-term",
    },
    {
      name: "Short Term Savings Goals",
      sortOrder: 4,
      system: true,
      category: "short-term",
    },
    { name: "Travel", sortOrder: 5, system: false, category: "standard" },
  ];
  
  const id = crypto.randomUUID();
  return pots.map((p) => ({ ...p, id }));
};
