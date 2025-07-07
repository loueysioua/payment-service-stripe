import { Prisma } from "@prisma/client";

export const userData: Prisma.UserCreateInput[] = [
  {
    nom: "Alice",
    prenom: "Prisma",
    email: "alice@gmail.com",
    city: "London",
    country: "UK",
    postal: "SW1A 2AA",
    state: "London",
    street: "100 Oxford Street",
    credits: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    nom: "Bob",
    prenom: "Prisma",
    email: "bob@gmail.com",
    city: "New York",
    country: "US",
    postal: "10001",
    state: "New York",
    street: "100 Bob Street",
    credits: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
