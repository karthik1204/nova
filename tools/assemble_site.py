import base64, html, json, pathlib, re
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'assets'/'official'
inventory=json.loads((SRC/'inventory.json').read_text())
def clean(s):
    s=html.unescape(s)
    s=re.sub(r'(?<=[a-zA-Z])\ufffd(?=[a-zA-Z])',"'",s)
    return s.replace('\ufffd',' ').strip()
def page(slug): return next(p for p in inventory['pages'] if p['slug']==slug)
def ingredients(slug,start,end):
    text=page(slug)['text']; text=text[text.index('Medicinal Ingredients Description')+1:]; text=text[:text.index('Shop')]
    text=[clean(t) for t in text if t!='View fullsize']
    result=[]
    for i,image in enumerate(range(start,end+1)):
        result.append({'name':text[i*2],'description':text[i*2+1].lstrip('- ').strip(),'image':str(image).zfill(2)})
    return result
products=[]
for key,slug,photo,color,accent,tag,short,nums in [
    ('digestive','digestive-tonic','15','#efad87','#773827','A little balance. A little botanical magic.','A powerhouse blend of fast-acting digestive herbs that soothes discomfort and promotes a healthy microbiome.',(37,61)),
    ('immunity','sagecedarwood-xrde4','16','#bab9e7','#393567','Rooted in nature. Made for your everyday.','This raw, unfiltered elixir is slowly infused to concentrate the most valuable health activating components of the herbs gently and naturally.',(62,77)),
    ('broth','immunity-broth-kit','17','#edce69','#665221','A nourishing ritual, one warm cup at a time.','Our rejuvenating broth kit makes a delicious sipping broth or powerful base for soups and stews.',(18,36))
]:
    item=json.loads((SRC/('shop__p__'+slug+'.json')).read_text())['item']
    variants=sorted(item['variants'],key=lambda v:v['price'])
    products.append({'key':key,'name':item['title'],'short':short,'tag':tag,'description':clean(re.sub('<[^>]+>','',item['excerpt'])),'url':'https://www.novahealthsynergy.com'+item['fullUrl'],'photo':photo,'cutout':photo+'-cutout','wrap':photo+'-wrap' if key!='broth' else 'pouch-front','color':color,'accent':accent,'variants':[{'size':v.get('attributes',{}).get('Size','4 oz / 113 g').replace('.',''),'price':v['price']/100,'id':v['id']} for v in variants],'ingredients':ingredients('shop__p__'+slug,*nums)})
about=page('about')['text']; begin=about.index('Necia was being prepared for this her whole life.'); end=about.index('Shop',begin)
story=[clean(s) for s in about[begin+1:end]]
assets={}
for file in (ROOT/'assets'/'prepared').glob('*.webp'):
    assets[file.stem]='data:image/webp;base64,'+base64.b64encode(file.read_bytes()).decode()
pouch=Image.open(ROOT/'assets'/'prepared'/'pouch-front.webp').convert('RGBA')
contour=[]
for i in range(81):
    y=min(pouch.height-1,max(0,round(i/80*(pouch.height-1))))
    edges=[x for x in range(pouch.width) if pouch.getpixel((x,y))[3]>128]
    contour.append([edges[0]/pouch.width,edges[-1]/pouch.width] if edges else ([.1,.9] if not contour else contour[-1]))
data={'products':products,'story':story,'assets':assets,'pouchContour':contour}
template=(ROOT/'site.template.html').read_text(encoding='utf8')
output=template.replace('__NOVA_CONTENT__',json.dumps(data,ensure_ascii=False).replace('</','<\\/'))
(ROOT/'index.html').write_text(output,encoding='utf8')
aliases={'shop':'shop','shop/digestive-tonic':'product/digestive','shop/immunity-tonic':'product/immunity','shop/immunity-broth-kit':'product/broth','about':'story','contact':'contact','journal':'journal','journal/coming-soon-stay-tuned':'journal/post'}
for path,route in aliases.items():
    target=ROOT/path/'index.html'
    target.parent.mkdir(parents=True,exist_ok=True)
    link='../'*len(path.split('/'))+'#/'+route
    target.write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nova Health Synergy</title><meta http-equiv="refresh" content="0;url='+link+'"><p><a href="'+link+'">Open Nova Health Synergy</a></p></html>',encoding='utf8')
print('Built standalone index.html:',round(len(output.encode())/1024/1024,2),'MB;',len(assets),'embedded assets;',len(products),'products;',sum(len(p['ingredients']) for p in products),'ingredient entries.')
