'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Check, ChevronLeft, ChevronRight, ExternalLink, FolderOpen, ImagePlus, Images, LogOut, Pencil, Plus, RefreshCw, Search, Smartphone, Tags, Trash2, UploadCloud, X } from 'lucide-react';
import AdminDeviceI18nPanel from '@/app/manager/AdminDeviceI18nPanel';
import { adminTabHref, resolveAdminTab, type AdminTab } from '@/lib/admin-navigation';
import { uploadAdminBatch } from '@/lib/admin-upload-batch';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import type { DeviceI18nRow, DeviceRow, WallpaperRow, WallpaperMediaType } from '@/lib/wallpaper-db';
import type { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import { buildWallpaperListTitle } from '@/lib/data';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import { normalizeAdminDisplay, normalizeAdminName } from '@/lib/admin-identity';
import { AdminDeviceNameConflictError, createWithAdminNameConfirmation, type AdminDeviceNameCheck } from '@/lib/admin-device-name';
import { assertAdminUploadMime, normalizeAdminR2Prefix, type AdminUploadDirectories } from '@/lib/admin-upload-path';

type WallpaperListRow = WallpaperRow & { brand_name: string; device_name: string };
type AdminBrand = { slug: string; title: string; kind: 'mobile' | 'desktop'; source: 'builtin' | 'custom' };
type UploadFileGrant = { url: string; token: string; headers?: Record<string, string> };
type UploadRow = { id: string; name: string; origin?: File; preview?: File; theme: string; tags: string;
  category: string; folderName?: string; state: 'ready' | 'uploading' | 'done' | 'failed'; progress: number; error?: string; isPrimary?: boolean; isPublished?: boolean;
  originGrant?: UploadFileGrant; previewGrant?: UploadFileGrant; originUploaded?: boolean; previewUploaded?: boolean };
type DeviceCheck = { total: number; published: number; pending: number; missing_preview: number; primary_count: number; published_primary: number };

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json', 'x-phwalls-admin': '1' }
      : method === 'GET' ? {} : { 'x-phwalls-admin': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null) as { error?: string; conflict?: AdminDeviceNameCheck } | null;
  if (!response.ok) {
    if (response.status === 409 && result?.conflict) throw new AdminDeviceNameConflictError(result.conflict, result.error);
    throw new Error(result?.error || `服务暂不可用 (${response.status})`);
  }
  if (!result) throw new Error('服务返回了无法识别的数据');
  return result as T;
}

async function createDevice(input: Record<string, unknown>): Promise<DeviceRow | null> {
  const result = await createWithAdminNameConfirmation(input,
    (body) => api<{ data: DeviceRow }>('devices', 'POST', body), (message) => window.confirm(message));
  return result?.data || null;
}

function DeviceNameFeedback({ brand, name }: { brand: string; name: string }) {
  const texts = getI18nTexts('zh');
  const [feedback, setFeedback] = useState<{ brand: string; name: string; check?: AdminDeviceNameCheck; error?: string } | null>(null);
  useEffect(() => {
    if (!brand || !name.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void api<{ data: AdminDeviceNameCheck }>(`devices?${new URLSearchParams({ brand, check_name: name })}`)
        .then(({ data }) => { if (!cancelled) setFeedback({ brand, name, check: data }); })
        .catch(() => { if (!cancelled) setFeedback({ brand, name, error: texts.adminNameCheckUnavailable }); });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [brand, name, texts.adminNameCheckUnavailable]);
  if (!brand || !name.trim()) return null;
  const current = feedback?.brand === brand && feedback.name === name ? feedback : null;
  if (!current) return <p role="status" className="mt-2 text-xs text-[#66746b]">{texts.adminNameChecking}</p>;
  if (current.error) return <p role="status" className="mt-2 text-xs text-amber-800">{current.error}</p>;
  const check = current.check;
  if (!check || check.kind === 'available') return null;
  const blocked = check.kind !== 'similar';
  return <div role={blocked ? 'alert' : 'status'} className={`mt-2 text-xs leading-5 ${blocked ? 'text-red-700' : 'text-amber-800'}`}>
    <p>{check.kind === 'duplicate' ? texts.adminNameDuplicateHint
      : check.kind === 'slug' ? texts.adminNameSlugHint : texts.adminNameSimilarHint}</p>
    <ul className="mt-1 list-inside list-disc">{check.matches.map((device) => <li key={device.id}>{device.device_name}</li>)}</ul>
  </div>;
}

const inputClass = 'h-10 w-full min-w-0 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm text-[#25332d] outline-none transition-colors placeholder:text-[#87918b] hover:border-[#adbcb3] focus-visible:border-[#247560] focus-visible:ring-2 focus-visible:ring-[#dcefe5]';
const buttonClass = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium text-[#34433b] transition-colors hover:border-[#aebeb4] hover:bg-[#f4f7f4] active:bg-[#eaf0eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#247560] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#195b4b] active:bg-[#124839] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50';
const iconButtonClass = `${buttonClass} w-10 px-0`;
const rowButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium text-[#5e7065] transition-colors hover:bg-[#e7eee7] hover:text-[#1b5f4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560]';
const tableClass = 'w-full text-left text-sm';
const tableHeadClass = 'border-b border-[#e3e9e4] bg-[#f8faf8] text-xs font-semibold text-[#5e7065]';
const tableRowClass = 'border-b border-[#ebefeb] last:border-b-0 hover:bg-[#f8faf8]';
const modalClass = 'max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-lg border border-[#dce5dd] bg-white p-5 shadow-[0_24px_80px_rgba(20,44,30,0.18)] sm:p-6';
const categories = ['phone', 'phone_fold', 'pad', 'desktop', 'os'];
const statuses = ['draft', 'published', 'unpublished'];
const themeLabels: Record<string, string> = { normal: '默认', dark: '深色', light: '浅色' };
const PAGE_SIZE = 50;
const emptyFilters = { brand: '', category: '', status: '', popular: '', device: '', theme: '', media: '', format: '', search: '' };
const statusLabels: Record<DeviceRow['status'], string> = { draft: '草稿', published: '已发布', unpublished: '已下架' };
const categoryLabels: Record<DeviceRow['device_category'], string> = {
  phone: '手机', phone_fold: '折叠屏', pad: '平板', desktop: '桌面', os: '系统',
};
const statusClasses: Record<DeviceRow['status'], string> = {
  draft: 'border-amber-200 bg-amber-50 text-amber-800',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  unpublished: 'border-gray-200 bg-gray-100 text-gray-700',
};
function defaultDeviceCategory(brand: string, brands: AdminBrand[]): DeviceRow['device_category'] {
  if (brand === 'android' || brand === 'harmonyos') return 'os';
  if (brand === 'huawei-matepad') return 'pad';
  if (brands.some((item) => item.slug === brand && item.kind === 'desktop')) return 'desktop';
  return 'phone';
}

function BrandOptions({ brands }: { brands: AdminBrand[] }) {
  return <>
    <optgroup label="手机与系统">{brands.filter((brand) => brand.kind === 'mobile')
      .map((brand) => <option key={brand.slug} value={brand.slug}>{brand.title}</option>)}</optgroup>
    <optgroup label="桌面">{brands.filter((brand) => brand.kind === 'desktop')
      .map((brand) => <option key={brand.slug} value={brand.slug}>{brand.title}</option>)}</optgroup>
  </>;
}

function AdminDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.showModal();
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-lg bg-transparent p-0 text-[#25332d] backdrop:bg-[#15271e]/50 backdrop:backdrop-blur-sm">{children}</dialog>;
}

function TableFeedback({ columns, loading, message, onReset }: { columns: number; loading: boolean; message: string; onReset?: () => void }) {
  return <tr><td colSpan={columns} className="px-5 py-12">
    {loading ? <div role="status" className="space-y-4"><span className="sr-only">正在加载数据</span>{[0, 1, 2].map((row) => <div key={row} className="flex items-center gap-4 motion-safe:animate-pulse"><div className="h-10 w-10 shrink-0 rounded bg-[#e9eee8]" /><div className="h-3 w-1/3 rounded bg-[#e9eee8]" /><div className="ml-auto h-3 w-1/5 rounded bg-[#edf1ec]" /></div>)}</div> : <div className="flex flex-col items-center gap-3 text-center"><Search size={24} className="text-[#9aaba0]" /><span className="text-sm text-[#66746b]">{message}</span>{onReset && <button className={buttonClass} onClick={onReset}>清除筛选</button>}</div>}
  </td></tr>;
}

type R2DirectoryListing = { prefix: string; directories: string[]; cursor: string | null };

function R2DirectoryDialog({ selected, onSelect, onClose }: {
  selected: string; onSelect: (path: string) => void; onClose: () => void;
}) {
  const [prefix, setPrefix] = useState(selected);
  const [listing, setListing] = useState<R2DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => {
    const current = { cancelled: false };
    requestId.current = current;
    setLoading(true); setLoadingMore(false); setListing(null); setError('');
    void api<{ data: R2DirectoryListing }>(`r2-directories?${new URLSearchParams({ prefix })}`)
      .then(({ data }) => { if (!current.cancelled) setListing(data); })
      .catch((cause) => { if (!current.cancelled) setError(cause instanceof Error ? cause.message : '目录加载失败'); })
      .finally(() => { if (!current.cancelled) setLoading(false); });
    return () => { current.cancelled = true; };
  }, [prefix, attempt]);

  const loadMore = async () => {
    if (!listing?.cursor || loadingMore) return;
    const current = requestId.current;
    if (!current || current.cancelled) return;
    setLoadingMore(true); setError('');
    try {
      const { data } = await api<{ data: R2DirectoryListing }>(`r2-directories?${new URLSearchParams({ prefix, cursor: listing.cursor })}`);
      if (current.cancelled) return;
      setListing((previous) => ({ ...data, directories: Array.from(new Set([...(previous?.directories || []), ...data.directories])).sort() }));
    } catch (cause) { if (!current.cancelled) setError(cause instanceof Error ? cause.message : '目录加载失败'); }
    finally { if (!current.cancelled) setLoadingMore(false); }
  };
  const parts = prefix.split('/').filter(Boolean);

  return <AdminDialog title="选择 R2 目录" onClose={onClose}>
    <div className={modalClass}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">选择 R2 目录</h2>
        <button className={iconButtonClass} aria-label="关闭目录选择" onClick={onClose}><X size={16} /></button></div>
      <p className="mb-4 text-xs leading-5 text-[#66746b]">进入已有目录后，点击“使用此目录”。原图与预览图将分别存入该目录的 origin 和 compress 子目录。</p>
      <nav aria-label="R2 目录层级" className="mb-3 flex flex-wrap items-center gap-1 text-xs">
        <button className={rowButtonClass} disabled={loadingMore} onClick={() => setPrefix('')}>根目录</button>
        {parts.map((part, index) => <span key={index} className="inline-flex items-center gap-1"><ChevronRight size={12} />
          <button className={rowButtonClass} disabled={loadingMore} onClick={() => setPrefix(parts.slice(0, index + 1).join('/'))}>{part}</button></span>)}
      </nav>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-xs text-[#66746b]">{prefix || '/'}</span>
        <div className="flex gap-1"><button className={iconButtonClass} aria-label="返回上级目录" disabled={!prefix || loadingMore}
          onClick={() => setPrefix(parts.slice(0, -1).join('/'))}><ChevronLeft size={16} /></button>
          <button className={iconButtonClass} aria-label="刷新目录" disabled={loading || loadingMore} onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={16} /></button></div>
      </div>
      <div className="max-h-64 min-h-32 overflow-y-auto rounded-md border border-[#dfe6df]" aria-busy={loading || loadingMore}>
        {loading ? <p role="status" className="p-4 text-sm text-[#66746b]">正在加载目录…</p>
          : listing?.directories.length ? listing.directories.map((path) => <button key={path}
            className="flex w-full items-center gap-3 border-b border-[#ebefeb] px-4 py-3 text-left text-sm last:border-0 hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#247560] disabled:opacity-50"
            disabled={loadingMore} onClick={() => setPrefix(path)}><FolderOpen size={18} className="shrink-0 text-[#247560]" />
            <span className="min-w-0 flex-1 break-all">{path.slice(prefix ? prefix.length + 1 : 0)}</span><ChevronRight size={16} /></button>)
          : !error && <p className="p-4 text-sm text-[#66746b]">没有可进入的子目录{prefix ? '，可使用当前目录' : ''}。</p>}
        {!loading && listing?.cursor && <button className={`${buttonClass} m-3`} disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? '正在加载…' : '加载更多目录'}</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}<button className="ml-2 underline" onClick={() => setAttempt((value) => value + 1)}>重试</button></p>}
      <div className="mt-5 flex justify-end gap-2"><button className={buttonClass} onClick={onClose}>取消</button>
        <button className={primaryClass} disabled={!prefix || !listing || loading || loadingMore || !!error} onClick={() => onSelect(prefix)}><Check size={16} />使用此目录</button></div>
    </div>
  </AdminDialog>;
}

const translationLanguageLabels: Record<Language, string> = {
  en: '英语', zh: '简体中文', ja: '日语', vi: '越南语', 'zh-hant': '繁体中文',
};

type TranslationDraft = { display_name: string; seo_title: string; description: string };
const emptyTranslation: TranslationDraft = { display_name: '', seo_title: '', description: '' };
function translationDraft(row?: DeviceI18nRow): TranslationDraft {
  return { display_name: row?.display_name || '', seo_title: row?.seo_title || '', description: row?.description || '' };
}

function DeviceI18nDialog({ device, initialLanguage, initialMedia, onChanged, onClose }: {
  device: Pick<DeviceRow, 'id' | 'device_name'>; initialLanguage: Language; initialMedia: WallpaperMediaType; onChanged: () => void; onClose: () => void;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [media, setMedia] = useState<WallpaperMediaType>(initialMedia);
  const [rows, setRows] = useState<DeviceI18nRow[]>([]);
  const [drafts, setDrafts] = useState<Partial<Record<Language, TranslationDraft>>>({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoaded(false); setError(''); setMessage('');
    void api<{ data: DeviceI18nRow[] }>(`device-i18n?${new URLSearchParams({ device_id: device.id, media })}`)
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data);
        setDrafts(Object.fromEntries(data.map((row) => [row.language, translationDraft(row)])));
        setLoaded(true);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '多语言内容加载失败'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [device.id, media, attempt]);

  const saved = rows.find((row) => row.language === language);
  const draft = drafts[language] || emptyTranslation;
  const fields = ['display_name', 'seo_title', 'description'] as const;
  const changed = (value: Language) => fields.some((field) =>
    (drafts[value]?.[field] || '') !== (rows.find((row) => row.language === value)?.[field] || ''));
  const dirty = SUPPORTED_LANGUAGES.some(changed);
  const hasContent = fields.some((field) => draft[field].trim());
  const update = (field: keyof TranslationDraft, value: string) => {
    setDrafts((current) => ({ ...current, [language]: { ...(current[language] || emptyTranslation), [field]: value } }));
    setError(''); setMessage('');
  };
  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('多语言内容有未保存的修改，确认关闭并放弃修改？')) return;
    onClose();
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !loaded || !hasContent) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await api<{ data: DeviceI18nRow }>('device-i18n', 'POST', { device_id: device.id, media_type: media, language, ...draft });
      setRows((current) => [...current.filter((row) => row.language !== language), data]);
      setDrafts((current) => ({ ...current, [language]: translationDraft(data) }));
      setMessage(`已保存${translationLanguageLabels[language]}内容`);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '多语言内容保存失败'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || !saved || !window.confirm(`确认删除“${device.device_name}”的${translationLanguageLabels[language]}设备名、SEO 标题和描述？此操作无法撤销。`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('device-i18n', 'DELETE', { device_id: device.id, media_type: media, language });
      setRows((current) => current.filter((row) => row.language !== language));
      setDrafts((current) => ({ ...current, [language]: { ...emptyTranslation } }));
      setMessage(`已删除${translationLanguageLabels[language]}内容`);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '多语言内容删除失败'); }
    finally { setBusy(false); }
  };

  return <AdminDialog title="设备多语言内容" onClose={close}>
    <form onSubmit={save} className={modalClass}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">设备多语言内容</h2>
        <button type="button" className={iconButtonClass} aria-label="关闭多语言内容" disabled={busy} onClick={close}><X size={16} /></button></div>
      <p className="mb-1 text-sm font-semibold">{device.device_name}</p>
      <p className="mb-4 text-xs leading-5 text-[#66746b]">静态与动态合集分别保存设备名、SEO 标题和描述，互不覆盖。至少填写一项，留空使用对应类型的默认内容。各语言独立保存，切换语言保留未保存的修改。</p>
      <label className="mb-4 block text-sm">壁纸类型<select className={`${inputClass} mt-1`} value={media} disabled={busy || loading} onChange={(event) => {
        if (dirty && !window.confirm('当前壁纸类型有未保存的修改，确认切换并放弃修改？')) return;
        setLoaded(false); setLoading(true); setRows([]); setDrafts({}); setMedia(event.target.value as WallpaperMediaType);
      }}><option value="static">静态壁纸</option><option value="dynamic">动态壁纸 · Live</option></select></label>
      {loading && <p role="status" className="mb-4 text-sm text-[#66746b]">正在加载多语言内容…</p>}
      <fieldset disabled={!loaded || loading || busy} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm">语言<select className={`${inputClass} mt-1`} value={language} onChange={(event) => {
          setLanguage(event.target.value as Language); setError(''); setMessage('');
        }}>{SUPPORTED_LANGUAGES.map((value) => <option key={value} value={value}>
          {translationLanguageLabels[value]} · {rows.some((row) => row.language === value) ? '已保存' : '未填写'}
        </option>)}</select></label>
        <label className="block text-sm">{translationLanguageLabels[language]}设备名<input maxLength={200}
          className={`${inputClass} mt-1`} value={draft.display_name} onChange={(event) => update('display_name', event.target.value)} placeholder={device.device_name} /></label>
        <label className="block text-sm">{translationLanguageLabels[language]} SEO 标题<input maxLength={200}
          className={`${inputClass} mt-1`} value={draft.seo_title} onChange={(event) => update('seo_title', event.target.value)}
          placeholder={buildWallpaperListTitle(draft.display_name.trim() || device.device_name, getI18nTexts(language).wallpapersTitleSuffix)} /></label>
        <label className="block text-sm">{translationLanguageLabels[language]}描述<textarea maxLength={5000}
          className={`${inputClass} mt-1 h-48 resize-y py-3 leading-6`} value={draft.description} onChange={(event) => update('description', event.target.value)}
          placeholder="填写这组壁纸的内容、风格或背景说明" /></label>
        <p className="text-right text-xs tabular-nums text-[#66746b]">{draft.description.length} / 5000 · 已保存 {rows.length} / 5 种语言</p>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}{!loaded && !loading &&
        <button type="button" className="ml-2 underline" onClick={() => setAttempt((value) => value + 1)}>重新加载</button>}</p>}
      {message && <p role="status" className="mt-3 text-sm text-[#247560]">{message}</p>}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <button type="button" className={`${buttonClass} text-red-700`} disabled={!loaded || loading || busy || !saved} onClick={() => void remove()}><Trash2 size={16} />删除此语言</button>
        <div className="flex gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={close}>关闭</button>
          <button className={primaryClass} disabled={!loaded || loading || busy || !hasContent || !changed(language)}><Check size={16} />{busy ? '处理中…' : '保存此语言'}</button></div>
      </div>
    </form>
  </AdminDialog>;
}

function fileMime(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' } as Record<string, string>)[extension || ''] || '';
}

function fileStem(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}

function putWithProgress(url: string, file: File, onProgress: (value: number) => void, headers: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', fileMime(file));
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve()
      : reject(new Error(xhr.status === 412 ? getI18nTexts('zh').adminUploadFileExists.replace('{name}', file.name) : `R2 上传失败 (${xhr.status})`));
    xhr.onerror = () => reject(new Error('R2 网络错误'));
    xhr.send(file);
  });
}

export default function AdminConsole() {
  const uploadTexts = getI18nTexts('zh');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const searchParams = useSearchParams();
  const tab = resolveAdminTab(searchParams.get('tab'));
  const setTab = (nextTab: AdminTab) => {
    if (nextTab !== tab) window.history.pushState(null, '', adminTabHref(new URL(window.location.href), nextTab));
  };
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [wallpapers, setWallpapers] = useState<WallpaperListRow[]>([]);
  const [wallpaperTotal, setWallpaperTotal] = useState(0);
  const [devicePage, setDevicePage] = useState(0);
  const [wallpaperPage, setWallpaperPage] = useState(0);
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<DeviceRow> | null>(null);
  const [describingDevice, setDescribingDevice] = useState<{ device: Pick<DeviceRow, 'id' | 'device_name'>; language: Language; media?: WallpaperMediaType } | null>(null);
  const [i18nRevision, setI18nRevision] = useState(0);
  const [newBrand, setNewBrand] = useState<{ title: string; slug: string; kind: AdminBrand['kind'] } | null>(null);
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheck | null>(null);
  const [publishDeviceDrafts, setPublishDeviceDrafts] = useState(true);
  const [editingWallpaper, setEditingWallpaper] = useState<Partial<WallpaperRow> | null>(null);
  const [uploadBrand, setUploadBrand] = useState('');
  const [uploadDevices, setUploadDevices] = useState<DeviceRow[]>([]);
  const [uploadDevicesLoading, setUploadDevicesLoading] = useState(false);
  const [uploadDevice, setUploadDevice] = useState('');
  const [uploadMedia, setUploadMedia] = useState<WallpaperMediaType>('static');
  const [uploadDirectory, setUploadDirectory] = useState<{
    deviceId: string; media: WallpaperMediaType; data?: AdminUploadDirectories; error?: string;
  } | null>(null);
  const [uploadDirectoryRevision, setUploadDirectoryRevision] = useState(0);
  const [uploadExistingPrefix, setUploadExistingPrefix] = useState('');
  const [uploadSearch, setUploadSearch] = useState('');
  const [creatingUploadDevice, setCreatingUploadDevice] = useState(false);
  const [newUploadDeviceName, setNewUploadDeviceName] = useState('');
  const [newUploadCategory, setNewUploadCategory] = useState<DeviceRow['device_category']>('phone');
  const [newUploadDate, setNewUploadDate] = useState('');
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [uploadPublication, setUploadPublication] = useState<{ device: Pick<DeviceRow, 'id' | 'device_name'>; count: number } | null>(null);
  const createdUploadCollections = useRef(new Set<string>());
  const [uploadFolderName, setUploadFolderName] = useState('');
  const [batchTags, setBatchTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploadFolderState, setUploadFolderState] = useState<'idle' | 'checking' | 'matched' | 'missing' | 'error'>('idle');
  const [uploadPathMode, setUploadPathMode] = useState<'device' | 'custom'>('device');
  const [uploadR2Prefix, setUploadR2Prefix] = useState('');
  const [choosingR2Directory, setChoosingR2Directory] = useState(false);
  const [deletingWallpaper, setDeletingWallpaper] = useState<WallpaperListRow | null>(null);
  const loadId = useRef(0);
  const folderLookupId = useRef(0);

  const reload = useCallback(async () => {
    if (!authenticated) return;
    const currentLoad = ++loadId.current;
    setLoading(true);
    try {
      const deviceQuery = new URLSearchParams();
      const wallpaperQuery = new URLSearchParams();
      if (filters.brand) { deviceQuery.set('brand', filters.brand); wallpaperQuery.set('brand', filters.brand); }
      if (filters.category) { deviceQuery.set('category', filters.category); wallpaperQuery.set('category', filters.category); }
      if (filters.status) { deviceQuery.set('status', filters.status); wallpaperQuery.set('status', filters.status); }
      if (filters.popular) deviceQuery.set('popular', filters.popular);
      for (const key of ['device', 'theme', 'media', 'format'] as const) {
        if (filters[key]) wallpaperQuery.set(key, filters[key]);
      }
      if (filters.search) wallpaperQuery.set('search', filters.search);
      wallpaperQuery.set('page', String(wallpaperPage));
      const [brandResult, deviceResult, wallpaperResult] = await Promise.all([
        api<{ data: AdminBrand[] }>('brands'),
        api<{ data: DeviceRow[] }>(`devices?${deviceQuery}`),
        api<{ data: WallpaperListRow[]; total: number; page: number }>(`wallpapers?${wallpaperQuery}`),
      ]);
      if (currentLoad !== loadId.current) return;
      setBrands(brandResult.data);
      setDevices(deviceResult.data);
      setWallpapers(wallpaperResult.data);
      setWallpaperTotal(wallpaperResult.total);
      setWallpaperPage(wallpaperResult.page);
      setError('');
    } catch (cause) {
      if (currentLoad !== loadId.current) return;
      setBrands([]);
      setDevices([]);
      setWallpapers([]);
      setWallpaperTotal(0);
      setError(cause instanceof Error ? cause.message : '加载失败');
    } finally { if (currentLoad === loadId.current) setLoading(false); }
  }, [authenticated, filters, wallpaperPage]);

  useEffect(() => {
    void api<{ authenticated: boolean }>('session').then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDevicePage(0);
      setWallpaperPage(0);
      setFilters((current) => current.search === searchInput ? current : { ...current, search: searchInput });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    if (!authenticated || !uploadBrand) {
      setUploadDevices([]);
      setUploadDevicesLoading(false);
      return;
    }
    let cancelled = false;
    setUploadDevicesLoading(true);
    void api<{ data: DeviceRow[] }>(`devices?brand=${encodeURIComponent(uploadBrand)}`)
      .then(({ data }) => {
        if (!cancelled) {
          const matching = data.filter((device) => device.brand_name === uploadBrand);
          setUploadDevices((current) => [
            ...matching,
            ...current.filter((device) => device.brand_name === uploadBrand &&
              !matching.some((match) => match.id === device.id)),
          ]);
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '加载设备失败'); })
      .finally(() => { if (!cancelled) setUploadDevicesLoading(false); });
    return () => { cancelled = true; };
  }, [authenticated, uploadBrand]);
  useEffect(() => {
    if (!authenticated || tab !== 'upload' || !uploadDevice) return;
    let cancelled = false;
    setUploadExistingPrefix('');
    setUploadR2Prefix('');
    setUploadDirectory(null);
    void api<{ data: AdminUploadDirectories }>(`upload?${new URLSearchParams({ device_id: uploadDevice, media_type: uploadMedia })}`)
      .then(({ data }) => { if (!cancelled) setUploadDirectory({ deviceId: uploadDevice, media: uploadMedia, data }); })
      .catch(() => { if (!cancelled) setUploadDirectory({ deviceId: uploadDevice, media: uploadMedia, error: uploadTexts.adminUploadDirectoryFailed }); });
    return () => { cancelled = true; };
  }, [authenticated, tab, uploadDevice, uploadMedia, uploadDirectoryRevision, uploadTexts.adminUploadDirectoryFailed]);
  useEffect(() => {
    setPublishDeviceDrafts(true);
    if (!editingDevice?.id) { setDeviceCheck(null); return; }
    void api<{ data: DeviceCheck }>(`device-check?id=${encodeURIComponent(editingDevice.id)}`)
      .then((result) => setDeviceCheck(result.data)).catch(() => setDeviceCheck(null));
  }, [editingDevice?.id]);

  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败'); }
    finally { setBusy(false); }
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await api('login', 'POST', { username, password, remember });
      setAuthenticated(true);
      setPassword('');
    });
  };

  const deleteWallpaper = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deletingWallpaper || busy) return;
    setBusy(true);
    setError('');
    let failure = '';
    try {
      await api('wallpapers', 'DELETE', { id: deletingWallpaper.id });
      setDeletingWallpaper(null);
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : '删除失败';
    }
    await reload();
    if (failure) setError(failure);
    setBusy(false);
  };

  const selectUploadBrand = (brand: string): boolean => {
    if (brand === uploadBrand) return true;
    if (uploadRows.length && !window.confirm('切换品牌将清空待上传文件，继续吗？')) return false;
    setUploadBrand(brand);
    setUploadDevice('');
    setUploadDevices([]);
    setUploadRows([]);
    setUploadFolderName('');
    setUploadPathMode('device');
    setUploadR2Prefix('');
    setUploadFolderState('idle');
    folderLookupId.current++;
    setUploadSearch('');
    setCreatingUploadDevice(false);
    setNewUploadDeviceName('');
    setNewUploadCategory(defaultDeviceCategory(brand, brands));
    setNewUploadDate('');
    return true;
  };

  const createBrand = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newBrand) return;
    await run(async () => {
      const { data } = await api<{ data: AdminBrand }>('brands', 'POST', newBrand);
      setBrands((current) => [...current, data]);
      if (tab === 'upload' && uploadRows.length === 0) {
        setUploadBrand(data.slug);
        setUploadDevice('');
        setUploadDevices([]);
        setUploadSearch('');
        setCreatingUploadDevice(false);
        setNewUploadDeviceName('');
        setUploadFolderName('');
        setUploadPathMode('device');
        setUploadR2Prefix('');
        setUploadFolderState('idle');
        folderLookupId.current++;
        setNewUploadCategory(data.kind === 'desktop' ? 'desktop' : 'phone');
        setNewUploadDate('');
      }
      setNewBrand(null);
    });
  };

  const findFolderDevice = async (name: string): Promise<DeviceRow | undefined> => {
    const query = new URLSearchParams({ brand: uploadBrand, name: normalizeAdminDisplay(name) });
    const { data } = await api<{ data: DeviceRow[] }>(`devices?${query}`);
    return data.find((device) => device.brand_name === uploadBrand &&
      normalizeAdminName(device.device_name) === normalizeAdminName(name));
  };

  const checkUploadFolder = async (name: string) => {
    const lookupId = ++folderLookupId.current;
    setError('');
    setUploadFolderState('checking');
    setUploadDevice('');
    try {
      const existing = await findFolderDevice(name);
      if (lookupId !== folderLookupId.current) return;
      if (existing) {
        setUploadDevices((current) => [existing, ...current.filter((device) => device.id !== existing.id)]);
        setUploadDevice(existing.id);
      }
      setUploadFolderState(existing ? 'matched' : 'missing');
    } catch (cause) {
      if (lookupId !== folderLookupId.current) return;
      setUploadFolderState('error');
      setError(cause instanceof Error ? cause.message : '检查设备失败');
    }
  };

  const createUploadDevice = async (event: React.FormEvent, folderName?: string) => {
    event.preventDefault();
    await run(async () => {
      if (!newUploadDate.trim()) throw new Error('请填写新设备的发布日期');
      const data = await createDevice({
        brand_name: uploadBrand,
        device_name: folderName ? normalizeAdminDisplay(folderName) : newUploadDeviceName,
        device_category: newUploadCategory,
        release_date: newUploadDate,
      });
      if (!data) return;
      createdUploadCollections.current.add(`${data.id}:${uploadMedia}`);
      setUploadDevices((current) => [data, ...current.filter((device) => device.id !== data.id)]);
      setUploadDevice(data.id);
      if (folderName) setUploadFolderState('matched');
      else { setUploadFolderName(''); setUploadFolderState('idle'); folderLookupId.current++; }
      setUploadSearch('');
      setCreatingUploadDevice(false);
      setNewUploadDeviceName('');
      setNewUploadDate('');
    });
  };

  const addFiles = async (event: ChangeEvent<HTMLInputElement>, explicitRole?: 'origin' | 'compress') => {
    const files = Array.from(event.target.files || []);
    const folderRoot = !explicitRole && files.length ? files[0].webkitRelativePath.split('/')[0] : '';
    const roleFiles = !explicitRole ? files.filter((file) => /(^|\/)(origin|compress)\//i.test(file.webkitRelativePath)) : [];
    if (!explicitRole && files.length &&
        (!folderRoot || /^(origin|compress)$/i.test(folderRoot) ||
         files.some((file) => file.webkitRelativePath.split('/')[0] !== folderRoot))) {
      setError('请选择包含 origin 和 compress 子目录的设备或系统文件夹');
      event.target.value = '';
      return;
    }
    if (!explicitRole && roleFiles.some((file) => {
      const parts = file.webkitRelativePath.split('/');
      return parts.length !== 3 || parts[0] !== folderRoot || !/^(origin|compress)$/i.test(parts[1]);
    })) {
      setError('文件夹内的原图和预览图须直接放在 origin 与 compress 子目录');
      event.target.value = '';
      return;
    }
    if (!explicitRole && uploadFolderName && uploadFolderName !== folderRoot &&
        uploadRows.some((row) => row.state !== 'done')) {
      setError('一次只能上传一个设备或系统文件夹');
      event.target.value = '';
      return;
    }
    if (!explicitRole && files.length && files.every((file) => !/(^|\/)(origin|compress)\//i.test(file.webkitRelativePath || file.name))) {
      setError('文件夹中未找到 origin 或 compress 文件');
      event.target.value = '';
      return;
    }
    if (!explicitRole && !files.length) return;
    if (!explicitRole && folderRoot && uploadRows.some((row) => row.state !== 'done' && !row.folderName)) {
      setError('请先上传或移除已单独添加的文件，再选择设备文件夹');
      event.target.value = '';
      return;
    }
    try {
      for (const file of explicitRole ? files : roleFiles) {
        const role = explicitRole || (/(^|\/)compress\//i.test(file.webkitRelativePath) ? 'compress' : 'origin');
        assertAdminUploadMime(fileMime(file), role, uploadMedia);
      }
    } catch {
      setError(uploadTexts.adminUploadMediaMismatch);
      event.target.value = '';
      return;
    }
    if (!explicitRole && folderRoot) {
      setUploadFolderName(folderRoot);
      setCreatingUploadDevice(false);
      setNewUploadDeviceName(normalizeAdminDisplay(folderRoot));
      setNewUploadCategory(defaultDeviceCategory(uploadBrand, brands));
      setNewUploadDate('');
      setUploadSearch('');
    }
    setError('');
    setUploadRows((current) => {
      const next = current.length && current.every((row) => row.state === 'done') ? [] : current.map((row) => ({ ...row }));
      for (const file of files) {
        const path = file.webkitRelativePath || file.name;
        const role = explicitRole || (/(^|\/)compress\//i.test(path) ? 'compress'
          : /(^|\/)origin\//i.test(path) ? 'origin' : null);
        if (!role) continue;
        const stem = fileStem(file);
        const id = file.webkitRelativePath
          ? path.replace(/(^|\/)(origin|compress)\/[^/]+$/i, `$1${stem}`) : stem;
        let row = next.find((entry) => entry.id === id || (!file.webkitRelativePath && entry.name === stem));
        if (!row) {
          row = { id, name: stem, theme: 'normal', tags: batchTags, category: '', folderName: folderRoot || undefined, state: 'ready', progress: 0 };
          next.push(row);
        }
        row[role === 'origin' ? 'origin' : 'preview'] = file;
        if (role === 'origin') { row.originGrant = undefined; row.originUploaded = false; }
        else { row.previewGrant = undefined; row.previewUploaded = false; }
        row.state = 'ready';
        row.error = undefined;
      }
      return [...next];
    });
    event.target.value = '';
    if (!explicitRole && folderRoot) await checkUploadFolder(folderRoot);
  };

  const patchUpload = (id: string, patch: Partial<UploadRow>) =>
    setUploadRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const ensureUploadDevice = async (): Promise<string> => {
    if (uploadFolderName) {
      if (uploadFolderState !== 'matched') throw new Error('请先检查并创建文件夹对应的设备或系统');
      const selected = uploadDevices.find((device) => device.id === uploadDevice && device.brand_name === uploadBrand);
      if (!selected || normalizeAdminName(selected.device_name) !== normalizeAdminName(uploadFolderName)) {
        throw new Error('所选设备与文件夹名称不一致，请重新检查设备');
      }
    }
    if (!uploadDevice) throw new Error('请选择设备或系统');
    return uploadDevice;
  };

  const uploadOne = async (row: UploadRow, deviceId: string, r2Prefix: string): Promise<boolean> => {
    if (!row.origin || !row.preview) {
      patchUpload(row.id, { state: 'failed', error: '原图和预览图未配齐' }); return false;
    }
    patchUpload(row.id, { state: 'uploading', progress: 0, error: undefined });
    try {
      assertAdminUploadMime(fileMime(row.origin), 'origin', uploadMedia);
      assertAdminUploadMime(fileMime(row.preview), 'compress', uploadMedia);
      const authorize = async (file: File, role: string) => api<UploadFileGrant>('upload', 'POST', {
        action: 'authorize', device_id: deviceId, role, media_type: uploadMedia,
        size_bytes: file.size, mime_type: fileMime(file), file_name: file.name,
        r2_prefix: r2Prefix, path_mode: uploadPathMode,
      });
      const [origin, preview] = await Promise.all([row.originGrant || authorize(row.origin, 'origin'), row.previewGrant || authorize(row.preview, 'compress')]);
      patchUpload(row.id, { originGrant: origin, previewGrant: preview });
      if (!row.originUploaded) {
        await putWithProgress(origin.url, row.origin, (progress) => patchUpload(row.id, { progress: Math.round(progress / 2) }), origin.headers);
        patchUpload(row.id, { originUploaded: true });
      }
      if (!row.previewUploaded) {
        await putWithProgress(preview.url, row.preview, (progress) => patchUpload(row.id, { progress: 50 + Math.round(progress / 2) }), preview.headers);
        patchUpload(row.id, { previewUploaded: true });
      }
      const { data } = await api<{ data: WallpaperRow }>('upload', 'POST', {
        action: 'complete', device_id: deviceId, name: row.name, media_type: uploadMedia,
        origin_token: origin.token, preview_token: preview.token,
        theme: row.theme, category: row.category || undefined,
        tags: row.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      patchUpload(row.id, { state: 'done', progress: 100, isPrimary: !!data.is_primary, isPublished: false });
      return true;
    } catch (cause) {
      patchUpload(row.id, { state: 'failed', error: cause instanceof Error ? cause.message : '上传失败' });
      return false;
    }
  };

  const publishUploadedDevice = async () => {
    if (!uploadPublication || busy) return;
    await run(async () => {
      const { data } = await api<{ data: DeviceRow }>('devices', 'PATCH', {
        id: uploadPublication.device.id, status: 'published', publish_drafts: true,
      });
      setUploadDevices((current) => current.map((device) => device.id === data.id ? data : device));
      setUploadRows((current) => current.map((row) => row.state === 'done' ? { ...row, isPublished: true } : row));
      setUploadPublication(null);
    });
  };

  const visibleDevices = devices.filter((device) => !searchInput ||
    `${device.device_name} ${device.brand_name}`.toLowerCase().includes(searchInput.toLowerCase()));
  const uploadBrandIsDesktop = brands.some((brand) => brand.slug === uploadBrand && brand.kind === 'desktop');
  const inferredExistingDevice = uploadFolderName && uploadFolderState === 'matched'
    ? uploadDevices.find((device) => device.brand_name === uploadBrand && device.id === uploadDevice)
    : null;
  const folderTargetLocked = Boolean(uploadFolderName) && uploadRows.some((row) => row.state !== 'done');
  const selectedUploadDevice = uploadDevices.find((device) => device.id === uploadDevice && device.brand_name === uploadBrand);
  const currentUploadDirectory = selectedUploadDevice && uploadDirectory?.deviceId === uploadDevice && uploadDirectory.media === uploadMedia
    ? uploadDirectory : null;
  const uploadStorageLoading = Boolean(selectedUploadDevice && !currentUploadDirectory);
  const uploadStorage = currentUploadDirectory?.data;
  let uploadStoragePath = uploadStorage
    ? uploadStorage.directories.includes(uploadExistingPrefix) ? uploadExistingPrefix : uploadStorage.prefix : '';
  let uploadStoragePathError = '';
  if (uploadPathMode === 'custom') {
    try { uploadStoragePath = normalizeAdminR2Prefix(uploadR2Prefix); }
    catch (cause) { uploadStoragePath = ''; uploadStoragePathError = cause instanceof Error ? cause.message : 'R2 目录无效'; }
  }
  let uploadQueueError = '';
  try {
    for (const row of uploadRows.filter((item) => item.state !== 'done')) {
      if (row.origin) assertAdminUploadMime(fileMime(row.origin), 'origin', uploadMedia);
      if (row.preview) assertAdminUploadMime(fileMime(row.preview), 'compress', uploadMedia);
    }
  } catch { uploadQueueError = uploadTexts.adminUploadMediaMismatch; }
  const isNewUploadCollection = Boolean(selectedUploadDevice && uploadStorage?.source === 'default');
  const createUploadCollectionLabel = uploadMedia === 'dynamic'
    ? uploadTexts.adminUploadCreateDynamicCollection : uploadTexts.adminUploadCreateStaticCollection;
  const startUpload = () => run(async () => {
    const pending = uploadRows.filter((item) => item.state !== 'done');
    if (!pending.length) throw new Error(uploadTexts.adminUploadAddFilesFirst);
    if (uploadDevicesLoading || uploadStorageLoading || !uploadStorage) throw new Error(uploadTexts.adminUploadLoadingDirectory);
    if (uploadQueueError) throw new Error(uploadQueueError);
    if (pending.some((row) => !row.origin || !row.preview)) throw new Error('请先配齐每项原图和预览图');
    if (uploadFolderName && pending.some((row) => row.folderName !== uploadFolderName)) throw new Error('待上传文件不属于所选设备或系统文件夹');
    const deviceId = await ensureUploadDevice();
    if (!uploadStoragePath || uploadStoragePathError) throw new Error(uploadStoragePathError || '请选择 R2 存储目录');
    const collectionKey = `${deviceId}:${uploadMedia}`;
    if (isNewUploadCollection) createdUploadCollections.current.add(collectionKey);
    await uploadAdminBatch(pending, (row) => uploadOne(row, deviceId, uploadStoragePath), (count) => {
      const device = uploadDevices.find((item) => item.id === deviceId);
      if (device && createdUploadCollections.current.has(collectionKey)) {
        createdUploadCollections.current.delete(collectionKey);
        setUploadPublication({ device, count: count + uploadRows.filter((row) => row.state === 'done').length });
      }
    });
    setUploadDirectoryRevision((value) => value + 1);
  });
  const editingDeviceIsDesktop = brands.some((brand) => brand.slug === editingDevice?.brand_name && brand.kind === 'desktop');
  const changeFilters = (patch: Partial<typeof filters>) => {
    setDevicePage(0);
    setWallpaperPage(0);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const resetFilters = () => { setDevicePage(0); setWallpaperPage(0); setFilters({ ...emptyFilters }); setSearchInput(''); };

  if (authenticated === null) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] text-sm text-[#66746b]" role="status">正在检查登录状态…</main>;
  if (!authenticated) return (
    <main className="flex min-h-screen flex-col bg-[#f5f7f4] text-[#25332d]">
      <header className="border-b border-[#e0e7e0] px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-6xl items-center gap-3"><img src="/brand/option-03/icon-32.png" alt="" className="h-9 w-9 rounded-md" /><span className="text-base font-semibold">PhWalls</span><span className="h-5 w-px bg-[#d8e0d9]" /><span className="text-sm text-[#66746b]">内容管理</span></div></header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-12 sm:px-10">
      <form onSubmit={login} className="mx-auto w-full max-w-sm">
        <div className="mb-2 h-1 w-10 bg-[#247560]" />
        <h1 className="mb-2 text-3xl font-semibold text-[#17251d]">登录管理后台</h1>
        <p className="mb-8 text-sm text-[#66746b]">PhWalls 内容工作区</p>
        <label className="mb-1.5 block text-sm font-medium text-[#34433b]" htmlFor="admin-username">账号</label>
        <input id="admin-username" autoComplete="username" required className={`${inputClass} mb-5`} value={username} onChange={(event) => setUsername(event.target.value)} />
        <label className="mb-1.5 block text-sm font-medium text-[#34433b]" htmlFor="admin-password">密码</label>
        <input id="admin-password" type="password" autoComplete="current-password" required className={`${inputClass} mb-4`} value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="mb-7 flex items-center gap-2 text-sm text-[#56675b]">
          <input type="checkbox" className="accent-[#247560]" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          记住登录状态
        </label>
        {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button className={`${primaryClass} w-full`} disabled={busy}>{busy ? '登录中…' : '登录'}</button>
      </form>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#25332d] lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
      <aside className="border-b border-[#dfe6df] bg-[#18261f] text-white lg:min-h-screen lg:border-b-0">
        <div className="flex h-17 items-center justify-between gap-2 px-5 lg:h-20 lg:border-b lg:border-white/10 lg:px-6">
          <div className="flex min-w-0 items-center gap-3"><img src="/brand/option-03/icon-32.png" alt="" className="h-9 w-9 shrink-0 rounded-md" /><div className="min-w-0"><div className="truncate text-base font-semibold">PhWalls</div><div className="text-[11px] text-white/55">CONTENT STUDIO</div></div></div>
          <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70 lg:hidden">{process.env.NODE_ENV === 'development' ? '本地' : '线上'}</span>
        </div>
        <nav className="flex overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:px-3 lg:py-6" aria-label="管理视图">
          {([['brands', '品牌', Tags], ['devices', '设备', Smartphone], ['i18n', '多语言', Pencil], ['wallpapers', '壁纸', Images], ['upload', '上传', UploadCloud]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white lg:w-full lg:justify-start ${tab === key ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white'}`}><Icon size={16} />{label}</button>
          ))}
        </nav>
        <div className="hidden px-6 pt-4 text-xs text-white/45 lg:block">{process.env.NODE_ENV === 'development' ? '本地数据' : '线上数据'}</div>
      </aside>
      <div className="min-w-0">
      <header className="border-b border-[#e0e7e0] bg-white px-4 py-3 sm:px-7 lg:h-20 lg:px-9">
        <div className="mx-auto flex h-full max-w-[1480px] items-center justify-between gap-3">
          <div className="min-w-0"><h1 className="truncate text-base font-semibold text-[#17251d]">{tab === 'brands' ? '品牌管理' : tab === 'devices' ? '设备管理' : tab === 'wallpapers' ? '壁纸管理' : tab === 'i18n' ? '多语言管理' : '上传壁纸'}</h1><p className="text-xs text-[#758278]">PhWalls / 内容管理</p></div>
          <div className="flex items-center gap-2">
            <a className={buttonClass} href={process.env.NODE_ENV === 'development' ? '/' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com')} target="_blank" rel="noopener noreferrer" title="打开网站"><ExternalLink size={16} /><span className="hidden sm:inline">查看网站</span></a>
            <button className={iconButtonClass} title="刷新数据" aria-label="刷新数据" disabled={loading} onClick={() => { if (tab === 'i18n') setI18nRevision((value) => value + 1); else void reload(); }}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button className={iconButtonClass} title="退出登录" aria-label="退出登录" onClick={() => void run(async () => {
              await api('logout', 'POST'); setAuthenticated(false);
            })}><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl font-semibold tracking-tight text-[#17251d]">{tab === 'brands' ? '品牌目录' : tab === 'devices' ? '设备目录' : tab === 'wallpapers' ? '壁纸目录' : tab === 'i18n' ? '多语言内容' : '上传工作区'}</h2>
            <p className="mt-1 text-sm tabular-nums text-[#66746b]" role="status">{loading && tab !== 'upload' ? '正在更新数据…' : tab === 'brands' ? `${brands.length} 个品牌` : tab === 'devices' ? `${visibleDevices.length} 个设备` : tab === 'wallpapers' ? `${wallpaperTotal} 张壁纸` : tab === 'i18n' ? '设备名称、SEO 标题与合集描述' : `${uploadRows.length} 项文件 · ${uploadRows.filter((row) => row.state === 'done').length} 项已入库`}</p>
          </div>
          {tab === 'brands' && <button className={primaryClass} onClick={() => setNewBrand({ title: '', slug: '', kind: 'mobile' })}><Plus size={16} />新增品牌</button>}
          {tab === 'devices' && <button className={primaryClass} onClick={() => setEditingDevice({ device_category: 'phone', status: 'draft', is_popular_brand: 0, release_date: '' })}><Plus size={16} />新建设备</button>}
          {tab === 'wallpapers' && <button className={primaryClass} onClick={() => setTab('upload')}><ImagePlus size={16} />上传壁纸</button>}
        </div>
        {error && <div role="alert" className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span className="flex-1">{error}</span><button className="font-medium underline" onClick={() => void reload()}>重试</button></div>}
        {(tab === 'devices' || tab === 'wallpapers') && <div className="mb-5 rounded-lg border border-[#dfe6df] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 text-[#758278]" size={16} /><input className={`${inputClass} pl-9`} placeholder={tab === 'devices' ? '搜索设备或品牌' : '搜索壁纸或设备'} aria-label="搜索内容" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
            {(searchInput || Object.entries(filters).some(([key, value]) => key !== 'search' && value)) && <button className={buttonClass} onClick={resetFilters}><X size={15} />清除筛选</button>}
          </div>
          <div className={`grid grid-cols-2 gap-2 ${tab === 'devices' ? 'xl:grid-cols-4' : 'lg:grid-cols-4 xl:grid-cols-7'}`}>
          <select className={inputClass} aria-label="品牌筛选" value={filters.brand} onChange={(event) => changeFilters({ brand: event.target.value, device: '' })}>
            <option value="">全部品牌</option>
            <BrandOptions brands={brands} />
          </select>
          <select className={inputClass} aria-label="分类筛选" value={filters.category} onChange={(event) => changeFilters({ category: event.target.value })}>
            <option value="">全部分类</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
          </select>
          <select className={inputClass} aria-label="状态筛选" value={filters.status} onChange={(event) => changeFilters({ status: event.target.value })}>
            <option value="">全部状态</option>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value as DeviceRow['status']]}</option>)}
          </select>
          {tab === 'devices' && <select className={inputClass} aria-label="热门品牌筛选" value={filters.popular} onChange={(event) => changeFilters({ popular: event.target.value })}>
            <option value="">全部热度</option><option value="1">热门品牌</option><option value="0">普通品牌</option>
          </select>}
          {tab === 'wallpapers' && <>
            <select className={inputClass} aria-label="设备筛选" value={filters.device} onChange={(event) => changeFilters({ device: event.target.value })}>
              <option value="">全部设备</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}
            </select>
            <select className={inputClass} aria-label="主题筛选" value={filters.theme} onChange={(event) => changeFilters({ theme: event.target.value })}>
              <option value="">全部主题</option>{['dark', 'light', 'normal'].map((value) => <option key={value} value={value}>{themeLabels[value]}</option>)}
            </select>
            <select className={inputClass} aria-label="媒体筛选" value={filters.media} onChange={(event) => changeFilters({ media: event.target.value })}>
              <option value="">全部媒体</option><option value="static">静态</option><option value="dynamic">动态</option>
            </select>
            <input className={inputClass} placeholder="格式" aria-label="格式筛选" value={filters.format} onChange={(event) => changeFilters({ format: event.target.value })} />
          </>}
          </div>
        </div>}

        {tab === 'i18n' && <AdminDeviceI18nPanel brands={brands} refreshKey={i18nRevision}
          onEdit={(device, language, media) => setDescribingDevice({ device, language, media })} />}

        {tab === 'brands' && <section aria-label="品牌目录">
          <div className="overflow-x-auto rounded-lg border border-[#dfe6df] bg-white" aria-busy={loading}><table className={`${tableClass} min-w-[600px]`}>
            <thead className={tableHeadClass}><tr><th className="px-4 py-3">品牌</th><th className="px-4 py-3">标识</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">来源</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <TableFeedback columns={5} loading message="" /> : brands.length === 0 ? <TableFeedback columns={5} loading={false} message="暂无品牌" /> : brands.map((brand) => <tr key={brand.slug} className={tableRowClass}>
              <td className="px-4 py-3 font-medium text-gray-950"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#edf2eb] text-xs font-semibold uppercase text-[#526950]">{brand.title.slice(0, 2)}</span>{brand.title}</div></td><td className="px-4 py-3 font-mono text-xs text-[#758278]">{brand.slug}</td><td className="px-4 py-3 text-gray-600">{brand.kind === 'desktop' ? '桌面' : '手机与系统'}</td><td className="px-4 py-3 text-gray-600">{brand.source === 'builtin' ? '预置' : '后台新增'}</td>
              <td className="px-4 py-3 text-right"><button className={rowButtonClass} title="上传到此品牌" aria-label={`上传到 ${brand.title}`} onClick={() => { if (selectUploadBrand(brand.slug)) setTab('upload'); }}><UploadCloud size={15} />上传</button></td>
            </tr>)}</tbody>
          </table></div>
        </section>}

        {tab === 'devices' && <section aria-label="设备目录">
          <div className="overflow-x-auto rounded-lg border border-[#dfe6df] bg-white" aria-busy={loading}><table className={`${tableClass} min-w-[740px]`}>
            <thead className={tableHeadClass}><tr><th className="px-4 py-3">设备</th><th className="px-4 py-3">品牌</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">发布日期</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <TableFeedback columns={6} loading message="" /> : visibleDevices.length === 0 ? <TableFeedback columns={6} loading={false} message="没有符合条件的设备" onReset={resetFilters} /> : visibleDevices.slice(devicePage * PAGE_SIZE, (devicePage + 1) * PAGE_SIZE).map((device) => <tr key={device.id} className={tableRowClass}>
              <td className="px-4 py-3 font-medium text-gray-950">{device.device_name}</td><td className="px-4 py-3">{brands.find((brand) => brand.slug === device.brand_name)?.title || device.brand_name}{device.is_popular_brand ? <span className="ml-2 text-xs text-amber-700">热门</span> : null}</td>
              <td className="px-4 py-3 text-gray-600">{categoryLabels[device.device_category]}</td><td className="px-4 py-3"><span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusClasses[device.status]}`}>{statusLabels[device.status]}</span></td><td className="px-4 py-3 font-mono text-xs tabular-nums text-gray-600">{device.release_date || '—'}</td>
              <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button className={rowButtonClass} title="查看该设备的壁纸" aria-label={`查看 ${device.device_name} 的壁纸`} onClick={() => { setSearchInput(''); setFilters({ ...emptyFilters, brand: device.brand_name, device: device.id }); setDevicePage(0); setWallpaperPage(0); setTab('wallpapers'); }}><Images size={15} />壁纸</button><button className={rowButtonClass} title="管理五语言设备名、SEO 标题与描述" aria-label={`管理 ${device.device_name} 的多语言内容`} onClick={() => setDescribingDevice({ device, language: 'en' })}><Pencil size={15} />多语言</button><button className={rowButtonClass} title="编辑设备" aria-label={`编辑 ${device.device_name}`} onClick={() => setEditingDevice(device)}><Pencil size={15} />编辑</button></div></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs tabular-nums text-[#66746b]">
            <button className={iconButtonClass} title="上一页" aria-label="上一页设备" disabled={devicePage === 0 || loading} onClick={() => setDevicePage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>第 {devicePage + 1} / {Math.max(1, Math.ceil(visibleDevices.length / PAGE_SIZE))} 页</span>
            <button className={iconButtonClass} title="下一页" aria-label="下一页设备" disabled={(devicePage + 1) * PAGE_SIZE >= visibleDevices.length || loading} onClick={() => setDevicePage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'wallpapers' && <section aria-label="壁纸目录">
          <div className="overflow-x-auto rounded-lg border border-[#dfe6df] bg-white" aria-busy={loading}><table className={`${tableClass} min-w-[850px]`}>
            <thead className={tableHeadClass}><tr><th className="px-4 py-3">预览</th><th className="px-4 py-3">名称 / 设备</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">主题</th><th className="px-4 py-3">格式</th><th className="px-4 py-3">状态</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <TableFeedback columns={7} loading message="" /> : wallpapers.length === 0 ? <TableFeedback columns={7} loading={false} message="没有符合条件的壁纸" onReset={resetFilters} /> : wallpapers.map((item) => <tr key={item.id} className={tableRowClass}>
              <td className="px-4 py-3"><div className="h-16 w-12 overflow-hidden rounded bg-[#edf1ec]">{item.compress_key && (!item.deletion_state || item.deletion_state === 'none') ? <img className="h-full w-full object-cover" alt={`${item.name} 预览`} loading="lazy" src={buildPublicR2Url(item.compress_key) || ''} /> : <Images size={18} className="mx-auto mt-5 text-[#9aaba0]" />}</div></td>
              <td className="px-4 py-2"><div className="font-medium text-gray-950">{item.name}{item.is_primary ? <span className="ml-2 text-xs text-teal-700">主图</span> : null}</div><div className="text-xs text-gray-500">{brands.find((brand) => brand.slug === item.brand_name)?.title || item.brand_name} / {item.device_name}</div></td>
              <td className="px-4 py-2 text-gray-600">{categoryLabels[item.category]}</td><td className="px-4 py-2 text-gray-600">{themeLabels[item.theme] || item.theme}</td><td className="px-4 py-2 font-mono text-xs uppercase text-gray-600">{item.file_format}</td><td className="px-4 py-2"><span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${item.deletion_state && item.deletion_state !== 'none' ? 'bg-red-50 text-red-800' : statusClasses[item.status]}`}>{item.deletion_state === 'processing' ? '删除中' : item.deletion_state === 'pending' ? '待重试删除' : statusLabels[item.status]}</span></td>
              <td className="px-4 py-2 text-right"><div className="flex justify-end gap-1"><button className={`${rowButtonClass} disabled:cursor-not-allowed disabled:opacity-40`} title="编辑壁纸" aria-label={`编辑 ${item.name}`} disabled={busy || (!!item.deletion_state && item.deletion_state !== 'none')} onClick={() => setEditingWallpaper({ ...item, tags: (JSON.parse(item.tags) as string[]).join(', ') })}><Pencil size={15} />编辑</button><button className={`${rowButtonClass} text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-40`} title="删除壁纸和 R2 文件" aria-label={`删除 ${item.name}`} disabled={busy} onClick={() => { setError(''); setDeletingWallpaper(item); }}><Trash2 size={15} />删除</button></div></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs tabular-nums text-[#66746b]">
            <button className={iconButtonClass} title="上一页" aria-label="上一页壁纸" disabled={wallpaperPage === 0 || loading} onClick={() => setWallpaperPage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>第 {wallpaperPage + 1} / {Math.max(1, Math.ceil(wallpaperTotal / PAGE_SIZE))} 页</span>
            <button className={iconButtonClass} title="下一页" aria-label="下一页壁纸" disabled={(wallpaperPage + 1) * PAGE_SIZE >= wallpaperTotal || loading} onClick={() => setWallpaperPage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'upload' && <section aria-label="上传工作区">
          <div className="mb-5 rounded-lg border border-[#dfe6df] bg-white p-4 sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#34433b]"><span className="flex h-6 w-6 items-center justify-center rounded bg-[#edf2eb] text-xs text-[#526950]">1</span>上传目标</h3>
          <div className="mb-4">
            <label className="block max-w-sm text-sm">{uploadTexts.adminUploadTypeLabel}
              <select className={`${inputClass} mt-1`} aria-label={uploadTexts.adminUploadTypeLabel} disabled={busy} value={uploadMedia}
                onChange={(event) => { setUploadMedia(event.target.value as WallpaperMediaType); setUploadExistingPrefix(''); setUploadR2Prefix(''); setUploadPathMode('device'); setError(''); }}>
                <option value="static">{uploadTexts.adminUploadStaticLabel}</option><option value="dynamic">{uploadTexts.adminUploadDynamicLabel}</option>
              </select>
            </label>
            <p className="mt-2 text-xs text-[#66746b]">{uploadTexts.adminUploadMediaHint}</p>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(140px,1fr)_minmax(180px,2fr)] xl:grid-cols-[minmax(160px,1fr)_minmax(220px,2fr)_auto] xl:items-end">
            <label className="text-sm">品牌
              <div className="mt-1 flex gap-2"><select className={inputClass} value={uploadBrand} disabled={busy} onChange={(event) => selectUploadBrand(event.target.value)}>
                <option value="">选择品牌</option><BrandOptions brands={brands} />
              </select><button type="button" className={buttonClass} title="新增品牌" aria-label="新增品牌" onClick={() => setNewBrand({ title: '', slug: '', kind: 'mobile' })}><Plus size={16} /></button></div>
            </label>
            <label className="text-sm">设备或系统
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <input className={inputClass} aria-label="搜索设备或系统" value={uploadSearch} disabled={!uploadBrand || busy}
                onChange={(event) => setUploadSearch(event.target.value)} placeholder="搜索当前品牌" />
              <select className={inputClass} aria-label="选择设备或系统" value={uploadDevice} disabled={!uploadBrand || uploadDevicesLoading || busy || folderTargetLocked}
                onChange={(event) => { setUploadDevice(event.target.value); setUploadFolderName(''); setUploadFolderState('idle'); folderLookupId.current++; }}>
                <option value="">{uploadDevicesLoading ? '加载中' : '不选设备或系统'}</option>
                {uploadDevices.filter((device) => !uploadSearch || device.device_name.toLowerCase().includes(uploadSearch.toLowerCase()) || device.id === uploadDevice)
                  .map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}
              </select>
              </div>
            </label>
            <button className={buttonClass} disabled={!uploadBrand || busy || uploadDevicesLoading || uploadStorageLoading || (!isNewUploadCollection && folderTargetLocked)}
              onClick={() => { if (isNewUploadCollection) void startUpload(); else setCreatingUploadDevice((current) => !current); }}>
              <Plus size={16} />{isNewUploadCollection ? createUploadCollectionLabel : '新增设备/系统'}
            </button>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <label className="text-sm">R2 存储目录<select className={`${inputClass} mt-1`} aria-label="R2 目录方式" disabled={busy} value={uploadPathMode} onChange={(event) => setUploadPathMode(event.target.value as 'device' | 'custom')}><option value="device">{uploadTexts.adminUploadAutoDirectory}</option><option value="custom">指定 R2 目录</option></select></label>
            <div className="text-sm"><label htmlFor="r2-upload-path">目录路径</label><div className="mt-1 flex gap-2">
              <input id="r2-upload-path" className={`${inputClass} font-mono text-xs`} aria-describedby="r2-path-help" readOnly
                value={uploadPathMode === 'custom' ? uploadR2Prefix : uploadStoragePath}
                placeholder={uploadPathMode === 'custom' ? '请选择 R2 目录' : '选择设备后显示默认目录'} />
              {uploadPathMode === 'custom' && <button type="button" className={buttonClass} disabled={busy || uploadStorageLoading || !uploadStorage} onClick={() => setChoosingR2Directory(true)}><FolderOpen size={16} />选择目录</button>}
            </div></div>
          </div>
          {uploadPathMode === 'device' && uploadStorage?.source === 'multiple' && <label className="mb-3 block text-sm">{uploadTexts.adminUploadChooseExisting}
            <select className={`${inputClass} mt-1 font-mono text-xs`} aria-label={uploadTexts.adminUploadChooseExisting} disabled={busy}
              value={uploadStorage.directories.includes(uploadExistingPrefix) ? uploadExistingPrefix : ''} onChange={(event) => setUploadExistingPrefix(event.target.value)}>
              <option value="">{uploadTexts.adminUploadChooseExisting}</option>
              {uploadStorage.directories.map((path) => <option key={path} value={path}>{path}</option>)}
            </select>
            <span className="mt-1 block text-xs text-amber-800">{uploadTexts.adminUploadMultipleDirectories}</span>
          </label>}
          {uploadStorageLoading && <p role="status" className="mb-3 text-xs text-[#66746b]">{uploadTexts.adminUploadLoadingDirectory}</p>}
          {currentUploadDirectory?.error && <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 text-sm text-red-700">
            <span>{currentUploadDirectory.error}</span><button className={buttonClass} disabled={busy} onClick={() => setUploadDirectoryRevision((value) => value + 1)}><RefreshCw size={16} />{uploadTexts.adminUploadRetryDirectory}</button>
          </div>}
          <p id="r2-path-help" className={`mb-4 break-all text-xs leading-5 ${uploadStoragePathError && uploadR2Prefix ? 'text-red-700' : 'text-[#66746b]'}`}>{uploadStoragePathError && uploadR2Prefix ? uploadStoragePathError : (uploadStoragePath ? `原图：${uploadStoragePath}/origin/ · 预览：${uploadStoragePath}/compress/` : '使用设备默认目录，或点击“选择目录”浏览 R2 已有目录。')}
            {uploadPathMode === 'device' && uploadStorage?.source === 'existing' && <span className="block">{uploadTexts.adminUploadExistingHint}</span>}</p>
          {selectedUploadDevice && uploadStorage?.source === 'default' && <p role="status" className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {uploadTexts.adminUploadDefaultHint.replace('{name}', selectedUploadDevice.device_name)
              .replace('{type}', uploadMedia === 'dynamic' ? uploadTexts.adminUploadDynamicLabel : uploadTexts.adminUploadStaticLabel)
              .replace('{action}', createUploadCollectionLabel)}
          </p>}
          {uploadBrand && !uploadDevicesLoading && uploadDevices.length === 0 && !creatingUploadDevice &&
            <p className="mb-4 text-sm text-gray-600">当前品牌没有设备或系统</p>}
          {creatingUploadDevice && <form onSubmit={createUploadDevice} className="mb-4 grid gap-3 border-y border-gray-200 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] sm:items-end">
            <div className="text-sm"><label>名称
              <input className={`${inputClass} mt-1`} required maxLength={200} value={newUploadDeviceName}
                onChange={(event) => setNewUploadDeviceName(event.target.value)} placeholder="设备或系统名称" /></label>
              <DeviceNameFeedback brand={uploadBrand} name={newUploadDeviceName} />
            </div>
            <label className="text-sm">类型
              <select className={`${inputClass} mt-1`} value={newUploadCategory}
                onChange={(event) => setNewUploadCategory(event.target.value as DeviceRow['device_category'])}>
                {categories.filter((value) => (value === 'desktop') === uploadBrandIsDesktop)
                  .map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
              </select>
            </label>
            <label className="text-sm">发布日期（必填）
              <input className={`${inputClass} mt-1`} required value={newUploadDate} maxLength={20}
                onChange={(event) => setNewUploadDate(event.target.value)} placeholder="2021/09/22 或 2021年9月22日" />
            </label>
            <div className="flex gap-2">
              <button className={primaryClass} disabled={busy}><Check size={16} />创建并选中</button>
              <button type="button" className={buttonClass} title="取消新增" onClick={() => setCreatingUploadDevice(false)}><X size={16} /></button>
            </div>
          </form>}
          <label className="block max-w-sm text-sm">批量标签
            <input className={`${inputClass} mt-1`} value={batchTags} onChange={(event) => setBatchTags(event.target.value)} placeholder="以逗号分隔" />
          </label>
          </div>
          <div className="mb-5 rounded-lg border border-dashed border-[#bdccbf] bg-[#edf2eb]/60 p-4 sm:p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34433b]"><span className="flex h-6 w-6 items-center justify-center rounded bg-[#dfe9de] text-xs text-[#526950]">2</span>选择文件</h3>
          <p className="mb-4 text-xs leading-5 text-[#66746b]">{uploadMedia === 'dynamic' ? uploadTexts.adminUploadDynamicFilesHelp : uploadTexts.adminUploadStaticFilesHelp}</p>
          <div className="flex flex-wrap gap-2">
            <label className={`${buttonClass} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#247560] ${!uploadDevice || busy || folderTargetLocked ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />{uploadMedia === 'dynamic' ? uploadTexts.adminUploadDynamicOriginal : uploadTexts.adminUploadStaticOriginal}<input className="sr-only" type="file" multiple accept={uploadMedia === 'dynamic' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif,image/gif'} disabled={!uploadDevice || busy || folderTargetLocked} onChange={(event) => addFiles(event, 'origin')} /></label>
            <label className={`${buttonClass} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#247560] ${!uploadDevice || busy || folderTargetLocked ? 'cursor-not-allowed opacity-50' : ''}`}><ImagePlus size={16} />{uploadTexts.adminUploadCover}<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={!uploadDevice || busy || folderTargetLocked} onChange={(event) => addFiles(event, 'compress')} /></label>
            <label className={`${buttonClass} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#247560] ${!uploadBrand || busy || uploadFolderState === 'checking' ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />选择文件夹<input className="sr-only" type="file" multiple {...{ webkitdirectory: '' }} disabled={!uploadBrand || busy || uploadFolderState === 'checking'} onChange={(event) => addFiles(event)} /></label>
          </div>
          {uploadFolderName && <div className="mt-4 border-t border-[#d4dfd3] pt-4">
            {uploadFolderState === 'checking' && <p role="status" className="text-sm text-[#66746b]">正在检查设备：{uploadFolderName}…</p>}
            {inferredExistingDevice && <div role="status" className="flex items-start gap-2 text-sm text-[#247560]"><Check size={18} className="mt-0.5 shrink-0" /><div>已选中设备：<span className="font-semibold">{inferredExistingDevice.device_name}</span><div className="mt-1 text-xs text-[#66746b]">{categoryLabels[inferredExistingDevice.device_category]} · {inferredExistingDevice.release_date || '无发布日期'}</div></div></div>}
            {uploadFolderState === 'missing' && <form onSubmit={(event) => createUploadDevice(event, uploadFolderName)}>
              <p role="status" className="mb-3 text-sm text-amber-800">当前品牌下未找到设备“{normalizeAdminDisplay(uploadFolderName)}”，请先创建设备再上传。</p>
              <DeviceNameFeedback brand={uploadBrand} name={uploadFolderName} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto] sm:items-end">
                <label className="text-sm">类型<select className={`${inputClass} mt-1`} disabled={busy} value={newUploadCategory} onChange={(event) => setNewUploadCategory(event.target.value as DeviceRow['device_category'])}>
                  {categories.filter((value) => (value === 'desktop') === uploadBrandIsDesktop).map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
                </select></label>
                <label className="text-sm">发布日期（必填）<input className={`${inputClass} mt-1`} required disabled={busy} value={newUploadDate} maxLength={20} onChange={(event) => setNewUploadDate(event.target.value)} placeholder="2021/09/22 或 2021年9月22日" /></label>
                <button className={primaryClass} disabled={busy}><Plus size={16} />{busy ? '创建中…' : '创建设备'}</button>
              </div>
            </form>}
            {uploadFolderState === 'error' && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-red-700">设备检查失败，请重试后再上传。</p><button className={buttonClass} disabled={busy} onClick={() => void checkUploadFolder(uploadFolderName)}><RefreshCw size={16} />重新检查</button></div>}
          </div>}
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#34433b]"><span className="flex h-6 w-6 items-center justify-center rounded bg-[#edf2eb] text-xs text-[#526950]">3</span>上传队列<span className="text-xs font-normal tabular-nums text-[#758278]">{uploadRows.length} 项</span></h3>
            <button className={primaryClass} disabled={busy || uploadDevicesLoading || uploadStorageLoading || !uploadStorage || !!uploadQueueError || !uploadBrand || !uploadDevice || !uploadStoragePath || !!uploadStoragePathError || (!!uploadFolderName && uploadFolderState !== 'matched') || !uploadRows.some((row) => row.state !== 'done')} onClick={() => void startUpload()}><UploadCloud size={16} />{busy ? '上传中…' : `开始上传${uploadRows.some((row) => row.state !== 'done') ? ` (${uploadRows.filter((row) => row.state !== 'done').length})` : ''}`}</button>
          </div>
          {uploadQueueError && <p role="alert" className="mb-3 text-sm text-red-700">{uploadQueueError}</p>}
          <div className="overflow-hidden rounded-lg border border-[#dfe6df] bg-white">
            {uploadRows.length === 0 && <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#758278]"><ImagePlus size={28} className="text-[#9aaba0]" /><span>暂无待上传文件</span><span className="text-xs">添加文件后，在这里检查名称、主题与标签</span></div>}
            {uploadRows.map((row) => <div key={row.id} className="grid gap-3 border-b border-[#ebefeb] p-4 last:border-b-0 sm:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_90px_90px_minmax(120px,1fr)_110px_40px] xl:items-center">
              <div className="min-w-0"><input className={inputClass} aria-label="壁纸名称" value={row.name} onChange={(event) => patchUpload(row.id, { name: event.target.value })} />
                <div className="mt-1 truncate text-xs text-gray-500">{row.origin?.name || '缺原图'} / {row.preview?.name || '缺预览'}</div>
                {row.origin && <div className="mt-1 text-xs font-medium text-[#247560]">{fileMime(row.origin).startsWith('video/') ? uploadTexts.adminUploadDynamicLabel : uploadTexts.adminUploadStaticLabel}</div>}</div>
              <select className={inputClass} aria-label="主题" value={row.theme} onChange={(event) => patchUpload(row.id, { theme: event.target.value })}>
                {['normal', 'dark', 'light'].map((value) => <option key={value} value={value}>{themeLabels[value]}</option>)}
              </select>
              <select className={inputClass} aria-label="壁纸分类" value={row.category} onChange={(event) => patchUpload(row.id, { category: event.target.value })}>
                <option value="">同设备</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
              </select>
              <input className={inputClass} aria-label="标签" value={row.tags} onChange={(event) => patchUpload(row.id, { tags: event.target.value })} placeholder="标签" />
              <div className={`text-xs ${row.state === 'failed' ? 'text-red-700' : row.state === 'done' ? 'text-emerald-700' : 'text-gray-600'}`}>{row.state === 'uploading' ? `${row.progress}%` : row.state === 'done' ? `已入库（${row.isPublished ? '已发布' : '草稿'}${row.isPrimary ? ' · 主图' : ''}）` : row.error || (row.origin && row.preview ? '待上传' : '文件未配齐')}{row.state === 'uploading' && <div className="mt-1 h-1 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-700" style={{ width: `${row.progress}%` }} /></div>}</div>
              <button className={iconButtonClass} title="移除" aria-label={`移除 ${row.name}`} disabled={row.state === 'uploading'} onClick={() => {
                const remaining = uploadRows.filter((item) => item.id !== row.id);
                setUploadRows(remaining);
                if (!remaining.length) { setUploadFolderName(''); setUploadFolderState('idle'); folderLookupId.current++; }
              }}><X size={15} /></button>
            </div>)}
          </div>
        </section>}
      </div>
      </div>

      {uploadPublication && <AdminDialog title="上传完成，是否直接发布？" onClose={() => { if (!busy) setUploadPublication(null); }}>
        <div className={modalClass}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">上传完成，是否直接发布？</h2>
            <button type="button" className={iconButtonClass} title="关闭" disabled={busy} onClick={() => setUploadPublication(null)}><X size={16} /></button></div>
          <p className="text-sm leading-6">已成功上传 {uploadPublication.count} 张壁纸到“{uploadPublication.device.device_name}”。是否直接发布该设备或系统及其草稿壁纸？</p>
          <p className="mt-2 text-xs leading-5 text-gray-600">发布后可在网站查看；选择“暂不发布”会保留草稿。</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => setUploadPublication(null)}>暂不发布</button>
            <button type="button" className={primaryClass} disabled={busy} onClick={() => void publishUploadedDevice()}><Check size={16} />{busy ? '发布中…' : '直接发布'}</button></div>
        </div>
      </AdminDialog>}

      {choosingR2Directory && <R2DirectoryDialog selected={uploadR2Prefix} onClose={() => setChoosingR2Directory(false)}
        onSelect={(path) => { setUploadR2Prefix(path); setChoosingR2Directory(false); }} />}

      {describingDevice && <DeviceI18nDialog key={`${describingDevice.device.id}:${describingDevice.media}:${describingDevice.language}`} device={describingDevice.device}
        initialLanguage={describingDevice.language} initialMedia={describingDevice.media || 'static'} onChanged={() => setI18nRevision((value) => value + 1)} onClose={() => setDescribingDevice(null)} />}

      {deletingWallpaper && <AdminDialog title="删除壁纸" onClose={() => { if (!busy) setDeletingWallpaper(null); }}>
        <form onSubmit={deleteWallpaper} className={modalClass}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">删除壁纸</h2><button type="button" className={iconButtonClass} title="关闭" disabled={busy} onClick={() => setDeletingWallpaper(null)}><X size={16} /></button></div>
          <p className="mb-1 text-sm font-semibold">{deletingWallpaper.name}</p><p className="mb-4 text-xs text-[#66746b]">{deletingWallpaper.brand_name} / {deletingWallpaper.device_name}</p>
          <p className="mb-4 text-sm leading-6 text-red-800">将永久删除后台记录以及以下 R2 文件，此操作无法撤销。</p>
          <dl className="space-y-3 rounded-md bg-[#f5f7f4] p-3 text-xs"><div><dt className="mb-1 text-[#66746b]">原图</dt><dd className="break-all font-mono">{deletingWallpaper.origin_key}</dd></div>{deletingWallpaper.compress_key && <div><dt className="mb-1 text-[#66746b]">预览图</dt><dd className="break-all font-mono">{deletingWallpaper.compress_key}</dd></div>}</dl>
          {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => setDeletingWallpaper(null)}>取消</button><button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}><Trash2 size={16} />{busy ? '删除中…' : '确认删除'}</button></div>
        </form>
      </AdminDialog>}

      {newBrand && <AdminDialog title="新增品牌" onClose={() => setNewBrand(null)}>
        <form onSubmit={createBrand} className={modalClass}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">新增品牌</h2>
            <button type="button" className={iconButtonClass} title="关闭" onClick={() => setNewBrand(null)}><X size={16} /></button></div>
          <div className="grid gap-3">
            <label className="text-sm">品牌名称<input required maxLength={80} className={`${inputClass} mt-1`} value={newBrand.title} onChange={(event) => setNewBrand((current) => current && {
              ...current, title: event.target.value,
              slug: current.slug === slugifyWallpaperName(current.title) ? slugifyWallpaperName(event.target.value) : current.slug,
            })} /></label>
            <label className="text-sm">URL 标识<input required maxLength={80} className={`${inputClass} mt-1`} value={newBrand.slug} onChange={(event) => setNewBrand({ ...newBrand, slug: event.target.value.toLowerCase() })} placeholder="example-brand" /></label>
            <label className="text-sm">品牌类型<select className={`${inputClass} mt-1`} value={newBrand.kind} onChange={(event) => setNewBrand({ ...newBrand, kind: event.target.value as AdminBrand['kind'] })}>
              <option value="mobile">手机与系统</option><option value="desktop">桌面</option>
            </select></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setNewBrand(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />{busy ? '保存中…' : '创建品牌'}</button></div>
        </form>
      </AdminDialog>}

      {editingDevice && <AdminDialog title={editingDevice.id ? '编辑设备' : '新建设备'} onClose={() => setEditingDevice(null)}>
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (editingDevice.id) {
            await api('devices', 'PATCH', { ...editingDevice,
              ...(editingDevice.status === 'published' ? { publish_drafts: publishDeviceDrafts } : {}),
            });
          } else if (!await createDevice({ ...editingDevice })) return;
          setEditingDevice(null);
        }); }} className={modalClass}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingDevice.id ? '编辑设备' : '新建设备'}</h2>
            <button type="button" className={iconButtonClass} title="关闭" onClick={() => setEditingDevice(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">品牌<select disabled={!!editingDevice.id} required className={`${inputClass} mt-1`} value={editingDevice.brand_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_name: event.target.value, device_category: defaultDeviceCategory(event.target.value, brands) })}>
              <option value="">选择品牌</option><BrandOptions brands={brands} />
            </select></label>
            <div className="text-sm"><label>设备名称<input required maxLength={200} className={`${inputClass} mt-1`} value={editingDevice.device_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_name: event.target.value })} /></label>
              {!editingDevice.id && <DeviceNameFeedback brand={editingDevice.brand_name || ''} name={editingDevice.device_name || ''} />}
            </div>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingDevice.device_category} onChange={(event) => setEditingDevice({ ...editingDevice, device_category: event.target.value as DeviceRow['device_category'] })}>{categories.filter((value) => (value === 'desktop') === editingDeviceIsDesktop)
              .map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}</select></label>
            <label className="text-sm">{editingDevice.id ? '发布日期' : '发布日期（必填）'}<input className={`${inputClass} mt-1`} required={!editingDevice.id} maxLength={20} value={editingDevice.release_date || ''} onChange={(event) => setEditingDevice({ ...editingDevice, release_date: event.target.value })} placeholder="2021/09/22 或 2021年9月22日" /></label>
            <label className="text-sm">Logo 路径<input className={`${inputClass} mt-1`} value={editingDevice.brand_logo || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_logo: event.target.value })} /></label>
            <label className="text-sm">宣传图 URL<input className={`${inputClass} mt-1`} value={editingDevice.device_splash_url || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_splash_url: event.target.value })} /></label>
            {editingDevice.id && <><label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingDevice.status} onChange={(event) => setEditingDevice({ ...editingDevice, status: event.target.value as DeviceRow['status'] })}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value as DeviceRow['status']]}</option>)}</select></label>
              <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingDevice.is_popular_brand} onChange={(event) => setEditingDevice({ ...editingDevice, is_popular_brand: event.target.checked ? 1 : 0 })} />热门品牌</label></>}
          </div>
          {editingDevice.id && deviceCheck && <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-600">
            壁纸 {deviceCheck.total} 张 · 已发布 {deviceCheck.published} · 待处理 {deviceCheck.pending} · 缺预览 {deviceCheck.missing_preview} · 主图 {deviceCheck.primary_count} · 已发布主图 {deviceCheck.published_primary}
          </div>}
          {editingDevice.id && editingDevice.status === 'published' && <div className="mt-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={publishDeviceDrafts} disabled={busy}
              onChange={(event) => setPublishDeviceDrafts(event.target.checked)} />一并发布草稿壁纸</label>
            <p className="mt-2 text-xs leading-5 text-gray-600">保存时核验并发布全部草稿壁纸，保留已选主图；已下架或正在删除的壁纸不参与发布。</p>
          </div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingDevice(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />{busy ? '保存中…' : '保存设备'}</button></div>
        </form>
      </AdminDialog>}

      {editingWallpaper && <AdminDialog title="编辑壁纸" onClose={() => setEditingWallpaper(null)}>
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await api('wallpapers', 'PATCH', { ...editingWallpaper,
            tags: typeof editingWallpaper.tags === 'string' ? editingWallpaper.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [] });
          setEditingWallpaper(null);
        }); }} className={modalClass}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">编辑壁纸</h2>
            <button type="button" className={iconButtonClass} title="关闭" onClick={() => setEditingWallpaper(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">名称<input required className={`${inputClass} mt-1`} value={editingWallpaper.name || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, name: event.target.value })} /></label>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingWallpaper.category} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, category: event.target.value as WallpaperRow['category'] })}>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}</select></label>
            <label className="text-sm">主题<select className={`${inputClass} mt-1`} value={editingWallpaper.theme} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, theme: event.target.value as WallpaperRow['theme'] })}>{['normal', 'dark', 'light'].map((value) => <option key={value} value={value}>{themeLabels[value]}</option>)}</select></label>
            <label className="text-sm sm:col-span-2">标签<input className={`${inputClass} mt-1`} value={editingWallpaper.tags || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, tags: event.target.value })} /></label>
            <label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingWallpaper.status} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, status: event.target.value as WallpaperRow['status'] })}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value as DeviceRow['status']]}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingWallpaper.is_primary} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, is_primary: event.target.checked ? 1 : 0 })} />主展示壁纸</label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingWallpaper(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />{busy ? '保存中…' : '保存壁纸'}</button></div>
        </form>
      </AdminDialog>}
    </main>
  );
}
