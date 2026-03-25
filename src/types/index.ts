// 语言枚举与类型
export enum LanguageCode {
  EN = 'en',
  ZH = 'zh',
  JA = 'ja',
  VI = 'vi',
  ZH_HANT = 'zh-hant',
}

export type Language = `${LanguageCode}`;

// 标签项类型定义
export interface TabItem {
  title: string;
  type: string;
  time: string;
  icon: string;
}

// 标签信息类型定义
export interface TabInfo {
  title: string;
  type: string;
  icon: string;
  items: TabItem[];
}
