# bz3 壁纸数据来源 — 2026-10-07

14 个新品牌，152 个素材目录。HTC U11 与 U11+ 按用户要求合并后，对应 151 个网站合集、1,870 条壁纸（23 段 MP4 动态壁纸）和 755 条五语言名称与 SEO 内容。

日期优先采用设备公布时间；只有月份或年份证据时保留相应精度，不补造月日。`announcement_report` 使用已公开发布报道的日期，可能与发布会因时区相差一天。LG Velvet 2 Pro 为员工机/泄露报道日期；Nubia M153 为工程原型机，使用已核验的壁纸公开日期。来源仅核验机型/合集，未逐张证明每张壁纸的首次公开时间。

LG Aristo 3 的独立公布日期未核验，暂留空；参数网站将它与 Aristo 2 Plus / Aristo 3+ 及 K8 平台共同列出，不能直接套用平台的 2018 年新闻日期。Meizu Note 16 5G 已通过官网 T8200 / 5G 规格与 2025/05/13 发布报道对应核验。

HTC U11 的合集日期使用 2017/05/16，包含 21 张 U11 和 21 张 U11+ 壁纸，来源标签分别保留，详情入口统一为 `/wallpapers/htc/htc-u11`。素材目录仍按原机型保留。

完整素材、数据库备份、R2 校验清单、导入与回退 SQL 位于 `/Users/fenghe/web-project/source/phonewalls/data/bz3-import-2026-10-07/`。

本次入库已完成：R2 的 3,740 个对象全部通过大小、MD5/ETag 和 MIME 核验，本地副本全部通过与当前源文件的 SHA-256 比对。本地及生产 D1 均新增 14 个品牌、151 个已发布合集、1,870 条壁纸和 755 条五语言记录；主图、字段内容、语言覆盖及外键检查通过。HTC U11 / U11+ 合并为 42 张，搜索 U11+ 可进入同一合集。网站代码、14 个 Logo、lint、Next.js 构建、Cloudflare Pages 构建及 93 个仓库测试均已核验；生产网站部署等待用户确认。

| 原始目录 | 日期 | 日期类型 | 来源 |
| --- | --- | --- | --- |
| Black Shark/Black Shark 2 | 2019/03/18 | announcement_report | [来源](https://www.fonearena.com/blog/277928/xiaomi-black-shark-2-price-specifications.html) |
| Black Shark/Black Shark 2 Pro | 2019/07/30 | announcement_report | [来源](https://www.fonearena.com/blog/287913/black-shark-2-pro-price-specifications.html) |
| Black Shark/Black Shark 3 | 2020/03/03 | announcement_report | [来源](https://www.fonearena.com/blog/306477/black-shark-3-price-specifications-black-shark-3-pro.html) |
| Black Shark/Black Shark Helo | 2018/10/23 | announcement_report | [来源](https://www.fonearena.com/blog/266852/xiaomi-black-shark-helo-price-specifications.html) |
| Fairphone/Fairphone 2 | 2015/06/17 | announcement_report | [来源](https://www.fonearena.com/blog/145108/fairphone-2-uses-ethically-sourced-materials-brings-easy-repairs-via-modular-design.html) |
| Fairphone/Fairphone 3 | 2019/08/27 | announcement | [来源](https://www.gsmarena.com/fairphone_3-10397.php) |
| Fairphone/Fairphone 4 | 2021/09/30 | announcement | [来源](https://www.gsmarena.com/fairphone_4-11136.php) |
| Fairphone/Fairphone 6 | 2025/06/25 | announcement | [来源](https://www.gsmarena.com/fairphone_6-13955.php) |
| HMD/HMD Fusion | 2024/09/05 | announcement_report | [来源](https://www.fonearena.com/blog/434183/hmd-fusion-price-specifications.html) |
| HMD/HMD Pulse | 2024/04/24 | release | [来源](https://en.wikipedia.org/wiki/HMD_Pulse_Pro) |
| HMD/HMD Pulse Plus | 2024/04/24 | release | [来源](https://en.wikipedia.org/wiki/HMD_Pulse_Pro) |
| HMD/HMD Pulse Pro | 2024/04/24 | release | [来源](https://en.wikipedia.org/wiki/HMD_Pulse_Pro) |
| HMD/HMD Skyline | 2024/07/18 | announcement_report | [来源](https://www.fonearena.com/blog/429472/hmd-skyline-price-specifications.html) |
| HMD/HMD Vibe | 2024/04 | announcement_month | [来源](https://www.gsmarena.com.bd/hmd-vibe/) |
| HMD/HMD XR21 | 2024/05/15 | announcement_report | [来源](https://www.fonearena.com/blog/423808/hmd-xr21-price-specifications-hmd-t21.html) |
| HTC/HTC Desire 12 | 2018/03/20 | announcement_report | [来源](https://www.fonearena.com/blog/246984/htc-desire-12-desire-12-plus-price-specifications.html) |
| HTC/HTC Desire 12 Plus | 2018/03/20 | announcement_report | [来源](https://www.fonearena.com/blog/246984/htc-desire-12-desire-12-plus-price-specifications.html) |
| HTC/HTC Desire 20 Pro | 2020/06/16 | announcement_report | [来源](https://www.fonearena.com/blog/315283/htc-u20-5g-price-specifications-desire-20-pro.html) |
| HTC/HTC U Ultra | 2017/01/12 | announcement_report | [来源](https://www.fonearena.com/blog/208872/htc-u-ultra-with-5-7-inch-quad-hd-display-secondary-display-snapdragon-821-android-7-0-announced.html) |
| HTC/HTC U11 | 2017/05/16 | announcement_report | [来源](https://www.fonearena.com/blog/219951/htc-u11-with-edge-sense-squeeze-interaction-snapdragon-835-6gb-ram-android-7-1-announced.html) |
| HTC/HTC U11 Life | 2017/11/02 | announcement_report | [来源](https://www.fonearena.com/blog/233837/htc-u11-life-android-one-phone-with-5-2-inch-1080p-display-snapdragon-630-edge-sense-announced.html) |
| HTC/HTC U11+ | 2017/11/02 | announcement_report | [来源](https://www.fonearena.com/blog/233853/htc-u11-plus-with-6-inch-qhd-full-screen-display-snapdragon-835-6gb-ram-android-8-0-announced.html) |
| HTC/HTC U12+ | 2018/05/23 | announcement_report | [来源](https://www.fonearena.com/blog/253452/htc-u12-plus-price-specifications.html) |
| LG/LG Aristo 2 | 2018/01 | announcement_month | [来源](https://www.gsmarena.com.bd/lg-aristo-2/) |
| LG/LG Aristo 3 | 待核验 | unverified | 未取得可核验日期 |
| LG/LG G Pad 5 10.1 | 2019/11/05 | announcement_report | [来源](https://www.fonearena.com/blog/297267/lg-g-pad-5-price-specifications.html) |
| LG/LG G5 | 2016/02/21 | announcement_report | [来源](https://www.fonearena.com/blog/175486/lg-g5-with-5-3-inch-quad-hd-always-on-display-4gb-ram-hardware-expansion-slot-announced.html) |
| LG/LG G6 | 2017/02/26 | announcement_report | [来源](https://www.fonearena.com/blog/212894/lg-g6-with-5-7-inch-qhd-display-snapdragon-821-dual-13mp-rear-cameras-announced.html) |
| LG/LG G7 Fit | 2018/08/28 | announcement_report | [来源](https://www.fonearena.com/blog/262060/lg-g7-one-g7-fit-specifications-availability.html) |
| LG/LG G7 One | 2018/08/28 | announcement_report | [来源](https://www.fonearena.com/blog/262060/lg-g7-one-g7-fit-specifications-availability.html) |
| LG/LG G8 ThinQ | 2019/02/24 | announcement | [来源](https://www.gsmarena.com/lg_g8_thinq-9540.php) |
| LG/LG G8X ThinQ | 2019/09/06 | announcement_report | [来源](https://www.fonearena.com/blog/290901/lg-g8x-thinq-v50s-thinq-5g-specifications-features.html) |
| LG/LG K10 | 2016/01/04 | announcement_report | [来源](https://www.fonearena.com/blog/169476/lg-k7-and-k10-smartphones-with-advanced-camera-tech-announced.html) |
| LG/LG K31 | 2020/08/21 | announcement_report | [来源](https://www.fonearena.com/blog/320391/lg-k31-price-specifications.html) |
| LG/LG K40 | 2019/02/20 | announcement_report | [来源](https://www.fonearena.com/blog/275601/lg-q60-k50-k40-specifications.html) |
| LG/LG K40S | 2019/08/22 | announcement_report | [来源](https://www.fonearena.com/blog/289552/lg-k50s-k40s-specs-features.html) |
| LG/LG K50 | 2019/02/20 | announcement_report | [来源](https://www.fonearena.com/blog/275601/lg-q60-k50-k40-specifications.html) |
| LG/LG Q52 | 2020/10/26 | announcement_report | [来源](https://www.fonearena.com/blog/325802/lg-q52-price-specifications.html) |
| LG/LG Q60 | 2019/02/20 | announcement_report | [来源](https://www.fonearena.com/blog/275601/lg-q60-k50-k40-specifications.html) |
| LG/LG Q61 | 2020/05/21 | announcement_report | [来源](https://www.fonearena.com/blog/312946/lg-q61-price-specifications.html) |
| LG/LG Q92 5G | 2020/08/24 | announcement | [来源](https://www.gsmarena.com/lg_q92_5g-10368.php) |
| LG/LG Stylo 5 | 2019/07/01 | announcement_report | [来源](https://www.fonearena.com/blog/285890/lg-stylo-5-price-specifications.html) |
| LG/LG V35 ThinQ | 2018/05/30 | announcement_report | [来源](https://www.fonearena.com/blog/254240/lg-v35-thinq-price-specifications-availability.html) |
| LG/LG V50 ThinQ | 2019/02/25 | announcement_report | [来源](https://www.fonearena.com/blog/276119/lg-v50-thinq-5g-specifications-features.html) |
| LG/LG V60 ThinQ | 2020/02/26 | announcement | [来源](https://www.gsmarena.com/lg_v60_thinq_5g-10103.php) |
| LG/LG Velvet | 2020/05/07 | announcement | [来源](https://en.wikipedia.org/wiki/LG_Velvet) |
| LG/LG Velvet 2 Pro | 2021/05/17 | prototype_report | [来源](https://en.wikipedia.org/wiki/LG_Velvet#Velvet_2_Pro) |
| LG/LG W10 | 2019/06/26 | announcement_report | [来源](https://www.fonearena.com/blog/285559/lg-w10-w30-w30-pro-price-india-specifications.html) |
| LG/LG W30 | 2019/06/26 | announcement_report | [来源](https://www.fonearena.com/blog/285559/lg-w10-w30-w30-pro-price-india-specifications.html) |
| LG/LG Wing | 2020/09/14 | announcement_report | [来源](https://www.fonearena.com/blog/322611/lg-wing-specifications-features.html) |
| LG/LG X4 | 2018/03/05 | announcement_report | [来源](https://www.fonearena.com/blog/245429/lg-x4-specifications-price.html) |
| Lava/Lava AGNI 5G | 2021/11/09 | announcement_report | [来源](https://www.fonearena.com/blog/351709/lava-agni-5g-price-specifications.html) |
| Lava/Lava Agni 2 | 2023/05/16 | announcement_report | [来源](https://www.fonearena.com/blog/393470/lava-agni-2-5g-price-india-specifications.html) |
| Lava/Lava Aura | 2021/03/19 | announcement_report | [来源](https://www.fonearena.com/blog/335911/lava-magnum-xl-aura-ivory-price-specifications.html) |
| Lava/Lava Be U | 2020/12/22 | announcement_report | [来源](https://www.fonearena.com/blog/329883/lava-beu-price-specifications.html) |
| Lava/Lava Blaze | 2022/07/07 | announcement_report | [来源](https://www.fonearena.com/blog/368526/lava-blaze-price-specifications.html) |
| Lava/Lava Ivory | 2021/03/19 | announcement_report | [来源](https://www.fonearena.com/blog/335911/lava-magnum-xl-aura-ivory-price-specifications.html) |
| Lava/Lava Magnum XL | 2021/03/19 | announcement_report | [来源](https://www.fonearena.com/blog/335911/lava-magnum-xl-aura-ivory-price-specifications.html) |
| Lava/Lava Z1 | 2021/01/07 | announcement_report | [来源](https://www.fonearena.com/blog/330672/lava-z1-z2-z4-z6-price-india-specifications-my.html) |
| Lava/Lava Z2 | 2021/01/07 | announcement_report | [来源](https://www.fonearena.com/blog/330672/lava-z1-z2-z4-z6-price-india-specifications-my.html) |
| Lava/Lava Z53 | 2020/02/06 | announcement_report | [来源](https://www.fonearena.com/blog/304125/lava-z53-price-specifications.html) |
| Lava/Lava Z6 | 2021/01/07 | announcement_report | [来源](https://www.fonearena.com/blog/330672/lava-z1-z2-z4-z6-price-india-specifications-my.html) |
| Lava/Lava Z61 Pro | 2020/07/09 | announcement_report | [来源](https://www.fonearena.com/blog/316829/lava-z61-pro-price-specifications.html) |
| Lava/Lava Z66 | 2020/08/04 | announcement_report | [来源](https://www.fonearena.com/blog/318996/lava-z66-price-specifications.html) |
| Lava/Lava Z71 | 2020/01/16 | announcement_report | [来源](https://www.fonearena.com/blog/302559/lava-z71-price-specifications.html) |
| Lava/Lava Z93 | 2019/08/22 | announcement_report | [来源](https://www.fonearena.com/blog/289640/lava-z93-price-specifications.html) |
| Lenovo/Lenovo A7700 | 2016/09/12 | announcement_report | [来源](https://www.fonearena.com/blog/196988/lenovo-a6600-a6600-plus-and-a7700-with-4g-volte-launched-in-india-starting-at-rs-6999.html) |
| Lenovo/Lenovo K5 2018 | 2018/03/20 | announcement_report | [来源](https://www.fonearena.com/blog/246964/lenovo-k5-k5-play-price-specifications.html) |
| Lenovo/Lenovo K5 Note 2018 | 2018/06/05 | announcement_report | [来源](https://www.fonearena.com/blog/254852/lenovo-k5-note-price-specifications-lenovo-a5.html) |
| Lenovo/Lenovo K6 | 2016/09/02 | announcement_report | [来源](https://www.fonearena.com/blog/196066/lenovo-k6-k6-power-and-k6-note-with-1080p-display-metal-body-fingerprint-sensor-official.html) |
| Lenovo/Lenovo Legion Duel | 2020/07/22 | announcement_report | [来源](https://www.fonearena.com/blog/317997/lenovo-legion-phone-duel-price-specifications.html) |
| Lenovo/Lenovo Legion Y70 | 2022/08/19 | announcement_report | [来源](https://www.fonearena.com/blog/372380/lenovo-legion-y70-price-specifications.html) |
| Lenovo/Lenovo Legion Y700 | 2022/03/02 | announcement_report | [来源](https://www.fonearena.com/blog/357668/lenovo-legion-tab-y700-price-specifications.html) |
| Lenovo/Lenovo P2 | 2016/09/03 | announcement_report | [来源](https://www.fonearena.com/blog/196167/lenovo-p2-with-5-5-inch-1080p-display-5100mah-battery-and-a-plus-announced.html) |
| Lenovo/Lenovo S5 | 2018/03/20 | announcement_report | [来源](https://www.fonearena.com/blog/246956/lenovo-s5-price-specifications.html) |
| Lenovo/Lenovo Tab 4 8 Plus | 2017/02/27 | announcement_report | [来源](https://www.fonearena.com/blog/213277/lenovo-tab-4-8-tab-4-8-plus-tab-4-10-tab-4-10-plus-with-android-nougat-snapdragon-socs-announced.html) |
| Lenovo/Lenovo Tab P11 Pro (2nd Gen) | 2022/09/01 | announcement_report | [来源](https://www.fonearena.com/blog/373310/lenovo-tab-p11-pro-2nd-gen-price-specifications-tab-p11-2nd-gen.html) |
| Lenovo/Lenovo Tab P12 Pro | 2021/09/08 | announcement_report | [来源](https://www.fonearena.com/blog/348171/lenovo-tab-p12-pro-tab-p11-5g-smart-wireless-earbuds-price-features.html) |
| Lenovo/Lenovo Z5 | 2018/06/05 | announcement_report | [来源](https://www.fonearena.com/blog/254835/lenovo-z5-price-specifications.html) |
| Lenovo/Lenovo Z5 Pro | 2018/11/01 | announcement_report | [来源](https://www.fonearena.com/blog/267708/lenovo-z5-pro-price-specifications.html) |
| Lenovo/Lenovo Z6 | 2019/07/04 | announcement_report | [来源](https://www.fonearena.com/blog/286216/lenovo-z6-price-specifications.html) |
| Lenovo/Lenovo Z6 Pro | 2019/04/23 | announcement_report | [来源](https://www.fonearena.com/blog/280541/lenovo-z6-pro-price-specifications.html) |
| Lenovo/Lenovo Z6 Youth Edition | 2019/05/22 | announcement_report | [来源](https://www.fonearena.com/blog/282863/lenovo-z6-lite-price-specifications.html) |
| Lenovo/Lenovo ZUK Z1 | 2015/08/11 | announcement_report | [来源](https://www.fonearena.com/blog/152100/zuk-z1-with-5-5-inch-1080p-display-usb-3-0-type-c-4100mah-battery-announced.html) |
| Lenovo/Lenovo ZUK Z2 | 2016/05/31 | announcement_report | [来源](https://www.fonearena.com/blog/186616/zuk-z2-with-5-inch-1080p-display-snapdragon-820-4gb-ram-fingerprint-sensor-announced.html) |
| Meizu/Meizu 16 | 2018/08/08 | announcement_report | [来源](https://www.fonearena.com/blog/260318/meizu-16-16-plus-price-specifications.html) |
| Meizu/Meizu 16s Pro | 2019/08/28 | announcement_report | [来源](https://www.fonearena.com/blog/290047/meizu-16s-pro-price-specifications.html) |
| Meizu/Meizu 17 (Pro) | 2020/05/08 | announcement_report | [来源](https://www.fonearena.com/blog/311769/meizu-17-pro-price-specifications.html) |
| Meizu/Meizu 18 Pro | 2021/03/03 | announcement_report | [来源](https://www.fonearena.com/blog/334700/meizu-18-meizu-18-pro-price-specifications.html) |
| Meizu/Meizu 20 Pro | 2023/03/31 | announcement_report | [来源](https://www.fonearena.com/blog/389755/meizu-20-pro-price-specifications-meizu-20-meizu-20-infinity.html) |
| Meizu/Meizu 21 | 2023/11/30 | announcement_report | [来源](https://www.fonearena.com/blog/411533/meizu-21-price-specifications.html) |
| Meizu/Meizu 22 | 2025/09/16 | announcement_report | [来源](https://www.fonearena.com/blog/464360/meizu-22-price-specifications.html) |
| Meizu/Meizu E3 | 2018/03/21 | announcement_report | [来源](https://www.fonearena.com/blog/247079/meizu-e3-price-specifications.html) |
| Meizu/Meizu M2 Note | 2015/06/02 | announcement_report | [来源](https://www.fonearena.com/blog/143084/meizu-m2-note-with-5-5-inch-1080p-display-android-lollipop-4g-lte-announced.html) |
| Meizu/Meizu M8c | 2018/05/25 | announcement_report | [来源](https://www.fonearena.com/blog/253730/meizu-m8c-price-specifications.html) |
| Meizu/Meizu MX5 | 2015/06/30 | announcement_report | [来源](https://www.fonearena.com/blog/146848/meizu-mx5-with-5-5-inch-1080p-display-full-metal-body-helio-x10-soc-announced.html) |
| Meizu/Meizu Note 16 | 2025/05/13 | announcement_report | [来源](https://www.fonearena.com/blog/453424/meizu-note-16-pro-price-specifications-meizu-note-16.html) |
| Meizu/Meizu Note 16 5G | 2025/05/13 | announcement | [来源](https://www.fonearena.com/blog/453424/meizu-note-16-pro-price-specifications-meizu-note-16.html) |
| Meizu/Meizu Note 16 Pro | 2025/05/13 | announcement_report | [来源](https://www.fonearena.com/blog/453424/meizu-note-16-pro-price-specifications-meizu-note-16.html) |
| Meizu/Meizu Pro 6 | 2016/04/13 | announcement_report | [来源](https://www.fonearena.com/blog/181925/meizu-pro-6-with-5-2-inch-1080p-3d-press-display-helio-x25-4gb-ram-fingerprint-sensor-announced.html) |
| Meizu/Meizu V8 (V8 Pro) | 2018/09/19 | announcement_report | [来源](https://www.fonearena.com/blog/263877/meizu-v8-pro-v8-price-specifications.html) |
| Micromax/Micromax Canvas 6 Pro | 2016/04/13 | announcement_report | [来源](https://www.fonearena.com/blog/181944/micromax-canvas-6-with-metal-body-fingerprint-sensor-and-canvas-6-pro-launched-for-rs-13999.html) |
| Micromax/Micromax Canvas Evok Note | 2017/04/11 | announcement_report | [来源](https://www.fonearena.com/blog/217294/micromax-evok-power-and-evok-note-with-fingerprint-sensor-4g-volte-4000mah-battery-launched-starting-at-rs-6999.html) |
| Micromax/Micromax IN Note 2 | 2022/01/25 | announcement_report | [来源](https://www.fonearena.com/blog/355555/micromax-in-note-2-price-specifications.html) |
| Micromax/Micromax In Note 1 | 2020/11/03 | announcement_report | [来源](https://www.fonearena.com/blog/326415/micromax-in-note-1-price-specifications.html) |
| Nio/Nio Phone 2 | 2024/07 | announcement_month | [来源](https://www.ytechb.com/download-nio-phone-2-stock-wallpapers/) |
| Nubia/Nubia M153 | 2026/01/02 | wallpaper_publication | [来源](https://www.ytechb.com/download-nubia-m153-stock-wallpapers/) |
| Nubia/Nubia M2 | 2017/03/22 | announcement_report | [来源](https://www.fonearena.com/blog/215632/nubia-n2-with-4gb-ram-5000mah-battery-m2-with-dual-13mp-rear-cameras-and-m2-lite-announced.html) |
| Nubia/Nubia N3 | 2018/03/09 | announcement_report | [来源](https://www.fonearena.com/blog/245928/nubia-n3-specifications-features.html) |
| Nubia/Nubia Play | 2020/04/21 | announcement_report | [来源](https://www.fonearena.com/blog/310412/nubia-play-price-specifications.html) |
| Nubia/Nubia X | 2018/10/31 | announcement_report | [来源](https://www.fonearena.com/blog/267600/nubia-x-price-specifications.html) |
| Nubia/Nubia Z11 Max | 2016/06/08 | announcement_report | [来源](https://www.fonearena.com/blog/187296/zte-nubia-z11-max-with-6-inch-1080p-display-snapdragon-652-4gb-ram-announced.html) |
| Nubia/Nubia Z17 | 2017/06/01 | announcement_report | [来源](https://www.fonearena.com/blog/221690/nubia-z17-with-5-5-inch-1080p-bezel-less-display-snapdragon-835-8gb-ram-dual-rear-cameras-announced.html) |
| Nubia/Nubia Z18 | 2018/09/05 | announcement_report | [来源](https://www.fonearena.com/blog/262742/nubia-z18-price-specifications.html) |
| Nubia/Nubia Z30 Pro | 2021/05/20 | announcement_report | [来源](https://www.fonearena.com/blog/340209/nubia-z30-pro-price-specifications.html) |
| Nubia/Nubia Z50 Ultra | 2023/03/07 | announcement_report | [来源](https://www.fonearena.com/blog/387436/nubia-z50-ultra-price-specifications.html) |
| Nubia/Nubia Z70 Ultra | 2024/11/21 | announcement_report | [来源](https://www.fonearena.com/blog/440561/nubia-z70-ultra-price-specifications.html) |
| Nubia/Nubia Z80 Ultra | 2025/10/22 | announcement_report | [来源](https://www.fonearena.com/blog/467175/nubia-z80-ultra-price-specifications.html) |
| RedMagic/Nubia Red Magic 5G | 2020/03/12 | announcement_report | [来源](https://www.fonearena.com/blog/307352/nubia-redmagic-5g-price-specifications.html) |
| RedMagic/Nubia Red Magic 5S | 2020/07/28 | announcement_report | [来源](https://www.fonearena.com/blog/318452/nubia-redmagic-5s-price-specifications.html) |
| RedMagic/Nubia Red Magic 6 Pro | 2021/03/04 | announcement_report | [来源](https://www.fonearena.com/blog/334832/redmagic-6-6-pro-price-specifications.html) |
| RedMagic/Nubia Red Magic 6s Pro | 2021/09/06 | announcement_report | [来源](https://www.fonearena.com/blog/347944/redmagic-6s-pro-price-features.html) |
| RedMagic/Nubia Red Magic 7 (Pro) | 2022/02/17 | announcement_report | [来源](https://www.fonearena.com/blog/356797/red-magic-7-pro-price-specifications-red-magic-7.html) |
| RedMagic/Nubia Red Magic 8 Pro | 2022/12/26 | announcement_report | [来源](https://www.fonearena.com/blog/381523/nubia-red-magic-8-pro-price-specifications.html) |
| RedMagic/Nubia Red Magic 9 Pro | 2023/11/23 | announcement_report | [来源](https://www.fonearena.com/blog/411136/redmagic-9-pro-price-specifications.html) |
| RedMagic/Nubia RedMagic 10 Pro | 2024/11/13 | announcement_report | [来源](https://www.fonearena.com/blog/439892/redmagic-10-pro-price-specifications.html) |
| RedMagic/Nubia RedMagic 11 Air | 2026/01/20 | announcement_report | [来源](https://www.fonearena.com/blog/473821/redmagic-11-air-price-specifcations.html) |
| RedMagic/Nubia RedMagic 11 Pro | 2025/10/17 | announcement_report | [来源](https://www.fonearena.com/blog/466980/redmagic-11-pro-price-specifications.html) |
| Sharp/Sharp Aquos Crystal X 402SH | 2014/08/18 | announcement_report | [来源](https://www.fonearena.com/blog/112560/sharp-aquos-crystal-and-aquos-crystal-x-with-ultra-narrow-bezel-announced.html) |
| Sharp/Sharp Aquos R7 | 2022/05/09 | announcement_report | [来源](https://www.fonearena.com/blog/363369/sharp-aquos-r7-specifications.html) |
| Sharp/Sharp Aquos S2 | 2017/08/08 | announcement_report | [来源](https://www.fonearena.com/blog/226726/sharp-aquos-s2-with-5-5-inch-fhd-bezel-less-display-snapdragon-660-6gb-ram-dual-rear-cameras-announced.html) |
| Sharp/Sharp Aquos S3 | 2018/03/27 | announcement_report | [来源](https://www.fonearena.com/blog/247688/sharp-aquos-s3-price-specifications.html) |
| Sharp/Sharp Aquos S3 Mini | 2018/03/21 | announcement_report | [来源](https://www.fonearena.com/blog/247128/sharp-aquos-s3-mini-price-specifications.html) |
| Sharp/Sharp Aquos Sense9 | 2024/10/29 | announcement | [来源](https://corporate.jp.sharp/news/241029-a.html) |
| Sharp/Sharp Aquos Z3 | 2017/04 | announcement_month | [来源](https://www.gsmarena.com.bd/sharp-z3/) |
| ZTE/ZTE Axon 10 Pro (5G) | 2019/02/26 | announcement_report | [来源](https://www.fonearena.com/blog/276392/zte-axon-10-pro-5g-specifications-features.html) |
| ZTE/ZTE Axon 11 | 2020/03/23 | announcement_report | [来源](https://www.fonearena.com/blog/308076/zte-axon-11-5g-price-specifications.html) |
| ZTE/ZTE Axon 20 | 2020/09/01 | announcement_report | [来源](https://www.fonearena.com/blog/321348/zte-axon-20-5g-price-specifications.html) |
| ZTE/ZTE Axon 30 5G | 2021/07/27 | announcement_report | [来源](https://www.fonearena.com/blog/344873/zte-axon-30-price-specifications.html) |
| ZTE/ZTE Axon 30 Ultra | 2021/04/15 | announcement_report | [来源](https://www.fonearena.com/blog/337906/zte-axon-30-ultra-axon-30-pro-price-specifications.html) |
| ZTE/ZTE Axon 40 Ultra | 2022/05/09 | announcement_report | [来源](https://www.fonearena.com/blog/363400/zte-axon-40-ultra-price-specifications-axon-40-pro.html) |
| ZTE/ZTE Axon M | 2017/10/19 | announcement_report | [来源](https://www.fonearena.com/blog/232472/zte-axon-m-foldable-phone-with-dual-5-2-inch-1080p-displays-20mp-camera-announced.html) |
| ZTE/ZTE Blade 20 5G | 2020/11 | announcement_month | [来源](https://www.mobosdata.com/phone/zte-blade-20-5g/) |
| ZTE/ZTE Blade A606 | 2019/01/22 | release | [来源](https://www.mobilespecs.net/phone/ZTE/ZTE_Blade_A606.html) |
| ZTE/ZTE Blade A7 & 10 Prime | 2019/11 | announcement_month | [来源](https://www.gsmarena.com.bd/zte-blade-a7-prime/) |
| ZTE/ZTE Blade S6 | 2015/01/29 | announcement_report | [来源](https://www.fonearena.com/blog/129813/zte-blade-s6-with-5-inch-hd-display-snapdragon-615-soc-android-5-0-and-lte-announced.html) |
| ZTE/ZTE Blade V7 | 2016/02/22 | announcement_report | [来源](https://www.fonearena.com/blog/175736/zte-blade-v7-with-5-2-inch-1080p-display-7-5mm-slim-metal-body-android-6-0-announced.html) |
| ZTE/ZTE Blade V7 Max | 2016/04/21 | announcement_report | [来源](https://www.fonearena.com/blog/182926/zte-blade-a910-and-blade-v7-max-with-fingerprint-sensor-4g-lte-announced.html) |
| ZTE/ZTE Blade V8 | 2017/01 | announcement_month | [来源](https://www.gsmarena.com.bd/zte-blade-v8/) |
| ZTE/ZTE Blade V9 | 2018/02/26 | announcement_report | [来源](https://www.fonearena.com/blog/244755/zte-blade-v9-specifications-price.html) |
| ZTE/ZTE Libero Flip | 2024/02 | announcement_month | [来源](https://www.ytechb.com/zte-libero-flip-wallpapers/) |
| ZTE/ZTE Visible R2 | 2019 | announcement_year | [来源](https://www.ytechb.com/download-zte-visible-r2-stock-wallpapers/) |
