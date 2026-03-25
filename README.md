# PhWalls

一个展示主流手机品牌系统内置壁纸的现代化网站（PhWalls）。

当前品牌分类：
- Google Pixel
- HarmonyOS
- Honor
- Huawei
- Huawei MatePad
- Motorola
- Transsion Infinix
- Transsion Tecno
- OnePlus
- Oppo
- Realme
- Samsung
- Vivo
- Xiaomi

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [功能模块](#功能模块)
  - [设备专属页面](#设备专属页面)
  - [后台管理系统](#后台管理系统)
  - [Cloudflare R2 存储](#cloudflare-r2-存储)
- [API 文档](#api-文档)
- [常见问题](#常见问题)
- [开发指南](#开发指南)
- [安全建议](#安全建议)

## 功能特性

### 🎨 设计特色
- **优雅的极简主义美学** - 清新柔和的渐变配色与品牌色系浑然一体
- **恰到好处的留白设计** - 轻盈通透的沉浸式体验
- **信息层级清晰** - 通过微妙的阴影过渡与模块化卡片布局呈现
- **精心打磨的圆角** - 细腻的微交互和舒适的视觉比例

### 🚀 技术特性
- **响应式设计** - 完美支持 PC 和 Mobile Web
- **多语言支持** - 支持 5 种语言自动切换
- **静态页面生成** - 所有设备页面预渲染，SEO 友好
- **图片懒加载** - 优化性能，提升用户体验
- **私有存储支持** - 使用签名 URL 保护图片资源

### 📱 产品展示
- **iPhone** - 展示历代 iPhone 型号和壁纸
- **iPad** - 展示 iPad 系列产品
- **macOS** - 展示 macOS 系统壁纸

## 技术栈

- **前端框架**: Next.js 15.5.3 (App Router)
- **样式框架**: Tailwind CSS 4.1.13
- **开发语言**: TypeScript 5.5.4
- **文件存储**: Cloudflare R2
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **AWS SDK**: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── [device]/                # 动态设备页面路由
│   │   └── page.tsx             # 设备专属页面（服务器组件）
│   ├── about/                   # 关于页面
│   ├── design/                  # 设计页面
│   ├── privacy-policy/         # 隐私政策页面
│   ├── user/                    # 用户管理页面
│   │   ├── login/              # 登录页面
│   │   └── page.tsx            # 后台管理页面
│   ├── api/                     # API 路由
│   │   ├── auth/               # 认证相关 API
│   │   │   ├── login/         # 登录接口
│   │   │   ├── logout/        # 登出接口
│   │   │   └── me/            # 获取当前用户信息
│   │   ├── files/              # 文件管理 API
│   │   │   ├── route.ts       # 文件列表
│   │   │   ├── upload/        # 文件上传
│   │   │   ├── delete/        # 文件删除
│   │   │   ├── url/           # 生成访问 URL
│   │   │   ├── private-url/   # 生成私有 URL
│   │   │   ├── download-url/  # 生成下载 URL
│   │   │   └── batch-private-urls/  # 批量生成私有 URL
│   │   └── storage/           # 存储配置 API
│   │       └── switch/        # 切换存储类型
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页
│   └── globals.css             # 全局样式
├── components/                  # React 组件
│   ├── DeviceWallpaperGrid.tsx # 设备壁纸网格（客户端组件）
│   ├── WallpaperPreviewDownload.tsx  # 壁纸预览与下载弹窗
│   ├── Navigation.tsx          # 导航栏组件
│   ├── Breadcrumbs.tsx         # 面包屑导航
│   ├── LanguageProvider.tsx    # 语言提供者
│   ├── user/                   # 用户相关组件
│   │   ├── AdminHeader.tsx    # 管理员头部
│   │   └── FileManager.tsx    # 文件管理器
│   └── exoclick/              # 广告组件
│       ├── AdBanner.tsx       # 横幅广告
│       └── AdVerticalBanner.tsx  # 垂直广告
├── lib/                        # 工具库
│   ├── admin/                  # 管理后台工具
│   │   ├── auth.ts            # 认证工具
│   │   └── middleware.ts      # 中间件
│   ├── config/                 # 配置
│   │   └── environments.ts    # 环境配置
│   ├── services/               # 服务层
│   │   └── r2.ts              # R2 存储服务
│   ├── data.ts                 # 数据加载
│   └── i18n.ts                 # 国际化
├── data/                       # 数据文件
│   ├── iPhone.json            # iPhone 设备数据
│   ├── iPad.json              # iPad 设备数据
│   ├── macOS.json             # macOS 设备数据
│   ├── iOS.json               # iOS 数据
│   ├── device-time.json       # 设备发布时间
│   └── tab.json               # 标签数据
└── types/                      # TypeScript 类型定义
    └── index.ts
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，配置以下必需变量：

```env
# 后台管理登录凭据
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Cloudflare R2 配置
R2_ACCESS_KEY_ID_PROD=your_r2_access_key_id
R2_SECRET_ACCESS_KEY_PROD=your_r2_secret_access_key
R2_BUCKET_NAME_PROD=your_r2_bucket_name
R2_ENDPOINT_PROD=https://your-account-id.r2.cloudflarestorage.com

# 功能开关（可选）
NEXT_PUBLIC_ENABLE_ADMIN_LINK=true
NEXT_PUBLIC_ENABLE_ADS=true
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看网站。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 配置说明

### 环境变量

#### 必需配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `your_secure_password` |
| `R2_ACCESS_KEY_ID_PROD` | R2 Access Key ID | `your_r2_access_key_id` |
| `R2_SECRET_ACCESS_KEY_PROD` | R2 Secret Access Key | `your_r2_secret_access_key` |
| `R2_BUCKET_NAME_PROD` | R2 存储桶名称 | `applewalls` |
| `R2_ENDPOINT_PROD` | R2 端点地址 | `https://xxx.r2.cloudflarestorage.com` |

#### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `STORAGE_PROVIDER_PROD` | 存储提供商 | `r2` |
| `NEXT_PUBLIC_ENABLE_ADMIN_LINK` | 是否在导航栏显示管理员入口 | `false` |
| `NEXT_PUBLIC_ENABLE_ADS` | 是否启用广告 | `false` |

#### 代码默认值（无需配置）

以下配置在代码中已有默认值，无需在环境变量中设置：

- `R2_REGION_PROD`: 默认 `auto`
- `R2_IS_PRIVATE_PROD`: 默认 `true`（使用私有存储桶和签名 URL）
- `R2_URL_EXPIRES_PROD`: 默认 `3600` 秒（1小时）
- `R2_PUBLIC_DOMAIN_PROD`: 默认空字符串（使用签名 URL）
- `JWT_SECRET`: 默认 `fallback-secret-key`（生产环境建议配置）
- `SESSION_EXPIRE_HOURS`: 默认 `24` 小时

### 多语言支持

网站支持 5 种语言，自动根据用户所在国家/地区显示对应语言：

- 🇺🇸 English（英语）- 默认语言
- 🇨🇳 中文（简体中文）
- 🇯🇵 日本語（日语）
- 🇻🇳 Tiếng Việt（越南语）
- 🇭🇰 中文（繁体中文）

**语言选择逻辑**：
1. 首次访问：自动检测浏览器语言/地区设置
2. 再次访问：使用用户上次选择的语言（保存在 localStorage）
3. 未匹配到语言：默认显示英文

**支持的语言代码**：
- `en` - 英文（English）
- `zh` - 中文（简体）
- `ja` - 日语（日本語）
- `vi` - 越南语（Tiếng Việt）
- `zh-hant` - 中文（繁体）

**地区映射规则**：
- 英语地区：美国、英国、澳大利亚、加拿大、新西兰、爱尔兰、新加坡等（未匹配到其他语言时默认使用）
- 中文（简体）地区：中国大陆、新加坡等
- 日语地区：日本
- 越南语地区：越南
- 中文（繁体）地区：台湾、香港、澳门等

**技术实现**：
- 检测逻辑：`src/components/LanguageProvider.tsx` 中的 `detectLanguageFromBrowser()` 函数
- 语言存储：使用浏览器 localStorage，key 为 `language`
- 翻译文件：`src/lib/i18n.ts` 包含所有语言的翻译文本
- 无需配置：不需要设置任何环境变量，系统自动工作

### 功能开关配置

#### 导航栏行为控制

- `NEXT_PUBLIC_ENABLE_ADMIN_LINK`: 控制导航栏 PhWalls 链接的行为
  - `true`: 点击 PhWalls 跳转到后台管理页面 (`/user`)
  - `false` 或未设置: 点击 PhWalls 平滑滚动到页面顶部
- 这个功能开关允许您根据部署环境灵活控制用户访问后台的权限

## 功能模块

### 设备专属页面

#### 功能概述

网站支持为每个 Apple 设备创建专属的壁纸展示页面，用户可以通过设备名称直接访问该设备的所有壁纸。

#### URL 格式

```
https://phwalls.com/{设备名称}
```

**规则**：设备名称 = `name` 字段去掉空格并转换为小写

#### 使用示例

| 设备 | data 中的 name | URL | 访问地址 |
|------|---------------|-----|---------|
| iPhone 17 Pro | `iPhone 17 Pro` | `/iphone17pro` | `https://phwalls.com/iphone17pro` |
| iPhone 16 | `iPhone 16` | `/iphone16` | `https://phwalls.com/iphone16` |
| iPad Pro | `iPad Pro` | `/ipadpro` | `https://phwalls.com/ipadpro` |
| macOS Sequoia | `macOS Sequoia` | `/macossequoia` | `https://phwalls.com/macossequoia` |

#### 页面特性

1. **动态元数据（SEO优化）**
   - 标题：`{设备名称} Wallpapers - Download Official {设备名称} HD Wallpapers | PhWalls`
   - 描述：包含设备名称、壁纸数量、高清无水印等关键信息
   - 关键词：设备名称、壁纸相关词汇
   - Open Graph：社交媒体分享优化

2. **静态路径生成**
   - 自动为所有设备生成静态路径
   - 预渲染所有设备页面
   - 优化首次加载速度
   - 改善搜索引擎索引

3. **九宫格壁纸展示**
   - 响应式布局：1列（手机）→ 2列（平板）→ 3列（桌面）
   - 九宫格排列：展示该设备的所有壁纸
   - 悬浮效果：鼠标悬浮显示壁纸名称、大小
   - 下载图标：右上角显示下载图标

4. **图片预览模态框**
   - 点击任意壁纸打开全屏预览
   - 左右箭头切换壁纸
   - 支持直接下载高清原图

#### 技术实现

**服务器组件** (`/app/[device]/page.tsx`)：
- 处理静态路径生成（`generateStaticParams`）
- 处理动态元数据（`generateMetadata`）
- 服务器端数据获取
- SEO优化

**客户端组件** (`/components/DeviceWallpaperGrid.tsx`)：
- 处理用户交互
- 状态管理
- 图片加载
- 预览模态框

#### 添加新设备

只需在 `iPhone.json`, `iPad.json` 或 `macOS.json` 中添加新设备数据：

```json
{
  "name": "iPhone 18 Pro",
  "date": "2026/09",
  "item": [...]
}
```

系统会自动：
- 生成设备页面 `/iphone18pro`
- 创建 SEO 元数据
- 添加到静态路径列表

### 后台管理系统

#### 功能特性

- ✅ 管理员身份验证（JWT）
- ✅ 文件上传（单个/批量）
- ✅ 文件下载和预览
- ✅ 文件信息显示（大小、类型、时间）
- ✅ 文件路径复制
- ✅ 文件删除
- ✅ 私有空间文件访问控制
- ✅ 文件管理器（支持文件夹浏览）

#### 访问方式

1. 访问登录页面：`http://localhost:3000/user/login`
2. 使用配置的用户名和密码登录
3. 登录成功后自动跳转到管理页面

#### 文件管理

- 支持单个和批量文件上传
- 支持文件夹浏览和导航
- 支持文件预览和下载
- 支持文件删除
- 支持私有 URL 刷新
- 文件使用相对路径存储

### Cloudflare R2 存储

#### 配置 R2

1. **获取 R2 凭据**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 R2 对象存储服务
   - 创建存储桶（Bucket）
   - 创建 API Token，获取 Access Key ID 和 Secret Access Key
   - 配置自定义域名（可选）

2. **配置环境变量**
   ```env
   R2_ACCESS_KEY_ID_PROD=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY_PROD=your_r2_secret_access_key
   R2_BUCKET_NAME_PROD=your_r2_bucket_name
   R2_ENDPOINT_PROD=https://your-account-id.r2.cloudflarestorage.com
   ```

3. **配置 CORS（重要）**

   如果遇到图片预览或下载失败，通常是因为 CORS 配置不正确。

   **使用 wrangler CLI 配置（推荐）**：

   ```bash
   # 安装 wrangler
   npm install -g wrangler

   # 登录
   wrangler login

   # 创建 cors.json 文件
   cat > cors.json << 'EOF'
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   EOF

   # 应用 CORS 配置
   wrangler r2 bucket cors put applewalls --rules ./cors.json

   # 验证 CORS 配置
   wrangler r2 bucket cors get applewalls
   ```

   **生产环境建议**：
   - 将实际的生产域名添加到 `AllowedOrigins`
   - 移除 `localhost` 和开发环境的域名
   - 考虑安全性，不建议在生产环境使用 `"*"`

#### R2 下载功能

系统已实现完整的 R2 图片下载功能，支持：

- ✅ 私有和公开存储桶
- ✅ 中文等 Unicode 文件名
- ✅ 双重下载机制（fetch + iframe 回退）
- ✅ 详细的调试日志

**技术实现**：

使用 AWS S3 兼容 API 的 `ResponseContentDisposition` 参数：

```typescript
const command = new GetObjectCommand({
  Bucket: 'applewalls',
  Key: 'path/to/image.jpg',
  ResponseContentDisposition: 'attachment; filename="image.jpg"'
});

const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
```

**工作流程**：

```
用户点击下载
    ↓
调用 /api/files/download-url
    ↓
生成带 ResponseContentDisposition 的签名 URL
    ↓
前端 fetch + blob 下载
    ↓
✅ 文件直接下载（不打开新标签页）
```

#### 私有存储桶配置

系统默认使用私有存储桶和签名 URL：

- **默认配置**：`R2_IS_PRIVATE_PROD=true`（代码中已设置）
- **URL 过期时间**：默认 3600 秒（1小时），代码中已设置
- **签名 URL**：自动生成，包含过期时间，防篡改
- **安全特性**：
  - 自动过期（默认1小时）
  - 防篡改（任何参数修改都会导致签名失效）
  - 秘钥安全（SecretAccessKey 仅在服务端使用）

## API 文档

### 认证相关

```
POST /api/auth/login      # 管理员登录
POST /api/auth/logout     # 管理员登出
GET  /api/auth/me         # 获取当前用户信息
```

### 文件管理 API

```
GET  /api/files?path={path}                    # 获取文件列表
POST /api/files/upload                        # 上传文件
POST /api/files/delete                        # 删除文件
POST /api/files/url                           # 生成文件访问 URL（私有空间）
GET  /api/files/private-url?key={key}         # 生成私有 URL
POST /api/files/download-url                   # 生成下载 URL
POST /api/files/batch-private-urls             # 批量生成私有 URL
```

### 存储配置 API

```
GET  /api/storage/switch                      # 获取当前存储类型
POST /api/storage/switch                      # 切换存储类型（仅支持 r2）
```

## 常见问题

### 1. 登录失败

**可能原因**：
- 环境变量配置错误
- 用户名或密码不匹配
- JWT_SECRET 配置错误（如果配置了环境变量）

**解决方法**：
- 检查 `.env.local` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
- 确认环境变量已正确加载
- 检查系统时间是否同步

### 2. 文件上传失败

**可能原因**：
- R2 凭据配置错误
- 文件类型不在允许列表中
- 文件大小超过限制
- 网络连接问题

**解决方法**：
- 检查 R2 凭据是否正确
- 确认文件类型和大小
- 检查网络连接和防火墙设置

### 3. 文件访问失败

**可能原因**：
- 域名配置错误
- R2 存储桶权限问题
- 私有 URL 过期
- CORS 配置问题

**解决方法**：
- 检查域名配置
- 验证 R2 存储桶权限
- 检查私有 URL 是否过期
- 配置 CORS（见上方 R2 配置部分）

### 4. 多语言问题

**语言自动检测失败**：
- 检查浏览器是否允许 JavaScript 访问 `navigator.language`
- 尝试手动切换语言测试
- 查看浏览器控制台是否有错误信息

**语言切换不生效**：
- 检查浏览器 localStorage 是否被禁用或已满
- 清除浏览器缓存和 localStorage 后重试
- 确认网页已完全加载后再切换语言

**首次访问显示错误语言**：
- 检查浏览器语言设置（浏览器设置 → 语言）
- 系统会按优先级匹配：localStorage > 浏览器语言 > 英文
- 可以手动切换到期望的语言

**界面文字显示异常**：
- 确认所有语言翻译文件完整（`src/lib/i18n.ts`）
- 检查是否有部分文字未翻译
- 查看浏览器控制台的语言检测日志

### 5. 图片无法预览

**症状**：预览时显示加载中，但图片一直不出现

**解决方法**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签，查找错误信息
3. 查看 Network 标签，找到失败的请求
4. 检查响应状态码：
   - `403 Forbidden`: 签名错误或权限问题
   - `CORS error`: CORS 配置问题
   - `SignatureDoesNotMatch`: Access Key 或 Secret Key 错误

### 6. 下载失败

**症状**：点击下载按钮后没有反应或报错

**解决方法**：
1. 代码已添加了回退机制，会自动尝试直接打开链接
2. 如果还是失败，检查 CORS 配置
3. 确认 R2 存储桶权限设置正确

### 7. 签名 URL 过期

**症状**：第一次可以访问，过一段时间后无法访问

**解决方法**：
- 默认过期时间为 1 小时（3600 秒）
- 如需调整，修改代码中的 `urlExpires` 默认值

### 8. CORS 错误

**解决方法**：
```bash
# 检查当前 CORS 配置
wrangler r2 bucket cors get applewalls

# 更新 CORS 配置
wrangler r2 bucket cors put applewalls --rules ./cors.json
```

## 开发指南

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd PhWalls
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.local.example .env.local
   # 编辑 .env.local 文件
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   - 前端：http://localhost:3000
   - 管理后台：http://localhost:3000/user/login

### 构建和部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 Next.js App Router 规范
- 服务器组件和客户端组件分离
- 使用 Tailwind CSS 进行样式设计

### 项目维护

- 定期更新依赖：`npm update`
- 检查安全漏洞：`npm audit`
- 运行代码检查：`npm run lint`

## 安全建议

### 1. 密码和密钥安全

- 使用强密码，包含大小写字母、数字和特殊字符
- 密码长度至少12位
- JWT 密钥长度至少32位（如果配置环境变量）
- 生产环境中建议配置 `JWT_SECRET` 环境变量，使用强随机字符串
- 定期更换密码和密钥

### 2. 数据保护

- 使用私有存储桶存储敏感文件（默认已启用）
- 生成带签名的临时访问 URL（默认已启用）
- 定期轮换访问密钥
- 加密存储敏感配置

### 3. 环境变量安全

- 确保 `.env.local` 文件不被提交到版本控制系统
- 生产环境中必须使用强密码和密钥
- 不要将敏感信息硬编码在代码中

### 4. 系统维护

- 定期更新依赖包和系统配置
- 监控系统日志和文件存储状态
- 定期备份重要数据

## 相关资源

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [R2 API 文档](https://developers.cloudflare.com/r2/api/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 配置模板

- [环境变量示例](./.env.local.example) - 环境变量配置模板

## 许可证

© 2025 PhWalls. 保留所有权利。

---

- Next.js 部署到 Cloudflare Pages
- https://www.exi.ink/posts/nextjs%E9%83%A8%E7%BD%B2%E5%88%B0cloudflare-pages/
