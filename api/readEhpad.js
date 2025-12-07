export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const sheetId = process.env.SHEET_ID;

  if (!apiKey || !sheetId) {
    return res.status(500).json({ error: 'Variables d’environnement manquantes.' });
  }

  try {
    const range = encodeURIComponent('Base_ehpad');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Réponse Google Sheets ${response.status}: ${text}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    res.status(200).json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch Google Sheets data.' });
  }
}
