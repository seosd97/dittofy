import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export async function readFileContent(filePath: string): Promise<string> {
	return readFile(filePath, "utf-8")
}

export async function writeFileContent(filePath: string, content: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true })
	await writeFile(filePath, content, "utf-8")
}

export async function ensureDir(dirPath: string): Promise<void> {
	await mkdir(dirPath, { recursive: true })
}
