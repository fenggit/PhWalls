# 公开 API 调用监控

后台入口：`https://a.phwalls.com/manager?tab=api-monitor`。需要现有后台登录，仅管理域名提供统计 API。此功能从部署后的新请求开始记录，不能还原未采集的历史调用。

## 查看与判断

选择最近 1 小时、24 小时或 7 天，查看请求趋势、错误请求、下载请求、接口排行、来源排行、IP 排行、异常分钟窗口和最近 50 次请求。手动点击“刷新统计”获取最新数据。所有时间按上海时区显示；趋势分别按 5 分钟、1 小时、6 小时分桶，首尾可能是不完整桶。

来源使用 `Referer` / `Origin` 推断：

| 分类 | 规则与含义 |
| --- | --- |
| 站内来源 | 与 `NEXT_PUBLIC_SITE_URL` 的协议、端口及主域名 / www 别名匹配 |
| 匹配自有 AppID | HTTPS `servicewechat.com` 来源路径中的 AppID 与 `API_MONITOR_MINI_APP_ID` 一致 |
| 其他微信来源 | 来自上述微信域名，但 AppID 缺失或不匹配 |
| 外站来源 | 有有效 HTTP(S) 来源，且非上述站内或微信来源 |
| 未知 | 来源为空、格式无效或不是 HTTP(S) URL |

显式外部 `Origin` 优先于看起来是站内的 `Referer`。来源字段都可以被脚本伪造，因此“匹配自有 AppID”只是线索，不是认证；空来源不代表盗用，不用 User-Agent 中的 MicroMessenger 字样作为自有小程序证明。微信正常调用、浏览器下载、新窗口、隐私设置和服务端脚本都有可能缺失来源。现有小程序不需要增加请求头、API Key 或登录步骤。

以下固定 UTC 一分钟窗口按同 IP 汇总，任一条件达到即列出提示：

- 所有被监控接口请求数 ≥ 120。
- 两个原图下载入口请求数合计 ≥ 20（包括失败请求，不代表成功保存）。
- 不同资源指纹数 ≥ 60（只对带 `key` 或详情 ID 的请求统计，不读取 POST 请求体）。

阈值位于 `src/lib/api-monitor-report.ts`。所有来源均适用，不对白名单来源跳过异常识别。共享出口 IP、重试、视频分段与正常批量操作可能触发；低速或分布式爬取也可能不触发。这里只提示排查，不自动封禁、挑战或发送外部消息。先积累基线，再在 Cloudflare 结合来源、IP、访问节奏设置针对性限流，避免给全部 API 加浏览器挑战而阻断微信客户端。

IP 排行首批显示 20 个，点击“加载更多 IP”每次追加 20 个，并显示已加载数量与总数；接口仍展示前 20 个、来源前 30 组，异常窗口最多 30 条，按最近时间排序。汇总指标和趋势统计整个所选时段，不受这些展示数量限制。错误为 HTTP 状态码 ≥ 400；平均耗时截至响应头返回，不包括响应体传输。

## IP 追加分页与异常标记

IP 按请求数降序、IP 文本升序稳定排序，每页 20 条。追加沿用首次响应的截止时间，新产生的请求不进入当前排行窗口；刷新或切换时段重新从首批开始，取消未完成的追加请求。追加失败保留已有行，可点击同一按钮重试；全部加载完毕后显示完成提示。

截止时间有效期为 15 分钟，超时提示刷新统计。数据库没有保存跨请求的一致性快照：迟到的异步日志或 7 天保留清理可能影响既有窗口，因此客户端按 IP 去重，所有分页都不查询当前 7 天保留期之外的数据；需要最新完整排序时重新刷新。

“异常 IP”汇总卡片统计所选时段内达到现有分钟阈值的不同 IP 数量，不受当前 IP 页数或异常窗口前 30 条的限制。IP 行新增请求过密、批量下载、资源遍历标签，附上对应分钟峰值并以黄色标记；三个峰值可能来自不同分钟。异常分钟数与标记根据全部匹配分钟计算，不从已截断的异常窗口列表推断。

任意 HTTP 状态码 ≥ 400 在 IP 行显示“有错误请求”标签和错误数；仅有错误的行及近期错误请求用红色标记，错误汇总卡片同时高亮。HTTP 错误本身不会计入流量异常 IP 数量，也不代表盗用；站外或未知来源不会仅凭来源被判异常。不改变匿名访问权限，也不自动限流或封禁。

## 采集覆盖与成本

采集四类 `/api/public/mini/v1/*` 接口及公开搜索、分类、图片、分享图片、预览、签名、下载接口，共 14 类归一化路径。两种下载入口分别记录，动态详情路径归一化为 `:id`。不会采集后台会话、登录和管理接口。未知 API 路径、错误方法导致 Next.js 在函数外生成的 405、平台层异常也不在本表内。

在 Cloudflare 请求生命周期内使用 `ctx.waitUntil` 异步写入 `DB` 绑定；不克隆或读取响应体，不改变响应正文、状态、缓存策略或原图下载链路。记录的是到达函数的每次调用，列表内部的 Cache API 命中仍然计数。若整个响应由浏览器或 Cloudflare CDN 命中、WAF 在前置阶段拦截，或直接访问 `static.phwalls.com`，不会执行该采集器；完整边缘流量应结合 Cloudflare 请求分析，字段、采样和保留期由套餐决定。

每次采集新增一次 D1 INSERT，触发器另外使用时间索引查找并最多删除 100 条过期记录。后台每次刷新执行 8 条受时间范围约束的聚合 / 明细查询；IP 追加页只执行 2 条查询，不重新加载趋势、来源或近期请求。页内分钟峰值仅对本页 IP 按连接 IP / 时间索引读取；7 天流量很大时扫描和 DISTINCT 统计会增加 D1 读取量。记录失败不会阻断业务，也不保证日志零丢失；关注 Pages 日志中的 `API monitor write unavailable` / `API monitor scheduling unavailable`。持续大流量或攻击时可用停采开关止损，并考虑独立分析存储或 Cloudflare 日志产品。

只读 Cloudflare 注入的 `CF-Connecting-IP` 和 `CF-IPCountry`，不从 X-Forwarded-For 补 IP；本地通常显示未知。来源只保存域名和微信 AppID，User-Agent 最长 256 字符；不保存完整 URL、Cookie、Authorization、请求体、搜索词或原图 key。资源指纹为 SHA-256，仅用于统计不同资源。明细可见 IP、国家、来源、User-Agent，应只向后台管理员开放。

## 配置、迁移与上线

| 配置 | 默认与用途 |
| --- | --- |
| `API_MONITOR_ENABLED` | 非 `false` 时启用；项目 `wrangler.toml` 为 `true`。`false` 停止新采集，后台仍可查询已有记录 |
| `API_MONITOR_MINI_APP_ID` | 项目配置为 `wxa64dd85e9a157ffd`，用于来源线索匹配，非密钥；未配置不归类为自有小程序 |
| `DB` | 现有 D1 绑定，新建 `w_api_access_events` 表，不改动壁纸业务表 |

Cloudflare 请求环境配置优先于本地 process 环境值。生产需核对 Pages 生产 / 预览环境变量实际值。数据保留最近 7 天；每次新记录插入时渐进删除过期数据。无流量、停采或积压较大时旧数据可能暂时留在库中，但查询不会展示 7 天之外的数据。不依赖新增 Cron，不保证在到期时刻立即物理删除。

代码推送不会自动应用生产数据库迁移。首次上线按以下顺序执行；2026-10-20 已补齐生产监控迁移，故障与核验记录见 [后台运维说明](wallpaper-admin-operations.md#2026-10-20-监控不可用恢复)：

1. 导出 D1 备份：`npx wrangler d1 export phwalls --remote --output <备份路径>`。
2. 用 `npx wrangler d1 migrations list phwalls --remote` 核对全部待执行迁移，特别确认 `0017_api_access_events.sql`。不要在未知待迁移列表上直接批量应用。
3. 确认后执行 `npx wrangler d1 migrations apply phwalls --remote`；本地验证改用 `--local`。不需要回填历史数据。
4. 发布包含采集器和后台的代码，并核对上述环境变量。若表未迁移，公开 API 继续工作，但采集失败，后台返回明确不可用状态。
5. 用现有微信小程序浏览合集、详情及下载；在后台刷新，确认来源可能显示“匹配自有 AppID”或“未知”（以实际微信请求头为准）、状态码及计数正常。再用低频测试脚本发送一个外站 Referer 和一个空来源请求，确认分类；不对生产做高频压测。
6. 对比现有下载传输日志和 Cloudflare 分析，确认监控口径。回滚应用代码不会影响壁纸表，停止采集可将开关置为 `false`；无需删除监控表。

本地自动化验证：`node --test tests/api-monitor.test.mjs tests/admin-navigation.test.mjs tests/wallpaper-download.test.mjs tests/live-preview.test.mjs scripts/tests/mini-api-http.test.mjs`、`npm run lint`、`npm run build`。测试使用隔离 SQLite，不访问生产数据库。

## 管理查询 API

`GET /api/admin/api-monitor?range=1h|24h|7d`，默认 `24h`。返回 `{ data, enabled, miniAppId }`；`data` 包括 `range/since/until/bucket_ms`、`summary`、`trend`、`endpoints`、`sources`、`clients`、`client_pagination`、`alerts`、`recent`、`thresholds`。所有响应禁止缓存。

IP 追加查询：`GET /api/admin/api-monitor?view=clients&range=24h&page=2&until=<首次响应的until>`，只返回 `{ data: { clients, pagination } }`。`pagination` 包含 `page/page_size/total/has_more/until`；完整报告中的 `client_pagination` 使用相同结构。每页固定 20 条，页码为 1–10000 的整数；超出最后一页返回空数组及真实总数。`until` 必须是非未来的有效 Unix 毫秒时间戳，且距当前时间不超过 15 分钟。缺失或无效参数返回 400 `INVALID_PAGINATION`，截止时间过期返回 400 `SNAPSHOT_EXPIRED`，无效视图返回 400 `INVALID_VIEW`。

每个 `clients` 条目另含 `peak_requests/peak_downloads/peak_targets`（单分钟峰值）、`alert_minutes`（达到阈值的分钟数）；`summary.anomalous_clients` 为达到流量阈值的不同 IP 总数。上述均为计算字段，不新增 D1 字段或迁移。

非管理域名返回 404；未登录返回 401；无效时间范围返回 400 `INVALID_RANGE`；未迁移、DB 绑定缺失或查询失败返回 503 `MONITOR_UNAVAILABLE`，不向客户端返回内部异常信息。不提供公开查询入口。

## 追加分页验证（2026-10-23）

监控、后台导航、下载、预览及小程序 API 共 54 项相关测试通过，`npm run lint` 与 `npm run build` 通过。新增 SQL fixture 覆盖稳定分页及末页、追加期间新增请求、异常窗口前 30 条之外的 IP 标记、分页认证和参数校验。

使用实际 React 面板、编译后的 Tailwind 样式与真实 SQL 生成的 45 个合成 IP，在临时本地页面验证 20 → 40 → 45 条追加、失败保留后重试、刷新重置、延迟追加时切换时段、四类标记、桌面及 390px 手机布局；手机宽表限制在表格容器内横向滚动，未产生整页溢出，最终验证无新增控制台错误。此为隔离界面验证，未发布生产版本或使用生产请求做压测。


## 本次本地验证（2026-10-18）

- 监控、后台导航、原图下载、视频预览与小程序 API 共 51 项测试通过；公开搜索与批量签名的 5 项定向回归通过。
- `npm run lint` 无 ESLint 问题，`npm run build` 成功；框架仍提示 next lint 将弃用，以及 Edge Runtime 禁用静态生成。
- 桌面与 390px 手机宽度使用真实面板组件、编译后样式和合成 SQLite 数据核对布局，手机页面整体宽度为 390px，无整页横向溢出；这不是生产监控数据或真实微信真机验证。
- `tests/public-wallpaper-data.test.mjs` 全文件为 24 项通过、2 项既有失败：动态详情描述的旧断言不再匹配包含真实数量的新文案；桌面动态页面的测试渲染器不能直接渲染异步服务端组件。两项均在独立导出的未修改 HEAD 源码上复现，未为本功能改动无关页面行为。
- 未执行远程 D1 写入、数据库迁移、生产部署或真实流量压测。发布后需按上述上线步骤进行微信真机核验。
