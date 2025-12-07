import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const sheetId = process.env.SHEET_ID;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!sheetId || !serviceAccountJson) {
      return res.status(500).json({ error: "Variables d'environnement manquantes" });
    }

    // Authentification Service Account
    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Récupération du payload
    const { rowIndex, date1, date2, commentaires } =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    const numRow = Number(rowIndex) + 2; // Ligne réelle (1 = header)
    if (!Number.isFinite(numRow) || numRow < 2) {
      return res.status(400).json({ error: 'Index de ligne invalide' });
    }

    const sheetName = 'Base_ehpad'; // ⚠️ Nom exact de ton onglet

    // Lecture des en-têtes
    const headerResult = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!1:1`
    });

    const headers = headerResult.data.values?.[0] || [];

    const idx1 = headers.indexOf('prospection.date1ercontact');
    const idx2 = headers.indexOf('prospection.daterappel');
    const idx3 = headers.indexOf('prospection.commentaires');

    if (idx1 < 0 || idx2 < 0 || idx3 < 0) {
      return res.status(400).json({ error: 'Colonnes prospection introuvables' });
    }

    // Lecture de la ligne actuelle
    const rowResult = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${numRow}:${numRow}`
    });

    const row = rowResult.data.values?.[0] || [];
    while (row.length < headers.length) row.push('');

    // Modification
    row[idx1] = date1 || '';
    row[idx2] = date2 || '';
    row[idx3] = commentaires || '';

    // Écriture
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!${numRow}:${numRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Erreur API Google:', err);
    return res.status(500).json({ error: 'Erreur API', details: err.message });
  }
}
