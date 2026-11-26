import express, { application, json } from 'express';
import cors from "cors";
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from "stripe";

const app = express();

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"];

      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log("Stripe event type:", event.type);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const bookingId = session.metadata?.bookingId;
        const userId = session.metadata?.userId;

        console.log("Booking ID:", bookingId);
        console.log("Payment status:", session.payment_status);

        if (!bookingId) {
          console.log("Booking ID not found!");
          return res.status(400).json({
            error: "Booking ID missing"
          });
        }

        if (session.payment_status !== "paid") {
          return res.status(200).json({
            received: true,
            message: "Payment not completed"
          });
        }

        const result = await bookings.updateOne(
          {
            _id: new ObjectId(bookingId)
          },
          {
            $set: {
              paymentStatus: "paid"
            }
          }
        );
        const data = await payments.insertOne({
          stripeSessionId: session.id,
          userId:userId,
          bookingId:bookingId,
          paymentIntent: session.payment_intent,
          paymentStatus: "paid",
          createdAt: new Date(),
        })

        const valuse = await data.json(); 

        console.log("Database update:", result);
        alert("Database add data:", valuse);

        if (result.matchedCount === 0) {
          console.log("Booking not found in database!");
        }
      }

      return res.status(200).json({
        received: true
      });

    } catch (error) {
      console.error("Webhook error:", error.message);

      return res.status(400).json({
        error: error.message
      });
    }
  }
);


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


app.get('/', (req, res) => {
  res.send('Hello World!')
});

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
});

app.get("/users",async(req,res)=>{
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

 app.patch("/profile/update/:id", async(req,res)=>{
 try {
   const {id} = req.params;
   const { name, email, image } = req.body;

  if(!ObjectId.isValid(id)){
     return res.status(400).send({
        success: false,
        message: "Invalid user ID",
      });

    }
      if (typeof name !== "string" || !name.trim()) {
      return res.status(400).send({
        success: false,
        message: "Name is required",
      });
    }

      if (typeof email !== "string" || !email.trim()) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const result = await collection.updateOne(
      {_id:new ObjectId(id)},
      {$set:{name:name.trim(), email, image}}
    )

     res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      
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

 app.patch("/admin/user/:id/status" , async(req,res)=>{
  try {

    const {id} = req.params;
    const {isBlocked} = req.body

    if(!ObjectId.isValid(id)){
      return res.status(400).send({
        success: false,
        message: "Invalid user ID",
      });
    }

    if(typeof isBlocked !== "boolean"){
      return res.status(400).send({
        success: false,
        message: "isBlocked must be true or false",
      });
    }
   
   const result = await collection.updateOne(
    {
      _id:new ObjectId(id),},
    {
      $set:{
        isBlocked:isBlocked
      }
    }
   );
   if(result.matchedCount === 0){
    return res.status(404).send({
      success: false,
      message: "User not found",
    });
   }

   res.send(result);
    
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Internal server error",
    })
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
 });

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
});

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
});

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
});

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
});

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
});

app.delete("/booking/:id", async(req,res)=>{
 try {
   const {id} = req.params;

   if(!ObjectId.isValid(id)){
      return res.status(400).send({ message: "Invalid booking ID" });
    }

   const result = await bookings.deleteOne({_id:new ObjectId(id)})

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

app.post("/booking", async (req, res) => {
// app.post("/booking", async (req, res) => {
  try {
    const { serviceId, date, time, specialRequest } = req.body || {};

    // User identity must come from the verified JWT, not from the request body
    const userId = req.user?.id || req.user?.sub;
    const customerName = req.user?.name;
    const customerEmail = req.user?.email;

    if (!userId || !customerName || !customerEmail) {
      return res.status(401).json({
        success: false,
        message: "Invalid login session. Please login again.",
      });
    }

    // Validate required fields
    if (!serviceId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Please provide service, date and time",
      });
    }

    // Validate service ID
    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Date must be a valid date in YYYY-MM-DD format",
      });
    }

    if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({
        success: false,
        message: "Time must be in HH:mm format (24-hour)",
      });
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;

    if (date < today) {
      return res.status(400).json({
        success: false,
        message: "Booking date cannot be in the past",
      });
    }

    // Check whether service exists
    const service = await services.findOne({
      _id: new ObjectId(serviceId),
      active: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    const serviceObjectId = new ObjectId(serviceId);

    // Prevent duplicate bookings for the same service, date and time
    const existingBooking = await bookings.findOne({
      userId,
      serviceId: serviceObjectId,
      date,
      time,
      status: { $nin: ["cancelled", "rejected"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a booking for this service at this date and time",
      });
    }

    // Create booking
    const bookingData = {
      serviceId: serviceObjectId,
      userId,
      customerName,
      customerEmail,
      date,
      time,
      specialRequest:
        typeof specialRequest === "string"
          ? specialRequest.trim().slice(0, 500)
          : "",
      serviceName: service.name,
      price: service.price,
      duration: service.duration,
      status: "pending",
      paymentStatus: "unpaid",
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookings.insertOne(bookingData);

    res.status(201).json({
      success: true,
      message: "Booking successful",
      data: {
        _id: result.insertedId,
        ...bookingData,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});

app.get("/bookings/:id", async (req, res) => {
   try {
    const id = req.params.id;

    const booking = await bookings.findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

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

app.get("/total-bookings/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const totalBooking = await bookings.countDocuments({
      customerEmail: email,
    });
    const pendingBooking = await bookings.countDocuments({
      customerEmail: email,
      status: "pending",
    });

    const confirmBooking = await bookings.countDocuments({
      customerEmail: email,
      status: "confirmed",
    });
    const rejectedBooking = await bookings.countDocuments({
      customerEmail: email,
      status: "rejected",
    });

    res.status(200).json({
      success: true,
      totalBooking,
      pendingBooking,
      confirmBooking,
      rejectedBooking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

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


app.get("/appointments/count", async (req, res) => {
  try {
    const totalAppointment = await bookings.countDocuments();

    const pendingAppointment = await bookings.countDocuments({
      status: "pending",
    });

    const confirmAppointment = await bookings.countDocuments({
      status: "confirmed",
    });

    res.status(200).json({
      success: true,
      totalAppointment,
      pendingAppointment,
      confirmAppointment,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


app.post("/create-checkout-session", async(req,res)=>{
  try{
    const {serviceId,userId,bookingId}= req.body|| {};
    console.log("Payment request",req.body);
    if(!serviceId || !bookingId){
      return res.send(400).json({
        success: false,
        message: "Service ID and Booking ID are required",
      });
    }
    if(!ObjectId.isValid(serviceId)|| !ObjectId.isValid(bookingId)){
       return res.status(400).json({
        success: false,
        message: "Invalid Service ID or Booking ID",
      });
    }

    const service = await services.findOne({
      _id:new ObjectId(serviceId),
    });
    if(!service){
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }
    const booking = await bookings.findOne(
      {
        _id: new ObjectId(bookingId)
      }
    )

    if(!booking){
       return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify that booking belongs to the selected service
    if (booking.serviceId.toString() !== serviceId) {
      return res.status(400).json({
        success: false,
        message: "Booking and service do not match",
      });
    }

    // Check payment status
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been paid",
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items:[
        {
          price_data:{
            currency:"usd",
            product_data:{
              name: service.serviceName || "Service Booking",
            },
            unit_amount:Math.round(service.price*0.00804*100),
          },
          quantity:1,
        }
      ],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/canceled`,

      mode:"payment",
      metadata:{
        serviceId: serviceId.toString(),
        bookingId: bookingId.toString(),
        userId: userId?.toString() || "",
      },
    });
    console.log("Stripe session created:", session.id);
    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  }catch(error){
    console.log("Stripe checkout error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Checkout session creation failed",
    });
  }
});

app.get("/admin/payment/transactions",async(req,res)=>{
  
  try {
    const result = await payments.find({}).toArray();
    
    res.status(200).send({
      success: true,
      message: "payment fetched successfully",
      data: result,
    });
    
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch payment",
      data: [],
    });
  }

});

  

app.listen(process.env.PORT || 8000, ()=>{
    console.log("Server is running on port 8000");
});