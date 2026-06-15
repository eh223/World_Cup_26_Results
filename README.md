# World Cup Predictor Results Site

This is a separate GitHub Pages site for viewing predictions and live scores from your Google Sheet.

## What it shows

- Live leaderboard from the `Scoreboard` sheet
- Predictions by person from the `Predictions` sheet
- Predictions by category from the `Predictions` sheet
- Score breakdowns from the `Scoreboard` sheet
- Individual scoring detail from each participant's sheet
- Read-only views of `Game_Results`, `Teams`, `Scorers` and `Bonus Qs`

The website does **not** calculate scores. It displays whatever is already in your Google Sheet.

## Set up the Google Sheet endpoint

1. Open your scoring Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Create a new Apps Script project, or add a new file in the existing project.
4. Paste in the contents of `Code.gs` from this ZIP.
5. Click **Save**.
6. Click **Deploy → New deployment**.
7. Click the cog/settings icon and choose **Web app**.
8. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Click **Deploy** and authorise it.
10. Copy the Web App URL. It should end with `/exec`.

## Connect the website to the Sheet

1. Open `app.js`.
2. Replace this line:

```js
const DATA_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
```

with your real `/exec` URL, for example:

```js
const DATA_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Keep the quotes and semicolon.

## Publish on GitHub Pages

1. Create a new GitHub repository, e.g. `world-cup-results`.
2. Upload `index.html`, `styles.css`, `app.js`, `Code.gs`, and this `README.md`.
3. Go to **Settings → Pages**.
4. Choose **Deploy from a branch**, branch `main`, folder `/root`.
5. Wait for **Actions → pages-build-deployment** to show a green tick.
6. Open your public GitHub Pages URL.

## Updating scores

When you change scores in the Google Sheet, the website will update automatically the next time someone loads or refreshes it. No GitHub upload is needed.

If you later edit `Code.gs`, go to **Deploy → Manage deployments → Edit → New version → Deploy**. Otherwise Google may keep serving the old version.

## Latest changes

This version expects the `Predictions` sheet to use the newer structure:

- Column A: date/match order, such as `13th - Match 2`
- Column B: internal match/prediction code, such as `C1`
- Column C: readable prediction label, such as `Brazil v Morocco`
- Column D onwards: participant predictions

Match result and score prediction views are ordered by Column A. Completed match predictions are coloured green for correct and red for wrong, using the `Game_Results` sheet. The front page also shows the latest completed match included in the results.


## Match dates sheet

This version reads the match display order from the `Match dates` tab. That tab should have:

- Column A: display label, e.g. `13th - Match 2`
- Column B: match name, e.g. `Brazil v Morocco`

The website uses that sheet to order match results and score predictions, and to show the latest completed match in the header.

## Spreadsheet ID in Apps Script

In `Code.gs`, replace:

```js
const SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
```

with only the long ID from your Google Sheet URL, not the whole URL.
