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
import {
  familyForModel,
  orderedModelFamilyGroups,
  variantTagForModel,
  type ModelFamily,
  type Provider,
} from "@/lib/models";

interface Props {
  provider:  Provider;
  value:     string;
  onChange:  (modelId: string) => void;
  id?:       string;
  className?: string;
}

export function ModelPicker({ provider, value, onChange, id, className }: Props) {
  const uid = useId();
  const triggerId = id ?? `${uid}-model`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editFamilyId, setEditFamilyId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280, maxH: 360 });
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const groups = useMemo(() => orderedModelFamilyGroups(provider), [provider]);
  const currentFamily = useMemo(
    () => familyForModel(provider, value),
    [provider, value],
  );
  const currentTag = variantTagForModel(value);

  const unknownFamily: ModelFamily | null = useMemo(() => {
    if (currentFamily) return null;
    if (!value) return null;
    return {
      id:       value,
      name:     value,
      group:    "Custom",
      variants: [{ id: value, tag: "Latest" }],
    };
  }, [currentFamily, value]);

  const allGroups = useMemo(() => {
    if (!unknownFamily) return groups;
    const custom = groups.find((g) => g.label === "Custom");
    if (custom) {
      return groups.map((g) =>
        g.label === "Custom"
          ? { ...g, families: [unknownFamily, ...g.families] }
          : g,
      );
    }
    return [{ label: "Custom", families: [unknownFamily] }, ...groups];
  }, [groups, unknownFamily]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        families: g.families.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.id.toLowerCase().includes(q) ||
            f.variants.some((v) => v.id.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.families.length > 0);
  }, [allGroups, query]);

  const triggerLabel = currentFamily?.name ?? value ?? "Select model…";
  const triggerTag = currentFamily ? currentTag : null;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 280);
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxH = Math.min(360, openUp ? spaceAbove : spaceBelow);
    setMenuPos({
      top:   openUp ? r.top - maxH - 4 : r.bottom + 4,
      left:  r.left,
      width,
      maxH,
    });
  }, []);

  const updateFlyout = useCallback((familyId: string) => {
    const row = rowRefs.current.get(familyId);
    if (!row) return;
    const rr = row.getBoundingClientRect();
    const flyoutW = 168;
    const gap = 4;
    let left = rr.right + gap;
    if (left + flyoutW > window.innerWidth - 8) {
      left = rr.left - flyoutW - gap;
    }
    setFlyoutPos({ top: rr.top, left });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditFamilyId(null);
    setQuery("");
  }, []);

  const selectModel = useCallback((modelId: string) => {
    onChange(modelId);
    close();
  }, [onChange, close]);

  const selectFamily = useCallback((family: ModelFamily) => {
    selectModel(family.variants[0].id);
  }, [selectModel]);

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
      if (
        triggerRef.current?.contains(t) ||
        portalRef.current?.contains(t)
      ) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (editFamilyId) updateFlyout(editFamilyId);
  }, [editFamilyId, updateFlyout, filteredGroups]);

  const editFamily = useMemo(() => {
    if (!editFamilyId) return null;
    for (const g of filteredGroups) {
      const f = g.families.find((fam) => fam.id === editFamilyId);
      if (f) return f;
    }
    return null;
  }, [editFamilyId, filteredGroups]);

  const panel = open && typeof document !== "undefined"
    ? createPortal(
        <div className="shell-portal" ref={portalRef}>
          <div
            className="model-picker-panel"
            style={{
              top:       menuPos.top,
              left:      menuPos.left,
              width:     menuPos.width,
              maxHeight: menuPos.maxH,
            }}
          >
            <div className="model-picker-search-wrap">
              <input
                type="search"
                className="model-picker-search"
                placeholder="Search models"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="model-picker-list">
              {filteredGroups.map((group) => (
                <div key={group.label} className="model-picker-group">
                  <div className="model-picker-group-label">{group.label}</div>
                  {group.families.map((family) => {
                    const isSelected = family.variants.some((v) => v.id === value);
                    const activeTag = isSelected ? currentTag : family.variants[0].tag;
                    const hasVariants = family.variants.length > 1;
                    const isEditing = editFamilyId === family.id;

                    return (
                      <div
                        key={family.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(family.id, el);
                          else rowRefs.current.delete(family.id);
                        }}
                        className={clsx(
                          "model-picker-row",
                          isSelected && "is-selected",
                          isEditing && "is-editing",
                        )}
                      >
                        <button
                          type="button"
                          className="model-picker-row-main"
                          onClick={() => selectFamily(family)}
                        >
                          <span className="model-picker-row-name">{family.name}</span>
                          <span className="model-picker-row-tag">{activeTag}</span>
                        </button>
                        {hasVariants && (
                          <button
                            type="button"
                            className={clsx("model-picker-edit", isEditing && "is-active")}
                            aria-label={`Edit ${family.name} version`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditFamilyId(isEditing ? null : family.id);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {isSelected && (
                          <span className="model-picker-check" aria-hidden>✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="model-picker-empty">No models match</div>
              )}
            </div>
          </div>

          {editFamily && editFamily.variants.length > 1 && (
            <div
              className="model-picker-flyout"
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
            >
              <div className="model-picker-flyout-heading">Version</div>
              {editFamily.variants.map((v) => {
                const selected = v.id === value;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={clsx("model-picker-flyout-opt", selected && "is-selected")}
                    onClick={() => selectModel(v.id)}
                  >
                    <span>{v.tag}</span>
                    {selected && <span className="model-picker-check" aria-hidden>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={clsx("model-picker-root", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={clsx("model-picker-trigger", open && "is-open")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="model-picker-trigger-label">{triggerLabel}</span>
        {triggerTag && triggerTag !== "Latest" && (
          <span className="model-picker-trigger-tag">{triggerTag}</span>
        )}
        <svg
          className={clsx("model-picker-chevron", open && "is-open")}
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
      {panel}
    </div>
  );
}
