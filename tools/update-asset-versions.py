"""Refresh local script/style version strings after editing site assets. No build required."""
from pathlib import Path
import re,hashlib
root=Path(__file__).resolve().parent.parent
pages=['index.html','en.html','bryllup.html','bryllup-en.html','firmafest.html','firmafest-en.html','privatliv.html','privacy.html']
pattern=re.compile(r'(src|href)="(assets/[^"?]+\.(?:js|css))(?:\?v=[^"?]+)?"')
def version(match):
 path=root/match[2]
 if not path.is_file():raise FileNotFoundError(path)
 digest=hashlib.sha256(path.read_bytes()).hexdigest()[:12]
 return f'{match[1]}="{match[2]}?v={digest}"'
for file in pages:
 path=root/file
 path.write_text(pattern.sub(version,path.read_text()))
print(f'Updated script/style versions in {len(pages)} pages.')
