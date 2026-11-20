import express from 'express';
import cors from "cors";
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

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

const collection = db.collection("user");
const services = db.collection("services")

app.get('/', (req, res) => {
  res.send('Hello World!')
})

///admin api
app.get("/users", async(req,res)=>{
     try {
    const result = await collection.find({}).toArray();

    res.status(200).send({
      success: true,
      message: "User fetched successfully",
      data: result,
    });

  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
      data: [],
    });
  }
 });

 app.post("/admin/add-service", async(req,res)=>{
  // const service = req.body
  // const result = await services.insertOne(service);
  // res.send(result);
  try {
    const service = req.body;

    if(!service.image){
      return res.status(400).send({
        seccess: false,
        message: "Service image is required",
      });
    }
    const result = await services.insertOne(service);

    res.status(201).send({
      success: true,
      message: "Service created successfully",
      result,
    });

  } catch (error) {
    console.error("Service creation error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create service",
    });
  }
 });

 app.get("/admin/services", async(req,res)=>{

    try {
      const result = await services.find().toArray();
      res.status(200).send({
        success: true,
        message: "Service fetched successfully",
        data: result,
      })
      
    } catch (error) {
      console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch services",
      data: [],
    });
    }
 })

app.delete("/admin/service/:id", async(req,res)=>{

  // const{id} = req.params
  // const result = await services.deleteOne({_id:new ObjectId(id)});
  // res.send(result);
  try {
    
    const {id} = req.params;

    if(!ObjectId.isValid(id)){
      return res.status(400).send({ message: "Invalid service ID" });
    }

    const result = await services.deleteOne({_id:new ObjectId(id)});

    if(result.deletedCount === 0){
      return res.status(400).send({ message: "Service not found" });
    }

    res.status(200).send({
      message: "Service deleted Successfully",
      result
    })

  } catch (error) {
    res.status(500).send({
      message: "Failed to delete service",
      error: error.message,
    });
  }
})


//

app.listen(process.env.PORT || 8000, ()=>{
    console.log("Server is running on port 8000");
})