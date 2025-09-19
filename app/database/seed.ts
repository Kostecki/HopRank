import { count } from "drizzle-orm";

import { db } from "./config.server";
import { criteria } from "./schema.server";

const seedCriteria = async () => {
  const criteriaData = [
    { name: "Rating", weight: 1.0, description: "Bare den helt simple" },
    { name: "Kriterie 2", weight: 1.0, description: "Noget om Kriteria #2" },
    { name: "Kriterie 3", weight: 1.0, description: "Noget om Kriteria #3" },
    { name: "Kriterie 4", weight: 1.0, description: "Noget om Kriteria #4" },
    { name: "Kriterie 5", weight: 1.0, description: "Noget om Kriteria #5" },
  ];

  const [existingCriteria] = await db.select({ count: count() }).from(criteria);

  if (existingCriteria.count === 0) {
    console.log(" - Criteria");
    await db.insert(criteria).values(criteriaData);
  }
};

const seedDatabase = async () => {
  await seedCriteria();
};

export default seedDatabase;
