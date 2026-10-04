"""Collect public search evidence for the D1 SEO backfill; never writes to D1."""
import argparse
import base64
import concurrent.futures
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

parser = argparse.ArgumentParser()
parser.add_argument('--brands', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--workers', type=int, default=2)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
inventory = json.loads((root / 'docs/research/device-seo-2026-10-02/inventory.json').read_text())
brands = set(args.brands.split(','))
devices = [row for row in inventory if row['brand_name'] in brands]


def normalized(text):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', text).lower()).strip()


def direct_url(url):
    if 'bing.com/ck/' in url:
        value = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get('u', [''])[0]
        if value.startswith('a1'):
            try:
                return base64.urlsafe_b64decode(value[2:] + '=' * (-len(value[2:]) % 4)).decode()
            except (ValueError, UnicodeError):
                return url
    return url


def research(device):
    name = re.sub(r' \(\d+\)$', '', device['device_name'])
    query = f'"{name}" wallpapers'
    url = 'https://www.bing.com/search?' + urllib.parse.urlencode({
        'q': query, 'setlang': 'en-US', 'cc': 'us', 'count': 10,
    })
    result = {'device_id': device['id'], 'brand_name': device['brand_name'], 'device_name': device['device_name'],
              'query_url': url, 'checked_date': '2026-10-02', 'results': [], 'status': 'no_exact_evidence'}
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=18) as response:
            html = response.read().decode('utf-8', errors='replace')
        soup = BeautifulSoup(html, 'html.parser')
        if soup.find(id='b_captcha') or 'verify you are human' in soup.get_text(' ', strip=True).lower():
            result['status'] = 'search_blocked'
            return result
        target = normalized(name)
        for item in soup.select('li.b_algo')[:8]:
            anchor = item.select_one('h2 a')
            if not anchor:
                continue
            title = anchor.get_text(' ', strip=True)
            paragraph = item.select_one('.b_caption p') or item.select_one('p')
            snippet = paragraph.get_text(' ', strip=True) if paragraph else ''
            link = direct_url(anchor.get('href', ''))
            if not link.startswith('http'):
                continue
            evidence = normalized(title + ' ' + snippet)
            exact = target in evidence
            result['results'].append({'url': link, 'title': title, 'snippet': snippet[:800],
                                      'exact_model_mention': exact})
        if any(item['exact_model_mention'] for item in result['results']):
            result['status'] = 'exact_model_in_search_results'
        elif not result['results']:
            result['status'] = 'no_search_results'
    except Exception as error:
        result['status'] = 'search_error'
        result['error'] = str(error)[:200]
    time.sleep(0.15)
    return result


output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
    for index, result in enumerate(pool.map(research, devices), 1):
        results.append(result)
        if index % 25 == 0:
            output.write_text(json.dumps(results, ensure_ascii=False, indent=2))
            print(json.dumps({'researched': index, 'total': len(devices), 'output': str(output)}), flush=True)
output.write_text(json.dumps(results, ensure_ascii=False, indent=2))
statuses = {status: sum(row['status'] == status for row in results) for status in sorted({row['status'] for row in results})}
print(json.dumps({'devices': len(results), 'statuses': statuses, 'output': str(output)}), flush=True)
