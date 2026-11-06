'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { ADMIN_BRAND_GROUPS, matchesAdminBrand, type AdminBrand } from '@/lib/admin-brand-catalog';

export default function AdminBrandPicker({ brands, value, disabled = false, loading = false, onChange, onCreate }: {
  brands: AdminBrand[];
  value: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (slug: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const selected = brands.find((brand) => brand.slug === value);
  const groups = useMemo(() => ADMIN_BRAND_GROUPS.map((group) => ({
    ...group, items: brands.filter((brand) => brand.group === group.key && matchesAdminBrand(brand, query)),
  })).filter((group) => group.items.length), [brands, query]);
  const firstMatch = groups[0]?.items[0];

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };
  const choose = (slug: string) => {
    close();
    if (slug !== value) onChange(slug);
  };

  return <div ref={rootRef} className="relative" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }} onBlur={(event) => {
    if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) close(false);
  }}>
    <button ref={triggerRef} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
      className="flex min-h-10 w-full items-center gap-2 rounded-md border border-[#d8dfdb] bg-white px-3 py-1.5 text-left transition-colors hover:border-[#adbcb3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => (open ? close() : setOpen(true))}>
      {selected
        ? <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="break-words text-sm font-semibold text-[#17251d]">{selected.title}</span>
          <span className="font-mono text-xs text-[#758278]">{selected.slug}</span>
        </span>
        : <span className="min-w-0 flex-1 text-sm text-[#87918b]">{loading ? '正在加载品牌…' : '选择品牌'}</span>}
      <ChevronDown size={16} className={`shrink-0 text-[#758278] transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={panelId} role="dialog" aria-label="选择品牌"
      className="absolute left-0 z-30 mt-2 w-[min(44rem,calc(100vw-2rem))] rounded-lg border border-[#dce5dd] bg-white shadow-[0_18px_60px_rgba(20,44,30,0.16)]">
      <div className="border-b border-[#ebefeb] p-3">
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[#758278]" />
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索品牌"
            onKeyDown={(event) => { if (event.key === 'Enter' && firstMatch) { event.preventDefault(); choose(firstMatch.slug); } }}
            placeholder="搜索品牌名称或标识"
            className="h-10 w-full rounded-md border border-[#d8dfdb] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#87918b] focus-visible:border-[#247560] focus-visible:ring-2 focus-visible:ring-[#dcefe5]" />
        </div>
      </div>
      <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-3">
        {groups.length === 0 && <p className="py-8 text-center text-sm text-[#758278]">没有匹配的品牌</p>}
        {groups.map((group) => <section key={group.key} className="mb-3 last:mb-0" aria-label={group.label}>
          <h4 className="mb-1.5 px-1 text-xs font-semibold text-[#66746b]">{group.label}<span className="ml-1.5 font-normal tabular-nums text-[#9aa59d]">{group.items.length}</span></h4>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {group.items.map((brand) => {
              const active = brand.slug === value;
              return <button key={brand.slug} type="button" aria-pressed={active} onClick={() => choose(brand.slug)}
                className={`flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#247560] ${active ? 'border-[#9cc9b6] bg-[#eaf4ef]' : 'border-transparent hover:bg-[#f4f7f4]'}`}>
                <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-[#25332d]">{brand.title}</span>
                {active && <Check size={14} className="shrink-0 text-[#247560]" />}
              </button>;
            })}
          </div>
        </section>)}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#ebefeb] px-3 py-2">
        <span className="text-xs text-[#758278]">顺序与前台导航一致</span>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-[#247560] hover:bg-[#eaf4ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560]"
          onClick={() => { close(false); onCreate(); }}><Plus size={14} />新增品牌</button>
      </div>
    </div>}
  </div>;
}
