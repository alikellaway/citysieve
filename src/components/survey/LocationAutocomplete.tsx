"use client";

import { useState, useEffect, useRef } from "react";
import type { GeoLocation } from "@/lib/survey/types";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";

interface LocationAutocompleteProps {
  value: GeoLocation | null;
  onChange: (location: GeoLocation | null) => void;
  label: string;
  placeholder?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  label,
  placeholder = "Start typing a location...",
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const skipSearch = useRef(false);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (debouncedQuery.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    fetch(`/api/geocode?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data: SearchResult[]) => {
        if (!cancelled) {
          setResults(data);
          setShowDropdown(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      setShowDropdown(false);
      if (value) onChange(null);
    }
  }

  function handleSelect(result: SearchResult) {
    const loc: GeoLocation = {
      label: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
    onChange(loc);
    skipSearch.current = true;
    setQuery(result.display_name);
    setShowDropdown(false);
    setResults([]);
  }

  function handleClear() {
    skipSearch.current = true;
    setQuery("");
    onChange(null);
    setResults([]);
    setShowDropdown(false);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Searching...
          </div>
        )}
        {showDropdown && results.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={() => handleSelect(r)}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
