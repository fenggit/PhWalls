import type { Language } from '@/types';
import { DEFAULT_LANGUAGE } from '@/lib/language';
import { getTabData } from '@/lib/data';

type BrandTab = {
  title: string;
  type: string;
  link?: string;
};

const formatBrandList = (brandTitles: string[], language: Language): string => {
  if (!brandTitles.length) {
    return '';
  }

  if (brandTitles.length === 1) {
    return brandTitles[0];
  }

  const last = brandTitles[brandTitles.length - 1];
  const head = brandTitles.slice(0, -1);

  if (language === 'zh' || language === 'zh-hant') {
    return brandTitles.join('、');
  }

  if (language === 'ja') {
    if (head.length === 1) {
      return `${head[0]}と${last}`;
    }

    return `${head.join('、')}と${last}`;
  }

  if (language === 'vi') {
    if (head.length === 1) {
      return `${head[0]} và ${last}`;
    }

    return `${head.join(', ')}, và ${last}`;
  }

  if (head.length === 1) {
    return `${head[0]} and ${last}`;
  }

  return `${head.join(', ')}, and ${last}`;
};

const getFeaturedBrandTitles = (language: Language, fallback: string[]): string[] => {
  const featuredTypes = new Set(['samsung', 'google-pixel', 'xiaomi', 'huawei', 'oppo']);
  const featured = getTabData(language)
    .filter((tab) => featuredTypes.has(tab.type.toLowerCase().replace(/\s+/g, '-')))
    .map((tab) => tab.title);
  return featured.length ? featured : fallback.slice(0, 5);
};

export const getBrandTitlesFromTabs = (language: Language = DEFAULT_LANGUAGE): string[] => {
  const tabs = (getTabData(language) as BrandTab[]).filter((item) => {
    const type = item.type?.toLowerCase().trim();
    return Boolean(item.title?.trim()) && Boolean(type) && type !== 'design' && type !== 'desktop' && !item.link;
  });

  return Array.from(new Set(tabs.map((item) => item.title.trim())));
};

export const getFooterBrandDescription = (
  language: Language,
  brandTitles: string[] = getBrandTitlesFromTabs(language)
): string => {
  const brandList = formatBrandList(getFeaturedBrandTitles(language, brandTitles), language);

  switch (language) {
    case 'zh':
      return `PhWalls 收录 ${brandList} 等品牌手机内置壁纸，以及 Windows、Ubuntu 等电脑桌面壁纸。按机型浏览合集，免费下载无水印原图。`;
    case 'zh-hant':
      return `PhWalls 收錄 ${brandList} 等品牌手機內建桌布，以及 Windows、Ubuntu 等電腦桌布。依機型瀏覽合集，免費下載無浮水印原圖。`;
    case 'ja':
      return `PhWalls は ${brandList} などのスマートフォン標準壁紙と Windows・Ubuntu などのデスクトップ壁紙を収録。機種別に閲覧し、透かしのない原画像を無料でダウンロードできます。`;
    case 'vi':
      return `PhWalls tổng hợp hình nền điện thoại từ ${brandList} và các thương hiệu khác, cùng hình nền máy tính Windows và Ubuntu. Duyệt theo thiết bị và tải ảnh gốc miễn phí, không watermark.`;
    case 'en':
    default:
      return `PhWalls collects stock phone wallpapers from ${brandList} and other brands, plus Windows and Ubuntu desktop wallpapers. Browse by device and download original images for free, without watermarks.`;
  }
};

export const getAboutBrandCopy = (
  language: Language,
  brandTitles: string[] = getBrandTitlesFromTabs(language)
): {
  heroTagline: string;
  subtitle: string;
  resourceDesc: string;
} => {
  const brandList = formatBrandList(getFeaturedBrandTitles(language, brandTitles), language);

  switch (language) {
    case 'zh':
      return {
        heroTagline: '手机与电脑内置壁纸档案',
        subtitle: `PhWalls 收录 ${brandList} 等品牌手机内置壁纸，以及 Windows、Ubuntu 等电脑桌面壁纸。按品牌和机型浏览合集，免费下载无水印原图。`,
        resourceDesc: `浏览 ${brandList} 等手机品牌壁纸合集，按品牌进入对应机型页面，查看图片并下载原图。`,
      };
    case 'zh-hant':
      return {
        heroTagline: '手機與電腦內建桌布檔案',
        subtitle: `PhWalls 收錄 ${brandList} 等品牌手機內建桌布，以及 Windows、Ubuntu 等電腦桌布。依品牌和機型瀏覽合集，免費下載無浮水印原圖。`,
        resourceDesc: `瀏覽 ${brandList} 等手機品牌桌布合集，依品牌進入對應機型頁面，預覽圖片並下載原圖。`,
      };
    case 'ja':
      return {
        heroTagline: 'スマートフォンとデスクトップの標準壁紙',
        subtitle: `PhWalls は ${brandList} などのスマートフォン標準壁紙と、Windows・Ubuntu などのデスクトップ壁紙を収録しています。ブランドや機種から探して、透かしのない原画像を無料でダウンロードできます。`,
        resourceDesc: `${brandList} などのブランド別コレクションから機種を選び、画像を確認して原画像をダウンロードできます。`,
      };
    case 'vi':
      return {
        heroTagline: 'Kho hình nền điện thoại và máy tính',
        subtitle: `PhWalls tổng hợp hình nền có sẵn của ${brandList} và nhiều điện thoại khác, cùng hình nền máy tính Windows và Ubuntu. Duyệt theo thương hiệu, thiết bị và tải ảnh gốc miễn phí, không watermark.`,
        resourceDesc: `Khám phá bộ sưu tập của ${brandList} và các thương hiệu khác, chọn dòng máy để xem và tải ảnh gốc.`,
      };
    case 'en':
    default:
      return {
        heroTagline: 'Stock phone and desktop wallpapers',
        subtitle: `PhWalls collects stock wallpapers from ${brandList} and other phones, plus desktop wallpapers for Windows and Ubuntu. Browse by brand and device to preview and download original images for free.`,
        resourceDesc: `Explore phone wallpaper collections from ${brandList} and more, then choose a device model to preview and download original images.`,
      };
  }
};

export const getAboutFaqItems = (
  language: Language
): Array<{ question: string; answer: string }> => {
  switch (language) {
    case 'zh':
      return [
        {
          question: '哪里可以下载各品牌官方内置壁纸？',
          answer: '通过本页的手机品牌和电脑壁纸入口进入合集页，预览壁纸后即可下载原图。',
        },
        {
          question: '支持哪些手机品牌壁纸下载？',
          answer: '我们按品牌导航持续维护壁纸资源，页面展示的品牌入口即为当前可浏览与下载的品牌集合。',
        },
        {
          question: '可以按品牌和机型精准查找壁纸吗？',
          answer: '可以。使用页面顶部搜索品牌、机型或壁纸名称，也可以先进入品牌页，再按机型浏览合集。',
        },
        {
          question: '新机型和新系统壁纸会更新吗？',
          answer: '会。品牌发布新机型或系统后，我们会尽快补充对应官方壁纸并更新索引。',
        },
        {
          question: '下载的壁纸是否有水印？',
          answer: '站点提供高清原图下载，默认无水印，适合手机与桌面场景使用。',
        },
        {
          question: '如何反馈资源缺失或版权问题？',
          answer: '可通过页面中的邮箱联系方式提交反馈，我们会尽快核对并处理。',
        },
      ];
    case 'zh-hant':
      return [
        {
          question: '哪裡可以下載各品牌官方內建桌布？',
          answer: '透過本頁的手機品牌與電腦桌布入口進入合集頁，預覽桌布後即可下載原圖。',
        },
        {
          question: '支援哪些手機品牌桌布下載？',
          answer: '我們依品牌導覽持續維護桌布資源，頁面展示的品牌入口即為目前可瀏覽與下載的品牌集合。',
        },
        {
          question: '可以按品牌與機型精準查找桌布嗎？',
          answer: '可以。使用頁面頂部搜尋品牌、機型或桌布名稱，也可以先進入品牌頁，再依機型瀏覽合集。',
        },
        {
          question: '新機型與新系統桌布會更新嗎？',
          answer: '會。品牌發佈新機型或系統後，我們會盡快補充對應官方桌布並更新索引。',
        },
        {
          question: '下載的桌布有浮水印嗎？',
          answer: '站點提供高清原圖下載，預設無浮水印，適合手機與桌面場景使用。',
        },
        {
          question: '如何回報資源缺失或版權問題？',
          answer: '可透過頁面中的電子郵件聯絡方式提交回報，我們會盡快核對並處理。',
        },
      ];
    case 'ja':
      return [
        {
          question: '各ブランドの公式壁紙はどこでダウンロードできますか？',
          answer: 'このページのスマートフォンとデスクトップの入口からコレクションを開き、画像を確認して原画像をダウンロードできます。',
        },
        {
          question: '対応ブランドはどこで確認できますか？',
          answer: '表示されているブランド入口が、現在提供中のブランド一覧です。',
        },
        {
          question: 'ブランドや機種で絞って探せますか？',
          answer: 'はい。ページ上部の検索でブランド・機種・壁紙名を探すか、ブランドページから機種別コレクションを閲覧できます。',
        },
        {
          question: '新機種・新OSの壁紙は更新されますか？',
          answer: 'ブランドの新製品や新OS公開後、できるだけ早く対応壁紙を追加します。',
        },
        {
          question: 'ダウンロード画像に透かしはありますか？',
          answer: '高解像度の原画像を提供しており、基本的に透かしなしで利用できます。',
        },
        {
          question: '不足データや著作権について連絡できますか？',
          answer: 'ページ内のメール連絡先から送ってください。内容を確認して対応します。',
        },
      ];
    case 'vi':
      return [
        {
          question: 'Tải hình nền chính thức theo từng thương hiệu ở đâu?',
          answer: 'Mở bộ sưu tập từ các liên kết điện thoại và máy tính trên trang này, xem trước rồi tải ảnh gốc.',
        },
        {
          question: 'Trang hỗ trợ những thương hiệu nào?',
          answer: 'Danh sách thương hiệu hiển thị trên trang là các thương hiệu đang có dữ liệu và có thể duyệt ngay.',
        },
        {
          question: 'Có thể tìm hình nền theo thương hiệu và dòng máy không?',
          answer: 'Có. Dùng tìm kiếm ở đầu trang theo thương hiệu, dòng máy hoặc tên hình nền, hoặc duyệt bộ sưu tập từ trang thương hiệu.',
        },
        {
          question: 'Hình nền máy mới và hệ điều hành mới có được cập nhật không?',
          answer: 'Có. Chúng tôi cập nhật sớm nhất có thể sau khi thương hiệu phát hành thiết bị hoặc hệ điều hành mới.',
        },
        {
          question: 'Hình nền tải xuống có watermark không?',
          answer: 'Hình nền được cung cấp ở chất lượng cao và mặc định không watermark.',
        },
        {
          question: 'Làm sao để phản hồi thiếu dữ liệu hoặc vấn đề bản quyền?',
          answer: 'Hãy gửi email theo thông tin liên hệ trên trang, chúng tôi sẽ kiểm tra và xử lý nhanh chóng.',
        },
      ];
    case 'en':
    default:
      return [
        {
          question: 'Where can I download official built-in wallpapers by brand?',
          answer: 'Open a phone or desktop collection from this page, preview the wallpapers and download the original image.',
        },
        {
          question: 'Which brands are currently supported?',
          answer: 'The visible brand entries represent the currently available wallpaper brand set.',
        },
        {
          question: 'Can I find wallpapers by brand and model?',
          answer: 'Yes. Search for a brand, device model or wallpaper name from the top of the page, or browse collections from a brand page.',
        },
        {
          question: 'Do you update wallpapers for new devices and OS releases?',
          answer: 'Yes. We add new official wallpapers as soon as possible after new device and OS announcements.',
        },
        {
          question: 'Are downloaded wallpapers watermark-free?',
          answer: 'Wallpapers are provided in high resolution and are watermark-free by default.',
        },
        {
          question: 'How can I report missing assets or copyright issues?',
          answer: 'Please contact us via the email shown on the page and we will review and handle it promptly.',
        },
      ];
  }
};
