import { storage } from "./storage.ts";
import { hashPassword } from "../middleware/auth.ts";

async function seedInternalUser() {
  console.log("Creating internal staff account...");

  const username = "internal";
  const password = "internal123";
  const email = "internal@digitalpromise.org";

  try {
    // Check if internal user already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      console.log("Internal user already exists");
      console.log(`Username: ${username}`);
      return;
    }

    const passwordHash = await hashPassword(password);

    const internalUser = await storage.createUser({
      username,
      email,
      passwordHash,
      firstName: "DP",
      lastName: "Staff",
      schoolId: undefined, // Internal users don't belong to a school
      role: "internal",
      points: 0,
      streak: 0,
      selectedAvatar: "rocket",
      isActive: true,
    });

    console.log("\nInternal user created successfully!");
    console.log("=====================================");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    console.log("=====================================");
    console.log("\nIMPORTANT: Change this password in production!");

  } catch (error) {
    console.error("Error creating internal user:", error);
    throw error;
  }
}

// Run if called directly
seedInternalUser()
  .then(() => {
    console.log("\nExiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
