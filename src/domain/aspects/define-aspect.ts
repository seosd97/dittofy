import type { AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"

/**
 * Aspect descriptor factory.
 * Infers K from the name field to enforce compile-time type consistency
 * across analyzer.schema, canGenerate, buildPrompt, etc.
 */
export function defineAspect<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
): AspectDescriptor<K> {
	return descriptor
}
