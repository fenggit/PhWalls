# PhWalls 小程序 API v1

根路径：`https://phwalls.com/api/public/mini/v1`。接口面向微信小程序的 `wx.request`，匿名访问，不传递 R2 凭据或 API Key。所有内容读取 D1 中已发布且未删除的记录。

## 接口

| GET 路径 | 用途 | `data` |
| --- | --- | --- |
| `/brands` | 查询匹配品牌及素材数量 | 品牌数组 |
| `/collections` | 搜索、筛选、分页浏览合集 | 合集数组 |
| `/collections/{id}` | 查询一个合集及其分页壁纸 | `{ collection, wallpapers }` |
| `/wallpapers/{id}` | 查询一张壁纸与媒体地址 | 壁纸对象 |

合集列表参数：

| 参数 | 值 | 默认值与限制 |
| --- | --- | --- |
| `kind` | `phone`、`live`、`desktop` | 省略为全部；`live` 包含所有设备类型的动态壁纸 |
| `brand` | 品牌 slug | 最长 80 字符，大小写和空白归一化 |
| `q` | 品牌或设备关键词 | 最多 100 字符、8 个词；词语为 AND 匹配 |
| `lang` | `en`、`zh`、`ja`、`vi`、`zh-hant` | `zh` |
| `page` | 从 1 开始的整数 | `1`，最大 10000 |
| `pageSize` | 每页条数 | `24`，最大 `60` |

`/brands` 接受 `kind`、`brand`、`q`、`lang`，不分页。合集详情只接受 `page`、`pageSize`、`lang`；单张详情只接受 `lang`。未知品牌返回空列表，不存在或已下架资源返回 404。

## 响应

所有成功响应包含：

```json
{
  "data": [],
  "meta": { "version": "1", "language": "zh" }
}
```

分页响应额外包含：

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "total": 80,
    "totalPages": 4,
    "hasMore": true
  }
}
```

超过最后一页时返回空数组和原始 `total`。

### 品牌与合集

品牌字段：`slug`、本地化 `title`、`kind`（`mobile` 或 `desktop`）、`wallpaperCount`、`collectionCount`。

合集字段：`id`、`brand`、`brandTitle`、`name`、`slug`、`kind`、`mediaType`、`deviceCategory`、`date`、`description`、`count`、`coverUrl`。同一设备的静态和动态合集使用不同 ID，格式为不透明字符串；当前实现为 `deviceId:mediaType`，客户端不得自行拆分或以数组下标代替收藏 ID。

`description` 是后台保存的本地化说明，不包含实时张数或分辨率。客户端应使用 `count` 和单张素材的尺寸字段展示这些事实。

### 壁纸

壁纸字段：`id`、`collectionId`、`name`、`collectionName`、`brand`、`brandTitle`、`kind`、`mediaType`、`mimeType`、`format`、`sizeBytes`、`width`、`height`、`theme`、`tags`、`updatedAt`、`canSaveToAlbum`、`previewUrl`、`downloadUrl`、`videoUrl`。

- `id` 当前为 `deviceId:mediaType:wallpaperId`，请求路径必须使用 `encodeURIComponent(id)`。
- `tags` 是小写英文数组，不随 `lang` 变化。五语言展示文字按[内容分类](content-classification.md)中的词表匹配。
- `previewUrl` 是图片预览；动态素材没有封面时可为 `null`。
- `videoUrl` 仅动态素材提供，支持 Range 分段播放。
- `downloadUrl` 始终指向服务端下载代理，不返回 R2 原图直链或签名 URL。
- JPEG、PNG、WebP 和 MP4 的 `canSaveToAlbum` 为 `true`。小程序保存 WebP 前应转为 PNG；其他格式仍可下载，但应采用对应的保存策略。
- 原始尺寸未知时 `width`、`height` 为 `null`。

合集按发布日期倒序排列，日期相同使用稳定 ID。壁纸按主图、创建时间、名称和 ID 排列。

## 调用示例

```js
const API = 'https://phwalls.com/api/public/mini/v1';

wx.request({
  url: `${API}/collections`,
  data: { kind: 'phone', brand: 'samsung', q: 'Galaxy', lang: 'zh', page: 1, pageSize: 24 },
  success(res) {
    if (res.statusCode === 200) {
      const { data, pagination } = res.data;
      console.log(data, pagination.hasMore);
    }
  },
});

function requestCollection(id, page = 1) {
  return wx.request({
    url: `${API}/collections/${encodeURIComponent(id)}`,
    data: { page, pageSize: 24, lang: 'zh' },
  });
}
```

收藏保存稳定 ID，打开时重新请求详情；404 时提示资源已下架。分享链接只传资源 ID。下载到临时文件后，根据 `mimeType` 调用相册 API；自定义分享缩略图使用 PNG 或 JPG。

## 缓存、错误与部署

品牌和合集列表在 Cloudflare Cache API 中缓存约 60 秒，按语言、类型、品牌、关键词和分页隔离。请求头 `Cache-Control: no-cache` 或 `no-store` 可绕过该缓存，但不会覆盖已有缓存。详情、单张素材和下载前的发布校验始终实时读取。

所有元数据响应都设置 `Cache-Control: no-store`。响应含 `Server-Timing: mini;dur=...`，表示服务端参数处理、缓存或数据查询耗时，不包含客户端网络耗时。下载阶段的诊断头和日志见[下载性能与排障](download-performance.md)。

错误结构：

```json
{ "error": { "code": "INVALID_ARGUMENT", "message": "..." } }
```

| HTTP 状态 | 错误码 | 含义 |
| --- | --- | --- |
| 400 | `INVALID_ARGUMENT` | 参数不合法 |
| 403 | `IP_BLOCKED` | 调用 IP 被后台手动拉黑 |
| 404 | `NOT_FOUND` | 资源不存在或未发布 |
| 500 | `INTERNAL_ERROR` | 未预期的服务端错误 |
| 503 | `DATA_SOURCE_UNAVAILABLE`、`BLOCKLIST_UNAVAILABLE` | D1 或黑名单检查不可用 |

小程序平台需将 `https://phwalls.com` 配置为 request 和 downloadFile 合法域名，并完成相册权限和隐私声明。接口监控只做异步记录，不改变匿名调用；IP 黑名单的覆盖范围和管理方法见[API 监控说明](api-monitoring.md)。

验证：`node --test scripts/tests/mini-api*.test.mjs`、`npm run lint`、`npm run build`。
