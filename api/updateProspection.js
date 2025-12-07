import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
    }

  try {
    const sheetId = process.env.SHEET_ID;
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!sheetId || !serviceAccount) {
      return res.status(500).json({ error: 'Variables manquantes' });
    }

    // ===== 1) Authentification compte de service =====
    const credentials = JSON.parse(serviceAccount);
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // ===== 2) On récupère les données reçues =====
    const { rowIndex, date1, date2, commentaires } = req.body;

    const parsedIndex = Number(rowIndex);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
      return res.status(400).json({ error: 'Index de ligne invalide' });
    }

    const range = 'Base_ehpad';

    // ===== 3) Lecture de la ligne existante pour modification =====
    const headerResult = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${range}!1:1`,
    });

    const headers = headerResult.data.values?.[0] || [];

    const idxDate1 = headers.indexOf('prospection.date1ercontact');
    const idxDate2 = headers.indexOf('prospection.daterappel');
    const idxComments = headers.indexOf('prospection.commentaires');

    if (idxDate1 < 0 && idxDate2 < 0 && idxComments < 0) {
      return res.status(400).json({ error: "Colonnes de prospection absentes" });
    }

    const rowNumber = parsedIndex + 2; // ligne réelle dans sheet (hors header)

    const rowResult = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${range}!${rowNumber}:${rowNumber}`,
    });

    const currentRow = rowResult.data.values?.[0] || [];
    while (currentRow.length < headers.length) currentRow.push('');

    if (idxDate1 >= 0) currentRow[idxDate1] = date1 || '';
    if (idxDate2 >= 0) currentRow[idxDate2] = date2 || '';
    if (idxComments >= 0) currentRow[idxComments] = commentaires || '';

    // ===== 4) Mise à jour =====
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${range}!${rowNumber}:${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [currentRow],
      },
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Erreur API Google:', err);
    return res.status(500).json({ error: 'Erreur API', details: err.message });
  }
}
