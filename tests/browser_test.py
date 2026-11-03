"""Headless Chromium regression checks. See BROWSER_TESTS.md."""
import csv
import io
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def translate_path(self, path):
        return super().translate_path(path.removeprefix("/preview"))


def check(page, context, base):
    page.goto(base)
    expect(page.locator('.results-hero-number')).to_have_text('$351.00')
    with page.expect_download() as pending:
        page.get_by_role('button', name='Export settlement CSV').click()
    download = pending.value
    assert download.suggested_filename == 'dayfair-reconciliation.csv'
    rows = list(csv.reader(io.StringIO(Path(download.path()).read_text(encoding='utf-8-sig'))))
    assert rows[0] == ['Bill','From','To','Payer','Member','Days present','Residence days','Usage share','Fixed share','Total due','Currency']
    assert ['Member','Total paid','Total owed','Net balance','Currency'] in rows
    assert ['From','To','Settlement','Currency'] in rows
    assert len(rows) == 19
    with page.expect_download() as pending:
        page.locator('#backupBtn').click()
    backup = Path(pending.value.path()).read_bytes()
    expected = json.loads(backup)['data']
    assert json.loads(backup)['format'] == 'dayfair-v1'
    fixed = page.locator('[data-kind="bill"]').first.locator('[data-field="fixed"]')
    fixed.fill('999999')
    expect(page.locator('#csvBtn')).to_be_disabled()
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#importInput').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':backup})
    expect(page.locator('#toast')).to_have_text('Backup restored successfully.')
    expect(page.locator('.results-hero-number')).to_have_text('$351.00')
    assert page.evaluate("JSON.parse(localStorage.getItem('dayfair-household-v1'))") == expected
    page.reload()
    expect(page.locator('.results-hero-number')).to_have_text('$351.00')
    page.locator('#importInput').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'})
    expect(page.locator('#toast')).to_contain_text('Could not restore backup')
    assert page.evaluate("JSON.parse(localStorage.getItem('dayfair-household-v1'))") == expected


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
            browser = pw.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
            context = browser.new_context(accept_downloads=True, viewport={"width": 1280, "height": 900})
            context.tracing.start(screenshots=True, snapshots=True, sources=True)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            try:
                check(page, context, f"http://127.0.0.1:{server.server_port}/preview/")
                assert not errors, errors
                print("Browser regressions passed")
            except Exception:
                artifacts = ROOT / "test-results"
                artifacts.mkdir(exist_ok=True)
                page.screenshot(path=str(artifacts / "failure.png"), full_page=True)
                context.tracing.stop(path=str(artifacts / "trace.zip"))
                raise
            finally:
                context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    main()
