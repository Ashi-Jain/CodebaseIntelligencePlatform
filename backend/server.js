import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import analyzeRoute from "./routes/analyze.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Codebase Intelligence API Running",
  });
});

app.use("/api/analyze", analyzeRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
