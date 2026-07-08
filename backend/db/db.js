const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// In‑memory data
let dbData = null;

// Load or initialise DB
function loadData() {
  if (!fs.existsSync(DB_PATH)) {
    dbData = { users: [], presets: [], downloads: [], orders: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
  } else {
    const content = fs.readFileSync(DB_PATH, 'utf8');
    dbData = JSON.parse(content);
  }
}

// Save DB
function saveData() {
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
}

// Async getDB (matching the old interface)
async function getDB() {
  if (!dbData) loadData();
  return {
    data: dbData,
    write: async () => { saveData(); },
    read: () => { loadData(); }   // optional, for consistency
  };
}

module.exports = { getDB };