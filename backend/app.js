// Username: adminUser
// Password: 5NW3N2LlFEBnLE4G
// URL: mongodb+srv://adminUser:<db_password>@cluster0.llcjvmk.mongodb.net/

const express = require("express");
const mongoose = require("mongoose");
const userRouter = require("./routes/UserRoutes");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json()); // Without this req.body would be undefined
app.use(cors());

// Routes
app.use("/users", userRouter);

// Connect to mongodb database
mongoose.connect("mongodb+srv://adminUser:5NW3N2LlFEBnLE4G@cluster0.llcjvmk.mongodb.net/crowd-balance-db")
.then(() => {
    console.log("Connected to MongoDB!");
    return app.listen(PORT);
})
.then(() => {
    // Start the server only after the database connected
    console.log(`Server running on port: ${PORT}`);
})
.catch((err) => {
    console.log(err);
});