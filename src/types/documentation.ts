export interface DocumentSet {
	documents: DocumentEntry[]
	outputDir: string
}

export interface DocumentEntry {
	filename: string
	title: string
	content: string
	category: "core" | "dynamic"
}

export interface DocumentPlan {
	coreDocuments: DocumentPlanEntry[]
	dynamicDocuments: DocumentPlanEntry[]
}

export interface DocumentPlanEntry {
	filename: string
	title: string
	reason: string
	include: boolean
}
