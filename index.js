const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

require('dotenv').config()

const cors = require('cors');
app.use(cors());
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yjrwkkd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log('Database connected');
    }
    finally {

    }
}
run().catch(console.dir);

console.log(uri)
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Doctor app listening on port ${port}`)
})