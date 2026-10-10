# 动态壁纸 URL 与 SEO 修正计划

**目标：** 将动态首页与品牌入口迁至 `/live-wallpapers`，保留已公开的机型详情 URL，并统一 SEO 标签输出。

**方案：** 复用现有页面与多语言逻辑，在中间件合并旧入口和域名规范化重定向。SEO 标签统一交给 Next.js Metadata API，移除根布局重复兜底，并在构建时让 Next.js 15.5 Edge 入口遵循 htmlLimitedBots 配置；通过实际 Cloudflare Edge 产物确认标签完整位于 head。只允许抓取经过发布状态核验的视频预览代理，原图与视频下载链路保持原样。

**约束：** 不部署生产、不修改数据或 R2 文件、不新增依赖或测试框架，使用当前 checkout。五种语言全部覆盖；无语言路径继续使用临时语言重定向，显式语言旧入口使用 308。末尾斜杠在中间件统一处理，静态资源与后台路由保留原有规范化行为。

- [x] 为旧入口迁移、多语言 canonical、sitemap 与设计页标题增加回归用例；运行现有 Node 测试，确认修复前失败。
- [x] 在 `src/app/live-wallpapers/` 复用原动态首页和品牌页，原路由保留重定向兼容页；在中间件添加旧入口重定向；统一 Header、搜索、首页目录、详情返回链接、canonical、语言 alternate 与 sitemap。
- [x] 删除根布局手动输出的 Title、Description、canonical 及重复 robots，保留各路由 metadata；删除不再需要的 `route-description.ts`；使用局部构建 loader 修正 Next.js Edge 入口的硬编码流式输出，模板变更时明确中止构建；修正设计页标题中重复品牌名。
- [x] 在 robots.txt 对 `/api/files/preview?key=` 添加精确抓取例外，保留 `/api/` 的其他限制；不暴露签名 URL 或 R2 原图直链。
- [x] 运行相关回归测试、`npm run lint`、`npm run build` 与 Cloudflare Pages 构建；使用 `scripts/check-seo.mjs` 检查生产 HTML、head 中唯一标签、多语言链接、旧地址、sitemap 和视频抓取；站点地图按规范 URL 去重，兼容本地旧数据重复合集。
- [x] 审查最终 diff，更新 `release-note.md` 与本计划的验证记录。停止用于检查的临时生产预览服务。

## 验证记录

- 修复前：迁移、设计页重复品牌、旧地址斜杠以及本地重复 sitemap 用例均复现问题。Cloudflare 实际 Edge 输出确认 metadata 被硬编码为流式模式，关键标签位于 body。
- 修复后：`node --experimental-transform-types --test tests/*.test.mjs` 通过 132 个用例；`npm run lint`、`npm run build`、`npm run pages:build` 均通过。
- Cloudflare Pages 产物在本地 Worker 预览；普通浏览器 UA 与 Googlebot UA 各通过 77 项 SEO 检查：55 个页面（五种语言）、20 个旧地址迁移（含斜杠和查询参数）、站点地图、视频抓取规则。每页 title、description、canonical 均仅有一份且位于 head；语言替代链接完整。
- Edge 预览使用 JSON 回退数据；D1 的独立动态文案、静态／动态区分及草稿权限由现有回归用例验证。未改动线上 D1 或 R2，也未部署生产。
- 使用 webpack NormalModuleFactory 对 Next.js Edge SSR 的生成源添加局部 loader，不改动依赖文件，不改变入口依赖字符串或客户端导航机制；真实 Next 模板的行为与不兼容模板中止构建均有测试。
- 独立代码复核完成；指出的旧地址与后台末尾斜杠兼容问题已修复并覆盖回归测试。临时预览服务已关闭。
