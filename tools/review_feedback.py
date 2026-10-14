"""Extract screenshot anchors from the supplied review without altering it."""
from pathlib import Path
import io
import zipfile
from PIL import Image, ImageDraw
from lxml import etree

out = Path('feedback-review')
out.mkdir(exist_ok=True)
with zipfile.ZipFile(r'C:/Users/sivak/Downloads/New Website Feedback (002).docx') as z:
    ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
          'a':'http://schemas.openxmlformats.org/drawingml/2006/main',
          'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    rels = {r.get('Id'):r.get('Target') for r in etree.fromstring(z.read('word/_rels/document.xml.rels'))}
    root = etree.fromstring(z.read('word/document.xml'))
    entries = []
    for p in root.findall('.//w:body/w:p',ns):
        ids = p.xpath('.//w:commentRangeStart/@w:id',namespaces=ns)
        for rid in p.xpath('.//a:blip/@r:embed',namespaces=ns):
            raw = z.read('word/'+rels[rid])
            name = Path(rels[rid]).name
            (out/name).write_bytes(raw)
            image = Image.open(io.BytesIO(raw)).convert('RGB')
            entries.append((name,ids,image))
    for start in range(0,len(entries),8):
        sheet = Image.new('RGB',(1400,1360),'#eeeeee')
        draw = ImageDraw.Draw(sheet)
        for i,(name,ids,image) in enumerate(entries[start:start+8]):
            x,y=(i%2)*700,(i//2)*340
            draw.text((x+10,y+8),f'{name} | comment IDs: {", ".join(ids)}',fill='black')
            image.thumbnail((680,300))
            sheet.paste(image,(x+10,y+30))
        sheet.save(out/f'sheet-{start//8+1}.png')
print('Extracted',len(entries),'screenshots into',out)
