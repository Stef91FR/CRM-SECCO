function columnLetter(index) {
  let n = index;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const sheetId = process.env.SHEET_ID;

    if (!apiKey || !sheetId) {
      return res.status(500).json({ error: "Variables d'environnement manquantes" });
    }

    const range = 'Base_ehpad';

    const bodyPayload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { rowIndex, date1, date2, commentaires } = bodyPayload;

    const parsedIndex = Number(rowIndex);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
      return res.status(400).json({ error: 'Index de ligne invalide' });
    }

    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

    const headerUrl = `${baseUrl}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const headerResponse = await fetch(headerUrl);
    if (!headerResponse.ok) {
      const text = await headerResponse.text();
      throw new Error(`Lecture des headers échouée (${headerResponse.status}): ${text}`);
    }
    const headerData = await headerResponse.json();

    const headers = headerData.values?.[0] || [];
    const idxDate1 = headers.indexOf('prospection.date1ercontact');
    const idxDate2 = headers.indexOf('prospection.daterappel');
    const idxComments = headers.indexOf('prospection.commentaires');

    if (idxDate1 < 0 && idxDate2 < 0 && idxComments < 0) {
      return res.status(400).json({ error: 'Colonnes de prospection introuvables' });
    }

    const rowNumber = parsedIndex + 2;
    const lastColumnLetter = columnLetter(Math.max(headers.length - 1, 0));
    const rowRange = `${range}!A${rowNumber}:${lastColumnLetter}${rowNumber}`;

    const rowUrl = `${baseUrl}/values/${encodeURIComponent(rowRange)}?key=${apiKey}`;
    const rowResponse = await fetch(rowUrl);
    if (!rowResponse.ok) {
      const text = await rowResponse.text();
      throw new Error(`Lecture de la ligne échouée (${rowResponse.status}): ${text}`);
    }
    const rowData = await rowResponse.json();
    const currentRow = Array.from({ length: headers.length }, (_, i) => rowData.values?.[0]?.[i] || '');

    if (idxDate1 >= 0) currentRow[idxDate1] = date1 || '';
    if (idxDate2 >= 0) currentRow[idxDate2] = date2 || '';
    if (idxComments >= 0) currentRow[idxComments] = commentaires || '';

    const updateRange = rowRange;
    const writeUrl = `${baseUrl}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED&key=${apiKey}`;

    const updateResponse = await fetch(writeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        range: updateRange,
        majorDimension: 'ROWS',
        values: [currentRow],
      }),
    });

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      throw new Error(`Écriture Google Sheets échouée (${updateResponse.status}): ${text}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur API', details: err.message });
  }
}
