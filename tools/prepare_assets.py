"""Prepare the user's original photographs and the explicitly requested label unwrap."""
import base64, io, json, math, pathlib, re, html
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'assets'/'official'
OUT=ROOT/'assets'/'prepared'
OUT.mkdir(exist_ok=True)
inventory=json.loads((SRC/'inventory.json').read_text())

def save(im,name,quality=86):
    im.save(OUT/(name+'.webp'),'WEBP',quality=quality)
    return name+'.webp'

def polygon_cutout(name,points,reference):
    im=Image.open(SRC/(name+'.jpg')).convert('RGBA')
    mask=Image.new('L',im.size); d=ImageDraw.Draw(mask)
    sx,sy=im.width/reference[0],im.height/reference[1]
    d.polygon([(round(x*sx),round(y*sy)) for x,y in points],fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(1.1)); im.putalpha(mask)
    im=im.crop(mask.getbbox()); im.thumbnail((650,1100))
    save(im,name+'-cutout',94)
    return im

polygon_cutout('15',[(252,141),(325,141),(328,176),(321,193),(329,211),(360,225),(384,246),(397,275),(399,320),(395,575),(387,631),(374,652),(350,667),(312,675),(266,674),(221,664),(201,648),(189,621),(181,576),(176,304),(178,273),(189,247),(211,229),(245,212),(253,194),(250,177)],(575,850))
polygon_cutout('16',[(300,105),(379,102),(387,111),(389,142),(382,151),(384,171),(391,185),(436,209),(464,235),(478,267),(482,309),(476,616),(466,687),(449,711),(418,725),(359,735),(292,730),(257,717),(237,697),(228,669),(222,617),(212,302),(215,266),(229,237),(254,218),(292,198),(299,184),(303,152),(297,139)],(702,850))
pouch=polygon_cutout('17',[(112,98),(507,85),(524,91),(530,132),(523,149),(531,169),(522,210),(493,329),(470,461),(451,608),(445,683),(433,706),(399,723),(371,747),(322,761),(264,760),(218,748),(193,727),(180,703),(161,681),(148,628),(150,546),(128,450),(108,354),(99,257),(88,213),(91,172)],(637,850))
save(pouch,'pouch-front',96)

def unwrap(file,cx,r,top,bottom,curve):
    photo=np.asarray(Image.open(SRC/(file+'.jpg')).convert('RGB'),dtype=np.float32)
    w,h=2048,1024; angle=math.radians(64)
    fw=round(w*128/360); theta=np.linspace(-angle,angle,fw)
    xs=np.clip(np.rint(cx+r*np.sin(theta)).astype(int),0,photo.shape[1]-1)
    yy=np.linspace(0,1,h)[:,None]
    ys=np.rint(top+yy*(bottom-top-curve*np.sin(theta)**2)).astype(int)
    front=photo[np.clip(ys,0,photo.shape[0]-1),xs[None,:]]
    # Median per column, then a moving average avoids imprinting botanical details.
    bright=np.median(front.mean(axis=2),axis=0)
    smooth=np.convolve(np.pad(bright,(40,40),mode='edge'),np.ones(81)/81,mode='valid')
    gain=np.clip(np.median(smooth)/np.maximum(smooth,1),.84,1.20)
    front=np.uint8(np.clip(front*gain[None,:,None],0,255))
    fi=Image.fromarray(front)
    # Back is reconstructed botanical artwork, never a fictitious ingredients label.
    artwork=fi.crop((0,0,fw,round(h*.32))).resize((fw,round(h*.53)))
    back=Image.new('RGB',(w,h))
    for x in range(0,w,fw):
        back.paste(artwork,(x,0))
        back.paste(ImageOps.flip(artwork),(x,round(h*.49)))
    front_start=(w-fw)//2
    back.paste(fi,(front_start,0))
    # Blend the seam at each side into the continuous botanical reverse.
    arr=np.asarray(back).copy()
    for j in range(24):
        a=(j+1)/25
        for x,edge in ((front_start-j-1,front_start),(front_start+fw+j,front_start+fw-1)):
            arr[:,x]=arr[:,edge]*(1-a)+arr[:,x]*a
    save(Image.fromarray(arr),file+'-wrap',96)

unwrap('15',750,290,789,1594,74)
unwrap('16',742,288,627,1407,67)
for item in inventory['images']:
    im=Image.open(SRC/item['file']).convert('RGB')
    im.thumbnail((1300,1300) if int(pathlib.Path(item['file']).stem)<18 else (460,560))
    save(im,pathlib.Path(item['file']).stem,84)
for name in ['41','38','63','72','18','26']:
    entry=next(i for i in inventory['images'] if pathlib.Path(i['file']).stem==name)
    im=Image.open(SRC/entry['file']).convert('RGB'); im.thumbnail((500,600))
    pixels=np.asarray(im).astype(float)
    # Only the connected paper background becomes transparent; plant colors stay intact.
    paper=np.median(np.concatenate([pixels[:4].reshape(-1,3),pixels[-4:].reshape(-1,3)]),axis=0)
    candidate=(np.linalg.norm(pixels-paper,axis=2)<90)&(pixels.mean(axis=2)>145)
    mask=Image.fromarray(np.uint8(candidate)*255).copy()
    for x in range(0,im.width,10):
        for y in [0,im.height-1]:
            if mask.getpixel((x,y))==255: ImageDraw.floodfill(mask,(x,y),128,thresh=0)
    for y in range(0,im.height,10):
        for x in [0,im.width-1]:
            if mask.getpixel((x,y))==255: ImageDraw.floodfill(mask,(x,y),128,thresh=0)
    alpha=Image.fromarray(np.uint8(np.asarray(mask)!=128)*255).filter(ImageFilter.GaussianBlur(.35))
    im=im.convert('RGBA');im.putalpha(alpha);save(im,name+'-botanical',88)
print('Prepared real product cutouts, cylindrical labels, and all 78 official photographs.')
