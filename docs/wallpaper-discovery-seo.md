# 壁纸发现与 SEO

本文描述当前主题页、内链、多语言收录和缓存规则。页面行为以路由、`src/lib/seo-indexing.ts`、`src/lib/wallpaper-themes.ts` 与 Cloudflare 配置为准。

## 合集导语与相关推荐

手机、桌面和动态合集在图库后展示同类推荐。默认显示 6 项，最多 8 项；候选须为同品牌、同设备类型和同媒体类型的已发布、未删除合集。排序优先同系列和原始尺寸相近的设备，并固定包含发布日期相邻的前后合集，保证旧合集也有站内入口。

`collection-intro.ts` 统一生成正文、metadata 和图库结构化数据。导语根据当前可见素材计算张数和原始尺寸，多尺寸时列出主要尺寸，未知尺寸只说明已知尺寸。后台多语言描述只维护画面、风格、型号范围和适配场景，不应重复张数、4K、无裁切或动态壁纸兼容性等未经逐项核验的承诺。

## 主题页

主题页固定为十个已审核主题：`dark`、`gradient`、`minimal-geometric`、`anime`、`abstract`、`nature`、`photography`、`floral`、`technology`、`illustration`。支持 `en`、`zh`、`ja`、`vi`、`zh-hant`，地址为 `/{lang}/themes/{slug}`。

`wallpaper-themes.ts` 是主题白名单和标签匹配规则的唯一来源；`theme-selections.ts` 只保存审核后的 D1 素材 ID 与顺序。运行时再次验证素材为静态、已发布、未删除、具有原始尺寸、预览图和匹配标签；相同原图 key 在单页去重。无效素材留出空位，不自动以未经审核的素材补充。

主题页及首页主题入口使用实际压缩图作为封面，显示当前可见数量。封面失效时回退到同主题的其他有效素材；空主题不输出无图片卡片。标签允许链接到已定义主题，不能生成颜色、尺寸、标签组合或分页的可索引页面。

新增主题、调整候选或增加语言前，应先人工审图、补齐五语言文案、确认搜索意图不重叠，并更新 sitemap、测试和本文档。

## 内链与旧路径

品牌页和动态壁纸分类页的卡片超过首屏分页数量时，在卡片区域下方输出全部合集的普通 HTML 链接列表。卡片区仍可“加载更多”，但不生成 `?page=N`、`rel=prev` 或 `rel=next` 的分页索引。

`google` 与 `google-pixel` 通过 `RELATED_BRAND_LINKS` 双向链接，分别表达 Google 壁纸应用合集和 Pixel 设备合集。中间件 `LEGACY_CATEGORY_ALIASES` 将已登记的单段旧分类 308 跳转到现行分类；其他未知路径保持真实 404。

## 多语言收录与 hreflang

`sitemap.ts` 和页面 metadata 共用 `src/lib/seo-indexing.ts`。

- 英文详情页全部允许收录。
- 非英文详情页只有素材数达到 `LOCALIZED_DETAIL_MIN_COUNT`，且品牌属于该语言的 `LOCALIZED_DETAIL_BRANDS` 时才收录。
- 不符合条件的页面仍可访问和切换语言，但返回 `noindex,follow`，canonical 指向自身，不输出 hreflang，也不进入 sitemap。
- 品牌页、列表页、主题页和静态信息页继续输出五语言版本。
- hreflang 仅使用 `en`、`zh-Hans`、`ja`、`vi`、`zh-Hant`；英文可收录时另输出 `x-default`。
- 根布局不设置默认 canonical 或 hreflang，避免 404 继承首页元数据。

修改阈值或市场品牌名单前，应先以 GSC 分语言曝光、点击和索引数据验证，不能只按 URL 数量调整。

## HTML 边缘缓存

Cloudflare 中已启用 Cache Rule `Cache Public Brand and Detail HTML`，仅缓存 `phwalls.com` 上无查询参数的品牌、桌面分类、动态分类和合集详情 GET/HEAD HTML。规则排除 RSC、Next Router 预取/状态树、`Authorization` 请求，以及携带 `phwalls-lang-selected` 或 `phwalls_admin_session` Cookie 的请求。

边缘 TTL 为 7200 秒，浏览器 TTL 绕过缓存。状态码大于等于 300 不缓存；分页、追踪参数和 `_rsc` 请求继续回源。该规则与 D1 展示查询约 60 秒的 Cache API 缓存独立。

发布、下架、编辑文案或部署页面后，旧 HTML 最多可能保留 2 小时。需要立即生效时，在 Cloudflare“缓存 → 配置 → 自定义清除”中按完整 URL 清除受影响页面，包含其五语言品牌页和详情页。新增手机品牌后同步更新缓存规则的品牌 slug 白名单。

用连续 GET 请求检查 `CF-Cache-Status: HIT` 与 `Age`。不同边缘节点独立填充，首次请求、过期和驱逐后仍会回源。不要缓存重定向、错误页或带用户语言偏好的响应。

## 验证与观察

```bash
node --test scripts/tests/wallpaper-discovery.test.mjs scripts/tests/collection-scenes.test.mjs
npm run lint
npm run build
npm run pages:build
```

使用含 D1 副本的预览环境执行 `node scripts/check-discovery.mjs http://localhost:<端口>`。发布后用 GSC 观察索引、曝光、点击、抓取响应时间、404 和重定向比例，并抽查渲染后的 HTML 含有“全部合集”链接。5xx 和慢请求需结合 Cloudflare 日志及 GSC 抓取统计排查。
