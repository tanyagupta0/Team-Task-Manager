import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema",   // 🔥 yahi main fix hai
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});