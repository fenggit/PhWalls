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

> 注意：`README.md` 部分章节（如 iPhone/iPad/macOS）已过时，实际产品以手机品牌（Google Pixel、Xiaomi、Samsung、Huawei 等）和桌面品牌为主，数据见 `src/data/`。以代码为准。

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
├── data/                 # 壁纸数据（按品牌的 JSON 文件 + 多语言 tab.json）
├── types/                # TypeScript 类型定义
└── middleware.ts         # 语言/域名规范化中间件
```

### API 路由

```
/api/files/private-url            # 生成私有 URL
/api/files/download-url           # 生成下载 URL
/api/files/download               # 服务端代理原图下载（返回 attachment）
/api/files/batch-private-urls     # 批量生成私有 URL
/api/public/wallpapers            # 公开壁纸列表
/api/public/wallpaper-image       # 公开壁纸图片
/api/public/wallpaper-download    # 公开壁纸下载
/api/public/tabs                  # 分类标签
/api/indexnow                     # IndexNow SEO 推送
```

## 代码约定

- 使用 TypeScript，遵循 `strict` 模式；新增代码需通过类型检查。
- 使用路径别名 `@/*` 指向 `src/*`（见 `tsconfig.json`），导入时优先使用别名而非相对路径。
- 严格区分服务器组件与客户端组件：交互逻辑放在标注 `'use client'` 的组件中（如 `DeviceWallpaperGrid.tsx`），数据获取与元数据放在服务器组件中。
- 样式统一用 Tailwind CSS 工具类，不引入新的样式方案。
- 多语言文案集中在 `src/lib/i18n.ts` 与 `src/data/language/`，新增文案需补全所有语言。
- 品牌 slug 通过 `normalizeCategoryType()` 归一化（小写、空格转 `-`），新增品牌时复用该逻辑。
- API 路由运行在 Edge Runtime，避免使用 Node.js 专有 API（除非已在 `wrangler.toml` 启用 `nodejs_compat`）。

## 添加新品牌/设备

1. 在 `src/data/` 下新增对应品牌的 JSON 数据文件。
2. 在 `src/data/language/<lang>/tab.json` 中登记分类，确保 `BRAND_CATEGORIES` 能识别。
3. 页面路由 `[brand]` 与 `generateStaticParams` 会自动生成静态页面与 SEO 元数据。

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
- **版本号取自当前 git 分支名**：执行 `git branch --show-current`，从结果中提取版本号（如分支为 `release/1.2.0`，则版本号为 `v1.2.0`；若分支名不含版本号，则按语义化版本在最新版本基础上递增）。
- 若同一天同一版本已有条目，直接在该版本条目下追加要点，不新建条目。
- 日期使用当前实际日期。
- 注意 `release-note.md` 首行标注「不要随便修改」，指的是不要改动历史条目，只允许按上述规则新增。
