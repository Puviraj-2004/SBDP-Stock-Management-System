import ExcelJS from "exceljs";

type CellValue = string | number | boolean | Date | null | undefined;

export type ExcelSheet = {
  name: string;
  title?: string;
  subtitle?: string;
  columns: string[];
  rows: CellValue[][];
};

function safeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Sheet";
}

export async function workbookResponse(filename: string, sheets: ExcelSheet[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SBDP Stock Management";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(safeSheetName(sheet.name));
    const title = sheet.title ?? sheet.name;
    const headerRowNumber = sheet.subtitle ? 4 : 3;

    worksheet.mergeCells(1, 1, 1, Math.max(sheet.columns.length, 1));
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 15 };
    titleCell.alignment = { vertical: "middle" };

    if (sheet.subtitle) {
      worksheet.mergeCells(2, 1, 2, Math.max(sheet.columns.length, 1));
      const subtitleCell = worksheet.getCell(2, 1);
      subtitleCell.value = sheet.subtitle;
      subtitleCell.font = { size: 11, color: { argb: "FF535851" } };
      subtitleCell.alignment = { vertical: "middle" };
    }

    worksheet.addRow([]);
    worksheet.addRow(sheet.columns);

    for (const row of sheet.rows) {
      worksheet.addRow(row.map((value) => value ?? ""));
    }

    const header = worksheet.getRow(headerRowNumber);
    header.font = { bold: true };
    header.alignment = { vertical: "middle" };
    header.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBE7DD" }
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD9D4C8" } } };
    });

    worksheet.columns.forEach((column, index) => {
      const headerText = sheet.columns[index] ?? "";
      const maxContent = sheet.rows.reduce((max, row) => {
        const value = row[index];
        return Math.max(max, String(value ?? "").length);
      }, headerText.length);
      column.width = Math.min(Math.max(maxContent + 2, 12), 36);
    });

    worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: sheet.columns.length }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
