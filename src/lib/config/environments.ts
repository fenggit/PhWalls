// 环境配置
export interface Environment {
  storageType: 'r2'; // 存储类型
  r2: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    region: string;
    isPrivate: boolean;
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
    region: 'auto', // 默认值，不需要配置
    isPrivate: true, // 默认值，使用私有存储桶和签名URL
    urlExpires: 3600, // 默认值，1小时过期
  },
};

export const getCurrentEnvironment = (): Environment => {
  // 添加调试日志
  if (environment.storageType === 'r2') {
    // console.log('Current R2 Configuration:', {
    //   storageType: environment.storageType,
    //   hasAccessKeyId: !!environment.r2.accessKeyId,
    //   hasSecretAccessKey: !!environment.r2.secretAccessKey,
    //   bucket: environment.r2.bucket,
    //   endpoint: environment.r2.endpoint,
    //   region: environment.r2.region,
    //   isPrivate: environment.r2.isPrivate,
    //   urlExpires: environment.r2.urlExpires
    // });
  }
  return environment;
};
