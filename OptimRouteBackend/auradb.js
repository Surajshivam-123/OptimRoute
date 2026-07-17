import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const URI = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USER;
const PASSWORD = process.env.NEO4J_PASSWORD;

let driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
export async function runQuery(cypher, params = {}) {
  // URI examples: 'neo4j://localhost', 'neo4j+s://xxx.databases.neo4j.io'

  // const serverInfo = await driver.getServerInfo()
  // console.log('Connection established')
  // console.log(serverInfo)

  // // Use the driver to run queries

  // await driver.close()
  const session = driver.session({ database: 'optimroute' });
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