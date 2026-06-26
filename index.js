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
    const commentsCollection = db.collection("comments");

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


    //comment api get

app.get('/comments/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Lawyer ID format" });
    }

    const query = { lawyerId: new ObjectId(id) }; 
    
    const result = await commentsCollection.find(query).toArray();
    
    res.status(200).json(result); 
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post('/comments', async (req, res) => {
  try {
    const { lawyerId, userId, author, date, text, rating } = req.body;

    if (!lawyerId || !userId || !text) {
      return res.status(400).json({ error: "Missing required comment fields." });
    }

    if (!ObjectId.isValid(lawyerId)) {
      return res.status(400).json({ error: "Invalid Lawyer ID format." });
    }

    const newComment = {
      lawyerId: new ObjectId(lawyerId), 
      userId,                          
      author,
      date: date || new Date().toISOString().split('T')[0],
      text,
      rating: rating || 5
    };

    const result = await commentsCollection.insertOne(newComment);

    res.status(201).json({
      message: "Comment posted successfully",
      insertedId: result.insertedId
    });

  } catch (error) {
    console.error("Error inserting comment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
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
