import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CustomProvider } from "@/types/custom-provider";

interface CustomProvidersStore {
  providers: CustomProvider[];
  addProvider: (provider: Omit<CustomProvider, "id" | "createdAt">) => void;
  updateProvider: (id: string, provider: Partial<CustomProvider>) => void;
  deleteProvider: (id: string) => void;
  getProvider: (id: string) => CustomProvider | undefined;
}

export const useCustomProvidersStore = create<CustomProvidersStore>()(
  persist(
    (set, get) => ({
      providers: [],

      addProvider: (provider) => {
        const newProvider: CustomProvider = {
          ...provider,
          id: `provider-${Date.now()}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          providers: [...state.providers, newProvider],
        }));
      },

      updateProvider: (id: string, provider: Partial<CustomProvider>) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...provider } : p
          ),
        }));
      },

      deleteProvider: (id: string) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
        }));
      },

      getProvider: (id: string) => {
        return get().providers.find((p) => p.id === id);
      },
    }),
    {
      name: "custom-providers-storage",
    }
  )
);


