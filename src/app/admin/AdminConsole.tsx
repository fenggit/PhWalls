'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Images, LogOut, Pencil, Plus, RefreshCw, Search, Smartphone, Tags, UploadCloud, X } from 'lucide-react';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import type { DeviceRow, WallpaperRow } from '@/lib/wallpaper-db';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';

type WallpaperListRow = WallpaperRow & { brand_name: string; device_name: string };
type AdminBrand = { slug: string; title: string; kind: 'mobile' | 'desktop'; source: 'builtin' | 'custom' };
type UploadRow = { id: string; name: string; origin?: File; preview?: File; theme: string; tags: string;
  category: string; folderName?: string; state: 'ready' | 'uploading' | 'done' | 'failed'; progress: number; error?: string };
type DeviceCheck = { total: number; published: number; pending: number; missing_preview: number; published_primary: number };
type Tab = 'brands' | 'devices' | 'wallpapers' | 'upload';

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json', 'x-phwalls-admin': '1' }
      : method === 'GET' ? {} : { 'x-phwalls-admin': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error || `服务暂不可用 (${response.status})`);
  if (!result) throw new Error('服务返回了无法识别的数据');
  return result as T;
}

const inputClass = 'h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50';
const categories = ['phone', 'phone_fold', 'pad', 'desktop', 'os'];
const statuses = ['draft', 'published', 'unpublished'];
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
  const [newBrand, setNewBrand] = useState<{ title: string; slug: string; kind: AdminBrand['kind'] } | null>(null);
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
  const [uploadFolderName, setUploadFolderName] = useState('');
  const [batchTags, setBatchTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loadId = useRef(0);

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

  const selectUploadBrand = (brand: string): boolean => {
    if (brand === uploadBrand) return true;
    if (uploadRows.length && !window.confirm('切换品牌将清空待上传文件，继续吗？')) return false;
    setUploadBrand(brand);
    setUploadDevice('');
    setUploadDevices([]);
    setUploadRows([]);
    setUploadFolderName('');
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
        setNewUploadCategory(data.kind === 'desktop' ? 'desktop' : 'phone');
        setNewUploadDate('');
      }
      setNewBrand(null);
    });
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
    const folderRoot = !explicitRole && files.length ? files[0].webkitRelativePath.split('/')[0] : '';
    const roleFiles = !explicitRole ? files.filter((file) => /(^|\/)(origin|compress)\//i.test(file.webkitRelativePath)) : [];
    if (!explicitRole && !uploadDevice && files.length &&
        (!folderRoot || /^(origin|compress)$/i.test(folderRoot) ||
         files.some((file) => file.webkitRelativePath.split('/')[0] !== folderRoot))) {
      setError('请选择包含 origin 和 compress 子目录的设备或系统文件夹');
      event.target.value = '';
      return;
    }
    if (!explicitRole && !uploadDevice && roleFiles.some((file) => {
      const parts = file.webkitRelativePath.split('/');
      return parts.length !== 3 || parts[0] !== folderRoot || !/^(origin|compress)$/i.test(parts[1]);
    })) {
      setError('文件夹内的原图和预览图须直接放在 origin 与 compress 子目录');
      event.target.value = '';
      return;
    }
    if (!explicitRole && !uploadDevice && uploadFolderName && uploadFolderName !== folderRoot &&
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
    if (!explicitRole && !uploadDevice && folderRoot) setUploadFolderName(folderRoot);
    setError('');
    setUploadRows((current) => {
      const next = current.length && current.every((row) => row.state === 'done') ? [] : [...current];
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
        row.state = 'ready';
        row.error = undefined;
      }
      return [...next];
    });
    event.target.value = '';
  };

  const patchUpload = (id: string, patch: Partial<UploadRow>) =>
    setUploadRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const ensureUploadDevice = async (): Promise<string> => {
    if (uploadDevice) return uploadDevice;
    const name = uploadFolderName.trim();
    if (!name) throw new Error('请选择设备或系统，或上传对应文件夹');
    const existing = uploadDevices.find((device) => device.brand_name === uploadBrand &&
      device.device_name === name);
    if (existing) return existing.id;
    if (uploadDevices.some((device) => device.brand_name === uploadBrand &&
        device.device_name.toLowerCase() === name.toLowerCase())) {
      throw new Error('存在大小写不同的同名设备，请明确选择设备或系统');
    }
    const { data } = await api<{ data: DeviceRow }>('devices', 'POST', {
      brand_name: uploadBrand, device_name: name, device_category: newUploadCategory, release_date: newUploadDate,
    });
    setUploadDevices((current) => [data, ...current]);
    return data.id;
  };

  const uploadOne = async (row: UploadRow, deviceId: string) => {
    if (!row.origin || !row.preview) {
      patchUpload(row.id, { state: 'failed', error: '原图和预览图未配齐' }); return;
    }
    patchUpload(row.id, { state: 'uploading', progress: 0, error: undefined });
    try {
      const mediaType = fileMime(row.origin).startsWith('video/') ? 'dynamic' : 'static';
      const authorize = async (file: File, role: string) => api<{ url: string; token: string }>('upload', 'POST', {
        action: 'authorize', device_id: deviceId, role, media_type: mediaType,
        size_bytes: file.size, mime_type: fileMime(file),
      });
      const [origin, preview] = await Promise.all([authorize(row.origin, 'origin'), authorize(row.preview, 'compress')]);
      await putWithProgress(origin.url, row.origin, (progress) => patchUpload(row.id, { progress: Math.round(progress / 2) }));
      await putWithProgress(preview.url, row.preview, (progress) => patchUpload(row.id, { progress: 50 + Math.round(progress / 2) }));
      await api('upload', 'POST', {
        action: 'complete', device_id: deviceId, name: row.name,
        origin_token: origin.token, preview_token: preview.token,
        theme: row.theme, category: row.category || undefined,
        tags: row.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      patchUpload(row.id, { state: 'done', progress: 100 });
    } catch (cause) {
      patchUpload(row.id, { state: 'failed', error: cause instanceof Error ? cause.message : '上传失败' });
    }
  };

  const visibleDevices = devices.filter((device) => !searchInput ||
    `${device.device_name} ${device.brand_name}`.toLowerCase().includes(searchInput.toLowerCase()));
  const uploadBrandIsDesktop = brands.some((brand) => brand.slug === uploadBrand && brand.kind === 'desktop');
  const inferredExistingDevice = !uploadDevice && uploadFolderName
    ? uploadDevices.find((device) => device.brand_name === uploadBrand && device.device_name === uploadFolderName.trim())
    : null;
  const hasCaseVariant = !uploadDevice && !inferredExistingDevice && Boolean(uploadFolderName) &&
    uploadDevices.some((device) => device.brand_name === uploadBrand &&
      device.device_name.toLowerCase() === uploadFolderName.trim().toLowerCase());
  const editingDeviceIsDesktop = brands.some((brand) => brand.slug === editingDevice?.brand_name && brand.kind === 'desktop');
  const changeFilters = (patch: Partial<typeof filters>) => {
    setDevicePage(0);
    setWallpaperPage(0);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const resetFilters = () => { setDevicePage(0); setWallpaperPage(0); setFilters({ ...emptyFilters }); setSearchInput(''); };

  if (authenticated === null) return <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">正在检查登录状态…</main>;
  if (!authenticated) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form onSubmit={login} className="w-full max-w-sm rounded-md border border-gray-200 bg-white p-7 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-teal-800">PhWalls</div>
        <h1 className="mb-6 text-xl font-semibold text-gray-950">登录内容管理后台</h1>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="admin-username">账号</label>
        <input id="admin-username" autoComplete="username" className={`${inputClass} mb-4`} value={username} onChange={(event) => setUsername(event.target.value)} />
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="admin-password">密码</label>
        <input id="admin-password" type="password" autoComplete="current-password" className={`${inputClass} mb-3`} value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="mb-5 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          记住登录状态（30 天）
        </label>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button className={`${primaryClass} w-full`} disabled={busy}>{busy ? '登录中…' : '登录'}</button>
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-gray-900">
      <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-800 text-sm font-bold text-white">P</div>
            <div className="min-w-0"><h1 className="truncate text-base font-semibold text-gray-950">PhWalls</h1><p className="text-xs text-gray-500">内容管理</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 sm:inline-flex">{process.env.NODE_ENV === 'development' ? '本地数据' : '线上数据'}</span>
            <a className={buttonClass} href={process.env.NODE_ENV === 'development' ? '/' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com')} target="_blank" rel="noopener noreferrer" title="打开网站"><ExternalLink size={16} /><span className="hidden sm:inline">查看网站</span></a>
            <button className={buttonClass} title="刷新数据" aria-label="刷新数据" disabled={loading} onClick={() => void reload()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button className={buttonClass} title="退出登录" aria-label="退出登录" onClick={() => void run(async () => {
              await api('logout', 'POST'); setAuthenticated(false);
            })}><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7">
        <nav className="mb-6 flex gap-1 border-b border-gray-200" aria-label="管理视图">
          {([['brands', '品牌', Tags], ['devices', '设备', Smartphone], ['wallpapers', '壁纸', Images], ['upload', '上传', UploadCloud]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`inline-flex h-11 items-center gap-2 border-b-2 px-4 text-sm ${tab === key ? 'border-teal-700 font-semibold text-teal-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}><Icon size={16} />{label}</button>
          ))}
        </nav>
        {error && <div role="alert" className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span className="flex-1">{error}</span><button className="font-medium underline" onClick={() => void reload()}>重试</button></div>}
        {(tab === 'devices' || tab === 'wallpapers') && <div className="mb-5 border-y border-gray-200 bg-white py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 text-gray-500" size={16} /><input className={`${inputClass} pl-9`} placeholder={tab === 'devices' ? '搜索设备或品牌' : '搜索壁纸或设备'} aria-label="搜索内容" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
            {(searchInput || Object.entries(filters).some(([key, value]) => key !== 'search' && value)) && <button className={buttonClass} onClick={resetFilters}><X size={15} />清除筛选</button>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
            <option value="">全部品牌</option><option value="1">热门品牌</option><option value="0">普通品牌</option>
          </select>}
          {tab === 'wallpapers' && <>
            <select className={inputClass} aria-label="设备筛选" value={filters.device} onChange={(event) => changeFilters({ device: event.target.value })}>
              <option value="">全部设备</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_name}</option>)}
            </select>
            <select className={inputClass} aria-label="主题筛选" value={filters.theme} onChange={(event) => changeFilters({ theme: event.target.value })}>
              <option value="">全部主题</option>{['dark', 'light', 'normal'].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select className={inputClass} aria-label="媒体筛选" value={filters.media} onChange={(event) => changeFilters({ media: event.target.value })}>
              <option value="">全部媒体</option><option value="static">静态</option><option value="dynamic">动态</option>
            </select>
            <input className={inputClass} placeholder="格式" aria-label="格式筛选" value={filters.format} onChange={(event) => changeFilters({ format: event.target.value })} />
          </>}
          </div>
        </div>}

        {tab === 'brands' && <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">品牌目录</h2><p className="text-sm text-gray-600">{brands.length} 个品牌</p></div>
            <button className={primaryClass} onClick={() => setNewBrand({ title: '', slug: '', kind: 'mobile' })}><Plus size={16} />新增品牌</button></div>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white" aria-busy={loading}><table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-600"><tr><th className="px-4 py-3">品牌</th><th className="px-4 py-3">标识</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">来源</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">正在加载品牌…</td></tr> : brands.map((brand) => <tr key={brand.slug} className="border-t border-gray-100 hover:bg-gray-50/70">
              <td className="px-4 py-3 font-medium text-gray-950">{brand.title}</td><td className="px-4 py-3 text-gray-600">{brand.slug}</td><td className="px-4 py-3 text-gray-600">{brand.kind === 'desktop' ? '桌面' : '手机与系统'}</td><td className="px-4 py-3 text-gray-600">{brand.source === 'builtin' ? '预置' : '后台新增'}</td>
              <td className="px-4 py-3 text-right"><button className={buttonClass} title="上传到此品牌" aria-label={`上传到 ${brand.title}`} onClick={() => { if (selectUploadBrand(brand.slug)) setTab('upload'); }}><UploadCloud size={15} /></button></td>
            </tr>)}</tbody>
          </table></div>
        </section>}

        {tab === 'devices' && <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">设备目录</h2><p className="text-sm text-gray-600">{visibleDevices.length} 个设备</p></div>
            <button className={primaryClass} onClick={() => setEditingDevice({ device_category: 'phone', status: 'draft', is_popular_brand: 0, release_date: '' })}><Plus size={16} />新建设备</button></div>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white" aria-busy={loading}><table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-600"><tr><th className="px-4 py-3">设备</th><th className="px-4 py-3">品牌</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">发布日期</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">正在加载设备…</td></tr> : visibleDevices.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">没有符合条件的设备</td></tr> : visibleDevices.slice(devicePage * PAGE_SIZE, (devicePage + 1) * PAGE_SIZE).map((device) => <tr key={device.id} className="border-t border-gray-100 hover:bg-gray-50/70">
              <td className="px-4 py-3 font-medium text-gray-950">{device.device_name}</td><td className="px-4 py-3">{device.brand_name}{device.is_popular_brand ? <span className="ml-2 text-xs text-amber-700">热门</span> : null}</td>
              <td className="px-4 py-3 text-gray-600">{categoryLabels[device.device_category]}</td><td className="px-4 py-3"><span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${statusClasses[device.status]}`}>{statusLabels[device.status]}</span></td><td className="px-4 py-3 text-gray-600">{device.release_date || '—'}</td>
              <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button className={buttonClass} title="查看该设备的壁纸" aria-label={`查看 ${device.device_name} 的壁纸`} onClick={() => { setSearchInput(''); setFilters({ ...emptyFilters, brand: device.brand_name, device: device.id }); setDevicePage(0); setWallpaperPage(0); setTab('wallpapers'); }}><Images size={15} /></button><button className={buttonClass} title="编辑设备" aria-label={`编辑 ${device.device_name}`} onClick={() => setEditingDevice(device)}><Pencil size={15} /></button></div></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
            <button className={buttonClass} title="上一页" aria-label="上一页设备" disabled={devicePage === 0 || loading} onClick={() => setDevicePage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>第 {devicePage + 1} / {Math.max(1, Math.ceil(visibleDevices.length / PAGE_SIZE))} 页</span>
            <button className={buttonClass} title="下一页" aria-label="下一页设备" disabled={(devicePage + 1) * PAGE_SIZE >= visibleDevices.length || loading} onClick={() => setDevicePage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'wallpapers' && <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">壁纸目录</h2><p className="text-sm text-gray-600">{wallpaperTotal} 张壁纸</p></div>
            <button className={primaryClass} onClick={() => setTab('upload')}><ImagePlus size={16} />上传壁纸</button></div>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white" aria-busy={loading}><table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-600"><tr><th className="px-4 py-3">预览</th><th className="px-4 py-3">名称 / 设备</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">主题</th><th className="px-4 py-3">格式</th><th className="px-4 py-3">状态</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">正在加载壁纸…</td></tr> : wallpapers.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">没有符合条件的壁纸</td></tr> : wallpapers.map((item) => <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50/70">
              <td className="px-4 py-2"><div className="h-12 w-12 overflow-hidden rounded border border-gray-200 bg-gray-100">{item.compress_key && <img className="h-full w-full object-cover" alt="" src={buildPublicR2Url(item.compress_key) || ''} />}</div></td>
              <td className="px-4 py-2"><div className="font-medium text-gray-950">{item.name}{item.is_primary ? <span className="ml-2 text-xs text-teal-700">主图</span> : null}</div><div className="text-xs text-gray-500">{item.brand_name} / {item.device_name}</div></td>
              <td className="px-4 py-2 text-gray-600">{categoryLabels[item.category]}</td><td className="px-4 py-2 text-gray-600">{item.theme}</td><td className="px-4 py-2 uppercase text-gray-600">{item.file_format}</td><td className="px-4 py-2"><span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${statusClasses[item.status]}`}>{statusLabels[item.status]}</span></td>
              <td className="px-4 py-2 text-right"><button className={buttonClass} title="编辑壁纸" aria-label={`编辑 ${item.name}`} onClick={() => setEditingWallpaper({ ...item, tags: (JSON.parse(item.tags) as string[]).join(', ') })}><Pencil size={15} /></button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
            <button className={buttonClass} title="上一页" aria-label="上一页壁纸" disabled={wallpaperPage === 0 || loading} onClick={() => setWallpaperPage((page) => page - 1)}><ChevronLeft size={16} /></button>
            <span>第 {wallpaperPage + 1} / {Math.max(1, Math.ceil(wallpaperTotal / PAGE_SIZE))} 页</span>
            <button className={buttonClass} title="下一页" aria-label="下一页壁纸" disabled={(wallpaperPage + 1) * PAGE_SIZE >= wallpaperTotal || loading} onClick={() => setWallpaperPage((page) => page + 1)}><ChevronRight size={16} /></button>
          </div>
        </section>}

        {tab === 'upload' && <section>
          <div className="mb-5"><h2 className="text-lg font-semibold text-gray-950">上传壁纸</h2><p className="text-sm text-gray-600">{uploadRows.length} 项文件，{uploadRows.filter((row) => row.state === 'done').length} 项已入库</p></div>
          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(160px,1fr)_minmax(220px,2fr)_auto] sm:items-end">
            <label className="text-sm">品牌
              <div className="mt-1 flex gap-2"><select className={inputClass} value={uploadBrand} disabled={busy} onChange={(event) => selectUploadBrand(event.target.value)}>
                <option value="">选择品牌</option><BrandOptions brands={brands} />
              </select><button type="button" className={buttonClass} title="新增品牌" aria-label="新增品牌" onClick={() => setNewBrand({ title: '', slug: '', kind: 'mobile' })}><Plus size={16} /></button></div>
            </label>
            <label className="text-sm">设备或系统
              <input className={`${inputClass} mt-1`} aria-label="搜索设备或系统" value={uploadSearch} disabled={!uploadBrand || busy}
                onChange={(event) => setUploadSearch(event.target.value)} placeholder="搜索当前品牌" />
              <select className={`${inputClass} mt-1`} aria-label="选择设备或系统" value={uploadDevice} disabled={!uploadBrand || uploadDevicesLoading || busy}
                onChange={(event) => setUploadDevice(event.target.value)}>
                <option value="">{uploadDevicesLoading ? '加载中' : '不选设备或系统'}</option>
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
                {categories.filter((value) => (value === 'desktop') === uploadBrandIsDesktop)
                  .map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
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
          {!uploadDevice && uploadFolderName && <div className="mb-4 grid gap-3 border-y border-gray-200 py-4 sm:grid-cols-[minmax(180px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)] sm:items-end">
            <div className="text-sm"><div className="text-gray-600">{inferredExistingDevice ? '使用现有设备或系统' : '将创建草稿设备或系统'}</div><div className="mt-1 flex h-10 items-center font-medium text-gray-950">{uploadFolderName}</div></div>
            {hasCaseVariant ? <p className="text-sm text-red-700 sm:col-span-2">存在大小写不同的同名设备，请在上方明确选择设备或系统</p> : inferredExistingDevice ? <div className="text-sm text-gray-600">{categoryLabels[inferredExistingDevice.device_category]} · {inferredExistingDevice.release_date || '无发布日期'}</div> : <><label className="text-sm">类型<select className={`${inputClass} mt-1`} value={newUploadCategory} onChange={(event) => setNewUploadCategory(event.target.value as DeviceRow['device_category'])}>
              {categories.filter((value) => (value === 'desktop') === uploadBrandIsDesktop)
                .map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
            </select></label>
            <label className="text-sm">发布日期<input className={`${inputClass} mt-1`} value={newUploadDate} maxLength={20} onChange={(event) => setNewUploadDate(event.target.value)} placeholder="YYYY/MM/DD" /></label></>}
          </div>}
          <label className="mb-4 block max-w-sm text-sm">批量标签
            <input className={`${inputClass} mt-1`} value={batchTags} onChange={(event) => setBatchTags(event.target.value)} placeholder="以逗号分隔" />
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className={`${buttonClass} ${!uploadDevice || busy ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />原图文件<input className="sr-only" type="file" multiple accept="image/*,video/mp4,video/webm" disabled={!uploadDevice || busy} onChange={(event) => addFiles(event, 'origin')} /></label>
            <label className={`${buttonClass} ${!uploadDevice || busy ? 'cursor-not-allowed opacity-50' : ''}`}><ImagePlus size={16} />预览文件<input className="sr-only" type="file" multiple accept="image/*" disabled={!uploadDevice || busy} onChange={(event) => addFiles(event, 'compress')} /></label>
            <label className={`${buttonClass} ${!uploadBrand || busy ? 'cursor-not-allowed opacity-50' : ''}`}><UploadCloud size={16} />选择文件夹<input className="sr-only" type="file" multiple {...{ webkitdirectory: '' }} disabled={!uploadBrand || busy} onChange={(event) => addFiles(event)} /></label>
            <button className={primaryClass} disabled={busy || uploadDevicesLoading || hasCaseVariant || !uploadBrand || (!uploadDevice && !uploadFolderName) || !uploadRows.some((row) => row.state !== 'done')} onClick={() => void run(async () => {
              const pending = uploadRows.filter((item) => item.state !== 'done');
              if (pending.some((row) => !row.origin || !row.preview)) throw new Error('请先配齐每项原图和预览图');
              if (!uploadDevice && pending.some((row) => row.folderName !== uploadFolderName)) throw new Error('待上传文件不属于所选设备或系统文件夹');
              const deviceId = await ensureUploadDevice();
              for (const row of pending) await uploadOne(row, deviceId);
            })}><UploadCloud size={16} />{busy ? '上传中…' : `上传队列${uploadRows.some((row) => row.state !== 'done') ? ` (${uploadRows.filter((row) => row.state !== 'done').length})` : ''}`}</button>
          </div>
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            {uploadRows.length === 0 && <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500"><ImagePlus size={24} className="text-gray-400" /><span>暂无待上传文件</span></div>}
            {uploadRows.map((row) => <div key={row.id} className="grid gap-2 border-b border-gray-100 p-3 sm:grid-cols-[minmax(160px,1fr)_110px_110px_minmax(130px,1fr)_110px_40px] sm:items-center">
              <div className="min-w-0"><input className={inputClass} aria-label="壁纸名称" value={row.name} onChange={(event) => patchUpload(row.id, { name: event.target.value })} />
                <div className="mt-1 truncate text-xs text-gray-500">{row.origin?.name || '缺原图'} / {row.preview?.name || '缺预览'}</div></div>
              <select className={inputClass} aria-label="主题" value={row.theme} onChange={(event) => patchUpload(row.id, { theme: event.target.value })}>
                {['normal', 'dark', 'light'].map((value) => <option key={value}>{value}</option>)}
              </select>
              <select className={inputClass} aria-label="壁纸分类" value={row.category} onChange={(event) => patchUpload(row.id, { category: event.target.value })}>
                <option value="">同设备</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}
              </select>
              <input className={inputClass} aria-label="标签" value={row.tags} onChange={(event) => patchUpload(row.id, { tags: event.target.value })} placeholder="标签" />
              <div className={`text-xs ${row.state === 'failed' ? 'text-red-700' : row.state === 'done' ? 'text-emerald-700' : 'text-gray-600'}`}>{row.state === 'uploading' ? `${row.progress}%` : row.state === 'done' ? '已入库（草稿）' : row.error || (row.origin && row.preview ? '待上传' : '文件未配齐')}{row.state === 'uploading' && <div className="mt-1 h-1 overflow-hidden rounded bg-gray-200"><div className="h-full bg-teal-700" style={{ width: `${row.progress}%` }} /></div>}</div>
              <button className={buttonClass} title="移除" aria-label={`移除 ${row.name}`} disabled={row.state === 'uploading'} onClick={() => setUploadRows((current) => current.filter((item) => item.id !== row.id))}><X size={15} /></button>
            </div>)}
          </div>
        </section>}
      </div>

      {newBrand && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
        <form onSubmit={createBrand} onKeyDown={(event) => { if (event.key === 'Escape') setNewBrand(null); }} role="dialog" aria-modal="true" aria-label="新增品牌" className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">新增品牌</h2>
            <button type="button" className={buttonClass} title="关闭" onClick={() => setNewBrand(null)}><X size={16} /></button></div>
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
      </div>}

      {editingDevice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await api('devices', editingDevice.id ? 'PATCH' : 'POST', editingDevice);
          setEditingDevice(null);
        }); }} onKeyDown={(event) => { if (event.key === 'Escape') setEditingDevice(null); }} role="dialog" aria-modal="true" aria-label={editingDevice.id ? '编辑设备' : '新建设备'} className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingDevice.id ? '编辑设备' : '新建设备'}</h2>
            <button type="button" className={buttonClass} title="关闭" onClick={() => setEditingDevice(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">品牌<select disabled={!!editingDevice.id} required className={`${inputClass} mt-1`} value={editingDevice.brand_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_name: event.target.value, device_category: defaultDeviceCategory(event.target.value, brands) })}>
              <option value="">选择品牌</option><BrandOptions brands={brands} />
            </select></label>
            <label className="text-sm">设备名称<input required className={`${inputClass} mt-1`} value={editingDevice.device_name || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_name: event.target.value })} /></label>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingDevice.device_category} onChange={(event) => setEditingDevice({ ...editingDevice, device_category: event.target.value as DeviceRow['device_category'] })}>{categories.filter((value) => (value === 'desktop') === editingDeviceIsDesktop)
              .map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}</select></label>
            <label className="text-sm">发布日期<input className={`${inputClass} mt-1`} value={editingDevice.release_date || ''} onChange={(event) => setEditingDevice({ ...editingDevice, release_date: event.target.value })} placeholder="YYYY/MM/DD" /></label>
            <label className="text-sm">Logo 路径<input className={`${inputClass} mt-1`} value={editingDevice.brand_logo || ''} onChange={(event) => setEditingDevice({ ...editingDevice, brand_logo: event.target.value })} /></label>
            <label className="text-sm">宣传图 URL<input className={`${inputClass} mt-1`} value={editingDevice.device_splash_url || ''} onChange={(event) => setEditingDevice({ ...editingDevice, device_splash_url: event.target.value })} /></label>
            {editingDevice.id && <><label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingDevice.status} onChange={(event) => setEditingDevice({ ...editingDevice, status: event.target.value as DeviceRow['status'] })}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value as DeviceRow['status']]}</option>)}</select></label>
              <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingDevice.is_popular_brand} onChange={(event) => setEditingDevice({ ...editingDevice, is_popular_brand: event.target.checked ? 1 : 0 })} />热门品牌</label></>}
          </div>
          {editingDevice.id && deviceCheck && <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-600">
            壁纸 {deviceCheck.total} 张 · 已发布 {deviceCheck.published} · 待处理 {deviceCheck.pending} · 缺预览 {deviceCheck.missing_preview} · 已发布主图 {deviceCheck.published_primary}
          </div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingDevice(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />{busy ? '保存中…' : '保存设备'}</button></div>
        </form>
      </div>}

      {editingWallpaper && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
        <form onSubmit={(event) => { event.preventDefault(); void run(async () => {
          await api('wallpapers', 'PATCH', { ...editingWallpaper,
            tags: typeof editingWallpaper.tags === 'string' ? editingWallpaper.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [] });
          setEditingWallpaper(null);
        }); }} onKeyDown={(event) => { if (event.key === 'Escape') setEditingWallpaper(null); }} role="dialog" aria-modal="true" aria-label="编辑壁纸" className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">编辑壁纸</h2>
            <button type="button" className={buttonClass} title="关闭" onClick={() => setEditingWallpaper(null)}><X size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">名称<input required className={`${inputClass} mt-1`} value={editingWallpaper.name || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, name: event.target.value })} /></label>
            <label className="text-sm">分类<select className={`${inputClass} mt-1`} value={editingWallpaper.category} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, category: event.target.value as WallpaperRow['category'] })}>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value as DeviceRow['device_category']]}</option>)}</select></label>
            <label className="text-sm">主题<select className={`${inputClass} mt-1`} value={editingWallpaper.theme} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, theme: event.target.value as WallpaperRow['theme'] })}>{['normal', 'dark', 'light'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-sm sm:col-span-2">标签<input className={`${inputClass} mt-1`} value={editingWallpaper.tags || ''} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, tags: event.target.value })} /></label>
            <label className="text-sm">状态<select className={`${inputClass} mt-1`} value={editingWallpaper.status} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, status: event.target.value as WallpaperRow['status'] })}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value as DeviceRow['status']]}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={!!editingWallpaper.is_primary} onChange={(event) => setEditingWallpaper({ ...editingWallpaper, is_primary: event.target.checked ? 1 : 0 })} />主展示壁纸</label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditingWallpaper(null)}>取消</button><button disabled={busy} className={primaryClass}><Check size={16} />{busy ? '保存中…' : '保存壁纸'}</button></div>
        </form>
      </div>}
    </main>
  );
}
