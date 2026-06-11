import { Environment } from '@/lib/config/environments';

// AWS Signature V4 辅助函数 - 使用 Web Crypto API
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const keyBuffer: BufferSource = key as BufferSource;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const kSecret = encoder.encode(`AWS4${key}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

export class R2Service {
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private endpoint: string;
  private region: string;
  private publicCdnUrl: string;
  private urlExpires: number;

  constructor(environment: Environment) {
    const r2Config = environment.r2;

    this.accessKeyId = r2Config.accessKeyId;
    this.secretAccessKey = r2Config.secretAccessKey;
    this.bucket = r2Config.bucket;
    this.endpoint = r2Config.endpoint;
    this.region = r2Config.region || 'auto';
    this.publicCdnUrl = r2Config.publicCdnUrl || '';
    this.urlExpires = r2Config.urlExpires;
  }

  private normalizePublicDomain(domain?: string): string {
    const candidate = (domain || this.publicCdnUrl || '').trim();
    if (!candidate) {
      throw new Error('Public CDN domain is required for public bucket access.');
    }

    return candidate.replace(/\/+$/, '');
  }

  private encodeObjectKey(key: string): string {
    return key
      .split('/')
      .map((segment) => {
        if (!segment) return '';
        return encodeURIComponent(segment)
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29');
      })
      .join('/');
  }

  getFileUrl(key: string, domain: string) {
    if (!domain) {
      throw new Error('Domain is required for public file URL. Use getPrivateFileUrl for private buckets.');
    }

    // 如果domain看起来是API endpoint而不是public domain，给出警告
    if (domain.includes('.r2.cloudflarestorage.com')) {
      console.warn('Warning: R2 endpoint URL cannot be used as public domain.');
      console.warn('R2 endpoint is for API operations only. For public access, you need to configure a custom domain in Cloudflare dashboard.');
    }

    const normalizedDomain = this.normalizePublicDomain(domain);
    const normalizedKey = key.startsWith('/') ? key.substring(1) : key;
    const fileUrl = `${normalizedDomain}/${this.encodeObjectKey(normalizedKey)}`;

    return fileUrl;
  }

  getPublicFileUrl(key: string, domain?: string) {
    return this.getFileUrl(key, domain || this.publicCdnUrl);
  }

  async getPrivateFileUrl(key: string, expiresOrDomain?: string | number, expires?: number, forceDownload: boolean = false) {
    // 兼容两种调用方式：
    // 1. R2: getPrivateFileUrl(key, expires, forceDownload)
    // 2. 统一接口: getPrivateFileUrl(key, domain, expires, forceDownload)
    let expiresIn: number;

    if (typeof expiresOrDomain === 'number') {
      // R2调用方式：第二个参数是expires
      expiresIn = expiresOrDomain || this.urlExpires;
    } else {
      // 统一接口调用方式：第二个参数是domain（忽略），第三个是expires
      expiresIn = expires || this.urlExpires;
    }

    // 确保 key 不为空且正确格式化
    if (!key || key.trim() === '') {
      throw new Error('Key cannot be empty');
    }

    // 规范化 key：移除前导斜杠，确保路径正确
    const normalizedKey = key.startsWith('/') ? key.substring(1) : key;

    const amzDate = this.getAmzDate();
    const dateStamp = this.getDateStamp();
    const credentialScope = this.getCredentialScope();

    // 构建查询参数（必须按字母顺序排序）
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    };

    if (forceDownload) {
      const filename = normalizedKey.split('/').pop() || 'download';
      const encodedFilename = encodeURIComponent(filename);
      const contentDisposition = `attachment; filename="${filename.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encodedFilename}`;
      queryParams['response-content-disposition'] = contentDisposition;
    }

    // 构建 URL - 确保 endpoint 包含协议
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(this.endpoint);
    } catch {
      // 如果 endpoint 不包含协议，添加 https://
      endpointUrl = new URL(`https://${this.endpoint}`);
    }

    const hostname = endpointUrl.hostname;

    // 对每个路径段编码但保留斜杠，确保规范化路径和最终 URL 一致
    const encodedKey = this.encodeObjectKey(normalizedKey);
    const canonicalPath = `/${this.bucket}/${encodedKey}`;

    // 规范化查询字符串（按字母顺序排序）
    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const canonicalRequest = [
      'GET',
      canonicalPath,
      canonicalQueryString,
      `host:${hostname}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const canonicalRequestHash = await sha256(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const signingKey = await getSignatureKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      's3'
    );
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(signatureBuffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 添加签名到查询参数
    queryParams['X-Amz-Signature'] = signature;

    // 重新排序并构建最终 URL
    const finalSortedKeys = Object.keys(queryParams).sort();
    const finalQueryString = finalSortedKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const encodedPath = `/${this.bucket}/${encodedKey}`;
    const finalUrl = `${endpointUrl.origin}${encodedPath}?${finalQueryString}`;

    return finalUrl;
  }

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  }

  private getDateStamp(): string {
    return this.getAmzDate().substring(0, 8);
  }

  private getCredentialScope(): string {
    return `${this.getDateStamp()}/${this.region}/s3/aws4_request`;
  }
}
