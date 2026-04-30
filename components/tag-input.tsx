"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder = "Type and press Enter...", className }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 min-h-10 px-3 py-2 bg-background border border-input rounded-lg focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:border-transparent transition-all ${className ?? ""}`}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-[#007AFF]/10 text-[#007AFF] text-xs font-medium px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-[#007AFF]/70 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
