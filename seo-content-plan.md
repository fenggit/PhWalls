# AppleWalls 项目规划与设计方案

本文档基于当前仓库结构、现有路由、数据模型与 Apple 壁纸关键词特征，为 `AppleWalls` 制定一份可执行的内容规划与页面设计方案。

更新时间：2026-03-20

## 1. 项目现状判断

### 1.1 当前产品定位

从现有代码和数据看，`AppleWalls` 不是泛壁纸站，而是一个以「Apple 官方/内置壁纸合集」为核心的内容站，已经具备以下基础：

- 已有 8 个核心分类入口：
  - `iPhone`
  - `iPad`
  - `Mac`
  - `iOS`
  - `iPadOS`
  - `macOS`
  - `WWDC`
  - `New Year`
- 已有统一的 SEO 分类落地页组件：
  - `src/components/SeoLandingPage.tsx`
- 已有统一的详情页路由与结构化数据：
  - `src/app/wallpapers/[category]/[slug]/page.tsx`
- 已有多语言 SEO 文案：
  - `src/data/info/*/category-data.json`
- 已有 sitemap 和 canonical / hreflang 机制：
  - `src/app/sitemap.ts`
  - `src/lib/language.ts`
  - `src/lib/seo.ts`

结论：

- 这个项目已经具备较好的「官方壁纸资料库」骨架。
- 规划重点不应该是重做首页或随意扩类目，而应该是补足「搜索意图层」。
- 最适合走的路线是：
  - 保留当前“分类页 -> 合集详情页”的主结构
  - 在其上新增“专题聚合页/搜索意图页”
  - 逐步把首页从“分类罗列”升级为“内容导航中心”

### 1.2 当前内容资产的优势

当前数据非常适合承接以下类型搜索：

- 设备型关键词：
  - `iphone wallpapers`
  - `ipad wallpapers`
  - `mac wallpapers`
- 系统版本型关键词：
  - `ios 18 wallpapers`
  - `ipados 18 wallpapers`
  - `macos sequoia wallpapers`
- 官方原版型关键词：
  - `original iphone wallpapers`
  - `official apple wallpapers`
- 发布节点型关键词：
  - 新 iPhone
  - 新 iOS / iPadOS / macOS
  - WWDC / 节日专题

### 1.3 当前内容资产的短板

当前项目不适合直接硬做的词：

- 纯审美大词：
  - `cute iphone wallpapers`
  - `iphone wallpapers for girls`
  - `aesthetic iphone wallpapers`
- 强风格筛选词：
  - `dark wallpapers`
  - `amoled wallpapers`
  - `minimal wallpapers`

原因：

- 现有数据模型只有合集、日期、图片路径、尺寸等字段。
- 缺少颜色、风格、明暗、官方/非官方、分辨率等级等标签。
- 如果直接生成这些页面，内容支撑不足，容易出现标题和页面实际内容不一致。

因此，当前项目更应该优先做“官方、机型、系统、年份、活动”四类专题，而不是泛审美词。

## 2. 目标定位

建议把站点定位明确为：

> The definitive archive of official Apple wallpapers across iPhone, iPad, Mac, iOS, iPadOS, macOS, and Apple events.

中文表达：

> 一个按设备、系统与发布节点整理的 Apple 官方壁纸资料库。

这个定位和现有数据最匹配，也最容易建立长期 SEO 护城河。

## 3. 推荐信息架构

### 3.1 保留当前一级结构

当前一级栏目是合理的，建议保留：

- `/iphone-wallpapers`
- `/ipad-wallpapers`
- `/mac-wallpapers`
- `/ios-wallpapers`
- `/ipados-wallpapers`
- `/macos-wallpapers`
- `/wwdc-wallpapers`
- `/new-year-wallpapers`

### 3.2 新增二级“专题层”

建议新增一个介于“分类页”和“详情页”之间的专题层，用于承接高搜索意图词。

推荐新增的专题路径：

- `/official-apple-wallpapers`
- `/iphone-wallpapers/original`
- `/iphone-wallpapers/by-model`
- `/ios-wallpapers/by-version`
- `/ipad-wallpapers/by-model`
- `/mac-wallpapers/by-model`
- `/macos-wallpapers/by-version`
- `/apple-event-wallpapers`

这些页不需要一开始全做动态系统，可以先做少量高价值静态页。

### 3.3 详情页继续作为收口页

现有详情页结构已经很好，继续承担“具体合集下载页”角色：

- `/wallpapers/iphone/iphone-16-pro-wallpapers`
- `/wallpapers/ios/ios-18-wallpapers`
- `/wallpapers/macos/macos-15-sequoia-wallpapers`

建议保持这个 URL 规则不变。

## 4. 与当前项目匹配的 SEO 页面规划

### 4.1 第一阶段：当前数据可直接支撑的页面

这些页面几乎不需要补数据模型，只需要做内容组织和模板补充。

1. `Official Apple Wallpapers`
路径建议：`/official-apple-wallpapers`

页面作用：

- 承接 `official apple wallpapers`
- 承接 `original apple wallpapers`
- 承接品牌词 `apple wallpapers`

内容结构：

- Hero：强调“official / built-in / original”
- 分类入口：iPhone / iPad / Mac / iOS / iPadOS / macOS
- 最新合集
- 最受欢迎合集
- Apple event collections

2. `Original iPhone Wallpapers`
路径建议：`/iphone-wallpapers/original`

页面作用：

- 承接 `iphone original wallpaper`
- 承接 `original iphone wallpaper 4k`

内容来源：

- 当前 `iPhone.json` 中全部合集都可纳入
- 文案上强调 “official iPhone wallpapers from every generation”

3. `iPhone Wallpapers by Model`
路径建议：`/iphone-wallpapers/by-model`

页面作用：

- 承接 `iphone wallpapers by model`
- 承接具体机型搜索前的中间导航意图

内容结构：

- 最新机型
- Pro 系列
- 标准版系列
- 特别型号页，例如 `Air` / `e`

4. `iOS Wallpapers by Version`
路径建议：`/ios-wallpapers/by-version`

页面作用：

- 承接 `ios wallpapers`
- 承接 `ios 18 wallpaper`、`ios 17 wallpapers` 等版本词的上游导航

5. `Mac Wallpapers by Model`
路径建议：`/mac-wallpapers/by-model`

页面作用：

- 承接 `mac wallpapers`
- 强化 `MacBook Air / Pro / iMac` 的内部组织

6. `Apple Event Wallpapers`
路径建议：`/apple-event-wallpapers`

页面作用：

- 整合当前 `WWDC` 和 `New Year`
- 后续也适合收 Apple Event、Invites、特别活动视觉物料

### 4.2 第二阶段：需要补数据标签后再做的页面

这些页面有流量价值，但当前项目数据不够，建议在补标签后上线。

- `/iphone-wallpapers/dark`
- `/iphone-wallpapers/depth-effect`
- `/iphone-wallpapers/4k`
- `/ipad-wallpapers/4k`
- `/mac-wallpapers/5k`

需要补的数据字段：

- `isOfficial`
- `supportsDepthEffect`
- `tone`
- `style`
- `deviceCompatibility`
- `resolutionTier`
- `orientation`

### 4.3 不建议当前就做的页面

- `iphone wallpapers for girls`
- `cute iphone wallpapers`
- `pink iphone wallpapers`
- `anime apple wallpapers`

这类内容与当前站点“官方壁纸资料库”的定位不一致，容易稀释品牌认知。

## 5. 首页改版建议

当前首页更像“分类索引页”，对于 SEO 和新访客都还有升级空间。

建议把首页改为三段式：

### 5.1 第一屏：明确站点定位

当前首页需要更明确地表达：

- 这是 Apple 官方壁纸站，而不是泛壁纸站
- 收录的是“内置、原版、可下载”的合集
- 支持 iPhone / iPad / Mac / iOS / macOS / WWDC

推荐第一屏信息结构：

- 主标题：
  - `Official Apple Wallpapers`
- 副标题：
  - `Browse and download built-in Apple wallpapers for iPhone, iPad, Mac, iOS, iPadOS, macOS, and Apple events.`
- 快捷入口按钮：
  - `Latest iPhone`
  - `Latest iOS`
  - `Latest macOS`
  - `WWDC`

### 5.2 第二屏：按意图而不是按技术分类

建议新增 4 个首页意图区块：

- Latest Releases
- Browse by Device
- Browse by OS Version
- Apple Events & Special Collections

这样比单纯罗列 tab 更符合搜索用户的浏览路径。

### 5.3 第三屏：可信度与资料库属性

建议增加一段说明区：

- 官方/内置壁纸来源
- 无水印
- 按年份和产品线持续更新
- 可直接下载

这段内容同时能补首页文本密度，改善 SEO。

## 6. 分类页设计建议

现有 `SeoLandingPage` 已经可以复用，但建议在视觉和信息层级上加强“导航型落地页”属性。

### 6.1 当前组件优点

- 有 H1 / 描述 / 面包屑
- 有 collection 卡片和预览能力
- 有 CollectionPage 结构化数据

### 6.2 建议增强的模块

每个分类页建议新增以下模块：

1. `Quick Filters`

示例：

- iPhone 分类页：
  - Latest Models
  - Pro Models
  - Standard Models
  - Archive
- iOS 分类页：
  - Latest
  - iOS 18
  - iOS 17
  - Legacy iOS

2. `Featured Collections`

基于时间和热度人工挑选 4 到 6 个合集，放在正文前部。

3. `About This Archive`

用于补充当前分类的资料范围和下载说明，增强搜索页文本深度。

4. `Related Categories`

示例：

- iPhone 页关联到 iOS 页
- Mac 页关联到 macOS 页
- WWDC 页关联到 New Year 页和 Design 页

## 7. 详情页设计建议

当前详情页已经接近“可用的 SEO 详情模板”，但仍有 4 个可提升点。

### 7.1 强化首屏信息

建议在详情页主标题附近补充：

- 发布时间
- 适配设备数
- 图片数量
- 官方来源说明

### 7.2 增强“相关推荐”

当前详情页偏单点消费，建议新增：

- 同系列上一代 / 下一代
- 同年份相关系统
- 同发布节点的设备与系统合集

例子：

- `iPhone 16 Wallpapers` 页面可关联：
  - `iPhone 16 Pro Wallpapers`
  - `iOS 18 Wallpapers`

### 7.3 下载说明模块

建议增加轻量说明：

- 分辨率说明
- portrait / landscape 适配
- 如何保存到 iPhone / iPad / Mac

### 7.4 机器可读文本增强

当前已有 `ImageGallery` schema，很好。
建议补充：

- FAQ schema
- 更细的图片 alt 生成规则
- `datePublished` / `dateModified`

## 8. Design 页的角色建议

当前项目有一个 `/design` 页面，这是和多数官方壁纸站不同的资产。

建议不要把它当首页核心入口，而应把它定义成辅助工具页：

- 名称建议：
  - `Wallpaper Designer`
  - `Create Apple-Style Wallpapers`
- 页面职责：
  - 给用户快速生成 Apple 风格简约壁纸
  - 承接部分工具型长尾
- 与主站关系：
  - 主站是资料库
  - Design 是工具补充

导航策略：

- 桌面端导航保留，但不要抢占主类目优先级
- 首页可在底部或辅助区块推荐

## 9. 数据模型升级建议

如果要把站点从“资料库”升级成“可扩展 SEO 系统”，建议为每张壁纸或每个合集补充派生字段。

### 9.1 合集级字段

- `series`
- `releaseYear`
- `releaseMonth`
- `deviceFamily`
- `osFamily`
- `isOfficial`
- `isEventCollection`
- `isHolidayCollection`
- `featured`

### 9.2 单图级字段

- `orientation`
- `deviceGroup`
- `resolutionWidth`
- `resolutionHeight`
- `resolutionTier`
- `supportsDepthEffect`
- `tone`
- `style`
- `isDark`

### 9.3 派生能力

有了这些字段后，才能更稳定生成：

- `4K` 专题
- `dark` 专题
- `depth effect` 专题
- `portrait / landscape` 专题
- `Pro / Air / standard` 专题

## 10. 推荐实施路线

### Phase 1：整理定位与首页

目标：

- 明确“Official Apple Wallpapers”主定位
- 首页从分类墙升级为导航中心

动作：

- 改首页 Hero
- 增加意图区块
- 增加首页文本说明
- 增加专题入口卡

### Phase 2：补专题页

目标：

- 用最少模板承接更多高价值关键词

优先新增：

- `/official-apple-wallpapers`
- `/iphone-wallpapers/original`
- `/iphone-wallpapers/by-model`
- `/ios-wallpapers/by-version`
- `/mac-wallpapers/by-model`
- `/apple-event-wallpapers`

### Phase 3：补数据标签

目标：

- 为样式型和分辨率型专题做准备

动作：

- 扩展 JSON 字段
- 增加派生脚本
- 优化 sitemap 和内部链接

### Phase 4：增强详情页和相关推荐

目标：

- 提升站内浏览深度和详情页 SEO 表现

动作：

- 加相关推荐
- 加 FAQ
- 加下载说明
- 加发布时间与适配信息

## 11. 页面优先级建议

### P0：必须优先做好

- 首页
- `/iphone-wallpapers`
- `/ios-wallpapers`
- `/mac-wallpapers`
- 各详情页模板

### P1：最值得新增

- `/official-apple-wallpapers`
- `/iphone-wallpapers/original`
- `/iphone-wallpapers/by-model`
- `/ios-wallpapers/by-version`
- `/apple-event-wallpapers`

### P2：数据补全后再做

- `/iphone-wallpapers/4k`
- `/iphone-wallpapers/dark`
- `/iphone-wallpapers/depth-effect`
- `/mac-wallpapers/5k`

## 12. 设计方向总结

这次规划建议的视觉和交互方向是：

- 首页更像“Apple 壁纸总目录”
- 分类页更像“带导航能力的专题着陆页”
- 详情页更像“官方合集资料卡 + 下载页”
- Design 页作为辅助工具，不与官方资料库定位冲突

风格上建议继续保留当前项目已有的：

- 清爽、留白、偏 Apple 的轻盈视觉
- 卡片式内容组织
- 多语言支持

但需要减少“只是把分类卡片铺出来”的感觉，增加：

- 更明确的主定位文案
- 更强的意图入口
- 更清晰的专题层
- 更丰富的内部链接

## 13. 与当前代码文件的对应关系

后续如果进入实现阶段，优先涉及这些文件：

- 首页：
  - `src/app/home/v1/Home.tsx`
  - `src/app/home/v1/HomePage.tsx`
- 分类页模板：
  - `src/components/SeoLandingPage.tsx`
- 分类页 SEO 文案：
  - `src/data/info/en/category-data.json`
  - `src/data/info/zh/category-data.json`
- 详情页：
  - `src/app/wallpapers/[category]/[slug]/page.tsx`
- sitemap：
  - `src/app/sitemap.ts`
- 导航：
  - `src/components/Header.tsx`
- 数据模型：
  - `src/lib/wallpapers.ts`
  - `src/data/*.json`

## 14. 最终建议

一句话总结：

`AppleWalls` 最有价值的不是去模仿泛壁纸站，而是把“Apple 官方壁纸资料库”这件事做到最完整、最好找、最好下。

因此，建议优先做：

1. 首页定位升级
2. 专题聚合页补齐
3. 分类页导航强化
4. 详情页相关推荐与说明增强
5. 数据标签升级

这样既和当前项目匹配，也最有机会让 SEO、用户体验和站内内容体系同步增长。
