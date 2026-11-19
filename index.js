import express from 'express';
import cors from "cors";
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.DB_URL);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient = await connectToMongoDB();
const db = connectedClient.db("salon-book")

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(process.env.PORT || 5000, ()=>{
    console.log("Server is running on port 5000");
})