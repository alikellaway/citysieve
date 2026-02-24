"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  placeholder?: string;
  enableAutocomplete?: boolean;
  helperText?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
}

function toTagLabel(displayName: string): string {
  return displayName.split(",")[0].trim();
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder = "Type and press Enter...",
  enableAutocomplete = false,
  helperText,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedInput = useDebounce(input, 400);

  useEffect(() => {
    if (!enableAutocomplete) return;
    if (debouncedInput.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    fetch(`/api/geocode?q=${encodeURIComponent(debouncedInput)}&countrycodes=gb`)
      .then((res) => res.json())
      .then((data: SearchResult[]) => {
        if (!cancelled) {
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedInput, enableAutocomplete]);

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
  }

  function handleSelect(result: SearchResult) {
    addTag(toTagLabel(result.display_name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveIndex(-1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const idx = activeIndex >= 0 ? activeIndex : 0;
        handleSelect(suggestions[idx]);
        return;
      }
    }

    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleBlur() {
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }, 150);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        {helperText && (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        )}
      </div>
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2"
          )}
        >
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-primary/60 hover:text-primary"
              >
                ✕
              </button>
            </span>
          ))}
          <div className="relative flex flex-1 items-center min-w-[120px]">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={handleBlur}
              placeholder={value.length === 0 ? placeholder : ""}
              className="border-0 p-0 shadow-none focus-visible:ring-0 w-full"
            />
            {isSearching && (
              <span className="absolute right-0 text-xs text-muted-foreground whitespace-nowrap">
                Searching…
              </span>
            )}
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg">
            {suggestions.map((r, i) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm",
                    i === activeIndex ? "bg-accent" : "hover:bg-accent"
                  )}
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
