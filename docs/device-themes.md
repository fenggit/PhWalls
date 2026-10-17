# 设备主色调与壁纸标签

`w_devices.theme` 表示设备整套壁纸的主要视觉风格。每台设备保存一个语言无关的英文枚举值，允许 `NULL` 表示未分类；不得保存中文名称、翻译文本、自由文本或字符串数组。示例风格不是穷举，当前枚举依据实际壁纸内容覆盖以下十类。

| 存储值 | 简体中文 | English | 日本語 | Tiếng Việt | 繁體中文 |
| --- | --- | --- | --- | --- | --- |
| `dark` | 暗黑系 | Dark | ダーク | Tông tối | 暗黑系 |
| `gradient` | 渐变 | Gradient | グラデーション | Chuyển sắc | 漸層 |
| `minimal_geometric` | 极简几何 | Minimal geometry | ミニマル幾何学 | Hình học tối giản | 極簡幾何 |
| `anime` | 动漫风 | Anime | アニメ | Phong cách anime | 動漫風 |
| `abstract` | 抽象艺术 | Abstract art | 抽象アート | Nghệ thuật trừu tượng | 抽象藝術 |
| `nature` | 自然风景 | Nature | 自然風景 | Phong cảnh thiên nhiên | 自然風景 |
| `photography` | 摄影 | Photography | 写真 | Nhiếp ảnh | 攝影 |
| `floral` | 花卉植物 | Floral & botanical | 花・植物 | Hoa và thực vật | 花卉植物 |
| `technology` | 科技未来 | Futuristic tech | 未来・テクノロジー | Công nghệ tương lai | 科技未來 |
| `illustration` | 插画艺术 | Illustration | イラスト | Nghệ thuật minh họa | 插畫藝術 |

“主色调”包含整体视觉风格，并非只描述颜色。枚举定义为 `src/lib/device-theme.ts` 的 `DEVICE_THEMES`，`DEVICE_THEME_LABEL_KEYS` 对应 `src/lib/i18n.ts` 中的 `deviceTheme*` 五语言文案。后台列表按映射展示，编辑使用单选下拉框。新增枚举时，需同时更新类型、五语言映射、数据库校验迁移和本文，不能直接向数据库写入新字符串。

## 三个字段的区别

| 字段 | 粒度 | 格式与用途 |
| --- | --- | --- |
| `w_devices.theme` | 一台设备，包含其静态与动态合集 | 单个主题枚举，例如 `gradient`；用于整体风格分类 |
| `w_wallpapers.tags` | 单张壁纸 | JSON 字符串数组，例如 `["抽象","渐变","流体"]`；描述风格、画面内容等相关标签 |
| `w_wallpapers.theme` | 单张壁纸 | `normal` / `dark` / `light`；仅标识已确认的明暗版本配对，不凭画面亮度把独立壁纸改成明暗版本 |

设备的 `dark` 是暗黑视觉风格，不表示每张壁纸都存在 `light` 配对。设备主题不是单张壁纸标签的完整替代；同一设备内可有不同风格，汇总时选择主要风格，后台可人工调整。新增或删除素材不会自动重写设备主题，避免覆盖人工分类。

## 数据库迁移与接口

D1 基于 SQLite，没有原生 `ENUM` 类型。`0015_device_theme.sql` 新增可空 `TEXT` 字段及长度约束；`0016_device_theme_enum.sql` 通过插入与更新触发器限制枚举，非法值报 `invalid_device_theme`。`NULL` 表示未分类，旧客户端省略字段时保持兼容。

使用 `npx wrangler d1 migrations apply phwalls --local` 验证迁移，再按项目运维流程对线上数据库应用迁移。后台代码使用新字段前，应先应用 `0015` 与 `0016`。

后台 `POST /api/admin/devices` 与 `PATCH /api/admin/devices` 接受：

```json
{ "theme": "gradient" }
```

创建时省略字段保存为 `NULL`；更新时省略字段保留原值；显式传入 `null` 或空字符串清除分类。数组、未知枚举和翻译文本均拒绝写入。后台设备查询返回原始枚举值，由使用方按语言映射；公开小程序 API 当前未增加该响应字段。

## 2026-10-17 数据整理

为 11,586 张壁纸补充风格与画面内容标签，结合本地预览图、图像分类及人工抽查纠正旧文件名造成的误判；修正 523 张折叠手机壁纸分类、36 张 MateBook Fold 桌面分类和 63 张存在明暗配对的壁纸主题。根据标签与画面亮度汇总 1,217 台设备的主要视觉风格，使用上表枚举保存。

备份、逐条修改记录、配对依据、回滚 SQL 与核验报告保存在本次提供的本地素材目录下的 `data/style-backfill-2026-10-17/`。线上数据写入与前后台代码部署是独立操作；应用迁移不等于页面已发布。
