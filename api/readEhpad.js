export default async function handler(req, res) {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!SHEET_ID || !API_KEY) {
      return res.status(500).json({
        error: "Missing Google Sheets environment variables."
      });
    }

    // IMPORTANT : remplacer Feuille1 par le nom EXACT de ton onglet Google Sheet !
    const range = "Base_ehpad";  

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "Google Sheets API error",
        details: text
      });
    }

    const data = await response.json();

    return res.status(200).json({
      data: data.values || []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}
