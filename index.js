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
    const servicesCollection = db.collection("services");
    const commentsCollection = db.collection("comments");
    const hiringCollection = db.collection("hiring");
    const usersCollection = db.collection("user");

    app.get("/lawyers", async (req, res) => {
      try {
        const { search, specialization, page = 1, limit = 8 } = req.query;

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
      try {
        const { id } = req.params;

        // Lawyer
        const lawyer = await legalEaseCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!lawyer) {
          return res.status(404).send({ message: "Lawyer not found" });
        }

        const services = await servicesCollection
          .find({ lawyerId: id })
          .toArray();

        res.send({
          ...lawyer,
          services,
        });
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.post("/lawyers", async (req, res) => {
      try {
        const lawyerData = req.body;
        const result = await legalEaseCollection.insertOne(lawyerData);
        res.status(201).send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/lawyers/user/:userId", async (req, res) => {
      console.log("Param:", req.params.userId);

      const { userId } = req.params;

      const lawyer = await legalEaseCollection.findOne({ userId });

      if (!lawyer) {
        return res.status(404).send({ message: "Lawyer not found" });
      }

      res.send(lawyer);
    });

    app.patch("/lawyers/:userId", async (req, res) => {
      const { userId } = req.params;

      const result = await legalEaseCollection.updateOne(
        { userId },
        {
          $set: req.body,
        },
      );

      res.send(result);
    });

    //comment api get

    app.get("/comments/:id", async (req, res) => {
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

    app.post("/comments", async (req, res) => {
      try {
        const { lawyerId, userId, author, date, text, rating } = req.body;

        if (!lawyerId || !userId || !text) {
          return res
            .status(400)
            .json({ error: "Missing required comment fields." });
        }

        if (!ObjectId.isValid(lawyerId)) {
          return res.status(400).json({ error: "Invalid Lawyer ID format." });
        }

        const newComment = {
          lawyerId: new ObjectId(lawyerId),
          userId,
          author,
          date: date || new Date().toISOString().split("T")[0],
          text,
          rating: rating || 5,
        };

        const result = await commentsCollection.insertOne(newComment);

        res.status(201).json({
          message: "Comment posted successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error inserting comment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/comments/user/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;

        const result = await commentsCollection
          .aggregate([
            { $match: { userId: userId } },
            {
              $lookup: {
                from: "lawyers",
                localField: "lawyerId",
                foreignField: "_id",
                as: "lawyerDetails",
              },
            },

            {
              $unwind: {
                path: "$lawyerDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $project: {
                _id: 1,
                userId: 1,
                date: 1,
                text: 1,
                rating: 1,
                lawyerName: "$lawyerDetails.name",
                lawyerImage: "$lawyerDetails.image",
              },
            },

            { $sort: { _id: -1 } },
          ])
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error("Error with aggregate user comments:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.patch("/comments/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid Comment ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            text: req.body.text,
            rating: req.body.rating,
          },
        };

        const result = await commentsCollection.updateOne(filter, updatedDoc);

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ error: "Comment not found or no changes made" });
        }

        res
          .status(200)
          .json({ message: "Comment updated successfully", result });
      } catch (error) {
        console.error("Error updating comment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.delete("/comments/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid Comment ID format" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await commentsCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Comment not found" });
        }

        res
          .status(200)
          .json({ message: "Comment deleted successfully", result });
      } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    //hiring api

    app.post("/hiring", async (req, res) => {
      try {
        const { lawyerId, lawyerName, specialization, rate, userId } = req.body;

        if (!lawyerId || !lawyerName || !specialization || !rate || !userId) {
          return res.status(400).json({
            message: "All fields are required",
          });
        }

        if (!ObjectId.isValid(lawyerId)) {
          return res.status(400).json({
            message: "Invalid Lawyer ID",
          });
        }

        const hiring = {
          lawyerId: new ObjectId(lawyerId),
          lawyerName,
          specialization,
          rate,
          userId,
          hiringDate: new Date().toISOString().split("T")[0],
          status: "pending",
        };

        const result = await hiringCollection.insertOne(hiring);

        res.status(201).json({
          message: "Hiring request submitted",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: error.message,
        });
      }
    });

    app.get("/hiring/:userId", async (req, res) => {
      const result = await hiringCollection
        .find({
          userId: req.params.userId,
        })
        .sort({ _id: -1 })
        .toArray();

      res.send(result);
    });

    app.get("/lawyer/hiring/:lawyerId", async (req, res) => {
      console.log("Param:", req.params.lawyerId);
      try {
        const { lawyerId } = req.params;

        if (!ObjectId.isValid(lawyerId)) {
          return res.status(400).send({ message: "Invalid lawyer id" });
        }

        const result = await hiringCollection
          .find({
            lawyerId: new ObjectId(lawyerId),
          })
          .sort({ _id: -1 })
          .toArray();

        res.send(result);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    app.patch("/hiring/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid hiring id",
          });
        }

        if (!["accepted", "rejected"].includes(status)) {
          return res.status(400).send({
            message: "Invalid status",
          });
        }

        const result = await hiringCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status,
            },
          },
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: err.message,
        });
      }
    });

    //services api 

app.post("/services", async (req, res) => {
  try {
    const service = req.body;

    const result = await servicesCollection.insertOne(service);

    res.send(result);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/services/:lawyerId", async (req, res) => {
  const { lawyerId } = req.params;
  console.log(lawyerId,"lawyerId");
  

  const result = await servicesCollection
    .find({ lawyerId })
    .toArray();

  res.send(result);
});


app.patch("/services/:id", async (req, res) => {
  const { id } = req.params;

  const updatedData = req.body;

  const result = await servicesCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updatedData,
    }
  );

  res.send(result);
});


app.delete("/services/:id", async (req, res) => {
  const { id } = req.params;

  const result = await servicesCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


//user api

app.get("/user", async (req, res) => {
  const result = await usersCollection
    .find({
      role: { $ne: "admin" },
    })
    .toArray();

  res.send(result);
});

app.patch("/user/role/:id", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { role },
    }
  );

  res.send(result);
});

app.delete("/user/:id", async (req, res) => {
  const { id } = req.params;

  const result = await usersCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
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
