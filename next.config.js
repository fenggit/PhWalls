const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发与生产产物隔离，避免 next build 覆盖运行中的 dev 模块与 HMR 清单。
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',

  // Middleware combines slash, language, domain and legacy-path normalization in one hop.
  skipTrailingSlashRedirect: true,

  // 启用压缩
  compress: true,

  // SEO 标签统一由 Metadata API 输出，浏览器和爬虫都等待 head metadata。
  htmlLimitedBots: /.*/,

  webpack(config, { nextRuntime }) {
    if (nextRuntime === 'edge') {
      // Next 15.5's Edge entry ignores htmlLimitedBots; narrowly fix that generated entry.
      // Keep the entry request intact: Next uses its prefix to generate client manifests.
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.normalModuleFactory.tap('PhWallsEdgeMetadata', (factory) => {
            factory.hooks.afterResolve.tap('PhWallsEdgeMetadata', (result) => {
              const data = result?.createData;
              if (data?.loaders.some(({ loader }) => /[\\/]next-edge-ssr-loader[\\/]index\.js$/.test(loader))) {
                data.loaders.unshift({ loader: require.resolve('./scripts/loaders/edge-metadata.cjs') });
              }
            });
          });
        },
      });
    }
    return config;
  },

  // 头部配置 - 安全性和性能优化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // 旧版 XSS Auditor 已被主流浏览器废弃，且自身可能引入漏洞，
            // 现代建议显式关闭，由 CSP 提供防护。
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            // 保守的基线 CSP：限制框架嵌入、base 标签与插件，
            // 不限制 script/img 来源以避免破坏 GA、广告与 R2 图片加载。
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development' ? 'no-store' : 'public, max-age=31536000, immutable',
          },
        ],
      },
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/:path*\\.(css|js|png|jpg|jpeg|gif|ico|svg|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development' ? 'no-store' : 'public, max-age=31536000, immutable',
          },
        ],
      }] : []),
      {
        source: '/api/files/private-url',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
    ];
  },
}

// Export an async default function that returns the NextConfig.
// Next supports the config being a Promise, so we can run async
// setup here without using top-level await or an IIFE.
module.exports = async function () {
  if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform();
  }
  return nextConfig;
}
