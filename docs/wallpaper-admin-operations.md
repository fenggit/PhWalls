# 壁纸后台与 D1 数据源操作说明

## 本地验证

以下命令只操作本机 D1，不影响线上数据库。本地开发服务器默认使用本机 D1；正式后台通过 `DB` 绑定访问线上 D1，入口为 `https://a.phwalls.com/manager`。前后台统一到 Pages 项目 `phwalls` 的迁移步骤与当前进度见[项目合并说明](cloudflare-pages-consolidation.md)。

1. `npx wrangler d1 migrations apply phwalls --local` 建表。
2. 如需迁移历史数据，`npm run db:import:dry-run -- --data-dir <外部历史数据目录>` 查看 JSON 条目数量和冲突映射。仓库已移除本地壁纸内容 JSON，新环境也可直接导入 D1 导出快照。
3. `node scripts/import-wallpapers-d1.mjs --data-dir <外部历史数据目录> --out /tmp/phwalls-import.sql` 生成幂等导入 SQL。
4. `npx wrangler d1 execute phwalls --local --file=/tmp/phwalls-import.sql` 导入本地 D1。重复执行不会覆盖后台已修改的行。
5. 运行 `npm run dev`，核对首页、品牌、桌面、详情和 `/sitemap.xml`。壁纸内容仅从 `DB` 绑定读取，历史 `WALLPAPER_DATA_SOURCE` 设置不再生效；缺少数据库绑定或查询失败时不会回退本地数据。

导入工具保留旧合集日期，保证列表排序与 SEO 日期不变。JSON 里的同名设备或同名壁纸会得到稳定的 `-2` 等后缀；报告列出全部映射。旧数据的字节数由 JSON 的 `size` 字段换算，宽高暂留空；上线前需要抽样核对 R2 原文件和预览文件。导入 SQL 使用 `ON CONFLICT DO NOTHING`，不会覆盖后台修改，但重复导入后仍需对比数据库计数和报告，确认没有未处理的冲突。

## 后台配置

设备主色调使用 `w_devices.theme` 单值英文枚举，并映射五种语言；单张壁纸的风格标签与明暗版本仍分别使用 `tags` 和 `theme`。字段语义、完整枚举、接口用法及 `0015`／`0016` 迁移见[设备主色调说明](device-themes.md)。

单张壁纸标签使用小写英文数组，英文同时作为展示文字与五语言 JSON 的匹配键。后台或导入时直接写入词表中的英文名称，接口不额外转换。`scripts/backfill-wallpaper-tags.mjs` 可对最新 D1 快照生成存量转换与回滚 SQL；现有接口会直接返回转换后的英文，不需要新接口部署或字段迁移。全部 94 个英文标签及中文说明见[壁纸标签说明](wallpaper-tags.md)。

上传完成接口会通过签名请求检查 R2 `origin` 原文件，并读取原始图片或视频头部中的宽高；文件字节大小取自 R2 `Content-Length`，分辨率不取封面图或客户端提交值。支持 JPEG、PNG、WebP、AVIF、GIF、MP4 和 WebM；MP4 会跳过视频内容块查找元数据，并处理竖屏旋转。无法读取元数据时上传队列保留失败状态，修复原文件后重试，不创建缺少分辨率的壁纸记录。

批量补齐已有原始尺寸：`node scripts/backfill-origin-dimensions.mjs --snapshot <D1导出.sql> --source <本地素材目录> --out <输出前缀>`。优先读取与 R2 ETag、字节数匹配的本地 `origin`，无法匹配时读取 R2 原文件头部。脚本只生成缺失尺寸更新、回滚 SQL 与核验报告，不自动写入线上；执行前会验证完整快照模拟、重复执行幂等和精确回滚。

补齐缺少的五语言与 SEO 字段：`node scripts/backfill-missing-device-seo.mjs --snapshot <D1导出.sql> --out <输出前缀>`。分别按真实静态／动态合集的名称、张数及格式生成文案，只补空缺字段，保留已有非空文案，并校验素材数量、发布及删除状态、名称与稳定 slug。输出补全 SQL、回滚 SQL 和缺失审计，不自动写入线上。

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

公开站点直接显示 `DB` 绑定中已发布的内容，不再提供 JSON 数据源切换。生产切换前先按本文末尾的流程核对数据库绑定与公开站点。

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

R2 存储桶需要允许 `https://a.phwalls.com` 和本地 `http://localhost:3100` 的 `PUT` 与 `Content-Type` 请求头。后台上传使用 15 分钟单对象签名 URL；原图与预览都上传并通过 R2 HEAD 核验后才写入草稿。图片上限 50 MiB，视频上限 200 MiB；新上传的动态原视频和可选网页预览视频仅支持 MP4，封面为图片。完成时还会核对文件头、扩展名及 MIME，历史 WebM 仍可读取。后台不会生成压缩图或视频封面。

上传时必须选择品牌。选择以设备或系统命名的顶层文件夹（例如 `Google Pixel 3a/`），原图与预览图必须直接位于该文件夹的 `origin/` 和 `compress/` 子目录，不支持一次选择包含多个设备的父文件夹。选中文件夹后，后台立即按当前品牌和文件夹名称查询设备，使用与新增设备一致的 Unicode、大小写及空白归一化规则匹配。已有设备会自动选中；不存在时显示创建提示，确认类型与发布日期并点击“创建设备”后，保留文件队列，再点击“开始上传”。查询失败时须先重试，后台不会直接创建设备。文件夹队列待上传期间锁定目标，避免误传到此前选中的其他设备；移除整个队列后可重新选择目标。为已选设备单独添加原图和预览文件的方式仍可使用。

上传页按设备显示一个统一目录，静态和动态共用。可先保存建议目录，也可在“目录设置”中浏览并选择已有 R2 目录；设备编辑页也可维护 `upload_prefix`。尚未配置时，唯一的非 Live 静态目录作为建议；存在多个目录时须明确选择；无静态目录时按品牌和型号生成建议。新上传不再放入 `live/`，历史 key 继续直接读取。文件名保留，已有同名对象拒绝覆盖；上传授权绑定设备、素材组、媒体类型、角色和目录，原文件与封面必须属于同一组。

目录读取使用 `/api/admin/r2-directories`，要求后台域名与有效登录会话。服务端通过 R2 ListObjectsV2 按层级查询，每次最多读取 200 项；R2 凭据需要具备该桶的对象列表权限。接口仅返回目录前缀与分页标记，不返回文件 key、凭据或签名 URL。验证命令：`node --test tests/admin-r2-directories.test.mjs`。

壁纸列表的“删除”会弹出确认窗口，列出数据库记录对应的原图与预览图 key。确认后同时删除后台记录和这些 R2 文件；客户端仅提交壁纸 ID，服务端从数据库读取删除路径。已发布设备的主展示壁纸须先更换主图或下架设备，共用文件须先处理其他引用。仍被仓库手机或桌面 JSON 数据引用的文件受保护，须先移除静态配置中的引用并同步公开站点，避免影响仍使用 JSON 的页面和数据源回退。删除会先下架并锁定记录；R2 删除失败时保留记录，列表显示“待重试删除”，可再次点击“删除”完成清理。等待删除的记录不能编辑、重新发布或被新记录引用。进程意外中断时，原操作的两分钟占用期过后可重试。已删除或不存在的 R2 文件可重复清理。删除时会持久化文件 key，数据库触发器阻止迟到的上传完成、编辑或旧导入 SQL 再次引用这些文件。R2 与 D1 无法跨服务原子提交，失败后应完成重试，不要将待删除的记录重新上线。

上线此功能前，先备份 D1，再执行 `npx wrangler d1 migrations apply phwalls --remote` 应用 `0006_wallpaper_deletion_state.sql` 和 `0007_deleted_wallpaper_files.sql`，然后部署后台代码。本地使用 `--local`。迁移新增删除状态字段与已删文件 key 表，保留现有壁纸记录；部署需要具备对象删除权限的 R2 凭据。

## 按静态／动态合集删除

2026-10-12 线上故障处理：合集删除代码已部署，但生产 D1 缺少 `0014_collection_deletion_state.sql` 中的 `w_collection_deletions` 表，设备列表查询关联该表时返回 500。已完整导出 D1 备份后应用唯一待执行的 `0014` 迁移，后台恢复加载 1300 条设备／合集记录；迁移前后设备均为 1216 个、壁纸均为 11572 张。备份位于本机 `/Users/fenghe/.codex/backups/PhWalls/manager-500-20261012-8i8ohO/phwalls-before-0014.sql`。后续发布需先用 `npx wrangler d1 migrations list phwalls --remote` 核对迁移，再按上线流程应用迁移并部署。

设备目录每个型号显示一行，同时展示静态与动态数量；展开后独立管理两种合集的素材、主图、多语言、发布、下架和删除。类型筛选保留，数量涵盖草稿、已发布、已下架和待删除素材；空设备仍可上传和删除。

点击“删除合集”先读取当前类型的完整清单，不受壁纸列表每页 50 张的限制。窗口标明静态／动态类型，逐项展示所有原图、封面、动态网页预览路径，以及对应类型的多语言记录数量。同设备另一类型或其他设备引用的文件标为保留。客户端只提交设备 ID、壁纸类型和确认清单快照；清单、多语言文案、文件共用关系或删除状态变化后必须重新核对，不能复用另一类型的快照。

确认后锁定并下架当前类型的全部壁纸，清理独占 R2 文件、当前类型的壁纸和多语言记录。另一类型的素材、主图、多语言及设备发布状态保持原样，公开站点仍能展示剩余合集。删除最后一种类型且设备已无壁纸、其他类型文案与删除任务时，再清理空设备；另一类仅有文案或有新上传内容时仍保留设备。

R2 删除失败时保留当前类型的全部记录和合集删除锁，标为“待重试删除”，刷新清单后可重试；已删除或不存在的对象可重复清理。进行中的操作两分钟内不能重复认领，中断后可重试。同类型上传、编辑与重新发布被锁定，另一类型仍可上传；涉及共享设备信息的编辑暂时禁用。永久文件标记继续阻止迟到上传重新引用已删路径。共享文件的两个合集不能同时认领删除，以免丢失最后一个文件引用。

新流程使用 `0014_collection_deletion_state.sql` 的按设备和类型删除锁，先应用迁移再部署代码。旧 `0013_device_deletion_state.sql` 保留，用于空设备删除及历史未完成的整台设备删除重试；旧任务继续在单行中展示原范围，避免错误切换成局部删除。生产迁移和部署按正式上线流程执行。

公开站点使用 D1 时允许删除历史 JSON 中也存在的素材。旧 JSON 备份恢复前须修订对应引用或恢复 R2 文件。公开站点仍使用 JSON 时，相关文件受保护，窗口说明原因并禁用确认。单张壁纸删除原有静态配置保护规则保持不变。

验证命令：`node --experimental-transform-types --test tests/*.test.mjs`、`npm run lint`、`npm run build`。

## 上传主图与设备发布

上传页本次新建的设备或系统，在整批上传成功后弹窗询问是否直接发布。选择“直接发布”会核验并发布设备及其草稿壁纸，队列同步显示已发布；选择“暂不发布”或关闭弹窗保留草稿。已有设备追加上传不弹出该提示。有失败项时先完成重试，整批成功后再询问，成功项无需重复上传。

发布日期可填写 `2021年9月22日`、`2021/09/22` 或 `2021-09-22`，新建与编辑时统一保存为 `2021/09/22`。支持全角数字及中文日期组件之间的空格；仅年份或年月保留对应精度，不补造月份或日期。非法月份、日期和非闰年的 2 月 29 日会被拒绝。

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

动态合集与静态合集共用标准设备 ID，但使用独立内容。`0012_collection_media_scope.sql` 新增 `w_live_device_i18n` 保存动态五语言文案；原 `w_device_i18n` 继续保存静态文案，兼容已部署版本。`w_collection_i18n` 视图提供带 `media_type` 的统一读取。后台多语言目录可按静态／动态筛选；编辑窗口须确认壁纸类型，保存、删除和语言回退只作用于选定类型。壁纸名称及主封面唯一性同时区分媒体类型；新上传的静态与动态共用设备级 `upload_prefix`；历史 `live/` 路径继续兼容，存量规范化迁移按核验清单单独执行。

动态文案补全工具：`node scripts/backfill-live-device-seo.mjs --snapshot <D1导出.sql> --out <输出前缀>`。工具从 D1 快照读取品牌、稳定 slug、实际动态素材数量与格式，生成英、简中、日、越、繁中名称、SEO 标题及描述。仅补充缺失字段，保留已有动态人工编辑，重复导入幂等；不写静态文案表、不改变发布状态或 R2 key。线上写入前先导出备份，预演迁移与 SQL，并逐字段比对静态内容及素材记录；写入后按快照中的实际合集数核对五语言完整记录与外键。数据库迁移和文案写入完成后，部署代码才会在后台及动态页面使用新内容。

2026-10-02 的调研、库存快照、五语言文案与入库 SQL 保存在 `docs/research/device-seo-2026-10-02/`。英文、简中、日语、越南语及台港共用繁中按当地壁纸用语分别撰写，设备/版本/特别版名称保留；数量、文件格式、统一尺寸与明暗版本依据线上库存，设计词取自素材名称，不添加未核实的 4K、官方来源或屏幕适配承诺。

`node scripts/backfill-device-seo.mjs` 根据该次快照生成 `device-seo-records.json` 与 `device-seo-backfill.sql`；这是针对该快照的运维工具，新增设备或素材发生变动时先重新核验库存和来源，再生成文案。SQL 仅新增缺失的 `(device_id, language)` 记录，不覆盖后台已有编辑，不修改设备名、URL 或壁纸文件。远程导入前备份 D1；导入后检查总数、五语言覆盖、外键和样例。相关验证：`node --test tests/device-seo-backfill.test.mjs`。

### 设备品牌与本名修正

`src/data/device-localization.json` 统一维护 29 个现有品牌的五语言品牌标签与名称前缀，生成器为每种语言写入 `display_name`，SEO 标题与描述使用同一设备名。简中/繁中采用三星、华为/華為、小米、荣耀/榮耀、索尼等用名；日语采用已有地区用名，英文与越南语保留品牌名称并统一 OPPO、vivo、realme 等官方大小写。Galaxy、Pixel、Xperia、系统名、型号编号及作者姓名保留，不将专有名称逐字翻译。Smartisan 不再被误译为 Hammer、ハンマー 或 Búa，坚果系列采用对应中文名称。官网核验记录保存在 `docs/research/device-seo-2026-10-02/brand-name-sources.json`。

对现有数据使用 `node scripts/repair-device-i18n.mjs --snapshot <最新D1导出.sql> --out <输出文件前缀>` 生成 JSON 修改清单与 SQL。只补齐缺失本名、替换标题和描述中同一完整型号的已知名称写法，不重新生成已编辑的描述或壁纸事实。SQL 同时校验修正前字段、修改时间和标准设备名称；期间有新编辑的记录会跳过，需重新核验。先在导出副本执行 SQL，检查再执行修正计划应为零，并比较设备、壁纸记录及描述中的数字事实均不变；线上执行后重复同样的核对。

2026-10-02 的修正计划与演练结果位于 `device-i18n-localization-repair.json/.sql` 和 `localization-repair-audit.json`；针对 4,975 条记录补齐本名，同时修正 2,985 条标题、2,361 条描述中的名称。各记录 ID、创建时间、设备标准名、URL slug 与壁纸文件保持不变，只有内容修改时间更新。新增语言可继续通过后台单独维护；表结构仍允许留空并按既定规则回退。

## 生产切换

先备份 D1，再在预览环境应用迁移、按需导入快照或外部历史数据，并对比设备数、壁纸数、主要品牌页面、详情路径和站点地图。确认 R2 文件与 CORS 后，在生产 D1 应用迁移和导入，核对 Pages 的 `DB` 绑定并部署。生产写入和部署需单独执行；内容只在后台维护 D1 元数据。回退使用已备份的数据库与对应代码版本，当前代码不支持 JSON 回退。

### D1 公开读取、缓存与限流

前台首页、品牌列表、搜索索引及设备详情的 D1 展示查询，在生产环境使用 Cloudflare Cache API 缓存 60 秒，按请求域名、语言、品牌及合集隔离。缓存仅在当前边缘节点生效，不是全局共享缓存；节点首次请求或缓存不可用时直接查询 D1。同一次 Cloudflare 请求中的相同查询会复用结果（包括并发调用）。本地 `npm run dev` 不启用跨请求缓存，后台编辑后刷新即可看到最新数据。缓存不存失败查询或缺失的详情；数据结构变化时更新对应查询缓存 key 或递增 `src/lib/wallpaper-query-cache.ts` 中的缓存路径版本。

发布、下架、修改多语言内容后，前台展示最多延迟约 60 秒更新。下载、签名地址和批量签名的发布权限检查不使用展示缓存，下架立即影响新的代理/签名请求；已有签名 URL 与已缓存或公开的 R2 文件不因数据库下架而自动撤销。

公开壁纸列表接口 `/api/public/wallpapers` 已删除，请求返回 404；不再提供客户端批量读取清单的入口。手机和桌面首页、品牌页与设备详情均由服务端读取展示数据。桌面首页卡片与悬浮“预览”入口统一导航到当前语言的合集详情页，由详情页加载完整壁纸并提供单张预览和下载。D1 与 JSON 回退模式均使用该导航方式。

`POST /api/files/batch-private-urls` 单次最多 100 个 key，超限在查询 D1 前返回 400；合法 key 去重后通过一次数据库查询检查发布状态，不再逐个查询。公开标签、图片和下载接口的异常详情只写入服务器日志，失败响应不缓存。

上线优化前，在备份后应用 `0011_public_wallpaper_query_indexes.sql`；迁移仅添加品牌列表、封面排序和资源可见性查询的索引，不改变记录。可先在数据库导出副本演练；生产仍按既有上线流程单独执行迁移与部署。预览/生产环境需分别测量首页、品牌列表及详情的首字节时间，比较同一节点的首次/重复请求，并核对缓存 60 秒后可见的内容变化及下架后新的下载请求被拒绝。不要用本地开发响应时间推断 Cloudflare 线上延迟。

仓库不维护 Cloudflare WAF 的线上规则，以下为配置建议，尚不能据此认定线上已经启用：在公开站点为 `/api/files/` 请求配置按 IP 的限速规则；初始可按批量签名 30 次/分钟、下载 60 次/分钟观察后调整，避免误伤共享出口和连续下载。让签名、下载请求在查询 D1 前接受限速检查；对超限返回 429。后台登录失败限速沿用前文规则。正式启用前核对 Cloudflare 套餐允许的计数窗口与动作，结合实际访问日志确定阈值；不要把单次 key 上限视为每 IP 限流，也不要用进程内计数冒充分布式限流。

2026-10-02 已通过 Wrangler 现有 OAuth 凭据尝试只读核验：区域可读取，但 `http_ratelimit` 规则入口返回 403（错误码 10000），当前凭据不足以确认 WAF 规则，未改动线上配置。需要在 Cloudflare 控制台或具备对应规则读取权限的凭据下完成核验。回归验证可使用 `node --experimental-transform-types --test tests/*.test.mjs`；Node 22 运行既有 TypeScript 路由测试时需要该转换参数。

## 合集场景文案与主题试点

网页导语由实时张数、实际原始尺寸和后台 `description` 拼接。后台填写画面内容、风格、型号范围及适配场景即可，不必重复张数；图片增减后，张数与尺寸随公开数据重新计算。手机、折叠屏、平板、桌面与视频分别说明适配条件，不统一声称 4K、无裁切或所有设备均可设置动态壁纸。

整理旧通用描述：

```bash
npx wrangler d1 export phwalls --remote --output /tmp/phwalls-before-scenes.sql
node scripts/backfill-collection-scenes.mjs --snapshot /tmp/phwalls-before-scenes.sql --out /tmp/phwalls-scenes
```

脚本生成 `.sql`、`.rollback.sql`、`.changes.json`、`.preserved.json` 和 `.audit.json`，先在 SQLite 副本逐行核对写入、幂等和完整回滚。仅更新可识别的旧模板和缺少的语言；保留人工介绍、名称与 SEO 标题，不变更发布状态、素材或尺寸。更新校验旧描述、修改时间、设备状态和素材版本指纹；并发编辑优先保留。回滚仅匹配仍为本次写入结果的行，后续人工编辑不会被覆盖。审核输出后可分别用 `npx wrangler d1 execute phwalls --remote --file <更新.sql>` 和对应回滚文件执行；重新运行脚本不等于重复应用旧 SQL。

2026-10-17 本次整理覆盖 1,299 个已发布静态／动态合集，已更新 6,302 条语言描述并保留 193 条独立介绍；备份、变更清单、条件回滚与核验材料位于本次工作目录的 `tmp/seo-discovery-2026-10-17/`。写后快照逐条核验与更新计划一致，设备、素材、品牌及删除状态数据保持原值；对写后快照重新生成计划为零条待更新。线上数据整理与网页代码部署是两个独立操作。

主题试点保持十个主题，同时支持 en、zh、ja、vi、zh-hant，地址为 `/{lang}/themes/{slug}`，共五十个语言 URL；切换语言保留当前主题，标题、介绍、标签和来源链接同步本地化。素材仍由 D1 读取，精选配置只保存稳定素材 ID，不复制图片和壁纸内容 JSON。替换精选需审图并修改 `src/lib/theme-selections.ts`，动态素材、下架、删除及标签不再匹配的图片自动排除，不自动补入未审核的新图片。新增主题或额外语言须单独决定，不按标签组合扩量。

验证生产预览：`node scripts/check-discovery.mjs http://localhost:<端口>`，检查十个主题的五十个语言页面、五语言共十五个示例详情、正文与元描述一致性、兄弟链接、标签、语言跳转、未知主题 404、首页入口和五语言主题 sitemap。完整策略及观察口径见[主题与内链说明](wallpaper-discovery-seo.md)。


## 公开接口调用监控

后台“接口监控”查看最近 1 小时、24 小时或 7 天的请求趋势、来源、IP 与接口排行、异常分钟窗口和近期请求。IP 首批显示 20 条，点击“加载更多 IP”分页追加；失败保留已有行，刷新与切换时段重置列表。流量异常 IP 和分钟阈值标签以黄色标记，HTTP 错误以红色标记，两者口径分别展示。现有微信小程序继续匿名访问；AppID 匹配只是来源线索，不用空 Referer 或共享 IP 直接判定盗用。不自动封禁或发送通知。

上线需先备份并核对待执行迁移，再应用 `0017_api_access_events.sql`、部署代码和核对 `API_MONITOR_ENABLED` / `API_MONITOR_MINI_APP_ID`。不回填历史流量；记录失败不影响业务。表保存完整客户端 IP 与截断 User-Agent，仅管理员可查看；最近 7 天以外的数据随新请求渐进清理，无流量或停采时不主动清理。全量采集增加 D1 写入成本，可通过开关暂停。完整上线步骤、监控盲区、阈值及排查方法见 [公开 API 调用监控](api-monitoring.md)。

### 2026-10-20 监控不可用恢复

生产页面显示“监控暂不可用”，原因为监控代码已发布，但 D1 唯一待执行迁移 `0017_api_access_events.sql` 尚未应用，`w_api_access_events`、相关索引及清理触发器均不存在。

完整导出备份并在隔离 SQLite 中验证备份可恢复、预演迁移后，已应用唯一待执行的 `0017` 迁移；没有修改应用代码或重新部署。备份路径为 `/Users/fenghe/.codex/backups/PhWalls/api-monitor-20261020/phwalls-before-0017.sql`，大小 11,268,979 字节，SHA-256 为 `3a614e525b2b78124dfa333dff4096a24a3a29d3b0db514ec169f99fa806d605`。

迁移前后核对设备 1217 条、壁纸 11586 条、静态翻译 6085 条、动态翻译 660 条，均未改变；远端迁移列表已无待执行项。线上后台最近 1 小时、24 小时、7 天统计均恢复；小程序品牌接口返回 200，单次带 `PhWalls-Monitor-Verification/1.0` 客户端标识的验证请求已成功采集，空来源按预期归类为未知。自然搜索、预览与下载请求也开始入库。迁移前未采集的历史流量不能补回。

## 同型号混合上传与独立发布（2026-10-26）

先应用 `0018_device_upload_prefix.sql`，再发布兼容代码。设备的 `upload_prefix` 默认为 NULL；迁移不移动对象、不改变发布状态。静态图片与 MP4 动态原文件共用一个型号目录，动态网页预览也只接受 MP4；旧 WebM 播放与下载继续兼容。设备改名不改变稳定 slug 和已配置目录。

每个原文件建立一个上传项，按主名大小写精确配对 `compress` 图片，按完整文件名配对可选 `preview` 视频。相同主名有多个原文件或多个封面时必须处理冲突；孤立封面与不支持素材不静默入库。说明文件与 Finder 元数据可忽略并统计。图片封面不单独算静态壁纸。所有新上传先保存草稿。

后台设备目录一型号一行，展开静态与动态合集分别管理。每种合集拥有独立主图和五语言内容。上传结果允许重试失败项并选择本次成功素材发布，历史草稿必须明确加入。设备本身是上层可见开关，恢复后会使其已发布素材重新可见，跨类型影响需要明确确认。

### 接口约定

以下接口要求管理员登录；写入继续要求合法 Origin 与 `x-phwalls-admin: 1`，响应不缓存。

- `GET /api/admin/upload?device_id=...`：返回统一 `prefix`、历史 `directories`、`source`、`configured` 与 `historical_directories`。`source` 为 `configured` / `existing` / `default` / `multiple`。目录读取只检查设备级删除状态，某类型删除锁不阻止另一类型读取目录。
- `PATCH /api/admin/devices`：`upload_prefix` 省略保留原值，显式 NULL 清除；配置目录可附带 `expected_updated_date`，服务端同时以读到的版本限制更新。目录不能归属另一设备，首次有效授权也会持久化尚未配置的目录。
- `POST /api/admin/upload` 的 `authorize`：提交设备、逐项 `media_type`、`group_id`、角色、文件名、MIME、大小与统一目录；签名绑定这些归属信息，同名对象或已删除路径拒绝授权。
- 同接口的 `reconcile`：提交 `device_id` 与 `upload_token`，只读验证签名有效性、设备/类型/角色/目录、删除状态、对象大小/MIME 和内容签名；返回 `{data:{uploaded:boolean}}`。用于 PUT 成功但响应丢失的重试，不能单凭 HTTP 412 当作成功，也不会覆盖对象。
- 同接口的 `complete`：原文件、封面及可选视频预览授权必须属于同一素材组，逐项核对实际内容签名及原始尺寸，返回草稿素材。由设备、组与目录生成稳定 ID；同一组并发重放只能产生一条记录，参数不一致或试图认领其他素材时拒绝。
- `GET /api/admin/device-check?id=...&ids=<JSON数组>`：检查明确选中的素材，返回 `snapshot`、`wallpaper_ids`、分媒体/分类 `groups`、`issues`、设备状态与另一类型恢复可见的影响。按合集下架检查使用 `media=static|dynamic&operation=unpublish`。
- `POST /api/admin/collections/publish`：提交 `device_id`、明确 `wallpaper_ids`、`snapshot`、可选 `primary_ids`、`make_device_visible` 与 `acknowledge_other_media_visibility`。只发布这些 ID，检查选中素材与既有主图文件；必要时事务内切换当前范围主图。记录、删除锁或设备在检查后变化则拒绝，须重新检查。
- `POST /api/admin/collections/unpublish`：提交 `device_id`、`media_type`、`snapshot`，只将该类型已发布素材下架；原草稿保持草稿。删除接口继续使用现有精确文件清单与快照。

旧 `publish_drafts: true` 和壁纸 PATCH 从草稿/下架直接改为已发布均拒绝，改走明确选中素材的发布检查。上传授权有效期仍为 15 分钟。未上传的过期授权可重新申请；已上传部分对象后授权过期，界面列出对象 key，须核对孤立文件后改用新文件名，不能盲目覆盖或删除。刷新页面不恢复浏览器 File 对象，可在素材列表查看已入库草稿。

### 命名与内容重复整理工具

`python3 scripts/catalog-normalization.py audit --source <素材根目录> --snapshot <D1完整导出> --out <审计目录>` 生成带哈希、路径映射、逐行旧值、合并关系和回滚 SQL 的清单。修改品牌/型号目录前核对真实设备身份；去除型号标记外围括号时保留年份、代次和代号。不同原图即使文件主名相同也必须保留，并分配无歧义文件名和对应预览。

重复判断依据原文件内容哈希与设备/媒体范围，合并保留独有素材、标签、主图和发布状态；压缩图不能脱离原文件关系单独按哈希删除。图片头部检测同时修正与真实格式不符的后缀和 MIME。翻译名称与 SEO 中的型号片段同步修正，保留已翻译品牌和人工介绍；合并时补齐空缺字段，非空差异记录在清单中供回查。

操作顺序：冻结清单 → `node scripts/catalog-normalization-r2.mjs --manifest <清单> --apply --concurrency <并发数>` 准备并核验备份及新对象 → 新导出与 `verify-d1 --phase before` 比较 → 执行条件更新 SQL → 新导出与 `verify-d1 --phase after` 逐行核验 → `apply-local` 将原文件移到源目录外的同卷隔离区并生成规范副本。R2 结果必须与当前清单哈希匹配，错误全部处理后才能改数据库。原始 source key 与 `_catalog-backups/` 副本在引用更新确认前保留。

本地 `apply-local --manifest <清单> --quarantine <隔离目录>` 使用 APFS 写时复制，原文件与规范文件是独立 inode，回退副本不会随新文件编辑而改变。`rollback-local` 在检查规范文件未被后来修改后恢复原路径。数据库回滚使用对应 `rollback.sql`，不可套用其他批次清单或忽略后续人工编辑。生产与本地 D1 的 ID 可能不同，不能直接套用同一套逐行更新 SQL。

本次素材范围为 `/Users/fenghe/web-project/source/phonewalls`，操作证据位于 `tmp/mixed-wallpaper-2026-10-26/`。Huawei Mate 80 Pro 改名保留原 slug；Enjoy 10 Plus 与 Nova 5 Pro 重复记录合并后，旧 `-2` 静态详情链接通过 308 跳转保留五语言及查询参数。`huawei-matepad` 从五语言导航与 SEO 移除，其设备/素材及翻译按本次明确删除要求处理。

`0019_initial_upload_prefix_during_collection_deletion.sql` 需随 `0018` 一并应用：在另一类型删除期间，未配置目录的设备允许由未锁定类型首次授权确定目录。上传前不先执行普通设备 PATCH；已有目录变更仍受删除保护。首次设置可能使尚未开始执行的删除确认清单过期，刷新后重新确认即可；已认领删除任务可继续完成。

存量规范化遇到本地动态封面与 R2 当前封面不一致时，先核对视觉内容与历史修复归档，不得仅凭远端版本或文件大小判断哪个版本正确。先运行只读探针 `node scripts/catalog-normalization-cover-reconciliation.mjs --manifest <冻结清单>`：仅处理准备日志中失败的 `compress_key`，逐个核验其所有存活原文件的 SHA-256，确认远端封面是完整 WebP 并保存哈希、ETag 与本地证据副本，输出独立 `remote-cover-reconciliation/overlay.json` 与报告。已完成的原文件完整哈希证据仅在当前 ETag、大小均不变时复用；原文件不匹配仍必须阻止操作。

首次 R2 准备结束后再次运行探针，覆盖后续发现的封面差异。确认所选远端封面的视觉版本确实应当保留，审核覆盖清单及其 SHA-256 后，使用 `--evidence-overlay <覆盖清单> --overlay-sha256 <审核哈希> --retry-errors-only` 重试。该模式只复用**同一冻结清单**本轮已成功核验的不可变对象，重试最新失败与尚未处理的操作，最终结果仍须覆盖完整对象数；跨清单续跑继续逐项核对远端 ETag 和大小。覆盖清单只能修正预览封面的预期字节，不能改变原文件、业务 SQL、目标路径或冻结清单哈希。

本地规范化会通过同卷临时目录改名修正 APFS 大小写别名，按浅层到深层处理品牌与型号目录；只对 `samefile` 的同一目录改名，不合并大小写敏感卷上的不同目录。旧/新名称、临时路径及 inode 写入隔离区的 `local-operations.jsonl`，支持中断恢复和反向回滚。被移除的 MatePad 目录连同说明文件、`.DS_Store` 与 AppleDouble 元数据一起隔离。

完成 `apply-local` 后，运行 `python3 scripts/catalog-normalization.py mirror-cover-overlay --manifest <冻结清单> --overlay <覆盖清单> --quarantine <同一隔离目录>`，将已核验的线上封面同步到本地规范目标。旧本地封面及替换前规范副本均保留在隔离区；`rollback-local` 先撤销这些封面替换，再恢复原文件和原目录大小写，后续人工修改会阻止回滚覆盖。

清理规范化后的旧 R2 路径前应用 `0020_deleted_video_preview_reference_guard.sql`。清理计划需要同时检查生产与本地开发库中所有状态的原图、封面和动态推导预览引用；先对确认无引用的旧 key 登记删除标记，再用新的生产快照确认标记及引用，并核对原对象和备份 ETag 后逐个条件删除。保留所有规范目标和备份，不按目录递归清理。已删除预览也由数据库触发器保护，迟到的动态原图引用不能绕过此标记。

视觉核验确认本地封面主体更完整、远端旧别名为黑帧或动画展开前帧时，使用经逐项审阅的本地优先覆盖清单，并显式传入 `--cover-authority local`。每项必须保留冻结清单选定的本地 SHA-256，同时固定已测量的远端旧封面 SHA-256 和全部原文件归属证明。脚本单独核验并备份远端旧字节，再以带内容哈希签名的条件 PUT 写入**新的规范目标**；不会覆盖旧 source key 或内容不同的已有目标。原文件差异仍然阻止处理，不能用封面选择绕过。

本地优先日志中的 `source_sha256`、`backup_sha256` 标识远端旧封面；`target_sha256` 与兼容字段 `sha256` 标识冻结清单的本地封面。`sourceInfo`、`backupInfo` 的大小可与 `targetInfo` 不同，删除规划不得用单个哈希或大小替代双版本证明；另需核对 `cover_authority='local'`、`coverAuthorityOverlaySHA256` 和已验证的 `authority_originals`。此模式下 `apply-local` 本身已使用正确封面，不执行远端封面镜像。少量失败重试建议并发 8–16；GET 核验允许 180 秒，完整结果仍须核对全部清单对象。

本次对比后选择冻结清单中的本地动态封面：逐张审图确认主体更完整，且对应原视频哈希一致。审核清单位于 `remote-cover-reconciliation/overlay-local-reviewed.json`，重试额外使用 `--cover-authority local`。该分支独立保存旧远端封面的 `source_sha256` / `backup_sha256`，以冻结本地字节作为新规范目标的 `target_sha256`；备份与目标大小允许不同，不能把目标哈希当成旧对象清理证据。新目标采用条件写入，旧远端封面只备份不覆盖。本地 `apply-local` 已使用所选封面，此分支不再运行远端封面 mirror；该 mirror 命令仅供另行选择远端版本时使用。

### 2026-10-26 执行结果与回退材料

生产已应用 `0018`、`0019`、`0020`，规范化前完整备份为 `tmp/mixed-wallpaper-2026-10-26/before.sql`。冻结清单 `catalog/manifest.json` 的 SHA-256 为 `7c6e8e8e67b4a5e26a534badabecd6a1d999da764fdc1dc25604869032d74c86`；本地封面审核清单的 SHA-256 为 `cbfc0370cb4bfe7439b84bb06a48ff6dc737793408d7197a94feb20ce16d1a32`。共 16,336 项 R2 备份/目标准备全部核验通过，原图不以封面差异为理由跳过校验。

生产逐行核验 8,680 项变更，前后差异与清单完全一致：设备 1,219 → 1,215，壁纸 11,601 → 11,518，静态翻译 6,095 → 6,075，动态翻译 665 → 665。删除 71 条内容完全一致的重复壁纸与 12 条 MatePad 壁纸；合并重复型号时保留独有原图、发布/主图及标签，翻译非空差异留在审核清单，不覆盖未涉及的人工内容。保留标准型号 slug，两个被合并的 `-2` 旧详情地址由本次代码提供五语言 308 跳转。

本地开发库使用独立的 `local-sync/plan.json` 与 SQL，逐项回读 7,641 项变更及外键检查通过，保留本地 ID 和独有记录：设备 1,195 → 1,191，壁纸 11,015 → 10,934，静态/动态翻译数量保持 1,375 / 655。此前仅在本地开发库保存的十段 Galaxy A22 视频保留，没有自动恢复为生产发布内容。

本地文件已执行 16,077 项操作：15,753 次规范路径迁移、236 个完全重复文件隔离、24 个 MatePad 文件隔离及 64 个无歧义预览补配；81 个真实格式/扩展名不一致问题已纠正。品牌与型号目录按实际 APFS 存储名称检查，未遗留大小写别名；Mate 80 Pro 名称、Mate 70 Pro(+) 重复目录和 MatePad 删除均已核对。后续发现旧 `Live/` 仍有 13 套输入（OnePlus 16 三套、Galaxy A22 十套），已补齐目录迁移；详情见下方收尾记录。

旧 R2 清理清单为 `prune/plan.json`，SHA-256 为 `d784fb39d97e0e6217146ed09ad7824614d9b554b79b453fe717d1a66b03bebb`。16,233 个源 key 均已确认无生产/本地引用、备份可用，且已在两库登记删除标记。按 ETag 条件删除完成；瞬时网络中断后通过持久日志恢复，不删除规范目标或 `_catalog-backups/`。旧对象最终状态、MatePad 命名空间及备份抽查见 `prune/final-verification.json` 和 `prune/final-r2-verification.json`。新 CDN 封面实际读取返回 200，新目录视频预览返回带 `Content-Range` 的 206。

本地原文件隔离目录：`/Users/fenghe/web-project/source/phonewalls-catalog-backup-2026-10-26`；远端原对象备份前缀：`_catalog-backups/1a29534492a912bc/`。回退时先根据清理计划恢复旧 R2 key 并核验，使用 `prune/tombstones-rollback.sql` 仅清除本批次、对应时间戳的删除标记，再执行生产 `catalog/rollback.sql`、本地 `local-sync/rollback.sql` 和文件 `rollback-local`。保留原有历史删除标记，不能直接清空整张删除表；之后有人工修改的记录须重新核对，不能强制覆盖。执行前快照和本地 SQLite 备份另存于本次目录中。

前后台代码验证完成，应用生产部署仍需按 AGENTS.md 确认。数据库与素材变更已执行；型号合并旧链接跳转、导航移除和新上传界面随本次应用代码部署生效。

### 旧 Live 目录收尾与本地运行修复

旧目录遗漏来自仅按 D1 现有对象前缀匹配本地来源：OnePlus 16 的三套素材实际上已经存在生产记录及规范 R2 目录，旧输入目录与当前 key 不同；Galaxy A22 的十套仅有本地开发库记录。不能将这两类情况一律当作未入库而保留第二套目录。脚本现按明确品牌与型号补充映射，未知 Live 品牌明确报错，不再静默留在旧树中。

补充清单位于 `tmp/mixed-wallpaper-2026-10-26/live-remainder/`。26 个文件已分别归入 `oneplus/OnePlus 16` 与 `samsung/Samsung Galaxy A22`，全部 SHA-256 校验一致。26 个 R2 目标核验通过，其中 OnePlus 六个既有对象与本地内容一致，Galaxy A22 二十个规范目标已从本地源文件补齐。十条本地素材记录的原文件/封面引用及准确大小已同步；生产素材发布状态未修改。源目录中的 `Live/`、大小写别名 `live/` 和根 AppleDouble 侧车已清理，原件位于主隔离目录下的 `live-remainder/`。该补充批次应先回退，再回退主批次，不能套用主批次旧目录映射。

本地运行使用 `http://localhost:3100/zh` 与 `http://localhost:3100/manager`。曾出现 `AnalyticsObserver` 的 Webpack factory 未定义错误，独立新地址正常、既有 localhost 浏览器缓存复现，确认是旧入口脚本与新模块引用不匹配。开发客户端的 App 入口文件名现包含构建哈希，Flight 清单使用对应新路径；不移除统计组件，不清除登录状态，生产构建命名保持原有规则。3100 端口上传 OPTIONS 已核验通过；不使用未配置上传跨域的新端口。

### 2026-10-26 Surface 桌面目录纠正与 CF 清理

发现 Surface Duo / Duo 2 的九张素材受 `phone_fold` 形态字段影响，被旧规则写到桶根 `microsoft-surface/`；另外五张 Duo 2 素材误归 Windows 品牌。目录选择现同时参考桌面品牌清单与设备分类，Surface 无论设备形态如何都使用 `desktopwalls/microsoft-surface/<型号>`。错误历史路径仅作为历史位置展示，不能继续作为上传目标；配置目录、显式上传授权和设备目录编辑均校验桌面品牌命名空间。脚本还会统一未入库来源的 `desktopwalls/Microsoft Surface` 别名以及 `Live/Microsoft Surface` 视频输入。

生产迁移保留实际设备形态、素材 ID、原始文件、发布状态及 canonical Surface 文案，将五张误归 Windows 的素材合并到既有 Surface Duo 2，并保留唯一主图；旧 Windows 设备的五语言文案存入变更清单，空缺字段才补入 Surface 文案。Surface 的 17 个设备均配置规范上传目录，生产目录共有 62 条素材。对旧 Windows Duo 2 静态详情 URL 增加五语言 308 跳转代码，需随本次修复代码发布生效。

本地两个错误目录中的 28 个文件已合并到 `desktopwalls/microsoft-surface`，SHA-256 核验一致；本地库独立同步相关素材及缺少的 Duo 设备和翻译，保留本地已有字段和设备 ID。本地 SQL 对新增行的重放使用经前置整行守卫验证的主键更新，避免重复目录约束和临时占位名称，已验证写入、幂等重放、完整回滚与外键。

证据位于 `tmp/surface-storage-2026-10-26/`：`before.sql`、`manifest.json`、`apply.sql`、`rollback.sql`、`local-plan.json`、本地回退 SQL 和 `r2-journal.jsonl`。共 67 个旧 R2 对象已先备份核验，再检查生产/本地引用并登记删除标记，按 ETag 条件清理；其中 39 个旧大小写目录对象没有任何数据库引用。用户明确要求保留回退备份，故 `_catalog-backups/` 不在删除范围。

旧的 `microsoft-surface/`、`desktopwalls/Microsoft Surface/` 及 `microsoft-windows/Microsoft Surface Duo 2/` 命名空间清理后应为空；规范 Surface 命名空间仅保存当前被引用素材。最终目录和线上核验见本次 `verification.json`、`r2-prefixes-after.json`。文件原件隔离于 `/Users/fenghe/web-project/source/phonewalls-catalog-backup-2026-10-26/surface-storage`；回退需先恢复 R2 老 key、清除本批删除标记，再回退数据库与本地文件，不覆盖后续人工修改。

在 Surface 清理后，还扫描了整个 R2 桶的 40,289 个对象（其中 16,406 个为明确保留的回退备份），联合线上/本地全部状态的素材、推导视频预览及设备资源引用，核对本项目目录。另有 222 个无引用旧素材：180 个修改时间超过一天，42 个为本轮整理日志能按 ETag 和大小证明的中间副本；没有将无法证明来源的新上传纳入删除。全部先核验、备份、登记删除标记，再按 ETag 条件清理；备份继续保留，不以文件数量变化宣称释放备份占用空间。清单、备份哈希、删除日志与标记回滚 SQL 位于本次 `global-unused/`。共计清理旧位置 289 个对象（Surface 67 个加其他遗留 222 个）；不删除外部站点目录、非壁纸资源或备份命名空间。

同次严格检查还发现 Huawei MateBook Fold 的 36 条桌面素材使用了大写品牌段 `desktopwalls/Huawei/`。已按相同流程迁移并校验 72 个文件到 `desktopwalls/huawei/`，同步本地/生产引用及设备上传目录，保留手机 Huawei 的根目录与实际分类。旧大写命名空间清理后为空；本地通过临时目录改名核对实际存储大小写，不能用大小写不敏感卷上的 `exists()` 判断是否仍有重复目录。本批独立清单、37 项引用/配置变更、备份及回退 SQL 在 `desktop-case/`。本次三个清理批次合计移除 361 个旧位置对象（67＋222＋72），回退备份全部保留。桌面品牌同时拥有手机入口时，手机类别继续使用手机目录，只有实际桌面设备进入桌面目录；独立桌面品牌 Surface 的折叠设备仍归桌面存储。


## 2026-10-26 Microsoft Design 日期补录

用户授权为 21 个缺日期合集估算并补入 `YYYY/MM`；原有 12 个日期保留。官方资源上传年月仅作为估算线索，不视作首次发布日期。Copilot App 与 Horizons 按用户授权估算为 `2025/08`。补录清单、来源、备份、版本条件及回退方法见 [Microsoft Design 导入记录](microsoft-design-import-2026-10-26.md#2026-10-26-估算年月补录)。生产写入后已逐字段核对，33 个合集均有日期，仅目标行日期及修改时间改变；不变更表结构、发布状态或素材。

公开列表、首页、动态卡片和详情在日期为空或仅空格时隐藏日期及关联文案和分隔符。部署前端代码后生效；未来新增或清空日期仍适用。
