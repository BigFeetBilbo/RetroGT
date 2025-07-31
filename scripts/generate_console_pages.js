// Script to generate HTML pages for all consoles in db.json using the Consoles/template.html
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db.json');
const templatePath = path.join(__dirname, '../Consoles/template.html');
const outputDir = path.join(__dirname, '../Consoles');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');

for (const c of db.consoles) {
  let html = template.replace(/\{\{name\}\}/g, c.name).replace(/\{\{id\}\}/g, c.id);
  const fileName = c.name.replace(/[^a-zA-Z0-9]+/g, '_') + '.html';
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, html);
  console.log('Generated:', filePath);
}
