# 壁纸后台操作说明

本文只描述当前日常操作。数据结构见[后台数据模型](wallpaper-admin-d1-design.md)，公开监控见[API 监控说明](api-monitoring.md)。生产 D1、R2 与 Pages 是独立资源，迁移、数据写入和部署必须分开核对。

## 本地准备

```bash
npx wrangler d1 migrations apply phwalls --local
npm run dev
```

本地后台地址为 `http://localhost:3100/manager`。壁纸内容只从 `DB` 绑定读取，缺失绑定或查询失败不会回退到本地 JSON。开发服务器使用 3100 端口；不要在其运行时删除 `.next-dev/`。

需要导入历史 JSON 时，先只读预演，再在本地库执行生成的 SQL：

```bash
npm run db:import:dry-run -- --data-dir <历史数据目录>
node scripts/import-wallpapers-d1.mjs --data-dir <历史数据目录> --out /tmp/phwalls-import.sql
npx wrangler d1 execute phwalls --local --file=/tmp/phwalls-import.sql
```

导入 SQL 使用冲突保护，不覆盖后台已编辑记录。执行后抽查设备数、壁纸数、品牌页、详情页和 `/sitemap.xml`。

## 生产迁移与发布

生产操作需要单独授权。先确认目标是生产环境，导出备份并核对待执行迁移；只在已审阅的迁移清单上执行。

```bash
npx wrangler d1 export phwalls --remote --output <安全备份路径>
npx wrangler d1 migrations list phwalls --remote
npx wrangler d1 migrations apply phwalls --remote
```

迁移成功后，再部署已验证的应用。`npm run deploy` 会发布到 Cloudflare Pages 并触发 IndexNow，属于生产发布。不要在新代码运行时删除仍被访问的表或字段；回滚应用时通常保留新增表和列。

生产发布前后至少核对：

- `DB` 绑定到正确的 `phwalls` 数据库，生产与预览环境变量分别配置。
- 新代码依赖的迁移已经应用，后台能读取设置与列表。
- 公开页面、下载、新增或修改的合集、站点地图和管理登录按预期工作。
- `npm run lint`、`npm run build` 已在本地通过。

## 后台访问与基础配置

线上管理域名由 `ADMIN_HOST` 指定，默认入口为 `https://a.phwalls.com/manager`。公开域名不提供管理页面或管理 API。配置 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` 与至少 32 字符的 `ADMIN_SESSION_SECRET` 为 Pages Secret，不能写入仓库或文档。

本地生成密码哈希：

```bash
./scripts/generate-admin-password-hash.sh
```

脚本不会修改 Cloudflare 配置。`.env.local` 中包含 `$` 的值需要按脚本提示转义；不要粘贴、提交或记录真实密码、哈希和会话密钥。轮换会话密钥时可短期使用 `ADMIN_SESSION_SECRET_PREVIOUS` 兼容旧会话，确认窗口结束后移除旧值。

R2 上传需要管理域名与本地开发地址的 CORS 允许 `PUT` 和 `Content-Type`。R2 凭据只在服务端环境变量中配置，并至少具备上传流程需要的读、写、列表和已授权删除权限。

## 创建与维护内容

### 品牌、设备与多语言内容

1. 内置品牌来自前端配置；“新增品牌”只写入 `w_brands`，不会自动生成公开导航、路由或五语言名称。
2. 创建设备时填写品牌、标准名称、类别和发布日期。发布日期可留空，新建设备默认使用当天北京时间日期；编辑时可清空。稳定 `device_slug` 不应随展示名称改动。
3. 静态与动态素材共享设备，但应分别维护主图和多语言内容。多语言编辑保存 `display_name`、`seo_title`、`description` 中至少一项；描述只写画面、风格和适配信息，不重复张数和固定尺寸。
4. 设备主风格、单张标签与单张明暗主题是三个不同字段，填写规则见[内容分类](content-classification.md)。

### 上传素材

上传前确认目标设备和媒体类型。静态与动态素材使用同一个设备目录，历史对象仍按原 key 读取；新上传不使用 `live/` 命名空间。

- 原文件置于 `origin/`，静态预览图或动态封面置于 `compress/`。动态网页预览按原视频 key 推导，不作为独立壁纸。
- 原图和封面按相同主文件名配对。多个候选、孤立封面、重复文件名、缺少尺寸或 MIME 不一致时，先修复源文件，不能强行入库。
- 支持 JPEG、PNG、WebP、AVIF、GIF、MP4 和 WebM；新上传动态原视频及网页预览只接受 MP4，历史 WebM 继续可读。
- 上传授权限时且绑定设备、目录、媒体类型、素材组和对象角色。完成时服务端从 R2 读取大小、MIME 和原始尺寸，失败项保留在队列中重试，不创建不完整记录。
- 文件夹根目录可包含 `wallpaper-tags.json` 或 `wallpaper-tags.md`。它们只在浏览器本地解析，不上传到 R2；优先 JSON，JSON 损坏时停止并提示，不静默改读 Markdown。标签按完整原文件名匹配，格式和限制见[内容分类](content-classification.md)。

上传完成的素材默认是草稿。上传冲突或已删除 key 的错误必须先重新选择文件名或目录，不能覆盖对象或绕过删除保护。

### 发布、下架与删除

- 发布前在后台明确选择素材，检查当前快照、原文件、预览图或封面、尺寸和主图。设备与壁纸均为 `published` 时才公开可见。
- 静态与动态合集可独立发布、下架和删除。下架不删除 R2 文件；设备恢复可见性可能同时影响两种已发布素材，操作前确认影响范围。
- 删除会先锁定、下架并保存精确对象清单，再删除独占 R2 文件和 D1 记录。共享文件、已发布主图和另一媒体类型仍引用的文件受到保护。
- 删除中断或 R2 删除失败时，保留 `pending` 状态并在后台重试。不要手动清除删除锁、删除标记或待删记录，否则迟到上传可能重新引用旧文件。
- 批量变更、目录迁移或清理 R2 对象前，先导出 D1、冻结对象清单、核对所有状态的引用和对象校验值。只删除明确列出的对象，不能按目录递归删除。

## 全站设置

### 广告

广告设置存于 `w_download_settings.ads_enabled`。首次使用前先应用 `0024_advertising_setting.sql`，再部署依赖该字段的应用。

登录后台后在“广告设置”中切换“显示广告”。开启时公开页面加载 Google AdSense 脚本，关闭后新的页面加载不再载入。设置读取失败或迁移尚未应用时，公开页面按开启处理；管理 API 返回 503，修复迁移后再重试。

`GET /api/admin/ad-settings` 返回 `{ "ads_enabled": boolean }`，`PUT` 使用同一结构保存。读取要求后台会话，写入还要求同源 `Origin` 与 `X-Phwalls-Admin: 1`。

### 每 IP 每日下载上限

下载上限依赖 `0022_daily_download_limit.sql` 和 `0023_download_reservations.sql`。在目标 D1 完成迁移后，后台“下载设置”可设置：

- 留空：不限次数。
- `0`：禁止下载。
- 正整数：每个规范化 IP 在北京时间自然日的成功下载上限，范围 1–1,000,000。

两个原图下载入口共用额度。请求先预占，只有完整传输并结算成功后才计入次数；取消、断流和失败会释放预占。额度存储不可用返回 503，超限返回 429。调整上限不会清空当日成功次数或预占。

### API 监控与 IP 黑名单

监控与手动封禁的配置、数据保留、阈值、接口和排查步骤见[API 监控说明](api-monitoring.md)。黑名单只拦截文档列出的受监控公开接口，不替代 Cloudflare WAF。

## 公开缓存与核验

D1 展示查询在边缘缓存约 60 秒，发布、下架和编辑文案后公开页面可能短暂显示旧内容；下载权限每次实时核验。页面 HTML 缓存规则、清除范围和搜索收录核验见[壁纸发现与 SEO](wallpaper-discovery-seo.md)。

常规验证：

```bash
npm run lint
npm run build
```

涉及下载、监控、小程序或后台接口时，运行受影响的 `node --test` 用例。不要把本地数据、浏览器缓存或单一边缘节点的结果当作生产全局状态；生产核验应使用受控请求，避免对公开接口做高频压测。
