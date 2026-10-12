# PhWalls Search Console 收录检查（2026-10-12）

## 报告与口径

资源：`sc-domain:phwalls.com`。通过已登录 Chrome 查看网页索引报告，页面标注上次更新为 2026-10-09；个别样本显示更晚抓取日期。总览与单页网址检查存在延迟差异，以单页检查和实时测试判断该样本的当前状态，不能把所有排除记录视为待修复故障。

总览：4,468 页已收录，1,930 页未收录。以下结论基于报告样本、线上 HTTP 响应、当前 sitemap 和源码；没有逐页审计全部未收录 URL。

| 原因 | 页数 | 检查结果与处理 |
| --- | ---: | --- |
| 已发现 - 尚未编入索引 | 1,582 | 样本包括 ASUS ROG、Windows、Omarchy 与多款桌面合集；ASUS 英文品牌页单页检查确认尚未抓取，Googlebot 实时测试通过，已成功请求收录并进入优先抓取队列。不能据此认定全部页面存在相同问题，也不能保证全部收录。 |
| 已抓取 - 尚未编入索引 | 93 | 日语 Ubuntu 8.04 在总览列表中仍被排除，但单页检查已显示收录、抓取成功、允许收录，Google 选择该页自引用 canonical。需要用单页最新结果区分仍未收录与报告延迟。 |
| 网页会自动重定向 | 180 | 重定向源 URL 本身不应成为收录目标，需以最终有效页面为目标。没有对该分类逐条核验。 |
| 重复网页，用户未选定规范网页 | 18 | 首屏样本为旧 Xiaomi 下的 Redmi/POCO 地址及旧 Vivo 下的 iQOO 地址，最后抓取主要在 7–8 月；线上 POCO F3 旧路径已经 308 到新分类，现有中间件已覆盖这些品牌迁移。 |
| 被 noindex 标记排除 | 17 | 样本包含旧 Google Aluminium OS 分类以及 Huawei P30 Pro、Nova 13 Pro、Samsung S26 Ultra。线上抽查这些旧机型地址返回 404/noindex，且不在当前 sitemap。旧 Google 分类有确定的新地址，已修复迁移；其他机型未确认内容等价，不擅自跳转到基础机型或取消 404 的 noindex。 |
| 未找到（404） | 2 | `/desktop/wallpapers` 是失效的桌面列表入口，已修复迁移到 `/desktop`；另一个是 `https://static.phwalls.com/`，素材域名根目录没有页面，无需创建索引页面。 |
| 备用网页（有适当的规范标记） | 2 | 该分类表示 Google 采用其他规范页面，本身不等于故障。本次未逐条检查这两个地址。 |
| 服务器错误（5xx） | 36 | Search Console 已显示验证通过，没有证据支持继续修改服务器逻辑。 |

## 已确认的线上路由问题

| 旧路径（语言前缀略） | 当前线上响应 | 修复后的目标 |
| --- | --- | --- |
| `/desktop/wallpapers` | 无语言时 307 到英文同路径，英文路径 404/noindex | `/desktop` |
| `/desktop/google-aluminium-os` | 英文路径 404/noindex | `/desktop/google-os` |
| `/desktop/wallpapers/google-aluminium-os/google-aluminium-os` | 越南语路径 404/noindex | `/desktop/wallpapers/google-os/google-aluminium-os` |

新 Google Aluminium OS 英文合集地址在线返回 200、`index, follow` 和对应的自引用 canonical。修复保留原合集 slug，不修改素材文件路径。

明确语言地址使用 308；无语言地址继续根据既有浏览器/用户语言规则使用 307 和 `private, no-store`。五语言、www 域名规范化和末尾斜杠合并到一次跳转，分享查询参数和片段保留。既有明确语言偏好 Cookie 行为沿用原规则。

## sitemap 与机器人访问

- 当前线上 sitemap 有 6,825 个 `<loc>`，全部唯一；五种语言都有独立 URL。
- 旧 Aluminium OS 分类地址不在 sitemap，新 Google OS 下的同名合集在 sitemap。
- 当前 robots.txt 允许公开页面；素材原图下载与管理 API 仍被禁止抓取，已发布视频预览代理有单独 Allow 规则。
- ASUS 英文品牌页实时测试结果为“网址可编入 Google 索引”；请求收录后界面确认“已将网址添加到优先抓取队列中”。

## 验证与发布状态

- 路由回归：24 项通过；新增迁移用例在修复前失败，修复后通过。
- 原工作区 `npm run lint`、`npm run build` 均通过。
- 独立代码检查没有发现需要修复的问题。
- 从检查时的 HEAD `21c8845` 创建发布工作区 `/Users/fenghe/.codex/worktrees/gsc-indexing-fix/PhWalls`，只复制本次中间件、测试和 Release Note 改动，未混入其他未提交的后台改动。
- 发布工作区 `npm run pages:build` 通过，产物为 `.vercel/output/static/`；路由回归与 lint 通过。
- Release Note 已追加到远端最新正式 tag `v2.0.2` 的下一待发布版本 `v2.0.3`。
- 尚未部署，尚未为未上线的旧桌面迁移提交“验证修正情况”。

## 上线后的核验

1. 部署已准备的隔离产物前取得用户确认，遵循 AGENTS.md 的生产部署要求。
2. 在正式域名检查三类旧桌面路径及五语言目标，确认一次跳转后为有效 200 页面、正确 canonical 且允许收录。
3. 通过 Search Console 对修复涉及的 404/noindex 分类发起验证；若其他仍不存在的机型 URL 导致分类验证未通过，保留真实 404，记录其具体原因。
4. 对确实仍未抓取的重要页面继续做实时检查并按需请求收录。Google 的抓取与索引决策无法通过代码或重复提交强制完成。
