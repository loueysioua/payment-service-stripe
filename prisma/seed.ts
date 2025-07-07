import { productData } from "@/data/seed/products.seed";
import { userData } from "@/data/seed/users.seed";
import { StripePriceRepository } from "@/repositories/stripe/price.repository";
import { StripeProductRepository } from "@/repositories/stripe/product.repository";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u });
  }

  for (const p of productData) {
    const stripeProductRepo = StripeProductRepository.getInstance();
    const stripePriceRepo = StripePriceRepository.getInstance();
    // Create product in Stripe first
    const stripeProduct = await stripeProductRepo.create({
      name: p.name,
      description: p.description || "",
      images: p.image ? [p.image] : undefined,
    });

    // Create price for the product
    const price = await stripePriceRepo.create(
      stripeProduct.id,
      p.price,
      p.currency || "eur",
      p.name.toLowerCase().includes("subscription")
        ? { interval: "month" }
        : undefined
    );

    // Create plan in database
    await prisma.plan.create({
      data: {
        id: stripeProduct.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency || "eur",
        image: p.image,
        priceId: price.id,
      },
    });
  }
}

main();
