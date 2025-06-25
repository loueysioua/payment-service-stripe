import { StripeProductRepository } from "@/repositories/stripe/product.repository";
import { StripePriceRepository } from "@/repositories/stripe/price.repository";
import type { Product } from "@/types/products/product.types";

export class ProductService {
  private static instance: ProductService;
  private readonly productRepo = StripeProductRepository.getInstance();
  private readonly priceRepo = StripePriceRepository.getInstance();

  private constructor() {}

  static getInstance(): ProductService {
    if (!this.instance) {
      this.instance = new ProductService();
    }
    return this.instance;
  }

  async createProduct(productData: Omit<Product, "priceId">): Promise<Product> {
    try {
      // Create product in Stripe
      const stripeProduct = await this.productRepo.create({
        id: productData.id,
        name: productData.name,
        description: productData.description,
        images: productData.image ? [productData.image] : undefined,
      });

      // Create price for the product
      const price = await this.priceRepo.create(
        stripeProduct.id,
        productData.price,
        "eur",
        { interval: "month" }
      );

      return {
        ...productData,
        priceId: price.id,
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async createMultipleProducts(
    products: Omit<Product, "priceId">[]
  ): Promise<Product[]> {
    const createdProducts = await Promise.allSettled(
      products.map((product) => this.createProduct(product))
    );

    const results: Product[] = [];
    const errors: Error[] = [];

    createdProducts.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push(
          new Error(
            `Failed to create product ${products[index].name}: ${result.reason}`
          )
        );
      }
    });

    if (errors.length > 0) {
      console.error("Some products failed to create:", errors);
    }

    return results;
  }

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const stripeProduct = await this.productRepo.findById(productId);
      if (!stripeProduct) return null;

      const price = await this.priceRepo.findByProductId(productId);

      return {
        id: stripeProduct.id,
        name: stripeProduct.name,
        description: stripeProduct.description || "",
        price: price ? price.unit_amount! / 100 : 0,
        image: stripeProduct.images?.[0] || "",
        priceId: price?.id || "",
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  }
}
