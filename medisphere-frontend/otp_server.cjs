const http = require('http');
const { MongoClient } = require('mongodb');

const server = http.createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db('medisphere_auth');
    const users = database.collection('users');
    const user = await users.findOne({ username: 'testdoc' });
    res.end(user ? user.otpCode : "NOT_FOUND");
  } catch (err) {
    res.end("ERROR: " + err.message);
  } finally {
    await client.close();
  }
});

server.listen(3333, () => {
  console.log('OTP server listening on port 3333');
});
