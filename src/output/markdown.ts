export function assembleMarkdown(
	title: string,
	sections: { title: string; content: string }[],
): string {
	const parts = [`# ${title}`, ""]
	for (const section of sections) {
		parts.push(`## ${section.title}`, "", section.content, "")
	}
	return parts.join("\n")
}
