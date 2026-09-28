'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, ImagePlus, LogOut, Pencil, Plus, RefreshCw, UploadCloud, X } from 'lucide-react';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import type { DeviceRow, WallpaperRow } from '@/lib/wallpaper-db';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { getDesktopTabData, isDesktopWallpaperCategory } from '@/lib/desktop-data';

type WallpaperListRow = WallpaperRow & { brand_name: string; device_name: string };
type UploadRow = { id: string; name: string; origin?: File; preview?: File; theme: string; tags: string;
  category: string; state: 'ready' | 'uploading' | 'done' | 'failed'; progress: number; error?: string };
type DeviceCheck = { total: number; published: number; pending: number; missing_preview: number; published_primary: number };
type Tab = 'devices' | 'wallpapers' | 'upload';

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json', 'x-phwalls-admin': '1' }
      : method === 'GET' ? {} : { 'x-phwalls-admin': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || '请求失败');
  return result as T;
}

const inputClass = 'h-9 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-teal-600';
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 border border-gray-300 bg-white px-3 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50';
const primaryClass = 'inline-flex h-9 items-center justify-center gap-2 bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50';
const categories = ['phone', 'phone_fold', 'pad', 'desktop', 'os'];
const statuses = ['draft', 'published', 'unpublished'];
const PAGE_SIZE = 50;
const desktopBrands = getDesktopTabData().filter((tab) => isDesktopWallpaperCategory(tab.type));
const brandOptions = [...BRAND_CATEGORIES.map((brand) => brand.slug), ...desktopBrands.map((tab) => tab.type)];

function defaultDeviceCategory(brand: string): DeviceRow['device_category'] {
  if (brand === 'android' || brand === 'harmonyos') return 'os';
  if (brand === 'huawei-matepad') return 'pad';
  if (desktopBrands.some((tab) => tab.type === brand)) return 'desktop';
  return 'phone';
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

function putWithProgress(url: string, file: File, onProgress: (value: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', fileMime(file));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 上传失败 (${xhr.status})`));
    xhr.onerror = () => reject(new Error('R2 网络错误'));
    xhr.send(file);
  });
}

export default function AdminConsole() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [tab, setTab] = useState<Tab>('devices');
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [wallpapers, setWallpapers] = useState<WallpaperListRow[]>([]);
  const [devicePage, setDevicePage] = useState(0);
  const [wallpaperPage, setWallpaperPage] = useState(0);
  const [filters, setFilters] = useState({ brand: '', category: '', status: '', popular: '', device: '', theme: '', media: '', format: '' });
  const [editingDevice, setEditingDevice] = useState<Partial<DeviceRow> | null>(null);
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheck | null>(null);
  const [editingWallpaper, setEditingWallpaper] = useState<Partial<WallpaperRow> | null>(null);
  const [uploadBrand, setUploadBrand] = useState('');
  const [uploadDevices, setUploadDevices] = useState<DeviceRow[]>([]);
  const [uploadDevicesLoading, setUploadDevicesLoading] = useState(false);
  const [uploadDevice, setUploadDevice] = useState('');
  const [uploadSearch, setUploadSearch] = useState('');
  const [creatingUploadDevice, setCreatingUploadDevice] = useState(false);
  const [newUploadDeviceName, setNewUploadDeviceName] = useState('');
  const [newUploadCategory, setNewUploadCategory] = useState<DeviceRow['device_category']>('phone');
  const [newUploadDate, setNewUploadDate] = useState('');
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [batchTags, setBatchTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!authenticated) return;
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
      const [deviceResult, wallpaperResult] = await Promise.all([
        api<{ data: DeviceRow[] }>(`devices?${deviceQuery}`),
        api<{ data: WallpaperListRow[] }>(`wallpapers?${wallpaperQuery}`),
      ]);
      setDevices(deviceResult.data);
      setWallpapers(wallpaperResult.data);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '加载失败'); }
  }, [authenticated, filters]);

  useEffect(() => {
    void api<{ authenticated: boolean }>('session').then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { setDevicePage(0); setWallpaperPage(0); }, [filters]);
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
    if (!editingDevice?.id) { setDeviceCheck(null); return; }
    void api<{ data: DeviceCheck }>(`device-check?id=${encodeURIComponent(editingDevice.id)}`)
      .then((result) => setDeviceCheck(result.data)).catch(() => setDeviceCheck(null));
  }, [editingDevice?.id]);

  const run = async (operation: () => Promise<void>) => {
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

  const selectUploadBrand = (brand: string) => {
    setUploadBrand(brand);
    setUploadDevice('');
    setUploadDevices([]);
    setUploadSearch('');
    setCreatingUploadDevice(false);
    setNewUploadDeviceName('');
    setNewUploadCategory(defaultDeviceCategory(brand));
    setNewUploadDate('');
  };

  const createUploadDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const { data } = await api<{ data: DeviceRow }>('devices', 'POST', {
        brand_name: uploadBrand,
        device_name: newUploadDeviceName,
        device_category: newUploadCategory,
        release_date: newUploadDate,
      });
      setUploadDevices((current) => [data, ...current]);
      setUploadDevice(data.id);
      setUploadSearch('');
      setCreatingUploadDevice(false);
      setNewUploadDeviceName('');
      setNewUploadDate('');
    });
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>, explicitRole?: 'origin' | 'compress') => {
    const files = Array.from(event.target.files || []);
    setUploadRows((current) => {
      const next = [...current];
      for (const file of files) {
        const path = file.webkitRelativePath || file.name;
        const role = explicitRole || (/(^|\/)compress\//i.test(path) ? 'compress'
          : /(^|\/)origin\//i.test(path) ? 'origin' : null);
        if (!role) continue;
        const stem = fileStem(file);
        const id = path.replace(/\/(origin|compress)\/[^/]+$/i, `/${stem}`).replace(/\.[^.]+$/, '');
        let row = next.find((entry) => entry.id === id || (!file.webkitRelativePath && entry.name === stem));
        if (!row) {
          row = { id, name: stem, theme: 'normal', tags: batchTags, category: '', state: 'ready', progress: 0 };
          next.push(row);
        }
        row[role === 'origin' ? 'origin' : 'preview'] = file;
        row.state = 'ready';
      }
      return [...next];
    });
    event.target.value = '';
  };

  const patchUpload = (id: string, patch: Partial<UploadRow>) =>
    setUploadRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const uploadOne = async (row: UploadRow) => {
    if (!uploadDevice || !row.origin || !row.preview) {
      patchUpload(row.id, { state: 'failed', error: '请选择设备并提供原图和预览图' }); return;
    }
    patchUpload(row.id, { state: 'uploading', progress: 0, error: undefined });
    try {
      const mediaType = fileMime(row.origin).startsWith('video/') ? 'dynamic' : 'static';
      const authorize = async (file: File, role: string) => api<{ url: string; token: string }>('upload', 'POST', {
        action: 'authorize', device_id: uploadDevice, role, media_type: mediaType,
        size_bytes: file.size, mime_type: fileMime(file),
      });
      const [origin, preview] = await Promise.all([authorize(row.origin, 'origin'), authorize(row.preview, 'compress')]);
      await putWithProgress(origin.url, row.origin, (progress) => patchUpload(row.id, { progress: Math.round(progress / 2) }));
      await putWithProgress(preview.url, row.preview, (progress) => patchUpload(row.id, { progress: 50 + Math.round(progress / 2) }));
      await api('upload', 'POST', {
        action: 'complete', device_id: uploadDevice, name: row.name,
        origin_token: origin.token, preview_token: preview.token,
        theme: row.theme, category: row.category || undefined,
        tags: row.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      patchUpload(row.id, { state: 'done', progress: 100 });
    } catch (cause) {
      patchUpload(row.id, { state: 'failed', error: cause instanceof Error ? cause.message : '上传失败' });
    }
  };

  if (authenticated === null) return <main className="min-h-screen bg-gray-50 p-8" />;
  if (!authenticated) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form onSubmit={login} className="w-full max-w-sm border border-gray-200 bg-white p-7 shadow-sm">
        <div className="mb-6 text-xl font-semibold text-gray-900">PhWalls 管理</div>
        <label className="mb-1 block text-sm text-gray-700">账号</label>
        <input autoComplete="username" className={`${inputClass} mb-4`} value={username} onChange={(event) => setUsername(event.target.value)} />
        <label className="mb-1 block text-sm text-gray-700">密码</label>
        <input type="password" autoComplete="current-password" className={`${inputClass} mb-3`} value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="mb-5 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          记住登录状态（30 天）
        </label>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button className={`${primaryClass} w-full`} disabled={busy}>登录</button>
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">PhWalls 管理</h1>
          <div className="flex items-center gap-2">
            <button className={buttonClass} title="刷新" onClick={() => void reload()}><RefreshCw size={16} /></button>
            <button className={buttonClass} title="退出登录" onClick={() => void run(async () => {
              await api('logout', 'POST'); setAuthenticated(false);
            })}><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7">
        <nav className="mb-5 flex border-b border-gray-200" aria-label="管理视图">
          {([['devices', '设备'], ['wallpapers', '壁纸'], ['upload', '上传']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-5 py-3 text-sm ${tab === key ? 'border-teal-700 font-medium text-teal-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{label}</button>
          ))}
        </nav>
        {error && <div role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>}
        {tab !== 'upload' && <div className="mb-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <select className={inputClass} aria-label="品牌筛选" value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}>
            <option value="">全部品牌</option>
            <optgroup label="手机与系统">{BRAND_CATEGORIES.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.title}</option>)}</optgroup>
            <optgroup label="桌面">{desktopBrands.map((brand) => <option key={brand.type} value={brand.type}>{brand.title}</option>)}</optgroup>
          </select>
          <select className={inputClass} aria-label="分类筛选" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
            <option value="">全部分类</option>{categories.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select className={inputClass} aria-label="状态筛选" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">全部状态</option>{statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
          {tab === 'devices' && <select className={inputClass} aria-label="热门品牌筛选" value={filters.popular} onChange={(event) => setFilters({ ...filters, popular: event.target.value })}>
            <option value="">全部品牌</option><option value="1">热门品牌</option><option value="0">普通品牌</option>
          </select>}
          {tab === 'wallpapers' && <>
            <select className={inputClass} aria-label="设备筛选" value={filters.device} onChange={(event) => setFilters({ ...filters, device: event.target.value })}>
              <option value="">全部设备</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}
            </select>
            <select className={inputClass} aria-label="主题筛选" value={filters.theme} onChange={(event) => setFilters({ ...filters, theme: event.target.value })}>
              <option value="">全部主题</option>{['dark', 'light', 'normal'].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select className={inputClass} aria-label="媒体筛选" value={filters.media} onChange={(event) => setFilters({ ...filters, media: event.target.value })}>
              <option value="">全部媒体</option><option value="static">静态</option><option value="dynamic">动态</option>
            </select>
            <input className={inputClass} placeholder="格式" aria-label="格式筛选" value={filters.format} onChange={(event) => setFilters({ ...filters, format: event.target.value })} />
          </>}
        </div>}

        {tab === 'devices' && <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">设备 <span className="text-gray-500">{devices.length}</span></h2>
            <button className={primaryClass} onClick={() => setEditingDevice({ device_category: 'phone', status: 'draft', is_popular_brand: 0, release_date: '' })}>新建设备</button></div>
          <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600"><tr><th className="px-3 py-3">设备</th><th className="px-3 py-3">品牌</th><th className="px-3 py-3">分类</th><th className="px-3 py-3">状态</th><th className="px-3 py-3">发布日期</th><th className="px-3 py-3 text-right">操作</th></tr></thead>
            <tbody>{devices.slice(devicePage * PAGE_SIZE, (devicePage + 1) * PAGE_SIZE).map((device) => <tr key={device.id} className="border-t border-gray-100">
              <td className="px-3 py-3 font-medium">{device.device_name}</td><td className="px-3 py-3">{device.brand_name}{device.is_popular_brand ? ' ★' : ''}</td>
              <td className="px-3 py-3">{device.device_category}</td><td className="px-3 py-3">{device.status}</td><td className="px-3 py-3">{device.release_date || '—'}</td>
              <td className="px-3 py-3 text-right"><button className={buttonClass} title="编辑设备" onClick={() => setEditingDevice(device)}><Pencil size={15} /></button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
            <button className={buttonClass} title="上一页" disabled={devicePage === 0} onClick={() => setDevicePage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>{devicePage + 1} / {Math.max(1, Math.ceil(devices.length / PAGE_SIZE))}</span>
            <button className={buttonClass} title="下一页" disabled={(devicePage + 1) * PAGE_SIZE >= devices.length} onClick={() => setDevicePage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'wallpapers' && <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">壁纸 <span className="text-gray-500">{wallpapers.length}</span></h2>
            <button className={primaryClass} onClick={() => setTab('upload')}><ImagePlus size={16} />上传壁纸</button></div>
          <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600"><tr><th className="px-3 py-3">预览</th><th className="px-3 py-3">名称 / 设备</th><th className="px-3 py-3">分类</th><th className="px-3 py-3">主题</th><th className="px-3 py-3">格式</th><th className="px-3 py-3">状态</th><th className="px-3 py-3 text-right">操作</th></tr></thead>
            <tbody>{wallpapers.slice(wallpaperPage * PAGE_SIZE, (wallpaperPage + 1) * PAGE_SIZE).map((item) => <tr key={item.id} className="border-t border-gray-100">
              <td className="px-3 py-2"><div className="h-12 w-12 bg-gray-100">{item.compress_key && <img className="h-full w-full object-cover" alt="" src={buildPublicR2Url(item.compress_key) || ''} />}</div></td>
              <td className="px-3 py-2"><div className="font-medium">{item.name}{item.is_primary ? ' ★' : ''}</div><div className="text-xs text-gray-500">{item.brand_name} / {item.device_name}</div></td>
              <td className="px-3 py-2">{item.category}</td><td className="px-3 py-2">{item.theme}</td><td className="px-3 py-2">{item.file_format}</td><td className="px-3 py-2">{item.status}</td>
              <td className="px-3 py-2 text-right"><button className={buttonClass} title="编辑壁纸" onClick={() => setEditingWallpaper({ ...item, tags: (JSON.parse(item.tags) as string[]).join(', ') })}><Pencil size={15} /></button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
            <button className={buttonClass} title="上一页" disabled={wallpaperPage === 0} onClick={() => setWallpaperPage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>{wallpaperPage + 1} / {Math.max(1, Math.ceil(wallpapers.length / PAGE_SIZE))}</span>
            <button className={buttonClass} title="下一页" disabled={(wallpaperPage + 1) * PAGE_SIZE >= wallpapers.length} onClick={() => setWallpaperPage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'upload' && <section>
          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(160px,1fr)_minmax(220px,2fr)_auto] sm:items-end">
            <label className="text-sm">品牌
              <select className={`${inputClass} mt-1`} value={uploadBrand} disabled={busy} onChange={(event) => selectUploadBrand(event.target.value)}>
                <option value="">选择品牌</option>
                <optgroup label="手机与系统">{BRAND_CATEGORIES.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.title}</option>)}</optgroup>
                <optgroup label="桌面">{desktopBrands.map((brand) => <option key={brand.type} value={brand.type}>{brand.title}</option>)}</optgroup>
              </select>
            </label>
            <label className="text-sm">设备或系统
              <input className={`${inputClass} mt-1`} aria-label="搜索设备或系统" value={uploadSearch} disabled={!uploadBrand || busy}
                onChange={(event) => setUploadSearch(event.target.value)} placeholder="搜索当前品牌" />
              <select className={`${inputClass} mt-1`} aria-label="选择设备或系统" value={uploadDevice} disabled={!uploadBrand || uploadDevicesLoading || busy}
                onChange={(event) => setUploadDevice(event.target.value)}>
                <option value="">{uploadDevicesLoading ? '加载中' : '选择设备或系统'}</option>
                {uploadDevices.filter((device) => !uploadSearch || device.device_name.toLowerCase().includes(uploadSearch.toLowerCase()) || device.id === uploadDevice)
                  .map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}
              </select>
            </label>
            <button className={buttonClass} disabled={!uploadBrand || busy} onClick={() => setCreatingUploadDevice((current) => !current)}>
              <Plus size={16} />新增设备/系统
            </button>
          </div>
          {uploadBrand && !uploadDevicesLoading && uploadDevices.length === 0 && !creatingUploadDevice &&
            <p className="mb-4 text-sm text-gray-600">当前品牌没有设备或系统</p>}
          {creatingUploadDevice && <form onSubmit={createUploadDevice} className="mb-4 grid gap-3 border-y border-gray-200 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] sm:items-end">
            <label className="text-sm">名称
              <input className={`${inputClass} mt-1`} required maxLength={200} value={newUploadDeviceName}
                onChange={(event) => setNewUploadDeviceName(event.target.value)} placeholder="设备或系统名称" />
            </label>
            <label className="text-sm">类型
              <select className={`${inputClass} mt-1`} value={newUploadCategory}
                onChange={(event) => setNewUploadCategory(event.target.value as DeviceRow['device_category'])}>
                <option value="phone">手机</option><option value="phone_fold">折叠屏</option>
                <option value="pad">平板</option><option value="desktop">桌面</option><option value="os">系统</option>
              </select>
            </label>
            <label className="text-sm">发布日期
              <input className={`${inputClass} mt-1`} value={newUploadDate} maxLength={20}
                onChange={(event) => setNewUploadDate(event.target.value)} placeholder="YYYY/MM/DD" />
            </label>
            <div className="flex gap-2">
              <button className={primaryClass} disabled={busy}><Check size={16} />创建并选中</button>
              <button type="button" className={buttonClass} title="取消新增" onClick={() => setCreatingUploadDevice(false)}><X size={16} /></button>
            </div>
          </form>}
          <label className="mb-4 block max-w-sm text-sm">批量标签
            <input className={`${inputClass} mt-1`} value={batchTags} onChange={(event) => setBatchTags(event.target.value)} placeholder="以逗号分隔" />
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className={`${buttonClass} ${!uploadDevice || busy ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />原图文件<input className="sr-only" type="file" multiple accept="image/*,video/mp4,video/webm" disabled={!uploadDevice || busy} onChange={(event) => addFiles(event, 'origin')} /></label>
            <label className={`${buttonClass} ${!uploadDevice || busy ? 'cursor-not-allowed opacity-50' : ''}`}><ImagePlus size={16} />预览文件<input className="sr-only" type="file" multiple accept="image/*" disabled={!uploadDevice || busy} onChange={(event) => addFiles(event, 'compress')} /></label>
            <label className={`${buttonClass} ${!uploadDevice || busy ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />选择文件夹<input className="sr-only" type="file" multiple {...{ webkitdirectory: '' }} disabled={!uploadDevice || busy} onChange={(event) => addFiles(event)} /></label>
            <button className={primaryClass} disabled={busy || !uploadBrand || !uploadDevice || !uploadRows.some((row) => row.state !== 'done')} onClick={() => void run(async () => {
              for (const row of uploadRows.filter((item) => item.state !== 'done')) await uploadOne(row);
            })}><UploadCloud size={16} />上传队列</button>
          </div>
          <div className="border border-gray-200 bg-white">
            {uploadRows.map((row) => <div key={row.id} className="grid gap-2 border-b border-gray-100 p-3 sm:grid-cols-[minmax(160px,1fr)_110px_110px_minmax(130px,1fr)_110px_40px] sm:items-center">
              <div className="min-w-0"><input className={inputClass} aria-label="壁纸名称" value={row.name} onChange={(event) => patchUpload(row.id, { name: event.target.value })} />
                <div className="mt-1 truncate text-xs text-gray-500">{row.origin?.name || '缺原图'} / {row.preview?.name || '缺预览'}</div></div>
              <select className={inputClass} aria-label="主题" value={row.theme} onChange={(event) => patchUpload(row.id, { theme: event.target.value })}>
                {['normal', 'dark', 'light'].map((value) => <option key={value}>{value}</option>)}
              </select>
              <select className={inputClass} aria-label="壁纸分类" value={row.category} onChange={(event) => patchUpload(row.id, { category: event.target.value })}>
                <option value="">同设备</option>{categories.map((value) => <option key={value}>{value}</option>)}
              </select>
              <input className={inputClass} aria-label="标签" value={row.tags} onChange={(event) => patchUpload(row.id, { tags: event.target.value })} placeholder="标签" />
              <div className="text-xs text-gray-600">{row.state === 'uploading' ? `${row.progress}%` : row.state === 'done' ? '已入库（草稿）' : row.error || '待上传'}</div>
              <button className={buttonClass} title="移除" onClick={() => setUploadRows((current) => current.filter((item) => item.id !== row.id))}><X size={15} /></button>
            </div>)}
          </div>
        </section>}
      </div>

      {editingDevice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await api('devices', editingDevice.id ? 'PATCH' : 'POST', editingDevice);
          setEditingDevice(null);
        }); }} className="w-full max-w-lg bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingDevice.id ? '编辑设备' : '新建设备'}</h2>
            <button type="button" className={buttonClass} title="关闭" onClick={() => setEditingDevice(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">品牌<select disabled={!!editingDevice.id} required className={`${inputClass} mt-1`} value={editingDevice.brand_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_name: event.target.value })}>
              <option value="">选择品牌</option>{brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select></label>
            <label className="text-sm">设备名称<input required className={`${inputClass} mt-1`} value={editingDevice.device_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_name: event.target.value })} /></label>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingDevice.device_category} onChange={(event) => setEditingDevice({ ...editingDevice, device_category: event.target.value as DeviceRow['device_category'] })}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-sm">发布日期<input className={`${inputClass} mt-1`} value={editingDevice.release_date || ''} onChange={(event) => setEditingDevice({ ...editingDevice, release_date: event.target.value })} placeholder="YYYY/MM/DD" /></label>
            <label className="text-sm">Logo 路径<input className={`${inputClass} mt-1`} value={editingDevice.brand_logo || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_logo: event.target.value })} /></label>
            <label className="text-sm">宣传图 URL<input className={`${inputClass} mt-1`} value={editingDevice.device_splash_url || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_splash_url: event.target.value })} /></label>
            {editingDevice.id && <><label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingDevice.status} onChange={(event) => setEditingDevice({ ...editingDevice, status: event.target.value as DeviceRow['status'] })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingDevice.is_popular_brand} onChange={(event) => setEditingDevice({ ...editingDevice, is_popular_brand: event.target.checked ? 1 : 0 })} />热门品牌</label></>}
          </div>
          {editingDevice.id && deviceCheck && <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-600">
            壁纸 {deviceCheck.total} 张 · 已发布 {deviceCheck.published} · 待处理 {deviceCheck.pending} · 缺预览 {deviceCheck.missing_preview} · 已发布主图 {deviceCheck.published_primary}
          </div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingDevice(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />保存</button></div>
        </form>
      </div>}

      {editingWallpaper && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await api('wallpapers', 'PATCH', { ...editingWallpaper,
            tags: typeof editingWallpaper.tags === 'string' ? editingWallpaper.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [] });
          setEditingWallpaper(null);
        }); }} className="w-full max-w-lg bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">编辑壁纸</h2>
            <button type="button" className={buttonClass} title="关闭" onClick={() => setEditingWallpaper(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">名称<input required className={`${inputClass} mt-1`} value={editingWallpaper.name || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, name: event.target.value })} /></label>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingWallpaper.category} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, category: event.target.value as WallpaperRow['category'] })}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-sm">主题<select className={`${inputClass} mt-1`} value={editingWallpaper.theme} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, theme: event.target.value as WallpaperRow['theme'] })}>{['normal', 'dark', 'light'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-sm sm:col-span-2">标签<input className={`${inputClass} mt-1`} value={editingWallpaper.tags || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, tags: event.target.value })} /></label>
            <label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingWallpaper.status} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, status: event.target.value as WallpaperRow['status'] })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingWallpaper.is_primary} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, is_primary: event.target.checked ? 1 : 0 })} />主展示壁纸</label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingWallpaper(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />保存</button></div>
        </form>
      </div>}
    </main>
  );
}
