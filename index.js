const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

require('dotenv').config()

const cors = require('cors');
app.use(cors());
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yjrwkkd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).res.send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next()
    });
}

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection('services');
        const bookingCollection = client.db("doctors_portal").collection('bookings');
        const usersCollection = client.db("doctors_portal").collection('users');
        const doctorCollection = client.db("doctors_portal").collection('doctors');

        const verifyAdmin = async (req, res, next) => {
            const requister = req.decoded.email;
            const requisterAccount = await usersCollection.findOne({ email: requister });
            if (requisterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }



        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();
            res.send(services)
        })

        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })

        app.get('/booking', verifyJWT, async (req, res) => {
            const patient = req.query.patient;
            const decodedEmail = req.decoded.email
            if (patient === decodedEmail) {
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send({ success: true, result });
        })

        // Warning: This is not the proper way to query multiple collection. we should use Aggregation pipeline
        // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            const date = req.query.date || "Feb 13, 2023";

            // step 1:  get all services
            const services = await serviceCollection.find().toArray();

            // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each services, find bookings for the service
            services.forEach(service => {
                // ste p4: find bookings from that service. output:[{},{}]
                const serviceBookings = bookings.filter(b => b.treatment === service.name);
                // step 5: select slots for the service bookings: ["",""]
                const booked = serviceBookings.map(s => s.slot);
                // step 6: select those slots that are mot in booked
                const available = service.slots.filter(s => !booked.includes(s))
                // step 7: set available to slots to make it easier
                service.slots = available;
            })

            res.send(services);
        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token })
        })

        app.post('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
        })

        /**
   * API Naming Convention
   * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
   * app.get('/booking/:id') // get a specific booking 
   * app.post('/booking') // add a new booking
   * app.patch('/booking/:id) //
   * app.put('/booking/:id') // upsert ==> update or insert
   * app.delete('/booking/:id) //
  */



    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Worldzzz!')
})

app.listen(port, () => {
    console.log(`Doctor app listening on port ${port}`)
})

/**
 * API Naming Convention
 * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
 * app.get('/booking/:id') // get a specific booking 
 * app.post('/booking') // add a new booking
 * app.patch('/booking/:id) // update 
 * app.delete('/booking/:id) //
*/