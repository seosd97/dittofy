interface ButtonProps {
	children: React.ReactNode
	variant?: "primary" | "secondary"
	size?: "sm" | "md" | "lg"
	onClick?: () => void
}

export function Button({ children, variant = "primary", size = "md", onClick }: ButtonProps) {
	return (
		<button
			className={`btn btn-${variant} btn-${size}`}
			onClick={onClick}
		>
			{children}
		</button>
	)
}
