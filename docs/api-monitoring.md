# 公开 API 调用监控

后台入口：`https://a.phwalls.com/manager?tab=api-monitor`。仅管理域名和已登录管理员可查询。监控从启用后的新请求开始采集，不能还原历史流量。

## 采集范围与隐私

采集小程序 `/api/public/mini/v1/*`、公开搜索、分类、图片、分享图片、预览、签名和下载等受监控公开接口。不会采集管理登录、会话或其他管理 API；CDN 缓存命中、WAF 前置拦截、`static.phwalls.com` 直访和未进入应用函数的 405 也不在记录中。

每次请求通过 `ctx.waitUntil` 异步写入 D1，不读取或克隆响应体，不改变业务响应、下载链路或缓存策略。写入失败不会阻断请求，也不保证零丢失。

记录字段包括时间、归一化接口、方法、状态码、响应头前耗时、Cloudflare 连接 IP、国家/地区、来源分类、来源域名、微信 AppID、截断至 256 字符的 User-Agent 与 SHA-256 资源指纹。不保存完整 Referer/Origin、Cookie、Authorization、请求体、搜索词、原图 key 或签名 URL。记录只向后台管理员开放。

数据表按新写入渐进清理约 7 天记录，无流量或停采期间不会立即物理删除旧数据。采集增加 D1 写入和查询成本；流量异常时可将 `API_MONITOR_ENABLED=false` 停止新采集，历史记录仍可查询。

## 来源与异常判断

来源由 `Referer` 和 `Origin` 推断。显式外部 `Origin` 优先于看起来站内的 `Referer`。

| 分类 | 规则 |
| --- | --- |
| 站内来源 | 与 `NEXT_PUBLIC_SITE_URL` 的协议、端口及主域名或 www 别名匹配 |
| 匹配自有 AppID | `https://servicewechat.com` 路径中的 AppID 匹配 `API_MONITOR_MINI_APP_ID` |
| 其他微信来源 | 来自微信域名但 AppID 缺失或不匹配 |
| 外站来源 | 有其他有效 HTTP(S) 来源 |
| 未知 | 来源为空、无效或不是 HTTP(S) URL |

来源头可伪造。“匹配自有 AppID”只是线索，不是认证；空来源不代表盗用。不要仅凭 User-Agent、共享出口 IP 或一次异常就封禁用户。

以下固定 UTC 一分钟窗口按同一 IP 汇总，达到任意阈值即标记：

- 受监控接口请求数不少于 120。
- 两个原图下载入口合计请求数不少于 20，包含失败请求。
- 带资源标识的请求中，不同资源指纹数不少于 60。

阈值定义在 `src/lib/api-monitor-report.ts`。标记只用于排查，不自动封禁、挑战、限流或发送通知。共享出口、重试、视频分段和正常批量操作可能触发；低速分布式请求可能不触发。

## 后台查看

选择最近 1 小时、24 小时或 7 天，查看趋势、错误请求、下载请求、接口排行、来源排行、IP 排行、异常分钟窗口和最近请求。时间按上海时区显示，趋势按 5 分钟、1 小时或 6 小时分桶，首尾桶可能不完整。

- 错误为 HTTP 状态码大于等于 400。响应耗时截至响应头返回，不包含文件传输。
- IP 排行每页 20 条，首次统计的截止时间在 15 分钟内有效。刷新或切换时间范围后从首页重新读取。
- 错误、外站来源和异常 IP 卡片支持查看完整时间范围内的分页详情，不依赖最近请求或已加载 IP。
- IP 行可标记请求过密、批量下载、资源遍历和错误请求。不同峰值可来自不同分钟。

管理查询 API：

| 请求 | 用途 |
| --- | --- |
| `GET /api/admin/api-monitor?range=1h\|24h\|7d` | 完整汇总，默认 `24h` |
| `GET /api/admin/api-monitor?view=clients&range=...&page=...&until=...` | IP 排行分页 |
| `GET /api/admin/api-monitor?view=details&kind=errors\|external\|anomalous&range=...&page=...&until=...` | 卡片详情分页 |

所有响应禁止缓存。`page` 是 1–10000 的整数；`until` 必须是 15 分钟内、非未来的 Unix 毫秒时间戳。无效参数返回 400；非管理域名返回 404；未登录返回 401；监控表或 D1 不可用返回 503 `MONITOR_UNAVAILABLE`。

## IP 黑名单

后台可输入 IPv4 或 IPv6，也可从 IP 排行、异常窗口和请求详情发起“拉黑”。黑名单精确匹配一个规范化 IP，IPv4 映射 IPv6 会归一化为 IPv4；不支持 CIDR、主机名、端口或 zone ID。重复拉黑和解除操作均幂等。

黑名单永久保留，直到管理员解除。共享出口地址会影响该地址下全部用户，操作前必须核对。列表按创建时间倒序、IP 升序，每页 50 条。

受监控公开接口在执行业务和应用缓存查询前检查黑名单：

- 命中时返回 403 `IP_BLOCKED`，响应为 `private, no-store`。
- 黑名单表缺失或查询失败时返回 503 `BLOCKLIST_UNAVAILABLE`，不执行接口业务，避免静默放行。
- 停止监控采集不停止封禁；开启采集时，被拒绝请求会以 403 计入错误统计。
- 此功能不覆盖网站页面、管理 API、R2 直访、已经签发的资源链接或 CDN 缓存命中，也不替代 Cloudflare WAF。

管理接口 `/api/admin/api-monitor/blocklist`：`GET` 分页读取，`POST { "ip": "..." }` 拉黑，`DELETE { "ip": "..." }` 解除。读取要求后台会话；写入还要求同源 `Origin` 和 `X-Phwalls-Admin: 1`。非法 IP 或页码返回 400。

## 配置、迁移与验证

| 配置或迁移 | 用途 |
| --- | --- |
| `API_MONITOR_ENABLED` | 非 `false` 时采集新请求；设为 `false` 停采 |
| `API_MONITOR_MINI_APP_ID` | 用于微信来源分类，不是密钥 |
| `0017_api_access_events.sql` | 创建访问事件表、索引和保留触发器 |
| `0021_api_ip_blocklist.sql` | 创建精确 IP 黑名单表 |

生产顺序：备份 D1，使用 `npx wrangler d1 migrations list phwalls --remote` 审阅待执行迁移，应用已确认迁移，部署应用，再用低频受控请求核对采集、查询、拉黑和解除。不要用生产接口进行高频压测。

本地验证：`node --test tests/api-monitor.test.mjs tests/admin-navigation.test.mjs tests/wallpaper-download.test.mjs tests/live-preview.test.mjs scripts/tests/mini-api-http.test.mjs`、`npm run lint`、`npm run build`。
