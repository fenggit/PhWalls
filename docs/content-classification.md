# 内容分类

壁纸分类使用三个互不替代的字段。所有存储值均为语言无关的英文，展示文字从五语言 JSON 读取。

| 字段 | 粒度 | 允许值与用途 |
| --- | --- | --- |
| `w_devices.theme` | 一台设备 | 一个主要视觉风格，或 `NULL` 表示未分类 |
| `w_wallpapers.tags` | 单张壁纸 | 小写英文 JSON 数组，描述画面内容或风格 |
| `w_wallpapers.theme` | 单张壁纸 | `normal`、`dark`、`light`，仅表示明确的明暗版本 |

设备的 `dark` 主风格不代表每张壁纸都有明暗配对。单张画面偏暗也不能自动标为 `dark`；未确认有配对时使用 `normal`。

## 设备主风格

`w_devices.theme` 由 `src/lib/device-theme.ts` 的 `DEVICE_THEMES` 定义，数据库触发器限制为以下值。`NULL` 表示暂未分类。

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

创建设备时省略该字段保存为 `NULL`；更新时省略保留原值，传入 `null` 或空字符串清除。新增或删除枚举必须同次更新 TypeScript 类型、五语言文案、D1 校验迁移和本文。

## 单张壁纸标签

`tags` 是最多 20 项、每项最多 40 字符的非空小写英文数组，例如：

```json
["abstract", "gradient", "fluid art"]
```

词表文件是唯一标签清单：

```text
src/data/language/en/wallpaper-tags.json
src/data/language/zh/wallpaper-tags.json
src/data/language/ja/wallpaper-tags.json
src/data/language/vi/wallpaper-tags.json
src/data/language/zh-hant/wallpaper-tags.json
```

五个文件必须包含相同的英文键；英文值与键相同，其他文件提供对应语言的展示文字。英文键同时用于后台、D1、小程序 API、主题页匹配和导入报告，因此不得翻译、改大小写或随意改名。新增、重命名或删除标签时，必须同步五个词表、相关主题匹配和本文档，并评估已存 D1 数据。

标签应描述画面主体、场景、视觉风格或构图，例如 `flowers`、`cityscape`、`abstract`。不要用品牌、设备型号、文件格式、分辨率或发布状态充当标签。多个标签可以共存，但应去重并避免近义词堆叠。

小程序 API 原样返回英文 `tags`，不随 `lang` 改变，也不返回额外的 `tagKeys`。需要本地化显示的客户端应按英文键查询同语言词表。

## 文件夹标签报告

后台选择设备文件夹时，可在根目录放置一个 `wallpaper-tags.json` 或 `wallpaper-tags.md`。报告只在浏览器本地读取，不会上传到 R2，也不会单独创建壁纸记录。

- 优先读取 JSON。JSON 不存在时才读取 Markdown；JSON 损坏时停止本次导入并提示。
- JSON 为数组，每项含 `model`、`origin` 和 `tags`；可选 `tags_text` 必须等于以 `, ` 拼接的 `tags`。
- `origin` 使用 `origin/完整文件名`，也可含所选设备文件夹前缀。文件名、扩展名和大小写必须准确匹配。
- Markdown 使用“原始文件名 / 画面描述 / 英文标签”三列表格，英文标签用逗号分隔。
- 报告最大 5 MB。未知标签、重复原文件、越级路径、型号不匹配或格式损坏都会阻止该文件夹进入上传队列。

报告匹配的标签会与队列当前标签去重合并；管理员可在上传前编辑。压缩图和视频网页预览不单独导入标签。
