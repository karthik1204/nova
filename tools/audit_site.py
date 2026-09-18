import json, pathlib, re, urllib.request, urllib.parse, concurrent.futures
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'official'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://www.novahealthsynergy.com'

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=40) as r: return r.read()

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]; self.links=[]; self.text=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ('script','style'): self.skip+=1
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='img': self.images.append(a)
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip and data.strip(): self.text.append(data.strip())

sitemap=fetch(BASE+'/sitemap.xml').decode()
paths=list(dict.fromkeys(re.findall(r'<loc>(https://www\.novahealthsynergy\.com[^<]*)</loc>',sitemap)))
paths=[u for u in paths if not re.search(r'\.(jpg|png|webp)',u)]
if BASE+'/' not in paths: paths.insert(0,BASE+'/')
print('Pages:',paths,flush=True)
pages=[]; images={}
def audit(url):
    raw=fetch(url).decode(); p=Page(); p.feed(raw)
    slug=urllib.parse.urlparse(url).path.strip('/').replace('/','__') or 'home'
    (OUT/(slug+'.html')).write_text(raw,encoding='utf8')
    try:
        data=json.loads(fetch(url+('?' if '?' not in url else '&')+'format=json'))
        (OUT/(slug+'.json')).write_text(json.dumps(data,indent=2),encoding='utf8')
    except Exception as e: print('JSON',url,str(e))
    return {'url':url,'slug':slug,'text':p.text,'links':p.links,'images':p.images},raw
for url in paths:
    try:
        page,raw=audit(url); pages.append(page)
        found=re.findall(r'https://images\.squarespace-cdn\.com/[^\s\"<>]+',raw)
        for item in page['images']:
            for key in ('data-src','src'): 
                if item.get(key,'').startswith('https://images.squarespace-cdn.com'): found.append(item[key])
        for u in found:
            u=u.split('?')[0].replace('&amp;','&').replace('\\u002F','/').rstrip('\\')
            if not re.search(r'\.(?:jpe?g|png|webp|gif)$',u,re.I): continue
            images.setdefault(u,{'url':u,'pages':[]})['pages'].append(page['slug'])
        print(page['slug'],len(page['images']),'images',flush=True)
    except Exception as e: print('ERROR',url,str(e),flush=True)
def download(pair):
    i,item=pair; ext=pathlib.Path(urllib.parse.unquote(urllib.parse.urlparse(item['url']).path)).suffix.lower()
    filename=str(i).zfill(2)+ext; item['file']=filename; item['pages']=list(dict.fromkeys(item['pages']))
    try: (OUT/filename).write_bytes(fetch(item['url']+'?format=1500w'))
    except Exception as e: item['error']=str(e)
    return item
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: inventory=list(ex.map(download,enumerate(images.values())))
(OUT/'inventory.json').write_text(json.dumps({'pages':pages,'images':inventory},indent=2),encoding='utf8')
print('Saved',len(pages),'pages and',len(inventory),'images to',OUT)
