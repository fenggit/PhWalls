# 壁纸后台与 D1 数据源操作说明

## 本地验证

以下命令只操作本机 D1，不影响线上数据库。本地开发服务器默认使用本机 D1；正式后台在独立 Pages 项目 `phwalls-admin` 的 `a.phwalls.com` 域名运行，并通过 `DB` 绑定访问线上 D1。

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

新建品牌、设备、设备改名与 JSON 导入都会写入 Unicode 与空白归一化键，数据库以该键阻止并发重复。`0005` 只对 ASCII 且内部没有连续空格的旧名称使用 `LOWER(TRIM())` 回填；遇到无法保证与应用归一化一致的名称会中止迁移。此时先按应用规则处理对应旧行，再重新执行迁移。后台新增品牌只写入 D1 品牌目录；现有公开站点仍使用静态品牌与 JSON 数据，需另行切换公开站点后才会展示新品牌。

后台代码推送到 Git 后不会自动更新独立项目。确认生产发布后执行 `npm run admin:deploy`；公开站点仍使用原有 `npm run deploy`，不要混用两个项目。后台项目的生产分支为 `release/2.0.0`。

当前公开站点 `phwalls.com` 仍运行旧版 JSON 数据源。后台保存到线上 D1 的发布改动，需要待公开站点升级并切换 `WALLPAPER_DATA_SOURCE=d1` 后才会显示在前台。

配置 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`ADMIN_SESSION_SECRET` 作为 Pages Secret。密码哈希可在本机生成：

```bash
read -s ADMIN_PASSWORD
ADMIN_PASSWORD="$ADMIN_PASSWORD" npm run admin:hash-password
unset ADMIN_PASSWORD
```

脚本会输出两种写法：Cloudflare Pages Secret 使用原始值；本地 `.env.local` 使用带 `\$` 转义的整行配置。Next.js 会展开未转义的 `$`，直接粘贴原始值会导致登录失败。生成工具要求管理员原密码至少 8 位；登录时输入原密码，不输入哈希。不要提交密码或 Secret。`ADMIN_SESSION_SECRET` 使用不少于 32 字符的随机值。未勾选“记住登录状态”时会话有效期为 12 小时，勾选后为 30 天；只保存签名的 HttpOnly Cookie，不在浏览器保存明文密码。轮换密钥时旧值可暂放 `ADMIN_SESSION_SECRET_PREVIOUS`，等待最长 30 天会话过期后移除。对 `/api/admin/login` 在 Cloudflare WAF 配置登录失败限速。

R2 存储桶需要允许 `https://a.phwalls.com` 和本地 `http://localhost:3100` 的 `PUT` 与 `Content-Type` 请求头。后台上传使用 15 分钟单对象签名 URL；原图与预览都上传并通过 R2 HEAD 核验后才写入草稿。图片上限 50 MiB，视频上限 200 MiB；视频原件支持 MP4/WebM，预览仍为图片。后台不会生成压缩图或视频封面。

上传时必须选择品牌。设备或系统可不选；此时选择以设备或系统命名的顶层文件夹，原图与预览图必须直接位于该文件夹的 `origin/` 和 `compress/` 子目录，不支持一次选择包含多个设备的父文件夹。上传队列先检查每对文件，再按完全一致的文件夹名称复用该品牌下已有目标，或建立草稿目标；仅大小写不同的同名目标需要手动选择。

## 生产切换

先备份 D1 与 JSON 数据，再在预览环境应用迁移、导入 SQL，并对比设备数、壁纸数、主要品牌页面、详情路径和站点地图。确认 R2 文件与 CORS 后，在生产 D1 应用迁移和导入，最后设置 Pages 环境变量 `WALLPAPER_DATA_SOURCE=d1` 并部署。生产写入和部署需单独执行；切换后只在后台维护 D1 元数据。回退时改为 `json` 并重新部署，JSON 文件始终保留。
