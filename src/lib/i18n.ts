import type { Language } from '@/types';

export type { Language } from '@/types';

export interface I18nTexts {
  // 通用文本
  siteName: string;
  heroTitle: string;
  heroDescription: string;
  loading: string;
  
  // 导航相关
  exploreButton: string;
  learnMore: string;
  about: string;
  
  // 产品相关
  download: string;
  preview: string;
  viewAllWallpapers: string;
  hdWallpaperDownloadAlt: string;
  breadcrumbNavigationLabel: string;
  updatedLabel: string;
  autoCloseSuffix: string;
  
  // 页脚
  footerDescription: string;
  copyright: string;
  trademarkDisclaimer: string;
  // 空状态
  noWallpapers: string;
  noWallpapersDescription: string;
  
  // FAQ 相关
  faqQuestion2: string;
  faqAnswer2: string;
  faqQuestion3: string;
  faqAnswer3: string;
  faqQuestion4: string;
  faqAnswer4: string;
  faqQuestion5: string;
  faqAnswer5: string;
  faqQuestion6: string;
  faqAnswer6: string;
  faqQuestion7: string;
  faqAnswer7: string;
  
  // 用户认证相关
  login: string;
  logout: string;
  loggingOut: string;
  username: string;
  password: string;
  rememberMe: string;
  loginButton: string;
  loggingIn: string;
  loginFailed: string;
  networkError: string;
  returnHome: string;
  securityLogin: string;
  // 文件管理相关
  fileManagement: string;
  databaseRecords: string;
  refresh: string;
  uploadFile: string;
  uploading: string;
  uploadSuccess: string;
  uploadFailed: string;
  delete: string;
  deleteConfirm: string;
  deleteSuccess: string;
  deleteFailed: string;
  copyPath: string;
  pathCopied: string;
  refreshUrl: string;
  urlRefreshed: string;
  privateLink: string;
  privateSpaceMode: string;
  folder: string;
  file: string;
  rootDirectory: string;
  backToParent: string;
  noFiles: string;
  loadingFiles: string;
  fileSize: string;
  fileType: string;
  uploadTime: string;
  operation: string;
  open: string;
  enterFolder: string;
  copyUrl: string;
  refreshLink: string;
  tag: string;
  enterTag: string;
  syncToDatabase: string;
  selectedFiles: string;
  cancel: string;
  confirm: string;
  
  // 数据库相关
  databaseFileRecords: string;
  syncedFiles: string;
  noDatabaseRecords: string;
  id: string;
  fileName: string;
  path: string;
  type: string;
  createTime: string;
  
  // JSON预览相关
  jsonPreview: string;
  export: string;
  exportJson: string;
  exportSuccess: string;
  exportFailed: string;
  copy: string;
  copied: string;
  copyFailed: string;
  close: string;
  generating: string;
  categories: string;
  files: string;
  completeJsonData: string;
  characters: string;
  noData: string;
  previewJson: string;
  exportJsonFile: string;
  downloading: string;
  downloadFailed: string;
  downloadWallpaper: string;
  imageLoadFailed: string;
  imageLoading: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  errorDetails: string;
  refreshImage: string;
  downloadConfirm: string;
  
  // 环境相关
  production: string;
  selectEnvironment: string;
  environment: string;
  
  // 错误消息
  configurationError: string;
  domainNotConfigured: string;
  pleaseSetEnvVar: string;
  example: string;
  unknownError: string;
  networkErrorRetry: string;
  
  // 成功消息
  operationSuccess: string;
  fileUploaded: string;
  fileDeleted: string;
  
  // 数量相关
  count: string;
  pieces: string;
  
  // 平台相关
  iphoneWallpapers: string;
  ipadWallpapers: string;
  iosWallpapers: string;
  ipadosWallpapers: string;
  macWallpapers: string;
  macosWallpapers: string;
  wwdcWallpapers: string;
  noWallpaperData: string;
  
  // 页脚链接
  aboutUs: string;
  contactUs: string;
  
  // 语言切换（已废弃，保留用于兼容性）
  switchToEnglish: string;
  switchToChinese: string;
  switchToJapanese: string;
  switchToVietnamese: string;
  chinese: string;
  chineseSimplified: string;
  chineseTraditional: string;
  english: string;
  japanese: string;
  vietnamese: string;
  
  // 用户相关
  user: string;
  
  // 404 页面
  pageNotFound: string;
  pageNotFoundDescription: string;
  backToHome: string;
  needHelp: string;
  needHelpDescription: string;
  notFoundBadge: string;
  notFoundHeroTitle: string;
  notFoundHeroDescription: string;
  notFoundReportBrokenLink: string;
  notFoundStatusLabel: string;
  notFoundStatusValue: string;
  notFoundSeoLabel: string;
  notFoundSeoValue: string;
  notFoundSupportLabel: string;
  notFoundQuickLinksTitle: string;
  notFoundQuickLinksDescription: string;
  notFoundQuickLinkIphoneDescription: string;
  notFoundQuickLinkIpadDescription: string;
  notFoundQuickLinkMacDescription: string;
  notFoundQuickLinkWwdcDescription: string;
  notFoundFooterNote: string;
  
  // 关于页面
  ourMission: string;
  qualityAssurance: string;
  contactDescription: string;
  aboutDescription: string;
  missionDescription: string;
  qualityDescription: string;
  missionDescription2: string;
  aboutTitle: string;
  aboutSubtitle: string;
  aboutHeroTagline: string;
  aboutResourceTitle: string;
  aboutResourceDesc: string;
  aboutIphoneDesc: string;
  aboutIpadDesc: string;
  aboutMacDesc: string;
  aboutWwdcDesc: string;
  aboutTrustTitle: string;
  aboutTrustDesc: string;
  aboutSupportTitle: string;
  aboutSupportDesc: string;
  aboutContactTitle: string;
  aboutContactDesc: string;
  systemNative: string;
  hdWatermarkFree: string;
  regularUpdates: string;
  faqTitle: string;
  faqSubtitle: string;
  howToSupport: string;
  howToSupportAnswer: string;
  howToContact: string;
  howToContactAnswer: string;
  qqGroup: string;
  copyrightNotice: string;
  copyrightText1: string;
  copyrightText2: string;
  homeButton: string;
  preloadingImages: string;
  enterUsername: string;
  enterPassword: string;
  letsGo: string;
  
  // Custom Wallpaper 页面
  customWallpaper: string;
  home: string;
  presetGradients: string;
  customColor: string;
  backgroundColor: string;
  appleLogo: string;
  color: string;
  size: string;
  position: string;
  horizontal: string;
  vertical: string;
  iphone: string;
  ipad: string;
  imac: string;
  
  // Custom Wallpaper SEO
  customWallpaperTitle: string;
  customWallpaperDescription: string;
  customWallpaperKeywords: string;
  createYourWallpaper: string;
  downloadYourDesign: string;
  mainNavigationLabel: string;
  wallpaperPreviewLabel: string;
  wallpaperCustomizationControlsLabel: string;
  
  // 设备页面
  released: string;
  wallpapersTitleSuffix: string;
  wallpapers: string;
  allWallpapers: string;
  phoneWallpapersGroupTitle: string;
  ipadPortraitWallpapersGroupTitle: string;
  ipadLandscapeWallpapersGroupTitle: string;
  desktopWallpapersGroupTitle: string;
  watchWallpapersGroupTitle: string;
  hdFreeLabel: string;
  backToTopLabel: string;
  multiResolutionPageDescription: string;
  wallpaperAltSuffix: string;
  newYearLabel: string;
  collectionDescriptionTemplate: string;
  
  // Phone 支持链接
  appleOfficialSupport: string;
  
  // 隐私政策相关
  privacyPolicyTitle: string;
  privacyPolicySubtitle: string;
  privacyPolicyLastUpdated: string;
  lastUpdated: string;
  privacySection1Title: string;
  privacySection1Content1: string;
  privacySection1Item1: string;
  privacySection1Item2: string;
  privacySection1Item3: string;
  privacySection1Item4: string;
  privacySection2Title: string;
  privacySection2Content1: string;
  privacySection2Item1: string;
  privacySection2Item2: string;
  privacySection2Item3: string;
  privacySection2Item4: string;
  privacySection3Title: string;
  privacySection3Content1: string;
  privacySection3Item1: string;
  privacySection3Item2: string;
  privacySection3Item3: string;
  privacySection4Title: string;
  privacySection4Content1: string;
  privacySection4Content2: string;
  privacySection5Title: string;
  privacySection5Content1: string;
  privacySection5Subtitle: string;
  privacyServiceGoogleAnalytics: string;
  privacyServiceCloudflare: string;
  privacySection6Title: string;
  privacySection6Content1: string;
  privacySection6Item1: string;
  privacySection6Item2: string;
  privacySection6Item3: string;
  privacySection6Item4: string;
  privacySection7Title: string;
  privacySection7Content1: string;
  contactEmail: string;
  privacySection8Title: string;
  privacySection8Content1: string;
  privacySection8Content2: string;
  privacyPolicyFooter: string;
  privacyPolicy: string;
  
  // 微信二维码相关
  scanWechatQR: string;
  miniProgram: string;
  
  // 壁纸大小调整相关
  wallpaperSize: string;
  originalSize: string;
  customSize: string;
  width: string;
  height: string;
  maintainAspectRatio: string;
  resetSize: string;
  currentSize: string;
}

export const i18nTexts: Record<Language, I18nTexts> = {
  zh: {
    siteName: 'PhWalls',
    heroTitle: 'Phone Wallpaper',
    heroDescription: '获取手机品牌设备最新内置壁纸合集，涵盖 Samsung、Xiaomi、Vivo、OPPO、Huawei、Honor、OnePlus、Google Pixel 等品牌，支持高清无水印下载。',
    loading: '加载中...',
    exploreButton: '开始探索',
    learnMore: '了解更多',
    about: '关于',
    download: '下载',
    preview: '预览',
    viewAllWallpapers: '查看全部壁纸',
    hdWallpaperDownloadAlt: '高清壁纸 下载',
    breadcrumbNavigationLabel: '面包屑导航',
    updatedLabel: '更新',
    autoCloseSuffix: '秒后自动关闭',
    footerDescription: '历代 iPhone、iPad 及 Mac 系统原厂壁纸库。提供 4K/5K/6K 超清内置背景下载，涵盖 iOS、iPadOS 与 macOS 全系列资源，让您的设备重现原生视觉美学。',
    copyright: '',
    trademarkDisclaimer: 'Phone、iPhone、iPad、Mac、iOS、macOS 为 Phone Inc. 的商标。本网站为独立项目，与 Phone Inc. 无关联或认可。',
    noWallpapers: '暂无壁纸',
    noWallpapersDescription: '我们正在努力添加更多精美的壁纸，请稍后再来查看。',
    faqQuestion2: '下载的壁纸有水印吗？',
    faqAnswer2: '没有，提供的都是高清无水印原图。',
    faqQuestion3: '壁纸会定期更新吗？',
    faqAnswer3: '会，每次手机品牌发布新系统，我们都会及时收录最新壁纸。如果您有最新资源，也可以投稿到fenggit@163.com。',
    faqQuestion4: '如何更换iPhone壁纸？',
    faqAnswer4: '请访问Phone官方支持页面了解详细的壁纸更换步骤。',
    faqQuestion5: '如何更换iPad壁纸？',
    faqAnswer5: '请访问Phone官方支持页面了解详细的壁纸更换步骤。',
    faqQuestion6: '如何自定义Mac壁纸？',
    faqAnswer6: '请访问Phone官方支持页面了解详细的壁纸自定义步骤。',
    faqQuestion7: '如何查询 Phone 设备参数信息？',
    faqAnswer7: 'Phone 手机品牌产品参数中心',
    
    // 用户认证相关
    login: '登录',
    logout: '登出',
    loggingOut: '登出中...',
    username: '用户名',
    password: '密码',
    rememberMe: '记住登录',
    loginButton: '登录',
    loggingIn: '登录中...',
    loginFailed: '登录失败',
    networkError: '网络错误，请稍后重试',
    returnHome: '返回首页',
    securityLogin: '安全登录系统',
    
    // 文件管理相关
    fileManagement: '文件管理',
    databaseRecords: '数据库记录',
    refresh: '刷新',
    uploadFile: '上传文件',
    uploading: '上传中...',
    uploadSuccess: '上传成功',
    uploadFailed: '上传失败',
    delete: '删除',
    deleteConfirm: '确定要删除这个文件吗？',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败',
    copyPath: '复制路径',
    pathCopied: '路径已复制到剪贴板',
    refreshUrl: '刷新链接',
    urlRefreshed: 'URL已刷新',
    privateLink: '私有链接',
    privateSpaceMode: '私有空间模式',
    folder: '文件夹',
    file: '文件',
    rootDirectory: '根目录',
    backToParent: '返回上一级',
    noFiles: '暂无文件',
    loadingFiles: '加载中...',
    fileSize: '大小',
    fileType: '类型',
    uploadTime: '上传时间',
    operation: '操作',
    open: '打开',
    enterFolder: '进入文件夹',
    copyUrl: '复制路径',
    refreshLink: '刷新链接',
    tag: '标签',
    enterTag: '输入文件标签...',
    syncToDatabase: '同步到数据库',
    selectedFiles: '选择了 {count} 个文件',
    cancel: '取消',
    confirm: '确认',
    
    // 数据库相关
    databaseFileRecords: '数据库文件记录',
    syncedFiles: '已同步到数据库的文件记录',
    noDatabaseRecords: '暂无数据库记录',
    id: 'ID',
    fileName: '文件名',
    path: '路径',
    type: '类型',
    createTime: '创建时间',
    
    // JSON预览相关
    jsonPreview: 'JSON数据预览',
    export: '导出',
    exportJson: '导出JSON',
    exportSuccess: 'JSON文件 {name}.json 导出成功！',
    exportFailed: '导出失败',
    copy: '复制',
    copied: '已复制到剪贴板',
    copyFailed: '复制失败，请检查浏览器权限设置',
    close: '关闭',
    generating: '生成中...',
    categories: '个分类',
    files: '个文件',
    completeJsonData: '完整JSON数据',
    characters: '字符',
    noData: '暂无数据',
    previewJson: '预览JSON',
    exportJsonFile: '导出JSON',
    
    // 壁纸预览相关
    downloadWallpaper: '下载',
    downloading: '下载中...',
    downloadFailed: '下载失败，请重试',
    imageLoadFailed: '图片加载失败',
    imageLoading: '加载中...',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置',
    errorDetails: '错误详情',
    refreshImage: '刷新图片',
    downloadConfirm: '是否下载高清壁纸?',
    
    // 环境相关
    production: '正式环境',
    selectEnvironment: '选择环境',
    environment: '环境',
    
    // 错误消息
    configurationError: '配置错误',
    domainNotConfigured: '存储域名未配置！',
    pleaseSetEnvVar: '请设置环境变量: {var}',
    example: '例如: {var}=your-domain.r2.dev',
    unknownError: '未知错误',
    networkErrorRetry: '网络错误，请稍后重试',
    
    // 成功消息
    operationSuccess: '操作成功',
    fileUploaded: '文件上传成功',
    fileDeleted: '文件删除成功',
    
    // 数量相关
    count: '张',
    pieces: 'sheets',
    
    // 平台相关
    iphoneWallpapers: 'iPhone 壁纸',
    ipadWallpapers: 'iPad 壁纸',
    iosWallpapers: 'iOS 壁纸',
    ipadosWallpapers: 'iPadOS 壁纸',
    macWallpapers: 'Mac 壁纸',
    macosWallpapers: 'macOS 壁纸',
    wwdcWallpapers: 'WWDC 壁纸',
    noWallpaperData: '该设备暂无壁纸数据',
    
    // 页脚链接
    aboutUs: '关于我们',
    contactUs: '联系我们',
    
    // 语言切换
    switchToEnglish: '切换到英文',
    switchToChinese: '切换到中文',
    switchToJapanese: '切换到日语',
    switchToVietnamese: '切换到越南语',
    chinese: '中文',
    chineseSimplified: '中文（简体）',
    chineseTraditional: '中文（繁体）',
    english: 'EN',
    japanese: 'JP',
    vietnamese: 'VI',
    
    // 用户相关
    user: '用户',
    
    // 404 页面
    pageNotFound: '页面未找到',
    pageNotFoundDescription: '抱歉，您访问的页面不存在或已被移除。',
    backToHome: '返回首页',
    needHelp: '需要帮助？',
    needHelpDescription: '如果您认为这是一个错误，或者需要帮助，请联系我们：',
    notFoundBadge: '页面丢失',
    notFoundHeroTitle: '这个壁纸页面暂时无法访问。',
    notFoundHeroDescription: '这个链接可能已经失效、被重命名或被移除。你可以从下面的主要壁纸分类继续浏览 iPhone、iPad、macOS 和 WWDC 壁纸，避免停在无效页面。',
    notFoundReportBrokenLink: '反馈失效链接',
    notFoundStatusLabel: '状态',
    notFoundStatusValue: '404 页面未找到',
    notFoundSeoLabel: 'SEO',
    notFoundSeoValue: '保留真实 404，并提供有效内部链接',
    notFoundSupportLabel: '联系支持',
    notFoundQuickLinksTitle: '从有效分类页继续浏览',
    notFoundQuickLinksDescription: '这些入口可以帮助用户和搜索引擎快速回到已验证的壁纸集合页面。',
    notFoundQuickLinkIphoneDescription: '按机型和代际浏览 iPhone 壁纸合集。',
    notFoundQuickLinkIpadDescription: '查看适配横屏和竖屏设备的 iPad 与 iPadOS 壁纸。',
    notFoundQuickLinkMacDescription: '浏览 macOS 版本、MacBook 和 iMac 桌面壁纸。',
    notFoundQuickLinkWwdcDescription: '打开历年 WWDC 活动与主题壁纸档案。',
    notFoundFooterNote: 'PhWalls 整理 iPhone、iPad、macOS 和 WWDC 壁纸落地页。当旧链接失效时，建议从上面的分类入口继续浏览，而不是把所有 404 都重定向到首页。',
    
    // 关于页面
    ourMission: '我们的使命',
    qualityAssurance: '品质保证',
    contactDescription: '如果您有任何问题、建议或发现任何版权问题，请随时联系我们：',
    aboutDescription: '了解 Phone Wallpaper 的详细信息，解答您可能遇到的问题',
    missionDescription: '我们致力于为手机品牌用户提供最新、最高质量的系统内置壁纸。通过精心收集和整理，让每一位用户都能轻松获取到官方原生壁纸，为您的设备增添更多个性化选择。',
    qualityDescription: '所有壁纸均为手机品牌官方原生壁纸，确保最高质量和最纯正的体验',
    missionDescription2: '我们相信，好的壁纸不仅能美化您的设备，更能体现您的个性和品味。因此，我们只提供官方原生的高质量壁纸，确保每一张都经过精心筛选。',
    aboutTitle: '关于 PhWalls',
    aboutSubtitle: 'PhWalls 提供 iPhone、iPad 与 Mac 系统内置高清壁纸整理与下载，涵盖 iOS 与 macOS 各版本壁纸合集。按设备与系统分类归档，便于查找与保存。',
    aboutHeroTagline: 'Phone 原厂壁纸资源档案',
    aboutResourceTitle: '按设备与系统版本快速浏览',
    aboutResourceDesc: '从 iPhone、iPad 到 Mac，按系统代际归档，提升检索效率与下载体验。',
    aboutIphoneDesc: '历代 iOS 原厂内置壁纸，支持高清下载。',
    aboutIpadDesc: '完整 iPad 与 iPadOS 系统壁纸合集。',
    aboutMacDesc: 'macOS 与 Mac 设备默认背景全版本整理。',
    aboutWwdcDesc: 'WWDC 发布会主题官方壁纸合集。',
    aboutTrustTitle: '为什么选择 PhWalls',
    aboutTrustDesc: '我们持续整理原厂资源，提供清晰分类、稳定链接与高分辨率下载。',
    aboutSupportTitle: '官方支持入口',
    aboutSupportDesc: '如果你希望了解更换或设置壁纸的方法，可直接访问 Phone 官方文档。',
    aboutContactTitle: '联系与反馈',
    aboutContactDesc: '欢迎提交补充资源、版本纠错与版权反馈，我们会尽快处理。',
    systemNative: '系统原生壁纸',
    hdWatermarkFree: '高清无水印',
    regularUpdates: '定期更新',
    faqTitle: '常见问题',
    faqSubtitle: '解答您最关心的问题',
    howToSupport: '如何支持我们？',
    howToSupportAnswer: '如果您喜欢我们的服务，请分享给更多朋友，或者通过社交媒体关注我们。您的支持是我们持续改进的动力！',
    howToContact: '如何联系我们？',
    howToContactAnswer: '如果您有任何问题、建议或发现任何版权问题，请随时联系我们：',
    qqGroup: 'QQ群：963594743',
    copyrightNotice: '版权声明',
    copyrightText1: '本站展示的壁纸版权归原权利人所有。PhWalls 为独立整理站点，与 Phone Inc. 无关联。',
    copyrightText2: '如涉及版权问题，请联系 fenggit@163.com，我们将及时处理。',
    homeButton: '首页',
    preloadingImages: '加载中...',
    enterUsername: '请输入用户名',
    enterPassword: '请输入密码',
    letsGo: '开始使用',
    
    // Custom Wallpaper 页面
    customWallpaper: '设计壁纸',
    home: '首页',
    presetGradients: '预设渐变',
    customColor: '自定义颜色',
    backgroundColor: '背景颜色',
    appleLogo: 'Phone 标志',
    color: '颜色',
    size: '大小',
    position: '位置',
    horizontal: '水平',
    vertical: '垂直',
    iphone: 'iPhone',
    ipad: 'iPad',
    imac: 'iMac',
    
    // Custom Wallpaper SEO
    customWallpaperTitle: '设计壁纸制作工具 - 在线设计 iPhone iPad iMac 壁纸 | PhWalls',
    customWallpaperDescription: '免费在线设计壁纸制作工具，支持 iPhone、iPad、iMac 壁纸设计。选择预设渐变色或自定义颜色，添加 Phone Logo，一键下载高清壁纸。打造专属你的设备壁纸。',
    customWallpaperKeywords: '设计壁纸,壁纸制作,iPhone壁纸,iPad壁纸,iMac壁纸,在线壁纸设计,Phone壁纸,渐变壁纸,壁纸下载,免费壁纸工具',
    createYourWallpaper: '创建你的专属壁纸',
    downloadYourDesign: '下载你的设计',
    mainNavigationLabel: '主导航',
    wallpaperPreviewLabel: '壁纸预览',
    wallpaperCustomizationControlsLabel: '壁纸自定义控制',
    
    // 设备页面
    released: '发布时间',
    wallpapersTitleSuffix: '壁纸',
    wallpapers: '张壁纸',
    allWallpapers: '全部壁纸',
    phoneWallpapersGroupTitle: 'iPhone 壁纸',
    ipadPortraitWallpapersGroupTitle: 'iPad 壁纸',
    ipadLandscapeWallpapersGroupTitle: 'iPad 壁纸',
    desktopWallpapersGroupTitle: 'Mac 壁纸',
    watchWallpapersGroupTitle: 'Phone Watch 壁纸',
    hdFreeLabel: 'HD 原图',
    backToTopLabel: '返回顶部',
    multiResolutionPageDescription: '查看 {pageTitle} 多分辨率壁纸，按不同设备分类预览与下载。',
    wallpaperAltSuffix: '壁纸',
    newYearLabel: '新年',
    collectionDescriptionTemplate: '浏览 {collectionName} 的 {count} 张{categoryLabel}壁纸，高清原图下载，无水印，按设备版本整理。',
    
    // Phone 支持链接
    appleOfficialSupport: 'Phone 官方支持',
    
    // 隐私政策相关
    privacyPolicyTitle: '隐私政策',
    privacyPolicySubtitle: '我们重视您的隐私，本政策详细说明了我们如何收集、使用和保护您的个人信息。',
    privacyPolicyLastUpdated: '2025年1月15日',
    lastUpdated: '最后更新',
    privacySection1Title: '1. 信息收集',
    privacySection1Content1: '我们收集以下类型的信息：',
    privacySection1Item1: '设备信息：设备型号、操作系统版本、浏览器类型',
    privacySection1Item2: '使用信息：访问页面、停留时间、点击行为',
    privacySection1Item3: '技术信息：IP地址、Cookie、设备标识符',
    privacySection1Item4: '联系信息：当您联系我们时提供的邮箱地址',
    privacySection2Title: '2. 信息使用',
    privacySection2Content1: '我们使用收集的信息用于以下目的：',
    privacySection2Item1: '提供和改进我们的服务',
    privacySection2Item2: '分析网站使用情况以优化用户体验',
    privacySection2Item3: '显示相关广告内容',
    privacySection2Item4: '与您沟通和提供客户支持',
    privacySection3Title: '3. 信息保护',
    privacySection3Content1: '我们采取适当的技术和组织措施保护您的个人信息：',
    privacySection3Item1: '使用HTTPS加密传输数据',
    privacySection3Item2: '定期更新安全措施和系统',
    privacySection3Item3: '限制员工访问个人信息的权限',
    privacySection4Title: '4. Cookie使用',
    privacySection4Content1: '我们使用Cookie和类似技术来改善您的浏览体验。Cookie是存储在您设备上的小文本文件。',
    privacySection4Content2: '您可以通过浏览器设置控制Cookie的使用，但禁用Cookie可能会影响网站功能。',
    privacySection5Title: '5. 第三方服务',
    privacySection5Content1: '我们使用以下第三方服务，它们可能有自己的隐私政策：',
    privacySection5Subtitle: '我们使用的第三方服务包括：',
    privacyServiceGoogleAnalytics: 'Google Analytics - 网站分析',
    privacyServiceCloudflare: 'Cloudflare - CDN和安全服务',
    privacySection6Title: '6. 用户权利',
    privacySection6Content1: '根据适用的数据保护法律，您拥有以下权利：',
    privacySection6Item1: '访问您的个人信息',
    privacySection6Item2: '更正不准确的信息',
    privacySection6Item3: '删除您的个人信息',
    privacySection6Item4: '限制或反对处理您的信息',
    privacySection7Title: '7. 联系我们',
    privacySection7Content1: '如果您对本隐私政策有任何疑问或需要行使您的权利，请通过以下方式联系我们：',
    contactEmail: '联系邮箱',
    privacySection8Title: '8. 政策更新',
    privacySection8Content1: '我们可能会不时更新本隐私政策。任何重大变更都会在网站上公布。',
    privacySection8Content2: '我们建议您定期查看本政策以了解我们如何保护您的信息。',
    privacyPolicyFooter: '本隐私政策自发布之日起生效。',
    privacyPolicy: '隐私政策',
    
    // 微信二维码相关
    scanWechatQR: '扫码访问小程序',
    miniProgram: '小程序',
    
    // 壁纸大小调整相关
    wallpaperSize: '壁纸大小',
    originalSize: '原始大小',
    customSize: '自定义大小',
    width: '宽度',
    height: '高度',
    maintainAspectRatio: '保持宽高比',
    resetSize: '重置大小',
    currentSize: '当前尺寸'
  },
  en: {
    siteName: 'PhWalls',
    heroTitle: 'Phone Wallpaper',
    heroDescription: 'Explore the latest built-in phone wallpaper collection across Samsung, Xiaomi, Vivo, OPPO, Huawei, Honor, OnePlus, and Google Pixel. Download HD, watermark-free wallpapers for free.',
    loading: 'Loading...',
    exploreButton: 'Start Exploring',
    learnMore: 'Learn More',
    about: 'About',
    download: 'Download',
    preview: 'Preview',
    viewAllWallpapers: 'View All Wallpapers',
    hdWallpaperDownloadAlt: 'HD Wallpaper Download',
    breadcrumbNavigationLabel: 'Breadcrumb',
    updatedLabel: 'Updated',
    autoCloseSuffix: 's until auto close',
    footerDescription: 'Original 4K/5K/6K Wallpapers for iPhone, iPad, and Mac. Download built-in backgrounds from all iOS, iPadOS, and macOS versions to bring a pure native aesthetic to your screen.',
    copyright: '© 2025 PhWalls. All rights reserved.',
    trademarkDisclaimer: 'Phone, iPhone, iPad, Mac, iOS, and macOS are trademarks of Phone Inc. This site is not affiliated with or endorsed by Phone.',
    noWallpapers: 'No Wallpapers',
    noWallpapersDescription: 'We are working hard to add more beautiful wallpapers, please come back later.',
    faqQuestion2: 'Do the downloaded wallpapers have watermarks?',
    faqAnswer2: 'No, all wallpapers provided are high-quality original images without watermarks.',
    faqQuestion3: 'Will wallpapers be updated regularly?',
    faqAnswer3: 'Yes, we will promptly collect the latest wallpapers every time Phone releases a new system. If you have the latest resources, you can also submit them to fenggit@163.com.',
    faqQuestion4: 'How to change your iPhone wallpaper?',
    faqAnswer4: 'Please visit Phone\'s support page for detailed wallpaper change instructions.',
    faqQuestion5: 'How to change the wallpaper on iPad?',
    faqAnswer5: 'Please visit Phone\'s support page for detailed wallpaper change instructions.',
    faqQuestion6: 'How to customize the wallpaper on your Mac?',
    faqAnswer6: 'Please visit Phone\'s support page for detailed wallpaper customization instructions.',
    faqQuestion7: 'How to query Phone device parameter information?',
    faqAnswer7: 'Phone Product Parameter Center',
    
    // 用户认证相关
    login: 'Login',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    loginFailed: 'Login failed',
    networkError: 'Network error, please try again later',
    returnHome: 'Return Home',
    securityLogin: 'Secure Login System',
    
    // 文件管理相关
    fileManagement: 'File Management',
    databaseRecords: 'Database Records',
    refresh: 'Refresh',
    uploadFile: 'Upload File',
    uploading: 'Uploading...',
    uploadSuccess: 'Upload successful',
    uploadFailed: 'Upload failed',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this file?',
    deleteSuccess: 'Delete successful',
    deleteFailed: 'Delete failed',
    copyPath: 'Copy Path',
    pathCopied: 'Path copied to clipboard',
    refreshUrl: 'Refresh URL',
    urlRefreshed: 'URL refreshed',
    privateLink: 'Private Link',
    privateSpaceMode: 'Private Space Mode',
    folder: 'Folder',
    file: 'File',
    rootDirectory: 'Root Directory',
    backToParent: 'Back to Parent',
    noFiles: 'No files',
    loadingFiles: 'Loading...',
    fileSize: 'Size',
    fileType: 'Type',
    uploadTime: 'Upload Time',
    operation: 'Operation',
    open: 'Open',
    enterFolder: 'Enter Folder',
    copyUrl: 'Copy URL',
    refreshLink: 'Refresh Link',
    tag: 'Tag',
    enterTag: 'Enter file tag...',
    syncToDatabase: 'Sync to Database',
    selectedFiles: 'Selected {count} files',
    cancel: 'Cancel',
    confirm: 'Confirm',
    
    // 数据库相关
    databaseFileRecords: 'Database File Records',
    syncedFiles: 'Files synced to database',
    noDatabaseRecords: 'No database records',
    id: 'ID',
    fileName: 'File Name',
    path: 'Path',
    type: 'Type',
    createTime: 'Create Time',
    
    // JSON预览相关
    jsonPreview: 'JSON Data Preview',
    export: 'Export',
    exportJson: 'Export JSON',
    exportSuccess: 'JSON file {name}.json exported successfully!',
    exportFailed: 'Export failed',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    copyFailed: 'Copy failed, please check browser permissions',
    close: 'Close',
    generating: 'Generating...',
    categories: 'categories',
    files: 'files',
    completeJsonData: 'Complete JSON Data',
    characters: 'characters',
    noData: 'No data',
    previewJson: 'Preview JSON',
    exportJsonFile: 'Export JSON',
    
    // 壁纸预览相关
    downloadWallpaper: 'Download',
    downloading: 'Downloading...',
    downloadFailed: 'Download failed, please try again',
    imageLoadFailed: 'Image load failed',
    imageLoading: 'Loading...',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset',
    errorDetails: 'Error Details',
    refreshImage: 'Refresh Image',
    downloadConfirm: 'Download HD Wallpaper?',
    
    // 环境相关
    production: 'Production',
    selectEnvironment: 'Select Environment',
    environment: 'Environment',
    
    // 错误消息
    configurationError: 'Configuration Error',
    domainNotConfigured: 'Storage domain not configured!',
    pleaseSetEnvVar: 'Please set environment variable: {var}',
    example: 'Example: {var}=your-domain.r2.dev',
    unknownError: 'Unknown error',
    networkErrorRetry: 'Network error, please try again later',
    
    // 成功消息
    operationSuccess: 'Operation successful',
    fileUploaded: 'File uploaded successfully',
    fileDeleted: 'File deleted successfully',
    
    // 数量相关
    count: 'sheets',
    pieces: 'sheets',
    
    // 平台相关
    iphoneWallpapers: 'iPhone Wallpapers',
    ipadWallpapers: 'iPad Wallpapers',
    iosWallpapers: 'iOS Wallpapers',
    ipadosWallpapers: 'iPadOS Wallpapers',
    macWallpapers: 'Mac Wallpapers',
    macosWallpapers: 'macOS Wallpapers',
    wwdcWallpapers: 'WWDC Wallpapers',
    noWallpaperData: 'No wallpaper data available for this device',
    
    // 页脚链接
    aboutUs: 'About Us',
    contactUs: 'Contact Us',
    
    // 语言切换
    switchToEnglish: 'Switch to English',
    switchToChinese: 'Switch to Chinese',
    switchToJapanese: 'Switch to Japanese',
    switchToVietnamese: 'Switch to Vietnamese',
    chinese: 'Chinese',
    chineseSimplified: '中文（简体）',
    chineseTraditional: '中文（繁体）',
    english: 'EN',
    japanese: 'JP',
    vietnamese: 'VI',
    
    // 用户相关
    user: 'User',
    
    // 404 页面
    pageNotFound: 'Page Not Found',
    pageNotFoundDescription: 'Sorry, the page you are looking for does not exist or has been removed.',
    backToHome: 'Back to Home',
    needHelp: 'Need Help?',
    needHelpDescription: 'If you think this is an error or need assistance, please contact us:',
    notFoundBadge: 'Missing page',
    notFoundHeroTitle: 'This wallpaper page is no longer available.',
    notFoundHeroDescription: 'The link may be outdated, renamed, or removed. Browse the main wallpaper collections below to keep exploring iPhone, iPad, macOS, and WWDC backgrounds without hitting a dead end.',
    notFoundReportBrokenLink: 'Report Broken Link',
    notFoundStatusLabel: 'Status',
    notFoundStatusValue: '404 Not Found',
    notFoundSeoLabel: 'SEO',
    notFoundSeoValue: 'Valid 404 with internal recovery links',
    notFoundSupportLabel: 'Support',
    notFoundQuickLinksTitle: 'Continue from a verified collection page',
    notFoundQuickLinksDescription: 'These landing pages are the best recovery points for both users and search engines when an old URL is no longer valid.',
    notFoundQuickLinkIphoneDescription: 'Browse iPhone wallpaper collections by model and generation.',
    notFoundQuickLinkIpadDescription: 'Explore iPad and iPadOS wallpaper sets for portrait and landscape devices.',
    notFoundQuickLinkMacDescription: 'Find desktop wallpapers for macOS releases, MacBook, and iMac displays.',
    notFoundQuickLinkWwdcDescription: 'Open keynote and event wallpaper archives from WWDC collections.',
    notFoundFooterNote: 'PhWalls organizes wallpaper landing pages for iPhone, iPad, macOS, and WWDC collections. If an external or bookmarked URL breaks, use the verified category pages above instead of redirecting every missing page to the homepage.',
    
    // 关于页面
    ourMission: 'Our Mission',
    qualityAssurance: 'Quality Assurance',
    contactDescription: 'If you have any questions, suggestions, or discover any copyright issues, please feel free to contact us:',
    aboutDescription: 'Learn more about Phone Wallpaper and get answers to your questions',
    missionDescription: 'We are committed to providing Phone users with the latest and highest quality built-in wallpapers. Through careful collection and organization, we make it easy for every user to access original system wallpapers, adding more personalized choices to your device.',
    qualityDescription: 'All wallpapers are original system wallpapers, ensuring the highest quality and most authentic experience',
    missionDescription2: 'We believe that good wallpapers not only beautify your device but also reflect your personality and taste. Therefore, we only provide original, high-quality wallpapers, ensuring that each one is carefully selected.',
    aboutTitle: 'About PhWalls',
    aboutSubtitle: 'PhWalls provides curated and downloadable built-in HD wallpapers for iPhone, iPad, and Mac, covering collections across iOS and macOS versions. Organized by device and system for easy browsing and saving.',
    aboutHeroTagline: 'Original Phone Wallpaper Archive',
    aboutResourceTitle: 'Browse by Device and OS Version',
    aboutResourceDesc: 'Find wallpapers faster with structured collections for iPhone, iPad, Mac, and WWDC releases.',
    aboutIphoneDesc: 'Built-in iOS wallpapers across iPhone generations.',
    aboutIpadDesc: 'Complete iPad and iPadOS wallpaper collections.',
    aboutMacDesc: 'Full macOS and Mac default wallpaper archive.',
    aboutWwdcDesc: 'Official wallpaper releases from WWDC events.',
    aboutTrustTitle: 'Why PhWalls',
    aboutTrustDesc: 'We keep original resources organized, searchable, and downloadable in high resolution.',
    aboutSupportTitle: 'Official Support Links',
    aboutSupportDesc: 'Need help setting wallpapers on your device? Use Phone official support guides.',
    aboutContactTitle: 'Contact and Feedback',
    aboutContactDesc: 'Send corrections, missing versions, or copyright issues and we will handle them quickly.',
    systemNative: 'System Native',
    hdWatermarkFree: 'HD Watermark-Free',
    regularUpdates: 'Regular Updates',
    faqTitle: 'FAQ',
    faqSubtitle: 'Answers to your questions',
    howToSupport: 'How to support us?',
    howToSupportAnswer: 'If you like our service, please share it with more friends or follow us on social media. Your support is the driving force for our continuous improvement!',
    howToContact: 'How to contact us?',
    howToContactAnswer: 'If you have any questions, suggestions, or discover any copyright issues, please feel free to contact us:',
    qqGroup: 'QQ Group: 963594743',
    copyrightNotice: 'Copyright Notice',
    copyrightText1: 'Wallpaper copyrights belong to their respective owners. PhWalls is an independent archive and is not affiliated with Phone Inc.',
    copyrightText2: 'If you believe any content infringes your rights, contact fenggit@163.com and we will address it promptly.',
    homeButton: 'Home',
    preloadingImages: 'Loading...',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    letsGo: "Let's go",
    
    // Custom Wallpaper 页面
    customWallpaper: 'Custom Wallpaper',
    home: 'Home',
    presetGradients: 'Preset Gradients',
    customColor: 'Custom Color',
    backgroundColor: 'Background Color',
    appleLogo: 'Phone Logo',
    color: 'Color',
    size: 'Size',
    position: 'Position',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    iphone: 'iPhone',
    ipad: 'iPad',
    imac: 'iMac',
    
    // Custom Wallpaper SEO
    customWallpaperTitle: 'Custom Wallpaper Maker - Design iPhone iPad iMac Wallpapers Online | PhWalls',
    customWallpaperDescription: 'Free online custom wallpaper maker for iPhone, iPad, and iMac. Choose preset gradients or custom colors, add Phone Logo, download HD wallpapers instantly. Create unique wallpapers for your devices.',
    customWallpaperKeywords: 'custom wallpaper,wallpaper maker,iPhone wallpaper,iPad wallpaper,iMac wallpaper,online wallpaper design,Phone wallpaper,gradient wallpaper,wallpaper download,free wallpaper tool',
    createYourWallpaper: 'Create Your Custom Wallpaper',
    downloadYourDesign: 'Download Your Design',
    mainNavigationLabel: 'Main navigation',
    wallpaperPreviewLabel: 'Wallpaper preview',
    wallpaperCustomizationControlsLabel: 'Wallpaper customization controls',
    
    // 设备页面
    released: 'Released',
    wallpapersTitleSuffix: 'Wallpapers',
    wallpapers: 'Wallpapers',
    allWallpapers: 'All Wallpapers',
    phoneWallpapersGroupTitle: 'iPhone Wallpapers',
    ipadPortraitWallpapersGroupTitle: 'iPad Wallpapers',
    ipadLandscapeWallpapersGroupTitle: 'iPad Wallpapers',
    desktopWallpapersGroupTitle: 'Mac Wallpapers',
    watchWallpapersGroupTitle: 'Phone Watch Wallpapers',
    hdFreeLabel: 'HD Free',
    backToTopLabel: 'Back to top',
    multiResolutionPageDescription: 'Explore {pageTitle} in multiple resolutions, with previews and downloads grouped by device type.',
    wallpaperAltSuffix: 'wallpaper',
    newYearLabel: 'New Year',
    collectionDescriptionTemplate: 'Browse {count} wallpapers from {collectionName}. Download {categoryLabel} wallpapers in high resolution.',
    
    // Phone 支持链接
    appleOfficialSupport: 'Phone Support',
    
    // 隐私政策相关
    privacyPolicyTitle: 'Privacy Policy',
    privacyPolicySubtitle: 'We value your privacy. This policy details how we collect, use, and protect your personal information.',
    privacyPolicyLastUpdated: 'January 15, 2025',
    lastUpdated: 'Last Updated',
    privacySection1Title: '1. Information Collection',
    privacySection1Content1: 'We collect the following types of information:',
    privacySection1Item1: 'Device Information: Device model, operating system version, browser type',
    privacySection1Item2: 'Usage Information: Pages visited, time spent, click behavior',
    privacySection1Item3: 'Technical Information: IP address, cookies, device identifiers',
    privacySection1Item4: 'Contact Information: Email address when you contact us',
    privacySection2Title: '2. Information Use',
    privacySection2Content1: 'We use collected information for the following purposes:',
    privacySection2Item1: 'Provide and improve our services',
    privacySection2Item2: 'Analyze website usage to optimize user experience',
    privacySection2Item3: 'Display relevant advertising content',
    privacySection2Item4: 'Communicate with you and provide customer support',
    privacySection3Title: '3. Information Protection',
    privacySection3Content1: 'We implement appropriate technical and organizational measures to protect your personal information:',
    privacySection3Item1: 'Use HTTPS encryption for data transmission',
    privacySection3Item2: 'Regularly update security measures and systems',
    privacySection3Item3: 'Limit employee access to personal information',
    privacySection4Title: '4. Cookie Usage',
    privacySection4Content1: 'We use cookies and similar technologies to improve your browsing experience. Cookies are small text files stored on your device.',
    privacySection4Content2: 'You can control cookie usage through browser settings, but disabling cookies may affect website functionality.',
    privacySection5Title: '5. Third-Party Services',
    privacySection5Content1: 'We use the following third-party services, which may have their own privacy policies:',
    privacySection5Subtitle: 'Third-party services we use include:',
    privacyServiceGoogleAnalytics: 'Google Analytics - Website Analytics',
    privacyServiceCloudflare: 'Cloudflare - CDN and Security Services',
    privacySection6Title: '6. User Rights',
    privacySection6Content1: 'Under applicable data protection laws, you have the following rights:',
    privacySection6Item1: 'Access your personal information',
    privacySection6Item2: 'Correct inaccurate information',
    privacySection6Item3: 'Delete your personal information',
    privacySection6Item4: 'Restrict or object to processing your information',
    privacySection7Title: '7. Contact Us',
    privacySection7Content1: 'If you have any questions about this privacy policy or need to exercise your rights, please contact us:',
    contactEmail: 'Contact Email',
    privacySection8Title: '8. Policy Updates',
    privacySection8Content1: 'We may update this privacy policy from time to time. Any significant changes will be announced on the website.',
    privacySection8Content2: 'We recommend reviewing this policy regularly to understand how we protect your information.',
    privacyPolicyFooter: 'This privacy policy is effective from the date of publication.',
    privacyPolicy: 'Privacy Policy',
    
    // 微信二维码相关
    scanWechatQR: 'Mini Program',
    miniProgram: 'Mini Program',
    
    // 壁纸大小调整相关
    wallpaperSize: 'Wallpaper Size',
    originalSize: 'Original Size',
    customSize: 'Custom Size',
    width: 'Width',
    height: 'Height',
    maintainAspectRatio: 'Maintain Aspect Ratio',
    resetSize: 'Reset Size',
    currentSize: 'Current Size'
  },
  ja: {
    siteName: 'PhWalls',
    heroTitle: 'Phone 壁紙',
    heroDescription: 'Samsung、Xiaomi、Vivo、OPPO、Huawei、Honor、OnePlus、Google Pixel など主要ブランドの最新内蔵壁紙を収録。HD高画質・透かしなしで無料ダウンロードできます。',
    loading: '読み込み中...',
    exploreButton: '探索を開始',
    learnMore: '詳細を見る',
    about: 'について',
    download: 'ダウンロード',
    preview: 'プレビュー',
    viewAllWallpapers: 'すべての壁紙を見る',
    hdWallpaperDownloadAlt: 'HD 壁紙 ダウンロード',
    breadcrumbNavigationLabel: 'パンくずナビゲーション',
    updatedLabel: '更新',
    autoCloseSuffix: '秒後に自動で閉じます',
    footerDescription: '歴代 iPhone・iPad・Mac の純正システム壁紙ライブラリ。4K/5K/6K の高解像度内蔵背景をダウンロードでき、iOS・iPadOS・macOS 全バージョンを網羅。デバイスに純正のビジュアル美学を再現します。',
    copyright: '© 2025 PhWalls. 全著作権所有。',
    trademarkDisclaimer: 'Phone、iPhone、iPad、Mac、iOS、macOS は Phone Inc. の商標です。本サイトは Phone Inc. と提携または承認されていません。',
    noWallpapers: '壁紙なし',
    noWallpapersDescription: 'より美しい壁紙を追加するために努力しています。後でもう一度お越しください。',
    faqQuestion2: 'ダウンロードした壁紙に透かしはありますか？',
    faqAnswer2: 'いいえ、提供されるすべての壁紙は透かしのない高品質なオリジナル画像です。',
    faqQuestion3: '壁紙は定期的に更新されますか？',
    faqAnswer3: 'はい、Phoneが新しいシステムをリリースするたびに、最新の壁紙を迅速に収集します。最新のリソースをお持ちの場合は、fenggit@163.comまで投稿してください。',
    faqQuestion4: 'iPhoneの壁紙を変更する方法は？',
    faqAnswer4: '詳細な壁紙変更手順については、Phoneの公式サポートページをご覧ください。',
    faqQuestion5: 'iPadの壁紙を変更する方法は？',
    faqAnswer5: '詳細な壁紙変更手順については、Phoneの公式サポートページをご覧ください。',
    faqQuestion6: 'Macの壁紙をカスタマイズする方法は？',
    faqAnswer6: '詳細な壁紙カスタマイズ手順については、Phoneの公式サポートページをご覧ください。',
    faqQuestion7: 'Phoneデバイスのパラメータ情報を照会する方法は？',
    faqAnswer7: 'Phone製品パラメータセンター',
    
    // 用户认证相关
    login: 'ログイン',
    logout: 'ログアウト',
    loggingOut: 'ログアウト中...',
    username: 'ユーザー名',
    password: 'パスワード',
    rememberMe: 'ログイン状態を保持',
    loginButton: 'ログイン',
    loggingIn: 'ログイン中...',
    loginFailed: 'ログインに失敗しました',
    networkError: 'ネットワークエラーです。後でもう一度お試しください',
    returnHome: 'ホームに戻る',
    securityLogin: 'セキュアログインシステム',
    
    // 文件管理相关
    fileManagement: 'ファイル管理',
    databaseRecords: 'データベース記録',
    refresh: '更新',
    uploadFile: 'ファイルをアップロード',
    uploading: 'アップロード中...',
    uploadSuccess: 'アップロード成功',
    uploadFailed: 'アップロード失敗',
    delete: '削除',
    deleteConfirm: 'このファイルを削除してもよろしいですか？',
    deleteSuccess: '削除成功',
    deleteFailed: '削除失敗',
    copyPath: 'パスをコピー',
    pathCopied: 'パスがクリップボードにコピーされました',
    refreshUrl: 'URLを更新',
    urlRefreshed: 'URLが更新されました',
    privateLink: 'プライベートリンク',
    privateSpaceMode: 'プライベートスペースモード',
    folder: 'フォルダ',
    file: 'ファイル',
    rootDirectory: 'ルートディレクトリ',
    backToParent: '親に戻る',
    noFiles: 'ファイルなし',
    loadingFiles: '読み込み中...',
    fileSize: 'サイズ',
    fileType: 'タイプ',
    uploadTime: 'アップロード時間',
    operation: '操作',
    open: '開く',
    enterFolder: 'フォルダに入る',
    copyUrl: 'URLをコピー',
    refreshLink: 'リンクを更新',
    tag: 'タグ',
    enterTag: 'ファイルタグを入力...',
    syncToDatabase: 'データベースに同期',
    selectedFiles: '{count}個のファイルを選択',
    cancel: 'キャンセル',
    confirm: '確認',
    
    // 数据库相关
    databaseFileRecords: 'データベースファイル記録',
    syncedFiles: 'データベースに同期されたファイル',
    noDatabaseRecords: 'データベース記録なし',
    id: 'ID',
    fileName: 'ファイル名',
    path: 'パス',
    type: 'タイプ',
    createTime: '作成時間',
    
    // JSON预览相关
    jsonPreview: 'JSONデータプレビュー',
    export: 'エクスポート',
    exportJson: 'JSONをエクスポート',
    exportSuccess: 'JSONファイル{name}.jsonが正常にエクスポートされました！',
    exportFailed: 'エクスポート失敗',
    copy: 'コピー',
    copied: 'クリップボードにコピーされました',
    copyFailed: 'コピーに失敗しました。ブラウザの権限設定を確認してください',
    close: '閉じる',
    generating: '生成中...',
    categories: 'カテゴリ',
    files: 'ファイル',
    completeJsonData: '完全なJSONデータ',
    characters: '文字',
    noData: 'データなし',
    previewJson: 'JSONをプレビュー',
    exportJsonFile: 'JSONをエクスポート',
    
    // 壁纸预览相关
    downloadWallpaper: 'ダウンロード',
    downloading: 'ダウンロード中...',
    downloadFailed: 'ダウンロードに失敗しました。再試行してください',
    imageLoadFailed: '画像の読み込みに失敗しました',
    imageLoading: '読み込み中...',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
    resetZoom: 'リセット',
    errorDetails: 'エラー詳細',
    refreshImage: '画像を更新',
    downloadConfirm: 'HD壁紙をダウンロードしますか？',
    
    // 环境相关
    production: '本番環境',
    selectEnvironment: '環境を選択',
    environment: '環境',
    
    // 错误消息
    configurationError: '設定エラー',
    domainNotConfigured: 'ストレージドメインが設定されていません！',
    pleaseSetEnvVar: '環境変数を設定してください: {var}',
    example: '例: {var}=your-domain.r2.dev',
    unknownError: '不明なエラー',
    networkErrorRetry: 'ネットワークエラーです。後でもう一度お試しください',
    
    // 成功消息
    operationSuccess: '操作成功',
    fileUploaded: 'ファイルが正常にアップロードされました',
    fileDeleted: 'ファイルが正常に削除されました',
    
    // 数量相关
    count: '枚',
    pieces: 'シート',
    
    // 平台相关
    iphoneWallpapers: 'iPhone壁紙',
    ipadWallpapers: 'iPad壁紙',
    iosWallpapers: 'iOS壁紙',
    ipadosWallpapers: 'iPadOS壁紙',
    macWallpapers: 'Mac壁紙',
    macosWallpapers: 'macOS壁紙',
    wwdcWallpapers: 'WWDC 壁紙',
    noWallpaperData: 'このデバイスには壁紙データがありません',
    
    // 页脚链接
    aboutUs: '私たちについて',
    contactUs: 'お問い合わせ',
    
    // 语言切换
    switchToEnglish: '英語に切り替え',
    switchToChinese: '中国語に切り替え',
    switchToJapanese: '日本語に切り替え',
    switchToVietnamese: 'ベトナム語に切り替え',
    chinese: '中国語',
    chineseSimplified: '中文（简体）',
    chineseTraditional: '中文（繁体）',
    english: 'EN',
    japanese: 'JP',
    vietnamese: 'VI',
    
    // 用户相关
    user: 'ユーザー',
    
    // 404 页面
    pageNotFound: 'ページが見つかりません',
    pageNotFoundDescription: '申し訳ございませんが、お探しのページは存在しないか、削除されました。',
    backToHome: 'ホームに戻る',
    needHelp: 'お困りですか？',
    needHelpDescription: 'エラーだと思われる場合、またはサポートが必要な場合は、お問い合わせください：',
    notFoundBadge: 'ページ未検出',
    notFoundHeroTitle: 'この壁紙ページは現在利用できません。',
    notFoundHeroDescription: 'リンクが古い、名称変更された、または削除された可能性があります。以下の主要コレクションから iPhone、iPad、macOS、WWDC の壁紙を引き続き閲覧できます。',
    notFoundReportBrokenLink: 'リンク切れを報告',
    notFoundStatusLabel: '状態',
    notFoundStatusValue: '404 ページが見つかりません',
    notFoundSeoLabel: 'SEO',
    notFoundSeoValue: '正しい 404 と有効な内部リンクを維持',
    notFoundSupportLabel: 'サポート',
    notFoundQuickLinksTitle: '有効なコレクションページから再開',
    notFoundQuickLinksDescription: '古い URL が無効な場合でも、ユーザーと検索エンジンを適切な壁紙一覧へ戻すための入口です。',
    notFoundQuickLinkIphoneDescription: 'モデルと世代ごとに iPhone 壁紙を閲覧できます。',
    notFoundQuickLinkIpadDescription: '縦向き・横向きの iPad / iPadOS 壁紙を確認できます。',
    notFoundQuickLinkMacDescription: 'macOS、MacBook、iMac 向けのデスクトップ壁紙を探せます。',
    notFoundQuickLinkWwdcDescription: 'WWDC のイベントビジュアルと壁紙アーカイブを開きます。',
    notFoundFooterNote: 'PhWalls は iPhone、iPad、macOS、WWDC の壁紙ランディングページを整理しています。古いリンクが切れている場合は、すべてをホームへ転送するのではなく、上の有効なカテゴリーページをご利用ください。',
    
    // 关于页面
    ourMission: '私たちの使命',
    qualityAssurance: '品質保証',
    contactDescription: 'ご質問、ご提案、または著作権に関する問題がございましたら、お気軽にお問い合わせください：',
    aboutDescription: 'Phone Wallpaperについて詳しく学び、ご質問にお答えします',
    missionDescription: '私たちはPhoneユーザーに最新で最高品質の内蔵壁紙を提供することにコミットしています。慎重な収集と整理を通じて、すべてのユーザーが公式ネイティブ壁紙に簡単にアクセスできるようにし、デバイスにより多くの個性化オプションを追加します。',
    qualityDescription: 'すべての壁紙はPhone公式ネイティブ壁紙で、最高品質と最も本格的な体験を保証します',
    missionDescription2: '良い壁紙はデバイスを美化するだけでなく、あなたの個性と趣味を反映すると信じています。そのため、公式ネイティブの高品質壁紙のみを提供し、それぞれが慎重に選ばれていることを保証しています。',
    aboutTitle: 'PhWallsについて',
    aboutSubtitle: 'PhWalls は iPhone、iPad、Mac の内蔵 HD 壁紙を整理・配布し、iOS と macOS 各バージョンの壁紙コレクションを網羅。デバイスとシステム別に分類して、見つけやすく保存しやすい。',
    aboutHeroTagline: 'Phone 純正壁紙アーカイブ',
    aboutResourceTitle: 'デバイスとOSバージョンで素早く検索',
    aboutResourceDesc: 'iPhone・iPad・Mac・WWDC を体系的に分類し、検索とダウンロードを効率化します。',
    aboutIphoneDesc: '歴代 iPhone / iOS 純正壁紙を高画質で提供。',
    aboutIpadDesc: 'iPad と iPadOS の壁紙コレクション。',
    aboutMacDesc: 'macOS と Mac の標準壁紙を世代別に整理。',
    aboutWwdcDesc: 'WWDC 公式テーマ壁紙コレクション。',
    aboutTrustTitle: 'PhWalls の特長',
    aboutTrustDesc: '純正リソースを継続的に整理し、高解像度で安定配信します。',
    aboutSupportTitle: 'Phone 公式サポート',
    aboutSupportDesc: '壁紙の設定方法は Phone 公式ガイドをご確認ください。',
    aboutContactTitle: 'お問い合わせ',
    aboutContactDesc: '不足リソース、誤記、著作権関連のご連絡を受け付けています。',
    systemNative: 'システムネイティブ',
    hdWatermarkFree: 'HD透かしなし',
    regularUpdates: '定期的な更新',
    faqTitle: 'よくある質問',
    faqSubtitle: 'ご質問にお答えします',
    howToSupport: 'サポート方法は？',
    howToSupportAnswer: '私たちのサービスがお気に入りの場合は、より多くの友人と共有するか、ソーシャルメディアでフォローしてください。あなたのサポートが私たちの継続的な改善の原動力です！',
    howToContact: 'お問い合わせ方法は？',
    howToContactAnswer: 'ご質問、ご提案、または著作権に関する問題がございましたら、お気軽にお問い合わせください：',
    qqGroup: 'QQグループ：963594743',
    copyrightNotice: '著作権に関するお知らせ',
    copyrightText1: '掲載されている壁紙の著作権は各権利者に帰属します。PhWalls は独立したアーカイブで、Phone Inc. とは提携していません。',
    copyrightText2: '著作権に関するご連絡は fenggit@163.com までお願いします。迅速に対応します。',
    homeButton: 'ホーム',
    preloadingImages: '読み込み中...',
    enterUsername: 'ユーザー名を入力',
    enterPassword: 'パスワードを入力',
    letsGo: '始めましょう',
    
    // Custom Wallpaper 页面
    customWallpaper: 'カスタム壁紙',
    home: 'ホーム',
    presetGradients: 'プリセットグラデーション',
    customColor: 'カスタムカラー',
    backgroundColor: '背景色',
    appleLogo: 'Phoneロゴ',
    color: '色',
    size: 'サイズ',
    position: '位置',
    horizontal: '水平',
    vertical: '垂直',
    iphone: 'iPhone',
    ipad: 'iPad',
    imac: 'iMac',
    
    // Custom Wallpaper SEO
    customWallpaperTitle: 'カスタム壁紙メーカー - iPhone iPad iMac 壁紙をオンラインでデザイン | PhWalls',
    customWallpaperDescription: 'iPhone、iPad、iMac用の無料オンラインカスタム壁紙メーカー。プリセットグラデーションまたはカスタムカラーを選択し、Phoneロゴを追加、HD壁紙を即座にダウンロード。デバイス専用のユニークな壁紙を作成。',
    customWallpaperKeywords: 'カスタム壁紙,壁紙メーカー,iPhone壁紙,iPad壁紙,iMac壁紙,オンライン壁紙デザイン,Phone壁紙,グラデーション壁紙,壁紙ダウンロード,無料壁紙ツール',
    createYourWallpaper: 'カスタム壁紙を作成',
    downloadYourDesign: 'デザインをダウンロード',
    mainNavigationLabel: 'メインナビゲーション',
    wallpaperPreviewLabel: '壁紙プレビュー',
    wallpaperCustomizationControlsLabel: '壁紙カスタマイズ操作',
    
    // 设备页面
    released: 'リリース日',
    wallpapersTitleSuffix: '壁紙',
    wallpapers: '壁紙',
    allWallpapers: 'すべての壁紙',
    phoneWallpapersGroupTitle: 'iPhone 壁紙',
    ipadPortraitWallpapersGroupTitle: 'iPad 壁紙',
    ipadLandscapeWallpapersGroupTitle: 'iPad 壁紙',
    desktopWallpapersGroupTitle: 'Mac 壁紙',
    watchWallpapersGroupTitle: 'Phone Watch 壁紙',
    hdFreeLabel: 'HD 原画',
    backToTopLabel: 'トップへ戻る',
    multiResolutionPageDescription: '{pageTitle} を複数の解像度でまとめ、デバイス別にプレビューとダウンロードできます。',
    wallpaperAltSuffix: '壁紙',
    newYearLabel: '新年',
    collectionDescriptionTemplate: '{collectionName} の {categoryLabel} 壁紙を {count} 枚まとめて確認できます。高解像度でダウンロード可能。',
    
    // Phone 支持链接
    appleOfficialSupport: 'Phone 公式サポート',
    
    // 隐私政策相关
    privacyPolicyTitle: 'プライバシーポリシー',
    privacyPolicySubtitle: '私たちはあなたのプライバシーを大切にします。このポリシーでは、個人情報の収集、使用、保護の方法について詳しく説明します。',
    privacyPolicyLastUpdated: '2025年1月15日',
    lastUpdated: '最終更新',
    privacySection1Title: '1. 情報収集',
    privacySection1Content1: '以下の種類の情報を収集します：',
    privacySection1Item1: 'デバイス情報：デバイスモデル、オペレーティングシステムバージョン、ブラウザタイプ',
    privacySection1Item2: '使用情報：訪問ページ、滞在時間、クリック行動',
    privacySection1Item3: '技術情報：IPアドレス、Cookie、デバイス識別子',
    privacySection1Item4: '連絡先情報：お問い合わせ時に提供されたメールアドレス',
    privacySection2Title: '2. 情報使用',
    privacySection2Content1: '収集した情報を以下の目的で使用します：',
    privacySection2Item1: 'サービスの提供と改善',
    privacySection2Item2: 'ユーザー体験の最適化のためのウェブサイト使用分析',
    privacySection2Item3: '関連広告コンテンツの表示',
    privacySection2Item4: 'お客様とのコミュニケーションとカスタマーサポートの提供',
    privacySection3Title: '3. 情報保護',
    privacySection3Content1: '個人情報を保護するため、適切な技術的・組織的措置を実施します：',
    privacySection3Item1: 'データ送信にHTTPS暗号化を使用',
    privacySection3Item2: 'セキュリティ対策とシステムの定期的な更新',
    privacySection3Item3: '従業員の個人情報へのアクセス制限',
    privacySection4Title: '4. Cookie使用',
    privacySection4Content1: 'ブラウジング体験を向上させるため、Cookieと類似技術を使用します。Cookieはデバイスに保存される小さなテキストファイルです。',
    privacySection4Content2: 'ブラウザ設定でCookieの使用を制御できますが、Cookieを無効にするとウェブサイトの機能に影響する場合があります。',
    privacySection5Title: '5. 第三者サービス',
    privacySection5Content1: '以下の第三者サービスを使用しており、それぞれ独自のプライバシーポリシーがあります：',
    privacySection5Subtitle: '使用している第三者サービスには以下が含まれます：',
    privacyServiceGoogleAnalytics: 'Google Analytics - サイト分析',
    privacyServiceCloudflare: 'Cloudflare - CDNとセキュリティ',
    privacySection6Title: '6. ユーザー権利',
    privacySection6Content1: '適用されるデータ保護法に基づき、以下の権利があります：',
    privacySection6Item1: '個人情報へのアクセス',
    privacySection6Item2: '不正確な情報の訂正',
    privacySection6Item3: '個人情報の削除',
    privacySection6Item4: '情報処理の制限または異議申し立て',
    privacySection7Title: '7. お問い合わせ',
    privacySection7Content1: 'このプライバシーポリシーについてご質問がある場合や権利を行使したい場合は、以下までご連絡ください：',
    contactEmail: '連絡先メール',
    privacySection8Title: '8. ポリシー更新',
    privacySection8Content1: 'このプライバシーポリシーを随時更新する場合があります。重要な変更はウェブサイトでお知らせします。',
    privacySection8Content2: '情報の保護方法を理解するため、定期的にこのポリシーをご確認することをお勧めします。',
    privacyPolicyFooter: 'このプライバシーポリシーは公開日から有効です。',
    privacyPolicy: 'プライバシーポリシー',
    
    // 微信二维码相关
    scanWechatQR: 'ミニプログラム',
    miniProgram: 'ミニプログラム',
    
    // 壁纸大小调整相关
    wallpaperSize: '壁紙サイズ',
    originalSize: 'オリジナルサイズ',
    customSize: 'カスタムサイズ',
    width: '幅',
    height: '高さ',
    maintainAspectRatio: 'アスペクト比を維持',
    resetSize: 'サイズをリセット',
    currentSize: '現在のサイズ'
  },
  vi: {
    siteName: 'PhWalls',
    heroTitle: 'Hình nền Phone',
    heroDescription: 'Khám phá bộ sưu tập hình nền tích hợp mới nhất từ các thương hiệu như Samsung, Xiaomi, Vivo, OPPO, Huawei, Honor, OnePlus và Google Pixel. Tải miễn phí hình nền HD không watermark.',
    loading: 'Đang tải...',
    exploreButton: 'Bắt đầu khám phá',
    learnMore: 'Tìm hiểu thêm',
    about: 'Giới thiệu',
    download: 'Tải xuống',
    preview: 'Xem trước',
    viewAllWallpapers: 'Xem tất cả hình nền',
    hdWallpaperDownloadAlt: 'Tải hình nền HD',
    breadcrumbNavigationLabel: 'Điều hướng breadcrumb',
    updatedLabel: 'Cập nhật',
    autoCloseSuffix: 'giây nữa sẽ tự động đóng',
    footerDescription: 'Thư viện hình nền hệ điều hành gốc cho iPhone, iPad và Mac qua mọi thế hệ. Tải xuống hình nền tích hợp 4K/5K/6K siêu nét, bao phủ đầy đủ iOS, iPadOS và macOS, giúp thiết bị tái hiện chuẩn thẩm mỹ nguyên bản của Phone.',
    copyright: '© 2025 PhWalls. Bảo lưu mọi quyền.',
    trademarkDisclaimer: 'Phone, iPhone, iPad, Mac, iOS và macOS là các nhãn hiệu của Phone Inc. Trang web này độc lập và không liên kết hay được Phone chứng thực.',
    noWallpapers: 'Không có hình nền',
    noWallpapersDescription: 'Chúng tôi đang nỗ lực thêm nhiều hình nền đẹp hơn, vui lòng quay lại sau.',
    faqQuestion2: 'Hình nền đã tải xuống có watermark không?',
    faqAnswer2: 'Không, tất cả hình nền được cung cấp đều là hình ảnh gốc chất lượng cao không có watermark.',
    faqQuestion3: 'Hình nền sẽ được cập nhật thường xuyên không?',
    faqAnswer3: 'Có, chúng tôi sẽ nhanh chóng thu thập hình nền mới nhất mỗi khi Phone phát hành hệ thống mới. Nếu bạn có tài nguyên mới nhất, bạn cũng có thể gửi chúng đến fenggit@163.com.',
    faqQuestion4: 'Làm thế nào để thay đổi hình nền iPhone?',
    faqAnswer4: 'Vui lòng truy cập trang hỗ trợ chính thức của Phone để biết hướng dẫn chi tiết về cách thay đổi hình nền.',
    faqQuestion5: 'Làm thế nào để thay đổi hình nền trên iPad?',
    faqAnswer5: 'Vui lòng truy cập trang hỗ trợ chính thức của Phone để biết hướng dẫn chi tiết về cách thay đổi hình nền.',
    faqQuestion6: 'Làm thế nào để tùy chỉnh hình nền trên Mac?',
    faqAnswer6: 'Vui lòng truy cập trang hỗ trợ chính thức của Phone để biết hướng dẫn chi tiết về cách tùy chỉnh hình nền.',
    faqQuestion7: 'Làm thế nào để tra cứu thông tin tham số thiết bị Phone?',
    faqAnswer7: 'Trung tâm tham số sản phẩm Phone',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    loggingOut: 'Đang đăng xuất...',
    username: 'Tên người dùng',
    password: 'Mật khẩu',
    rememberMe: 'Ghi nhớ đăng nhập',
    loginButton: 'Đăng nhập',
    loggingIn: 'Đang đăng nhập...',
    loginFailed: 'Đăng nhập thất bại',
    networkError: 'Lỗi mạng, vui lòng thử lại sau',
    returnHome: 'Về trang chủ',
    securityLogin: 'Hệ thống đăng nhập an toàn',
    fileManagement: 'Quản lý tệp',
    databaseRecords: 'Bản ghi cơ sở dữ liệu',
    refresh: 'Làm mới',
    uploadFile: 'Tải tệp lên',
    uploading: 'Đang tải lên...',
    uploadSuccess: 'Tải lên thành công',
    uploadFailed: 'Tải lên thất bại',
    delete: 'Xóa',
    deleteConfirm: 'Bạn có chắc chắn muốn xóa tệp này không?',
    deleteSuccess: 'Xóa thành công',
    deleteFailed: 'Xóa thất bại',
    copyPath: 'Sao chép đường dẫn',
    pathCopied: 'Đường dẫn đã được sao chép vào clipboard',
    refreshUrl: 'Làm mới URL',
    urlRefreshed: 'URL đã được làm mới',
    privateLink: 'Liên kết riêng tư',
    privateSpaceMode: 'Chế độ không gian riêng tư',
    folder: 'Thư mục',
    file: 'Tệp',
    rootDirectory: 'Thư mục gốc',
    backToParent: 'Quay lại thư mục cha',
    noFiles: 'Không có tệp',
    loadingFiles: 'Đang tải...',
    fileSize: 'Kích thước',
    fileType: 'Loại',
    uploadTime: 'Thời gian tải lên',
    operation: 'Thao tác',
    open: 'Mở',
    enterFolder: 'Vào thư mục',
    copyUrl: 'Sao chép URL',
    refreshLink: 'Làm mới liên kết',
    tag: 'Nhãn',
    enterTag: 'Nhập nhãn tệp...',
    syncToDatabase: 'Đồng bộ với cơ sở dữ liệu',
    selectedFiles: 'Đã chọn {count} tệp',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    databaseFileRecords: 'Bản ghi tệp cơ sở dữ liệu',
    syncedFiles: 'Tệp đã đồng bộ với cơ sở dữ liệu',
    noDatabaseRecords: 'Không có bản ghi cơ sở dữ liệu',
    id: 'ID',
    fileName: 'Tên tệp',
    path: 'Đường dẫn',
    type: 'Loại',
    createTime: 'Thời gian tạo',
    jsonPreview: 'Xem trước dữ liệu JSON',
    export: 'Xuất',
    exportJson: 'Xuất JSON',
    exportSuccess: 'Tệp JSON {name}.json đã được xuất thành công!',
    exportFailed: 'Xuất thất bại',
    copy: 'Sao chép',
    copied: 'Đã sao chép vào clipboard',
    copyFailed: 'Sao chép thất bại, vui lòng kiểm tra quyền trình duyệt',
    close: 'Đóng',
    generating: 'Đang tạo...',
    categories: 'danh mục',
    files: 'tệp',
    completeJsonData: 'Dữ liệu JSON đầy đủ',
    characters: 'ký tự',
    noData: 'Không có dữ liệu',
    previewJson: 'Xem trước JSON',
    exportJsonFile: 'Xuất JSON',
    downloadWallpaper: 'Tải xuống',
    downloading: 'Đang tải xuống...',
    downloadFailed: 'Tải xuống thất bại, vui lòng thử lại',
    imageLoadFailed: 'Tải hình ảnh thất bại',
    imageLoading: 'Đang tải...',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    resetZoom: 'Đặt lại',
    errorDetails: 'Chi tiết lỗi',
    refreshImage: 'Làm mới hình ảnh',
    downloadConfirm: 'Tải xuống hình nền HD?',
    production: 'Sản xuất',
    selectEnvironment: 'Chọn môi trường',
    environment: 'Môi trường',
    configurationError: 'Lỗi cấu hình',
    domainNotConfigured: 'Tên miền lưu trữ chưa được cấu hình!',
    pleaseSetEnvVar: 'Vui lòng đặt biến môi trường: {var}',
    example: 'Ví dụ: {var}=your-domain.r2.dev',
    unknownError: 'Lỗi không xác định',
    networkErrorRetry: 'Lỗi mạng, vui lòng thử lại sau',
    operationSuccess: 'Thao tác thành công',
    fileUploaded: 'Tệp đã được tải lên thành công',
    fileDeleted: 'Tệp đã được xóa thành công',
    count: 'tờ',
    pieces: 'tờ',
    iphoneWallpapers: 'Hình nền iPhone',
    ipadWallpapers: 'Hình nền iPad',
    iosWallpapers: 'Hình nền iOS',
    ipadosWallpapers: 'Hình nền iPadOS',
    macWallpapers: 'Hình nền Mac',
    macosWallpapers: 'Hình nền macOS',
    wwdcWallpapers: 'Hình nền WWDC',
    noWallpaperData: 'Không có dữ liệu hình nền cho thiết bị này',
    aboutUs: 'Về chúng tôi',
    contactUs: 'Liên hệ',
    switchToEnglish: 'Chuyển sang tiếng Anh',
    switchToChinese: 'Chuyển sang tiếng Trung',
    switchToJapanese: 'Chuyển sang tiếng Nhật',
    switchToVietnamese: 'Chuyển sang tiếng Việt',
    chinese: 'Tiếng Trung',
    chineseSimplified: '中文（简体）',
    chineseTraditional: '中文（繁体）',
    english: 'EN',
    japanese: 'JP',
    vietnamese: 'VI',
    user: 'Người dùng',
    
    // 404 页面
    pageNotFound: 'Không tìm thấy trang',
    pageNotFoundDescription: 'Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.',
    backToHome: 'Về trang chủ',
    needHelp: 'Cần trợ giúp?',
    needHelpDescription: 'Nếu bạn nghĩ đây là lỗi hoặc cần trợ giúp, vui lòng liên hệ với chúng tôi:',
    notFoundBadge: 'Trang không tồn tại',
    notFoundHeroTitle: 'Trang hình nền này hiện không còn khả dụng.',
    notFoundHeroDescription: 'Liên kết có thể đã cũ, bị đổi tên hoặc bị xóa. Bạn vẫn có thể tiếp tục khám phá các bộ sưu tập iPhone, iPad, macOS và WWDC từ những trang danh mục chính bên dưới.',
    notFoundReportBrokenLink: 'Báo liên kết lỗi',
    notFoundStatusLabel: 'Trạng thái',
    notFoundStatusValue: '404 Không tìm thấy trang',
    notFoundSeoLabel: 'SEO',
    notFoundSeoValue: 'Giữ 404 chuẩn cùng các liên kết khôi phục nội bộ',
    notFoundSupportLabel: 'Hỗ trợ',
    notFoundQuickLinksTitle: 'Tiếp tục từ trang bộ sưu tập hợp lệ',
    notFoundQuickLinksDescription: 'Đây là các điểm quay lại tốt nhất cho cả người dùng và công cụ tìm kiếm khi một URL cũ không còn hợp lệ.',
    notFoundQuickLinkIphoneDescription: 'Duyệt bộ sưu tập hình nền iPhone theo từng dòng máy và thế hệ.',
    notFoundQuickLinkIpadDescription: 'Khám phá hình nền iPad và iPadOS cho cả màn hình dọc và ngang.',
    notFoundQuickLinkMacDescription: 'Tìm hình nền desktop cho macOS, MacBook và iMac.',
    notFoundQuickLinkWwdcDescription: 'Mở kho hình nền sự kiện và keynote từ các kỳ WWDC.',
    notFoundFooterNote: 'PhWalls tổng hợp các trang đích hình nền cho iPhone, iPad, macOS và WWDC. Khi một liên kết cũ bị lỗi, hãy dùng các trang danh mục đã xác thực phía trên thay vì chuyển mọi trang 404 về trang chủ.',
    
    ourMission: 'Sứ mệnh của chúng tôi',
    qualityAssurance: 'Đảm bảo chất lượng',
    contactDescription: 'Nếu bạn có bất kỳ câu hỏi, đề xuất hoặc phát hiện vấn đề bản quyền nào, vui lòng liên hệ với chúng tôi:',
    aboutDescription: 'Tìm hiểu thêm về Phone Wallpaper và nhận câu trả lời cho câu hỏi của bạn',
    missionDescription: 'Chúng tôi cam kết cung cấp cho người dùng Phone những hình nền tích hợp sẵn mới nhất và chất lượng cao nhất. Thông qua việc thu thập và tổ chức cẩn thận, chúng tôi giúp mọi người dùng dễ dàng truy cập hình nền gốc chính thức, thêm nhiều lựa chọn cá nhân hóa cho thiết bị của bạn.',
    qualityDescription: 'Tất cả hình nền đều là hình nền gốc chính thức của Phone, đảm bảo chất lượng cao nhất và trải nghiệm chân thực nhất',
    missionDescription2: 'Chúng tôi tin rằng hình nền đẹp không chỉ làm đẹp thiết bị của bạn mà còn phản ánh tính cách và sở thích của bạn. Do đó, chúng tôi chỉ cung cấp hình nền gốc chính thức chất lượng cao, đảm bảo mỗi hình đều được lựa chọn cẩn thận.',
    aboutTitle: 'Về PhWalls',
    aboutSubtitle: 'PhWalls cung cấp việc tổng hợp và tải hình nền HD tích hợp cho iPhone, iPad và Mac, bao gồm bộ sưu tập theo từng phiên bản iOS và macOS. Được phân loại theo thiết bị và hệ điều hành để dễ tìm và lưu.',
    aboutHeroTagline: 'Kho Hinh Nen Goc Phone',
    aboutResourceTitle: 'Duyệt nhanh theo thiết bị và phiên bản OS',
    aboutResourceDesc: 'Bộ sưu tập được phân loại cho iPhone, iPad, Mac và WWDC giúp tìm kiếm nhanh hơn.',
    aboutIphoneDesc: 'Hình nền iOS gốc cho mọi thế hệ iPhone.',
    aboutIpadDesc: 'Thư viện đầy đủ hình nền iPad và iPadOS.',
    aboutMacDesc: 'Kho hình nền mặc định macOS và Mac theo từng phiên bản.',
    aboutWwdcDesc: 'Bộ hình nền chính thức từ các kỳ WWDC.',
    aboutTrustTitle: 'Vì sao chọn PhWalls',
    aboutTrustDesc: 'Chúng tôi tập hợp tài nguyên gốc, phân loại rõ ràng và tải xuống độ phân giải cao.',
    aboutSupportTitle: 'Liên kết hỗ trợ chính thức',
    aboutSupportDesc: 'Bạn có thể xem hướng dẫn từ Phone để cài đặt hình nền trên thiết bị.',
    aboutContactTitle: 'Liên hệ và phản hồi',
    aboutContactDesc: 'Gửi bổ sung dữ liệu, sửa lỗi phiên bản hoặc phản hồi bản quyền để chúng tôi xử lý.',
    systemNative: 'Hình nền gốc hệ thống',
    hdWatermarkFree: 'HD không có watermark',
    regularUpdates: 'Cập nhật thường xuyên',
    faqTitle: 'Câu hỏi thường gặp',
    faqSubtitle: 'Câu trả lời cho câu hỏi của bạn',
    howToSupport: 'Làm thế nào để hỗ trợ chúng tôi?',
    howToSupportAnswer: 'Nếu bạn thích dịch vụ của chúng tôi, vui lòng chia sẻ với nhiều bạn bè hơn hoặc theo dõi chúng tôi trên mạng xã hội. Sự hỗ trợ của bạn là động lực để chúng tôi tiếp tục cải thiện!',
    howToContact: 'Làm thế nào để liên hệ với chúng tôi?',
    howToContactAnswer: 'Nếu bạn có bất kỳ câu hỏi, đề xuất hoặc phát hiện vấn đề bản quyền nào, vui lòng liên hệ với chúng tôi:',
    qqGroup: 'Nhóm QQ: 963594743',
    copyrightNotice: 'Thông báo bản quyền',
    copyrightText1: 'Bản quyền hình nền thuộc về các chủ sở hữu tương ứng. PhWalls là kho lưu trữ độc lập và không liên kết với Phone Inc.',
    copyrightText2: 'Nếu có vấn đề bản quyền, vui lòng liên hệ fenggit@163.com, chúng tôi sẽ xử lý kịp thời.',
    homeButton: 'Trang chủ',
    preloadingImages: 'Đang tải...',
    enterUsername: 'Nhập tên người dùng',
    enterPassword: 'Nhập mật khẩu',
    letsGo: 'Bắt đầu',
    
    // Custom Wallpaper 页面
    customWallpaper: 'Hình nền tùy chỉnh',
    home: 'Trang chủ',
    presetGradients: 'Gradient có sẵn',
    customColor: 'Màu tùy chỉnh',
    backgroundColor: 'Màu nền',
    appleLogo: 'Logo Phone',
    color: 'Màu',
    size: 'Kích thước',
    position: 'Vị trí',
    horizontal: 'Ngang',
    vertical: 'Dọc',
    iphone: 'iPhone',
    ipad: 'iPad',
    imac: 'iMac',
    
    // Custom Wallpaper SEO
    customWallpaperTitle: 'Công cụ tạo hình nền tùy chỉnh - Thiết kế hình nền iPhone iPad iMac trực tuyến | PhWalls',
    customWallpaperDescription: 'Công cụ tạo hình nền tùy chỉnh miễn phí trực tuyến cho iPhone, iPad và iMac. Chọn gradient có sẵn hoặc màu tùy chỉnh, thêm logo Phone, tải xuống hình nền HD ngay lập tức. Tạo hình nền độc đáo cho thiết bị của bạn.',
    customWallpaperKeywords: 'hình nền tùy chỉnh,công cụ tạo hình nền,hình nền iPhone,hình nền iPad,hình nền iMac,thiết kế hình nền trực tuyến,hình nền Phone,hình nền gradient,tải xuống hình nền,công cụ miễn phí',
    createYourWallpaper: 'Tạo hình nền tùy chỉnh của bạn',
    downloadYourDesign: 'Tải xuống thiết kế của bạn',
    mainNavigationLabel: 'Điều hướng chính',
    wallpaperPreviewLabel: 'Xem trước hình nền',
    wallpaperCustomizationControlsLabel: 'Bảng điều khiển tùy chỉnh hình nền',
    
    // 设备页面
    released: 'Ngày phát hành',
    wallpapersTitleSuffix: 'Hình nền',
    wallpapers: 'Hình nền',
    allWallpapers: 'Tất cả hình nền',
    phoneWallpapersGroupTitle: 'Hình nền iPhone',
    ipadPortraitWallpapersGroupTitle: 'Hình nền iPad',
    ipadLandscapeWallpapersGroupTitle: 'Hình nền iPad',
    desktopWallpapersGroupTitle: 'Hình nền Mac',
    watchWallpapersGroupTitle: 'Hình nền Phone Watch',
    hdFreeLabel: 'HD gốc',
    backToTopLabel: 'Quay lại đầu trang',
    multiResolutionPageDescription: 'Xem {pageTitle} với nhiều độ phân giải, được phân loại theo từng thiết bị để xem trước và tải xuống.',
    wallpaperAltSuffix: 'hình nền',
    newYearLabel: 'Năm Mới',
    collectionDescriptionTemplate: 'Xem {count} hình nền {categoryLabel} trong bộ sưu tập {collectionName}, tải bản gốc độ phân giải cao.',
    
    // Phone 支持链接
    appleOfficialSupport: 'Hỗ trợ chính thức của Phone',
    
    // 隐私政策相关
    privacyPolicyTitle: 'Chính sách bảo mật',
    privacyPolicySubtitle: 'Chúng tôi coi trọng quyền riêng tư của bạn. Chính sách này mô tả chi tiết cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
    privacyPolicyLastUpdated: '15 tháng 1, 2025',
    lastUpdated: 'Cập nhật lần cuối',
    privacySection1Title: '1. Thu thập thông tin',
    privacySection1Content1: 'Chúng tôi thu thập các loại thông tin sau:',
    privacySection1Item1: 'Thông tin thiết bị: Model thiết bị, phiên bản hệ điều hành, loại trình duyệt',
    privacySection1Item2: 'Thông tin sử dụng: Trang đã truy cập, thời gian sử dụng, hành vi nhấp chuột',
    privacySection1Item3: 'Thông tin kỹ thuật: Địa chỉ IP, cookie, định danh thiết bị',
    privacySection1Item4: 'Thông tin liên hệ: Địa chỉ email khi bạn liên hệ với chúng tôi',
    privacySection2Title: '2. Sử dụng thông tin',
    privacySection2Content1: 'Chúng tôi sử dụng thông tin đã thu thập cho các mục đích sau:',
    privacySection2Item1: 'Cung cấp và cải thiện dịch vụ của chúng tôi',
    privacySection2Item2: 'Phân tích việc sử dụng trang web để tối ưu hóa trải nghiệm người dùng',
    privacySection2Item3: 'Hiển thị nội dung quảng cáo liên quan',
    privacySection2Item4: 'Giao tiếp với bạn và cung cấp hỗ trợ khách hàng',
    privacySection3Title: '3. Bảo vệ thông tin',
    privacySection3Content1: 'Chúng tôi thực hiện các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn:',
    privacySection3Item1: 'Sử dụng mã hóa HTTPS để truyền dữ liệu',
    privacySection3Item2: 'Cập nhật thường xuyên các biện pháp bảo mật và hệ thống',
    privacySection3Item3: 'Hạn chế quyền truy cập của nhân viên vào thông tin cá nhân',
    privacySection4Title: '4. Sử dụng Cookie',
    privacySection4Content1: 'Chúng tôi sử dụng cookie và các công nghệ tương tự để cải thiện trải nghiệm duyệt web của bạn. Cookie là các tệp văn bản nhỏ được lưu trữ trên thiết bị của bạn.',
    privacySection4Content2: 'Bạn có thể kiểm soát việc sử dụng cookie thông qua cài đặt trình duyệt, nhưng vô hiệu hóa cookie có thể ảnh hưởng đến chức năng trang web.',
    privacySection5Title: '5. Dịch vụ bên thứ ba',
    privacySection5Content1: 'Chúng tôi sử dụng các dịch vụ bên thứ ba sau, có thể có chính sách bảo mật riêng:',
    privacySection5Subtitle: 'Các dịch vụ bên thứ ba chúng tôi sử dụng bao gồm:',
    privacyServiceGoogleAnalytics: 'Google Analytics - Phân tích trang web',
    privacyServiceCloudflare: 'Cloudflare - CDN và bảo mật',
    privacySection6Title: '6. Quyền người dùng',
    privacySection6Content1: 'Theo luật bảo vệ dữ liệu hiện hành, bạn có các quyền sau:',
    privacySection6Item1: 'Truy cập thông tin cá nhân của bạn',
    privacySection6Item2: 'Sửa thông tin không chính xác',
    privacySection6Item3: 'Xóa thông tin cá nhân của bạn',
    privacySection6Item4: 'Hạn chế hoặc phản đối việc xử lý thông tin của bạn',
    privacySection7Title: '7. Liên hệ với chúng tôi',
    privacySection7Content1: 'Nếu bạn có câu hỏi về chính sách bảo mật này hoặc muốn thực hiện quyền của mình, vui lòng liên hệ với chúng tôi:',
    contactEmail: 'Email liên hệ',
    privacySection8Title: '8. Cập nhật chính sách',
    privacySection8Content1: 'Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi quan trọng sẽ được thông báo trên trang web.',
    privacySection8Content2: 'Chúng tôi khuyên bạn nên xem lại chính sách này thường xuyên để hiểu cách chúng tôi bảo vệ thông tin của bạn.',
    privacyPolicyFooter: 'Chính sách bảo mật này có hiệu lực từ ngày xuất bản.',
    privacyPolicy: 'Chính sách bảo mật',
    
    // 微信二维码相关
    scanWechatQR: 'Chương trình nhỏ',
    miniProgram: 'Chương trình nhỏ',
    
    // 壁纸大小调整相关
    wallpaperSize: 'Kích thước hình nền',
    originalSize: 'Kích thước gốc',
    customSize: 'Kích thước tùy chỉnh',
    width: 'Chiều rộng',
    height: 'Chiều cao',
    maintainAspectRatio: 'Duy trì tỷ lệ khung hình',
    resetSize: 'Đặt lại kích thước',
    currentSize: 'Kích thước hiện tại'
  },
  'zh-hant': {
    siteName: 'PhWalls',
    heroTitle: 'Phone Wallpaper',
    heroDescription: '獲取手機品牌設備最新內建壁紙合集，涵蓋 Samsung、Xiaomi、Vivo、OPPO、Huawei、Honor、OnePlus、Google Pixel 等品牌，支援高清無浮水印下載。',
    loading: '載入中...',
    exploreButton: '開始探索',
    learnMore: '了解更多',
    about: '關於',
    download: '下載',
    preview: '預覽',
    viewAllWallpapers: '查看全部壁紙',
    hdWallpaperDownloadAlt: '高清壁紙 下載',
    breadcrumbNavigationLabel: '麵包屑導航',
    updatedLabel: '更新',
    autoCloseSuffix: '秒後自動關閉',
    footerDescription: '歷代 iPhone、iPad 與 Mac 系統原廠桌布資料庫。提供 4K/5K/6K 超高畫質內建背景下載，涵蓋 iOS、iPadOS 與 macOS 全系列版本資源，讓您的裝置重現原生視覺美學。',
    copyright: '© 2025 PhWalls. 保留所有權利。',
    trademarkDisclaimer: 'Phone、iPhone、iPad、Mac、iOS、macOS 為 Phone Inc. 的商標。本網站為獨立專案，與 Phone Inc. 無關聯或認可。',
    noWallpapers: '暫無壁紙',
    noWallpapersDescription: '我們正在努力新增更多精美的壁紙，請稍後再來檢視。',
    faqQuestion2: '下載的壁紙有浮水印嗎？',
    faqAnswer2: '沒有，提供的都是高清無浮水印原圖。',
    faqQuestion3: '壁紙會定期更新嗎？',
    faqAnswer3: '會，每次手機品牌發布新系統，我們都會及時收錄最新壁紙。如果您有最新資源，也可以投稿到fenggit@163.com。',
    faqQuestion4: '如何更換iPhone壁紙？',
    faqAnswer4: '請存取Phone官方支援頁面了解詳細的壁紙更換步驟。',
    faqQuestion5: '如何更換iPad壁紙？',
    faqAnswer5: '請存取Phone官方支援頁面了解詳細的壁紙更換步驟。',
    faqQuestion6: '如何自訂Mac壁紙？',
    faqAnswer6: '請存取Phone官方支援頁面了解詳細的壁紙自訂步驟。',
    faqQuestion7: '如何查詢 Phone 設備參數資訊？',
    faqAnswer7: 'Phone 手機品牌產品參數中心',
    
    // 用户认证相关
    login: '登入',
    logout: '登出',
    loggingOut: '登出中...',
    username: '使用者名稱',
    password: '密碼',
    rememberMe: '記住登入',
    loginButton: '登入',
    loggingIn: '登入中...',
    loginFailed: '登入失敗',
    networkError: '網路錯誤，請稍後重試',
    returnHome: '返回首頁',
    securityLogin: '安全登入系統',
    
    // 文件管理相关
    fileManagement: '檔案管理',
    databaseRecords: '資料庫記錄',
    refresh: '重新整理',
    uploadFile: '上傳檔案',
    uploading: '上傳中...',
    uploadSuccess: '上傳成功',
    uploadFailed: '上傳失敗',
    delete: '刪除',
    deleteConfirm: '確定要刪除這個檔案嗎？',
    deleteSuccess: '刪除成功',
    deleteFailed: '刪除失敗',
    copyPath: '複製路徑',
    pathCopied: '路徑已複製到剪貼簿',
    refreshUrl: '重新整理連結',
    urlRefreshed: 'URL已重新整理',
    privateLink: '私有連結',
    privateSpaceMode: '私有空間模式',
    folder: '資料夾',
    file: '檔案',
    rootDirectory: '根目錄',
    backToParent: '返回上一層',
    noFiles: '暫無檔案',
    loadingFiles: '載入中...',
    fileSize: '大小',
    fileType: '類型',
    uploadTime: '上傳時間',
    operation: '操作',
    open: '開啟',
    enterFolder: '進入資料夾',
    copyUrl: '複製路徑',
    refreshLink: '重新整理連結',
    tag: '標籤',
    enterTag: '輸入檔案標籤...',
    syncToDatabase: '同步到資料庫',
    selectedFiles: '選擇了 {count} 個檔案',
    cancel: '取消',
    confirm: '確認',
    
    // 数据库相关
    databaseFileRecords: '資料庫檔案記錄',
    syncedFiles: '已同步到資料庫的檔案記錄',
    noDatabaseRecords: '暫無資料庫記錄',
    id: 'ID',
    fileName: '檔案名稱',
    path: '路徑',
    type: '類型',
    createTime: '建立時間',
    
    // JSON预览相关
    jsonPreview: 'JSON資料預覽',
    export: '匯出',
    exportJson: '匯出JSON',
    exportSuccess: 'JSON檔案 {name}.json 匯出成功！',
    exportFailed: '匯出失敗',
    copy: '複製',
    copied: '已複製到剪貼簿',
    copyFailed: '複製失敗，請檢查瀏覽器權限設定',
    close: '關閉',
    generating: '產生中...',
    categories: '個分類',
    files: '個檔案',
    completeJsonData: '完整JSON資料',
    characters: '字元',
    noData: '暫無資料',
    previewJson: '預覽JSON',
    exportJsonFile: '匯出JSON',
    
    // 壁纸预览相关
    downloadWallpaper: '下載',
    downloading: '下載中...',
    downloadFailed: '下載失敗，請重試',
    imageLoadFailed: '圖片載入失敗',
    imageLoading: '載入中...',
    zoomIn: '放大',
    zoomOut: '縮小',
    resetZoom: '重置',
    errorDetails: '錯誤詳情',
    refreshImage: '重新整理圖片',
    downloadConfirm: '是否下載高清壁紙?',
    
    // 环境相关
    production: '正式環境',
    selectEnvironment: '選擇環境',
    environment: '環境',
    
    // 错误消息
    configurationError: '設定錯誤',
    domainNotConfigured: '儲存域名未設定！',
    pleaseSetEnvVar: '請設定環境變數: {var}',
    example: '例如: {var}=your-domain.r2.dev',
    unknownError: '未知錯誤',
    networkErrorRetry: '網路錯誤，請稍後重試',
    
    // 成功消息
    operationSuccess: '操作成功',
    fileUploaded: '檔案上傳成功',
    fileDeleted: '檔案刪除成功',
    
    // 数量相关
    count: '張',
    pieces: 'sheets',
    
    // 平台相关
    iphoneWallpapers: 'iPhone 壁紙',
    ipadWallpapers: 'iPad 壁紙',
    iosWallpapers: 'iOS 壁紙',
    ipadosWallpapers: 'iPadOS 壁紙',
    macWallpapers: 'Mac 壁紙',
    macosWallpapers: 'macOS 壁紙',
    wwdcWallpapers: 'WWDC 壁紙',
    noWallpaperData: '該設備暫無壁紙資料',
    
    // 页脚链接
    aboutUs: '關於我們',
    contactUs: '聯絡我們',
    
    // 语言切换
    switchToEnglish: '切換到英文',
    switchToChinese: '切換到中文',
    switchToJapanese: '切換到日語',
    switchToVietnamese: '切換到越南語',
    chinese: '中文',
    chineseSimplified: '中文（简体）',
    chineseTraditional: '中文（繁体）',
    english: 'EN',
    japanese: 'JP',
    vietnamese: 'VI',
    
    // 用户相关
    user: '使用者',
    
    // 404 页面
    pageNotFound: '頁面未找到',
    pageNotFoundDescription: '抱歉，您存取的頁面不存在或已被移除。',
    backToHome: '返回首頁',
    needHelp: '需要幫助？',
    needHelpDescription: '如果您認為這是一個錯誤，或者需要幫助，請聯絡我們：',
    notFoundBadge: '頁面遺失',
    notFoundHeroTitle: '這個桌布頁面目前無法存取。',
    notFoundHeroDescription: '這個連結可能已失效、被重新命名或被移除。你可以從下方主要分類繼續瀏覽 iPhone、iPad、macOS 和 WWDC 桌布，不必停留在無效頁面。',
    notFoundReportBrokenLink: '回報失效連結',
    notFoundStatusLabel: '狀態',
    notFoundStatusValue: '404 頁面未找到',
    notFoundSeoLabel: 'SEO',
    notFoundSeoValue: '保留正確 404，並提供有效內部連結',
    notFoundSupportLabel: '聯絡支援',
    notFoundQuickLinksTitle: '從有效分類頁繼續瀏覽',
    notFoundQuickLinksDescription: '當舊網址失效時，這些入口可以幫助使用者與搜尋引擎快速回到已驗證的桌布集合頁。',
    notFoundQuickLinkIphoneDescription: '依機型與世代瀏覽 iPhone 桌布合集。',
    notFoundQuickLinkIpadDescription: '查看適合直向與橫向裝置的 iPad 與 iPadOS 桌布。',
    notFoundQuickLinkMacDescription: '瀏覽 macOS 版本、MacBook 與 iMac 桌面桌布。',
    notFoundQuickLinkWwdcDescription: '開啟歷年 WWDC 活動與主題桌布檔案。',
    notFoundFooterNote: 'PhWalls 整理 iPhone、iPad、macOS 與 WWDC 桌布落地頁。當舊連結失效時，建議從上方分類入口繼續瀏覽，而不是將所有 404 都重新導向首頁。',
    
    // 关于页面
    ourMission: '我們的使命',
    qualityAssurance: '品質保證',
    contactDescription: '如果您有任何問題、建議或發現任何版權問題，請隨時聯絡我們：',
    aboutDescription: '了解 Phone Wallpaper 的詳細資訊，解答您可能遇到的問題',
    missionDescription: '我們致力於為手機品牌使用者提供最新、最高品質的系統內建壁紙。通過精心收集和整理，讓每一位使用者都能輕鬆獲取到官方原生壁紙，為您的設備增添更多個人化選擇。',
    qualityDescription: '所有壁紙均為手機品牌官方原生壁紙，確保最高品質和最純正的體驗',
    missionDescription2: '我們相信，好的壁紙不僅能美化您的設備，更能體現您的個性和品味。因此，我們只提供官方原生的高品質壁紙，確保每一張都經過精心篩選。',
    aboutTitle: '關於 PhWalls',
    aboutSubtitle: 'PhWalls 提供 iPhone、iPad 與 Mac 系統內建高清壁紙整理與下載，涵蓋 iOS 與 macOS 各版本壁紙合集。按裝置與系統分類歸檔，便於查找與保存。',
    aboutHeroTagline: 'Phone 原廠桌布資源檔案',
    aboutResourceTitle: '依裝置與系統版本快速瀏覽',
    aboutResourceDesc: '從 iPhone、iPad 到 Mac，依版本分層整理，讓查找與下載更有效率。',
    aboutIphoneDesc: '歷代 iPhone / iOS 原廠內建桌布。',
    aboutIpadDesc: '完整 iPad 與 iPadOS 桌布資源庫。',
    aboutMacDesc: 'macOS 與 Mac 預設背景全版本整理。',
    aboutWwdcDesc: 'WWDC 發表會官方主題桌布合集。',
    aboutTrustTitle: '為什麼選擇 PhWalls',
    aboutTrustDesc: '我們持續整理原廠資源，提供清楚分類與高解析下載。',
    aboutSupportTitle: '官方支援入口',
    aboutSupportDesc: '如需更換桌布教學，可直接前往 Phone 官方支援文件。',
    aboutContactTitle: '聯絡與回饋',
    aboutContactDesc: '歡迎提交補充資源、版本修正與版權回報。',
    systemNative: '系統原生壁紙',
    hdWatermarkFree: '高清無浮水印',
    regularUpdates: '定期更新',
    faqTitle: '常見問題',
    faqSubtitle: '解答您最關心的問題',
    howToSupport: '如何支援我們？',
    howToSupportAnswer: '如果您喜歡我們的服務，請分享給更多朋友，或者通過社群媒體關注我們。您的支援是我們持續改進的動力！',
    howToContact: '如何聯絡我們？',
    howToContactAnswer: '如果您有任何問題、建議或發現任何版權問題，請隨時聯絡我們：',
    qqGroup: 'QQ群：963594743',
    copyrightNotice: '版權聲明',
    copyrightText1: '本站展示的壁紙版權歸原權利人所有。PhWalls 為獨立整理站點，與 Phone Inc. 無關聯。',
    copyrightText2: '如涉及版權問題，請聯絡 fenggit@163.com，我們將及時處理。',
    homeButton: '首頁',
    preloadingImages: '載入中...',
    enterUsername: '請輸入使用者名稱',
    enterPassword: '請輸入密碼',
    letsGo: '開始使用',
    
    // Custom Wallpaper 页面
    customWallpaper: '設計壁紙',
    home: '首頁',
    presetGradients: '預設漸變',
    customColor: '自訂顏色',
    backgroundColor: '背景顏色',
    appleLogo: 'Phone 標誌',
    color: '顏色',
    size: '大小',
    position: '位置',
    horizontal: '水平',
    vertical: '垂直',
    iphone: 'iPhone',
    ipad: 'iPad',
    imac: 'iMac',
    
    // Custom Wallpaper SEO
    customWallpaperTitle: '設計壁紙製作工具 - 線上設計 iPhone iPad iMac 壁紙 | PhWalls',
    customWallpaperDescription: '免費線上設計壁紙製作工具，支援 iPhone、iPad、iMac 壁紙設計。選擇預設漸變色或自訂顏色，新增 Phone Logo，一鍵下載高清壁紙。打造專屬你的設備壁紙。',
    customWallpaperKeywords: '設計壁紙,壁紙製作,iPhone壁紙,iPad壁紙,iMac壁紙,線上壁紙設計,Phone壁紙,漸變壁紙,壁紙下載,免費壁紙工具',
    createYourWallpaper: '建立你的專屬壁紙',
    downloadYourDesign: '下載你的設計',
    mainNavigationLabel: '主導航',
    wallpaperPreviewLabel: '桌布預覽',
    wallpaperCustomizationControlsLabel: '桌布自訂控制',
    
    // 设备页面
    released: '發布時間',
    wallpapersTitleSuffix: '壁紙',
    wallpapers: '張壁紙',
    allWallpapers: '全部壁紙',
    phoneWallpapersGroupTitle: 'iPhone 壁紙',
    ipadPortraitWallpapersGroupTitle: 'iPad 壁紙',
    ipadLandscapeWallpapersGroupTitle: 'iPad 壁紙',
    desktopWallpapersGroupTitle: 'Mac 壁紙',
    watchWallpapersGroupTitle: 'Phone Watch 桌布',
    hdFreeLabel: 'HD 原圖',
    backToTopLabel: '返回頂部',
    multiResolutionPageDescription: '查看 {pageTitle} 多解析度桌布，依不同裝置分類預覽與下載。',
    wallpaperAltSuffix: '桌布',
    newYearLabel: '新年',
    collectionDescriptionTemplate: '瀏覽 {collectionName} 的 {count} 張{categoryLabel}桌布，高清原圖下載，無浮水印。',
    
    // Phone 支持链接
    appleOfficialSupport: 'Phone 官方支援',
    
    // 隐私政策相关
    privacyPolicyTitle: '隱私政策',
    privacyPolicySubtitle: '我們重視您的隱私，本政策詳細說明了我們如何收集、使用和保護您的個人資訊。',
    privacyPolicyLastUpdated: '2025年1月15日',
    lastUpdated: '最後更新',
    privacySection1Title: '1. 資訊收集',
    privacySection1Content1: '我們收集以下類型的資訊：',
    privacySection1Item1: '設備資訊：設備型號、作業系統版本、瀏覽器類型',
    privacySection1Item2: '使用資訊：存取頁面、停留時間、點擊行為',
    privacySection1Item3: '技術資訊：IP位址、Cookie、設備識別符',
    privacySection1Item4: '聯絡資訊：當您聯絡我們時提供的郵箱位址',
    privacySection2Title: '2. 資訊使用',
    privacySection2Content1: '我們使用收集的資訊用於以下目的：',
    privacySection2Item1: '提供和改進我們的服務',
    privacySection2Item2: '分析網站使用情況以最佳化使用者體驗',
    privacySection2Item3: '顯示相關廣告內容',
    privacySection2Item4: '與您溝通和提供客戶支援',
    privacySection3Title: '3. 資訊保護',
    privacySection3Content1: '我們採取適當的技術和組織措施保護您的個人資訊：',
    privacySection3Item1: '使用HTTPS加密傳輸資料',
    privacySection3Item2: '定期更新安全措施和系統',
    privacySection3Item3: '限制員工存取個人資訊的權限',
    privacySection4Title: '4. Cookie使用',
    privacySection4Content1: '我們使用Cookie和類似技術來改善您的瀏覽體驗。Cookie是儲存在您設備上的小文字檔。',
    privacySection4Content2: '您可以通過瀏覽器設定控制Cookie的使用，但禁用Cookie可能會影響網站功能。',
    privacySection5Title: '5. 第三方服務',
    privacySection5Content1: '我們使用以下第三方服務，它們可能有自己的隱私政策：',
    privacySection5Subtitle: '我們使用的第三方服務包括：',
    privacyServiceGoogleAnalytics: 'Google Analytics - 網站分析',
    privacyServiceCloudflare: 'Cloudflare - CDN與安全服務',
    privacySection6Title: '6. 使用者權利',
    privacySection6Content1: '根據適用的資料保護法律，您擁有以下權利：',
    privacySection6Item1: '存取您的個人資訊',
    privacySection6Item2: '更正不準確的資訊',
    privacySection6Item3: '刪除您的個人資訊',
    privacySection6Item4: '限制或反對處理您的資訊',
    privacySection7Title: '7. 聯絡我們',
    privacySection7Content1: '如果您對本隱私政策有任何疑問或需要行使您的權利，請通過以下方式聯絡我們：',
    contactEmail: '聯絡郵箱',
    privacySection8Title: '8. 政策更新',
    privacySection8Content1: '我們可能會不時更新本隱私政策。任何重大變更都會在網站上公佈。',
    privacySection8Content2: '我們建議您定期檢視本政策以了解我們如何保護您的資訊。',
    privacyPolicyFooter: '本隱私政策自發布之日起生效。',
    privacyPolicy: '隱私政策',
    
    // 微信二维码相关
    scanWechatQR: '掃碼訪問小程式',
    miniProgram: '小程式',
    
    // 壁纸大小调整相关
    wallpaperSize: '壁紙大小',
    originalSize: '原始大小',
    customSize: '自訂大小',
    width: '寬度',
    height: '高度',
    maintainAspectRatio: '保持寬高比',
    resetSize: '重置大小',
    currentSize: '目前尺寸'
  }
};

export function getI18nTexts(language: Language): I18nTexts {
  return i18nTexts[language] || i18nTexts['en'];
}
