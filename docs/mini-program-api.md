# PhWalls 小程序 API v1

根路径：`https://phwalls.com/api/public/mini/v1`。这些接口部署后生效，代码推送本身不发布 Cloudflare 生产版本。面向微信小程序的 `wx.request`，不需要登录或传入存储凭据。

## 查询接口

| GET 路径 | 用途 | 返回 data |
| --- | --- | --- |
| `/brands` | 按壁纸类型获取品牌与数量 | 品牌数组 |
| `/collections` | 搜索、筛选与分页浏览机型集合 | 集合数组 |
| `/collections/{id}` | 集合信息及分页壁纸 | `{ collection, wallpapers }` |
| `/wallpapers/{id}` | 单张壁纸详情和媒体地址 | 壁纸对象 |

列表查询参数：

| 参数 | 值 | 默认/限制 |
| --- | --- | --- |
| `kind` | `phone` 手机静态、`live` 动态、`desktop` 桌面静态 | 省略返回全部；动态包含所有设备类型 |
| `brand` | 品牌 slug，例如 `samsung`、`google-pixel` | 大小写和空格归一化，最长 80 字符 |
| `q` | 品牌/机型关键词，例如 `三星 Galaxy` | 词语之间 AND 匹配，最多 100 字符、8 个词；`%`/`_` 为普通字符 |
| `lang` | `en` / `zh` / `ja` / `vi` / `zh-hant` | `zh`；静态与动态翻译分开查询，缺失翻译回退英文/原机型名 |
| `page` | 从 1 起的整数 | 1，最大 10000 |
| `pageSize` | 每页条数 | 24，最大 60 |

`brands` 接受 kind/brand/q/lang，并返回全部匹配品牌，不按 page 分页。集合详情仅使用 page/pageSize/lang；单张详情仅使用 lang。详情资源不会被列表过滤参数影响，但所有参数仍需通过校验。未知品牌返回空列表；已下架或不存在的详情返回 404。

## 响应字段

所有成功响应均包含 `data` 和 `meta: { version: "1", language: "zh" }`。分页接口另含：

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

最后一页之后返回空数组及原始 total，不把总数错误地归零。合集按设备发布日期倒序排列，正确处理 `YYYY`、`YYYY/M`、`YYYY/M/D` 和横杠日期；日期相同使用稳定 ID 排序。合集内按主封面优先、创建时间、名称和 ID 排序。

品牌包含 `slug`、本地化 `title`、`kind: mobile|desktop`、`wallpaperCount`、`collectionCount`。这里的品牌 kind 是品牌自身的类型；展示栏目以集合的 kind 为准。

集合包含 `id`、`brand`、`brandTitle`、`name`、`slug`、`kind`、`mediaType: static|dynamic`、`deviceCategory`、`date`、`description`、`count`、`coverUrl`。同一设备的静态和动态合集使用不同 ID 与数量。手机栏目覆盖手机、折叠屏、平板及移动系统静态壁纸；静态桌面类型按设备类别或桌面品牌识别。

`description` 返回后台所存的本地化风格、画面与适配说明；2026-10-17 起通用描述不再重复存储可变张数与尺寸。使用独立 `count` 及单张壁纸尺寸字段展示事实；网页的完整导语在服务端另行组合，不改变本接口响应结构。

壁纸包含 `id`、`collectionId`、`name`、`collectionName`、`brand`、`brandTitle`、`kind`、`mediaType`、`mimeType`、`format`、`sizeBytes`、`width`、`height`、`theme`、`tags`、`updatedAt`、`canSaveToAlbum`、`previewUrl`、`downloadUrl`、`videoUrl`。

- `tags` 直接返回小写英文数组，例如 `["abstract","gradient","fluid art"]`。英文既是可直接展示的标签，也是多语言 JSON 的键；标签不随 `lang` 变化，也不新增 `tagKeys`。需要本地化展示的使用方按英文匹配对应语言 JSON。适用于合集详情中的壁纸条目和单张壁纸详情，完整的 94 个英文标签及中文说明见[壁纸标签说明](wallpaper-tags.md)。

- `previewUrl` 为图片预览地址；动态素材没有封面时可为 null，客户端展示占位图。
- `videoUrl` 仅动态素材提供，支持 Range 分段播放。
- `downloadUrl` 始终走 `/api/files/download` 服务端代理，不返回 R2 原图直链或签名。
- `canSaveToAlbum` 为 JPEG、PNG、WebP 图片及 MP4 视频返回 true；WebP 需由小程序先无损转成 PNG。其他格式仍提供下载地址，客户端应使用相应保存策略。
- 原始像素尺寸未知时 width/height 为 null。

客户端应把 ID 视为不透明字符串。集合 ID 当前为 `deviceId:mediaType`，壁纸 ID 为 `deviceId:mediaType:wallpaperId`，和旧小程序离线快照 ID 不相同。请求详情时用 `encodeURIComponent(id)`，不要按数组序号保存收藏或分享。

## 小程序调用示例

```js
const API = 'https://phwalls.com/api/public/mini/v1';

// 手机、动态、桌面底栏分别传 phone / live / desktop。
wx.request({
  url: `${API}/collections`,
  data: { kind: 'phone', brand: 'samsung', q: 'Galaxy', lang: 'zh', page: 1, pageSize: 24 },
  success(res) {
    if (res.statusCode !== 200) {
      console.error(res.data.error);
      return;
    }
    const { data, pagination } = res.data;
    // data 中每项为集合卡片；pagination.hasMore 决定是否加载下一页。
    console.log(data, pagination);
  }
});

function requestCollection(id, page = 1) {
  wx.request({ url: `${API}/collections/${encodeURIComponent(id)}`, data: { page, pageSize: 24, lang: 'zh' } });
}

function requestWallpaper(id) {
  wx.request({ url: `${API}/wallpapers/${encodeURIComponent(id)}`, data: { lang: 'zh' } });
}
```

收藏保存接口返回的稳定 id；打开收藏时再次请求详情，遇到 404 提示已下架。分享链接只携带资源 id，接收端从详情接口恢复内容。原图保存使用 downloadUrl 下载到临时文件，再按 mimeType 使用微信相册 API；不要向 `<image>` 的分享缩略图传入 WebP（微信自定义分享图仅支持 PNG/JPG）。

## 发布状态、错误与部署

只读取 D1 中 `w_devices.status=published`、`w_wallpapers.status=published`、`deletion_state=none` 的记录。所有元数据响应（含错误）为 `Cache-Control: no-store`，客户端与普通 CDN 响应缓存不应保存它们；品牌与集合列表另外使用 Cloudflare Cache API 缓存查询结果 60 秒，列表中的发布、下架与删除变更可能延迟最多 60 秒显示。集合详情、单张详情与媒体代理不使用这层缓存，继续实时验证发布状态；不使用旧 JSON 自动降级。

## 接口性能与刷新

- 品牌与集合列表复用现有边缘查询缓存，不需要新增数据库迁移或配置全站 Cache Everything。缓存按 API 版本、接口、资源 origin、语言、类型、品牌、关键词以及集合分页参数隔离；品牌统计不包含无关分页参数。每个 CF 节点独立缓存，首次访问和不同搜索可能未命中。
- 发送请求头 `Cache-Control: no-cache` 或 `no-store` 可绕过列表缓存、实时读取 D1。小程序下拉刷新与失败重试同时重新加载品牌统计与集合列表，并发送 `no-cache`。绕过读取不覆盖原缓存，其他普通请求仍可能在剩余 60 秒内读到原列表。
- 失败查询不缓存；缓存服务不可用时读取 D1，D1 失败仍返回原错误。集合／壁纸详情始终实时查询，下载前状态核验与原图保护保持生效。
- 响应包含 `Server-Timing: mini;dur=...`，单位毫秒，记录接口参数处理、缓存读取或数据查询及 DTO 转换耗时。与客户端总耗时、连接／TLS 耗时对比，可区分后端处理与网络等待。内部 Cache API 命中不会自动将外层 `CF-Cache-Status` 改成 HIT，不能仅用该头判断内部缓存。
- 原图下载另提供 `Server-Timing` 的 `validation`、`source`、`upstream`、`headers` 阶段及 `X-Wallpaper-Upstream-Cache`，用于区分实时发布校验与取图等待；完整传输字节数、取消和异常见[下载排障说明](download-performance.md)。小程序保存流程仍使用 `downloadFile` 回调判断结果，网站的浏览器接管改动不影响小程序保存接口。
- PhWallsMini 在同一页面内复用 30 秒品牌统计；同组详情左右切换复用 30 秒集合响应中的完整壁纸数据，跨页只加载目标集合页，过期后刷新集合页并按当前壁纸 ID 重新定位，必要时补查前后相邻页并复用本次已取得的目标页；大量增删后仍无法定位时实时核验当前详情、提示重新打开合集并禁用未知位置的导航，保存时始终重新核验。品牌统计叠加两层缓存时可能延迟约 90 秒；手动下拉刷新可绕过两层缓存。

以上改动需部署后端并重新发布小程序后完整生效。网络到 CF 的握手、连接重置和原图传输速度仍需分别用真机 Wi-Fi／蜂窝网络测量，缓存不会消除这些耗时。

错误响应结构为 `{ error: { code, message } }`：400 `INVALID_ARGUMENT`，404 `NOT_FOUND`，503 `DATA_SOURCE_UNAVAILABLE`，500 `INTERNAL_ERROR`。message 是开发调试信息，客户端展示文案应自行本地化；数据库和存储内部错误不透传给客户端。

接口使用现有 D1 `DB` 绑定与截至 `0012_collection_media_scope.sql` 的已有迁移，不新增数据表。生产与本地需要已迁移、已填充的 D1 数据；没有 DB 绑定返回 503。接口不依赖网站 `WALLPAPER_DATA_SOURCE` 的 JSON/D1 展示切换。

小程序公众平台需要把 `https://phwalls.com` 配置为 request/downloadFile 合法域名，并填写相册相关隐私声明。保留 Cloudflare 原图保护，确保微信合法请求来源可访问 API。代码改动不自动修改 WAF、公众平台配置或发布小程序。

PhWallsMini 已使用上述在线接口，无需继续把新壁纸目录打进小程序分包。

验证命令：

```bash
node --test scripts/tests/mini-api*.test.mjs
npm run lint
npm run build
```

接口测试使用 Node 内置测试、TypeScript 已有编译器、Python 标准库 SQLite，以真实迁移构建隔离 fixture，检查 SQL 查询与实际 NextRequest/NextResponse，不读写线上 D1。
