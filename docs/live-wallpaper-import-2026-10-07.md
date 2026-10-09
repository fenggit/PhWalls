# 动态壁纸资源与日期来源 — 2026-10-07

资源来源：`/Users/fenghe/Desktop/Live`，131 个合集、572 段原始 MP4 与对应 WebP 封面。品牌归类为 18 项，ASUS 包含 ROG Phone 与 ZenFone，红魔从努比亚中独立归类。列表尺寸与首页手机卡片一致（9:16；宽屏 6 列、手机 2 列），页面按品牌分组。

R2 存储在现有 `phwalls` 桶的 `live/` 前缀，保留品牌与机型目录的原始大小写、空格。原始视频和封面不改写，另存 720px 宽度以内、30fps、H.264 的无音轨预览在 `preview/`，供浏览器播放。共 1,716 个对象；公开页面仅展示封面，视频通过带发布权限检查和 Range 支持的 `/api/files/preview` 代理，下载统一走 `/api/files/download`。

数据通过现有 `w_devices`、`w_wallpapers`、`w_device_i18n` 入库，无新增表。复用 83 个设备并新增 48 个设备；新增 551 条壁纸，21 条同名旧视频经 R2 大小与 MD5 核验内容一致后迁移引用，原 R2 文件保留。新增 240 条语言记录，并更正 43 个已有设备的日期。动态页查询仅读取已发布的 dynamic 媒体，普通页保留原有混合媒体行为。

130 个目录有日期证据。日期类型明确区分正式公布、公布报道、全球发布、壁纸公开日期与原型机报道；月份精度不补造月日。部分 FoneArena 报道时间与发布会因时区相差一天；Reno12 使用已核验的全球发布日 2024/06/18，11R 原神版与 OxygenOS 11 使用壁纸公开日期。三星 Thom Browne 素材无法唯一识别具体联名机型，日期留空，设备与视频保留草稿。

完整来源文本、视频/封面/预览清单、上传校验结果、生产与本地 D1 导入前备份、导入及回退 SQL 位于 `/Users/fenghe/web-project/source/phonewalls/data/live-import-2026-10-07/`。生产 SQL 为 `import.sql`，回退为 `rollback.sql`；本地设备 ID 与生产不同，因此单独生成 `import-local.sql` 与 ID 映射。本地回退使用本地导入前备份，不能套用生产回退 SQL。

## 日期来源

导入与核验已完成：R2 的 1,716 个对象全部通过大小、MIME、MD5/ETag 与 SHA-256 清单校验，源文件复核一致；本地与生产 D1 均已导入。生产逐字段核验通过，131 个合集具备完整的 655 条五语言内容，130 个合集及 571 段本次视频已发布，三星 Thom Browne 的 1 段视频为草稿。动态页面还会展示原有合集中保留的 2 段视频，当前生产动态媒体共 573 段已发布视频。

`npm run lint`、`npm run build`、`npm run pages:build` 与 98 项仓库测试通过；已在 390px 手机视口检查导航与播放器，并核验实际播放、206 Range 响应和 attachment 原始 MP4 下载链路。前端生产部署等待用户确认。

| 原始目录 | 日期 | 日期类型 | 来源 |
| --- | --- | --- | --- |
| ASUS/ASUS ROG Phone 3 | 2020/07/22 | announcement_report | [来源](https://www.fonearena.com/blog/318022/asus-rog-phone-3-price-india-specifications.html) |
| ASUS/ASUS ROG Phone 5 | 2021/03/10 | announcement_report | [来源](https://www.fonearena.com/blog/335269/asus-rog-phone-5-price-india-specifications.html) |
| ASUS/ASUS ROG Phone 5S Pro | 2021/08/16 | announcement_report | [来源](https://www.fonearena.com/blog/346349/asus-rog-phone-5s-price-specifications.html) |
| ASUS/ASUS ROG Phone 9 FE | 2025/02/05 | announcement_report | [来源](https://www.fonearena.com/blog/445507/asus-rog-phone-9-fe-price-specifications.html) |
| ASUS/ASUS ZenFone 7 | 2020/08/26 | announcement_report | [来源](https://www.fonearena.com/blog/320780/asus-zenfone-7-pro-price-specifications.html) |
| Google/Google Pixel 10 Pro Fold | 2025/08/20 | announcement_report | [来源](https://www.fonearena.com/blog/462266/google-pixel-10-pro-fold-price-india-specifications.html) |
| Honor/Honor 100 | 2023/11/23 | announcement_report | [来源](https://www.fonearena.com/blog/411169/honor-100-price-specifications-honor-100-pro.html) |
| Honor/Honor Magic 4 | 2022/02/28 | announcement_report | [来源](https://www.fonearena.com/blog/357604/honor-magic-4-pro-price-specifications-honor-magic-4.html) |
| Honor/Honor Magic V Flip 2 | 2025/08/21 | announcement | [来源](https://www.honor.com/cn/news/honor-magic-v-flip-launch-china/) |
| Honor/Honor Magic V Flip 2 Haute Couture Edition | 2025/08/21 | announcement | [来源](https://www.honor.com/cn/news/honor-magic-v-flip-launch-china/) |
| Honor/Honor Magic V6 | 2026/03/01 | announcement_report | [来源](https://www.fonearena.com/blog/476489/honor-magic-v6-features.html) |
| Huawei/Huawei Mate X2 | 2021/02/22 | announcement_report | [来源](https://www.fonearena.com/blog/333897/huawei-mate-x2-price-specifications.html) |
| Huawei/Huawei Mate X3 | 2023/03/23 | announcement_report | [来源](https://www.fonearena.com/blog/389065/huawei-mate-x3-price-specifications.html) |
| Huawei/Huawei P50 | 2021/07/29 | announcement_report | [来源](https://www.fonearena.com/blog/345045/huawei-p50-price-specifications-p50-pro.html) |
| Huawei/Huawei Pocket 2 | 2024/02/22 | announcement | [来源](https://www.myfixguide.com/huawei-pocket-2-coming-feb-22/) |
| Huawei/Huawei Pura 70 Ultra | 2024/04/18 | announcement_report | [来源](https://www.fonearena.com/blog/422039/huawei-pura-70-price-specifications-pura-70-pro-pura-70-pro-plus-pura-70-pro-ultra.html) |
| Huawei/Huawei nova 10 | 2022/07/04 | announcement_report | [来源](https://www.gizmochina.com/2022/07/04/huawei-nova-10-nova-10-pro-launched-in-china-with-snapdragon-778-4g-soc-50mp-camera/) |
| Huawei/Huawei nova Flip | 2024/08/05 | announcement | [来源](https://www.gizmochina.com/2024/07/29/huawei-nova-flip-teaser-video-released-green-variants-design-revealed/) |
| LG/LG V50 ThinQ | 2019/02/25 | announcement_report | [来源](https://www.fonearena.com/blog/276119/lg-v50-thinq-5g-specifications-features.html) |
| LG/LG Velvet 2 Pro | 2021/05/17 | prototype_report | [来源](https://www.androidauthority.com/lg-velvet-2-pro-lg-rollable-1226334/) |
| Lenovo/Lenovo Legion Duel | 2020/07/22 | announcement_report | [来源](https://www.fonearena.com/blog/317997/lenovo-legion-phone-duel-price-specifications.html) |
| Meizu/Meizu 21 | 2023/11/30 | announcement_report | [来源](https://www.fonearena.com/blog/411533/meizu-21-price-specifications.html) |
| Meizu/Meizu 21 Note | 2024/05/16 | announcement_report | [来源](https://www.gizmochina.com/2024/05/16/meizu-21-note-launched-in-china-specs-and-pricing-here/) |
| Nubia/Nubia Red Magic 6 Pro | 2021/03/04 | announcement_report | [来源](https://www.fonearena.com/blog/334832/redmagic-6-6-pro-price-specifications.html) |
| Nubia/Nubia Red Magic 7 Pro | 2022/02/17 | announcement_report | [来源](https://www.fonearena.com/blog/356797/red-magic-7-pro-price-specifications-red-magic-7.html) |
| Nubia/Nubia Z40 Pro | 2022/02/25 | announcement_report | [来源](https://www.fonearena.com/blog/357410/nubia-z40-pro-price-specifications.html) |
| OPPO/ColorOS 17 | 2026/09 | system-announcement-month | [来源](https://www.oppo.com/cn/newsroom/press/549/) |
| OPPO/OPPO Find N | 2021/12/15 | device-announcement | [来源](https://baike.baidu.com/item/OPPO%20Find%20N/59430825) |
| OPPO/OPPO Find N3 Flip | 2023/08/29 | device-announcement | [来源](https://baike.baidu.com/item/OPPO%20Find%20N3%20Flip/63358322) |
| OPPO/OPPO Find N5 | 2025/02/20 | device-announcement | [来源](https://www.oppo.com/en/newsroom/press/find-n5-global-launch/) |
| OPPO/OPPO Find X10 | 2026/09 | device-announcement-month | [来源](https://www.gsmarena.com/oppo_find_x10-14953.php) |
| OPPO/OPPO Find X2 Pro | 2020/03/06 | device-announcement | [来源](https://www.oppo.com/cn/newsroom/press/400/) |
| OPPO/OPPO Find X5 Pro | 2022/02/24 | device-announcement | [来源](https://www.oppo.com/cn/newsroom/press/480/) |
| OPPO/OPPO Find X7 | 2024/01/08 | device-announcement | [来源](https://baike.baidu.com/item/OPPO%20Find%20X7/68334623) |
| OPPO/OPPO Find X8 | 2024/10 | device-announcement-month | [来源](https://www.gsmarena.com/oppo_find_x8-13407.php) |
| OPPO/OPPO Reno10 | 2023/05/24 | device-announcement | [来源](https://baike.baidu.com/item/OPPO%20Reno10%E7%B3%BB%E5%88%97/63019412) |
| OPPO/OPPO Reno10 Pro+ | 2023/05/24 | device-announcement | [来源](https://baike.baidu.com/item/OPPO%20Reno10%E7%B3%BB%E5%88%97/63019412) |
| OPPO/OPPO Reno12 | 2024/06/18 | device-announcement-global | [来源](https://www.oppo.com/en/newsroom/press/oppo-reno12-series-launch/) |
| OnePlus/OnePlus 10 Pro | 2022/01/11 | device-announcement | [来源](https://en.wikipedia.org/wiki/OnePlus_10_Pro) |
| OnePlus/OnePlus 10R | 2022/04/28 | device-announcement | [来源](https://www.ytechb.com/download-oneplus-10r-wallpapers/) |
| OnePlus/OnePlus 11 | 2023/01/04 | device-announcement | [来源](https://baike.baidu.com/item/%E4%B8%80%E5%8A%A0%2011/62551105) |
| OnePlus/OnePlus 11R | 2023/02/07 | device-announcement | [来源](https://www.ytechb.com/download-oneplus-11r-wallpapers/) |
| OnePlus/OnePlus 11R Genshin Impact Edition | 2023/04/28 | wallpaper-first-publication | [来源](https://www.ytechb.com/download-oneplus-11r-genshin-impact-wallpapers/) |
| OnePlus/OnePlus 6T McLaren Edition | 2018/12/11 | device-announcement | [来源](https://www.phonedog.com/2018/12/11/oneplus-6t-mclaren-edition-official-specs-images-price) |
| OnePlus/OnePlus 7 Pro | 2019/05/14 | device-announcement | [来源](https://en.wikipedia.org/wiki/OnePlus_7) |
| OnePlus/OnePlus 7T | 2019/09/26 | device-announcement | [来源](https://www.engadget.com/2019/09/26/oneplus-7t-specs-price-availability-camera-hands-on/) |
| OnePlus/OnePlus 7T Pro | 2019/10/10 | device-announcement | [来源](https://www.engadget.com/2019/10/10/oneplus-7t-pro-mclaren-edition-announcement/) |
| OnePlus/OnePlus 7T Pro McLaren Edition | 2019/10/10 | device-announcement | [来源](https://www.engadget.com/2019/10/10/oneplus-7t-pro-mclaren-edition-announcement/) |
| OnePlus/OnePlus 8 Pro | 2020/04/14 | device-announcement | [来源](https://en.wikipedia.org/wiki/OnePlus_8) |
| OnePlus/OnePlus 8T Cyberpunk 2077 | 2020/11/02 | device-announcement | [来源](https://www.fonearena.com/blog/326214/oneplus-8t-cyberpunk-2077-price-features.html) |
| OnePlus/OnePlus 9 Pro | 2021/03/23 | device-announcement | [来源](https://en.wikipedia.org/wiki/OnePlus_9) |
| OnePlus/OnePlus Ace 2 Pro | 2023/08/16 | device-announcement | [来源](https://baike.baidu.com/item/%E4%B8%80%E5%8A%A0Ace%202%20Pro/63145770) |
| OnePlus/OnePlus Ace 6T | 2025/12 | device-announcement-month | [来源](https://www.gsmarena.com/oneplus_ace_6t_5g-14315.php) |
| OnePlus/OnePlus Nord | 2020/07/21 | device-announcement | [来源](https://en.wikipedia.org/wiki/OnePlus_Nord) |
| OnePlus/OxygenOS 11 | 2020/08/20 | wallpaper-first-publication | [来源](https://www.ytechb.com/download-oxygenos-11-stock-wallpapers/) |
| Realme/Realme Narzo 10 | 2020/05/11 | announcement_report | [来源](https://www.fonearena.com/blog/311924/realme-narzo-10-price-india-specifications.html) |
| Samsung/Samsung Galaxy A22 | 2021/06/03 | announcement_report | [来源](https://www.fonearena.com/blog/341199/samsung-galaxy-a22-5g-price-specifications-galaxy-a22.html) |
| Samsung/Samsung Galaxy A31 | 2020/03/24 | announcement_report | [来源](https://www.fonearena.com/blog/308186/samsung-galaxy-a31-price-specifications.html) |
| Samsung/Samsung Galaxy A32 | 2021/02/26 | announcement_report | [来源](https://www.fonearena.com/blog/334277/samsung-galaxy-a32-price-specifications.html) |
| Samsung/Samsung Galaxy A33 | 2022/03/17 | announcement_report | [来源](https://www.fonearena.com/blog/359011/samsung-galaxy-a53-price-specifications-galaxy-a33.html) |
| Samsung/Samsung Galaxy A36 | 2025/03/02 | announcement_report | [来源](https://www.fonearena.com/blog/447466/samsung-galaxy-a56-galaxy-a36-galaxy-a26-price-specifications.html) |
| Samsung/Samsung Galaxy A41 | 2020/03/19 | announcement_report | [来源](https://www.fonearena.com/blog/307897/samsung-galaxy-a41-price-specifications.html) |
| Samsung/Samsung Galaxy A51 | 2019/12/12 | announcement_report | [来源](https://www.fonearena.com/blog/300217/samsung-galaxy-a51-price-specifications.html) |
| Samsung/Samsung Galaxy A56 | 2025/03/02 | announcement_report | [来源](https://www.fonearena.com/blog/447466/samsung-galaxy-a56-galaxy-a36-galaxy-a26-price-specifications.html) |
| Samsung/Samsung Galaxy A71 | 2019/12/12 | announcement_report | [来源](https://www.fonearena.com/blog/300226/samsung-galaxy-a71-price-specifications.html) |
| Samsung/Samsung Galaxy A73 | 2022/03/17 | announcement_report | [来源](https://www.fonearena.com/blog/359020/samsung-galaxy-a73-price-specifications.html) |
| Samsung/Samsung Galaxy F55 | 2024/05/27 | announcement_report | [来源](https://www.fonearena.com/blog/424084/samsung-galaxy-f55-5g-price-india-specifications.html) |
| Samsung/Samsung Galaxy Fold | 2019/02/20 | announcement | [来源](https://www.samsungmobilepress.com/articles/samsung-unfolds-the-future-with-a-whole-new-mobile-category-introducing-galaxy-fold) |
| Samsung/Samsung Galaxy M31s | 2020/07/30 | announcement_report | [来源](https://www.fonearena.com/blog/318615/samsung-galaxy-m31s-price-india-specifications.html) |
| Samsung/Samsung Galaxy M33 | 2022/03/08 | announcement_report | [来源](https://www.fonearena.com/blog/358094/samsung-galaxy-m23-5g-galaxy-m33-5g-galaxy-a23-galaxy-a13-specifications.html) |
| Samsung/Samsung Galaxy M51 | 2020/08 | announcement_month | [来源](https://www.gsmarena.com.bd/samsung-galaxy-m51/) |
| Samsung/Samsung Galaxy M53 | 2022/04/08 | announcement_report | [来源](https://www.fonearena.com/blog/360969/samsung-galaxy-m53-5g-price-specifications.html) |
| Samsung/Samsung Galaxy M56 | 2025/04/17 | announcement_report | [来源](https://www.fonearena.com/blog/451478/samsung-galaxy-m56-5g-price-india-specifications.html) |
| Samsung/Samsung Galaxy Note 10 | 2019/08/07 | announcement | [来源](https://www.samsungmobilepress.com/press-releases/introducing-galaxy-note10-designed-to-bring-passions-to-life-with-next-level-power) |
| Samsung/Samsung Galaxy Note 20 | 2020/08/05 | announcement_report | [来源](https://www.fonearena.com/blog/319225/samsung-galaxy-note-20-price-specifications.html) |
| Samsung/Samsung Galaxy S20 | 2020/02/11 | announcement | [来源](https://www.samsungmobilepress.com/press-releases/introducing-the-samsung-galaxy-s20-change-the-way-you-experience-the-world) |
| Samsung/Samsung Galaxy S21 | 2021/01/14 | announcement_report | [来源](https://www.fonearena.com/blog/331047/samsung-galaxy-s21-s21-plus-price-specifications.html) |
| Samsung/Samsung Galaxy S21 Ultra | 2021/01/14 | announcement_report | [来源](https://www.fonearena.com/blog/331121/samsung-galaxy-s21-ultra-5g-price-specifications.html) |
| Samsung/Samsung Galaxy S22 | 2022/02/09 | announcement_report | [来源](https://www.fonearena.com/blog/356165/samsung-galaxy-s22-price-specifications-galaxy-s22-plus.html) |
| Samsung/Samsung Galaxy S22 Ultra | 2022/02/09 | announcement_report | [来源](https://www.fonearena.com/blog/356173/samsung-galaxy-s22-ultra-price-specifications.html) |
| Samsung/Samsung Galaxy S23 | 2023/02/01 | announcement | [来源](https://www.samsungmobilepress.com/articles/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond) |
| Samsung/Samsung Galaxy S24 | 2024/01/17 | announcement | [来源](https://www.samsungmobilepress.com/press-releases/enter-the-new-era-of-mobile-ai-with-samsung-galaxy-s24-series) |
| Samsung/Samsung Galaxy S24 Ultra | 2024/01/17 | announcement | [来源](https://www.samsungmobilepress.com/press-releases/enter-the-new-era-of-mobile-ai-with-samsung-galaxy-s24-series) |
| Samsung/Samsung Galaxy S25 | 2025/01/22 | announcement_report | [来源](https://www.fonearena.com/blog/444693/samsung-galaxy-s25-ultra-price-specifications-galaxy-s25-galaxy-s25-plus.html) |
| Samsung/Samsung Galaxy S25 Ultra | 2025/01/22 | announcement_report | [来源](https://www.fonearena.com/blog/444693/samsung-galaxy-s25-ultra-price-specifications-galaxy-s25-galaxy-s25-plus.html) |
| Samsung/Samsung Galaxy Z Flip | 2020/02/11 | announcement | [来源](https://www.samsungmobilepress.com/articles/the-future-changes-shape-express-yourself-with-galaxy-z-flip) |
| Samsung/Samsung Galaxy Z Flip 3 | 2021/08/11 | announcement_report | [来源](https://www.fonearena.com/blog/346027/samsung-galaxy-z-flip-3-price-specifications.html) |
| Samsung/Samsung Galaxy Z Flip 4 | 2022/08/10 | announcement_report | [来源](https://www.fonearena.com/blog/371581/samsung-galaxy-z-flip-4-price-specifications.html) |
| Samsung/Samsung Galaxy Z Flip 5 | 2023/07/26 | announcement_report | [来源](https://www.fonearena.com/blog/400258/samsung-galaxy-z-flip-5-price-specifications.html) |
| Samsung/Samsung Galaxy Z Flip 6 | 2024/07/10 | announcement_report | [来源](https://www.fonearena.com/blog/428591/samsung-galaxy-z-flip-6-price-specifications.html) |
| Samsung/Samsung Galaxy Z Flip 6 Olympic Edition | 2024/07/10 | announcement | [来源](https://www.samsungmobilepress.com/press-releases/samsung-unveils-exclusive-galaxy-z-flip6-olympic-edition-powered-by-galaxy-ai-for-paris-2024-athletes) |
| Samsung/Samsung Galaxy Z Fold 2 | 2020/08/05 | announcement_report | [来源](https://www.fonearena.com/blog/319240/samsung-galaxy-z-fold-2-features.html) |
| Samsung/Samsung Galaxy Z Fold 3 | 2021/08/11 | announcement_report | [来源](https://www.fonearena.com/blog/346032/samsung-galaxy-z-fold-3-price-specifications.html) |
| Samsung/Samsung Galaxy Z Fold 5 | 2023/07/26 | announcement_report | [来源](https://www.fonearena.com/blog/400211/samsung-galaxy-z-fold-5-price-specifications.html) |
| Samsung/Samsung Galaxy Z Fold 6 | 2024/07/10 | announcement_report | [来源](https://www.fonearena.com/blog/428578/samsung-galaxy-z-fold-6-price-specifications.html) |
| Samsung/Samsung Galaxy Z Fold 7 | 2025/07/09 | announcement_report | [来源](https://www.fonearena.com/blog/458574/samsung-galaxy-z-fold-7-price-specifications.html) |
| Samsung/Samsung Thom Browne | 待核验 | unverified | 未取得可核验日期 |
| Samsung/Samsung ViewFinity S9 | 2023/01/03 | announcement_report | [来源](https://www.fonearena.com/blog/381887/samsung-odyssey-neo-g9-viewfinity-s9-feaures.html) |
| Samsung/Samsung W21 | 2020/11/04 | announcement_report | [来源](https://www.fonearena.com/blog/326565/samsung-galaxy-w21-5g-price-specifications.html) |
| Samsung/Samsung W23 | 2022/10/21 | announcement_report | [来源](https://www.ithome.com/0/648/098.htm) |
| Samsung/Samsung W23 Flip | 2022/10/21 | announcement_report | [来源](https://www.ithome.com/0/648/098.htm) |
| Samsung/Samsung W24 | 2023/09/15 | announcement_report | [来源](https://www.ithome.com/0/719/456.htm) |
| Samsung/Samsung W24 Flip | 2023/09/15 | announcement_report | [来源](https://www.ithome.com/0/719/456.htm) |
| Samsung/Samsung W26 | 2025/10/11 | announcement_report | [来源](https://www.ithome.com/0/888/734.htm) |
| Sony/Sony Xperia 1 II | 2020/02/24 | announcement_report | [来源](https://www.fonearena.com/blog/305734/sony-xperia-1-ii-specifications-features.html) |
| Sony/Sony Xperia 1 III | 2021/04/14 | announcement_report | [来源](https://www.fonearena.com/blog/337794/sony-xperia-1-iii-specifications-features.html) |
| Sony/Sony Xperia 1 IV | 2022/05/11 | announcement_report | [来源](https://www.fonearena.com/blog/363626/sony-xperia-1-iv-price-specifications.html) |
| Sony/Sony Xperia 1 V | 2023/05/11 | announcement_report | [来源](https://www.fonearena.com/blog/393143/sony-xperia-1-v-price-specifications.html) |
| Sony/Sony Xperia 1 VII | 2025/05/13 | announcement_report | [来源](https://www.fonearena.com/blog/453363/sony-xperia-1-vii-price-specifications.html) |
| Sony/Sony Xperia 10 III | 2021/04/14 | announcement_report | [来源](https://www.fonearena.com/blog/337812/sony-xperia-10-iii-price-features.html) |
| Sony/Sony Xperia 5 | 2019/09/05 | announcement_report | [来源](https://www.fonearena.com/blog/290965/sony-xperia-5-price-specifications.html) |
| Sony/Sony Xperia 5 II | 2020/09/17 | announcement_report | [来源](https://www.fonearena.com/blog/322882/sony-xperia-5-ii-price-specifications.html) |
| Sony/Sony Xperia 5 III | 2021/04/14 | announcement_report | [来源](https://www.fonearena.com/blog/337804/sony-xperia-5-iii-specifications-features.html) |
| Sony/Sony Xperia 5 V | 2023/09/01 | announcement_report | [来源](https://www.fonearena.com/blog/404057/sony-xperia-5-v-price-specifications.html) |
| Sony/Sony Xperia PRO-I | 2021/10/26 | announcement_report | [来源](https://www.fonearena.com/blog/351040/sony-xperia-pro-i-price-specifications.html) |
| Xiaomi/MIUI 12 | 2020/04/27 | announcement_report | [来源](https://www.fonearena.com/blog/310721/miui-12-supported-devices-features.html) |
| Xiaomi/MIUI 13 | 2021/12/28 | announcement_report | [来源](https://www.fonearena.com/blog/354254/miui-13-supported-devices-features.html) |
| Xiaomi/Xiaomi 13 | 2022/12/11 | announcement_report | [来源](https://www.fonearena.com/blog/380461/xiaomi-13-price-specifications.html) |
| Xiaomi/Xiaomi 17 Ultra | 2025/12/25 | announcement_report | [来源](https://www.fonearena.com/blog/471987/xiaomi-17-ultra-price-specifications.html) |
| Xiaomi/Xiaomi MIX Fold 3 | 2023/08/14 | announcement_report | [来源](https://www.fonearena.com/blog/402335/xiaomi-mix-fold-3-price-features.html) |
| Xiaomi/Xiaomi Mix Fold | 2021/03/30 | announcement_report | [来源](https://www.fonearena.com/blog/336833/xiaomi-mi-mix-fold-price-specifications.html) |
| ZTE/ZTE Axon 11 | 2020/03/23 | announcement_report | [来源](https://www.fonearena.com/blog/308076/zte-axon-11-5g-price-specifications.html) |
| ZTE/ZTE S30 | 2021/03/30 | announcement_report | [来源](https://www.fonearena.com/blog/336855/zte-s30-pro-s30-s30-se-zte-watch-gt-price-specifications.html) |
| iQOO/iQOO 16 | 2026/09/29 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1397&type=0) |
| iQOO/iQOO 9 | 2022/01/05 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1025&type=0) |
| vivo/OriginOS Ocean | 2021/12/09 | system-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1013&type=0) |
| vivo/vivo S30 | 2025/05/29 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1309&type=0) |
| vivo/vivo X200 Ultra | 2025/04/21 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1307&type=0) |
| vivo/vivo X200s | 2025/04/21 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1307&type=0) |
| vivo/vivo X300 Ultra | 2026/03 | device-announcement-month | [来源](https://www.gsmarena.com/vivo_x300_ultra_5g-14388.php) |
| vivo/vivo X90 | 2022/11/22 | device-announcement | [来源](https://www.vivo.com.cn/brand/news/detail?id=1108&type=0) |
