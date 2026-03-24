import type { AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import { componentsAspect } from "./components/descriptor.js"
import { interactionsAspect } from "./interactions/descriptor.js"
import { layoutAspect } from "./layout/descriptor.js"
import { pagesAspect } from "./pages/descriptor.js"
import { responsiveAspect } from "./responsive/descriptor.js"
import { tokensAspect } from "./tokens/descriptor.js"
import { typographyAspect } from "./typography/descriptor.js"

/** Typed aspect registry — keyed by AspectName for O(1) lookup */
export const ASPECT_REGISTRY: { [K in AspectName]: AspectDescriptor<K> } = {
	designTokens: tokensAspect,
	typography: typographyAspect,
	componentCatalog: componentsAspect,
	layoutSystem: layoutAspect,
	pageStructures: pagesAspect,
	responsiveStrategy: responsiveAspect,
	interactionPatterns: interactionsAspect,
}

/** All aspect names in processing order */
export const ASPECT_NAMES = Object.keys(ASPECT_REGISTRY) as AspectName[]

/** Get a typed descriptor by name */
export function getAspect<K extends AspectName>(name: K): AspectDescriptor<K> {
	return ASPECT_REGISTRY[name]
}
