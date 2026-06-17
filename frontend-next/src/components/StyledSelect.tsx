"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface Props {
  value:       string;
  onChange:    (value: string) => void;
  options?:    SelectOption[];
  groups?:     SelectGroup[];
  placeholder?: string;
  disabled?:   boolean;
  className?:  string;
  id?:         string;
  size?:       "sm" | "md";
  tone?:       "default" | "sidebar";
}

function flattenOptions(options?: SelectOption[], groups?: SelectGroup[]): SelectOption[] {
  if (options?.length) return options;
  return (groups ?? []).flatMap((g) => g.options);
}

function labelFor(value: string, options?: SelectOption[], groups?: SelectGroup[]): string {
  return flattenOptions(options, groups).find((o) => o.value === value)?.label ?? value;
}

export function StyledSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = "Select…",
  disabled,
  className,
  id,
  size = "md",
  tone = "default",
}: Props) {
  const [open, setOpen]       = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, maxH: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const uid        = useId();
  const triggerId  = id ?? `${uid}-trigger`;
  const listboxId  = `${triggerId}-listbox`;
  const activeOptionId =
    open && highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined;

  const allOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);
  const displayLabel = value ? labelFor(value, options, groups) : placeholder;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxH = Math.min(280, openUp ? spaceAbove : spaceBelow);
    setMenuPos({
      top:   openUp ? r.top - maxH - 4 : r.bottom + 4,
      left:  r.left,
      width: r.width,
      maxH,
    });
  }, []);

  const selectOption = useCallback((opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
    setHighlight(-1);
    triggerRef.current?.focus();
  }, [onChange]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const idx = allOptions.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
    setOpen(true);
  }, [disabled, allOptions, value]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDocMouse(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
      setHighlight(-1);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setHighlight(-1);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function handleTriggerKey(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && highlight >= 0) selectOption(allOptions[highlight]);
      else openMenu();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { openMenu(); return; }
      setHighlight((h) => Math.min(allOptions.length - 1, h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { openMenu(); return; }
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  }

  let flatIdx = 0;

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={clsx(
            tone === "sidebar" ? "dropdown-menu-sidebar shell-portal" : "dropdown-menu",
          )}
          style={{
            top:        menuPos.top,
            left:       menuPos.left,
            width:      menuPos.width,
            maxHeight:  menuPos.maxH,
          }}
        >
          {groups?.length
            ? groups.map((group) => {
                const startIdx = flatIdx;
                const els = group.options.map((opt, i) => {
                  const idx = startIdx + i;
                  const selected = opt.value === value;
                  const active = idx === highlight;
                  return (
                    <button
                      key={opt.value}
                      id={`${listboxId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-idx={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => selectOption(opt)}
                      className={clsx(
                        "dropdown-option w-full text-left",
                        selected && "dropdown-option-selected",
                        active && !selected && "dropdown-option-active",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {selected && <span className="dropdown-check" aria-hidden>✓</span>}
                    </button>
                  );
                });
                flatIdx += group.options.length;
                return (
                  <div key={group.label} className="dropdown-group">
                    <div className="dropdown-group-label">{group.label}</div>
                    {els}
                  </div>
                );
              })
            : options?.map((opt, i) => {
                const selected = opt.value === value;
                const active = i === highlight;
                return (
                  <button
                    key={opt.value}
                    id={`${listboxId}-opt-${i}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-idx={i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectOption(opt)}
                    className={clsx(
                      "dropdown-option w-full text-left",
                      selected && "dropdown-option-selected",
                      active && !selected && "dropdown-option-active",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && <span className="dropdown-check" aria-hidden>✓</span>}
                  </button>
                );
              })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={clsx("relative", tone === "sidebar" && "select-root-sidebar", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-activedescendant={activeOptionId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKey}
        className={clsx(
          "select-trigger",
          size === "sm" && "select-trigger-sm",
          tone === "sidebar" && "select-trigger-sidebar",
          open && "select-trigger-open",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className={clsx("truncate", !value && "text-t-3")}>{displayLabel}</span>
        <svg
          className={clsx("select-chevron shrink-0", open && "select-chevron-open")}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {menu}
    </div>
  );
}
