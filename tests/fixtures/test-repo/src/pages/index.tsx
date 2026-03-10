import { Button } from "../components/Button"
import { Card } from "../components/Card"

export default function HomePage() {
	return (
		<main className="container mx-auto p-8">
			<h1 className="text-3xl font-bold mb-8">Welcome</h1>
			<Card title="Getting Started" description="Start building your app">
				<Button>Click me</Button>
			</Card>
		</main>
	)
}
