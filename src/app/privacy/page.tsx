'use client';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import { Suspense } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { withLanguagePath } from '@/lib/language';
import BackNavButton from '@/components/BackNavButton';
import { analytics } from '@/lib/analytics';
import { Mail } from 'lucide-react';

// 将使用useSearchParams的组件分离出来
function PrivacyPolicyContent() {
  const { language, texts } = useLanguage();
  const homeHref = withLanguagePath('/', language);
  const thirdPartyServices = [
    texts.privacyServiceGoogleAnalytics,
    texts.privacyServiceGoogleAdsense,
    texts.privacyServiceCloudflare,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            <BackNavButton homeHref={homeHref} label={texts.returnHome} />
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-gray-900">
              {texts.privacyPolicyTitle}
            </h1>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* 标题部分 */}
          <div className="text-center mb-12">
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {texts.privacyPolicySubtitle}
            </p>
          </div>

          {/* 隐私政策内容 */}
          <div className="prose prose-lg max-w-none">
            <div className="space-y-8">
              {/* 1. 信息收集 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection1Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection1Content1}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{texts.privacySection1Item1}</li>
                    <li>{texts.privacySection1Item2}</li>
                    <li>{texts.privacySection1Item3}</li>
                    <li>{texts.privacySection1Item4}</li>
                  </ul>
                </div>
              </section>

              {/* 2. 信息使用 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection2Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection2Content1}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{texts.privacySection2Item1}</li>
                    <li>{texts.privacySection2Item2}</li>
                    <li>{texts.privacySection2Item3}</li>
                    <li>{texts.privacySection2Item4}</li>
                  </ul>
                </div>
              </section>

              {/* 3. 信息保护 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection3Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection3Content1}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{texts.privacySection3Item1}</li>
                    <li>{texts.privacySection3Item2}</li>
                    <li>{texts.privacySection3Item3}</li>
                  </ul>
                </div>
              </section>

              {/* 4. Cookie使用 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection4Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection4Content1}</p>
                  <p>{texts.privacySection4Content2}</p>
                </div>
              </section>

              {/* 5. 第三方服务 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection5Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection5Content1}</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{texts.privacySection5Subtitle}</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      {thirdPartyServices.map((service) => (
                        <li key={service}>{service}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 6. 用户权利 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection6Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection6Content1}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{texts.privacySection6Item1}</li>
                    <li>{texts.privacySection6Item2}</li>
                    <li>{texts.privacySection6Item3}</li>
                    <li>{texts.privacySection6Item4}</li>
                  </ul>
                </div>
              </section>

              {/* 7. 联系我们 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection7Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection7Content1}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-900">{texts.contactEmail}</p>
                        <a 
                          href="mailto:fenggit@163.com" 
                          onClick={() => analytics.openContactUs()}
                          className="text-blue-700 hover:text-blue-800 transition-colors duration-200"
                        >
                          fenggit@163.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 8. 政策更新 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {texts.privacySection8Title}
                </h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>{texts.privacySection8Content1}</p>
                  <p>{texts.privacySection8Content2}</p>
                </div>
              </section>
            </div>
          </div>

          {/* 页脚 */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              {texts.privacyPolicyFooter}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {texts.trademarkDisclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 加载中组件
function PrivacyPolicyLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    </div>
  );
}

// 主组件，用Suspense包装
// 隐私政策页面：展示站点隐私政策和第三方服务说明。
export default function PrivacyPolicyPage() {
  return (
    <Suspense fallback={<PrivacyPolicyLoading />}>
      <PrivacyPolicyContent />
    </Suspense>
  );
}
