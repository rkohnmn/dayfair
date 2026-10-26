#!/usr/bin/env python3
"""Optional Chromium UI smoke without web navigation (sandbox-safe).

Requires: pip install playwright; a Chromium executable. Not part of the default
GitHub Actions workflow. The original JS module sources are concatenated only
for the constrained, in-memory smoke surface; production uses ES modules.
"""
from pathlib import Path
import os
import re
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
HTML = HTML.replace('<link rel="stylesheet" href="css/styles.css">',
                    '<style>' + (ROOT / 'css/styles.css').read_text(encoding='utf-8') + '</style>')
HTML = HTML.replace('<script type="module" src="js/app.js"></script>', '')
BUNDLE = '\n'.join(
    re.sub(r'^import .*?;\s*$', '', (ROOT / 'js' / name).read_text(encoding='utf-8'), flags=re.M)
      .replace('export function ', 'function ')
      .replace('export const ', 'const ')
    for name in ('engine.js', 'sample.js', 'export.js', 'app.js')
)

def make_page(browser, width, height):
    page = browser.new_page(viewport={'width':width, 'height':height}, accept_downloads=True)
    page.set_content(HTML)
    page.add_script_tag(content=BUNDLE)
    return page

def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox']
        )
        page = make_page(browser, 1440, 900)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.locator('.results-hero-number').inner_text() == '$351.00'
        assert page.locator('#printReport tbody tr').count() >= 9
        page.screenshot(path=str(ROOT / 'docs/screenshot-desktop.png'), full_page=True)
        page.get_by_role('button', name='Add person').click()
        assert page.locator('[data-kind="person"]').count() == 4
        latest = page.locator('[data-kind="person"]').last
        latest.locator('[data-field="from"]').fill('2026-09-01')
        latest.locator('[data-field="to"]').fill('2026-09-30')
        assert page.locator('.results-hero-number').inner_text() == '$351.00'
        fixed = page.locator('[data-kind="bill"]').first.locator('[data-field="fixed"]')
        fixed.fill('200')
        assert 'larger than' in page.locator('[role="alert"]').inner_text()
        assert page.locator('#csvBtn').is_disabled()
        fixed.fill('30')
        assert page.locator('#csvBtn').is_enabled()
        with page.expect_download() as pending:
            page.get_by_role('button', name='Download report').click()
        assert pending.value.suggested_filename == 'dayfair-reconciliation.csv'
        page.evaluate('window.__printed = false; window.print = () => { window.__printed = true; }')
        page.get_by_role('button',name='Print / PDF').click()
        assert page.evaluate('window.__printed')
        with page.expect_download() as pending:
            page.get_by_role('button', name='Save backup').click()
        path = os.path.join(tempfile.gettempdir(), 'dayfair-browser-smoke.json')
        pending.value.save_as(path)
        page.on('dialog', lambda dialog: dialog.accept())
        page.get_by_role('button', name='Start fresh').click()
        assert page.locator('[data-kind="person"]').count() == 2
        page.locator('#importInput').set_input_files(path)
        assert page.locator('[data-kind="person"]').count() == 4
        page.get_by_role('button', name='Switch to dark theme').click()
        assert page.locator('html').get_attribute('data-theme') == 'dark'
        # Programmatic focus proves button is keyboard focusable.
        page.locator('#backupBtn').focus()
        assert page.evaluate('document.activeElement.id') == 'backupBtn'
        mobile = make_page(browser, 390, 844)
        assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert mobile.locator('.results-hero-number').inner_text() == '$351.00'
        mobile.screenshot(path=str(ROOT / 'docs/screenshot-mobile.png'), full_page=True)
        assert not errors, errors
        browser.close()
    print('PASS: Chromium UI interaction, correction, download, backup restore, theme, 390px layout, screenshots')

if __name__ == '__main__':
    main()
