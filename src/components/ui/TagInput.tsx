import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getTagColor } from '../../utils/tagColors';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  placeholder?: string;
  disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  existingTags,
  placeholder = 'Add tag...',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 300ms debounced filtering
  const updateSuggestions = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!value.trim()) {
          setFilteredSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const lower = value.toLowerCase();
        const filtered = existingTags.filter(
          tag =>
            tag.toLowerCase().includes(lower) &&
            !tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setHighlightedIndex(-1);
      }, 300);
    },
    [existingTags, tags]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    updateSuggestions(value);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    // Case-insensitive dedup
    if (!tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(inputValue);
      }
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
    if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    }
    if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    }
  };

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 p-2 border-2 rounded-xl min-h-[42px] transition-colors"
        style={{
          backgroundColor: disabled ? 'var(--bg-tertiary)' : 'var(--input-bg)',
          borderColor: disabled ? 'var(--border-subtle)' : 'var(--input-border)',
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, i) => {
          const color = getTagColor(tag);
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="hover:opacity-70 ml-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && updateSuggestions(inputValue)}
            onBlur={() => {
              // Auto-commit typed text as a tag on blur
              if (inputValue.trim()) {
                addTag(inputValue);
              }
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
            style={{ color: 'var(--text-primary)' }}
          />
        )}
      </div>
      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div
          className="absolute z-20 w-full mt-1 rounded-xl shadow-lg max-h-40 overflow-y-auto border"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-secondary)',
          }}
        >
          {filteredSuggestions.map((suggestion, idx) => {
            const color = getTagColor(suggestion);
            return (
              <button
                key={suggestion}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor:
                    idx === highlightedIndex ? 'var(--color-accent-subtle)' : 'transparent',
                }}
              >
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
                >
                  {suggestion}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
