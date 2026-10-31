import { connectDB } from "./config/db.ts";
import app from "./app.ts";
import "dotenv/config";

const PORT = Number(process.env.PORT || 3000);

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

void startServer();
