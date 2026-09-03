# AppleWalls Release Note（不要随便修改）

## 版本历史

### v1.1.4 - 2026-09-03
- 新增 Huawei MateBook Fold 与 Tecno Camon Slim 壁纸合集及发布日期
- 优化移动端首屏性能，恢复 Next.js 默认按路由拆包，减少未使用脚本及主线程执行开销
- 延后统计脚本加载，并按移动设备首屏布局输出壁纸卡片和图片地址，降低 HTML、DOM 与图片请求负担
- 移除壁纸卡片常驻合成层提示，减少长页面的渲染内存占用且保持原有交互效果
- 修复连续点击分享按钮时重复调用系统分享并触发 InvalidStateError 的问题

### v1.1.3 - 2026-09-03
- 通过 gegei seo agent 建议优化
- 优化首页壁纸预览接口，改为按品牌加载数据并增加边缘缓存，降低 Cloudflare 冷启动与重复解析开销
- 修正新品牌、拆分品牌及桌面壁纸路径在站点地图中的更新时间，帮助搜索引擎优先抓取新 URL
- 修正部分 Motorola 型号名称重复显示 Plus，并针对高曝光详情页小范围优化英文搜索标题

### v1.1.3 - 2026-09-02
- 通过 gegei seo agent 建议优化
- 移除全站路由级加载占位，首页主体改为直接随服务端 HTML 返回，避免搜索引擎抓取到空白页

### v1.1.3 - 2026-08-16
- 按 llms.txt v2 规范重整 AI 站点索引，修正链接格式并补齐多语言、品牌、桌面与重点壁纸入口
- 精简全品牌页面名称，并将可见标题与搜索结果标题分离，在提升扫读体验的同时保留官方壁纸、下载与高清原图关键词

### v1.1.3 - 2026-08-15
- 首页隐藏鸿蒙与华为 MatePad 壁纸分类及导航入口
- 新增 ASUS ROG Phone 品牌页，收录 ROG Phone、2、3、5、5S、7、8、9 共 8 个官方壁纸合集
- 首页仅为当前可见壁纸卡片解析图片地址，展开分类时再按需补齐，减少移动端无效数据处理与 R2 请求
- 首页与导航优先展示自然搜索需求较高的品牌，并按当前语言服务端输出分类名称，强化高曝光页面内链
- 站点地图复用构建期轻量索引，减少全量品牌数据解析与构建产物负担，同时保持原有收录范围
- 优化五语言品牌页搜索标题，突出官方内置、高清原图与 Stock Wallpapers 下载意图
- 修复桌面端 Header 切换语言后品牌名称仍保留旧语言的问题

### v1.1.2 - 2026-08-14
- 将 iQOO 从 vivo 中拆分为独立品牌页和存储目录，补齐五语言导航、站点地图与公开数据接口
- 保留原 vivo iQOO 详情页地址的永久跳转，避免既有搜索收录和外部链接失效
- 新增 Honor Robot Phone、28 款 iQOO、Redmi K100 Pro 与 Samsung Galaxy M17e 5G 壁纸合集及发布日期

### v1.1.2 - 2026-08-11
- 将 Redmi 与 POCO 从 Xiaomi 中拆分为独立品牌页和存储目录，补齐五语言导航、站点地图与公开数据接口
- 保留原 Xiaomi 详情页地址的永久跳转，避免既有搜索收录和外部链接失效

### v1.1.2 - 2026-08-06
- 统一手机壁纸详情页的可见标题、分享信息、预览统计与 SEO 型号名称，准确展示 Pro、Ultra 等素材变体且保持原有链接不变
- 将 Infinix Note 60 素材目录切换为 Infinix Note 60 Pro，保持现有详情页链接不变
- 修复异常路径 `/&` 触发服务器错误的问题，将其规范化到对应语言首页，避免搜索引擎抓取遇到 5xx

### v1.1.2 - 2026-08-04
- 将本地开发与生产启动服务的默认端口统一调整为 3100
- 优化手机壁纸详情页五语言 SEO 标题、摘要、可见合集说明、面包屑与图片结构化数据，提升新机型长尾搜索匹配度
- 修正 SEO 型号变体识别的误匹配问题，使 Pro、Ultra 等真实型号变体准确进入搜索标题与结构化数据

### v1.1.2 - 2026-08-03
- 修正多语言首页的标题、摘要与 canonical，避免非英文首页错误指向英文版本，并统一首页 H1 结构
- 补齐 Desktop 分类页 sitemap 入口，校正手机与桌面详情页图片结构化数据的格式、日期、图片地址和面包屑
- 移除无对应可见内容的 FAQ 结构化数据与详情页关键词堆叠段落，降低搜索引擎合规风险
- 完善 GA4 壁纸预览、下载点击、下载成功与下载失败漏斗事件，并新增 SEO 优化台账
- 优化自动语言识别：用户未主动选择时优先匹配浏览器语言，主动选择后使用独立标记长期保持偏好
- 修复品牌与 Desktop 分类页英文文案硬编码，为 5 种语言统一生成页面标题、描述、合集数量、社交分享和结构化数据 SEO 文案

### v1.1.1 - 2026-07-22
- 新增 Nothing Phone 4b、Oppo A6s Pro、Redmi Note 17 与 Samsung Galaxy M07 壁纸数据
- 优化多语言自动识别，无语言前缀访问时优先采用浏览器语言，再回退到已保存语言与地区推断

### v1.1.1 - 2026-07-05
- 优化壁纸详情页 SEO 标题，避免标题中重复出现 Wallpapers
- 增强详情页 ImageGallery 结构化数据与可抓取摘要，提升搜索引擎和 AI 引擎识别壁纸集合的稳定性
- 更新 `llms.txt` 的语言路径、重点壁纸页面与 AI 抓取说明

### v1.1.1 - 2026-06-30
- 新增 Huawei Nova 15 Max 壁纸数据

### v1.1.1 - 2026-06-23
- 新增 Samsung Galaxy A27 与 Vivo X Fold 6 壁纸数据

### v1.1.1 - 2026-06-21
- 移除页面分享弹窗，点击分享按钮后直接调用系统分享

### v1.1.1 - 2026-06-20
- 新增页面分享功能

### v1.1.1 - 2026-06-18
- 桌面壁纸 tab 调整：原「Aluminium OS」分类更名为「Google OS」（type 由 google-aluminium-os 改为 google-os），首页/导航模块同步更新
- 新增「Microsoft Surface」分类
- 删除品牌页与 Desktop 分类页卡片右侧的“预览”按钮，保留点击卡片进入详情页的主路径

### v1.1.1 - 2026-06-15
- 桌面壁纸页（/desktop）tabbar 新增「macOS」分类，点击直接跳转外部站点（applewalls.com macOS 壁纸页），在新标签页打开
- About 页面「资源合集」模块下方新增 Desktop 壁纸分类区块，展示 Windows、Ubuntu、ChromeOS、Surface、Aluminium OS、macOS 六个分类

### v1.1.1 - 2026-06-12
- 修复首页（/、/zh、/en 等）在 Cloudflare Pages 大量出现 503「已超出 CPU 时间限制」：此前首页每次请求都会解析全部品牌壁纸数据（约 2.2MB），冷启动 CPU 开销过高
- 新增构建期生成的首页轻量索引（`src/data/home-index.json`，仅含每个集合的封面图与数量，约 264KB），首页改为只解析该索引渲染卡片，单请求 CPU 时间大幅下降
- 首页壁纸预览改为按需通过 `/api/public/wallpapers` 拉取完整 item 列表，封面与数量展示保持不变
- 首页客户端组件不再内联全量壁纸 JSON，首屏 JS 体积显著减小
- 新增 `scripts/generate-home-index.mjs`，并接入 `predev`/`prebuild`/`pages:build`，数据更新后随构建自动重生成索引，无需手动维护

### v1.1.1 - 2026-06-11
- 修复项目无法通过 `npm run lint` 与 `npm run build`：清理首页与 R2 服务中的 `any` 类型错误（构建此前被 ESLint error 阻断）
- 安全加固：图片/下载/URL 签发等接口在透传 R2 对象 key 前统一做白名单校验（`sanitizeWallpaperKey`），仅放行壁纸命名空间内的图片对象，阻断路径穿越与被当作通用代理/绕过防盗链的滥用
- 精简 R2 服务：移除从未被调用的 listFiles/uploadFile/deleteFile/getFileInfo 及 XML 解析等死代码，仅保留公开/签名 URL 构建
- 移除无引用的 Node 专有依赖（jsonwebtoken、bcryptjs、jose、mz、graceful-fs 及相关类型），减小安装体积
- 中间件不再对静态资源与内部请求写语言 cookie，避免 Set-Cookie 削弱 Cloudflare 对不可变资源的缓存
- 安全响应头：关闭已废弃的 X-XSS-Protection，新增保守的 CSP（frame-ancestors/base-uri/object-src）
- 修复设备类型角标在 `type` 不含 `/` 时可能导致整页崩溃的隐患
- 修复首页导航出现两个「Desktop」标签并触发 React 重复 key 警告：tabData 按归一化 type 去重
- 修复 Cloudflare Pages 出现大量「已超出 CPU 时间限制」错误：品牌页与壁纸详情页此前每次请求都会解析全部品牌数据，冷启动 CPU 开销过高
- 壁纸数据改为按品牌惰性加载（动态 import），品牌页/详情页仅解析所需的单个品牌 JSON，大幅降低单请求 CPU 时间
- 拆分纯工具函数与全量数据模块，避免 seo 等仅需工具函数的模块被迫加载全部壁纸数据
- 桌面端壁纸详情页同步改为按品牌惰性加载
- 客户端组件（落地页、详情网格）不再内联全量壁纸 JSON，减小品牌页首屏 JS 体积

### v1.1.0 - 2026-06-11
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

 
