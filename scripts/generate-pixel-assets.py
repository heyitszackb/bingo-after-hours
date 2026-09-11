from pathlib import Path
import math
root=Path('assets')
def sprite(name,stamp=False,red=False,orange=False,gold=False):
    groups={}
    for y in range(32):
        for x in range(32):
            dx=x-15.5;dy=y-15.5;r=math.hypot(dx,dy)
            if r>15.5:continue
            if stamp:
                color='#a9323b' if r>14 else '#ffb090' if r>12 else '#db434a' if r>11 else '#ed625c'
                if r<10 and (x*7+y*13)%37==0:color='#f78170'
            else:
                if r>14.5:color='#775031'
                elif r>12.8:color='#fce2a4' if dx+dy<0 else '#a97b3f'
                elif r>11:color='#edc982' if dx+dy<-5 else '#d4a459' if dx+dy<10 else '#aa773b'
                elif r>9.7:color='#8b653c'
                elif r>8.9:color='#fff2c8' if dy<0 else '#d1b686'
                else:color='#f7e8c5' if dy<2 else '#eddbb4'
                if 10<r<12.8 and (x+y)%4==0 and dx+dy<-8:color='#ffe4a5'
            if red:
                color={'#775031':'#912d38','#fce2a4':'#ffb090','#a97b3f':'#b93d48','#edc982':'#fa8775','#d4a459':'#ed625c','#aa773b':'#c5444b','#8b653c':'#a9323b','#ffe4a5':'#ffc2a1'}.get(color,color)
            if orange:
                color={'#912d38':'#984017','#ffb090':'#ffd28b','#b93d48':'#c86020','#fa8775':'#ffb66b','#ed625c':'#f89035','#c5444b':'#da701f','#a9323b':'#b5551c','#ffc2a1':'#ffe0a8','#db434a':'#e57721','#f78170':'#ffb861'}.get(color,color)
            if gold:
                color={'#a9323b':'#967022','#ffb090':'#fff3ae','#db434a':'#d4a02d','#ed625c':'#f2c54c','#f78170':'#ffe784'}.get(color,color)
            groups.setdefault(color,[]).append(f'M{x} {y}h1v1h-1z')
    paths=''.join(f'<path fill="{color}" d="{"".join(parts)}"/>' for color,parts in groups.items())
    root.joinpath(name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">{paths}</svg>')
sprite('ball.svg',red=True);sprite('coin.svg');sprite('stamp.svg',True)
sprite('ball-orange.svg',red=True,orange=True);sprite('stamp-orange.svg',True,orange=True);sprite('stamp-gold.svg',True,gold=True)
# A tiny repeating, stepped felt pattern, kept low-contrast behind the card.
groups={}
for y in range(64):
    for x in range(64):
        band=int((x+7*math.sin(y/13))/9)%4
        color=['#082e30','#0a3233','#0b3535','#093031'][band]
        if (x*17+y*23)%59==0:color='#123d39'
        groups.setdefault(color,[]).append(f'M{x} {y}h1v1h-1z')
paths=''.join(f'<path fill="{c}" d="{"".join(v)}"/>' for c,v in groups.items())
root.joinpath('felt.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">{paths}</svg>')
