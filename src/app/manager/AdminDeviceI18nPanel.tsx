'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/language';
import { getDeviceBrandLabel } from '@/lib/device-brand-label';
import type { Language } from '@/types';
import type { DeviceI18nListRow, DeviceRow } from '@/lib/wallpaper-db';

type Brand = { slug: string; title: string };
type EditTranslation = (device: Pick<DeviceRow, 'id' | 'device_name'>, language: Language) => void;
type Directory = { data: DeviceI18nListRow[]; meta: { total: number; page: number; pageSize: number } };
const languageLabels: Record<Language, string> = {
  en: '英语', zh: '简体中文', ja: '日语', vi: '越南语', 'zh-hant': '繁体中文',
};
const inputClass = 'h-10 w-full min-w-0 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm text-[#25332d] outline-none focus-visible:border-[#247560] focus-visible:ring-2 focus-visible:ring-[#dcefe5]';
const buttonClass = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium text-[#34433b] hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50';

export function AdminDeviceI18nTable({ rows, brands, onEdit, loading = false }: {
  rows: DeviceI18nListRow[]; brands: Brand[]; onEdit: EditTranslation; loading?: boolean;
}) {
  return <div className="overflow-x-auto rounded-lg border border-[#dfe6df] bg-white" aria-busy={loading}>
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="border-b border-[#e3e9e4] bg-[#f8faf8] text-xs font-semibold text-[#5e7065]"><tr>
        {['标准设备 / 品牌', '语言', '本地化设备名', 'SEO 标题', '合集描述', '更新时间（北京时间）', '操作'].map((label) =>
          <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
      </tr></thead>
      <tbody>{loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-[#66746b]" role="status">正在加载多语言记录…</td></tr>
        : !rows.length ? <tr><td colSpan={7} className="px-5 py-12 text-center text-[#66746b]">没有符合条件的多语言记录</td></tr>
        : rows.map((row) => <tr key={row.id} className="border-b border-[#ebefeb] align-top last:border-b-0 hover:bg-[#f8faf8]">
          <td className="w-48 px-4 py-4"><div className="font-medium text-gray-950">{row.device_name}</div>
            <div className="mt-1 text-xs text-[#758278]">{getDeviceBrandLabel(row.brand_name, row.language,
              brands.find((brand) => brand.slug === row.brand_name)?.title || row.brand_name)}</div></td>
          <td className="whitespace-nowrap px-4 py-4"><div>{languageLabels[row.language]}</div><div className="mt-1 font-mono text-xs text-[#758278]">{row.language}</div></td>
          <td className="w-44 px-4 py-4"><div className="break-words">{row.display_name || <span className="text-[#87918b]">未填写</span>}</div></td>
          <td className="w-56 px-4 py-4"><div className="break-words">{row.seo_title || <span className="text-[#87918b]">未填写</span>}</div></td>
          <td className="min-w-64 max-w-sm px-4 py-4"><p className="line-clamp-3 whitespace-pre-wrap break-words text-[#66746b]">{row.description || <span className="text-[#87918b]">未填写</span>}</p></td>
          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#758278]"><time dateTime={new Date(row.updated_date).toISOString()}>
            {new Date(row.updated_date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</time></td>
          <td className="w-28 whitespace-nowrap px-4 py-3"><button className={buttonClass} aria-label={`编辑 ${row.device_name} 的${languageLabels[row.language]}内容`}
            onClick={() => onEdit({ id: row.device_id, device_name: row.device_name }, row.language)}><Pencil size={14} className="shrink-0" />编辑</button></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export default function AdminDeviceI18nPanel({ brands, refreshKey, onEdit }: {
  brands: Brand[]; refreshKey: number; onEdit: EditTranslation;
}) {
  const [brand, setBrand] = useState('');
  const [language, setLanguage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDirectory(null);
    const query = new URLSearchParams({ brand, language, search, page: String(page) });
    void (async () => {
      try {
        const response = await fetch(`/api/admin/device-i18n?${query}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        const result = await response.json() as Directory & { error?: string };
        if (!response.ok) throw new Error(result.error || `服务暂不可用 (${response.status})`);
        if (!controller.signal.aborted) setDirectory(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '多语言记录加载失败');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [brand, language, search, page, refreshKey, attempt]);

  const reset = () => { setBrand(''); setLanguage(''); setSearchInput(''); setSearch(''); setPage(0); };
  const total = directory?.meta.total || 0;
  const activePage = directory?.meta.page ?? page;
  const pageSize = directory?.meta.pageSize || 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <section aria-label="设备多语言记录">
    <div className="mb-5 space-y-3 rounded-lg border border-[#dfe6df] bg-white p-4">
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-64 flex-1"><Search className="pointer-events-none absolute left-3 top-3 text-[#758278]" size={16} />
        <input className={`${inputClass} pl-9`} aria-label="搜索多语言内容" placeholder="搜索设备名、SEO 标题或描述" maxLength={200} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
        {(brand || language || searchInput) && <button className={buttonClass} onClick={reset}><X size={15} />清除筛选</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2"><select className={inputClass} aria-label="多语言品牌筛选" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(0); }}>
        <option value="">全部品牌</option>{brands.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select>
        <select className={inputClass} aria-label="语言筛选" value={language} onChange={(event) => { setLanguage(event.target.value); setPage(0); }}>
          <option value="">全部语言</option>{SUPPORTED_LANGUAGES.map((value) => <option key={value} value={value}>{languageLabels[value]}</option>)}</select></div>
      <p className="text-xs leading-5 text-[#66746b]">展示已保存的各语言内容。点击“编辑”查看完整描述或修改；新增语言可从设备目录的“多语言”入口填写。</p>
    </div>
    {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}
      <button className="ml-3 underline" onClick={() => setAttempt((value) => value + 1)}>重新加载</button></p>}
    <AdminDeviceI18nTable rows={directory?.data || []} brands={brands} onEdit={onEdit} loading={loading} />
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#66746b]">
      <span role="status">{loading ? '正在加载…' : error ? '数据加载失败' : `共 ${total} 条记录 · 第 ${activePage + 1} / ${pages} 页`}</span>
      <div className="flex gap-2"><button className={buttonClass} disabled={loading || !!error || activePage === 0} onClick={() => setPage(activePage - 1)}><ChevronLeft size={16} />上一页</button>
        <button className={buttonClass} disabled={loading || !!error || activePage + 1 >= pages} onClick={() => setPage(activePage + 1)}>下一页<ChevronRight size={16} /></button></div>
    </div>
  </section>;
}
