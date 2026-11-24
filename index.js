import express from 'express';
import cors from "cors";
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from "stripe";
import { jwtVerify, createRemoteJWKSet } from 'jose'

const app = express();

app.use(cors());
app.use(express.json());

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
const bookings = db.collection("bookings");
const payments = db.collection("payments");

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
);

const checkAuthenticatedUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const { payload, protectedHeader } = await jwtVerify(
      token,
      JWKS,
      {
        issuer: "http://localhost:3000",
        audience: "http://localhost:3000",
        algorithms: ["EdDSA"],
      }
    );

    console.log("JWT HEADER:", protectedHeader);
    console.log("JWT PAYLOAD:", payload);

    req.user = payload;

    next();

  } catch (error) {
    console.error("JWT ERROR NAME:", error.name);
    console.error("JWT ERROR MESSAGE:", error.message);

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyRole = (roles) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (roles.includes(role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource",
    });
  };
};

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/users/counts", async(req,res)=>{
  try {

    const count = await collection.countDocuments();
    res.send({
    success: true,
    count: count
  });
    
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to count users"
    });
  }
})

///admin api
app.get("/users",checkAuthenticatedUser,verifyRole(["admin"]) , async(req,res)=>{
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

app.patch("/admin/service/:id", async(req,res)=>{
  // const{id} = req.params;
  // const updateData = req.body
  // const result = await services.updateOne(
  //   {_id:new ObjectId(id)},
  //   {$set:updateData}
  // )
  // res.json(result)

   try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid service ID",
      });
    }

    // Validate request body
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No update data provided",
      });
    }

    // Update service
    const result = await services.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Check service existence
    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Service updated successfully",
      
    });

  } catch (error) {
    console.error("Service update error:", error);

    res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
})

app.get("/services", async(req,res)=>{
    try {
      const result = await services
        .find({ active: true })
        .toArray();

      res.status(200).send({
        success: true,
        message: "Active services data fetched successfully",
        data: result,
      });

  } catch (error) {
    console.error("Error fetching services:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch services",
    });
  }
});
app.get("/sevices/limit", async(req,res)=>{
  // const result = await services
  //       .find({ active: true })
  //       .limit(6)
  //       .toArray();

   try {
    const result = await services
      .find({ active: true })
      .limit(6)
      .toArray();

    res.status(200).send({
      success: true,
      message: "Latest 6 active services fetched successfully",
      data: result,
    });

  } catch (error) {
    console.error("Error fetching services:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch services",
    });
  }
})

app.get("/service/:id", async(req,res)=>{
  // const{id} = req.params;
  // const result = await services.findOne({_id:new ObjectId(id)});
  // res.send(result);
   try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid service ID",
      });
    }

    const result = await services.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Service fetched successfully",
      data: result,
    });

  } catch (error) {
    console.error("Error fetching service:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch service",
    });
  }
})

app.get("/services/count", async(req,res)=>{
  try {
    const activeServices = await services.countDocuments({active: true});
    res.send({
    success: true,
    activecount: activeServices
  });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to count services"
    });
  }
})
//

// app.post("/booking", checkAuthenticatedUser, async (req, res) => {
// app.post("/booking", async (req, res) => {
//   try {
//     const { serviceId, date, time, specialRequest } = req.body || {};

//     // User identity must come from the verified JWT, not from the request body
//     const userId = req.user?.id || req.user?.sub;
//     const customerName = req.user?.name;
//     const customerEmail = req.user?.email;

//     if (!userId || !customerName || !customerEmail) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid login session. Please login again.",
//       });
//     }

//     // Validate required fields
//     if (!serviceId || !date || !time) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide service, date and time",
//       });
//     }

//     // Validate service ID
//     if (!ObjectId.isValid(serviceId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid service ID",
//       });
//     }

//     // Validate date (YYYY-MM-DD) and time (HH:mm)
//     const parsedDate = new Date(`${date}T00:00:00Z`);

//     if (
//       typeof date !== "string" ||
//       !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
//       Number.isNaN(parsedDate.getTime()) ||
//       parsedDate.toISOString().slice(0, 10) !== date
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Date must be a valid date in YYYY-MM-DD format",
//       });
//     }

//     if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
//       return res.status(400).json({
//         success: false,
//         message: "Time must be in HH:mm format (24-hour)",
//       });
//     }

//     const now = new Date();
//     const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
//       2,
//       "0"
//     )}-${String(now.getDate()).padStart(2, "0")}`;

//     if (date < today) {
//       return res.status(400).json({
//         success: false,
//         message: "Booking date cannot be in the past",
//       });
//     }

//     // Check whether service exists
//     const service = await services.findOne({
//       _id: new ObjectId(serviceId),
//       active: true,
//     });

//     if (!service) {
//       return res.status(404).json({
//         success: false,
//         message: "Service not found or inactive",
//       });
//     }

//     const serviceObjectId = new ObjectId(serviceId);

//     // Prevent duplicate bookings for the same service, date and time
//     const existingBooking = await bookings.findOne({
//       userId,
//       serviceId: serviceObjectId,
//       date,
//       time,
//       status: { $nin: ["cancelled", "rejected"] },
//     });

//     if (existingBooking) {
//       return res.status(409).json({
//         success: false,
//         message:
//           "You already have a booking for this service at this date and time",
//       });
//     }

//     // Create booking
//     const bookingData = {
//       serviceId: serviceObjectId,
//       userId,
//       customerName,
//       customerEmail,
//       date,
//       time,
//       specialRequest:
//         typeof specialRequest === "string"
//           ? specialRequest.trim().slice(0, 500)
//           : "",
//       serviceName: service.name,
//       price: service.price,
//       duration: service.duration,
//       status: "pending",
//       paymentStatus: "unpaid",
//       approved: false,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const result = await bookings.insertOne(bookingData);

//     res.status(201).json({
//       success: true,
//       message: "Booking successful",
//       data: {
//         _id: result.insertedId,
//         ...bookingData,
//       },
//     });
//   } catch (error) {
//     console.error("Booking creation error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to create booking",
//     });
//   }
// });

// app.get("/bookings-list", async (req, res) => {
//   try {
//     const allBookings = await bookings.find().toArray();

//     res.status(200).json({
//       success: true,
//       total: allBookings.length,
//       bookings: allBookings,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });
app.get("/bookings-list/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const myBookings = await bookings.find({
      customerEmail: email,
    }).toArray();

    res.status(200).json({
      success: true,
      total: myBookings.length,
      bookings: myBookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// app.get("/bookings",checkAuthenticatedUser, verifyRole(["admin"]),async (req, res, next) => {
app.get("/bookings",async (req, res, next) => {
    try {
      const allBookings = await bookings
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.status(200).json({
        success: true,
        total: allBookings.length,
        bookings: allBookings.map((booking) => ({
          ...booking,
          _id: booking._id.toString(),
          serviceId: booking.serviceId.toString(),
          createdAt: booking.createdAt?.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);
// app.patch("/bookings/:id/status",checkAuthenticatedUser,verifyRole(["admin"]),async (req, res, next) => {
app.patch("/bookings/:id/status",async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }

      if (!["confirmed", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be confirmed or rejected",
        });
      }
      const result = await bookings.updateOne(
        {
          _id: new ObjectId(id),
          status: "pending",
        },
        {
          $set: {
            status,
            approved: status === "confirmed",
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found or already processed",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Booking ${status} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
);
app.patch("/admin-bookings/:id/status", async (req, res) => {
 const {id} = req.params
 const result = await bookings.updateOne(
    {
      _id: new ObjectId(id),
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        approved: false,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.send({
      success: false,
      message: "Booking not found",
    });
  }

  res.send({
    success: true,
    message: "Booking rejected successfully",
  });
});

// app.patch( "/bookings/:id/cancel",checkAuthenticatedUser,verifyRole(["user"]),async (req, res, next) => {
app.patch( "/bookings/:id/cancel",async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }
      const userId = req.user?.id || req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found",
        });
      }
      const result = await bookings.updateOne(
        {
          _id: new ObjectId(id),
          userId:userId,
          status: { $in: ["pending", "rejected"] },
        },
        {
          $set: {
            status: "rejected",
            approved: false,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found or cannot be cancelled",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      
    }
  }
);
////////////////////////// change ////////////////////
app.post("/payments/checkout-verify", async(req,res)=>{
  const{sessionId} =req.body;
  
  const {
      status,
      payment_status,
      customer_details,
      metadata,
      payment_intent,
    } = await stripe.checkout.sessions.retrieve(sessionId);

    
    if(status === "complete" && payment_status === "paid"){


      const sessionQuery = {sessionId};
      const existingPayment = await payments.findOne(sessionQuery);
      if(!existingPayment){
        return res.send({success:false, message:'Payment already verified'});
      }

      const payment ={
        sessionId,
        status,
        payment_status,
        customer_details,
        userId:metadata.userId,
        paymet_date:new Date(),
        payment_intent,
      }

      const result = await payments.insertOne(payment);
      const query = {_id:new ObjectId(metadata.userId)};
      const updateDoc ={
        $set:{
          premium:true,
        }
      }

      const updateResult = await collection.updateOne(
        query,
        updateDoc
    );
     res.send({
      success: true,
      result,
      updateResult,
    });
     return
    }

  res.send({success:false,message:"Payment verification failed"});
})
/////////////////////////////////////////////////////


app.listen(process.env.PORT || 8000, ()=>{
    console.log("Server is running on port 8000");
})