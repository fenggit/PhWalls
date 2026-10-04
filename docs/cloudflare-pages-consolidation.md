# PhWalls 前后台 Pages 项目合并

## 目标与当前进度

目标：保留 Pages 项目 `phwalls`，同时服务 `phwalls.com`、`www.phwalls.com` 和后台域名 `a.phwalls.com`。继续使用既有 D1 数据库 `phwalls`，不移动数据库或 R2 文件。后台登录、同源写入校验、域名限制与 `noindex` 保持有效。

2026-10-04 已完成生产合并：`a.phwalls.com`、`phwalls.com` 和 `www.phwalls.com` 均在 `phwalls` 项目中处于 active，后台 CNAME 已由 `phwalls-admin.pages.dev` 改为 `phwalls.pages.dev`，代理设置保留。验证 Git 提交 `4a5a288` 的自动生产部署成功后，按用户明确要求删除旧 `phwalls-admin` 项目及其历史部署；D1、R2 和统一项目保持不变。

用户已将 Git 生产分支调整为 `release/2.0.0` 并确认线上迁移。合并时的生产部署为 `23ee2d41-dd2e-43a5-a4e3-326d78b96555`，部署分支为 `release/2.0.0`，Git 生产自动部署保持启用，构建命令已设为 `npm run pages:build`。该次发布使用已验证的本地工作区构建；当前应用改动、部署别名及 `wrangler.toml` 中的后台域名变量随后统一提交到该分支，由 Git 推送触发后续自动部署。

| 项目 | 迁移前配置 | 已完成配置 |
| --- | --- | --- |
| `phwalls` | GitHub 自动部署；生产分支 `master`；公开站点域名 | 统一前后台；生产分支 `release/2.0.0`；增加 `a.phwalls.com` |
| `phwalls-admin` | Direct Upload；生产分支 `release/2.0.0`；`a.phwalls.com` | 验证统一项目成功后已删除 |
| 构建命令 | `npx @cloudflare/next-on-pages@1` | `npm run pages:build`，确保先生成首页索引 |
| D1 | `phwalls-admin` 生产已绑定 `DB`；`phwalls` 预览有 `DB`，生产未列出此绑定 | `phwalls` 生产绑定现有数据库 `70bf042e-a064-4019-a245-0fbf934f1cb0`，绑定名 `DB` |

迁移前的 `master` 尚未包含后台代码，不能仅移动域名到它原有的生产部署。方案选择已有后台的 `release/2.0.0` 作为统一生产分支；更换分支后，该分支的后续推送将同时更新前后台，其他分支为预览。手动发布本地构建不会将改动自动写入 Git，应用代码与部署配置应在同一分支一起提交，避免自动构建部署旧版本。

## 生产操作顺序

1. 核对并保留迁移前 Pages 项目配置、生产部署 ID、域名记录与 DNS 记录。两个项目的配置快照已保存为 `/tmp/phwalls-merge-phwalls-before-20261004.json` 与 `/tmp/phwalls-merge-phwalls-admin-before-20261004.json`，文件权限为仅当前用户可读；不能将包含运行配置的备份提交到 Git。
2. 在 `phwalls` 配置生产 `DB` binding、`ADMIN_HOST=a.phwalls.com`、`WALLPAPER_DATA_SOURCE=d1`，保留现有 R2 与其他站点变量。`ADMIN_HOST` 同时登记在 `wrangler.toml` 的 `[vars]` 中，防止后续代码部署覆盖控制台设置。为目标项目加入 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` 和 `ADMIN_SESSION_SECRET`。Cloudflare API 不返回既有 Secret 原值，本次经确认使用 `.env.local` 已保存的三项配置，通过 Wrangler 的 stdin 批量上传，不写明文临时文件，不回显密钥。会话密钥变化可能要求重新登录。
3. 将 Git 生产分支与项目 `production_branch` 都设为 `release/2.0.0`，构建命令设为 `npm run pages:build`。保持其他 Git、预览策略与站点设置。
4. 在确认后发布本地验证通过的 Cloudflare Pages 构建到 `phwalls` 的 `release/2.0.0` 分支，先检查公开站点与数据库响应。域名暂时仍由旧后台项目服务，避免后台入口先指向不包含后台代码的部署。
5. 从 `phwalls-admin` 解除 `a.phwalls.com`，立即绑定到 `phwalls`，将该域名的 CNAME 目标调整为 `phwalls.pages.dev`。保留 Cloudflare 代理设置，等待自定义域名与证书状态为 active。域名解除和重新绑定期间可能有短暂不可用。
6. 检查 `https://a.phwalls.com/` 跳转 `/admin`、后台页面含 `noindex`、未登录受保护的管理 API 返回 401，会话查询返回 `authenticated: false`，检查 `https://phwalls.com/admin` 与 `/api/admin/session` 返回 404。使用有效后台会话检查列表读取，公开站点检查五语言详情页与 sitemap。完成公开发布后执行 `npm run indexnow`。

现有 Wrangler OAuth 可以读取并配置 Pages，但 DNS 记录 API 读取返回 403（错误码 10000）。本次通过已登录的 Cloudflare 控制台更新 CNAME，并在 DNS 记录页确认 `a.phwalls.com` 指向 `phwalls.pages.dev`、状态为已代理。原域名解除后，目标登记一度返回 Cloudflare 内部错误 8000000；等待平台释放旧关联后重试成功，最终域名验证与 SSL 状态均为 active。

## 发布前验证

2026-10-04：`npm run lint` 与 `npm run pages:build` 通过，后者已完整执行 Next.js 生产构建并生成 Cloudflare Worker（含后台与管理 API 路由）；`node --experimental-transform-types --test tests/*.test.mjs` 的 51 项既有测试全部通过。另按生产环境配置检查中间件：后台根路径跳转 `/admin`、后台页面与 API 放行、带语言前缀的后台路径规范化、后台域名公开页面返回 404、前台域名后台页面与 API 返回 404。

线上 D1 已登记迁移 `0001` 至 `0010`，有 995 个设备、4,975 条多语言记录。此次合并只复用数据库绑定，不修改数据库内容；尚未登记的 `0011` 查询索引属于单独的性能优化迁移。

## 线上验证结果

- 前台首页、品牌页、Samsung Galaxy S25 的五语言详情页均返回 200，详情标题使用线上 D1 文案，canonical 保持对应语言路径；sitemap 返回 200，包含 5,145 个 URL。
- 前台域名 `/admin` 与 `/api/admin/session` 返回 404；后台域名 `/` 返回 307 到 `/admin`，`/admin` 返回 200 并输出 `noindex, nofollow`，后台域名 `/en` 返回 404。
- 会话查询未登录时返回 `authenticated: false`，使用本地已配置的会话密钥签发的短期验证会话时返回 `authenticated: true`，均为 `no-store`。没有在浏览器输入或修改管理员原密码。
- 有效验证会话下设备、壁纸、多语言与 R2 目录读取均返回 200；未登录设备接口返回 401。未新增、编辑、上传或删除业务数据。
- 最终 Pages 配置读回确认生产 `DB` 绑定、后台三个 Secret、`ADMIN_HOST`、Git 生产分支及自动部署配置都已保留。
- IndexNow 首次全量提交返回 403；验证线上密钥文件返回 200 且与本地一致、定向提交恢复后，再次运行 `npm run indexnow`，5,145 个 URL 全量提交获 HTTP 200。接收成功不代表已经收录。

## 部署入口

```bash
npm run deploy
```

`npm run admin:deploy` 是同一命令的兼容别名，会部署整个应用，也会影响公开站点。无需再次发布独立后台项目。

## 回退

旧 `phwalls-admin` 已删除，其部署与项目密钥不能再用于直接回退。统一项目故障时，优先在 Pages 控制台回滚 `phwalls` 到已验证的完整前后台版本，例如合并时的部署 `23ee2d41-dd2e-43a5-a4e3-326d78b96555`，保留三个域名及 D1 绑定，并检查代码与当前数据库结构的兼容性。

合并前的公开站点版本不包含后台，不能作为统一前后台的完整回退目标。若只回退公开数据源，设为 `json` 后使用仍包含后台的代码重新构建部署。恢复配置时保留 Secret 原值，不可把 API 快照中的空 Secret 值写回。

若将来需要恢复独立后台，应重新创建 Pages 项目、部署兼容代码并配置密钥与 D1，再迁移后台域名。不要删除 D1、R2 或历史迁移文件。
