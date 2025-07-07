import { Prisma } from "@prisma/client";

export const productData: Prisma.PlanCreateInput[] = [
  {
    name: "Subscription",
    description: "A premium credit package",
    price: 70 * 100,
    currency: "eur",
    image: "https://stripe.com/img/hello-world-image.png",
  },
  {
    name: "Unit Purchase",
    description: "A basic credit package",
    price: 35 * 100,
    currency: "eur",
    image: "https://stripe.com/img/hello-world-image.png",
  },
];
