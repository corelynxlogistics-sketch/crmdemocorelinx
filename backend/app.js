import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import leadSheetRoutes from "./routes/leadSheet.routes.js";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173","https://sro.corelynxlogistics.com","https://demo.corelinxlogistics.us"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/lead-sheets", leadSheetRoutes);

app.get("/", (req, res) => {
  res.send("CoreLynx Dispatch Portal API Running");
});

export default app;
