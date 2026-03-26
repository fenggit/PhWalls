import type { Language } from '@/types';
import { DEFAULT_LANGUAGE } from '@/lib/language';
import { getTabData } from '@/lib/data';

type BrandTab = {
  title: string;
  type: string;
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
    if (head.length === 1) {
      return `${head[0]}和${last}`;
    }

    return `${head.join('、')}和${last}`;
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

export const getBrandTitlesFromTabs = (language: Language = DEFAULT_LANGUAGE): string[] => {
  const tabs = (getTabData(language) as BrandTab[]).filter((item) => {
    const type = item.type?.toLowerCase().trim();
    return Boolean(item.title?.trim()) && Boolean(type) && type !== 'design';
  });

  return Array.from(new Set(tabs.map((item) => item.title.trim())));
};

export const getFooterBrandDescription = (
  language: Language,
  brandTitles: string[] = getBrandTitlesFromTabs(language)
): string => {
  const brandList = formatBrandList(brandTitles, language);

  switch (language) {
    case 'zh':
      return `PhWalls 收录 ${brandList} 等品牌官方内置壁纸，支持 4K/5K/6K 高清无水印下载。`;
    case 'zh-hant':
      return `PhWalls 收錄 ${brandList} 等品牌官方內建桌布，支援 4K/5K/6K 高清無浮水印下載。`;
    case 'ja':
      return `PhWalls は ${brandList} などの公式内蔵壁紙を収録し、4K/5K/6K の高解像度ダウンロードに対応しています。`;
    case 'vi':
      return `PhWalls tổng hợp hình nền hệ thống chính thức từ các thương hiệu như ${brandList}, hỗ trợ tải xuống 4K/5K/6K không watermark.`;
    case 'en':
    default:
      return `PhWalls curates official built-in wallpapers for brands like ${brandList}, with 4K/5K/6K high-resolution watermark-free downloads.`;
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
  const brandList = formatBrandList(brandTitles, language);

  switch (language) {
    case 'zh':
      return {
        heroTagline: '多品牌官方壁纸资源档案',
        subtitle: `PhWalls 提供 ${brandList} 等品牌官方内置高清壁纸整理与下载，按品牌与机型归档，便于查找与保存。`,
        resourceDesc: `覆盖 ${brandList} 在内的品牌壁纸资源，支持按品牌入口快速浏览与下载。`,
      };
    case 'zh-hant':
      return {
        heroTagline: '多品牌官方桌布資源檔案',
        subtitle: `PhWalls 提供 ${brandList} 等品牌官方內建高清桌布整理與下載，按品牌與機型歸檔，便於查找與保存。`,
        resourceDesc: `覆蓋 ${brandList} 在內的品牌桌布資源，支援按品牌入口快速瀏覽與下載。`,
      };
    case 'ja':
      return {
        heroTagline: 'マルチブランド公式壁紙アーカイブ',
        subtitle: `PhWalls は ${brandList} などのブランド公式内蔵壁紙を整理し、ブランドと機種ごとに探しやすく提供します。`,
        resourceDesc: `ブランド別の入口から、${brandList} を含む壁紙コレクションをすばやく閲覧・ダウンロードできます。`,
      };
    case 'vi':
      return {
        heroTagline: 'Kho hình nền chính thức đa thương hiệu',
        subtitle: `PhWalls tổng hợp và cung cấp hình nền HD chính thức cho các thương hiệu như ${brandList}, được phân loại theo thương hiệu và dòng máy để dễ tìm kiếm.`,
        resourceDesc: `Bao phủ bộ sưu tập từ ${brandList} và nhiều thương hiệu khác, giúp bạn duyệt và tải nhanh theo từng danh mục thương hiệu.`,
      };
    case 'en':
    default:
      return {
        heroTagline: 'Official Multi-Brand Wallpaper Archive',
        subtitle: `PhWalls curates downloadable HD built-in wallpapers for brands like ${brandList}, organized by brand and device model for faster discovery.`,
        resourceDesc: `Browse and download wallpaper collections across ${brandList} and more through structured brand entry points.`,
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
          answer: '可在 About 页下方品牌入口进入对应品牌分类，下载官方内置高清壁纸原图。',
        },
        {
          question: '支持哪些手机品牌壁纸下载？',
          answer: '我们按品牌导航持续维护壁纸资源，页面展示的品牌入口即为当前可浏览与下载的品牌集合。',
        },
        {
          question: '可以按品牌和机型精准查找壁纸吗？',
          answer: '可以。先进入品牌页，再按机型或系统版本浏览，即可快速定位目标壁纸合集。',
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
          answer: '可在 About 頁下方品牌入口進入對應品牌分類，下載官方內建高清桌布原圖。',
        },
        {
          question: '支援哪些手機品牌桌布下載？',
          answer: '我們依品牌導覽持續維護桌布資源，頁面展示的品牌入口即為目前可瀏覽與下載的品牌集合。',
        },
        {
          question: '可以按品牌與機型精準查找桌布嗎？',
          answer: '可以。先進入品牌頁，再依機型或系統版本瀏覽，即可快速定位目標桌布合集。',
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
          answer: 'About ページ下部のブランド入口から各ブランドページに進み、公式内蔵壁紙をダウンロードできます。',
        },
        {
          question: '対応ブランドはどこで確認できますか？',
          answer: '表示されているブランド入口が、現在提供中のブランド一覧です。',
        },
        {
          question: 'ブランドや機種で絞って探せますか？',
          answer: 'はい。ブランドページに入った後、機種やバージョン単位で目的の壁紙を見つけられます。',
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
          answer: 'Bạn có thể vào từng danh mục thương hiệu từ phần liên kết bên dưới trang About để tải hình nền gốc.',
        },
        {
          question: 'Trang hỗ trợ những thương hiệu nào?',
          answer: 'Danh sách thương hiệu hiển thị trên trang là các thương hiệu đang có dữ liệu và có thể duyệt ngay.',
        },
        {
          question: 'Có thể tìm hình nền theo thương hiệu và dòng máy không?',
          answer: 'Có. Vào trang thương hiệu trước, sau đó lọc theo dòng máy hoặc phiên bản hệ điều hành.',
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
          answer: 'Use the brand entry points on the About page to open each brand collection and download the original wallpapers.',
        },
        {
          question: 'Which brands are currently supported?',
          answer: 'The visible brand entries represent the currently available wallpaper brand set.',
        },
        {
          question: 'Can I find wallpapers by brand and model?',
          answer: 'Yes. Open a brand page first, then browse by device model or OS version to find the exact collection.',
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
