import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const URI = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USER;
const PASSWORD = process.env.NEO4J_PASSWORD;
const DATABASE = process.env.NEO4J_DATABASE;

let driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
export async function runQuery(cypher, params = {}) {
  const sessionConfig = {};
  if (DATABASE && DATABASE.trim() !== '') {
    sessionConfig.database = DATABASE;
  }
  const session = driver.session(sessionConfig);
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
};

export async function closeDriver() {
  await driver.close();
}

process.on('exit', () => driver.close());