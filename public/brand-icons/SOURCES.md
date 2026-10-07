# 品牌图标来源

用于站内品牌导航，商标归各品牌所有。资源本地保存，不依赖第三方运行时请求。

- 常规 SVG：Simple Icons（https://simpleicons.org/）。Sony 改为深色版本；横向字标按路径边界收紧 viewBox，不改变路径形状。
- iQOO：https://www.iqoo.com/ 页头内联 SVG。
- Infinix：https://www.infinixmobility.com/ 页头内联 SVG。
- Tecno：https://d13pvy8xd75yde.cloudfront.net/global/x_new/logo.svg（官网页头引用）。
- POCO：https://commons.wikimedia.org/wiki/File:Poco_Smartphone_Company_logo.svg，保留原字标路径，裁去背景与外边距。
- Nothing：官网页头使用 Ndot-55.otf 点阵字体（https://cdn.shopify.com/oxygen-v2/43495/38485/80939/4487662/fonts/Ndot-55.otf），将 NOTHING 字标轮廓提取为独立 SVG path，不依赖运行时字体或嵌入位图。
- Realme：官网 CSS 内嵌 SVG（https://static2.realme.net/static/index.CcrfXNJi.css 中 .icon-logo），保留字标路径并裁去留白。
- Redmi 复用小米集团 SVG；Microsoft Windows / Surface 共用 Microsoft SVG：https://raw.githubusercontent.com/pheralb/svgl/main/static/library/microsoft.svg。
- HarmonyOS：Simple Icons SVG；Huawei MatePad 复用 Huawei 品牌标志。

图形标与横向字标分别设置展示尺寸，禁止拉伸或用 CSS 放大动画影响阅读。

Android 与 Omarchy 使用适配浅色界面的深绿色单色版本，保持原始 SVG 路径。

当前 Header 引用的品牌图标全部为矢量 SVG，旧 PNG / ICO 文件不再用于品牌菜单。

2026-10-07 新增品牌图标：

- Fairphone、HTC、LG、Lenovo、Meizu：Simple Icons 上游 SVG（https://github.com/simple-icons/simple-icons/tree/develop/icons），按实际路径收紧 viewBox。
- Black Shark：https://commons.wikimedia.org/wiki/File:Black_Shark_logo.svg，来源登记为 https://romapp.blackshark.com/download/index.html；保留绿色 S 图形标。
- HMD：https://www.hmd.com/en_int 页头 `logo-hmd` 内联 SVG。
- Lava：https://www.lavamobiles.com 页头内联 SVG，使用品牌红色以适配浅色导航背景。
- NIO：https://www.nio.cn/cdn-static/mynio/nextjs/images/icons/nio-logo-white.svg，改为深色展示。
- nubia：https://www.nubia.com/content/dam/nubia/global/logo/nubia.svg。
- ZTE：https://www.ztedevices.com/content/dam/zte-devices/global/home/icon/ZTE-logo.svg。
- Micromax：https://micromaxinfo.com/wp-content/uploads/2026/01/MMX-Logo-Orange-without-tagline-scaled.png，提取官方拳头图形并矢量化，保留品牌橙色。
- REDMAGIC：https://commons.wikimedia.org/wiki/File:Redmagic_official_logo.png，作者 Albert12mfjfr，CC BY-SA 4.0（https://creativecommons.org/licenses/by-sa/4.0/）；提取红色图形并矢量化，本图标改编沿用相同许可。
- SHARP：https://commons.wikimedia.org/wiki/File:Logo_of_the_Sharp_Corporation.svg，使用 Sharp Corporation 字标。
