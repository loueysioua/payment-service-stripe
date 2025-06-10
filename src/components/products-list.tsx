"use client";

import { useState, useEffect } from "react";
import Stripe from "stripe";

export default function ProductsList() {
  const [products, setProducts] = useState<Stripe.Product[]>([]);
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <a href={`/products/${product.id}`}>{product.name}</a>
        </li>
      ))}
    </ul>
  );
}
