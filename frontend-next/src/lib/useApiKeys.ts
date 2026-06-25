"use client";

import { useCallback, useEffect, useState } from "react";

export interface StoredKey {
  id: string;
  label: string;
  provider: string; // "openai" | "anthropic" | custom
  value: string;
}

const LS_KEY = "inferencache:api-keys";
const LEGACY_LS_KEY = "promptcache:api-keys";

function loadFromStorage(): StoredKey[] {
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LEGACY_LS_KEY);
    return raw ? (JSON.parse(raw) as StoredKey[]) : [];
  } catch {
    return [];
  }
}

function persist(keys: StoredKey[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

export function useApiKeys() {
  const [keys, setKeys] = useState<StoredKey[]>([]);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    setKeys(loadFromStorage());
  }, []);

  const addKey = useCallback((entry: Omit<StoredKey, "id">) => {
    const newEntry: StoredKey = { ...entry, id: crypto.randomUUID() };
    setKeys((prev) => {
      const next = [...prev, newEntry];
      persist(next);
      return next;
    });
  }, []);

  const updateKey = useCallback((id: string, updates: Partial<Omit<StoredKey, "id">>) => {
    setKeys((prev) => {
      const next = prev.map((k) => (k.id === id ? { ...k, ...updates } : k));
      persist(next);
      return next;
    });
  }, []);

  const deleteKey = useCallback((id: string) => {
    setKeys((prev) => {
      const next = prev.filter((k) => k.id !== id);
      persist(next);
      return next;
    });
  }, []);

  /** Returns the value of the first stored key matching a provider slug. */
  const getKey = useCallback(
    (provider: string): string =>
      keys.find((k) => k.provider === provider)?.value ?? "",
    [keys],
  );

  return { keys, addKey, updateKey, deleteKey, getKey };
}
