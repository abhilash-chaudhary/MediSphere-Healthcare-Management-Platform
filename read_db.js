const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('medisphere_auth');
    const users = database.collection('user');

    const userList = await users.find({}).toArray();
    console.log(JSON.stringify(userList, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
