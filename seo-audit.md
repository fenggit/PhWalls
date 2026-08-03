# PhWalls SEO 优化台账

## 2026-08-03 技术 SEO 与下载转化基线

### 审计范围

- 线上站点：`https://phwalls.com`
- 站点类型：多语言手机与桌面系统壁纸内容/下载站
- 目标地区：全球
- 语言：en、zh、ja、vi、zh-hant
- 核心转化：壁纸预览与原图下载成功
- 技术栈：Next.js 15 App Router、Cloudflare Pages、Cloudflare R2、GA4
- 本轮模式：审计后执行已验证的低风险优化

### 已知事实

- 代码已配置语言前缀、canonical、hreflang、sitemap、robots.txt、Organization/WebSite/CollectionPage/ImageGallery 等结构化数据。
- 2026-08-03 线上检查 `https://phwalls.com/zh` 时，HTML `lang` 为 `zh`，但 title、description 与两条 canonical 均为英文版本，其中 canonical 指向 `/en`。
- 同一线上中文首页输出两个 H1。
- 手机详情页的 ImageGallery 使用压缩 WebP URL，但 `encodingFormat` 取自 PNG/JPEG 原图；`datePublished` 使用 `YYYY/MM/DD`。
- 手机详情页输出 FAQPage Schema，但页面没有对应的可见 FAQ 内容。
- Desktop 分类页可从站内访问，但未包含在 sitemap。
- GA4 已加载；修改前下载成功后才发送名为 `wallpaper_download_click` 的事件，无法区分下载意图、成功与失败。
- 修改前自动识别到的路径语言也会写入 cookie/localStorage，无法区分用户主动选择与自动推断结果。
- 修改前品牌与 Desktop 分类落地页的标题、描述、合集数量文案及社交分享 metadata 均为英文硬编码，非英文页面的正文与语言信号不一致。

### 待验证信息

- GSC 最近 7/28/90 天的点击、曝光、CTR、平均排名与索引覆盖。
- GA4 自然搜索落地页、预览率、下载点击率、下载成功率及移动/桌面差异。
- Cloudflare 5xx/404、重定向链、机器人请求与静态资源缓存命中率。
- Core Web Vitals 的真实用户数据，尤其是移动端 LCP、INP、CLS。
- “official”“4K/5K/6K”等内容主张对应的来源与实际图片分辨率证据。

### P0-P3 问题与处理

| 优先级 | 问题 | 证据与影响 | 本轮处理 | 验证方式 |
| --- | --- | --- | --- | --- |
| P1 | 非英文首页输出英文 canonical 与 metadata | 中文页 canonical 指向 `/en`，可能造成语言页信号冲突 | 首页新增按请求语言生成的 metadata，SEO 兜底标签同步使用当前语言 | 检查 5 个语言首页的 title、description、canonical、hreflang |
| P1 | ImageGallery 的 URL、格式和日期不一致 | WebP `contentUrl` 被标成 PNG/JPEG，日期不是 ISO 格式 | 按实际公开资源输出 `image/webp`，发布日期标准化为 `YYYY-MM-DD` | 解析详情页 JSON-LD 并运行 Schema 校验 |
| P1 | 不可见 FAQ 与 FAQPage Schema 不一致 | 页面无可见问答，存在结构化数据合规风险 | 移除 FAQPage Schema；保留真实可见的集合事实 | 检查详情页不再输出 FAQPage |
| P1 | 下载漏斗无法区分意图与结果 | 单一事件在成功后上报且命名为 click | 拆分预览、下载点击、下载成功和下载失败事件 | GA4 DebugView 与网络请求核对事件顺序 |
| P1 | 自动语言与用户选择使用同一持久化状态 | 自动识别结果会覆盖 cookie/localStorage，后续无法判断用户是否主动选择 | 增加主动选择标记；无标记时优先浏览器语言，有标记时优先用户选择 | 清空标记后使用不同 Accept-Language 访问无前缀 URL，并验证手动切换后保持选择 |
| P2 | Desktop 分类页未进入 sitemap | `/desktop/{category}` 是可索引入口但 sitemap 缺失 | 将有效的内部 Desktop 分类加入 sitemap | 检查 sitemap 包含 5 个 Desktop 分类及语言 alternates |
| P2 | 首页存在两个 H1 | 移动与桌面标题同时存在于 DOM | 合并为单个响应式 H1 | 桌面与移动 DOM 各检查一次 H1 数量 |
| P2 | 非英文品牌与 Desktop 分类页仍输出英文 SEO 文案 | `/zh/samsung` 的可见描述、metadata 与结构化数据描述为英文，所有品牌共用路由而受影响 | 接入 en、zh、ja、vi、zh-hant 文案模板，统一 H1、正文、metadata、Open Graph、Twitter 与 CollectionPage Schema 的语言 | 抽查 5 种语言的品牌页和 Desktop 分类页，并按语言目录比较 CTR 与查询词 |
| P2 | 手机详情页集合事实段仍为英文 | 中文详情页底部摘要与语言不一致 | 待按品牌小批量本地化，并在 14/28 天观察 | 抽样品牌页并比较收录、CTR、停留与下载 |
| P3 | 多处存在 4K/5K/6K 与 official 主张 | 数据仅记录文件大小和类型，未记录分辨率或来源 | 本轮不改核心主题；先补来源/分辨率字段或证据 | 数据抽样、图片尺寸检测、来源台账 |

### 本轮改动与回滚

- 改动不改变公开 URL、现有重定向、详情页 canonical 或壁纸数据。
- 如首页语言索引出现异常，回滚 `src/app/page.tsx` 与 `src/app/layout.tsx` 的动态首页 metadata。
- 如结构化数据校验异常，回滚手机/桌面详情页的 ImageGallery 与 BreadcrumbList 调整。
- 如 GA4 事件量异常，回滚 `src/lib/analytics.ts` 及预览/下载组件事件调用；下载功能本身不依赖埋点。
- 品牌与 Desktop 分类页本地化不改变 URL、canonical 或 hreflang；如搜索摘要异常，可回滚对应 SEO 文案 helper 与页面接入。

### 7/14/28 天复核

- 7 天：检查 sitemap 抓取、语言 canonical、索引覆盖、Schema 错误、5xx/404 与 GA4 事件是否稳定进入。
- 14 天：比较自然搜索落地页的预览率、下载点击率、下载成功率及失败率；按移动/桌面和语言目录拆分，并复核品牌页查询词与 CTR。
- 28 天：比较各语言目录的曝光、CTR、平均排名与有效下载，决定是否小批量本地化品牌页和详情页摘要。

### 指标口径

- 预览率：`w_preview_wallpaper(action=open)` / 详情页或首页会话。
- 下载点击率：`w_wallpaper_download_click` / 预览打开次数。
- 下载成功率：`w_wallpaper_download_success` / 下载点击次数。
- 下载失败率：`w_wallpaper_download_fail` / 下载点击次数。
- 自然搜索有效下载：默认渠道组为 Organic Search 且触发 `w_wallpaper_download_success` 的会话或用户。
