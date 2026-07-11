require("dotenv").config();
const { Client } = require("pg");
(async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); const result = await client.query('SELECT slug, COUNT(*) as count FROM "Role" GROUP BY slug HAVING COUNT(*) > 1;'); console.log(JSON.stringify(result.rows, null, 2)); await client.end(); })();