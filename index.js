const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.84pml.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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

        // load products to UI
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({}).sort({ _id: -1 });
            const products = await cursor.toArray();
            res.send(products);
        });

        // load product details at purchase page
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product)
        });


        // load reviewss to UI
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({}).sort({ _id: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // place order\
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);

        });

        // add user data to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
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