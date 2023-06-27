const path = require("path");
const fs = require('fs');
const { query, db } = require('stardog');
const { conn, dbName } = require("../helpers/constants");
const { wrapWithResCheck } = require("../helpers/wrapWithResCheck");

const data = fs.readFileSync(path.join(__dirname, "data.ttl"), "utf8");
const insertQuery = `insert data { ${data} }`;

const logSuccess = () => console.log(`Created ${dbName}.\n`);
const logFailure = failureReason => console.error(failureReason);

// The "main" method for this script.
const loadData = () => {
  console.log(`Creating ${dbName}...\n`);

  return db
      .drop(conn, dbName) // Drop the db in case it already exists
      .then(() => db.create(conn, dbName)) // Ignore response if it didn't exist
      .then(wrapWithResCheck(() => query.execute(conn, dbName, insertQuery)))
      .then(logSuccess)
      .catch(logFailure);
};

loadData();

