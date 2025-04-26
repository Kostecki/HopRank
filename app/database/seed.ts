import { count } from "drizzle-orm";

import { db } from "./config.server";
import {
  ratingsTable,
  beersTable,
  sessionsTable,
  usersTable,
  votesTable,
} from "./schema.server";

const seedCategories = async () => {
  const categories = [
    { name: "Kriterie 1", description: "Beskrivelse af #1", weight: 1.0 },
    { name: "Kriterie 2", description: "Beskrivelse af #2", weight: 1.0 },
    { name: "Kriterie 3", description: "Beskrivelse af #3", weight: 1.0 },
    { name: "Kriterie 4", description: "Beskrivelse af #4", weight: 1.0 },
    { name: "Kriterie 5", description: "Beskrivelse af #5", weight: 1.0 },
  ];

  const [existingCategories] = await db
    .select({ count: count() })
    .from(ratingsTable);

  if (existingCategories.count === 0) {
    console.log();
    console.log("Seeding Categories");
    await db.insert(ratingsTable).values(categories);
  }
};

const seedSessions = async () => {
  const sessions = [
    { name: "clingy-impala", active: true },
    { name: "hairy-balls", active: true },
  ];

  const [existingSessions] = await db
    .select({ count: count() })
    .from(sessionsTable);

  if (existingSessions.count === 0) {
    console.log("Seeding Sessions");
    await db.insert(sessionsTable).values(sessions);
  }
};

const seedUsers = async () => {
  const users = [
    { email: "jacob@kostecki.dk", activeSessionId: 1, untappdId: 6063090 },
    { email: "hoprank@kostecki.dk", activeSessionId: 1 },
  ];

  const [existingUsers] = await db.select({ count: count() }).from(usersTable);

  if (existingUsers.count === 0) {
    console.log("Seeding Users");
    await db.insert(usersTable).values(users);
  }
};

const seedBeers = async () => {
  const beers = [
    {
      sessionId: 1,
      addedBy: 1,
      untappdBeerId: 3279756,
      name: "Rubus of Gold",
      style: "Wild Ale - Other",
      breweryName: "Baghaven Brewing and Blending",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-3279756_bb129_sm.jpeg",
    },
    {
      sessionId: 1,
      addedBy: 1,
      untappdBeerId: 4081135,
      name: "Goofy",
      style: "Brown Ale - English",
      breweryName: "Gamma Brewing Company",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-4081135_efd90_sm.jpeg",
    },
    {
      sessionId: 1,
      addedBy: 1,
      untappdBeerId: 87308,
      name: "Andechser Hell",
      style: "Lager - Helles",
      breweryName: "Klosterbrauerei Andechs",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-AndechserVollbierHell_87308.jpeg",
    },
    {
      sessionId: 1,
      addedBy: 2,
      untappdBeerId: 5751668,
      name: "Delirium Tremens (2024)",
      style: "Belgian Strong Golden Ale",
      breweryName: "Delirium - Huyghe Brewery",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-4485_a0f83_sm.jpeg",
    },
    {
      sessionId: 2,
      addedBy: 1,
      untappdBeerId: 6797,
      name: "Tuborg Grøn",
      style: "Pilsner - Other",
      breweryName: "Carlsberg Group",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-6797_09553_sm.jpeg",
    },
    {
      sessionId: 2,
      addedBy: 1,
      untappdBeerId: 3279756,
      name: "Rubus of Gold",
      style: "Wild Ale - Other",
      breweryName: "Baghaven Brewing and Blending",
      label:
        "https://assets.untappd.com/site/beer_logos/beer-3279756_bb129_sm.jpeg",
    },
  ];

  const [existingBeers] = await db.select({ count: count() }).from(beersTable);

  if (existingBeers.count === 0) {
    console.log("Seeding Beers");
    await db.insert(beersTable).values(beers);
  }
};

const seedVotes = async () => {
  const votes = [
    {
      userId: 1,
      sessionId: 1,
      beerId: 1,
      vote: [
        {
          name: "Kriterie 1",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 2",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 3",
          rating: 2.5,
          weight: 1,
        },
        {
          name: "Kriterie 4",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 5",
          rating: 5,
          weight: 1,
        },
      ],
    },
    {
      userId: 1,
      sessionId: 1,
      beerId: 2,
      vote: [
        {
          name: "Kriterie 1",
          rating: 1.5,
          weight: 1,
        },
        {
          name: "Kriterie 2",
          rating: 2.5,
          weight: 1,
        },
        {
          name: "Kriterie 3",
          rating: 3.5,
          weight: 1,
        },
        {
          name: "Kriterie 4",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 5",
          rating: 5,
          weight: 1,
        },
      ],
    },
    {
      userId: 1,
      sessionId: 1,
      beerId: 4,
      vote: [
        {
          name: "Kriterie 1",
          rating: 5,
          weight: 1,
        },
        {
          name: "Kriterie 2",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 3",
          rating: 3.5,
          weight: 1,
        },
        {
          name: "Kriterie 4",
          rating: 2.5,
          weight: 1,
        },
        {
          name: "Kriterie 5",
          rating: 4.5,
          weight: 1,
        },
      ],
    },
    {
      userId: 2,
      sessionId: 1,
      beerId: 1,
      vote: [
        {
          name: "Kriterie 1",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 2",
          rating: 5,
          weight: 1,
        },
        {
          name: "Kriterie 3",
          rating: 3.2,
          weight: 1,
        },
        {
          name: "Kriterie 4",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 5",
          rating: 2.5,
          weight: 1,
        },
      ],
    },
    {
      userId: 2,
      sessionId: 2,
      beerId: 6,
      vote: [
        {
          name: "Kriterie 1",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 2",
          rating: 3.5,
          weight: 1,
        },
        {
          name: "Kriterie 3",
          rating: 2.5,
          weight: 1,
        },
        {
          name: "Kriterie 4",
          rating: 4.5,
          weight: 1,
        },
        {
          name: "Kriterie 5",
          rating: 5,
          weight: 1,
        },
      ],
    },
  ];

  const [existingVotes] = await db.select({ count: count() }).from(votesTable);

  if (existingVotes.count === 0) {
    console.log("Seeding Votes");
    console.log();
    await db.insert(votesTable).values(votes.map((vote) => vote));
  }
};

const seedDatabase = async () => {
  await seedCategories();

  // Seed the development database with test data
  if (process.env.NODE_ENV === "development") {
    await seedSessions();
    await seedUsers();
    await seedBeers();
    await seedVotes();
  }
};

export default seedDatabase;
