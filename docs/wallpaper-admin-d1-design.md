# 壁纸数据与后台管理设计方案

- 日期：2026-09-28
- 品牌管理实现同步：2026-10-02
- 状态：设计稿
- 范围：架构与实施建议，不包含代码实现

## 1. 目标

将当前随网站打包的壁纸 JSON 数据逐步迁移到 Cloudflare D1，使壁纸元数据可由后台维护；继续使用 Cloudflare R2 存放图片和视频文件。后台支持按文件或文件夹批量上传、编辑与管理壁纸。

需要管理的内容：

- 品牌、设备名称及设备分类
- 壁纸合集描述及五种语言版本
- Phone、Phone Fold、Pad、Desktop 分类
- 暗黑、明亮等显示主题
- 静态图片与动态壁纸
- 文件格式、大小、尺寸、原图和预览图/视频封面
- 壁纸名称与多个 tag
- 草稿、已发布与取消发布状态

## 2. 当前系统基础

- 网站使用 Next.js 15 App Router，部署到 Cloudflare Pages；`wrangler.toml` 已配置 Pages 输出目录和 `nodejs_compat`。
- 壁纸集合目前由 `src/data/*.json` 与 `src/data/desktopwalls/*.json` 提供，数据形态为“合集名称、日期、条目数组”。
- 单张条目现有字段主要是 `name`、`type`、`size`、`originPath`、`compressPath` 和可选 `tag`。
- 图片对象存放在 R2，公开预览使用 `static.phwalls.com`；下载继续走现有服务端代理链路。
- 页面与公开 API 会加载这些 JSON。改为 D1 后，数据读取需要从构建期导入逐步转成请求期查询，并保留原有 URL 语义。

## 3. 推荐架构

```text
浏览器
  ├─ 公开页面/API ──> Cloudflare Pages / Next.js ──> D1 查询壁纸元数据
  │                                             └─> R2 公开域名读取预览图
  └─ a.phwalls.com ──> 登录页/管理页面 ──> 管理 API ──> D1
                                                   └─> R2 上传原图、预览图或视频
```

- **D1**：保存自定义品牌、设备、合集多语言描述、壁纸、标签和文件对象键等结构化元数据，不保存二进制文件。
- **R2**：保存原始图片、压缩预览图、动态壁纸视频和视频封面。
- **管理界面**：复用现有 Next.js 项目，将 `a.phwalls.com` 配置为后台专用域名；后台页面与 API 仅接受该 Host，公开站点域名不提供管理入口。
- **身份验证**：提供账号和密码登录。首期使用单个管理员账号，用户名及带随机盐的密码哈希通过 Cloudflare 环境变量/Secret 配置，不在 D1 保存明文密码，也不增加用户表。
- **登录会话**：登录成功后签发有期限的服务端签名会话 Cookie，设置 `Secure`、`HttpOnly`、`SameSite=Strict`，使用 host-only Cookie；所有管理 API 每次请求验证会话。写操作校验请求来源并防 CSRF，登录接口配置 Cloudflare WAF 限速；密码和会话签名密钥支持轮换。
- **公开读取**：公开路由只读取设备和壁纸均为已发布状态的数据；后台草稿不出现在公开 API、页面和站点地图中。

## 4. 最小数据模型

核心业务模型采用四张表：`w_brands` 保存后台新增的自定义品牌定义；`w_devices` 保存所属品牌标识、壁纸目标名称及分类；`w_wallpapers` 保存目标下的单张壁纸；`w_device_i18n` 保存目标的本地化名称、SEO 标题及壁纸合集描述。目标可以是硬件设备，也可以是操作系统版本。标签采用 JSON 数组文本保存，避免单独增加标签表。迁移记录、已删除文件保护等辅助表不计入上述核心业务表。

### 4.1 `w_devices`：品牌与设备

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | 稳定 ID，建议 UUID |
| `brand_logo` | TEXT NULL | 品牌 Logo 路径或 URL，例如 `/brand-icons/xiaomi.svg`；可为空，不存图片二进制 |
| `brand_name` | TEXT | 所属品牌标识，如 `xiaomi`、`google-pixel`、`microsoft-windows`；取自内置品牌配置或 `w_brands.slug`，不是数据库固定枚举，也未设置品牌外键 |
| `device_name` | TEXT | 品牌下的设备或系统版本标准名称，用于后台识别、归一化查重和翻译缺失时的兜底，如 `xiaomi 14`、`Google Pixel 11`、`iOS 14`、`Android 17` |
| `device_slug` | TEXT | 稳定的设备/系统版本 URL slug；创建时生成，名称变更时保持不变 |
| `device_category` | TEXT | 目标分类枚举：`phone`、`phone_fold`、`pad`、`desktop`、`os` |
| `is_popular_brand` | INTEGER NOT NULL DEFAULT 0 | 是否为热门品牌，布尔值 `0/1` |
| `device_splash_url` | TEXT NULL | 设备宣传图 URL，可为空 |
| `status` | TEXT | `draft` 草稿（仅后台可见）；`published` 已发布（公开可见）；`unpublished` 已取消发布（保留记录，仅后台可见，可重新发布） |
| `create_date` | INTEGER | 创建时间，64 位 Unix 毫秒时间戳 |
| `updated_date` | INTEGER | 最近修改时间，64 位 Unix 毫秒时间戳 |

约束：`UNIQUE(brand_name, device_name)`、`UNIQUE(brand_name, device_slug)`；`brand_name`、`device_name` 使用 TEXT 保存；`device_category`、`status` 限定为上述固定值；`is_popular_brand` 限定为 `0/1`。同一 `brand_name` 下的设备记录必须保持 `is_popular_brand` 一致，后台切换时批量更新该品牌的设备行。时间字段统一使用 Unix 毫秒时间戳。

### 4.2 `w_wallpapers`：壁纸条目

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | 稳定 ID，建议 UUID |
| `device_id` | TEXT FK | 所属设备/系统版本，关联 `w_devices.id`，删除设备时限制级联删除 |
| `name` | TEXT | 壁纸素材名称，用于管理列表识别与搜索 |
| `mime_type` | TEXT | 文件 MIME 类型，如 `image/jpeg`、`video/mp4` |
| `size_bytes` | INTEGER | 原始文件大小，单位字节 |
| `origin_key` | TEXT | R2 原始文件对象键；静态壁纸指向原图，动态壁纸指向视频 |
| `compress_key` | TEXT NULL | R2 预览对象键；静态壁纸指向压缩图，动态壁纸指向封面 |
| `width` | INTEGER NULL | 原始媒体宽度，单位像素 |
| `height` | INTEGER NULL | 原始媒体高度，单位像素 |
| `file_format` | TEXT | 文件格式扩展名，如 `jpg`、`webp`、`mp4` |
| `theme` | TEXT NOT NULL DEFAULT 'normal' | 明暗主题：`dark`、`light`、`normal`；没有明确暗黑或明亮变体时使用 `normal` |
| `media_type` | TEXT | 媒体类型：`static` 静态壁纸或 `dynamic` 动态壁纸 |
| `category` | TEXT | 壁纸自身分类：`phone`、`phone_fold`、`pad`、`desktop`、`os`；可与所属设备分类不同 |
| `is_primary` | INTEGER NOT NULL DEFAULT 0 | 是否为该设备该分类的主展示壁纸，布尔值 `0/1`；每个设备分类最多一张 |
| `tags` | TEXT | 多个标签组成的 JSON 字符串数组，例如 `["abstract","blue"]`，默认 `[]` |
| `status` | TEXT | `draft` 草稿（仅后台可见）；`published` 已发布（公开可见）；`unpublished` 已取消发布（保留记录，仅后台可见，可重新发布） |
| `create_date` | INTEGER | 创建时间，64 位 Unix 毫秒时间戳 |
| `updated_date` | INTEGER | 最近修改时间，64 位 Unix 毫秒时间戳 |

约束：`device_id` 外键使用 `ON DELETE RESTRICT`；同一设备内 `name` 唯一；`media_type`、`category`、`theme` 与 `status` 限定为上述固定值；`is_primary` 限定为 `0/1`，并通过 `(device_id, category)` 唯一部分索引保证每个设备分类最多一张主展示壁纸；`tags` 使用 `json_valid` 校验。时间字段统一使用 Unix 毫秒时间戳。

可按数据访问路径建立少量索引：设备 `(brand_name, device_category, status)`、壁纸 `(device_id, status, category)`；另为 `is_primary=1` 建立按 `(device_id, category)` 唯一的部分索引。初版未建立独立品牌表，后续后台新增品牌功能已通过 `0002_admin_brands.sql` 引入 `w_brands`；仍不建立独立标签、上传任务、用户或文件资产表。

### 4.3 `w_device_i18n`：设备与壁纸合集多语言内容

设备主表只有一条记录，各语言的展示内容通过 `device_id` 关联。同一设备同一语言最多一条；设备名、SEO 标题和描述分别维护，允许只填写其中任意一项。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | 稳定 ID，建议 UUID |
| `device_id` | TEXT NOT NULL FK | 关联 `w_devices.id`，删除设备时级联删除 |
| `language` | TEXT NOT NULL | `en`、`zh`、`ja`、`vi`、`zh-hant`，与网站语言代码一致 |
| `display_name` | TEXT NULL | 本地化设备或系统名称，1–200 字；用于列表和面包屑，例如 `小米 15 Ultra` |
| `seo_title` | TEXT NULL | 该语言完整 SEO 标题，1–200 字，例如 `小米 15 Ultra 原装壁纸`；用于详情页标题与元数据 |
| `description` | TEXT NULL | 壁纸合集描述，1–5000 字纯文本；用于元数据、摘要与图库结构化数据 |
| `create_date` | INTEGER NOT NULL | Unix 毫秒创建时间 |
| `updated_date` | INTEGER NOT NULL | Unix 毫秒修改时间 |

约束：`UNIQUE(device_id, language)`，外键 `ON DELETE CASCADE`；语言通过 `CHECK` 限定。三个内容字段分别可空，但至少有一个非空字段；非空字段必须满足长度与非空白校验。应用将空字符串及纯空白归一化为 `NULL`。唯一约束覆盖按设备和语言读取，不再建立重复索引。翻译名称不参与设备身份查重，主表 `name_key` 仍根据标准 `device_name` 生成。

公开可见性随设备发布状态变化，不单独设置翻译发布状态。公开合集要求设备和壁纸均已发布，各字段独立回退：

- 设备名：当前语言 `display_name` → 英文 `display_name` → `w_devices.device_name`。
- SEO 标题：当前语言 `seo_title` → 用解析后的设备名和当前语言模板生成，不回退到英文标题。
- 描述：当前语言 `description` → 英文 `description` → 当前语言的页面生成说明。

公开品牌页、手机/桌面首页和详情页均传入页面语言；公开壁纸列表 API 通过 `lang` 指定语言，默认 `en`，设备筛选可使用稳定 slug。各语言共用主表 `device_slug`，修改名称或翻译不改变 URL 与 R2 对象键。

后台“多语言”目录支持全量记录分页展示、品牌与语言筛选及设备名/标题/描述搜索，行内编辑直接打开对应语言，保存和删除后刷新目录。`GET /api/admin/device-i18n` 不带 `device_id` 时返回目录 `{ data, meta: { total, page, pageSize } }`，每页 50 条；带 `device_id` 时读取该设备全部已保存语言。

后台通过 `/api/admin/device-i18n` 逐语言读取、保存和删除；保存提交 `display_name`、`seo_title`、`description`，采用整条语言记录替换语义，省略或留空的字段清为 `NULL`。更新保留 ID 和创建时间。删除此语言会移除该语言的整条记录。

`0010_device_i18n.sql` 将旧 `w_device_desc.name` 原样迁为 `seo_title`，`desc` 原样迁为 `description`，保留 ID、语言、关联和时间戳；`display_name` 初始为 `NULL`，读取时兜底到设备标准名称，不从 SEO 标题反推设备名。迁移完成后删除旧表，新代码不保留旧接口或旧字段兼容层。

### 4.4 `w_brands`：后台自定义品牌目录（已实现）

该表用于后台“新增品牌”，允许先创建品牌，再为其创建设备或系统、上传壁纸。它只保存自定义品牌，不是全站所有品牌的完整清单。内置手机品牌来自 `BRAND_CATEGORIES`，内置桌面品牌来自桌面分类配置，均不要求写入该表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `slug` | TEXT PK | 品牌唯一标识，1–80 字；仅允许小写英文字母、数字及分隔用连字符，不得与内置品牌标识或保留页面路径冲突 |
| `title` | TEXT NOT NULL | 后台展示名称，应用归一化后为 1–80 字，不得与内置或自定义品牌名称重复 |
| `kind` | TEXT NOT NULL | 品牌类型，通过 `CHECK` 限定为 `mobile` 或 `desktop`；`mobile` 用于手机、平板及系统分类，`desktop` 用于桌面分类 |
| `title_key` | TEXT NULL | 由 `0004` 迁移新增的 Unicode、大小写及空白归一化名称键；新建品牌时必写，用于数据库并发查重 |
| `create_date` | INTEGER NOT NULL | 创建时间，64 位 Unix 毫秒时间戳 |
| `updated_date` | INTEGER NOT NULL | 最近修改时间，64 位 Unix 毫秒时间戳 |

约束：`slug` 为主键；`0003` 在 `LOWER(TRIM(title))` 上建立唯一索引，`0004` 为非空 `title_key` 建立唯一部分索引。与内置品牌的标识、名称冲突以及保留路径冲突由应用校验，数据库索引负责自定义品牌之间的唯一性。

当前读取与使用方式：

- `src/lib/admin-brands.ts` 合并内置品牌与 `w_brands` 记录，供后台品牌列表、筛选及上传选择使用；`/api/admin/brands` 提供列表读取与新增接口。
- `w_devices.brand_name` 保存所属品牌的标识。自定义品牌对应 `w_brands.slug`，内置品牌对应配置中的标识；数据库没有两表间的外键，创建设备时由应用校验品牌存在及品牌类型与设备分类匹配。
- 当前表为空仍可显示内置品牌，但品牌列表每次都会查询该表。直接删表会导致品牌接口报错；后台并行加载品牌、设备和壁纸，品牌接口失败会使三个列表清空，因此必须保留表结构。
- 公开站点的品牌目录仍依赖静态分类配置，尚未接入 `w_brands`。仅在后台新增品牌，或仅切换设备、壁纸数据源为 D1，不会自动增加公开品牌入口；公开分类、路由与多语言展示需另行接入。

### 4.5 字段归属约定

- `Phone Fold` 使用 `device_category=phone_fold`，不与 `phone` 混为一个无法区分的自由文本标签。
- `device_name` 是目标名称，不限定为物理设备。操作系统壁纸使用 `device_category=os`，例如 `brand_name=apple, device_name=iOS 14`，或 `brand_name=android, device_name=Android 17`；不新增 OS 专用表或版本字段。
- `w_wallpapers.category` 表示壁纸自身面向的设备分类，不要求等于 `w_devices.device_category`。上传时可默认采用设备分类，再由管理员调整；例如 phone 设备可关联一张 `category=pad` 的壁纸。
- `is_primary=1` 表示该壁纸是设备在对应分类下的首张主展示图；后台切换主展示图时，在同一数据库操作中清除该设备该分类其他壁纸的标记。发布包含壁纸的设备分类前，要求至少有一张已发布壁纸设为主展示图。
- 自定义品牌的展示名称、标识与手机/桌面类型放在 `w_brands`；设备的所属品牌标识、设备名称与设备分类放在 `w_devices`；内置品牌定义继续来自配置。单张壁纸的明暗、媒体类型、格式与 tags 放在 `w_wallpapers`。
- 本地化设备名、整组壁纸的 SEO 标题与多语言描述放在 `w_device_i18n`，通过 `device_id` 关联设备，通过 `language` 区分语言。
- `w_devices.device_name` 保存设备或系统本名，例如 `Oppo Find X10`；`w_device_i18n.seo_title` 保存对应语言的 SEO 展示标题，例如 `Oppo Find X10 壁纸`。修改 SEO 标题不修改设备名、稳定 URL slug 或素材对象键。
- 数据库存储 `origin_key`、`compress_key` 等 R2 对象键，不保存可变 CDN 域名或下载 URL。服务端根据 key 生成访问地址；原图下载继续通过 `/api/files/download` 代理，不向用户暴露 R2 原图直链。`device_splash_url` 保持为可空的宣传图 URL。
- 静态壁纸的 `origin_key` 指向原图，`compress_key` 指向压缩预览图；动态壁纸的 `origin_key` 指向视频，`compress_key` 指向封面图。
- `theme` 仅使用 `dark`、`light`、`normal`；文件没有明确的暗黑或明亮变体时设为 `normal`，不使用未知状态。
- `device_splash_url` 是设备宣传图；`is_primary` 是某设备分类下列表首张壁纸，两者用途不同。
- `create_date` 和 `updated_date` 分别记录数据库记录的创建与修改时间；旧 JSON 顶层 `date` 不迁移。

## 5. 后台功能范围

### 5.1 壁纸管理

- 品牌列表：合并内置与自定义品牌，支持新增自定义品牌并校验名称、标识和类型；新增后可立即用于后台创建设备和上传，不自动添加公开品牌入口。
- 设备列表：按品牌、设备分类、状态及热门品牌筛选；新建、编辑、发布和取消发布设备。热门标记按品牌批量设置，保证同品牌设备记录一致。
- 合集描述：在设备编辑中按英语、简体中文、日语、越南语、繁体中文维护描述，按 `(device_id, language)` 新增或更新；删除某语言描述后按公开读取回退规则展示。
- 壁纸列表：按品牌、设备、分类、暗黑/明亮、静态/动态、格式、状态筛选；支持预览、编辑 tags、设置主展示图、发布和取消发布。
- 设备发布前显示壁纸数量、缺失预览/封面、未完成上传等检查结果。
- 列表按主展示图优先、创建时间倒序、名称升序展示；取消发布仅改变公开可见状态，不删除记录或文件。

### 5.2 文件/文件夹批量入库

1. 用户选择一个或多个文件，也可以选择目录；目录上传使用浏览器目录选择能力，保留相对路径用于推断品牌/设备目录。
2. 用户为这批文件选择已有设备或新建设备，并填写品牌、设备名称和设备分类；新建设备时按现有规则生成 `device_slug`。目录结构只用于建议元数据，不作为未经确认的数据库分类。
3. 后台展示文件清单、预览、扩展名、大小；允许批量设置媒体类型、主题和 tags，并逐项覆盖。
4. 服务端校验文件类型、文件大小、命名和目标 R2 key。视频扩展名只在动态壁纸类型下接受；具体允许格式与大小上限由实施阶段结合 R2 和浏览器能力确定。
5. 服务端生成仅限目标 key 的短时上传授权，浏览器将文件直传 R2，避免经 Pages 请求转发大文件。上传授权不能覆盖任意 key，不能授予读或删权限。
6. 单个文件上传成功后，后台再次核对对象存在及实际大小/类型，写入或更新壁纸草稿记录。只有所有必需对象齐全的条目才可发布。
7. 结果页逐项报告成功、跳过和失败文件，并允许失败项重试。R2 上传与 D1 写入不构成跨服务事务；失败时保留草稿并提供重试/清理状态，不能把部分上传批次显示为已发布。

目录相对路径可用于默认解析现有 `brand/device/origin|compress/file` 结构；不符合规范的文件进入待人工指定设备的列表。首期不承诺自动生成压缩图，上传者需同时提供原图和预览图；动态壁纸需提供视频与封面。后续可单独评估图片转换或视频封面生成服务。

## 6. 安全与数据完整性

- 后台仅响应 `a.phwalls.com`；所有管理 API 必须验证有效登录会话，公开站点域名拒绝管理请求。
- 管理员账号由 Cloudflare 配置提供：密码只保存为带盐慢哈希，使用兼容 Workers 的 Web Crypto PBKDF2-SHA-256 验证；登录失败由 Cloudflare WAF 限速。会话签名密钥保存在 Secret 中并支持轮换。
- 会话 Cookie 设置 `Secure`、`HttpOnly`、`SameSite=Strict`、有限有效期且不设置父域 `Domain`；管理写请求校验 `Origin` 并使用 CSRF 防护。
- 上传 key 由服务端根据品牌、设备和文件名生成，规范化并拒绝路径穿越、重复覆盖和不在壁纸命名空间内的路径。
- 上传授权采用短有效期、单对象、限定方法与 key 的签名 URL；密钥仅保存在 Cloudflare 环境变量/Secret 中，不下发浏览器。
- R2 CORS 仅允许站点后台来源与必要的上传方法/请求头。
- 当前对象键校验只接受图片扩展名。支持动态壁纸时，须同步扩展服务端 key 校验：视频格式只允许出现在 `dynamic` 条目的 `origin_key`，`compress_key` 仍只允许图片；下载接口沿用原有代理与防盗链策略，不因此放宽成通用 R2 代理。
- 公开数据查询必须同时要求 `w_devices.status='published'` 和 `w_wallpapers.status='published'`；公开接口不得接受任意 R2 key 作为访问目标。
- 数据库没有跨 D1/R2 事务。草稿状态是两边写入之间的隔离层；后台发布动作检查设备和每张壁纸的必需对象完整后再变为 `published`。
- 发布、取消发布和批量导入应记录操作时间和结果。首期若无需多人协作，不增加审计表；可用 Cloudflare 日志与后台操作结果排错。

## 7. 旧 JSON 迁移与兼容策略

迁移期间保持公开页面行为与 URL 不变，避免一次性切换造成 SEO 页面或图片链接中断。

1. 编写一次性、可重复执行的 JSON 导入工具：读取 `src/data/*.json` 和 `src/data/desktopwalls/*.json`，将每个品牌/设备写入 `w_devices`，将每个 item 写入 `w_wallpapers`。
2. 迁移映射：JSON 文件名/现有分类映射为 `brand_name`；根据现有品牌图标映射填入 `brand_logo`，没有图标时留空；合集 `name` 映射为 `device_name`，按现有 URL 规则生成 `device_slug`；旧 JSON 顶层 `date` 不迁移；设备分类映射为 `device_category`。item 的 `name/type/size/originPath/compressPath/tag` 映射为 `w_wallpapers` 对应字段；根据 R2 元数据读取 `size_bytes`、`mime_type`、宽高及对象 key，`file_format` 从原始文件扩展名提取。旧单值 `tag` 转为 `tags` 数组；缺失 tag 转为空数组。旧数据的壁纸 `category` 默认使用设备分类，若某张壁纸实际面向其他分类则在导入映射中单独指定。每个设备分类下的第一张壁纸初始化为 `is_primary=1`，其他项为 `0`。

   合集若已有明确的多语言描述，按网站语言代码导入 `w_device_i18n.description`；没有描述时不创建空记录，保留现有页面生成说明，后续由后台补充。
3. 对数据中已经存在的 R2 对象先核验，不重复上传媒体文件；宣传图 URL 从现有资源配置导入，没有宣传图时留空。
4. 导入工具提供 dry-run、冲突报告和计数摘要；使用稳定 ID 或唯一键实现幂等重跑。冲突必须可见，不静默覆盖已由后台编辑的新数据。
5. 先让测试/预览环境从 D1 读取，并与 JSON 输出对比品牌/设备数、壁纸数、路径和发布页面；确认一致后按类别切换公开读取。
6. 切换期保留 JSON 回退开关和旧数据文件。所有品牌、桌面分类、详情页、公开 API、站点地图都改由同一数据读取层提供数据后，再移除 JSON 回退路径。
7. 切换完成后，D1 成为线上元数据唯一写入来源。不要同时手工维护 JSON 和 D1，以免产生分叉。

路由层使用 `brand_name` 和 `device_slug` 定位品牌与设备，迁移时令 `device_slug` 等于现有设备名称的 slug，保持已有 URL 不变；设备名称后续修改不改变 URL。`brand_slug` 不单独存储。由于当前一些页面在构建时会读取 JSON，实施时需验证 Cloudflare Pages 的 Next.js 运行时绑定能在服务端组件、路由和站点地图中访问 D1。若静态构建阶段无法读取 D1，相关页面应采用请求期服务端渲染或可控缓存，而不能把后台新数据假定为自动进入已构建产物。

## 8. 缓存与公开读取

- D1 查询只选页面需要的列，并按设备/分页读取；不在每个请求中全表加载并在 Worker 内过滤。
- 合集描述按 `device_id` 与当前语言读取，必要时读取英文回退；页面缓存需区分语言，描述编辑后清除或版本化对应设备的语言页面缓存。
- 公开页面使用短时 CDN 缓存，并在发布、编辑或取消发布后按品牌/设备清除或版本化缓存。草稿和取消发布数据不进入公开缓存。
- R2 预览对象使用不可变 key 与长缓存；更新媒体文件时生成新 key，避免旧 CDN 内容与新数据库记录错配。
- 下载继续使用当前服务端代理及 key 校验流程；迁移 D1 不构成暴露 R2 origin 或绕过现有下载策略的理由。

## 9. 建议实施阶段

1. **基础设施与 schema**：配置 D1 binding、环境隔离、四张核心业务表及索引；验证 Pages 构建/预览/生产环境绑定方式。品牌目录及查重按 `0002`–`0005` 迁移实现。
2. **只读迁移**：实现幂等 JSON 导入和校验报告；用预览环境对比 D1 与 JSON 查询结果。
3. **公开数据切换**：抽象统一读取层，按类别切换公开页面、API 和站点地图；保留短期 JSON 回退。
4. **后台元数据管理**：绑定 `a.phwalls.com`，配置单管理员账号 Secret 和登录会话，完成品牌列表与新增、设备和壁纸列表、筛选、编辑、合集五语言描述维护、草稿、发布与取消发布。
5. **批量上传**：实现文件夹/文件清单、直传 R2、进度与失败重试、元数据确认、完整性检查和发布。
6. **收尾**：核对线上页面、下载、缓存与 SEO 路径；确认备份与恢复方法后移除 JSON 回退和不再使用的线上数据读取依赖。

每个阶段应先在本地/预览环境验证，再进入生产。生产 D1/R2 数据导入、切换和删除都需要单独的上线检查；本设计文档不执行部署或数据写入。

## 10. 明确不纳入首期

- 多角色用户系统、邀请与多管理员账号管理
- 单独的标签字典、上传批次、文件资产和操作审计表
- 自动图像压缩、转码、视频抽帧及内容识别
- 复杂工作流、审批流与定时发布
- 直接在管理端编辑 R2 对象或允许任意文件浏览

这些能力只有在首期后台使用后出现明确需求时再扩展，避免把简单内容管理做成通用 CMS。
