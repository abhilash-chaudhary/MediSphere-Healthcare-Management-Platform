const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('medisphere_auth');
    const users = database.collection('users');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await users.updateOne(
      { username: 'testdoc' },
      { $set: { otpCode: '123456', otpExpiry: tomorrow } }
    );
    console.log("Updated testdoc OTP");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
