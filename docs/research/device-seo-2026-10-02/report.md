# 设备与系统合集 SEO 文案补全 — 2026-10-02

本次覆盖线上 995 个合集，生成 en / zh / ja / vi / zh-hant 各 995 条，共 4,975 条 `w_device_desc` 标题与描述。`name` 是独立的完整 SEO 展示标题，不修改 `w_devices.device_name`、稳定 URL 或壁纸文件。

## 来源与事实边界

- 英文：读取 11 个公开文章 sitemap，收集 1,500 个壁纸相关 URL，匹配 674 个库存合集，直接核验 100 篇文章。574 个匹配项仍仅为来源发现，321 个合集没有精确外部匹配，依靠库存描述；不能声称全部合集已获厂商来源认证。
- 日语：29 次日本科技站公开站内搜索，直接核验 11 个页面；以「壁紙」「無料ダウンロード」「ホーム画面／ロック画面」「デスクトップ背景」按实际用途组织。
- 越南语：50 次本地科技站公开站内搜索，直接核验 11 篇文章；标题采用 `Hình nền`，描述使用 `Tải miễn phí`、`bộ sưu tập` 与 `ảnh gốc`，而非照搬英文 Stock 用语。
- 简中与繁中：直接核验 16 个本地页面。简中以「壁纸、预览、原图下载」为主；台港共用繁中采用两地均有实例的「桌布、下載原圖、背景圖片」，不堆叠同义词。
- 搜索引擎部分返回空结果、跳转或验证页面；这些失败查询不作为需求证据。本次没有搜索量、关键词难度或排名承诺。
- 图片数量、格式、明暗标签和尺寸均来自线上 D1。尺寸仅在所有原图具有同一宽高时写入，并明确指下载原图，不把压缩预览等同于原图。样式与颜色来自素材名称后缀，未宣称逐张视觉审核。
- 保留 Pro / Ultra / FE / Fold / Flip、特别版与系统版本。纠正文案用途中的 MateBook Fold、Surface Duo、Smartisan TNT Desktop、Chrome OS for Phone 和 Ubuntu Mobile Phone 分类偏差。
- 不加入未经核实的「官方、无水印、4K／8K、新机已发布、原生动态壁纸、所有屏幕适配」承诺。免费下载是产品提供的下载方式，不等于商业授权或版权免费。

## 地区文案示例：Oppo Find X10

| 语言 | SEO 标题 | 描述 |
| --- | --- | --- |
| en | Oppo Find X10 Wallpapers | Browse 4 Oppo Find X10 wallpapers for your home or lock screen. Includes gradients. Colors include grey and silver. Preview the collection and download PNG originals for free. |
| zh | Oppo Find X10 壁纸 | 收录4张Oppo Find X10壁纸。包含渐变图案。可选灰色与银色等配色。先预览画面，再免费下载PNG原图，为手机主屏幕或锁屏选择喜欢的配色。 |
| ja | Oppo Find X10の壁紙 | Oppo Find X10の壁紙4枚を無料ダウンロード。グラデーションを収録。グレーやシルバーなどの配色から選べます。画像をプレビューしてから、PNGの元画像を保存できます。ホーム画面やロック画面に使う1枚を選べます。 |
| vi | Hình nền Oppo Find X10 | Tải miễn phí 4 hình nền Oppo Find X10. Bộ sưu tập có màu chuyển sắc. Các tông màu gồm xám và bạc. Định dạng ảnh gốc PNG. Xem trước bộ sưu tập và chọn ảnh gốc cho màn hình điện thoại. |
| zh-hant | Oppo Find X10 桌布 | Oppo Find X10桌布共4張，可先看預覽再下載原圖。收錄漸層圖案。配色包括灰色與銀色等。提供PNG檔案，挑選適合手機主畫面或鎖定畫面的背景圖片。 |

## 可复核文件

- `inventory.json`：本次线上库存快照。
- `device-seo-records.json`：全部 4,975 条最终文案。
- `source-ledger.json`：逐合集的事实来源、外部核验状态与各语言用词依据。
- `english-model-sources.json` 与各语言 `*-search-research.json`：来源 URL、查询记录与限制。
- `device-seo-backfill.sql`：仅插入缺失的 `(device_id, language)`，保留后台已有编辑，重复执行不会覆盖。

## 验证与写入

入库前已在 SQLite 执行全量 SQL，核对 995 个合集各含五种语言，4,975 个 ID 唯一、外键一致。相关 17 项测试、ESLint 与 Next.js 构建通过。写入前完整备份线上 D1；备份路径 `/tmp/phwalls-before-device-seo-20261002.sql`。

生产写入与读回校验结果见 `production-verification.json`。本次为 D1 文案补全，前台读取接入仍按此前范围独立处理。

生产结果：已写入 4,975 条，五种语言各 995 条；全量读回逐条匹配 4,975 条，缺失语言、空记录和外键错误均为 0。后台 API 样例已读取 Oppo Find X10 的五语言记录并逐条匹配。设备仍为 995 个，壁纸仍为 8,594 条。
