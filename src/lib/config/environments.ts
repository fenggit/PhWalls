// 环境配置
const R2_PUBLIC_CDN_URL = 'https://static.phwalls.com';
const R2_IS_PRIVATE = false;

export interface Environment {
  storageType: 'r2'; // 存储类型
  r2: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    region: string;
    isPrivate: boolean;
    publicCdnUrl: string;
    urlExpires: number;
  };
}

export const environment: Environment = {
  storageType: 'r2',
  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID_PROD || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_PROD || '',
    bucket: process.env.R2_BUCKET_NAME_PROD || '',
    endpoint: process.env.R2_ENDPOINT_PROD || '',
    region: process.env.R2_REGION_PROD || 'auto',
    isPrivate: R2_IS_PRIVATE,
    publicCdnUrl: R2_PUBLIC_CDN_URL,
    urlExpires: Number(process.env.R2_URL_EXPIRES_PROD || '3600'),
  },
};

export const getCurrentEnvironment = (): Environment => {
  return environment;
};
