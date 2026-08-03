# PhWalls GA4 自定义事件

所有自定义事件以 `w_` 开头，通过 GA4 `gtag` 事件 API 上报。事件参数只包含页面与壁纸上下文，不包含用户身份或敏感信息。

## 转化漏斗

### `w_preview_wallpaper`

壁纸预览弹窗打开或关闭。

- `action`: `open` 或 `close`
- `category_name`: 壁纸合集名称
- `wallpaper_name`: 当前壁纸名称
- `wallpaper_category`: 品牌或桌面分类，仅首页预览提供
- `page_path`: 事件发生时的页面路径

### `w_preview_navigate`

在预览弹窗切换上一张或下一张。

- `direction`: `previous` 或 `next`
- `category_name`: 壁纸合集名称
- `wallpaper_name`: 切换后的壁纸名称

### `w_preview_zoom`

在预览弹窗调整缩放比例。

- `action`: `zoom_in`、`zoom_out` 或 `reset`
- `zoom_level`: 调整后的缩放比例
- `wallpaper_name`: 当前壁纸名称

### `w_preview_refresh`

刷新当前预览图。

- `category_name`: 壁纸合集名称
- `wallpaper_name`: 当前壁纸名称

### `w_wallpaper_download_click`

用户点击可用的下载按钮。该事件只代表下载意图，不代表下载成功。

- `category_name`: 壁纸合集名称
- `wallpaper_name`: 壁纸名称
- `file_type`: 原图 MIME 类型
- `file_size`: 原图文件大小

### `w_wallpaper_download_success`

下载接口成功返回文件，且浏览器下载动作已触发。

- `category_name`: 壁纸合集名称
- `wallpaper_name`: 壁纸名称
- `file_type`: 原图 MIME 类型
- `file_size`: 原图文件大小

### `w_wallpaper_download_fail`

下载接口或浏览器下载准备阶段失败。

- `category_name`: 壁纸合集名称
- `wallpaper_name`: 壁纸名称
- `file_type`: 原图 MIME 类型
- `file_size`: 原图文件大小

## GA4 建议配置

- 将 `w_wallpaper_download_success` 标记为关键事件。
- 使用 `page_location`、默认来源/媒介维度与上述事件串联“自然搜索落地页 -> 预览 -> 下载点击 -> 下载成功”漏斗。
- 为 `category_name`、`wallpaper_name`、`wallpaper_category` 注册事件级自定义维度；`file_type` 可按分析需要注册。
- 不要把 `w_wallpaper_download_click` 当成最终转化；优先以 `w_wallpaper_download_success` 计算下载转化率。
