import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const sheets = google.sheets({ version: "v4", auth: process.env.GOOGLE_API_KEY });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Feuille1",   // nom de la première feuille
    });

    const rows = response.data.values || [];

    res.status(200).json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to fetch Google Sheets data." });
  }
}
