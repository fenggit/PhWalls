# 页面索引

本文档汇总项目当前的页面入口、对应组件以及主要作用，便于维护路由、SEO 和页面结构。

## 页面列表

| 路由 | 文件 | 组件/导出 | 类型 | 作用 |
| --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | `Home` | 页面入口 | 网站首页，展示所有壁纸分类概览。 |
| `/home/v1` | `src/app/home/v1/page.tsx` | `Home` | 页面入口 | 首页内部版本路由，复用首页内容。 |
| `/home/v1` | `src/app/home/v1/Home.tsx` | `Home` | 页面组件 | 首页主体组件，包含分类卡片、预览弹窗和广告位。 |
| 全站 | `src/app/layout.tsx` | `RootLayout` | 根布局 | 为全站注入 metadata、脚本、语言上下文和基础外壳。 |
| `/about` | `src/app/about/layout.tsx` | `AboutLayout` | 布局 | 为关于页提供独立 metadata 容器。 |
| `/about` | `src/app/about/page.tsx` | `AboutPage` | 页面入口 | 介绍站点定位、资源说明、FAQ 和联系信息。 |
| `/design` | `src/app/design/layout.tsx` | `DesignLayout` | 布局 | 为设计工具页提供独立 metadata 容器。 |
| `/design` | `src/app/design/page.tsx` | `DesignPage` | 页面入口 | 在线生成自定义壁纸并导出图片。 |
| `/iphone-wallpapers` | `src/app/iphone-wallpapers/page.tsx` | `IPhoneWallpapersPage` | 落地页 | 展示 iPhone 壁纸系列入口卡片。 |
| `/ipad-wallpapers` | `src/app/ipad-wallpapers/page.tsx` | `IPadWallpapersPage` | 落地页 | 展示 iPad 壁纸系列入口卡片。 |
| `/ios-wallpapers` | `src/app/ios-wallpapers/page.tsx` | `IOSWallpapersPage` | 落地页 | 展示 iOS 系统壁纸系列入口卡片。 |
| `/ipados-wallpapers` | `src/app/ipados-wallpapers/page.tsx` | `IPadOSWallpapersPage` | 落地页 | 展示 iPadOS 系统壁纸系列入口卡片。 |
| `/macos-wallpapers` | `src/app/macos-wallpapers/page.tsx` | `MacOSWallpapersPage` | 落地页 | 展示 macOS 壁纸系列入口卡片。 |
| `/mac-wallpapers` | `src/app/mac-wallpapers/page.tsx` | `MacWallpapersPage` | 重定向页 | 将旧路径重定向到 `/macos-wallpapers`。 |
| `/new-year-wallpapers` | `src/app/new-year-wallpapers/page.tsx` | `NewYearWallpapersPage` | 落地页 | 展示新年主题壁纸系列入口卡片。 |
| `/wwdc-wallpapers` | `src/app/wwdc-wallpapers/page.tsx` | `WWDCWallpapersPage` | 落地页 | 展示 WWDC 主题壁纸系列入口卡片。 |
| `/privacy` | `src/app/privacy/page.tsx` | `PrivacyPolicyPage` | 页面入口 | 展示隐私政策和第三方服务说明。 |
| `/wallpapers/[category]/[slug]` | `src/app/wallpapers/[category]/[slug]/page.tsx` | `WallpaperDetailPage` | 详情页 | 展示单个壁纸系列的分组列表和预览入口。 |
| 未命中路由 | `src/app/not-found.tsx` | `NotFound` | 异常页 | 处理 404 页面并提供回首页入口。 |
| `/sitemap.xml` | `src/app/sitemap.ts` | `sitemap` | 元数据路由 | 输出站点页面与壁纸详情页 sitemap。 |

## 页面相关公共组件

| 文件 | 组件 | 作用 |
| --- | --- | --- |
| `src/components/SeoLandingPage.tsx` | `SeoLandingPage` | 通用落地页布局组件，供 iPhone/iPad/iOS 等分类页复用。 |
| `src/components/DeviceWallpaperGrid.tsx` | `DeviceWallpaperGrid` | 壁纸详情页主体组件，负责分组展示、预览和公共头尾。 |
| `src/components/Header.tsx` | `Header` | 全站头部导航、语言切换和分类入口。 |
| `src/components/Footer.tsx` | `Footer` | 全站页脚、版权说明和辅助链接。 |
| `src/components/WallpaperPreviewDownload.tsx` | `WallpaperPreviewDownload` | 壁纸预览与下载弹窗。 |

## 说明

- “落地页” 指聚合入口页，主要承接 SEO 和分类导航。
- “详情页” 指单个壁纸系列页面，主要承接具体浏览与下载。
- `Home` 组件虽然位于 `src/app/home/v1/Home.tsx`，但同时被 `/` 与 `/home/v1` 复用。
