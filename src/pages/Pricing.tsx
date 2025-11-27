export default function Pricing() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pricing & Plans</h1>
      <ul className="grid md:grid-cols-3 gap-4">
        <li className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium">Free</h2>
          <p className="text-sm">Up to 5 members, 5GB storage.</p>
        </li>
        <li className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium">Premium</h2>
          <p className="text-sm">Unlimited members, 100GB, advanced features.</p>
        </li>
        <li className="p-4 border rounded bg-white dark:bg-gray-800">
          <h2 className="font-medium">Family Plus</h2>
          <p className="text-sm">500GB, analytics, integrations, API access.</p>
        </li>
      </ul>
    </div>
  )
}