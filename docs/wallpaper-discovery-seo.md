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
