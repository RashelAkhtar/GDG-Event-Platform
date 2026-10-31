import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import passport from "./config/passport.ts";
import authRoutes from "./routes/auth.routes.ts";
import eventRoutes from "./routes/event.routes.ts";
import quizRoutes from "./routes/quiz.routes.ts";
import 'dotenv/config';

const app: Express = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const allowedOrigins = [clientUrl, "http://localhost:3000", "http://localhost:5173"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", clientUrl);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/events", quizRoutes);

export default app;
