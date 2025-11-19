import { count } from "drizzle-orm";

import { db } from "./config.server";
import { criteria } from "./schema.server";

const seedCriteria = async () => {
  const criteriaData = [
    { name: "Rating", weight: 1.0, description: "Bare den helt simple score" },
  ];

  const [existingCriteria] = await db.select({ count: count() }).from(criteria);

  if (existingCriteria.count === 0) {
    console.log("Seeding Database:");
    console.log(" - Criteria");
    await db.insert(criteria).values(criteriaData);
  }
};

const seedDatabase = async () => {
  await seedCriteria();
};

export default seedDatabase;
