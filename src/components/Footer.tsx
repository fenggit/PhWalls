'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { withLanguagePath } from '@/lib/language';
import { getBrandTitlesFromTabs, getFooterBrandDescription } from '@/lib/brand-copy';

export default function Footer() {
	const { language: currentLang, texts } = useLanguage();
	const brandTitles = getBrandTitlesFromTabs(currentLang);
	const footerDescription = getFooterBrandDescription(currentLang, brandTitles);

	return (
		<footer className="bg-gray-50 border-t border-gray-200/70 py-12 px-4 lg:px-10 mt-auto">
			<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10 md:gap-12">
				<div className="flex flex-col gap-5 max-w-2xl">
					<div className="flex items-center gap-3 text-gray-900">
						<div className="relative h-9 w-9 overflow-hidden rounded-lg border border-gray-200 bg-white">
							<Image
								src="/logo.png"
								alt={`${texts.siteName} logo`}
								fill
								sizes="36px"
								className="object-cover"
							/>
						</div>
						<h2 className="text-xl font-bold tracking-tight">{texts.siteName}</h2>
					</div>

					<p className="text-gray-700 text-[15px] leading-relaxed font-medium">
						{footerDescription}
					</p>

					{texts.copyright && (
						<p className="text-gray-500 text-xs leading-relaxed">
							{texts.copyright}
						</p>
					)}
				</div>

				<div className="flex items-center gap-6 md:gap-8 pt-1">
					<Link
						href={withLanguagePath('/about', currentLang)}
						className="text-gray-700 hover:text-blue-600 text-sm font-semibold transition-colors"
					>
						{texts.aboutUs}
					</Link>
					<Link
						href={withLanguagePath('/privacy', currentLang)}
						className="text-gray-700 hover:text-blue-600 text-sm font-semibold transition-colors"
					>
						{texts.privacyPolicy}
					</Link>
					<a
						href="mailto:fenggit@163.com"
						className="text-gray-700 hover:text-blue-600 text-sm font-semibold transition-colors"
					>
						{texts.contactUs}
					</a>
				</div>
			</div>
		</footer>
	);
}
