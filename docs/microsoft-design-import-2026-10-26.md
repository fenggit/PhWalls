# Microsoft Design 壁纸分类与 Cloudflare 导入

日期：2026-10-26。

## 当前状态

- R2 上传完成：存储桶 `phwalls`，前缀 `desktopwalls/microsoft-design`，共 228 张原图和 228 张 WebP。
- 已逐个回读 456 个对象的大小与 ETag，均与本地文件字节数和 MD5 一致；抽查的 PNG、JPEG、WebP Content-Type 正确。
- 生产 D1 已导入 33 个合集、228 条壁纸及 165 条五语言文案，2026-10-26 用户确认上线后，33 个合集和 228 张壁纸均已发布。发布前后逐字段回读核对，仅修改本批记录的发布状态和更新时间，其他字段保持原值。
- 分类入口、五语言标题及 SEO、搜索分类标签和微软品牌图标已准备完成；用户此前选择暂不上线，随后已明确确认上线；正式分类页已显示全部 33 个合集。
- 正式页面：https://phwalls.com/zh/desktop/microsoft-design 。五语言页面均已回读核对，原图下载返回 attachment，抽样下载的 SHA-256 与 R2 上传原文件一致。

## 来源与数据约定

本地来源：`/Users/fenghe/web-project/source/phonewalls/desktopwalls/microsoft-design`。

保留来源目录和完整文件名，R2 key 按来源目录的相对路径构造；不上传 `.DS_Store`，不创建应用内壁纸内容 JSON。设备的 `upload_prefix` 固定到对应原始合集目录，后续补图沿用该目录。

33 个来源目录均按用户选定的 Microsoft Design 分类收录，保留独立合集。壁纸分类为 200 张桌面／通用、27 张手机、1 张 Duo 双屏；各分类独立设置主图。详情网格优先使用单张壁纸分类，避免手机图片因储存在 desktopwalls 下而被误识别为桌面。

Pride 2025 中有 6 张手机壁纸与桌面版的文件主名相同；保持 R2 文件名不变，仅给数据库中的素材名称添加 mobile 区分，满足同合集同媒体名称唯一约束。具体映射见备份目录的 data-summary.json。

壁纸标签沿用已逐图核验的 PHWalls 英文词表。明暗字段根据官方 DM／LM、Dark／Light 或明确的合集版本命名填写，其他图片使用 normal。设备视觉主题与明暗字段分别维护。

11 个 Microsoft Store 主题采用官方完整 SKU 的 FirstAvailableDate，Surface Laptop 3 采用已有核实的设备日期；其余 21 个合集暂留空日期，未以下载或上传日期冒充发布时间。

## 实现范围

- 在桌面分类配置登记 microsoft-design，复用现有 Microsoft SVG。
- 桌面导航、搜索与分类页支持“微软设计／Microsoft Design”的五语言展示。
- 补全五语言分类 SEO 文案。
- 详情支持手机、折叠屏与桌面分组，并优先遵循素材自身分类。
- 不修改数据库结构；使用现有品牌、设备、壁纸与合集文案字段。

## 验证

- npm run lint、npm run build、npm run pages:build 均通过。
- 五语言分类页均返回 33 个合集，菜单点击进入“微软设计”正常。
- Icon Systems Celebration 详情展示手机 4 张、折叠屏 1 张、桌面 1 张。
- 原图下载通过 /api/files/download，返回 attachment；抽样下载 SHA-256 与上传原文件一致。
- 导入 SQL 在 SQLite 副本中验证新增数量、重复执行幂等、草稿激活与完整回滚，外键检查通过。
- 浏览器无相关应用错误；已有 AdSense 脚本的 data-nscript 警告与本次分类无关。

## 备份与正式上线

本批备份和执行证据：`/Users/fenghe/.codex/backups/PhWalls/microsoft-design-20261026/`。

其中 before.sql 为导入前完整生产备份，data.json 为期望新增行，apply.sql 为已执行的幂等草稿导入，publish.sql 仅激活本批仍未修改的草稿，rollback.sql 仅清理本批新增行；objects.json、upload.log、r2-verification.log 和 remote-readback.json 保存对象及数据库回读证据。

正式上线先部署经过验证的分类代码，再执行 publish.sql 并核对 33 个合集、228 张壁纸及五语言页面。回退前检查本批记录是否已有后台修改；回退 SQL 不覆盖后续编辑，不删除共用 R2 文件，也不清空任何历史删除标记。原图下载继续使用服务端代理。

## 2026-10-26 正式发布记录

用户明确确认“上线”后，先备份本批 33 个合集与 228 张素材的当前完整行，再生成仅匹配这些记录 ID、草稿状态、更新时间和正常删除状态的发布 SQL。壁纸先发布、合集后发布；发布后 261 条记录逐字段核验通过，仅状态和更新时间改变。

本次执行文件为备份目录中的 `publish-current.sql`；`pre-publication-20261026.json`、`post-publication-20261026.json` 和 `live-publication-verification.json` 记录发布前后状态与线上五语言、下载及设备分组核验。需要恢复草稿时，`unpublish-current.sql` 仅匹配本次发布时间且仍未被后续编辑的记录，不修改素材文件或其他品牌。
