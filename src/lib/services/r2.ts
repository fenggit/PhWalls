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
  // 确保key是BufferSource类型（Uint8Array是BufferSource的子类型）
  // 使用类型断言确保类型正确
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

async function signRequest(
  method: string,
  uri: string,
  query: string,
  headers: Record<string, string>,
  payload: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string = 's3'
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // 规范化请求
  const canonicalUri = uri;
  const canonicalQueryString = query || '';
  
  // 规范化请求头
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');

  // 如果 payload 是 'UNSIGNED-PAYLOAD'，直接使用它；否则计算哈希
  const payloadHash = payload === 'UNSIGNED-PAYLOAD' ? 'UNSIGNED-PAYLOAD' : await sha256(payload);

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // 创建待签名字符串
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // 计算签名
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(signatureBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 添加授权头
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'Authorization': authorization,
    'X-Amz-Date': amzDate,
  };
}

export class R2Service {
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private endpoint: string;
  private region: string;
  private urlExpires: number;

  constructor(environment: Environment) {
    const r2Config = environment.r2;
    
    this.accessKeyId = r2Config.accessKeyId;
    this.secretAccessKey = r2Config.secretAccessKey;
    this.bucket = r2Config.bucket;
    this.endpoint = r2Config.endpoint;
    this.region = r2Config.region || 'auto';
    this.urlExpires = r2Config.urlExpires;
  }

  async listFiles(prefix: string = '', marker: string = '') {
    // 规范化前缀：如果有前缀且不以/结尾，添加/；如果是空字符串则保持为空
    let normalizedPrefix = prefix;
    if (prefix && !prefix.endsWith('/')) {
      normalizedPrefix = prefix + '/';
    }

    const queryParams = new URLSearchParams();
    queryParams.set('list-type', '2');
    if (normalizedPrefix) {
      queryParams.set('prefix', normalizedPrefix);
    }
    queryParams.set('delimiter', '/');
    queryParams.set('max-keys', '1000');
    if (marker) {
      queryParams.set('continuation-token', marker);
    }

    try {
      const url = new URL(`${this.endpoint}/${this.bucket}`);
      url.search = queryParams.toString();

      const headers: Record<string, string> = {
        'Host': url.hostname,
      };

      const signedHeaders = await signRequest(
        'GET',
        `/${this.bucket}`,
        queryParams.toString(),
        headers,
        '',
        this.accessKeyId,
        this.secretAccessKey,
        this.region
      );

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: signedHeaders,
      });

      if (!response.ok) {
        throw new Error(`R2 listFiles failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const result = this.parseListObjectsV2Response(xmlText);

      return {
        items: (result.Contents || []).map((item: any) => ({
          key: item.Key || '',
          fsize: parseInt(item.Size || '0', 10),
          mimeType: this.getMimeType(item.Key || ''),
          putTime: item.LastModified ? new Date(item.LastModified).getTime() * 10000 : Date.now() * 10000,
        })),
        commonPrefixes: (result.CommonPrefixes || []).map((item: any) => ({
          prefix: item.Prefix || '',
        })),
        marker: result.NextContinuationToken || '',
      };
    } catch (error) {
      console.error('R2Service.listFiles error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        if (error.message.includes('timeout')) {
          throw new Error(`R2 request timeout: ${error.message}`);
        }
      }
      throw error;
    }
  }

  private parseListObjectsV2Response(xmlText: string): any {
    // 简单的 XML 解析（生产环境建议使用 XML 解析库）
    const result: any = {
      Contents: [],
      CommonPrefixes: [],
    };

    // 解析 Contents
    const contentsMatches = xmlText.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
    for (const match of Array.from(contentsMatches)) {
      const contentXml = match[1];
      const keyMatch = contentXml.match(/<Key>(.*?)<\/Key>/);
      const sizeMatch = contentXml.match(/<Size>(.*?)<\/Size>/);
      const lastModifiedMatch = contentXml.match(/<LastModified>(.*?)<\/LastModified>/);
      
      if (keyMatch) {
        result.Contents.push({
          Key: keyMatch[1],
          Size: sizeMatch ? sizeMatch[1] : '0',
          LastModified: lastModifiedMatch ? lastModifiedMatch[1] : new Date().toISOString(),
        });
      }
    }

    // 解析 CommonPrefixes
    const prefixMatches = xmlText.matchAll(/<CommonPrefixes>[\s\S]*?<Prefix>(.*?)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g);
    for (const match of Array.from(prefixMatches)) {
      result.CommonPrefixes.push({
        Prefix: match[1],
      });
    }

    // 解析 NextContinuationToken
    const tokenMatch = xmlText.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
    if (tokenMatch) {
      result.NextContinuationToken = tokenMatch[1];
    }

    return result;
  }

  async uploadFile(file: Buffer, key: string) {
    const contentType = this.getMimeType(key);
    
    // 对于二进制文件，使用 UNSIGNED-PAYLOAD 或计算实际的 payload hash
    // 为了简化，我们使用 UNSIGNED-PAYLOAD 方式
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': file.length.toString(),
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    };

    const signedHeaders = await signRequest(
      'PUT',
      `/${this.bucket}/${key}`,
      '',
      headers,
      'UNSIGNED-PAYLOAD',
      this.accessKeyId,
      this.secretAccessKey,
      this.region
    );

    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
    // 确保file是BodyInit类型（Buffer需要转换为Uint8Array或ArrayBuffer）
    // 使用类型断言确保类型正确
    const body: BodyInit = (file instanceof Uint8Array ? file : new Uint8Array(file)) as BodyInit;
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: signedHeaders,
      body: body,
    });

    if (!response.ok) {
      throw new Error(`R2 uploadFile failed: ${response.status} ${response.statusText}`);
    }

    return {
      key,
      hash: '',
      fsize: file.length,
    };
  }

  async deleteFile(key: string) {
    const headers: Record<string, string> = {};

    const signedHeaders = await signRequest(
      'DELETE',
      `/${this.bucket}/${key}`,
      '',
      headers,
      '',
      this.accessKeyId,
      this.secretAccessKey,
      this.region
    );

    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: signedHeaders,
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`R2 deleteFile failed: ${response.status} ${response.statusText}`);
    }
  }

  async getFileInfo(key: string) {
    const headers: Record<string, string> = {};

    const signedHeaders = await signRequest(
      'HEAD',
      `/${this.bucket}/${key}`,
      '',
      headers,
      '',
      this.accessKeyId,
      this.secretAccessKey,
      this.region
    );

    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
    const response = await fetch(url.toString(), {
      method: 'HEAD',
      headers: signedHeaders,
    });

    if (!response.ok) {
      throw new Error(`R2 getFileInfo failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    const lastModified = response.headers.get('last-modified');

    return {
      fsize: contentLength ? parseInt(contentLength, 10) : 0,
      mimeType: contentType || 'application/octet-stream',
      putTime: lastModified ? new Date(lastModified).getTime() * 10000 : Date.now() * 10000,
    };
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
    
    const normalizedDomain = domain.endsWith('/') ? domain : `${domain}/`;
    const fileUrl = `${normalizedDomain}${key}`;
    
    return fileUrl;
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
    } catch (e) {
      // 如果 endpoint 不包含协议，添加 https://
      endpointUrl = new URL(`https://${this.endpoint}`);
    }
    
    const hostname = endpointUrl.hostname;
    
    // 对于 S3/R2 API，路径格式是 /bucket/key
    // 在规范化请求中，路径部分需要对每个路径段进行编码，但保留斜杠
    // 例如：/bucket/path/to/file with spaces.png -> /bucket/path/to/file%20with%20spaces.png
    // 注意：必须使用相同的编码函数确保规范化路径和最终URL一致
    // AWS S3规范要求对括号进行编码：() -> %28%29
    const encodePathSegment = (path: string): string => {
      // 分割路径，对每个段进行编码，然后重新连接
      // 处理空字符串段（连续斜杠的情况）
      // 注意：AWS S3要求对括号进行编码，所以需要额外处理
      return path.split('/')
        .map(seg => {
          if (seg === '') return '';
          // 先使用encodeURIComponent编码，然后确保括号也被编码
          // encodeURIComponent不会编码括号，但AWS S3需要编码
          return encodeURIComponent(seg)
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');
        })
        .join('/');
    };
    
    // 规范化路径：对每个路径段进行编码
    // 使用同一个编码函数确保一致性
    const encodedKey = encodePathSegment(normalizedKey);
    const canonicalPath = `/${this.bucket}/${encodedKey}`;

    // 规范化查询字符串（按字母顺序排序）
    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    // 构建规范化请求
    // 注意：在规范化请求中，路径部分需要对每个路径段进行编码
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

    // 构建最终 URL - 使用 endpoint 的 origin
    // 使用与规范化路径相同的编码方式，确保一致性
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

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
      'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
      'pdf': 'application/pdf', 'json': 'application/json',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
