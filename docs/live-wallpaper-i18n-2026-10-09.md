# 动态壁纸五语言补全与静态隔离

2026-10-09 已完成 Cloudflare D1 `phwalls` 的动态多语言补全，覆盖本次 Live catalog 的 131 个合集，英、简中、日、越、繁中各 131 条，共 655 条。每条均含本地化设备名、独立 SEO 标题和完整描述。尚未核验机型的 Samsung Thom Browne 保留原有草稿状态。

标准设备与系统 ID 保持不变。静态文案保留在 `w_device_i18n`，动态文案存入新表 `w_live_device_i18n`；`w_collection_i18n` 视图提供带媒体类型的统一读取。`0011`、`0012` 迁移已应用到生产和本地。已部署的旧版本仍可使用静态表；后台类型筛选、对应类型的保存与删除，以及动态详情读取新文案，需要部署本次代码后生效。

文案依据当前动态素材的真实数量和格式生成。已发布合集使用已发布视频数量；草稿合集使用可用素材数量。英文使用 Live Wallpapers、MP4 Downloads，日文使用ライブ壁紙，越南文使用 Hình nền động，繁中使用動態桌布。设备名称遵循既有品牌本地化规则，型号与系统版本保留，不添加未核实的官方、4K 或适配承诺。描述区分视频与图片，说明播放预览、原始 MP4 下载及使用条件。

| 语言 | Samsung Galaxy S25 SEO 标题示例 |
| --- | --- |
| en | Samsung Galaxy S25 Live Wallpapers - Free MP4 Downloads |
| zh | 三星 Galaxy S25动态壁纸免费下载 - MP4 视频 |
| ja | サムスン Galaxy S25のライブ壁紙｜MP4動画を無料ダウンロード |
| vi | Hình nền động Samsung Galaxy S25 - Tải video MP4 miễn phí |
| zh-hant | 三星 Galaxy S25動態桌布下載 - 免費 MP4 影片 |

生产写入前导出 D1 备份并在快照上完整预演迁移与补全。写入后读取线上所有语言、设备及壁纸记录，逐字段比对：原有 6,080 条语言记录、1,216 条设备记录及 11,568 条素材记录完全一致；新增 655 条动态文案与生成结果完全一致；外键违规为 0。SQL 仅补缺失字段，重复执行不会覆盖已有动态人工编辑。

生成工具为 `scripts/backfill-live-device-seo.mjs`。生产与本地备份、库存、文案 JSON、SQL、预演及线上核验结果保存在 `/Users/fenghe/web-project/source/phonewalls/data/live-i18n-2026-10-09/`。生产使用 `live-seo.sql`，本地设备 ID 不同，使用 `live-seo-local.sql`；不要混用。

代码验证：`npm run lint` 无警告与错误，`npm run build` 成功；`node --experimental-transform-types --test tests/*.test.mjs scripts/tests/*.test.mjs` 的 122 项测试全部通过。公开查询直接使用对应媒体的基础表及 `(device_id, language)` 索引，避免统一视图被物化而扫描全部语言记录。
