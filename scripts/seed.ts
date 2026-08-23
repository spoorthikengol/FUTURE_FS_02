import mongoose from "mongoose";
import { seedDatabase } from "@/lib/seed";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  await mongoose.connect(uri);
  const result = await seedDatabase(true);
  console.log(result);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
