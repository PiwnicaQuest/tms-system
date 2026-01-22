"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X, Check } from "lucide-react";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption | null) => void;
  fetchOptions: (search: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  debounceMs?: number;
  minChars?: number;
  selectedOption?: AutocompleteOption | null;
  allowClear?: boolean;
  error?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  fetchOptions,
  placeholder = "Wpisz aby wyszukac...",
  disabled = false,
  className,
  emptyMessage = "Brak wynikow",
  debounceMs = 300,
  minChars = 1,
  selectedOption,
  allowClear = true,
  error = false,
}: AutocompleteInputProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [inputValue, setInputValue] = useState(selectedOption?.label || "");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update input value when selectedOption changes
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else if (!value) {
      setInputValue("");
    }
  }, [selectedOption, value]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset to selected option label if exists
        if (selectedOption) {
          setInputValue(selectedOption.label);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  // Debounced search
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (searchTerm.length < minChars) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const results = await fetchOptions(searchTerm);
          setOptions(results);
          setIsOpen(true);
          setHighlightedIndex(-1);
        } catch (error) {
          console.error("Error fetching options:", error);
          setOptions([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [fetchOptions, debounceMs, minChars]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    debouncedSearch(newValue);
  };

  const handleSelect = (option: AutocompleteOption) => {
    setInputValue(option.label);
    onChange(option.value);
    onSelect(option);
    setIsOpen(false);
    setOptions([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    onChange("");
    onSelect(null);
    setOptions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        if (inputValue.length >= minChars) {
          debouncedSearch(inputValue);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        if (selectedOption) {
          setInputValue(selectedOption.label);
        }
        break;
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= minChars && options.length === 0) {
      debouncedSearch(inputValue);
    } else if (options.length > 0) {
      setIsOpen(true);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error && "ring-destructive/20 dark:ring-destructive/40 border-destructive",
            (selectedOption || isLoading || allowClear) && "pr-8",
            className
          )}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Clear button */}
        {!isLoading && allowClear && (selectedOption || inputValue) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.length === 0 ? (
            <li className="relative cursor-default select-none px-2 py-1.5 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                  highlightedIndex === index && "bg-accent text-accent-foreground",
                  selectedOption?.value === option.value && "font-medium"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {option.description}
                    </div>
                  )}
                </div>
                {selectedOption?.value === option.value && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// Preset fetch functions for common entities
export const createEntityFetcher = (
  endpoint: string,
  labelField: string | ((item: Record<string, unknown>) => string),
  descriptionField?: string | ((item: Record<string, unknown>) => string | undefined)
) => {
  return async (search: string): Promise<AutocompleteOption[]> => {
    const response = await fetch(`${endpoint}?search=${encodeURIComponent(search)}&limit=20`);
    if (!response.ok) return [];

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.data || data.items || [];

    return items.map((item: Record<string, unknown>) => ({
      value: item.id as string,
      label: typeof labelField === "function"
        ? labelField(item)
        : (item[labelField] as string),
      description: descriptionField
        ? (typeof descriptionField === "function"
            ? descriptionField(item)
            : (item[descriptionField] as string))
        : undefined,
    }));
  };
};

// Pre-built fetchers for common entities
export const fetchDrivers = createEntityFetcher(
  "/api/drivers",
  (item) => `${item.firstName} ${item.lastName}`,
  (item) => item.phone as string || undefined
);

export const fetchVehicles = createEntityFetcher(
  "/api/vehicles",
  "registrationNumber",
  (item) => `${item.brand || ""} ${item.model || ""}`.trim() || undefined
);

export const fetchTrailers = createEntityFetcher(
  "/api/trailers",
  "registrationNumber",
  (item) => item.type as string || undefined
);

export const fetchContractors = createEntityFetcher(
  "/api/contractors",
  (item) => (item.shortName as string) || (item.name as string),
  (item) => item.nip ? `NIP: ${item.nip}` : undefined
);

export const fetchUsers = createEntityFetcher(
  "/api/users",
  (item) => (item.name as string) || (item.email as string),
  "email"
);
