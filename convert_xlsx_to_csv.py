"""Convertir Base_EHPAD.xlsx en base_ehpad.csv sans dépendances externes.

Le fichier Excel est lu via zipfile + xml afin d'éviter l'installation de bibliothèques externes.
"""
from __future__ import annotations

import csv
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_to_index(cell_ref: str) -> int:
    col = "".join(filter(str.isalpha, cell_ref))
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def read_xlsx(path: Path):
    with ZipFile(path) as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", NS):
                texts = [t.text or "" for t in si.findall(".//main:t", NS)]
                shared_strings.append("".join(texts))

        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        for row in sheet.findall(".//main:sheetData/main:row", NS):
            row_values: list[str] = []
            for cell in row.findall("main:c", NS):
                cell_type = cell.get("t")
                value = ""
                if cell_type == "s":
                    v_el = cell.find("main:v", NS)
                    if v_el is not None and v_el.text is not None:
                        idx = int(v_el.text)
                        value = shared_strings[idx] if idx < len(shared_strings) else ""
                elif cell_type == "inlineStr":
                    t_el = cell.find("main:is/main:t", NS)
                    value = t_el.text if t_el is not None else ""
                elif cell_type == "b":
                    v_el = cell.find("main:v", NS)
                    value = "TRUE" if v_el is not None and v_el.text == "1" else "FALSE"
                else:
                    v_el = cell.find("main:v", NS)
                    value = v_el.text if v_el is not None else ""

                idx = col_to_index(cell.get("r"))
                while len(row_values) <= idx:
                    row_values.append("")
                row_values[idx] = value
            yield row_values


def write_csv(rows, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def main():
    rows = list(read_xlsx(Path("Base_EHPAD.xlsx")))
    write_csv(rows, Path("base_ehpad.csv"))
    print(f"Écrit {len(rows)} lignes dans base_ehpad.csv")


if __name__ == "__main__":
    main()
