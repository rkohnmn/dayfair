#!/usr/bin/env python3
"""Dependency-free static asset and GitHub Pages subpath audit."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from urllib.request import urlopen
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ['index.html', 'privacy.html', 'assets', 'css', 'js']

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls=[]
    def handle_starttag(self, tag, attrs):
        for key,value in attrs:
            if key in ('href','src') and value:
                self.urls.append((tag,key,value))

def run():
    with tempfile.TemporaryDirectory() as location:
        base=Path(location)
        repo=base/'repository-name'
        repo.mkdir()
        for item in RUNTIME:
            source=ROOT/item
            if source.is_dir():shutil.copytree(source,repo/item)
            else:shutil.copy2(source,repo/item)
        for file in (repo/'index.html',repo/'privacy.html'):
            parser=Links();parser.feed(file.read_text(encoding='utf-8'))
            for tag,attr,raw in parser.urls:
                url=urlsplit(raw)
                if url.scheme in ('http','https','mailto') or raw.startswith('#'):continue
                assert not raw.startswith('/'),f'Root-absolute path {raw}'
                path=(file.parent / url.path).resolve() if url.path else file
                assert path.is_relative_to(repo) and path.exists(),f'Missing link/asset: {file.name} -> {raw}'
        class Quiet(SimpleHTTPRequestHandler):
            def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(base),**kwargs)
            def log_message(self, *args):pass
        server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
        thread=Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            url=f'http://127.0.0.1:{server.server_port}/repository-name/'
            for suffix in ('','privacy.html','css/styles.css','js/app.js','js/engine.js','assets/favicon.svg','assets/og-preview.png'):
                with urlopen(url+suffix,timeout=3) as response:
                    assert response.status==200,(suffix,response.status)
                    assert response.read(),f'Empty file: {suffix}'
        finally:
            server.shutdown();server.server_close()
    print('PASS: all HTML asset links are relative/existing, static GETs return HTTP 200 under /repository-name/')

if __name__=='__main__':run()
