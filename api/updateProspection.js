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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const sheetId = process.env.SHEET_ID;

    if (!apiKey || !sheetId) {
      return res.status(500).json({ error: "Clés API manquantes" });
    }

    const sheetName = "Base_ehpad"; // ⚠️ mettre EXACTEMENT le nom de ton onglet

    const { rowIndex, date1, date2, commentaires } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const rowNumber = rowIndex + 2; // +1 header +1 index base 0

    // lire les headers
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
    const headerRes = await fetch(headerUrl);
    const headerJson = await headerRes.json();

    const headers = headerJson.values[0];
    const colCount = headers.length;

    const idxDate1 = headers.indexOf("prospection.date1ercontact");
    const idxDate2 = headers.indexOf("prospection.daterappel");
    const idxComments = headers.indexOf("prospection.commentaires");

    if (idxDate1 < 0 || idxDate2 < 0 || idxComments < 0) {
      return res.status(400).json({ error: "Colonnes prospection introuvables" });
    }

    // lire la ligne actuelle
    const lastColLetter = columnLetter(colCount - 1);
    const range = `${sheetName}!A${rowNumber}:${lastColLetter}${rowNumber}`;

    const rowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const rowRes = await fetch(rowUrl);
    const rowJson = await rowRes.json();

    const row = new Array(colCount).fill("");
    (rowJson.values?.[0] || []).forEach((cell, i) => {
      row[i] = cell;
    });

    // mettre à jour la ligne
    row[idxDate1] = date1 || "";
    row[idxDate2] = date2 || "";
    row[idxComments] = commentaires || "";

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${apiKey}`;

    const updateRes = await fetch(updateUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [row],
      }),
    });

    if (!updateRes.ok) {
      const txt = await updateRes.text();
      throw new Error("Google error: " + txt);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "Erreur API", details: err.message });
  }
}
