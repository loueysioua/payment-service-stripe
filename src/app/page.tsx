export default async function IndexPage({
  searchParams,
}: {
  searchParams: { canceled?: string };
}) {
  const { canceled } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Checkout</h1>

        {/* Cancellation Feedback */}
        {canceled && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            Order canceled. Continue shopping and checkout when you&apos;re
            ready.
          </div>
        )}

        {/* Checkout Form */}
        <form
          action="/api/checkout-sessions"
          method="POST"
          className="space-y-4"
        >
          <section>
            <label
              htmlFor="productId"
              className="block text-sm font-medium text-gray-700"
            >
              Select Product
            </label>
            <select
              id="productId"
              name="productId"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a product</option>
              <option value="123456">35$ Credits</option>
              <option value="jgouhhlk123">70$ Credits</option>
            </select>
          </section>

          <section>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700"
            >
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </section>

          <section>
            <label
              htmlFor="productId"
              className="block text-sm font-medium text-gray-700"
            >
              Select Payment Mode
            </label>
            <select
              id="paymentMode"
              name="paymentMode"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a product</option>
              <option value="subscription-mode">Subscription</option>
              <option value="credit-mode">Credit</option>
            </select>
          </section>

          <section>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Proceed to Checkout
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}
