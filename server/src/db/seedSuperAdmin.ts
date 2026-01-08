import { storage } from "./storage.ts";
import { hashPassword } from "../middleware/auth.ts";

async function seedSuperAdmin() {
  console.log("Creating super admin account...");

  const username = "superadmin";
  const password = "SuperAdmin123!"; // CHANGE THIS IN PRODUCTION!
  const email = "superadmin@techteam.app";

  try {
    // Check if super admin already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      console.log("✓ Super admin already exists");
      console.log(`Username: ${username}`);
      return;
    }

    const passwordHash = await hashPassword(password);

    const superAdmin = await storage.createUser({
      username,
      email,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      schoolId: undefined, // Super admins don't belong to a school
      role: "super_admin",
      points: 0,
      streak: 0,
      selectedAvatar: "rocket",
      isActive: true,
    });

    console.log("\n✅ Super admin created successfully!");
    console.log("=====================================");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    console.log("=====================================");
    console.log("\n⚠️  IMPORTANT: Change this password immediately after first login!");
    
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    throw error;
  }
}

// Run if called directly
seedSuperAdmin()
  .then(() => {
    console.log("\nExiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
