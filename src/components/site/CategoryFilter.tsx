"use client";

import type { Category, CategoryFilterValue } from "@/lib/types";

interface CategoryFilterProps {
  categories: readonly Category[];
  value: CategoryFilterValue;
  onChange(value: CategoryFilterValue): void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const options: { value: CategoryFilterValue; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      className="-mx-3 flex flex-wrap items-center gap-x-1 gap-y-0"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`group inline-flex min-h-11 items-center px-3 font-sans text-label uppercase transition-colors duration-ui ease-editorial ${
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span
              className={`border-b pb-1 transition-colors duration-ui ease-editorial ${
                active ? "border-ink" : "border-transparent group-hover:border-rule"
              }`}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
