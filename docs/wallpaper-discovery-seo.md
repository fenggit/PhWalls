# 壁纸内链、真实导语与十页主题试点

更新日期：2026-10-18。代码部署与 D1 文案更新分别执行；代码尚未发布时，新路由不会在线上生效。

## 机型页

手机、桌面及动态合集在图库后、下载提示前输出 More Stock Wallpapers／More Live Wallpapers。默认六项，最多八项，同品牌且同设备类型，优先同系列、其次至少一组原图尺寸相同，再按发布日期补足。规范设备名用于系列匹配；翻译标题不参与识别。静态／动态分别统计，当前页、空合集、未发布及删除中的设备／素材不进入推荐。末尾链接品牌列表。链接、张数和实际单一尺寸随 HTML 输出，不依赖浏览器请求后再生成。

卡片显示最多三个本地化标签，+N 打开预览查看完整列表。仅十类已发布主题的映射标签可点击，其他标签保持文本。页面链接不生成颜色、尺寸、标签组合或分页索引。

`collection-intro.ts` 统一为正文、metadata 与图库 schema 生成导语。统计当前类型的可见素材数量，使用原始宽高；多尺寸列主要尺寸，有缺失时仅说明“已知原始尺寸”。不根据封面或文件名猜测尺寸，不一律宣传 4K。后台五语言描述维护特点、型号范围、裁切与设备场景；旧人工描述的标准下载开头和结尾只在展示时去重，具体说明保留。动态视频不声称可直接设为 iPhone 动态壁纸。

## 固定十个主题，支持五种语言

| 路径 | 名称 | 首批精选数量 |
| --- | --- | --- |
| `/en/themes/dark` | Dark Wallpapers | 15 |
| `/en/themes/gradient` | Gradient Wallpapers | 19 |
| `/en/themes/minimal-geometric` | Minimal Geometric Wallpapers | 13 |
| `/en/themes/anime` | Anime Wallpapers | 13 |
| `/en/themes/abstract` | Abstract Wallpapers | 18 |
| `/en/themes/nature` | Nature Wallpapers | 20 |
| `/en/themes/photography` | Photography Wallpapers | 20 |
| `/en/themes/floral` | Flower and Botanical Wallpapers | 17 |
| `/en/themes/technology` | Futuristic Technology Wallpapers | 17 |
| `/en/themes/illustration` | Illustration Wallpapers | 18 |

首批共 170 个展示位置，图片可在符合画面的多个主题出现。素材已逐图查看，删除了错分的花树动漫图、摄影与三维图混入插画页等候选，并剔除部分近似重复。极简几何采用 geometric 标签候选并人工确认简洁构图，不能要求两个标签同时存在而只剩一张。科技类从单张标签获取候选，不受设备单一主要风格限制。暗黑主题人工确认画面，不使用明暗配对字段筛选。

`wallpaper-themes.ts` 是唯一主题白名单和标签匹配配置；`theme-selections.ts` 仅保存已审核 D1 ID 与顺序。运行时再次校验静态、发布、删除、原始尺寸、预览图和标签；相同原文件键在单页去重。下架后留空缺，不自动填充新素材。每张图链接真实来源合集，预览下载继续使用 `/api/files/download`，不输出原图 CDN 直链。

首页提供十个主题入口，壁纸标签提供相关主题链接。主题支持 en、zh、ja、vi、zh-hant，每种语言均有完整标题、介绍、标签、画质说明和相关主题；来源机型名称从对应 D1 语言记录读取，缺少时回退英文或标准名。切换语言保留当前主题 slug，站内主题与来源链接保留当前语言。语言菜单禁用预加载，防止用户选择新语言之前缓存旧语言偏好的重定向。十个主题对应五十个语言 URL，各自使用规范地址，输出五语言 hreflang 与 sitemap；未知主题仍返回 404，不生成标签组合或额外主题。主题更新时间取精选素材、设备及源文案实际修改时间。

## 观察与扩量

上线后在 Search Console 按各语言 `/{lang}/themes/` 过滤，按十个主题汇总语言变体，逐页记录提交、收录、曝光、点击及查询词；以正式部署日期作为观察起点，至少观察一个完整 28 天周期。首批十页全部收录且各自获得自然搜索点击后，才评估新增二十页；时间到不自动扩量，未达标时优先检查主题意图、内容重叠、页面质量和入口。

新增事件 `wallpaper_theme_click`、`theme_wallpaper_preview`、`theme_source_click` 分别记录标签入口、主题预览和来源点击。现有下载事件仍沿用原口径；没有新增定时任务或自动提交 Search Console 的行为。IndexNow 仍由原有正式部署后的脚本执行。

## 验证

- `node --test scripts/tests/wallpaper-discovery.test.mjs scripts/tests/collection-scenes.test.mjs`
- `npm run lint`、`npm run build`、`npm run pages:build`
- 使用 D1 副本的生产预览执行 `node scripts/check-discovery.mjs http://localhost:<端口>`。

本次没有新增数据库字段、迁移、测试框架或运行时依赖。D1 描述语义与 API 说明已同步到数据设计、运维及小程序接口文档。

## 主题视觉展示

首页主题入口位于最新壁纸之后，使用各主题已发布精选素材的实际压缩图作封面，并展示当前可见张数；首选封面失效时回退到该主题仍可见的素材，空主题不输出空图片卡片。封面与张数复用带语言隔离的 D1 展示缓存。

分类图库采用两至五列的等比例网格，预览窗口为 4:5，图片可裁切以统一节奏；页面明确提示点击查看完整画面。原始分辨率如实保留，原图与下载流程不变。主题卡片直接展示全部标签，按需换行，不再用 +N 折叠；机型来源链接使用克制的文字样式。底部相关主题复用首页封面卡片，展示真实预览图、主题名与当前精选张数，仅查询当前主题的关联分类，沿用五语言路径及已发布素材校验。

## 内链、多语言收录与 hreflang（2026-11-06）

起因是外部 SEO 审计：品牌页只在 HTML 中渲染前 10 个合集，其余合集靠客户端“Load more”展开；相关推荐又总是指向较新的机型。按线上数据模拟，1,184 个手机合集里约 37% 在全站没有任何入链，约 50% 从品牌页出发无法爬到。sitemap 中五种语言共 7,050 条 URL，非英文详情页与英文版几乎同构。

### 内链

- 品牌页（`/[brand]`）和动态壁纸分类页（`/live-wallpapers/[category]`）的合集数超过分页大小时，在卡片区下方输出“全部合集”文字链接列表，每个合集都有 `<a href>`。卡片区仍保留前 N 张加“Load more”。不生成 `?page=N` 分页 URL，也不使用 `rel=prev/next`。
- 相关推荐（`rankRelatedCollections`）在原评分之外，固定加入同品牌、同设备类型、同媒体类型下按发布时间排列的前后相邻机型。展示顺序仍按系列与尺寸评分排列。这样时间线上每个合集至少有一条入链。
- `google` 与 `google-pixel` 品牌页互相链接（`RELATED_BRAND_LINKS`）。`google` 的五语言 SEO 文案改为“Google 壁纸应用合集”定位，与按机型整理的 Google Pixel 区分。

### 非英文详情页收录策略

`src/lib/seo-indexing.ts` 是唯一配置，sitemap 与页面 metadata 共用：

- 英文详情页全部收录。
- 非英文详情页需要同时满足两点：素材数 ≥ `LOCALIZED_DETAIL_MIN_COUNT`（8），且品牌在该语言的市场名单 `LOCALIZED_DETAIL_BRANDS` 中。
- 不满足的语言版本仍可访问，语言切换不受影响。页面输出 `noindex,follow`，canonical 仍指向自身，不输出 hreflang，也不进入 sitemap。
- 品牌页、列表页、主题页、关于页等非详情页继续五语言收录。
- 覆盖手机静态、手机动态与桌面详情页；桌面品牌不在任何市场名单中，非英文桌面详情页均不收录。

按 2026-11-06 的线上数据估算，非英文详情页从约 5,300 条降到约 1,180 条，sitemap 总量从 7,050 条降到约 2,900 条。名单与阈值目前按市场经验设定，拿到 GSC 分语言数据后应按真实曝光调整。

### hreflang

- `buildLanguageAlternates(path, languages?)` 每种语言只输出一个代码：`en`、`zh-Hans`、`ja`、`vi`、`zh-Hant`，英文可索引时另加 `x-default`。HTML 与 sitemap 使用同一函数，两边集合一致。
- 原来的 `en-US`、`zh-CN`、`ja-JP`、`vi-VN` 等重复代码已移除。
- 根布局不再设置默认 canonical 与 hreflang，避免 404 等页面继承首页的 `/en` canonical。所有公开页面都由各自的 metadata 声明。

### 旧路径跳转

中间件 `LEGACY_CATEGORY_ALIASES` 把单段旧简称 308 永久跳转到现行列表页：`asus-rog`、`rog-phone` → `/asus-rog-phone`；`infinix`、`tecno` → 对应 `transsion-*`；`windows`、`surface`、`ubuntu`、`chromeos` → 对应桌面分类。其余未知路径仍返回真实 404。

### 未在代码中处理的事项

- HTML 边缘缓存：Cloudflare Pages Functions 的响应不会按 `Cache-Control` 被 CDN 缓存，需要在 Cloudflare 后台配置 Cache Rule。D1 展示查询仍使用既有的 60 秒 Cache API 缓存，小程序接口文档依赖这一时长，没有改动。
- 5xx 与慢请求需要结合 Cloudflare 日志和 GSC「抓取统计信息」排查。
- “图片数 ≤ 2 且无曝光”的英文合集是否 noindex 或合并，需要 GSC 数据后再决定。

### 上线后观察

- GSC：“已发现 - 尚未编入索引”数量、英文详情页已编入索引数、各语言已编入索引数。
- 抓取统计信息：平均响应时间、每日抓取请求数、404 与重定向占比。
- 用 GSC 网址检查确认 `/en` 与品牌页对 Googlebot 返回 200，且渲染后的 HTML 包含“全部合集”链接列表。
