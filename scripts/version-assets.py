"""Fingerprint local browser resources; run before committing a Pages release."""
from hashlib import sha256
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent

def version(name):
    return sha256((root/name).read_bytes()).hexdigest()[:12]

style=root/'style.css'
css=re.sub(r"url\('([^'?]+)(?:\?v=[^']+)?'\)",lambda m:f"url('{m[1]}?v={version(m[1])}')",style.read_text())
style.write_text(css)
app=root/'app.js'
js=re.sub(r"from '\./([^'?]+)(?:\?v=[^']+)?'",lambda m:f"from './{m[1]}?v={version(m[1])}'",app.read_text())
app.write_text(js)
index=root/'index.html'
html=index.read_text()
for name in ['style.css','app.js']:
    html=re.sub(r'(href|src)="'+re.escape(name)+r'(?:\?v=[^"]+)?"',lambda m:f'{m[1]}="{name}?v={version(name)}"',html)
index.write_text(html)
