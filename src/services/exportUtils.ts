export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  // UTF-8 BOM for Excel Khmer and Unicode support
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportToCSV = exportToCsv;

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][], sheetName = 'Report') {
  const tableHeaders = headers.map(h => `<th style="background-color:#1E3A8A; color:#FFFFFF; font-weight:bold; border:1px solid #CBD5E1; padding:8px;">${h}</th>`).join('');
  const tableRows = rows.map(r => 
    `<tr>${r.map(cell => `<td style="border:1px solid #E2E8F0; padding:6px;">${cell ?? ''}</td>`).join('')}</tr>`
  ).join('');

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>${sheetName}</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
      </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <h2 style="font-family:'Khmer OS Battambang', 'Battambang', Arial, sans-serif; color:#0F172A;">${sheetName}</h2>
      <p style="font-family:'Khmer OS Battambang', 'Battambang', Arial, sans-serif; font-size:12px; color:#64748B;">Generated: ${new Date().toLocaleString()}</p>
      <table style="border-collapse:collapse; font-family:'Khmer OS Battambang', 'Battambang', Arial, sans-serif; font-size:13px;">
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrint() {
  window.print();
}

export function printReport(elementId = 'report-print-area') {
  window.print();
}
