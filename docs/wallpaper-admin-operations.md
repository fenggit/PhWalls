# 壁纸后台与 D1 数据源操作说明

## 本地验证

以下命令只操作本机 D1，不影响线上数据库。本地开发服务器默认使用本机 D1；正式后台通过 `DB` 绑定访问线上 D1，入口为 `https://a.phwalls.com/manager`。前后台统一到 Pages 项目 `phwalls` 的迁移步骤与当前进度见[项目合并说明](cloudflare-pages-consolidation.md)。

1. `npx wrangler d1 migrations apply phwalls --local` 建表。
2. `npm run db:import:dry-run` 查看 JSON 条目数量和冲突映射。
3. `node scripts/import-wallpapers-d1.mjs --out /tmp/phwalls-import.sql` 生成幂等导入 SQL。
4. `npx wrangler d1 execute phwalls --local --file=/tmp/phwalls-import.sql` 导入本地 D1。重复执行不会覆盖后台已修改的行。
5. 在 `.env.local` 设置 `WALLPAPER_DATA_SOURCE=d1`，运行 `npm run dev`，核对首页、品牌、桌面、详情和 `/sitemap.xml`。改回 `json` 即恢复本地 JSON 读取。

导入工具保留旧合集日期，保证列表排序与 SEO 日期不变。JSON 里的同名设备或同名壁纸会得到稳定的 `-2` 等后缀；报告列出全部映射。旧数据的字节数由 JSON 的 `size` 字段换算，宽高暂留空；上线前需要抽样核对 R2 原文件和预览文件。导入 SQL 使用 `ON CONFLICT DO NOTHING`，不会覆盖后台修改，但重复导入后仍需对比数据库计数和报告，确认没有未处理的冲突。

## 后台配置

Cloudflare Pages 项目绑定 D1 数据库 `phwalls`，绑定名必须是 `DB`。在 Pages 配置后台专用域名 `a.phwalls.com`。管理路由只接受该域名；本地开发允许 `localhost`。

发布品牌管理功能前，先运行设备名称冲突查询；若 `w_brands` 表已存在，再运行品牌名称冲突查询。确认没有冲突行后，对本地和线上 D1 分别执行 `npx wrangler d1 migrations apply phwalls --local` 与 `npx wrangler d1 migrations apply phwalls --remote`，创建品牌表、唯一索引和归一化键：

```bash
npx wrangler d1 execute phwalls --remote --command "SELECT brand_name, LOWER(TRIM(device_name)) AS name_key, COUNT(*) AS copies FROM w_devices GROUP BY brand_name, LOWER(TRIM(device_name)) HAVING COUNT(*) > 1"
npx wrangler d1 execute phwalls --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'w_brands'"
# 仅当上一条查询返回 w_brands 时执行：
npx wrangler d1 execute phwalls --remote --command "SELECT LOWER(TRIM(title)) AS title_key, COUNT(*) AS copies FROM w_brands GROUP BY LOWER(TRIM(title)) HAVING COUNT(*) > 1"
```

新建品牌、设备、设备改名与 JSON 导入都会写入 Unicode 与空白归一化键，数据库以该键阻止并发重复。`0005` 只对 ASCII 且内部没有连续空格的旧名称使用 `LOWER(TRIM())` 回填；遇到无法保证与应用归一化一致的名称会中止迁移。此时先按应用规则处理对应旧行，再重新执行迁移。后台新增品牌只写入 `w_brands` 自定义品牌目录，内置品牌仍从配置读取；表为空也必须保留，否则后台品牌接口及列表加载会失败。公开品牌目录尚未接入该表，仅切换设备、壁纸数据源为 D1 不会自动展示新品牌，还需接入公开分类、路由与多语言展示。字段与读取规则见[设计方案第 4.4 节](wallpaper-admin-d1-design.md#44-w_brands后台自定义品牌目录已实现)。

### 合并后的部署方式

前台 `phwalls.com` 与后台 `a.phwalls.com` 统一绑定 Pages 项目 `phwalls`，按请求域名区分页面与管理 API。`ADMIN_HOST=a.phwalls.com`，后台入口为 `/manager`，旧 `/admin` 与带语言前缀的后台地址兼容跳转并保留栏目参数；后台路由在公开站点域名仍返回 404，后台页面仍禁止索引。左侧栏目通过 `tab` 查询参数保存，刷新以及浏览器前进、后退均能恢复选中项。

完成 Cloudflare 项目迁移后，向 `phwalls` 配置的生产分支推送代码会同时自动部署前后台；合并方案使用当前前后台开发分支 `release/2.0.0`，其他分支仍属于预览。Git 构建命令应设置为 `npm run pages:build`，输出目录为 `.vercel/output/static`。生产与预览环境需要分别核对 D1 绑定与变量，生产 Secret 不会自动复制到预览环境。

手动部署统一执行 `npm run deploy`；`npm run admin:deploy` 保留为该命令的兼容别名，也会更新前后台并执行生产发布后的 IndexNow 提交。部署会影响公开站点，执行前需确认。旧 `phwalls-admin` 已在验证统一项目的自动部署成功后按用户要求删除；故障回退使用 `phwalls` 的历史完整部署，见项目合并说明。

公开站点是否显示后台保存的数据由 `WALLPAPER_DATA_SOURCE` 控制；合并后的目标配置为 `d1`。生产切换前先按本文末尾的流程核对数据库与公开站点，不能仅依据合并部署命令认定线上已启用数据库。

配置 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`ADMIN_SESSION_SECRET` 作为 Pages Secret。密码哈希可在本机生成，直接运行脚本并按提示输入两次密码（输入隐藏）：

```bash
./scripts/generate-admin-password-hash.sh
```

脚本仅输出两种配置格式，不修改本地环境文件或 Cloudflare 配置。需要通过环境变量调用原生成器时：

```bash
read -s ADMIN_PASSWORD
ADMIN_PASSWORD="$ADMIN_PASSWORD" npm run admin:hash-password
unset ADMIN_PASSWORD
```

脚本会输出两种写法：Cloudflare Pages Secret 使用原始值；本地 `.env.local` 使用带 `\$` 转义的整行配置。Next.js 会展开未转义的 `$`，直接粘贴原始值会导致登录失败。生成工具要求管理员原密码至少 8 位；登录时输入原密码，不输入哈希。不要提交密码或 Secret。`ADMIN_SESSION_SECRET` 使用不少于 32 字符的随机值。未勾选“记住登录状态”时会话有效期为 12 小时；勾选后令牌不设服务端到期时间，直到退出、清理浏览器数据或轮换会话密钥时失效。浏览器使用远期到期时间的持久 Cookie，实际保留期仍受浏览器自己的 Cookie 策略限制。只保存签名的 HttpOnly Cookie，不在浏览器保存明文密码。轮换密钥时旧值可暂放 `ADMIN_SESSION_SECRET_PREVIOUS`，主动安排兼容窗口后移除；记住的会话不会按 30 天自动到期。更换线上登录凭据时同时更新会话密钥并取消旧密钥兼容，使已有会话重新登录。对 `/api/admin/login` 在 Cloudflare WAF 配置登录失败限速。

R2 存储桶需要允许 `https://a.phwalls.com` 和本地 `http://localhost:3100` 的 `PUT` 与 `Content-Type` 请求头。后台上传使用 15 分钟单对象签名 URL；原图与预览都上传并通过 R2 HEAD 核验后才写入草稿。图片上限 50 MiB，视频上限 200 MiB；视频原件支持 MP4/WebM，预览仍为图片。后台不会生成压缩图或视频封面。

上传时必须选择品牌。选择以设备或系统命名的顶层文件夹（例如 `Google Pixel 3a/`），原图与预览图必须直接位于该文件夹的 `origin/` 和 `compress/` 子目录，不支持一次选择包含多个设备的父文件夹。选中文件夹后，后台立即按当前品牌和文件夹名称查询设备，使用与新增设备一致的 Unicode、大小写及空白归一化规则匹配。已有设备会自动选中；不存在时显示创建提示，确认类型与发布日期并点击“创建设备”后，保留文件队列，再点击“开始上传”。查询失败时须先重试，后台不会直接创建设备。文件夹队列待上传期间锁定目标，避免误传到此前选中的其他设备；移除整个队列后可重新选择目标。为已选设备单独添加原图和预览文件的方式仍可使用。

上传目标可选“默认设备目录”或“指定 R2 目录”。指定目录时点击“选择目录”，逐层浏览 R2 已有目录，再点击“使用此目录”；路径只读，无需手动输入。目录窗口支持返回上级、刷新和分页加载；`origin`、`compress` 及不符合上传路径规则的目录不会显示为可选项。新设备可继续使用默认设备目录，上传后由 R2 对象键形成目录。后台分别写入所选目录的 `origin/` 和 `compress/`，文件名随机生成以避免覆盖。上传授权绑定设备、角色和目标目录，原图与预览图必须使用相同目录。

目录读取使用 `/api/admin/r2-directories`，要求后台域名与有效登录会话。服务端通过 R2 ListObjectsV2 按层级查询，每次最多读取 200 项；R2 凭据需要具备该桶的对象列表权限。接口仅返回目录前缀与分页标记，不返回文件 key、凭据或签名 URL。验证命令：`node --test tests/admin-r2-directories.test.mjs`。

壁纸列表的“删除”会弹出确认窗口，列出数据库记录对应的原图与预览图 key。确认后同时删除后台记录和这些 R2 文件；客户端仅提交壁纸 ID，服务端从数据库读取删除路径。已发布设备的主展示壁纸须先更换主图或下架设备，共用文件须先处理其他引用。仍被仓库手机或桌面 JSON 数据引用的文件受保护，须先移除静态配置中的引用并同步公开站点，避免影响仍使用 JSON 的页面和数据源回退。删除会先下架并锁定记录；R2 删除失败时保留记录，列表显示“待重试删除”，可再次点击“删除”完成清理。等待删除的记录不能编辑、重新发布或被新记录引用。进程意外中断时，原操作的两分钟占用期过后可重试。已删除或不存在的 R2 文件可重复清理。删除时会持久化文件 key，数据库触发器阻止迟到的上传完成、编辑或旧导入 SQL 再次引用这些文件。R2 与 D1 无法跨服务原子提交，失败后应完成重试，不要将待删除的记录重新上线。

上线此功能前，先备份 D1，再执行 `npx wrangler d1 migrations apply phwalls --remote` 应用 `0006_wallpaper_deletion_state.sql` 和 `0007_deleted_wallpaper_files.sql`，然后部署后台代码。本地使用 `--local`。迁移新增删除状态字段与已删文件 key 表，保留现有壁纸记录；部署需要具备对象删除权限的 R2 凭据。

## 上传主图与设备发布

上传时创建新设备或系统必须填写发布日期。每个壁纸分类的第一张成功入库壁纸默认设为主展示壁纸，仍保存为草稿；后续上传不会覆盖已有主图，也不会恢复被手动取消的主图。上传队列会标明自动设置的主图。

主图标记与发布状态分别维护。设备编辑窗口同时显示“主图”和“已发布主图”数量；仅勾选主展示壁纸不会自动发布该壁纸。将设备状态改为“已发布”时，默认勾选“一并发布草稿壁纸”：保存前核验全部草稿的 R2 原图、预览图或视频封面以及原图大小，再通过 D1 批量更新发布草稿和设备，保留已选主图。已下架或正在删除的壁纸不参与发布。缺少主图、预览或 R2 文件时中止发布；核验过程中出现新的草稿或文件编辑时，需要刷新后重试，避免发布未经核验的文件。

取消“一并发布草稿壁纸”后，只更新设备状态，须先单独发布至少一张主展示壁纸。接口 `PATCH /api/admin/devices` 仅在明确传入 `publish_drafts: true` 且目标状态为 `published` 时一并发布草稿；省略该选项保留独立发布行为。验证命令：`node --test tests/admin-wallpaper-publication.test.mjs`。

2026-10-04 修正生产 `OnePlus 16`：设备 ID `68637b22-fa9d-4097-a5f0-c5c23fdbdc75` 的品牌由 `oppo` 改为 `oneplus`，统一设备显示名大小写；4 张壁纸的 8 个 R2 对象从 `oppo/oneplus-16/` 复制至 `oneplus/oneplus-16/`，逐个核对 SHA-256 和 MIME 后更新数据库路径。壁纸 ID、手动选择的主图、发布日期和草稿状态保留。本地 JSON 与本地 D1 没有该新设备记录。旧路径无数据库或静态 JSON 引用后登记已删文件路径并清理，防止迟到写入再次引用旧文件。

## 设备与合集多语言内容

最终表结构为 `w_device_i18n`，通过 `device_id` 关联 `w_devices`，每种语言最多一条记录。语言限定为 `en`、`zh`、`ja`、`vi`、`zh-hant`。`display_name` 为本地化设备名，`seo_title` 为完整 SEO 标题（均最多 200 字），`description` 为合集描述（最多 5000 字）。三项可单独维护，但至少填写一项；空白值存为 `NULL`。

后台侧边栏的“多语言”目录直接展示 `w_device_i18n` 已保存记录及所属设备、品牌、语言和更新时间，可按品牌、语言筛选，搜索标准设备名、本地化设备名、SEO 标题或描述，每页 50 条。点击行内“编辑”直接打开该设备对应语言的完整内容，保存或删除后自动刷新目录；顶部“刷新数据”可重新读取最新数据。目录展示数据库原值，未填写字段明确标注，不用语言回退内容冒充已保存的翻译。

后台“设备”列表点击“多语言”，选择语言并填写设备名、SEO 标题或描述，点击“保存此语言”。切换语言保留窗口内未保存的草稿；保存会替换当前语言的三个字段，留空会清除原值。“删除此语言”删除这三个字段对应的整条记录，需确认后执行。管理 API 为 `/api/admin/device-i18n`，读取需登录，保存和删除同时校验来源；旧 `/api/admin/device-descriptions` 已移除。

公开列表、首页与详情页按页面语言读取设备名：当前语言 → 英文 → 标准设备名。SEO 标题优先当前语言，缺失时按当前语言生成；描述按当前语言 → 英文 → 页面生成说明回退。修改翻译不影响标准名称查重、稳定 slug 或素材 key。合集页面按稳定 slug 查找设备，展示语言由页面路径确定。

上线前应用 `0010_device_i18n.sql`，然后发布新代码；旧代码与新表结构不兼容，应协调数据库迁移和后台发布。迁移复制旧表全部 SEO 标题与描述，保留 ID、语言、设备关联和时间戳，新设备名翻译留空，随后删除旧 `w_device_desc`。全新数据库按 `0001` 到 `0010` 顺序建表；不要修改或重复执行已登记的历史迁移。

本地验证用 `npx wrangler d1 migrations apply phwalls --local`；生产使用 `--remote`，执行前备份并核对所有待执行迁移。迁移前后核对语言记录数量及 ID、标题、描述、时间戳；确认 `w_device_i18n` 无孤立设备关联。生产迁移与部署应在正式上线窗口执行。

验证命令：`node --test tests/admin-device-i18n.test.mjs tests/device-seo-backfill.test.mjs`（Node.js 22.13+，使用内置 SQLite 与测试运行器）。

### SEO 文案补全

2026-10-02 的调研、库存快照、五语言文案与入库 SQL 保存在 `docs/research/device-seo-2026-10-02/`。英文、简中、日语、越南语及台港共用繁中按当地壁纸用语分别撰写，设备/版本/特别版名称保留；数量、文件格式、统一尺寸与明暗版本依据线上库存，设计词取自素材名称，不添加未核实的 4K、官方来源或屏幕适配承诺。

`node scripts/backfill-device-seo.mjs` 根据该次快照生成 `device-seo-records.json` 与 `device-seo-backfill.sql`；这是针对该快照的运维工具，新增设备或素材发生变动时先重新核验库存和来源，再生成文案。SQL 仅新增缺失的 `(device_id, language)` 记录，不覆盖后台已有编辑，不修改设备名、URL 或壁纸文件。远程导入前备份 D1；导入后检查总数、五语言覆盖、外键和样例。相关验证：`node --test tests/device-seo-backfill.test.mjs`。

### 设备品牌与本名修正

`src/data/device-localization.json` 统一维护 29 个现有品牌的五语言品牌标签与名称前缀，生成器为每种语言写入 `display_name`，SEO 标题与描述使用同一设备名。简中/繁中采用三星、华为/華為、小米、荣耀/榮耀、索尼等用名；日语采用已有地区用名，英文与越南语保留品牌名称并统一 OPPO、vivo、realme 等官方大小写。Galaxy、Pixel、Xperia、系统名、型号编号及作者姓名保留，不将专有名称逐字翻译。Smartisan 不再被误译为 Hammer、ハンマー 或 Búa，坚果系列采用对应中文名称。官网核验记录保存在 `docs/research/device-seo-2026-10-02/brand-name-sources.json`。

对现有数据使用 `node scripts/repair-device-i18n.mjs --snapshot <最新D1导出.sql> --out <输出文件前缀>` 生成 JSON 修改清单与 SQL。只补齐缺失本名、替换标题和描述中同一完整型号的已知名称写法，不重新生成已编辑的描述或壁纸事实。SQL 同时校验修正前字段、修改时间和标准设备名称；期间有新编辑的记录会跳过，需重新核验。先在导出副本执行 SQL，检查再执行修正计划应为零，并比较设备、壁纸记录及描述中的数字事实均不变；线上执行后重复同样的核对。

2026-10-02 的修正计划与演练结果位于 `device-i18n-localization-repair.json/.sql` 和 `localization-repair-audit.json`；针对 4,975 条记录补齐本名，同时修正 2,985 条标题、2,361 条描述中的名称。各记录 ID、创建时间、设备标准名、URL slug 与壁纸文件保持不变，只有内容修改时间更新。新增语言可继续通过后台单独维护；表结构仍允许留空并按既定规则回退。

## 生产切换

先备份 D1 与 JSON 数据，再在预览环境应用迁移、导入 SQL，并对比设备数、壁纸数、主要品牌页面、详情路径和站点地图。确认 R2 文件与 CORS 后，在生产 D1 应用迁移和导入，最后设置 Pages 环境变量 `WALLPAPER_DATA_SOURCE=d1` 并部署。生产写入和部署需单独执行；切换后只在后台维护 D1 元数据。回退时改为 `json` 并重新部署，JSON 文件始终保留。

### D1 公开读取、缓存与限流

前台首页、品牌列表及设备详情的 D1 展示查询，在生产环境使用 Cloudflare Cache API 缓存 60 秒，按请求域名、语言、品牌及合集隔离。缓存仅在当前边缘节点生效，不是全局共享缓存；节点首次请求或缓存不可用时直接查询 D1。同一次 Cloudflare 请求中的相同查询会复用结果（包括并发调用）。本地 `npm run dev` 不启用跨请求缓存，后台编辑后刷新即可看到最新数据。缓存不存失败查询或缺失的详情；数据结构变化时同步递增 `src/lib/wallpaper-query-cache.ts` 中的缓存路径版本。

发布、下架、修改多语言内容后，前台展示最多延迟约 60 秒更新。下载、签名地址和批量签名的发布权限检查不使用展示缓存，下架立即影响新的代理/签名请求；已有签名 URL 与已缓存或公开的 R2 文件不因数据库下架而自动撤销。

公开壁纸列表接口 `/api/public/wallpapers` 已删除，请求返回 404；不再提供客户端批量读取清单的入口。手机和桌面首页、品牌页与设备详情均由服务端读取展示数据。桌面首页卡片与悬浮“预览”入口统一导航到当前语言的合集详情页，由详情页加载完整壁纸并提供单张预览和下载。D1 与 JSON 回退模式均使用该导航方式。

`POST /api/files/batch-private-urls` 单次最多 100 个 key，超限在查询 D1 前返回 400；合法 key 去重后通过一次数据库查询检查发布状态，不再逐个查询。公开标签、图片和下载接口的异常详情只写入服务器日志，失败响应不缓存。

上线优化前，在备份后应用 `0011_public_wallpaper_query_indexes.sql`；迁移仅添加品牌列表、封面排序和资源可见性查询的索引，不改变记录。可先在数据库导出副本演练；生产仍按既有上线流程单独执行迁移与部署。预览/生产环境需分别测量首页、品牌列表及详情的首字节时间，比较同一节点的首次/重复请求，并核对缓存 60 秒后可见的内容变化及下架后新的下载请求被拒绝。不要用本地开发响应时间推断 Cloudflare 线上延迟。

仓库不维护 Cloudflare WAF 的线上规则，以下为配置建议，尚不能据此认定线上已经启用：在公开站点为 `/api/files/` 请求配置按 IP 的限速规则；初始可按批量签名 30 次/分钟、下载 60 次/分钟观察后调整，避免误伤共享出口和连续下载。让签名、下载请求在查询 D1 前接受限速检查；对超限返回 429。后台登录失败限速沿用前文规则。正式启用前核对 Cloudflare 套餐允许的计数窗口与动作，结合实际访问日志确定阈值；不要把单次 key 上限视为每 IP 限流，也不要用进程内计数冒充分布式限流。

2026-10-02 已通过 Wrangler 现有 OAuth 凭据尝试只读核验：区域可读取，但 `http_ratelimit` 规则入口返回 403（错误码 10000），当前凭据不足以确认 WAF 规则，未改动线上配置。需要在 Cloudflare 控制台或具备对应规则读取权限的凭据下完成核验。回归验证可使用 `node --experimental-transform-types --test tests/*.test.mjs`；Node 22 运行既有 TypeScript 路由测试时需要该转换参数。
