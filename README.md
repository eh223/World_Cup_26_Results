# World Cup Predictor Results Site

This is the GitHub Pages results website for viewing predictions and live scores from your Google Sheet.

## What it shows

- Live leaderboard from the `Scoreboard` sheet
- Predictions by person from the `Predictions` sheet
- Predictions by type from the `Predictions` sheet
- Match ordering from the `Match dates` sheet
- Latest completed match included in the results
- Correct/incorrect colouring for completed match result and score predictions
- Remaining possible points/remaining teams or scorers in the live scoreboard

The website does **not** calculate scores. It displays whatever is already in your Google Sheet.

## The only configuration lines you should edit

There are two configuration lines, both at the very top of their files.

### 1. In `Code.gs`

Paste your Google Sheet ID here:

```js
const SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
```

Use only the long ID from the sheet URL, not the full URL.

For example, if your sheet URL is:

```text
https://docs.google.com/spreadsheets/d/1qfWV73gg20PFDuBllVcIj2YhNd9hSg1nndhsNdJ7FhQ/edit#gid=491008128
```

then use only:

```js
const SPREADSHEET_ID = '1qfWV73gg20PFDuBllVcIj2YhNd9hSg1nndhsNdJ7FhQ';
```

The sheet names are also listed at the top of `Code.gs`. Only change them if you rename tabs in the Google Sheet.

### 2. In `app.js`

Paste your Apps Script Web App `/exec` URL here:

```js
const DATA_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
```

It should look like:

```js
const DATA_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Keep the quotes and semicolon.

## Set up the Google Sheet endpoint

1. Open your scoring Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Paste in the contents of `Code.gs` from this ZIP.
4. Replace `PASTE_YOUR_SPREADSHEET_ID_HERE` with your spreadsheet ID.
5. Click **Save**.
6. Click **Deploy → New deployment**.
7. Click the cog/settings icon and choose **Web app**.
8. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Click **Deploy** and authorise it.
10. Copy the Web App URL. It should end with `/exec`.
11. Paste that `/exec` URL into the `DATA_URL` line at the top of `app.js`.

If you later edit `Code.gs`, go to **Deploy → Manage deployments → Edit → New version → Deploy**. Otherwise Google may keep serving the old version.

## Publish on GitHub Pages

1. Create or open your GitHub repository for the results site.
2. Upload `index.html`, `styles.css`, `app.js`, `Code.gs`, and this `README.md`.
3. Go to **Settings → Pages**.
4. Choose **Deploy from a branch**, branch `main`, folder `/root`.
5. Wait for **Actions → pages-build-deployment** to show a green tick.
6. Open your public GitHub Pages URL.

## Updating scores

When you change scores in the Google Sheet, the website will update automatically the next time someone loads or refreshes it. No GitHub upload is needed.

## Expected Google Sheet tabs

This version expects these tab names:

- `Predictions`
- `Scoreboard`
- `Game_Results`
- `Match dates`
- `Teams`
- `Scorers`
- `Bonus Qs`

The `Match dates` tab is used for match ordering and for the “Updated to include…” message.

## Latest feature notes

- “Updated to include” works with knockout matches from the `Match dates` tab.
- The live scoreboard shows red remaining figures in parentheses.
- `*` means total possible predicting points remaining.
- `**` means total teams/individual scorers remaining.
