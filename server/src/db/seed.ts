import { storage } from "./storage.ts";

export async function seedDatabase() {
  console.log("Starting database seeding...");

  // Create a demo school
  const school = await storage.createSchool({
    name: "Hogwarts School of Technology",
    address: "Scotland, UK",
    contactEmail: "admin@hogwarts-tech.edu",
    adminName: "Minerva McGonagall",
  });
  console.log(`✓ Created school: ${school.name} (ID: ${school.id})`);

  // Create challenges
  const challenges = [
    {
      title: "Screen Repair Basics",
      description: "Learn how to replace broken screens on iPad and Chromebooks",
      difficulty: "beginner" as const,
      points: 100,
      category: "hardware" as const,
      daysToComplete: 7,
      participants: 0,
      isActive: true,
    },
    {
      title: "Network Troubleshooting",
      description: "Diagnose and fix common WiFi connection issues",
      difficulty: "intermediate" as const,
      points: 150,
      category: "network" as const,
      daysToComplete: 5,
      participants: 0,
      isActive: true,
    },
    {
      title: "Software Installation Expert",
      description: "Master the process of installing and configuring educational software",
      difficulty: "beginner" as const,
      points: 75,
      category: "software" as const,
      daysToComplete: 3,
      participants: 0,
      isActive: true,
    },
  ];

  for (const challenge of challenges) {
    await storage.createChallenge(challenge);
  }
  console.log(`✓ Created ${challenges.length} challenges`);

  // Create resources
  const resources = [
    {
      title: "Chromebook Keyboard Replacement Guide",
      category: "hardware" as const,
      contentType: "video" as const,
      url: "https://example.com/chromebook-keyboard",
      description: "Step-by-step video guide for replacing Chromebook keyboards",
      duration: "12:30",
      views: 0,
    },
    {
      title: "iPad Screen Repair Tutorial",
      category: "hardware" as const,
      contentType: "article" as const,
      url: "https://example.com/ipad-screen",
      description: "Comprehensive article with photos showing iPad screen replacement",
      duration: "15 min read",
      views: 0,
    },
    {
      title: "Network Troubleshooting Checklist",
      category: "network" as const,
      contentType: "document" as const,
      url: "https://example.com/network-checklist",
      description: "Printable checklist for diagnosing network connectivity issues",
      duration: "5 min",
      views: 0,
    },
  ];

  for (const resource of resources) {
    await storage.createResource(resource);
  }
  console.log(`✓ Created ${resources.length} resources`);

  // Create achievements
  const achievements = [
    {
      name: "First Repair",
      description: "Complete your first device repair",
      icon: "wrench" as const,
      pointsRequired: 0,
      category: "repairs",
    },
    {
      name: "Learning Champion",
      description: "Complete 5 challenges",
      icon: "trophy" as const,
      pointsRequired: 500,
      category: "learning",
    },
    {
      name: "Team Player",
      description: "Log 10 hours of work",
      icon: "star" as const,
      pointsRequired: 0,
      category: "teamwork",
    },
  ];

  for (const achievement of achievements) {
    await storage.createAchievement(achievement);
  }
  console.log(`✓ Created ${achievements.length} achievements`);

  // Create certifications
  const certifications = [
    {
      name: "Device Repair Technician",
      description: "Complete all hardware repair challenges and log 20 repair hours",
      totalSteps: 5,
    },
    {
      name: "Network Specialist",
      description: "Master network troubleshooting and complete related challenges",
      totalSteps: 3,
    },
  ];

  for (const certification of certifications) {
    await storage.createCertification(certification);
  }
  console.log(`✓ Created ${certifications.length} certifications`);

  console.log("\n✅ Database seeding completed successfully!");
  console.log(`\nDemo School ID: ${school.id}`);
  console.log("Use this School ID during onboarding to join the demo school.\n");

  return school;
}

// Run seeding if called directly
seedDatabase()
  .then(() => {
    console.log("Exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
