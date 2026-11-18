/** Small RFC-4180-style CSV parser (quoted cells, escaped quotes, CRLF, BOM). */
export function csvRows(input) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const csv = input.replace(/^﻿/,'').replace(/\r\n?/g,'\n') + '\n';
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index++; }
      else if (quoted || !cell) quoted = !quoted;
      else throw Error('Check the quotation marks in the CSV.');
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell.trim());
      cell = '';
      if (char === '\n') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else cell += char;
  }
  if (quoted) throw Error('Check the quotation marks in the CSV.');
  return rows;
}

export function sampleRoster() {
  const names = ['Asha Rao','Dev Patel','Mira Shah','Kabir Das','Ira Nair','Leena Bose','Kiran Menon','Jai Roy','Neha Singh','Anil Rao','Uma Sen','Ravi Shah'];
  return {filename:'sample-roster.csv',count:names.length,sample:names[0],csv:'name,role,id\n' + names.map((name,index) => `${name},Staff,DEMO-${index + 1}`).join('\n')};
}

/** Validate a roster file and return {filename,count,sample,csv}; throws Error with a user-facing message. */
export async function parseRoster(file,item) {
  if (!/\.csv$/i.test(file.name) || file.size > 1024 * 1024) throw Error('Choose a CSV file up to 1 MB.');
  const csv = await file.text();
  const [header,...rows] = csvRows(csv);
  const nameIndex = header?.findIndex(cell => cell.toLowerCase() === 'name') ?? -1;
  if (nameIndex < 0 || !rows.length || rows.some(row => row.length !== header.length || !row[nameIndex])) throw Error('Use a name column and enter a name for every row.');
  if (rows.length > item.max) throw Error(`Use ${item.max.toLocaleString('en-IN')} names or fewer per roster.`);
  return {filename:file.name,count:rows.length,sample:rows[0][nameIndex],csv};
}
