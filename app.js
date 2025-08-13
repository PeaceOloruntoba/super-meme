import express from "express";
import fileUpload from "express-fileupload";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import Stripe from "stripe";

dotenv.config();

import connectDB from "./src/config/connectDB.js";
import notFound from "./src/middlewares/notFound.js";
import { errorMiddleware } from "./src/middlewares/error.js";

import authRoutesV1 from "./src/v1/routes/auth.routes.js";
import userRoutesV1 from "./src/v1/routes/user.routes.js";
import clientRoutesV1 from "./src/v1/routes/client.routes.js";
import calendarEventRoutesV1 from "./src/v1/routes/calendar.routes.js";
import measurementsRoutesV1 from "./src/v1/routes/measurements.routes.js";
import projectsRoutesV1 from "./src/v1/routes/projects.routes.js";
import invoiceRoutesV1 from "./src/v1/routes/invoice.routes.js";
import patternRoutesV1 from "./src/v1/routes/pattern.routes.js";
import subscriptionRoutesV1 from "./src/v1/routes/subscription.routes.js";
import webhookRoutesV1 from "./src/v1/routes/webhook.routes.js";
import dashboardRoutesV1 from "./src/v1/routes/dashboard.routes.js";
// import analyticsRoutesV1 from "./src/v1/routes/analytics.routes.js";

const app = express();
const port = process.env.PORT || 8080;

app.use("/webhook/stripe", webhookRoutesV1);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use(morgan("dev"));

app.use("/api/v1/auth", authRoutesV1);
app.use("/api/v1/user", userRoutesV1);
app.use("/api/v1/clients", clientRoutesV1);
app.use("/api/v1/calendar", calendarEventRoutesV1);
app.use("/api/v1/measurements", measurementsRoutesV1);
app.use("/api/v1/projects", projectsRoutesV1);
app.use("/api/v1/invoices", invoiceRoutesV1);
app.use("/api/v1/pattern", patternRoutesV1);
app.use("/api/v1/subscription", subscriptionRoutesV1);
app.use("/api/v1/dashboard", dashboardRoutesV1);
// app.use("/api/v1/analytics", analyticsRoutesV1);
// app.use("/api/v1/admin", adminRoutes);
app.use(notFound);
app.use(errorMiddleware);

cron.schedule("0 2 * * *", async () => {
  console.log(
    "Running scheduled job: Checking and deactivating expired subscriptions..."
  );
  await subscriptionService.checkAndDeactivateExpiredSubscriptions();
});

const startServer = async () => {
  try {
    await connectDB(process.env.DB_URI);
    console.log(`DB Connected!`);
    app.listen(port, () => console.log(`Server is listening on PORT:${port}`));
  } catch (error) {
    console.log(`Couldn't connect because of ${error.message}`);
    process.exit(1);
  }
};

startServer();
