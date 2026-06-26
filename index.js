const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const uri = process.env.MONGO_DB_URI;

const app = express();

const PORT = 5000;
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("legalease_db");
    const legalEaseCollection = db.collection("lawyers");

    app.get("/lawyers", async (req, res) => {
  try {
    const {
      search,
      specialization,
      page = 1,
      limit = 8,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          specialization: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (specialization && specialization !== "all") {
      query.specialization = specialization;
    }

    const currentPage = Number(page);
    const perPage = Number(limit);

    const total = await legalEaseCollection.countDocuments(query);

    const lawyers = await legalEaseCollection
      .find(query)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .toArray();

    res.send({
      lawyers,
      total,
      currentPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});

app.get("/lawyers/:id", async (req, res) => {
      const { id } = req.params;

      const result = await legalEaseCollection.
      findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine");
});

app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`);
});
