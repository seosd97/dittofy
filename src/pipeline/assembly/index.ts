export { assembleDocuments } from "./doc-assembler.js"
export {
	buildBorderRadiusReference,
	buildBreakpointsReference,
	buildColorReference,
	buildColorReferenceCompact,
	buildComponentCatalogReference,
	buildInteractionsReference,
	buildLayoutReference,
	buildLayoutReferenceCompact,
	buildMotionReference,
	buildResponsiveReference,
	buildShadowsReference,
	buildSpacingReference,
	buildThemeVariantsReference,
	buildTypographyReference,
	buildZIndexReference,
} from "./design-reference-builders.js"
export { assemblePrompts } from "./prompt-assembler.js"
export { resolveEnvironment } from "./resolve-environment.js"
export type { EnvironmentProfile } from "./resolve-environment.js"
export type { ProjectStructure } from "./resolve-structure.js"
