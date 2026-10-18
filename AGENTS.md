# AGENTS.md

本文件为 AI 编码代理提供在 PhWalls 项目中工作所需的上下文与约定。面向人类的完整文档见 `README.md`。

## 项目概览

PhWalls 是一个展示主流手机/桌面品牌系统内置壁纸的网站。基于 Next.js App Router 构建，部署到 Cloudflare Pages，图片资源存放在 Cloudflare R2。

- 框架：Next.js 15（App Router，Edge Runtime）
- 语言：TypeScript（`strict: true`）
- 样式：Tailwind CSS v4
- 部署：Cloudflare Pages（通过 `@cloudflare/next-on-pages`）
- 存储：Cloudflare R2（公开域名 `https://static.phwalls.com`）
- 多语言：内置 5 种语言（en / zh / ja / vi / zh-hant），通过中间件按路径前缀与地区检测切换

> 注意：`README.md` 部分章节（如 iPhone/iPad/macOS）已过时，实际产品以手机品牌（Google Pixel、Xiaomi、Samsung、Huawei 等）和桌面品牌为主。壁纸内容统一读取 Cloudflare D1 的 `DB` 绑定，`src/data/` 仅保留多语言与导航配置。以代码为准。

## 环境准备

```bash
npm install
cp .env.example .env.local   # 然后填入真实值
```

必需环境变量（详见 `.env.example`）：

- `R2_ACCESS_KEY_ID_PROD`、`R2_SECRET_ACCESS_KEY_PROD`
- `R2_BUCKET_NAME_PROD`、`R2_ENDPOINT_PROD`

可选：`R2_REGION_PROD`（默认 `auto`）、`R2_URL_EXPIRES_PROD`（默认 3600）、`NEXT_PUBLIC_ENABLE_ADS`、`NEXT_PUBLIC_SITE_URL`（默认 `https://phwalls.com`）。

不要提交 `.env.local`，不要在代码中硬编码密钥。

## 常用命令

```bash
npm run dev          # 本地开发服务器 (http://localhost:3000)
npm run build        # Next.js 生产构建
npm run start        # 启动生产服务器
npm run lint         # ESLint (next lint)
npm run pages:build  # 生成 Cloudflare Pages 产物
npm run preview      # 本地预览 Cloudflare Pages 构建
npm run deploy       # 部署到 Cloudflare Pages
```

代理在本地验证改动时，请运行 `npm run lint` 与 `npm run build`。开发服务器（`npm run dev`）属于长时间运行进程，不要在自动化流程中阻塞执行，需由用户手动启动。

开发构建产物位于 `.next-dev/`，生产构建产物位于 `.next/`，两者分别忽略，避免验证生产构建时覆盖运行中的开发模块。不要在开发服务器运行时删除 `.next-dev/`。

## 项目结构

```
src/
├── app/                  # App Router 路由
│   ├── [brand]/          # 动态品牌页面（手机壁纸）
│   ├── wallpapers/       # 分类壁纸路由
│   ├── desktop/          # 桌面壁纸页面
│   ├── home/, about/, design/, privacy/
│   ├── api/              # API 路由（见下）
│   ├── layout.tsx        # 根布局
│   ├── sitemap.ts        # 站点地图
│   └── globals.css       # 全局样式
├── components/           # React 组件（Header、Footer、DeviceWallpaperGrid 等）
├── lib/                  # 工具库
│   ├── config/           # environments.ts 环境配置
│   ├── services/         # r2.ts R2 存储服务
│   ├── brands.ts         # 品牌分类与 slug 归一化
│   ├── language.ts       # 语言解析逻辑
│   ├── i18n.ts           # 翻译文本
│   ├── data.ts、wallpapers.ts、metadata.ts、seo.ts 等
├── data/                 # 多语言、品牌标签与导航配置（无本地壁纸内容 JSON）
├── types/                # TypeScript 类型定义
└── middleware.ts         # 语言/域名规范化中间件
```

### API 路由

```
/api/files/private-url            # 生成私有 URL
/api/files/download-url           # 生成下载 URL
/api/files/download               # 服务端代理原图下载（返回 attachment）
/api/files/batch-private-urls     # 批量生成私有 URL
/api/public/wallpaper-image       # 公开壁纸图片
/api/public/wallpaper-download    # 公开壁纸下载
/api/public/tabs                  # 分类标签
/api/public/search                # D1 已发布合集搜索索引（lang 指定语言）
```

IndexNow 使用运维脚本 `npm run indexnow` 提交线上 sitemap，验证文件为 `public/indexnow-key.txt`；没有公开提交 API。`npm run deploy` 成功后会通过 `postdeploy` 调用提交脚本。

## 代码约定

- 使用 TypeScript，遵循 `strict` 模式；新增代码需通过类型检查。
- 使用路径别名 `@/*` 指向 `src/*`（见 `tsconfig.json`），导入时优先使用别名而非相对路径。
- 严格区分服务器组件与客户端组件：交互逻辑放在标注 `'use client'` 的组件中（如 `DeviceWallpaperGrid.tsx`），数据获取与元数据放在服务器组件中。
- 样式统一用 Tailwind CSS 工具类，不引入新的样式方案。
- 多语言文案集中在 `src/lib/i18n.ts` 与 `src/data/language/`，新增文案需补全所有语言。
- 品牌 slug 通过 `normalizeCategoryType()` 归一化（小写、空格转 `-`），新增品牌时复用该逻辑。
- API 路由运行在 Edge Runtime，避免使用 Node.js 专有 API（除非已在 `wrangler.toml` 启用 `nodejs_compat`）。

## 数据库变更与文档同步

- 任何数据库字段变更（新增、删除、重命名、类型、默认值、可空性、枚举值、约束或业务含义调整）都必须在同一次改动中同步更新相关文档，不能只修改迁移 SQL 或代码。
- 数据表与字段定义统一同步到 `docs/wallpaper-admin-d1-design.md`，说明字段名称、类型、用途、默认值及约束；删除或重命名字段时，同步清理过时说明。
- 如变更影响后台操作、导入流程或 API 请求/响应，还需同步更新 `docs/wallpaper-admin-operations.md`、相关专题文档、API 文档及 `README.md` 中受影响的内容；涉及存量数据迁移或回填时，补充迁移步骤与兼容性说明。

## 添加新品牌/设备

1. 通过后台维护 D1 中的品牌、设备、壁纸与五语言合集文案，确保设备和素材已发布；原始分辨率记录在 `w_wallpapers.width`、`height`。
2. 在 `src/data/language/<lang>/tab.json` 中登记分类，确保 `BRAND_CATEGORIES` 能识别。
3. 在 `public/brand-icons/` 下新增以品牌 slug 命名的 SVG Logo（如 `smartisan.svg`），并在 `src/components/Header.tsx` 的 `BRAND_ICON_PATHS` 中登记映射；Logo 必须来源可靠、使用紧凑 `viewBox`，并在 Header 的桌面端与移动端图标位验证清晰度。
4. 页面路由 `[brand]` 与对应详情页从 D1 读取已发布内容并生成 SEO 元数据；无需新增壁纸 JSON 或运行本地索引生成脚本。

## 安全与注意事项

- 涉及 R2 凭据、`.env.local`、JWT 密钥等敏感信息时，按 key 名引用，不要回显其值。
- 修改中间件（`src/middleware.ts`）需谨慎，它处理域名规范化、语言重定向（308）与路径重写，错误改动会影响全站路由与 SEO。
- 部署相关命令（`npm run deploy`）会推送到 Cloudflare 生产环境，属于高风险操作，执行前需用户确认。
- 防盗链由 Cloudflare WAF 规则控制，原图下载统一走 `/api/files/download` 服务端代理，不要绕过该链路直接暴露 `origin` 直链。

## 测试

当前仓库未配置自动化测试框架。改动后请至少运行 `npm run lint` 与 `npm run build` 验证，未经用户要求不要自行添加测试框架。

## 改动后必做：更新 Release Note

每次改动代码后，必须同步更新根目录的 `release-note.md`：

- 在 `## 版本历史` 下、最新版本之上，新增或追加对应的变更条目。
- 沿用现有格式：版本号标题 `### vX.Y.Z - YYYY-MM-DD`，下方用 `-` 列出本次改动要点（中文、简洁、面向用户/运维视角）。
- 每条用一句短句说明具体功能或可感知变化，例如“新增主题分类，支持按风格选图”“主题卡片展示封面与张数”“修复切换语言后跳回首页”。
- 简洁不能省略功能含义，避免只写“优化 UI”“优化体验”“完善功能”等笼统描述；功能名称本身已清晰时，无需额外扩写。
- 合并同一版本中的同类改动，不按开发轮次、修复过程或提交次数逐条堆叠；功能名称保留，技术细节省略。
- 数据量、表名、字段、接口路径、迁移编号、实现过程、验证记录与操作步骤写入相关技术文档，不写入 Release Note；纯文档整理不单独增加发布条目。
- **版本号固定为当前已发布 Git tag 的下一个版本**：更新前同步远端 tag（`git fetch origin --tags`），以远端最新的正式 `vX.Y.Z` tag 为基准（按语义化版本比较，不仅看当前分支最近可达的 tag），默认递增补丁号（例如当前 tag 为 `v2.0.2`，待发布版本固定为 `v2.0.3`）；用户明确指定其他版本时按用户要求执行。
- 在新的版本 tag 发布前，所有改动都追加到同一个待发布版本，不能按分支名、Release Note 最新标题、修复次数或提交次数反复递增版本号。
- 同一待发布版本只保留一个标题，跨日期也继续追加；标题日期使用该条目的最新实际更新日期。
- 新的版本 tag 发布后，才切换到该 tag 的下一个版本；不得为更新 Release Note 自动创建 tag。
- 历史版本默认保持不变；用户明确要求统一精简时，只整理文案，保留版本号、日期、顺序和实质变更，不跨版本合并。`release-note.md` 首行「不要随便修改」不限制按上述规则整理未发布条目。
