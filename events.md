# AppleWalls GA4 自定义事件

所有自定义事件均以 `w_` 开头，并通过 GA4 的 `gtag` 事件 API 上报。

## 事件列表

### 环境信息
- `w_device_info`
  - 用途: 上报当前触发环境信息（系统、版本、语言等）。
  - 参数:
    - `system`: 系统信息（如浏览器 UA）。
    - `language`: 当前语言代码（如 en, zh, ja, vi, zh-hant）。

### 导航
- `w_nav_category_click`
  - 用途: 点击导航分类（桌面端或移动端）。
  - 参数:
    - `title`: 分类在导航中展示的标题文本。

- `w_nav_language_change`
  - 用途: 切换语言。
  - 参数:
    - `language`: 当前语言代码。

### 页面打开
- `w_open_about`
  - 用途: 打开“关于”页面。
  - 参数: 无

- `w_open_about_us`
  - 用途: 打开“关于我们”页面。
  - 参数: 无

- `w_open_privacy_policy`
  - 用途: 打开“隐私政策”页面。
  - 参数: 无

- `w_open_contact_us`
  - 用途: 打开“联系我们”。
  - 参数: 无

### 预览与下载
- `w_preview_wallpaper`
  - 用途: 壁纸预览弹窗打开/关闭。
  - 参数:
    - `action`: 操作类型（open 或 close）。
    - `wallpaper_name`: 壁纸名称。

- `w_preview_navigate`
  - 用途: 预览中切换上一张/下一张。
  - 参数:
    - `wallpaper_name`: 壁纸名称。

- `w_preview_zoom`
  - 用途: 预览中缩放（放大/缩小/重置）。
  - 参数:
    - `zoom_level`: 当前缩放比例（如 1, 1.5）。
    - `wallpaper_name`: 壁纸名称。

- `w_preview_refresh`
  - 用途: 刷新预览图片。
  - 参数:
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_click`
  - 用途: 在预览中点击下载按钮。
  - 参数:
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_confirm_view`
  - 用途: 下载确认弹窗展示（广告开启时）。
  - 参数:
    - `category_name`: 分类名称（如具体机型或系列名称）。
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_confirm_accept`
  - 用途: 用户确认下载。
  - 参数:
    - `category_name`: 分类名称（如具体机型或系列名称）。
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_confirm_cancel`
  - 用途: 用户取消下载确认。
  - 参数:
    - `category_name`: 分类名称（如具体机型或系列名称）。
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_success`
  - 用途: 下载成功。
  - 参数:
    - `category_name`: 分类名称（如具体机型或系列名称）。
    - `wallpaper_name`: 壁纸名称。

- `w_wallpaper_download_fail`
  - 用途: 下载失败。
  - 参数:
    - `category_name`: 分类名称（如具体机型或系列名称）。
    - `wallpaper_name`: 壁纸名称。

### 小程序
- `w_mini_program`
  - 用途: 小程序二维码弹窗打开/关闭。
  - 参数:
    - `action`: 操作类型（open 或 close）。

### 设计工具
- `w_design_device_change`
  - 用途: 设计页切换设备类型。
  - 参数:
    - `device_type`: 设计页设备类型（iphone, ipad, imac）。

- `w_design_preset_select`
  - 用途: 选择预设渐变。
  - 参数:
    - `preset_id`: 预设壁纸 ID。
    - `preset_name`: 预设壁纸名称。

- `w_design_custom_color_set`
  - 用途: 设置自定义颜色。
  - 参数:
    - `color_hex`: 颜色值（如 #667eea）。

- `w_design_custom_size_toggle`
  - 用途: 开启/关闭自定义尺寸。
  - 参数:
    - `enabled`: 是否启用（true/false）。

- `w_design_size_change`
  - 用途: 调整宽高。
  - 参数:
    - `width`: 宽度像素值。
    - `height`: 高度像素值。
    - `maintain_aspect`: 是否保持宽高比（true/false）。

- `w_design_aspect_toggle`
  - 用途: 开启/关闭保持宽高比。
  - 参数:
    - `enabled`: 是否启用（true/false）。

- `w_design_download`
  - 用途: 下载自定义壁纸。
  - 参数:
    - `device_type`: 设计页设备类型（iphone, ipad, imac）。
    - `width`: 宽度像素值。
    - `height`: 高度像素值。
    - `use_custom_size`: 是否使用自定义尺寸（true/false）。
    - `use_custom_color`: 是否使用自定义颜色（true/false）。
    - `preset_id`: 预设壁纸 ID。
    - `preset_name`: 预设壁纸名称。
