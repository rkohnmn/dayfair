# Privacy review

Last reviewed 2026-10-26. Public-facing version: [`privacy.html`](../privacy.html).

- **Collected by Dayfair's own runtime:** none. There are no analytics SDKs, cookies, third-party scripts, API calls, or backend storage.
- **Processed in browser memory:** residents' display names, inclusive residence dates, absences, bill amounts, fixed-fee rules and bill payers. HTML and CSS are hosted as static files.
- **Persisted locally:** JSON of this household in `localStorage`, and a theme string in a separate key. Browser-origin storage is readable to other scripts on the same origin and may be deleted by browser tools; it is not encrypted.
- **User-controlled transfer:** the browser generates CSV/JSON downloads, a text clipboard copy, and print/PDF output only at the user's request. Users should review sensitive information before sharing these files or screenshots.
- **Network boundaries:** content does not leave through Dayfair application code. The GitHub Pages hosting operator and browser/network infrastructure may log page requests. Outbound links (e.g. to GitHub documentation) are opened only if clicked.
- **Deletion:** “Delete saved data” removes the household key and shows an unsaved starter; the separate theme preference remains. Existing exported files, clipboard contents and prints are outside the page's control.
- **Future additions:** any account, hosted sharing, API call or analytics feature would require a new privacy review, opt-in design and revised documentation.
