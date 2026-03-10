interface CardProps {
	title: string
	description: string
	children?: React.ReactNode
}

export function Card({ title, description, children }: CardProps) {
	return (
		<div className="rounded-lg border p-4 shadow-sm">
			<h3 className="text-lg font-semibold">{title}</h3>
			<p className="text-gray-600">{description}</p>
			{children}
		</div>
	)
}
