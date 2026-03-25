# AppleWalls 对外开放 API 文档

本文档列出当前项目对外开放的 API。

## 基础信息
- Base URL: `https://applewalls.com`
- 所有接口默认返回 JSON（除图片显示/下载接口）。

---

## 1) 获取 Tab 数据
- **URL**: `/api/public/tabs`
- **Method**: `GET`
- **Query 参数**: 无
- **返回示例**:
```json
[
  {
    "title": "iPhone",
    "type": "iPhone"
  },
  {
    "title": "iPad",
    "type": "iPad"
  }
]
```

---

## 2) 获取壁纸列表
- **URL**: `/api/public/wallpapers`
- **Method**: `GET`
- **Query 参数**:
  - `type` (可选): `iphone | ipad | ios | ipados | macos`
  - `device` (可选): 设备名称（例如：`iPhone 17 Pro`）
  - `offset` (可选): 分页偏移，默认 `0`
  - `limit` (可选): 每页数量
- **返回示例**:
```json
{
  "data": [
    {
      "name": "iPhone 17 Pro",
      "date": "2025/09",
      "item": [
        {
          "name": "iPhone 17 Pro Cosmic Orange",
          "type": "image/png",
          "size": "1.94 MB",
          "originPath": "iPhone/iPhone 17 Pro/origin/iPhone 17 Pro Cosmic Orange.png",
          "compressPath": "iPhone/iPhone 17 Pro/compress/iPhone 17 Pro Cosmic Orange.png",
          "tag": ""
        }
      ],
      "sourceType": "iphone"
    }
  ],
  "meta": {
    "total": 120,
    "offset": 0,
    "limit": 20,
    "type": "iphone",
    "device": null,
    "availableTypes": ["iphone", "ipad", "ios", "ipados", "macos"]
  }
}
```

---

## 3) 显示壁纸图片
- **URL**: `/api/public/wallpaper-image`
- **Method**: `GET`
- **Query 参数**:
  - `key` (必填): 壁纸在 R2 中的路径
- **返回**: 图片二进制流（`Content-Disposition: inline`）
- **示例**:
```
/api/public/wallpaper-image?key=iPhone/iPhone%2017%20Pro/compress/iPhone%2017%20Pro%20Cosmic%20Orange.png
```

---

## 4) 下载壁纸
- **URL**: `/api/public/wallpaper-download`
- **Method**: `GET`
- **Query 参数**:
  - `key` (必填): 壁纸在 R2 中的路径
- **返回**: 文件下载流（`Content-Disposition: attachment`）
- **示例**:
```
/api/public/wallpaper-download?key=iPhone/iPhone%2017%20Pro/origin/iPhone%2017%20Pro%20Cosmic%20Orange.png
```

---

## 5) 其他对外开放文件相关接口（已存在）
> 这些接口仍可对外使用，常用于签名 URL 获取与下载。

### 5.1 批量获取私有 URL
- **URL**: `/api/files/batch-private-urls`
- **Method**: `POST`
- **Body**:
```json
{ "keys": ["path/to/file1.jpg", "path/to/file2.jpg"] }
```

### 5.2 获取单个私有 URL
- **URL**: `/api/files/private-url`
- **Method**: `GET`
- **Query 参数**: `key`（必填）

### 5.3 代理下载（强制下载）
- **URL**: `/api/files/download`
- **Method**: `GET`
- **Query 参数**: `key`（必填）

### 5.4 获取可下载签名 URL
- **URL**: `/api/files/download-url`
- **Method**: `GET`
- **Query 参数**: `key`（必填）
