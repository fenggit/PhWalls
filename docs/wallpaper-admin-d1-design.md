# 壁纸数据与后台模型

更新日期：2026-11-15。本文描述当前 D1 与 R2 的生产数据模型。历史迁移顺序和 SQL 以 `migrations/` 为准；不得修改已应用的迁移文件。

## 架构与边界

- Cloudflare D1 保存品牌、设备、合集多语言内容、壁纸元数据、下载设置及监控数据，不保存二进制媒体。
- Cloudflare R2 保存原图、压缩预览图、动态视频和可选视频预览。D1 只保存对象 key，不能保存可变 CDN URL、签名 URL 或凭据。
- 后台仅在 `ADMIN_HOST` 指定的管理域名提供页面和管理 API。公开网站只读取已发布且不在删除中的设备和壁纸。
- 静态和动态壁纸共享设备，但分别维护主图、发布状态和五语言合集内容。原图下载始终通过服务端代理，不暴露 R2 原图地址。
- 所有 `*_date`、`*_at` 时间字段均为 Unix 毫秒。`release_date` 是展示日期，允许 `YYYY`、`YYYY/MM`、`YYYY/MM/DD` 或空字符串。

## 核心内容表

### `w_brands`

仅保存后台新增的自定义品牌。内置品牌仍来自前端分类配置。

| 字段 | 类型 | 默认值与约束 | 用途 |
| --- | --- | --- | --- |
| `slug` | TEXT | 主键；由应用限制为 1–80 位小写字母、数字和连字符 | 稳定品牌标识 |
| `title` | TEXT | 非空；`LOWER(TRIM(title))` 唯一 | 后台显示名称 |
| `kind` | TEXT | `mobile` 或 `desktop` | 品牌类别 |
| `title_key` | TEXT NULL | 非空时唯一 | Unicode、大小写和空白归一化后的并发查重键 |
| `create_date`、`updated_date` | INTEGER | 非空 | 创建与更新时间 |

`w_devices.brand_name` 不设外键。创建或编辑设备时，应用必须校验品牌存在、类型与设备类别相容，且不得与内置品牌或保留路由冲突。

### `w_devices`

一行代表一个设备、系统版本或其他壁纸合集主体。

| 字段 | 类型 | 默认值与约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | 主键 | 稳定设备 ID |
| `brand_logo` | TEXT NULL |  | Logo 路径或 URL |
| `brand_name` | TEXT | 非空 | 内置或自定义品牌 slug |
| `device_name` | TEXT | 非空；与品牌组合唯一 | 标准名称，用于识别与兜底展示 |
| `name_key` | TEXT NULL | 与品牌组合时非空唯一 | 归一化名称查重键 |
| `device_slug` | TEXT | 非空；与品牌组合唯一 | 稳定 URL slug，改名时保持不变 |
| `device_category` | TEXT | `phone`、`phone_fold`、`pad`、`desktop`、`os` | 设备类别 |
| `theme` | TEXT NULL | 空或十个设备主风格之一 | 整套壁纸的主要视觉风格，见[内容分类](content-classification.md) |
| `is_popular_brand` | INTEGER | `0`；仅 `0` 或 `1` | 品牌热门标记，同一品牌设备应保持一致 |
| `device_splash_url` | TEXT NULL |  | 宣传图 URL |
| `upload_prefix` | TEXT NULL | 1–300 字符；非空唯一；禁止绝对路径、空层级、`..`、冒号和反斜杠 | 后续上传的统一 R2 目录 |
| `release_date` | TEXT | `''` | 设备或合集展示日期 |
| `status` | TEXT | `draft`；`draft`、`published`、`unpublished` | 公开可见状态 |
| `deletion_state` | TEXT | `none`；`none`、`processing`、`pending` | 整个设备删除状态 |
| `create_date`、`updated_date` | INTEGER | 非空 | 创建与更新时间 |

桌面设备或桌面专属品牌的新上传目录须位于 `desktopwalls/<brand-slug>/`。`upload_prefix` 只决定未来上传，历史对象仍按记录的 key 读取。删除任务进行期间，数据库触发器会阻止普通设备与壁纸写入；仅允许另一媒体类型首次从空目录设置为非空目录。

### `w_wallpapers`

一行代表一张静态壁纸或一个动态视频。

| 字段 | 类型 | 默认值与约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | 主键 | 稳定素材 ID |
| `device_id` | TEXT | 外键至 `w_devices`，`ON DELETE RESTRICT` | 所属设备 |
| `name` | TEXT | 非空；`device_id`、`media_type`、`name` 唯一 | 素材名称 |
| `mime_type`、`file_format` | TEXT | 非空 | 实际媒体类型与格式 |
| `size_bytes` | INTEGER | `0`；不得小于 0 | 原文件字节数 |
| `origin_key` | TEXT | 非空 | 原图或原视频 R2 key |
| `compress_key` | TEXT NULL |  | 静态预览图或动态封面 key |
| `width`、`height` | INTEGER NULL | 非空时大于 0 | 原始媒体像素尺寸 |
| `theme` | TEXT | `normal`；`normal`、`dark`、`light` | 单张素材的明暗版本标记 |
| `media_type` | TEXT | `static` 或 `dynamic` | 静态图片或动态视频 |
| `category` | TEXT | `phone`、`phone_fold`、`pad`、`desktop`、`os` | 素材适配类别，可不同于设备类别 |
| `is_primary` | INTEGER | `0`；仅 `0` 或 `1` | 同设备、类别、媒体类型的主展示图 |
| `tags` | TEXT | `'[]'`；必须为 JSON 数组 | 小写英文画面标签 |
| `status` | TEXT | `draft`；`draft`、`published`、`unpublished` | 发布状态 |
| `deletion_state` | TEXT | `none`；`none`、`processing`、`pending` | 删除状态 |
| `create_date`、`updated_date` | INTEGER | 非空 | 创建与更新时间 |

部分唯一索引保证每个设备、类别和媒体类型最多一张主图。动态素材可根据 `origin_key` 推导网页预览 key；已登记删除的原图、封面或推导预览 key 不能被后续写入重新引用。

### `w_device_i18n`、`w_live_device_i18n` 与 `w_collection_i18n`

前两张表结构相同，分别保存静态和动态合集文案。视图 `w_collection_i18n` 以 `media_type` 合并读取，不能直接写入视图。

| 字段 | 类型 | 默认值与约束 | 用途 |
| --- | --- | --- | --- |
| `id` | TEXT | 主键 | 稳定记录 ID |
| `device_id` | TEXT | 非空外键至 `w_devices`，`ON DELETE CASCADE` | 所属设备 |
| `language` | TEXT | `en`、`zh`、`ja`、`vi`、`zh-hant`；设备和语言唯一 | 语言 |
| `display_name` | TEXT NULL | 非空时 1–200 字符 | 本地化设备名 |
| `seo_title` | TEXT NULL | 非空时 1–200 字符 | 本地化 SEO 标题 |
| `description` | TEXT NULL | 非空时 1–5000 字符 | 合集画面、风格与适配说明 |
| `create_date`、`updated_date` | INTEGER | 非空 | 创建与更新时间 |

每行至少填写一个内容字段。公开读取按当前语言、英文、设备标准名或页面模板依次回退。描述不应保存会变化的张数或固定分辨率，页面在展示时计算这些事实。

## 保护、设置与监控表

| 表 | 关键字段与约束 | 用途 |
| --- | --- | --- |
| `w_deleted_wallpaper_files` | `object_key` 主键，`deleted_at` 非空 | 记录已删除 key，阻止迟到上传或导入重新引用 |
| `w_collection_deletions` | `(device_id, media_type)` 主键；状态为 `processing` 或 `pending`；含 `lease_token` | 静态、动态合集独立删除锁 |
| `w_api_access_events` | `id` 主键；状态码 100–599；来源枚举；UA 最长 256 字符 | 公开 API 访问监控，按写入渐进保留约 7 天 |
| `w_api_ip_blocklist` | `ip` 主键；`created_at` 非负 | 后台手动封禁的单个 IPv4 或 IPv6 地址 |
| `w_download_settings` | 单例 `id=1`；`daily_limit` 为 NULL 或 0–1,000,000 整数；`ads_enabled` 为 0 或 1 | 全站下载上限与广告开关 |
| `w_download_daily_usage` | `(day, ip)` 主键；`downloads` 非负 | 按北京时间自然日记录成功下载次数 |
| `w_download_reservations` | `id` 主键；`day`、`ip` 非空 | 下载传输完成前的额度预占，防止并发超额 |

监控记录只保存来源域名、哈希化资源标识和截断 User-Agent，不保存完整 Referer、请求体、Cookie、授权信息或原图 key。下载预占不是成功次数；只有完整传输并完成结算后才增加 `downloads`。

## 公开读取、缓存与安全

- 页面和公开接口只读取设备及壁纸均为 `published`、且 `deletion_state=none` 的记录。下载请求每次实时复核，不能依赖展示缓存。
- D1 展示查询使用按语言和路由隔离的 60 秒 Cloudflare Cache API 缓存。后台编辑、发布或下架后，公开展示最多延迟约 60 秒；HTML 边缘缓存另见[壁纸发现与 SEO](wallpaper-discovery-seo.md)。
- 管理写操作必须验证管理域名、会话、同源 `Origin` 和 `X-Phwalls-Admin: 1`。会话 Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Strict`。
- R2 上传授权必须限定对象 key、角色、媒体类型、设备和有效期。R2 与 D1 不存在跨服务事务，上传先写草稿，完整性检查通过后才发布。
- 数据库字段、迁移、代码和操作文档必须同次更新。字段变动同时更新本文与[后台操作说明](wallpaper-admin-operations.md)，并按影响更新 API 文档。
