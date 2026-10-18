# Google Analytics 统计 Key 与分析口径

更新日期：2026-10-18。适用版本：待发布 v2.0.3，`analytics_version=2`。

本文件是 PhWalls 网站统计事件、参数及口径的维护入口。后续新增、修改、废弃埋点时同步更新本文件。事件上线后开始收集，不能补录历史用户行为。本文中的“已实现”指代码已接入，不代表已经部署、GA4 已收到数据或后台报表已配置。

## 1. 接入与公共规则

- Google tag 测量 ID：`G-V98C3T2XRM`（公开标识，不是凭据）。初始化位于 `src/app/layout.tsx`；统一上报函数位于 `src/lib/analytics.ts`；页面、曝光、委托点击及图片错误由 `AnalyticsObserver.tsx`、`analytics-dom.ts` 收集。
- Google 初始化命令在页面交互前进入 `dataLayer`，外部脚本仍延迟加载。提前发生的自定义事件使用标准 gtag 队列；上报异常不会阻断下载、导航或分享。
- 自定义事件默认仅在 `phwalls.com`、`www.phwalls.com` 收集，排除 `/manager`、`/admin`（含语言前缀）。本地、预览域名默认不收集；调试方式见第 7 节。此过滤只作用于本文自定义事件，Google 自动事件仍需在 GA4 配置内部流量、开发者流量过滤。
- 保留 Google 自动 `page_view`，不额外手动发送同名事件。`w_page_view` 是产品漏斗入口，记录首次挂载和客户端 pathname 变化；不能与 `page_view` 相加当成 PV。搜索参数、hash 改变不单独增加 `w_page_view`。
- 自定义 `page_path`、委托点击 `target` 仅含路径，不含 query/hash；不向自定义事件写入原图 key、签名 URL、密钥、IP 或用户自填联系方式。Google 自动 `page_location` 等仍受 GA4 配置影响，不应把敏感信息放入页面 URL。
- 曝光：卡片至少 50% 进入视口、前台连续停留 1 秒。退出视口或切到后台重新计时；同一页面观察周期内按事件及参数去重，加载更多的新卡片会自动接入。此为视口几何曝光，不保证图片已加载或没有被其他浮层遮挡；浏览器不支持 IntersectionObserver 时不推测曝光。
- `position` 从 1 开始，在各入口列表内计算。预览切图（含缩略图）统一记录 `w_preview_view`，不能只用首次点击事件衡量所有预览。
- 本次不增加用户标识、分析数据库或下载完成探测，不改原图代理与浏览器流式下载链路。

## 2. 全部前端事件 Key

下表均为代码已接入的自定义事件；未标记“兼容”的为本次补充。公共参数见第 3 节，表中仅列该事件的主要附加参数。

### 页面、内容与预览

| Key | 触发时机与口径 | 主要附加参数 |
| --- | --- | --- |
| `w_page_view` | 首次访问、客户端路径变化；产品页面访问，不替代自动 PV | 公共页面参数 |
| `w_collection_view` | 手机、桌面、动态合集详情进入 | 品牌/合集标识、`media_type`、`device_type`、`wallpaper_count` |
| `w_collection_impression` | 首页、品牌/分类、桌面及动态专区的合集卡片达到曝光条件 | 品牌/合集标识、内容类型、`entry_point`、`position` |
| `w_collection_click` | 上述卡片内的合集链接被点击 | 同曝光，另有 `target` |
| `w_wallpaper_impression` | 合集图库或主题图库的单张壁纸卡片达到曝光条件 | 壁纸标识、来源品牌/合集、`theme_slug`（适用时）、`position` |
| `w_preview_wallpaper` | **兼容**：合集图库打开/关闭预览；`action=open/close` | 壁纸参数、`category_name`、`action` |
| `theme_wallpaper_preview` | **兼容**：主题图库首次点击预览 | 壁纸参数、`theme`、`theme_slug`、`position` |
| `w_preview_view` | 每次进入单张预览，包括上/下一张、缩略图切换；表示尝试展示 | 壁纸参数、`position` |
| `w_preview_ready` | 静态图实际 onLoad，或视频首次 onPlaying；每次单张预览最多一次 | 壁纸参数、`load_ms` |
| `w_preview_end` | 关闭、切换单张、离开预览或 pagehide | 壁纸参数、`duration_ms`、`preview_loaded` |
| `w_preview_navigate` | **兼容**：上/下一张按钮或键盘导航 | 目标壁纸参数、`direction=previous/next`、`category_name` |
| `w_preview_zoom` | **兼容**：放大、缩小、重置 | 壁纸参数、`action=zoom_in/zoom_out/reset`、`zoom_level` |
| `w_preview_refresh` | **兼容**：点击当前预览刷新 | 壁纸参数、`category_name` |

`w_preview_view` 是跨普通图库与主题图库的统一口径；不要将两个兼容入口事件与它相加。`w_preview_end.duration_ms` 只累计页面前台时长，不证明用户始终在注视；突然终止进程等情况下可能丢失结束事件。

### 搜索

| Key | 触发时机与口径 | 主要附加参数 |
| --- | --- | --- |
| `w_search_open` | 打开站内搜索弹窗 | `entry_point=header_search` |
| `w_search_results` | 索引加载完成且输入稳定 600ms；快速点击结果时先补报；连续相同规范词不重复 | `search_term`、`query_redacted`、`result_count`、`visible_count`、`entry_point` |
| `w_search_no_results` | 上述已完成搜索的匹配数为 0；也是 results 事件的子集 | 同上 |
| `w_search_result_click` | 选择搜索结果或空输入时的热门品牌建议 | 搜索参数、`position`、`target`、`result_type=search/suggestion`、内容类型 |
| `w_search_error` | 搜索索引请求失败、非正常响应或数据格式异常 | `error_code=search_index_load` |

搜索词做 NFKC、转小写、去首尾空白及合并空白；超过 80 字符、包含联系方式/URL 特征或连续长数字的输入不上传原词，保留 `query_redacted=true` 的结果数量统计。此规则为启发式过滤，不代表能识别所有个人信息。加载中/加载失败不记为无结果。`result_count` 包含全部匹配项，`visible_count` 最多 40；未输入时的热门建议点击不生成搜索结果事件。当前筛选只覆盖已发布品牌与合集，不能将无结果一律解释成缺少某张壁纸。

### 导航、主题与推荐

| Key | 触发时机与口径 | 主要附加参数 |
| --- | --- | --- |
| `w_navigation_impression` | 首页品牌目录、动态品牌目录达到曝光条件 | `brand_slug`、`entry_point` |
| `w_navigation_click` | Header 链接、带标记的品牌目录及分类“查看全部”点击 | `target`、`entry_point`，目录附 `brand_slug` |
| `w_theme_impression` | 首页或相关推荐中的主题卡片达到曝光条件 | `theme_slug`、`entry_point`、`position` |
| `wallpaper_theme_click` | **兼容并扩展**：壁纸标签、首页/相关主题卡片点击 | `tag`（标签时）、`theme_slug`、`target`、`entry_point`、卡片 `position` |
| `theme_source_click` | **兼容并扩展**：主题壁纸来源合集点击 | 壁纸/品牌/合集参数、`theme`、`theme_slug`、`source` |
| `w_related_impression` | 合集详情的相关推荐链接达到曝光条件 | 目标 `collection_id`、`source_collection_id`、品牌、`media_type`、`position` |
| `w_related_click` | 点击上述相关推荐 | 同曝光，另有 `target` |
| `w_load_more` | 分类页点击“加载更多” | `brand_slug`、`visible_count`、`total_count`、`page_number`、`entry_point` |
| `w_language_change` | 用户主动切换为另一语言 | `from_language`、`to_language` |
| `w_mini_program_view` | Header 二维码面板或全局小程序弹窗打开 | `entry_point`，弹窗另有 `view_mode=auto/manual` |

二维码展示不等于扫码成功或小程序留存；网站无法从显示二维码推断扫描结果。推荐曝光/点击统计的对象是目标合集，`source_collection_id` 标识当前来源合集。部分“查看全部”、纯文本或信息链接没有曝光埋点，不应套用卡片曝光 CTR。

### 下载与分享

| Key | 触发时机与口径 | 主要附加参数 |
| --- | --- | --- |
| `w_wallpaper_download_click` | **兼容并扩展**：通过禁用/防重检查后，尝试发起下载 | 壁纸参数、`category_name`、`file_type`、`file_size`、`download_request_id` |
| `w_wallpaper_download_started` | **兼容并扩展**：已触发原图代理链接，交给浏览器管理 | 同点击；建议设为 GA4 关键事件，名称和解读均为“下载启动” |
| `w_wallpaper_download_fail` | **兼容并扩展**：页面交接浏览器下载时抛出异常 | 同点击，另有 `error_code=download_handoff` |
| `w_share_click` | 页面或单张壁纸发起分享 | 页面/壁纸参数、`share_source`，Header 另有 `entry_point=header_share` |
| `w_share_result` | 分享 API 返回、复制完成/失败、展示手动复制入口 | 同上、`share_method=native/clipboard/manual`、`outcome` |
| `w_share_visit` | 进入带合法 `share_source=page/wallpaper` 标记的页面 | `share_source` |

浏览器原生下载没有可靠的保存完成回调，禁止发送/恢复 `w_wallpaper_download_success`。客户端 fail 不能代表完整下载失败率；HTTP/上游/断流等见服务端日志。单次下载尝试生成随机 UUID v4 `download_request_id`，同时附在三个下载事件和下载请求上，可关联服务端日志；它不标识用户，浏览器缺少安全随机 API 时省略。服务端仅接受合法 UUID，不接收任意用户文本作为关联字段。

分享 `outcome`：`resolved`=系统分享 API 正常返回，`cancelled`=用户取消，`error`=调用失败，`copied`=剪贴板写入成功，`displayed`=展示手动复制入口。`resolved` 不证明第三方已发布或收件人已阅读；`displayed` 不证明已复制。新生成的分享链接增加 `share_source`，保留单张 `wallpaper` 参数；不添加内部 UTM，避免覆盖来源归因。`w_share_visit` 表示访问带标记链接，标记可被转发或保留，不是唯一分享次数或独立用户证明。

### 体验与性能

| Key | 触发时机与口径 | 主要附加参数 |
| --- | --- | --- |
| `w_media_error` | main 内卡片图片错误、预览地址解析失败、预览图片/视频加载失败 | 可获得的内容参数、`media_location=card/preview`、`error_code`、视频 `media_error_code` |
| `w_video_play` | 每个视频播放尝试首次实际播放，包括自动播放与重试后的播放 | 壁纸参数、`playback_mode=autoplay`、`load_ms` |
| `w_video_progress` | 单次播放尝试首次达到 25/50/75% | 壁纸参数、`percent`；循环不重复；拖动也可能跨过阈值，不等于有效观看完成率 |
| `w_video_buffer` | 首次播放之后 waiting，随后重新 playing | 壁纸参数、`duration_ms`；不含未恢复的等待，不作为全部卡顿时长 |
| `w_video_retry` | 点击视频错误面板的重试按钮 | 壁纸参数 |
| `w_web_vital` | Next.js Web Vitals 回调 | `metric_name`、`metric_value`、`metric_rating`、`metric_id`、`navigation_type` |

媒体错误码：`image_load`、`preview_url`、`video_load`；视频额外保留浏览器 MediaError 数字 code（可缺失）。图片错误不包含请求 URL、签名、异常原文。仅有错误事件不能直接计算所有图片请求的失败率：应结合加载请求日志或同口径预览尝试看趋势，不能拿曝光数当请求数。

Web Vitals 的 `metric_name` 由 Next.js 提供，如 `CLS`、`FCP`、`LCP`、`TTFB`、`INP`；数值保持原单位，CLS 为无单位，时间指标通常为毫秒。`metric_rating=good/needs-improvement/poor`，`metric_id` 可用于明细去重；同一 ID 可能多次回报，按最后一次结果分析。事件归属初始文档路径，不误归到稍后切换的客户端路由；不是全站每次软导航的性能覆盖。

## 3. 参数 Key 字典

### 公共与内容参数

| Key | 类型 | 含义/可选值 |
| --- | --- | --- |
| `analytics_version` | string | 当前为 `2`，用于区分埋点口径版本 |
| `page_path` | string | 当前事件页面路径，含语言前缀；Web Vitals 为初始文档路径 |
| `page_type` | string | `home/category/collection/theme/theme_index/information/admin`；admin 自定义事件不发送 |
| `site_language` | string | `en/zh/ja/vi/zh-hant`，优先路径语言，不能与 GA 浏览器语言混用 |
| `debug_mode` | boolean | 仅启用调试时发送 `true` |
| `brand_slug` | string | 内容所属品牌，使用稳定 slug，不用翻译名称 |
| `collection_id` | string | D1 设备/合集 ID；按 `collection_id + media_type` 区分静态与动态合集 |
| `collection_slug` | string | 稳定合集 slug，数据可用时发送 |
| `source_collection_id` | string | 相关推荐的来源合集 ID |
| `wallpaper_id` | string | D1 壁纸 ID；历史缺少 ID 的数据不伪造 ID |
| `wallpaper_name` | string | 壁纸展示名，兼容旧事件，分析优先稳定 ID |
| `category_name` | string | 兼容旧参数，合集展示名或主题标题；主题下载不能据此判断品牌 |
| `media_type` | string | `static/dynamic` |
| `device_type` | string | 内容设备类型：D1 素材优先 `phone/phone_fold/pad/desktop/os`；仅列表信息时可能仅有 phone/desktop 大类；不是访问者的设备类型 |
| `width`、`height` | number | 已知原始尺寸，像素，缺失时省略 |
| `theme_slug` | string | 稳定主题 slug，如 `dark/blue`；跨语言统一 |
| `theme` | string | 兼容主题展示标题，可能随语言变化 |
| `tag` | string | 标签的英文键 |
| `entry_point` | string | 功能入口，清单见下 |
| `position` | number | 所在入口列表中的位置，从 1 开始 |
| `target` | string | 点击目标页面路径，不含 query/hash |
| `source` | string | 主题壁纸来源合集路径，不含语言前缀 |

`entry_point` 当前值：`home_latest`、`home_popular`、`home_desktop`、`home_brands`、`home_themes`、`category_list`、`category_section`、`category_directory`、`category_view_all`、`collection_grid`、`theme_gallery`、`wallpaper_tag`、`related_collections`、`related_themes`、`header`、`header_search`、`header_share`、`header_qr`、`mini_program_modal`。并非所有事件均有入口参数。下载中的入口表示当前预览来源；首页、推荐、搜索的更早入口通过同会话事件序列分析，不伪装为跨页面归因字段。

主题图库的壁纸参数从每张素材保留真实品牌、设备类型及来源合集 ID；主题标题和主题 slug 不覆盖来源信息。`w_preview_navigate` 的内容参数属于目标壁纸。

### 行为、数值与诊断参数

| Key | 类型 | 含义/可选值 |
| --- | --- | --- |
| `action` | string | 预览 open/close，或缩放 zoom_in/zoom_out/reset |
| `direction` | string | previous/next |
| `zoom_level` | number | 当前缩放倍数 |
| `wallpaper_count` | number | 当前合集壁纸数 |
| `search_term` | string | 清洗后的有效搜索词；被过滤时省略 |
| `query_redacted` | boolean | 用户输入是否被过滤；空输入的建议点击为 false |
| `result_count` | number | 搜索完整匹配数 |
| `visible_count` | number | 搜索显示数或加载更多之前已显示的合集数，随事件解释 |
| `result_type` | string | search/suggestion |
| `total_count` | number | 分类页合集总数 |
| `page_number` | number | 加载更多后目标页数，首次点击为 2 |
| `load_ms` | number | 预览打开至首次就绪，或视频单次尝试至首次播放的毫秒数 |
| `duration_ms` | number | 前台预览时长或一次恢复的卡顿时长，毫秒，按事件区分 |
| `preview_loaded` | boolean | 单张预览结束时是否曾就绪 |
| `file_type` | string | 原始文件 MIME 类型 |
| `file_size` | string | 兼容的原始文件显示大小，如 `3.20 MB`；不是可相加的字节指标 |
| `download_request_id` | string | 单次下载尝试的 UUID v4；仅用于诊断/明细关联，不注册普通报表维度 |
| `share_source` | string | page/wallpaper |
| `share_method` | string | native/clipboard/manual |
| `outcome` | string | 分享 resolved/cancelled/error/copied/displayed；服务端同名字段另见第 4 节 |
| `from_language`、`to_language` | string | 主动切换前后的语言 |
| `view_mode` | string | 小程序弹窗 auto/manual；Header 悬浮面板不带此参数 |
| `media_location` | string | card/preview |
| `error_code` | string | 前端 search_index_load/preview_url/image_load/video_load/download_handoff；服务端另见第 4 节 |
| `media_error_code` | number | 浏览器视频错误数字类型，可缺失 |
| `playback_mode` | string | 当前播放器自动播放，记 autoplay，不等于主动点击播放 |
| `percent` | number | 25/50/75，播放位置进度 |
| `metric_name` | string | Next.js Web Vitals 指标名 |
| `metric_value` | number | 指标原始数值，各指标不能混合求平均 |
| `metric_rating` | string | good/needs-improvement/poor |
| `metric_id` | string | 指标回报 ID，用于明细去重 |
| `navigation_type` | string | Web Vitals 提供的导航类型 |

未定义的可选值不上传；普通字符串最多 100 字符，自定义页面路径最多 500 字符（GA4 是否完整保留以接收限制为准）。不把所有参数注册成维度，不上传堆栈或用户输入的异常原文。

## 4. 服务端下载日志 Key（不发送至 GA4）

两个下载接口 `/api/files/download`、`/api/public/wallpaper-download` 接受可选 `download_request_id`，不改变原有 `key` 校验、权限和响应行为。以下 JSON 日志由 `src/lib/wallpaper-download.ts` 输出；历史保留、采样和检索范围取决于 Cloudflare 日志配置，代码不自动建立长期存储或告警。

| Key | 含义 |
| --- | --- |
| `event` | 固定 `wallpaper_download` |
| `outcome` | `complete/cancelled/error/rejected`；rejected 为缺 key、非法或未发布资源的 400 拒绝 |
| `download_request_id` | 合法的单次下载关联 ID；外部/旧客户端不提供时省略 |
| `bytes` | 从上游读出交给响应流的字节数；验证拒绝或取图前失败为 0 |
| `validation_ms`、`source_ms`、`upstream_ms` | 已执行的权限查询、取图地址准备、取得上游响应头阶段耗时 |
| `headers_ms` | 开始至准备响应头/失败/拒绝的累计耗时，不与各阶段重复相加 |
| `total_ms` | 当前请求总耗时，含读流与下游背压 |
| `request_ray`、`upstream_ray` | Cloudflare 请求关联及节点信息，不是用户 ID |
| `upstream_cache` | 上游缓存状态；不是下载 API 本身的缓存状态 |
| `upstream_status` | 已取得的上游 HTTP 状态，否则 null |
| `phase` | validation/source/upstream/transfer |
| `error_code` | MISSING_KEY/INVALID_KEY/PUBLICATION_CHECK/SOURCE_URL/UPSTREAM_FETCH/UPSTREAM_HTTP/UPSTREAM_BODY_MISSING/TRANSFER_STREAM/REQUEST_ABORTED；正常完成可省略 |

`complete` 只证明服务端响应流读完，不能命名为“客户端保存成功”。`rejected`、用户取消、服务器错误应分开展示。可在有完整留存的同一日志范围内看错误请求占比、P50/P95 响应准备耗时、传输量及缓存状态；不要拿 GA 用户数直接除以服务端请求数。Cloudflare 日志和 GA 会受不同采样、拦截及留存影响，`download_request_id` 仅关联同时可见的记录。详细排障见 [下载性能与排障](download-performance.md)。

## 5. Google 自动事件与外部数据

- GA4 自动/增强衡量：`page_view`、`session_start`、`first_visit`、`user_engagement`；`scroll`、站外 `click`、`file_download` 等是否启用以实际数据流设置为准。不要把自动 click 当成站内导航点击，不能依赖自动 file_download 完整识别代理接口下载。
- 回访：使用 GA4 用户/会话与同群分析，以首次 `w_wallpaper_download_started` 建群，观察之后 7/28 天回访、再次启动下载。无需另建 return_user 自定义事件；浏览器标识被清除、跨设备及分析拦截会影响识别。
- 自然搜索：Search Console 的查询词、曝光、点击、CTR、平均排名；按规范页面路径及语言与 GA4 下载转化趋势并列观察。GA4 不能还原每个 Google 自然搜索用户的完整关键词。
- 收入：关联 AdSense 后使用可获得的发布商收入、广告曝光等报表，与页面下载转化比较；不能把 GA 自定义事件伪装成真实收入。
- 成本：Cloudflare R2/带宽/请求计费与服务端 bytes 对照，bytes 不是实际账单费用，也不能推算精确净利润。

以上外部关联和后台配置不由本次代码自动完成。

## 6. GA4 后台配置与建议报表

1. 管理 → 数据流：核验当前网站测量 ID 与线上一致；验证自动 page_view 在首次访问及 Next.js 页面切换中无漏报/重复。产品漏斗统一使用 `w_page_view`，不额外创建复制它的 page_view 规则。
2. 管理 → 自定义定义：优先建立**事件范围**维度 `analytics_version`、`site_language`、`page_type`、`brand_slug`、`media_type`、`device_type`、`theme_slug`、`entry_point`、`query_redacted`、`result_type`、`share_source`、`share_method`、`outcome`、`error_code`、`media_location`、`metric_name`、`metric_rating`、`playback_mode`。按需补 action/direction 等；不占满额度。
3. 需要数值报表时建立事件范围自定义指标 `load_ms`、`duration_ms`（毫秒）、`result_count`、`metric_value`（标准数值，各 Web Vitals 分开看），以及按需的 wallpaper_count/visible_count/total_count。`file_size` 是字符串，不能注册为下载字节指标。
4. 将 `w_wallpaper_download_started` 设为关键事件，展示名明确写“下载启动”；不要将 click 和 started 同时当成两次下载。用户/会话转化报表按相应去重口径分析。
5. 不默认注册高基数 `wallpaper_id`、`collection_id`、`download_request_id`、`metric_id`、`search_term`、完整目标路径。单张、合集及搜索词明细建议 BigQuery；若短期确需在探索中注册部分字段，先接受 `(other)` 聚合和额度影响。BigQuery 导出需提前配置，不能假设可追回完整历史。
6. 先在测试状态核验内部/开发者流量规则，再启用过滤；DebugView 使用 debug_mode，不把调试流量作为产品增长。按需求设置事件数据保留期限，标准 GA4 可选范围以后台为准。
7. 配置 Search Console / AdSense 关联和需要的 BigQuery 导出；本次没有修改这些外部账号设置。

| 报表 | 核心指标及口径 |
| --- | --- |
| 产品总览 | 每周启动下载用户数；有下载启动的会话数 / 有 w_page_view 的会话数；按国家、来源、访问设备及网站语言拆分 |
| 搜索需求 | 完成搜索次数、无结果搜索次数/完成搜索次数、查询词榜；有结果搜索之后同会话/同词点击率，以及后续下载漏斗 |
| 内容价值 | 同内容获得预览的会话数 / 曝光会话数；预览后下载会话数 / 预览会话数；按稳定 ID、media_type、入口拆分并展示样本量 |
| 合集转化 | 访问合集后启动该合集下载的会话数 / 访问合集会话数；按 collection_id + media_type 匹配 |
| 推荐效果 | 达到曝光条件后点击同目标的会话数 / 曝光会话数，再追踪同会话后续下载；独立记录未经曝光计时即点击的行为 |
| 体验 | 预览 ready 比例、load_ms 的 P50/P95；按错误码看失败趋势；视频开始/进度/重试；文档 Web Vitals 按指标看 P75 |
| 留存与分享 | 首次下载启动用户的 7/28 天回访与再次下载；分享 API 结果、带分享标记访问后的下载转化 |

搜索 no_results 是 results 的子集，不能相加当成全部搜索次数。漏斗需匹配同一用户/会话、同一内容并保证事件先后，不能简单相除两个事件总数。直达预览、分享自动预览、未满 1 秒就点击可能没有先前曝光，应单独分析。小样本榜单不直接决定产品方向，先观察至少一个完整周周期；SEO 主题试点沿用现有 28 天观察要求。

## 7. 验证与后续维护

本地/预览或线上调试，在浏览器控制台执行 `sessionStorage.setItem('phwalls_analytics_debug', '1')`，随后刷新；事件附带 debug_mode=true。调试结束执行 `sessionStorage.removeItem('phwalls_analytics_debug')` 并刷新。不在页面添加用户可见的分析控制入口。

- 在 GA4 DebugView / 浏览器 collect 请求中检查：语言与真实内容 ID、媒体类型、主题来源、position，确认没有原图 key/签名进入自定义参数。
- 搜索：正常词、无结果词、快速点击、索引失败、联系方式输入；无结果不应在加载中产生，过滤词应缺少 search_term。
- 曝光：滚过不足 1 秒不报；停留 1 秒报；切到后台停止计时；同页反复滚动不重复；加载更多后的新卡片可报告。浮层遮挡限制见第 1 节。
- 预览：打开、翻图、缩略图、关闭、后台停留、加载失败、刷新；检查 view、ready、end 的区别，下载事件保留当前壁纸及来源合集。
- 视频：自动播放、卡顿恢复、跨阈值拖动、循环、失败和重试，避免把自动播放进度当主动播放或完整观看。
- 下载：点击/启动共享同一个 download_request_id，请求与服务端日志可关联；模拟拒绝和上游错误；禁止出现 success 事件。
- 分享：系统完成/取消、剪贴板成功/失败、手动复制入口；带标记链接访问后应有 share_visit，不能把 API 完成当第三方发布完成。
- 全站：客户端导航每个 pathname 一次 w_page_view；本地默认不报；后台自定义事件不报；GA/Storage 不可用时核心操作仍正常。

自动验证沿用 Node 内置测试，不引入测试框架：

```bash
node --test tests/analytics*.test.mjs tests/download-click-guard.test.mjs tests/video-player-recovery.test.mjs tests/wallpaper-download.test.mjs
npm run lint
npm run build
```

部署后才能进行真实 GA4 收数验收；普通报表和自定义定义存在处理延迟，应先看 DebugView/实时数据。代码与文档验证不等于已验证 GA4 后台收数。
