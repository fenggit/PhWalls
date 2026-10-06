'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/language';
import { getDeviceBrandLabel } from '@/lib/device-brand-label';
import type { Language } from '@/types';
import type { DeviceRow } from '@/lib/wallpaper-db';
import type { AdminDeviceI18nDirectoryRow, MissingDescriptionBrand } from '@/lib/admin-device-i18n';

type Brand = { slug: string; title: string };
type EditTranslation = (device: Pick<DeviceRow, 'id' | 'device_name'>, language: Language) => void;
type Directory = { data: AdminDeviceI18nDirectoryRow[]; meta: { total: number; page: number; pageSize: number; missingBrands: MissingDescriptionBrand[] } };
const languageLabels: Record<Language, string> = {
  en: '英语', zh: '简体中文', ja: '日语', vi: '越南语', 'zh-hant': '繁体中文',
};
const inputClass = 'h-10 w-full min-w-0 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm text-[#25332d] outline-none focus-visible:border-[#247560] focus-visible:ring-2 focus-visible:ring-[#dcefe5]';
const buttonClass = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium text-[#34433b] hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50';

export function AdminDeviceI18nTable({ rows, brands, onEdit, loading = false, missing = false }: {
  rows: AdminDeviceI18nDirectoryRow[]; brands: Brand[]; onEdit: EditTranslation; loading?: boolean; missing?: boolean;
}) {
  return <div className="overflow-x-auto rounded-lg border border-[#dfe6df] bg-white" aria-busy={loading}>
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="border-b border-[#e3e9e4] bg-[#f8faf8] text-xs font-semibold text-[#5e7065]"><tr>
        {['标准设备 / 品牌', '语言', '本地化设备名', 'SEO 标题', '合集描述', '更新时间（北京时间）', '操作'].map((label) =>
          <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
      </tr></thead>
      <tbody>{loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-[#66746b]" role="status">正在加载多语言记录…</td></tr>
        : !rows.length ? <tr><td colSpan={7} className="px-5 py-12 text-center text-[#66746b]">{missing ? '没有符合条件的缺失描述' : '没有符合条件的多语言记录'}</td></tr>
        : rows.map((row) => <tr key={row.id} className="border-b border-[#ebefeb] align-top last:border-b-0 hover:bg-[#f8faf8]">
          <td className="w-48 px-4 py-4"><div className="font-medium text-gray-950">{row.device_name}</div>
            <div className="mt-1 text-xs text-[#758278]">{getDeviceBrandLabel(row.brand_name, row.language,
              brands.find((brand) => brand.slug === row.brand_name)?.title || row.brand_name)}</div>
            {missing && <div className="mt-1 text-xs text-[#758278]">{row.wallpaper_count} 张壁纸</div>}</td>
          <td className="whitespace-nowrap px-4 py-4"><div>{languageLabels[row.language]}</div><div className="mt-1 font-mono text-xs text-[#758278]">{row.language}</div></td>
          <td className="w-44 px-4 py-4"><div className="break-words">{row.display_name || <span className="text-[#87918b]">未填写</span>}</div></td>
          <td className="w-56 px-4 py-4"><div className="break-words">{row.seo_title || <span className="text-[#87918b]">未填写</span>}</div></td>
          <td className="min-w-64 max-w-sm px-4 py-4"><p className="line-clamp-3 whitespace-pre-wrap break-words text-[#66746b]">{row.description || <span className="text-[#87918b]">未填写</span>}</p></td>
          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#758278]">{row.updated_date > 0 ? <time dateTime={new Date(row.updated_date).toISOString()}>
            {new Date(row.updated_date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</time> : '尚未保存'}</td>
          <td className="w-28 whitespace-nowrap px-4 py-3"><button className={buttonClass} aria-label={missing
            ? `补充 ${row.device_name} 的${languageLabels[row.language]}描述` : `编辑 ${row.device_name} 的${languageLabels[row.language]}内容`}
            onClick={() => onEdit({ id: row.device_id, device_name: row.device_name }, row.language)}><Pencil size={14} className="shrink-0" />{missing ? '补充描述' : '编辑'}</button></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export default function AdminDeviceI18nPanel({ brands, refreshKey, onEdit }: {
  brands: Brand[]; refreshKey: number; onEdit: EditTranslation;
}) {
  const [brand, setBrand] = useState('');
  const [view, setView] = useState<'saved' | 'missing'>('saved');
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
    const query = new URLSearchParams({ view, brand, language, search, page: String(page) });
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
  }, [view, brand, language, search, page, refreshKey, attempt]);

  const reset = () => { setBrand(''); setLanguage(''); setSearchInput(''); setSearch(''); setPage(0); };
  const total = directory?.meta.total || 0;
  const activePage = directory?.meta.page ?? page;
  const pageSize = directory?.meta.pageSize || 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <section aria-label="设备多语言记录">
    <div className="mb-5 space-y-3 rounded-lg border border-[#dfe6df] bg-white p-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="多语言列表类型">
        {([['saved', '已保存内容'], ['missing', '缺少描述']] as const).map(([value, label]) => <button key={value}
          className={`${buttonClass} ${view === value ? 'border-[#247560] bg-[#edf5ef] text-[#247560]' : ''}`} aria-pressed={view === value}
          onClick={() => { setView(value); setPage(0); }}>{label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-64 flex-1"><Search className="pointer-events-none absolute left-3 top-3 text-[#758278]" size={16} />
        <input className={`${inputClass} pl-9`} aria-label="搜索多语言内容" placeholder="搜索设备名、SEO 标题或描述" maxLength={200} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
        {(brand || language || searchInput) && <button className={buttonClass} onClick={reset}><X size={15} />清除筛选</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2"><select className={inputClass} aria-label="多语言品牌筛选" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(0); }}>
        <option value="">全部品牌</option>{brands.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select>
        <select className={inputClass} aria-label="语言筛选" value={language} onChange={(event) => { setLanguage(event.target.value); setPage(0); }}>
          <option value="">全部语言</option>{SUPPORTED_LANGUAGES.map((value) => <option key={value} value={value}>{languageLabels[value]}</option>)}</select></div>
      <p className="text-xs leading-5 text-[#66746b]">{view === 'missing'
        ? '列出有壁纸但未填写对应语言描述的设备，包含尚未创建的语言记录。统计包含草稿及下架壁纸，排除待删除壁纸；英文回退不算已填写。'
        : '展示已保存的各语言内容。点击“编辑”查看完整描述或修改；新增语言可从设备目录的“多语言”入口填写。'}</p>
    </div>
    {view === 'missing' && !loading && !error && <div className="mb-5 rounded-lg border border-[#dfe6df] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#25332d]">有壁纸但缺少描述的品牌</h3>
      <p className="mt-1 text-xs text-[#66746b]">按当前筛选统计全部结果，每个设备每种缺失语言计一条。</p>
      {directory?.meta.missingBrands.length ? <div className="mt-3 flex flex-wrap gap-2">
        {directory.meta.missingBrands.map((item) => <button key={item.brand_name} className={buttonClass}
          onClick={() => { setBrand(item.brand_name); setPage(0); }}>
          {brands.find((entry) => entry.slug === item.brand_name)?.title || item.brand_name} · {item.device_count} 个设备 · {item.missing_count} 条缺失
        </button>)}
      </div> : <p className="mt-3 text-sm text-[#66746b]">当前筛选下，有壁纸的设备均已填写描述。</p>}
    </div>}
    {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}
      <button className="ml-3 underline" onClick={() => setAttempt((value) => value + 1)}>重新加载</button></p>}
    <AdminDeviceI18nTable rows={directory?.data || []} brands={brands} onEdit={onEdit} loading={loading} missing={view === 'missing'} />
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#66746b]">
      <span role="status">{loading ? '正在加载…' : error ? '数据加载失败' : `共 ${total} 条记录 · 第 ${activePage + 1} / ${pages} 页`}</span>
      <div className="flex gap-2"><button className={buttonClass} disabled={loading || !!error || activePage === 0} onClick={() => setPage(activePage - 1)}><ChevronLeft size={16} />上一页</button>
        <button className={buttonClass} disabled={loading || !!error || activePage + 1 >= pages} onClick={() => setPage(activePage + 1)}>下一页<ChevronRight size={16} /></button></div>
    </div>
  </section>;
}
