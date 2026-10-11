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

壁纸包含 `id`、`collectionId`、`name`、`collectionName`、`brand`、`brandTitle`、`kind`、`mediaType`、`mimeType`、`format`、`sizeBytes`、`width`、`height`、`theme`、`tags`、`updatedAt`、`canSaveToAlbum`、`previewUrl`、`downloadUrl`、`videoUrl`。

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

只读取 D1 中 `w_devices.status=published`、`w_wallpapers.status=published`、`deletion_state=none` 的记录。设备、壁纸或合集不可见时不暴露其元数据。所有元数据响应（含错误）为 `Cache-Control: no-store`；发布、下架、删除状态会影响后续请求，不用旧 JSON 自动降级。媒体代理继续在取文件时验证发布状态。

错误响应结构为 `{ error: { code, message } }`：400 `INVALID_ARGUMENT`，404 `NOT_FOUND`，503 `DATA_SOURCE_UNAVAILABLE`，500 `INTERNAL_ERROR`。message 是开发调试信息，客户端展示文案应自行本地化；数据库和存储内部错误不透传给客户端。

接口使用现有 D1 `DB` 绑定与截至 `0012_collection_media_scope.sql` 的已有迁移，不新增数据表。生产与本地需要已迁移、已填充的 D1 数据；没有 DB 绑定返回 503。接口不依赖网站 `WALLPAPER_DATA_SOURCE` 的 JSON/D1 展示切换。

小程序公众平台需要把 `https://phwalls.com` 配置为 request/downloadFile 合法域名，并填写相册相关隐私声明。保留 Cloudflare 原图保护，确保微信合法请求来源可访问 API。代码改动不自动修改 WAF、公众平台配置或发布小程序。

本次后端改造没有修改 PhWallsMini；小程序目前仍使用目录快照，下一步可按上述契约改为在线请求。无需继续把新壁纸目录打进小程序分包。

验证命令：

```bash
node --test scripts/tests/mini-api*.test.mjs
npm run lint
npm run build
```

接口测试使用 Node 内置测试、TypeScript 已有编译器、Python 标准库 SQLite，以真实迁移构建隔离 fixture，检查 SQL 查询与实际 NextRequest/NextResponse，不读写线上 D1。
