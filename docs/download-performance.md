# 下载性能与排障

网站静态原图和动态视频统一通过 `/api/files/download?key=...` 交给浏览器下载，不在页面内读取整份 Blob。按钮启动后禁用 2 秒以防连续点击；该状态表示启动过程，不代表传输完成。浏览器负责显示下载进度和网络错误，页面无法接收下载完成、取消或保存结果。GA4 上报 `w_wallpaper_download_started`，不再将启动误报为 `w_wallpaper_download_success`。

网站与 `/api/public/wallpaper-download` 共用流式下载实现。每次请求实时检查发布状态，文件响应和错误均为 `no-store`，保留原图代理与附件文件名，不返回 R2 原图直链，也不缓存权限判断。当前仍复用图片域名自身的 CDN 缓存；没有新增整份下载响应缓存、数据库迁移或 Cloudflare 配置。

## 分段耗时

响应头 `Server-Timing` 中的值以毫秒为单位：

| 字段 | 范围 |
| --- | --- |
| `validation` | key 校验与实时发布状态查询，包含数据库往返等待 |
| `source` | 配置、文件 URL 构造及私有模式的签名生成 |
| `upstream` | 发起上游 fetch 到取得响应头，包含缓存未命中时的回源等待 |
| `headers` | 接口入口到准备响应头的累计时间，不是上述阶段的额外耗时 |

`X-Wallpaper-Upstream-Cache` 记录上游 `CF-Cache-Status`，无法获取时为 `UNKNOWN`。下载 API 自身的 `CF-Cache-Status: DYNAMIC` 并不表示上游文件未命中缓存。

这些头在开始响应时就确定，不包含后续文件传输时间，也不包含用户到 Cloudflare 的 DNS、连接、TLS 或边缘路由等待。客户端应同时记录总耗时和文件字节数；小程序可使用 `downloadFile` 的进度与完成回调。网站原生下载的传输结果可在浏览器下载列表核查。

## 服务端传输日志

Cloudflare Functions 日志中的 JSON 事件 `wallpaper_download` 包含：

- `outcome`：`complete`、`cancelled` 或 `error`。
- `validation_ms`、`source_ms`、`upstream_ms`、`headers_ms`、`total_ms`：已执行阶段的耗时与请求总耗时。
- `bytes`：从上游读出并交给响应流的字节数；尚未开始取图的错误为 0。
- `request_ray`、`upstream_ray`：Cloudflare 请求标识及节点后缀，用于关联请求和执行／取图位置。
- `upstream_cache`：上游缓存状态。
- `phase`、`error_code`、`upstream_status`：失败阶段、固定错误分类与上游 HTTP 状态；尚未取得上游响应时状态为空。`PUBLICATION_CHECK`、`SOURCE_URL`、`UPSTREAM_FETCH`、`UPSTREAM_HTTP`、`UPSTREAM_BODY_MISSING`、`TRANSFER_STREAM`、`REQUEST_ABORTED` 分别区分查询、URL 构造、连接、HTTP 错误、缺失响应体、断流与取消，不输出异常原文中的签名地址。

流按下游读取节奏逐块转发，取消会传递给上游；不会为统计预读或缓存完整文件。`total_ms - headers_ms` 包含读上游和下游背压等待，不能直接解释为纯 R2 读取耗时。`complete` 仅表示响应流已读完，不证明客户端已成功保存。日志不记录原图 URL、签名、凭据或用户 IP。

可在 Cloudflare 控制台 Functions 日志或 `npx wrangler pages deployment tail --project-name phwalls` 中观察事件；历史可检索范围取决于当前日志配置。响应准备前的存储／查询错误返回原有 500 JSON；响应开始后的传输错误终止流，浏览器显示下载失败，不能再改写 HTTP 状态。

## 慢请求判定

1. `validation` 高：检查 D1 往返、执行位置、队列及 SQL 指标，不能仅凭数据库 SQL 执行快就排除跨区等待。
2. `upstream` 高：检查上游缓存状态、节点和存储响应，区分 CDN 命中与回源。
3. 响应准备快、传输慢：按字节数与传输时间评估吞吐，检查访问地区、运营商、节点和同时发生的网络事件。
4. 取消或错误增多：关联 Ray 与上述阶段，分清用户取消、上游断流和连接失败。平台事故公告提供相关证据，不能单独作为本站故障的确证。

上线后对比相同文件在 Wi-Fi、蜂窝网络和不同地区的启动耗时、传输耗时及失败情况，再决定是否增加权限校验之后的内部文件缓存或调整访问线路。

## 本地验证

```bash
node --test tests/download-click-guard.test.mjs tests/wallpaper-download.test.mjs
npm run lint
npm run build
```
