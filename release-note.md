# AppleWalls Release Note（不要随便修改）

## 版本历史

### v1.1.2 - 2026-06-11
- 优化移动端 Core Web Vitals（LCP/INP），针对 PageSpeed「未通过」做首批优化（暂不含图片自适应 srcset）
- 首屏首个分类前几张壁纸图固定 eager + 高优先级加载，不再依赖不可靠的 UA 嗅探，改善 LCP
- 为 LCP 图片来源 static.phwalls.com 增加 preconnect 预连接
- 壁纸预览模态改为 next/dynamic 按需懒加载并按需挂载，减小首屏 JS 体积
- 品牌落地页（SeoLandingPage）同步应用首屏图片优先级与模态懒加载优化

### v1.1.1 - 2026-06-10
- 修复 PageSpeed SEO 报告中首页被识别为 noindex、缺少 meta description 的问题
- 首页初始 HTML head 直接输出 title、description、robots、googlebot、canonical，提升搜索引擎抓取稳定性
- 仅对首页路径启用 SEO 兜底标签，避免影响品牌页和详情页的 canonical
- 调整 HTML-only bot 的 metadata 输出策略，降低流式 metadata 被抓取工具误判的风险

### v1.1.0 - 2026-06-09
- 新增桌面端壁纸
- 优化 Cloudflare Pages 静态资源缓存策略，图片和带 hash 的构建资源缓存 1 年，减少每次部署导致的重复拉取
- 统一壁纸预览接口缓存头，图片代理响应使用 1 年 CDN/浏览器缓存
- R2 图片上传时写入长缓存元数据，下载接口改为不缓存，避免附件响应被错误复用
  
### v1.0.2 - 2026-05-05
- 修改桶数据的存储结构
- 新增Honor 600、Samsung Galaxy F70e、Samsung W26 Fold
- 新增sony壁纸（05/29）

### v1.0.1 - 2026-04-08
- 新增 Android 模块壁纸
- 新增 Oppo K15 Pro 壁纸
- 新增 Huawei Pura 90 壁纸
- 新增 Nokia 壁纸
- 优化 SEO
- 修改 logo
- 新增 Huawei Pura X Max 壁纸
- 新增 google ads（2026-05-05）

### v1.0.0 - 2026-03-25
- 从3/21开始通过 AI 整理资源
- 从 AppleWalls 孵化出来

 
