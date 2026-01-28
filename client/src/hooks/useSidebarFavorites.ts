import { useState, useEffect, useCallback } from "react";

const FAVORITES_KEY = "tradoverse-sidebar-favorites";

export interface FavoriteItem {
  id: string;
  path: string;
  title: string;
  icon: string; // Icon name as string for serialization
}

// Default favorites for new users
const DEFAULT_FAVORITES: FavoriteItem[] = [
  { id: "dashboard", path: "/dashboard", title: "Dashboard", icon: "LayoutDashboard" },
  { id: "analysis", path: "/analysis", title: "AI Analysis", icon: "Brain" },
  { id: "portfolio", path: "/portfolio", title: "Portfolio", icon: "PieChart" },
];

export function useSidebarFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      } catch {
        setFavorites(DEFAULT_FAVORITES);
      }
    } else {
      setFavorites(DEFAULT_FAVORITES);
    }
    setIsLoaded(true);
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isLoaded]);

  // Add a favorite
  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites(prev => {
      // Don't add duplicates
      if (prev.some(f => f.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  // Remove a favorite
  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  // Toggle a favorite
  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id);
      if (exists) {
        return prev.filter(f => f.id !== item.id);
      }
      return [...prev, item];
    });
  }, []);

  // Check if an item is favorited
  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  // Reorder favorites (for drag and drop)
  const reorderFavorites = useCallback((startIndex: number, endIndex: number) => {
    setFavorites(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  // Move a favorite up
  const moveFavoriteUp = useCallback((index: number) => {
    if (index <= 0) return;
    reorderFavorites(index, index - 1);
  }, [reorderFavorites]);

  // Move a favorite down
  const moveFavoriteDown = useCallback((index: number) => {
    setFavorites(prev => {
      if (index >= prev.length - 1) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(index, 1);
      result.splice(index + 1, 0, removed);
      return result;
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setFavorites(DEFAULT_FAVORITES);
  }, []);

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    reorderFavorites,
    moveFavoriteUp,
    moveFavoriteDown,
    resetToDefaults,
  };
}

export default useSidebarFavorites;
