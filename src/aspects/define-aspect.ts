import type { AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"

/**
 * Aspect descriptor 팩토리.
 * name 필드에서 K를 추론하여 analyzer.schema, canGenerate, buildPrompt 등의
 * 타입 일관성을 컴파일 타임에 보장한다.
 */
export function defineAspect<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
): AspectDescriptor<K> {
	return descriptor
}
