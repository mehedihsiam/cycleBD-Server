const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;







const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.84pml.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Barer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }

    next()
}


async function run() {
    try {
        await client.connect();
        console.log('DB Connected');


        // collections
        const database = client.db("cycleBD");
        const banner = database.collection("banner");
        const footer = database.collection("footer");
        const productCollection = database.collection("products");
        const reviewCollection = database.collection("reviews");
        const orderCollection = database.collection("orders");
        const userCollection = database.collection("users");




        // load banner information to UI
        app.get('/banner', async (req, res) => {
            const cursor = banner.find({});
            const bannerInfo = await cursor.toArray();
            res.send(bannerInfo);
        });

        // load footer data
        app.get('/footer', async (req, res) => {
            const cursor = footer.find({});
            const footerInfo = await cursor.toArray();
            res.send(footerInfo);
        });




        //----------Product related program-------------- \\
        // load products to UI
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({}).sort({ _id: -1 });
            const products = await cursor.toArray();
            res.send(products);
        });

        // post a new product
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        // delete a product by admin
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })




        //----------Orders related program-------------- \\
        // load product details at purchase page
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product)
        });

        // load orderlist for a customer
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { usersEmail: email }
            const cursor = orderCollection.find(query).sort({ _id: -1 });
            const orders = await cursor.toArray();
            console.log(cursor);
            res.send(orders);
        });

        // delete orders by customers
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result);
        });


        // load all orders for admin managing
        app.get('/orders/manage', async (req, res) => {
            const cursor = orderCollection.find({}).sort({ _id: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });



        // place order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);

        });

        // approve order
        app.put('/order/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    orderStatus: status
                },
            };
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // reject order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query)
            res.send(result);
        })







        //----------Reviews related program-------------- \\
        // load reviewss to UI
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({}).sort({ _id: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        });




        // post a review
        app.put('/reviews', async (req, res) => {
            const email = req.query.email;
            const messege = req.body.messege;
            const rating = req.body.rating;
            const img = req.body.img;
            const name = req.body.name;
            const date = req.body.date;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    messege: messege,
                    rating: rating,
                    img: img,
                    name: name,
                    date: date
                }
            }
            const result = await reviewCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        });









        //----------User related program-------------- \\
        // add user data to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        // add user to database when he register with google
        app.put('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user }
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });

        // load user for dashboard
        app.get('/users', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            res.send(user);
        });

        // make a use as an admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const email = req.body.email;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester })
                if (requesterAccount.role === "Admin") {
                    const filter = { email: email };
                    const updateDoc = { $set: { role: 'Admin' } };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.send(result);
                }
            }
            else {
                res.status(403).json({ messege: 'You do not have to access make admin' });
            }


        })





    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running at')
});
app.listen(port, () => {
    console.log('server is running at', port)
})