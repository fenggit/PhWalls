# 动态壁纸封面修复 — 2026-10-09

检查 `/Users/fenghe/Desktop/Live` 下全部 572 张封面，逐张浏览并对异常视频抽样选帧，替换 38 个机型/系统目录中的 114 张空白、纯色或过暗封面。OPPO Find N3 Flip 的 mirror night、mist rose、moonlight muse 已换成展开的蓝、粉、金色花瓣画面。白色/深色壁纸根据实际画面内容判断，保留 ZTE Axon 11 的白色浮雕设计。

先替换本地 WebP，随后上传 Cloudflare R2 `phwalls` 桶的 `live/` 前缀。新封面文件名附加内容哈希，保留原品牌、机型目录的大小写和空格；同步本地、生产 D1 的 `w_wallpapers.compress_key` 及 `src/data/livewalls/catalog.json`，避免旧图片一年期缓存。原视频、设备名、发布状态及其他数据库字段均未改变，三星 Thom Browne 保留草稿。

114 张 R2/CDN 新封面全部通过大小、SHA-256、MD5/ETag、WebP MIME 和 HTTP 200 核验。本地动态详情与生产现有 `/zh/wallpapers/oppo/oppo-find-n3-flip` 均引用对应三张新封面。生产独立 `/live` 路由尚未部署，现有合集页已生效；本次未部署整站。

原封面、本地与生产数据库更新前记录、选帧时间、上传/回读核验清单、回退 SQL 与前后对比图保存在 `/Users/fenghe/web-project/source/phonewalls/data/live-cover-repair-2026-10-09/`。本地另外 458 张封面与相关 114 段源视频通过哈希复核未变。

同步更新 MyAICowork 的 `wallpaper-live-photo-skill`：自动检查首帧，遇到空白或明显过暗画面时抽样 20 帧再生成封面；支持 `--cover-only`、`--repair-covers`、`--frame-time`。未找到有效画面时在压缩与转码前停止，保留已有封面与源视频；继续使用 Caesium 压缩，并补充缓存与云端封面引用同步说明。`wallpaper-workflow` 自动使用该选帧逻辑。
