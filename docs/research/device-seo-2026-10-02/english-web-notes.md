# English wallpaper source coverage — 2026-10-02

This audit maps public English wallpaper articles to the PhWalls inventory. It records all **995 collections**, with URLs and explicit verification statuses. It is source-discovery and wording evidence, not search-volume, difficulty, ranking, manufacturer-authenticity, or complete asset-provenance measurement.

## Coverage

- All 11 allowed YTECHB post sitemaps were acquired (the first and last reused the parent’s successful public fetch; maps 2–10 were retrieved here). The API/index 403 was not bypassed, and disallowed tag pagination/search paths were not accessed.
- The corpus contains **1,500 wallpaper/background URLs**. Exact model/variant matching plus five manually reviewed primary Android-version mappings produced source candidates for **674 collections across 24 brands**.
- **100 article pages** were fetched successfully: 81 phone, 5 foldable, 2 tablet, 6 desktop and 6 OS collections. Among them, 96 verify a single model/collection wallpaper topic, 2 cover several models, and 2 describe reused Android AOSP wallpaper context.
- **574 collections** have sitemap discovery only; **321 collections** remain inventory-only. Missing matches do not show that no source or search demand exists. No statement that all 995 collections were independently verified is supported.
- Curl retrieved some maps but then had connection resets. The same allowed URLs worked through Python urllib. HTTP 200, 404, 403 and connection errors were kept distinct; this did not involve bypassing access controls.

Detailed sitemap metadata, all 1,500 candidate URLs, 100 page H1s/short excerpts, conservative matching rules and all 995 collection records are in `english-model-sources.json`.

## Matching and naming rules

Model numbers and variants stay intact. A base model does not match Pro, Pro Max, Ultra, XL, Fold, Flip, FE or 4G/5G variants. Shortened manufacturer prefixes are permitted only for recognized product identifiers such as Google Pixel→Pixel or Sony Xperia→Xperia. Moto/Motorola forms are normalized conservatively. Combined inventory names can match a combined article, but a series article does not prove the models share identical assets.

The article at [Pixel 10 wallpaper URL](https://www.ytechb.com/download-pixel-10-wallpapers/) actually covers Pixel 10 and 10 Pro. The [Pixel 3 article](https://www.ytechb.com/download-google-pixel-3-stock-wallpapers/) covers 3 and 3 XL. These are multi-model contexts. Conjunctions that join static and live wallpapers, as in ASUS ROG Phone and OnePlus 10R articles, are not multi-model identities.

Five Android collections were manually matched by their primary OS version. Their inventory dessert codenames were retained, but those labels and the exact PhWalls asset sets were not authenticated by the article URL.

## Useful page evidence and its limits

| Inventory collection | Public article | What it supports | What it does not support |
|---|---|---|---|
| Google Pixel 9 Pro Fold | [Article](https://www.ytechb.com/download-pixel-9-pro-fold-wallpapers/) | Exact Fold model and wallpaper-download topic | Every file being 4K, manufacturer authenticity, or display fit |
| Samsung Galaxy Z Flip 5 | [Article](https://www.ytechb.com/download-samsung-galaxy-z-flip-5-wallpapers/) | Exact Flip model and wallpaper topic | All 45 PhWalls images having FHD+ dimensions or fitting both screens |
| Xiaomi Mix Fold 4 | [Article](https://www.ytechb.com/download-xiaomi-mix-fold-4-stock-wallpapers/) | Exact model and observed English stock-wallpaper wording | Full equality between publisher and PhWalls asset sets |
| Oppo Find N3 Flip | [Article](https://www.ytechb.com/download-oppo-find-n3-flip-stock-wallpapers/) | Exact model/Flip distinction | Native live-wallpaper support |
| Vivo X Fold+ | [Article](https://www.ytechb.com/download-vivo-x-fold-plus-stock-wallpapers/) | Plus variant stays distinct from X Fold | Base-model assets being identical |
| Huawei MatePad Pro | [Article](https://www.ytechb.com/download-huawei-matepad-pro-stock-wallpapers/) | Tablet identity and stock-wallpaper article topic | Unstated generation, release specs or article count becoming inventory count |
| Windows 11 | [Article](https://www.ytechb.com/windows-11-wallpapers/) | Desktop wallpaper/download intent | Every inventory image being 4K |
| Android 13 | [Article](https://www.ytechb.com/android-13-wallpaper/) | Article discusses an existing AOSP wallpaper and provides a download | A newly designed Android 13-exclusive wallpaper set |
| Android 14 | [Article](https://www.ytechb.com/android-14-wallpaper/) | Article says the earlier AOSP wallpaper is reused | A new Android 14-only design |
| ASUS ROG Phone | [Article](https://www.ytechb.com/download-asus-rog-phone-wallpapers/) | Static/live wallpaper article context | Video files being present in PhWalls, whose inventory for this collection is static |
| Nothing Phone 2a Plus Community Edition | [Article](https://www.ytechb.com/download-nothing-phone-2a-plus-community-edition-wallpapers/) | Specific full edition identity | Edition suffix being safely omitted |

Article titles and concise source excerpts are in the JSON. The table paraphrases findings to avoid duplicating large source excerpts.

## Native English download intent

The fetched titles consistently use the exact model name with wallpaper/download wording. Many include stock-wallpaper language and a resolution label. This shows English publishing conventions; it does not quantify user search habits. For PhWalls, lead with the exact model/edition and actual available image count, then add one or two file-backed differences and a download action.

- Phone: `{model} wallpapers: {N} images to download`, followed by actual palette, dark/light variants, format, and home-screen/lock-screen use.
- Desktop: `{collection} desktop wallpapers`, with actual count, format and OS/version distinctions. Avoid smartphone lock-screen wording.
- Foldable: preserve Fold/Flip/Plus and cover-image distinctions. Only claim cover-screen availability when filenames or verified file metadata establish it.
- Edition: retain Community Edition, Star Wars Edition, Olympic/Bespoke, Windows Regional and OS Mobile Phone variants.

Free downloads do not mean royalty-free images. Source claims such as 4K, FHD+, stock, official, live or original quality are not inherited blindly. The actual PhWalls file dimensions/formats/counts and download behavior determine product copy. Do not add device specifications, release dates, latest-model claims or universal compatibility from this source mapping.

## Explicitly excluded nearby variants

- [Oppo Find X10 Pro Max article](https://www.ytechb.com/download-oppo-find-x10-pro-max-wallpapers/) is not an exact source for Oppo Find X10.
- [Xiaomi 18 Pro Max article](https://www.ytechb.com/download-xiaomi-18-pro-max-wallpapers-and-live-wallpapers/) is not an exact source for Xiaomi 18 Pro.
- [Honor Magic 9 Pro Max article](https://www.ytechb.com/download-honor-magic-9-pro-max-wallpapers/) exists in the sitemap corpus, but that exact collection is absent from this 995-record inventory.

Sitemap lastmod dates were retained only as sitemap metadata, not verified product release dates. Actual counts and dimensions remain authoritative from the inventory/D1 snapshot.
