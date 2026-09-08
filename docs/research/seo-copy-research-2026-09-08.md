# PhWalls 品牌页 SEO 文案调研与建议

调研日期：2026-09-08。按用户要求未使用 skill。本文件保留调研时的文案建议；后续已按用户要求在本地实现五语言版本，最终文案以 `src/data/language/<lang>/seo.json` 与 `src/lib/i18n.ts` 为准，实施与验证记录见 `seo-audit.md`。尚未部署。

## 1. 结论

英文品牌页以 `品牌／产品系列 + Wallpapers` 为主题，用 `Stock` 明确内置壁纸定位，用 `Free Download` 表达下载意图。Description 补充实际收录的系列、按机型浏览和原始分辨率下载。中文对应“品牌 + 内置壁纸 + 原图下载”。

首页承接跨品牌需求，品牌页承接品牌与系列需求，具体机型页承接 `机型 + wallpaper/download`。不要把所有机型、4K、HD、8K、官方、最好等词塞入同一个标题。

本次关键词依据是竞争页面用语、本站 GSC 已获展示／点击的查询、GA 页面访问情况及本地资源目录；没有获取全市场搜索量、关键词难度或竞争网站流量，不能据此保证排名提升。

## 2. YTECHB 实测

### 壁纸总栏目

来源：https://www.ytechb.com/category/stock-wallpapers/

- H1：`Stock Wallpapers`
- Title：`Stock Wallpapers - YTECHB`
- Meta Description：`The biggest collection of Wallpapers for iPhone and Android is here! All for free in 4K and Full-HD+ Resolution! Explore Now!`
- 页面介绍额外覆盖 built-in wallpapers、Samsung、Google Pixel、Motorola、Sony、Xiaomi、OnePlus、Realme、Nokia、Huawei、Oppo 等实体。
- 栏目有具体机型和主题合集的文本链接，再通过文章标题覆盖长尾词。

### 三星品牌聚合页

来源：https://www.ytechb.com/tag/samsung-wallpapers/

- H1：`samsung wallpapers`
- Title：`samsung wallpapers Archives - YTECHB`
- 首屏 H1 后接文章列表，本次未见专门的品牌介绍段。
- 可借鉴品牌词与机型文章的聚合；PhWalls 可以补充更明确的系列范围与下载价值，而不必沿用 `Archives`。

### 具体机型文章

来源：https://www.ytechb.com/download-samsung-galaxy-s26-fe-stock-wallpapers/

- H1 / Title：`Download Samsung Galaxy S26 FE Stock Wallpapers [FHD+]`
- Meta Description：`Want to Download Samsung Galaxy S26 FE Wallpapers? Here are all Samsung Galaxy S26 FE Stock Wallpapers in high quality.`
- H2 包含 `Samsung Galaxy S26 FE Wallpapers` 与 `Download Samsung Galaxy S26 FE Wallpapers`。
- 正文明确写出 3 张、2340 × 2340 像素，并区分预览图与下载文件。

这些样本说明该站通过栏目、品牌、机型三级文本覆盖不同搜索意图；仅凭页面文案不能判断其排名或流量的因果来源。

## 3. PhWalls 自有数据

GSC 资源：`sc-domain:phwalls.com`，搜索类型：网络，未添加查询／页面／国家过滤。

报告入口：https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Aphwalls.com

| 时间窗口 | 点击 | 展示 | CTR | 平均排名 |
| --- | ---: | ---: | ---: | ---: |
| 2026-06-06 至 2026-09-05，界面“3 个月” | 2,310 | 23,223 | 9.9% | 8.7 |
| 2026-08-09 至 2026-09-05，界面“28 天” | 122 | 1,010 | 12.1% | 21.9 |

近 3 个月查询表中已确认的样本：

| 查询 | 点击 | 展示 | 文案含义 |
| --- | ---: | ---: | --- |
| phwalls | 1,095 | 1,261 | 站名词贡献较大，不能用总体 CTR 代表非站名获客能力 |
| phone wallpaper phwalls | 92 | 96 | 首页保留 Phone Wallpapers 与站名关联 |
| infinix note 60 pro wallpaper | 16 | 588 | Infinix 品牌页加强 NOTE 系列入口，具体查询由机型页承接 |
| samsung a17 wallpaper | 16 | 277 | 三星页不能只覆盖旗舰 Galaxy S，也要覆盖 Galaxy A |
| hình nền honor 600 | 12 | 32 | 越南语已有真实搜索点击，保留本地化与机型页 |
| infinix note 60 pro wallpaper hd 4k | 10 | 312 | 有高分辨率意图，但不等于库存均为 4K |
| infinix gt 30 pro wallpaper | 10 | 139 | Infinix GT 系列值得保留可见入口 |
| samsung a17 wallpaper 4k | 8 | 124 | 分辨率词可在核实图片后用于对应页面 |

近 28 天网页表样本：

| 页面 | 点击 | 展示 |
| --- | ---: | ---: |
| /en | 91 | 174 |
| /en/wallpapers/transsion-infinix/infinix-note-60 | 5 | 133 |
| /en/wallpapers/samsung/samsung-galaxy-a17-5g | 3 | 19 |
| /en/wallpapers/oppo/oppo-reno-15-pro | 2 | 132 |
| /en/wallpapers/motorola/moto-edge-70-fusion | 2 | 33 |
| /vi/wallpapers/honor/honor-600 | 2 | 3 |
| /en/desktop | 1 | 118 |

近 28 天 `phwalls` 和 `ph walls` 两个查询合计 80 次点击，约占总点击 65.6%。目前有较明确证据的非站名机会集中在具体机型；不要把品牌词当作已经验证的大流量词。近期曝光规模低于整个 3 个月窗口的日均水平，原因尚未调查，不能归因于 Title 或 Description。

GA4 资源：`phwalls`，属性 ID `530209146`。首页卡片窗口为过去 7 天（访问当日界面，约 2026-09-01 至 2026-09-07，按属性时区），与上述 GSC 窗口不同。

入口：https://analytics.google.com/analytics/web/#/a369214700p530209146/reports/intelligenthome

- 活跃用户 2,834；会话 3,470；浏览次数界面约 2.2 万。
- 国家／地区卡片：China 1,692，Singapore 217，India 210，United States 118，Pakistan 86，Japan 57。
- 网页标题卡片：中文首页 2,370 次浏览，华为中文品牌页 951，三星中文品牌页 868，小米中文品牌页 661，OPPO 中文品牌页 583，三星英文品牌页 518。
- `w_wallpaper_download_click` 2,116 次；`w_wallpaper_download_success` 1,994 次。事件数不是人数，也不能直接视作去重后的下载转化漏斗。
- 页面浏览包含各流量渠道，不能直接证明 Google 搜索需求。地区也不等同于语言偏好；中文品牌页实际浏览量为保留中文文案提供了更直接的依据。

## 4. 首页文案

| 字段 | 英文建议 | 中文建议 |
| --- | --- | --- |
| H1 | Stock Wallpapers for Phones & Desktops | 手机与电脑内置壁纸 |
| Title | Stock Phone & Desktop Wallpapers - Free Download \| PhWalls | 手机与电脑内置壁纸 - 高清原图免费下载 \| PhWalls |
| Meta Description | Download stock wallpapers from Samsung, Google Pixel, Xiaomi, Huawei and more. Browse phone and desktop collections and get original images for free. | 免费下载三星、华为、小米、OPPO、Google Pixel 等品牌手机内置壁纸，以及 Windows、Ubuntu 等电脑桌面壁纸。按品牌和机型浏览合集，预览壁纸并下载无水印原图。 |

首页以现有手机和桌面资源为范围。iPhone 导航指向 AppleWalls，不建议把 iPhone 写成 PhWalls 自有核心库存；页面可以保留清楚标注的跨站入口。

## 5. 品牌页完整文案

下方英文为 Google 英文搜索建议稿，中文对应现有中文品牌页。系列名称依据本地 JSON 合集名称；“原图”指站点收录的原始文件，未逐张核实分辨率或来源，因此不统一承诺 4K，也不把 PhWalls 表述成品牌官方网站。

Title 均已包含一次 `| PhWalls`；实际接入时应避免页面模板重复追加站名。Description 可作为 Meta Description，页面可见介绍可以在此基础上加上自动统计的合集数量。

### Samsung Galaxy — /samsung

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Samsung Galaxy Stock Wallpapers | 三星 Galaxy内置壁纸 |
| Title | Samsung Galaxy Stock Wallpapers - Free Download \| PhWalls | 三星 Galaxy内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Samsung Galaxy stock wallpapers from the S, A, Z Fold and Z Flip series. Browse by model and get original images for free. | 免费下载三星 Galaxy内置壁纸，收录Galaxy S、Galaxy A、Z Fold、Z Flip壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`samsung galaxy wallpapers`、`samsung galaxy stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Sony Xperia — /sony

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Sony Xperia Stock Wallpapers | 索尼 Xperia内置壁纸 |
| Title | Sony Xperia Stock Wallpapers - Free Download \| PhWalls | 索尼 Xperia内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Sony Xperia stock wallpapers from Xperia 1, Xperia 5 and Xperia 10. Browse collections and get original images for free. | 免费下载索尼 Xperia内置壁纸，收录Xperia 1、Xperia 5、Xperia 10壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`sony xperia wallpapers`、`sony xperia stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### vivo — /vivo

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | vivo Stock Wallpapers | vivo内置壁纸 |
| Title | vivo Stock Wallpapers - Free Download \| PhWalls | vivo内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download vivo stock wallpapers from X, V, S and Y series phones. Browse collections and get original images for free. | 免费下载vivo内置壁纸，收录X、V、S、Y 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`vivo wallpapers`、`vivo stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### iQOO — /iqoo

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | iQOO Stock Wallpapers | iQOO内置壁纸 |
| Title | iQOO Stock Wallpapers - Free Download \| PhWalls | iQOO内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download iQOO stock wallpapers from flagship, Neo and Z series phones. Browse collections and get original images for free. | 免费下载iQOO内置壁纸，收录数字旗舰、Neo、Z 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`iqoo wallpapers`、`iqoo stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Google Pixel — /google-pixel

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Google Pixel Stock Wallpapers | Google Pixel内置壁纸 |
| Title | Google Pixel Stock Wallpapers - Free Download \| PhWalls | Google Pixel内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Google Pixel stock wallpapers for Pixel, Pro, A-series and Fold models. Browse by device and get original images for free. | 免费下载Google Pixel内置壁纸，收录Pixel、Pixel Pro、a 系列及 Fold 折叠屏壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`google pixel wallpapers`、`google pixel stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Android — /android

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Android Stock Wallpapers | Android内置壁纸 |
| Title | Android Stock Wallpapers - Free Download \| PhWalls | Android内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Android stock wallpapers from Android 4.4 through Android 16. Browse by version and get original system wallpapers for free. | 免费下载 Android 4.4 至 Android 16 系统内置壁纸，按安卓版本浏览壁纸合集，预览图片并下载无水印原图，查找经典与新版 Android 默认壁纸。 |

关键词方向：`android wallpapers`、`android stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### realme — /realme

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | realme Stock Wallpapers | realme 真我内置壁纸 |
| Title | realme Stock Wallpapers - Free Download \| PhWalls | realme 真我内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download realme stock wallpapers from GT, number series and Narzo phones. Browse collections and get original images for free. | 免费下载realme 真我内置壁纸，收录GT、数字及 Narzo 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`realme wallpapers`、`realme stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Infinix — /transsion-infinix

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Infinix Stock Wallpapers | Infinix内置壁纸 |
| Title | Infinix Stock Wallpapers - Free Download \| PhWalls | Infinix内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Infinix stock wallpapers from NOTE, GT, HOT and ZERO series phones. Browse collections and get original images for free. | 免费下载Infinix内置壁纸，收录NOTE、GT、HOT、ZERO 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`infinix wallpapers`、`infinix stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### TECNO — /transsion-tecno

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | TECNO Stock Wallpapers | TECNO内置壁纸 |
| Title | TECNO Stock Wallpapers - Free Download \| PhWalls | TECNO内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download TECNO stock wallpapers from CAMON, SPARK and PHANTOM phones. Browse collections and get original images for free. | 免费下载TECNO内置壁纸，收录CAMON、SPARK、PHANTOM 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`tecno wallpapers`、`tecno stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Xiaomi — /xiaomi

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Xiaomi Stock Wallpapers | 小米 Xiaomi内置壁纸 |
| Title | Xiaomi Stock Wallpapers - Free Download \| PhWalls | 小米 Xiaomi内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Xiaomi stock wallpapers from Xiaomi flagships, MIX Fold and MIX Flip. Browse collections and get original images for free. | 免费下载小米 Xiaomi内置壁纸，收录小米数字旗舰、MIX Fold、MIX Flip壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`xiaomi wallpapers`、`xiaomi stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Redmi — /redmi

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Redmi Stock Wallpapers | Redmi 红米内置壁纸 |
| Title | Redmi Stock Wallpapers - Free Download \| PhWalls | Redmi 红米内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Redmi stock wallpapers from Redmi Note, K and Turbo series phones. Browse collections and get original images for free. | 免费下载Redmi 红米内置壁纸，收录Redmi Note、K、Turbo 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`redmi wallpapers`、`redmi stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### POCO — /poco

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | POCO Stock Wallpapers | POCO内置壁纸 |
| Title | POCO Stock Wallpapers - Free Download \| PhWalls | POCO内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download POCO stock wallpapers from POCO F, X and M series phones. Browse collections and get original images for free. | 免费下载POCO内置壁纸，收录POCO F、X、M 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`poco wallpapers`、`poco stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Huawei — /huawei

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Huawei Stock Wallpapers | 华为 Huawei内置壁纸 |
| Title | Huawei Stock Wallpapers - Free Download \| PhWalls | 华为 Huawei内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Huawei stock wallpapers from Mate, Pura, nova and foldable phones. Browse collections and get original images for free. | 免费下载华为 Huawei内置壁纸，收录Mate、Pura、nova 系列及折叠屏手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`huawei wallpapers`、`huawei stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### OPPO — /oppo

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | OPPO Stock Wallpapers | OPPO内置壁纸 |
| Title | OPPO Stock Wallpapers - Free Download \| PhWalls | OPPO内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download OPPO stock wallpapers from Find X, Find N, Reno and A series phones. Browse collections and get original images for free. | 免费下载OPPO内置壁纸，收录Find X、Find N、Reno、A 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`oppo wallpapers`、`oppo stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### HONOR — /honor

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | HONOR Stock Wallpapers | 荣耀 HONOR内置壁纸 |
| Title | HONOR Stock Wallpapers - Free Download \| PhWalls | 荣耀 HONOR内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download HONOR stock wallpapers from Magic, Magic V and number series phones. Browse collections and get original images for free. | 免费下载荣耀 HONOR内置壁纸，收录Magic、Magic V 及数字系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`honor wallpapers`、`honor stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Motorola — /motorola

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Motorola Stock Wallpapers | 摩托罗拉 Motorola内置壁纸 |
| Title | Motorola Stock Wallpapers - Free Download \| PhWalls | 摩托罗拉 Motorola内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Motorola stock wallpapers from Moto Edge, Moto G and Razr phones. Browse collections and get original images for free. | 免费下载摩托罗拉 Motorola内置壁纸，收录Moto Edge、Moto G、Razr 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`motorola wallpapers`、`motorola stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Nothing Phone — /nothing

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Nothing Phone Stock Wallpapers | Nothing Phone内置壁纸 |
| Title | Nothing Phone Stock Wallpapers - Free Download \| PhWalls | Nothing Phone内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Nothing Phone stock wallpapers, including Phone and Phone A-series collections. Browse by model and get original images for free. | 免费下载Nothing Phone内置壁纸，收录Nothing Phone 数字及 a 系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`nothing phone wallpapers`、`nothing phone stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### ASUS ROG Phone — /asus-rog-phone

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | ASUS ROG Phone Stock Wallpapers | 华硕 ROG 游戏手机内置壁纸 |
| Title | ASUS ROG Phone Stock Wallpapers - Free Download \| PhWalls | 华硕 ROG 游戏手机内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download ASUS ROG Phone stock wallpapers, from the original ROG Phone to ROG Phone 9. Browse gaming phone collections and get original images for free. | 免费下载华硕 ROG 游戏手机内置壁纸，收录初代 ROG Phone 至 ROG Phone 9壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`asus rog phone wallpapers`、`asus rog phone stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Nokia — /nokia

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Nokia Stock Wallpapers | 诺基亚 Nokia内置壁纸 |
| Title | Nokia Stock Wallpapers - Free Download \| PhWalls | 诺基亚 Nokia内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download Nokia stock wallpapers from Nokia C, G, X and numbered phone models. Browse collections and get original images for free. | 免费下载诺基亚 Nokia内置壁纸，收录Nokia C、G、X 及数字系列手机壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`nokia wallpapers`、`nokia stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### OnePlus — /oneplus

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | OnePlus Stock Wallpapers | 一加 OnePlus内置壁纸 |
| Title | OnePlus Stock Wallpapers - Free Download \| PhWalls | 一加 OnePlus内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download OnePlus stock wallpapers from OnePlus flagships, Nord, Ace and Open. Browse collections and get original images for free. | 免费下载一加 OnePlus内置壁纸，收录一加数字旗舰、Nord、Ace、Open壁纸合集。按机型浏览与预览图片，下载无水印原图，为手机主屏幕和锁屏更换壁纸。 |

关键词方向：`oneplus wallpapers`、`oneplus stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### HarmonyOS — /harmonyos

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | HarmonyOS Stock Wallpapers | HarmonyOS 鸿蒙内置壁纸 |
| Title | HarmonyOS Stock Wallpapers - Free Download \| PhWalls | HarmonyOS 鸿蒙内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download HarmonyOS 2.0 and 4.0 stock wallpapers. Browse Huawei system wallpaper collections and get original images for free. | 免费下载 HarmonyOS 2.0 与 HarmonyOS 4.0 鸿蒙系统内置壁纸，按系统版本浏览华为壁纸合集，预览图片并下载无水印原图。 |

关键词方向：`harmonyos wallpapers`、`harmonyos stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

### Huawei MatePad — /huawei-matepad

| 字段 | 英文 | 中文 |
| --- | --- | --- |
| H1 | Huawei MatePad Stock Wallpapers | 华为 MatePad内置壁纸 |
| Title | Huawei MatePad Stock Wallpapers - Free Download \| PhWalls | 华为 MatePad内置壁纸 - 原图免费下载 \| PhWalls |
| Description | Download stock wallpapers from Huawei MatePad Pro and MediaPad M6. Browse tablet wallpaper collections and get original images for free. | 免费下载华为 MatePad Pro 与 MediaPad M6 平板内置壁纸，浏览对应设备的壁纸合集，预览图片并下载无水印原图。 |

关键词方向：`huawei matepad wallpapers`、`huawei matepad stock wallpapers`，以及实际机型名称 + `wallpaper` / `wallpapers download`。

## 6. 桌面栏目补充

桌面总页 H1：`Desktop Wallpapers`；Title：`Desktop Wallpapers - Windows, Ubuntu & More | PhWalls`；Description：`Download desktop wallpapers from Windows, Ubuntu, ChromeOS and Microsoft Surface. Browse system and device collections and get original images for free.`

中文 H1：`电脑桌面壁纸`；Title：`电脑桌面壁纸 - Windows、Ubuntu 原图下载 | PhWalls`；Description：`免费下载 Windows、Ubuntu、ChromeOS 与微软 Surface 桌面壁纸，按系统与设备浏览合集，预览图片并下载无水印原图。`

### Windows — /desktop/microsoft-windows

- 英文 H1：`Windows Wallpapers`
- 英文 Title：`Windows Wallpapers - Free Download | PhWalls`
- 英文 Description：Download Windows wallpapers from Windows XP, 7, 8, 10 and 11. Browse collections and get original images for free.
- 中文 H1：`Windows壁纸`
- 中文 Title：`Windows壁纸 - 原图免费下载 | PhWalls`
- 中文 Description：免费下载Windows XP、7、8、10、11壁纸，浏览对应系统或设备的图片合集，预览壁纸并下载无水印原图。

### Microsoft Surface — /desktop/microsoft-surface

- 英文 H1：`Microsoft Surface Wallpapers`
- 英文 Title：`Microsoft Surface Wallpapers - Free Download | PhWalls`
- 英文 Description：Download Microsoft Surface wallpapers from Surface Pro, Laptop, Book and Studio. Browse collections and get original images for free.
- 中文 H1：`微软 Surface壁纸`
- 中文 Title：`微软 Surface壁纸 - 原图免费下载 | PhWalls`
- 中文 Description：免费下载Surface Pro、Laptop、Book、Studio壁纸，浏览对应系统或设备的图片合集，预览壁纸并下载无水印原图。

### Ubuntu — /desktop/ubuntu

- 英文 H1：`Ubuntu Wallpapers`
- 英文 Title：`Ubuntu Wallpapers - Free Download | PhWalls`
- 英文 Description：Download Ubuntu wallpapers from Ubuntu releases and mascot collections. Browse collections and get original images for free.
- 中文 H1：`Ubuntu壁纸`
- 中文 Title：`Ubuntu壁纸 - 原图免费下载 | PhWalls`
- 中文 Description：免费下载历代 Ubuntu 系统与吉祥物主题壁纸，浏览对应系统或设备的图片合集，预览壁纸并下载无水印原图。

### ChromeOS — /desktop/google-chromeos

- 英文 H1：`ChromeOS Wallpapers`
- 英文 Title：`ChromeOS Wallpapers - Free Download | PhWalls`
- 英文 Description：Download ChromeOS wallpapers from ChromeOS artwork and built-in collections. Browse collections and get original images for free.
- 中文 H1：`ChromeOS壁纸`
- 中文 Title：`ChromeOS壁纸 - 原图免费下载 | PhWalls`
- 中文 Description：免费下载ChromeOS 内置图片与艺术家主题壁纸，浏览对应系统或设备的图片合集，预览壁纸并下载无水印原图。

### Google OS — /desktop/google-os

- 英文 H1：`Google OS Wallpapers`
- 英文 Title：`Google OS Wallpapers - Free Download | PhWalls`
- 英文 Description：Download Google OS wallpapers from Google Fuchsia OS and Aluminium OS. Browse collections and get original images for free.
- 中文 H1：`Google OS壁纸`
- 中文 Title：`Google OS壁纸 - 原图免费下载 | PhWalls`
- 中文 Description：免费下载Google Fuchsia OS 与 Aluminium OS壁纸，浏览对应系统或设备的图片合集，预览壁纸并下载无水印原图。

## 7. 优先级与落地方式

1. **Samsung + Infinix + OPPO：优先英文品牌文案与机型入口。** 三星既有 GA 品牌页访问，也有 GSC A17 查询；Infinix 有 NOTE 60 与 GT 30 机型查询；OPPO Reno 15 Pro 在近 28 天仍有 132 次页面展示。品牌页介绍覆盖系列，机型页标题保留准确型号。
2. **Huawei + Xiaomi + OPPO + Samsung：同步中文文案。** GA 已看到中文品牌页实际访问。完善原图下载说明，但不能把这些访问量当成 Google 中文搜索量。
3. **HONOR + Motorola：优化已有长尾页面。** HONOR 600 越南语查询、Moto Edge 70 Fusion 英文页面已有少量近期点击，属于可测试方向，尚不是大样本结论。
4. **其余品牌：按实际库存完善独立介绍。** Google Pixel、Sony Xperia、Nothing Phone 等使用完整产品名称，比只写 Google、Sony、Nothing 更明确。是否优先投入需要更多非站名展示数据。

当前对应代码位置：

- `src/lib/i18n.ts`：品牌 H1、SEO Title、Description 的通用模板。
- `src/lib/seo.ts`：`getCategorySeoCopy()` 目前仅替换品牌名称，适合增加按品牌与语言匹配的文案，再保留通用回退。
- `src/app/[brand]/page.tsx`：元数据追加 `| PhWalls`，页面可见描述与 Meta Description 复用同一文案。不要接入已经带站名的完整 Title 后再次追加。
- `src/lib/wallpaper-seo.ts`：已有 Infinix Note 60、Samsung Galaxy A17 5G 两个英文标题实验，后续修改时需要记录时间，避免无记录覆盖已有实验。

品牌 H1 建议自然、简短；Title 将主要主题放前面，下载价值放后面；Description 用完整句子补充系列、浏览与下载方式。英文 Title 可先按约 50–65 个字符检查显示，Description 约 130–160 个字符，但这不是 Google 的硬性字符限制，实际截断受展示宽度影响。

`Stock Wallpapers` 有助于表达内置壁纸定位，但无需把 H1、Title、Description 写成完全相同的一句话。`meta keywords` 不用于 Google 排名，关键词应自然出现在页面主题、正文、图片描述与内链锚文本中。

`4K`、`Live Wallpapers`、`Official`、`No Watermark` 等文案需要内容支持。当前草稿不统一添加 4K，不将 MP4 文件等同于可在所有手机原生安装的动态壁纸，也不添加未核实的 One UI、HyperOS、ColorOS 系统版本承诺。正式上线前抽查原图与来源；如有仿制或二次创作，需要独立标注，不能归入 stock／内置壁纸。

英文与中文建议可以作为第一轮文案基线；正式改代码时按项目约定同步日语、越南语、繁体中文。繁中用“內建桌布／原圖下載”，日语用“標準壁紙／無料ダウンロード”，越南语用“hình nền gốc／tải miễn phí”，避免单纯照搬英文词序。

## 8. 如何判断文案是否有效

记录上线日期、页面与旧文案，优先选少量品牌及对应机型做第一批修改。在 GSC 中按页面、查询、国家、搜索类型分别对比前后 28 天，剔除 `phwalls` 与 `ph walls` 等站名查询后观察展示、点击、CTR 与平均排名；低展示页面延长观察期。

Meta Description 主要帮助摘要表达与点击选择，不是直接排名因素，Google 也可能根据查询改写摘要。CTR 要在相近排名、设备与查询类型下比较，不能直接把总体 CTR 上升归因于文案。

GA 用自然搜索着陆后的参与情况与下载成功事件辅助判断内容是否满足需求，注意事件数与用户数的区别。本次 GA 首页数据只用于需求参考，不用于证明 SEO 改动效果。

当前近 28 天 Google 曝光较少，需要另外确认最近的收录、canonical、语言路由及站点变更时间线；本次未进行根因排查，不能预期仅改文案就恢复流量。
