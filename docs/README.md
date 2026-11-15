# 文档索引

本文档目录只保留当前实现、日常维护和对外接口说明。已完成的导入、迁移、故障处理、上线核验和实施计划不再作为操作依据；需要追溯代码变更请查看 Git 历史、迁移文件和 `release-note.md`。

| 文档 | 内容 |
| --- | --- |
| [后台数据模型](wallpaper-admin-d1-design.md) | D1 表、字段、约束、R2 数据边界与公开读取规则 |
| [后台操作说明](wallpaper-admin-operations.md) | 本地准备、迁移、上传、发布、删除和全站设置 |
| [内容分类](content-classification.md) | 设备主风格、单张标签和明暗主题的词表与维护规则 |
| [小程序 API v1](mini-program-api.md) | 小程序公开查询接口、参数、响应和错误码 |
| [公开 API 监控](api-monitoring.md) | 采集口径、后台查询、异常判断与 IP 黑名单 |
| [下载性能与排障](download-performance.md) | 下载响应头、日志字段和排查步骤 |
| [Google Analytics 统计 Key](google_analytics_key.md) | 前端事件、参数和 GA4 报表口径 |
| [壁纸发现与 SEO](wallpaper-discovery-seo.md) | 主题页、内链、多语言收录和 HTML 缓存规则 |

## 维护原则

- D1 字段、约束或业务语义变化时，同时更新[后台数据模型](wallpaper-admin-d1-design.md)和受影响的操作、API 文档。
- 生产 D1 迁移、R2 删除、Cloudflare 配置修改与部署属于独立操作。先备份并核对目标环境，再执行。
- 不在文档中记录凭据、Cookie、签名 URL、完整数据库导出或本机备份路径。
- 代码和配置是运行行为的最终依据；文档与其不一致时，应先修正文档再继续操作。
