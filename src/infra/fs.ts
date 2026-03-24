import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

// ── Ditto Home Directory ────────────────────────────────────

export const DITTO_HOME = join(homedir(), ".ditto")

export function getSettingsPath(): string {
	return join(DITTO_HOME, "settings.json")
}

export function getWorkspacesDir(): string {
	return join(DITTO_HOME, "workspaces")
}

export async function ensureDittoHome(): Promise<void> {
	await mkdir(DITTO_HOME, { recursive: true })
}

// ── File I/O ────────────────────────────────────────────────

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
