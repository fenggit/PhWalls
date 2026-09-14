// 只读取已上线的 sitemap；构建和预览阶段不向搜索引擎提交 URL。
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH_SIZE = 10_000;

export function getSitemapUrls(xml, siteOrigin) {
  // 当前 Next.js sitemap 输出单个 urlset，不接受 sitemap index 或 HTML 错误页。
  if (!/<urlset(?:\s|>)/.test(xml) || !xml.includes('</urlset>')) {
    throw new Error('站点地图不是有效的 urlset，请检查 /sitemap.xml。');
  }
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) =>
    match[1].replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => entities[name])
  );
  return validateUrls(urls, siteOrigin);
}

function validateUrls(urls, siteOrigin) {
  if (urls.length === 0) throw new Error('没有可提交的 URL。');
  return [...new Set(urls.map((value) => {
    const url = new URL(value);
    if (url.origin !== siteOrigin || url.username || url.password || url.hash || url.search) {
      throw new Error(`URL 必须是 ${siteOrigin} 下不含查询参数或片段的规范地址：${value}`);
    }
    return url.href;
  }))];
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`读取 ${url} 失败：HTTP ${response.status}`);
  return response.text();
}

export async function submitIndexNow({ siteUrl, urls = [], dryRun = false }) {
  const site = new URL(siteUrl);
  if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash || site.username || site.password) {
    throw new Error('NEXT_PUBLIC_SITE_URL 必须是 HTTPS 站点根地址。');
  }
  const key = (await readFile(new URL('../public/indexnow-key.txt', import.meta.url), 'utf8')).trim();
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('IndexNow 验证文件格式无效。');
  const keyLocation = `${site.origin}/indexnow-key.txt`;
  const sitemapUrls = getSitemapUrls(await fetchText(`${site.origin}/sitemap.xml`), site.origin);
  const urlList = urls.length ? validateUrls(urls, site.origin) : sitemapUrls;
  // 定向补交也必须命中线上 sitemap，避免提交拼错或尚未发布的 URL。
  const publishedUrls = new Set(sitemapUrls);
  for (const url of urlList) {
    if (!publishedUrls.has(url)) throw new Error(`线上 sitemap 尚未包含 ${url}，请先部署修复。`);
  }
  console.log(`IndexNow：${site.origin}，共 ${urlList.length} 个 URL，${Math.ceil(urlList.length / BATCH_SIZE)} 批。`);
  if (dryRun) {
    console.log('仅预览，未向 IndexNow 提交；前 5 个 URL：');
    console.log(urlList.slice(0, 5).join('\n'));
    return;
  }
  const publishedKey = (await fetchText(keyLocation)).trim();
  if (publishedKey !== key) throw new Error('线上 IndexNow 验证文件与本地不一致，请先部署并等待生效。');

  for (let offset = 0; offset < urlList.length; offset += BATCH_SIZE) {
    const batch = urlList.slice(offset, offset + BATCH_SIZE);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: site.host, key, keyLocation, urlList: batch }),
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow 第 ${offset / BATCH_SIZE + 1} 批失败：HTTP ${response.status}。请检查验证文件、配额或服务状态后重试。`);
    }
    console.log(`第 ${offset / BATCH_SIZE + 1} 批 ${batch.length} 个 URL：${response.status === 202 ? '已接收，等待密钥验证（202）' : '已接收（200）'}。这不代表已收录。`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const unknownOption = args.find((arg) => arg.startsWith('-') && arg !== '--dry-run');
  if (unknownOption) {
    console.error(`未知选项：${unknownOption}`);
    process.exitCode = 1;
  } else {
    submitIndexNow({
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com',
      urls: args.filter((arg) => arg !== '--dry-run'),
      dryRun: args.includes('--dry-run'),
    }).catch((error) => {
      console.error(`IndexNow 提交失败：${error.message}`);
      process.exitCode = 1;
    });
  }
}
