export default async function CreditsPurchase({
  searchParams,
}: {
  searchParams: any;
}) {
  const { success, canceled, session_id } = await searchParams;

  if (success) {
    return (
      <div className="success-message">
        <h2>Credits Added Successfully!</h2>
        <p>Your credits have been added to your account.</p>
        <a href="/dashboard">Go to Dashboard</a>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="canceled-message">
        <h2>Purchase Canceled</h2>
        <p>No worries! You can purchase credits anytime.</p>
      </div>
    );
  }

  return (
    <div className="credits-purchase">
      <h1>Purchase Credits</h1>
      <div className="credit-packages">
        <CreditPackage amount={35} credits={350} />
        <CreditPackage amount={70} credits={750} bonus={50} />
        <CreditPackage amount={105} credits={1200} bonus={150} />
      </div>
    </div>
  );
}

function CreditPackage({ amount, credits, bonus = 0 }) {
  const totalCredits = credits + bonus;

  return (
    <div className="credit-package">
      <h3>${amount} Package</h3>
      <p>{credits} Credits</p>
      {bonus > 0 && <p className="bonus">+ {bonus} Bonus Credits</p>}
      <p className="total">Total: {totalCredits} Credits</p>

      <form action="/api/checkout-sessions" method="POST">
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="credits" value={totalCredits} />
        <input type="hidden" name="type" value="credit_purchase" />
        <button type="submit">Buy for ${amount}</button>
      </form>
    </div>
  );
}
