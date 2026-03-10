# 04. Pipeline Design — 파이프라인 상세 설계

각 Phase의 내부 로직, 모듈 간 데이터 흐름, 실행 전략을 상세히 기술한다.
이 문서는 Ditto 시스템의 **구현 청사진**이며, 모든 핵심 판단 로직과 분기 조건을 포함한다.

> **참조 문서**: 타입 정의는 `03-type-definitions.md`, LLM 호출 패턴은 `05-llm-integration.md`, 전체 아키텍처는 `01-architecture.md`를 참고한다.

---

## Phase 1: Extraction

원시 데이터 수집 단계. LLM을 사용하지 않으며, 파일 시스템 탐색과 정규식 기반 분류로 구성된다.

### 1.1 Repo Resolver

**책임**: 사용자 입력(로컬 경로 / GitHub URL)을 정규화하여 분석 가능한 로컬 디렉토리 경로를 확보한다.

#### 입력 판별 로직

```typescript
// src/phases/extraction/repo-resolver.ts

interface ResolvedRepo {
  /** 분석 대상 로컬 디렉토리 절대 경로 */
  localPath: string
  /** 원본 소스 (URL 또는 로컬 경로) */
  source: string
  /** 프로젝트 이름 (디렉토리명 또는 레포명) */
  projectName: string
  /** 임시 디렉토리 여부 (GitHub 다운로드 시 true → 완료 후 정리) */
  isTemporary: boolean
}

function classifyInput(source: string): 'local' | 'github' {
  // GitHub URL 패턴: https://github.com/user/repo, github:user/repo
  if (
    source.startsWith('https://github.com/') ||
    source.startsWith('github:')
  ) {
    return 'github'
  }
  return 'local'
}
```

#### 로컬 경로 처리

```typescript
async function resolveLocal(source: string): Promise<ResolvedRepo> {
  // 1. 상대 경로 → 절대 경로 변환
  const absolutePath = path.resolve(process.cwd(), source)

  // 2. 존재 여부 확인
  if (!await pathExists(absolutePath)) {
    throw new UserError(
      `경로가 존재하지 않습니다: ${absolutePath}`,
      '올바른 프로젝트 경로를 지정해 주세요.'
    )
  }

  // 3. 디렉토리 여부 확인
  const stat = await fs.stat(absolutePath)
  if (!stat.isDirectory()) {
    throw new UserError(
      `디렉토리가 아닙니다: ${absolutePath}`,
      '프로젝트의 루트 디렉토리 경로를 지정해 주세요.'
    )
  }

  return {
    localPath: absolutePath,
    source,
    projectName: path.basename(absolutePath),
    isTemporary: false,
  }
}
```

#### GitHub URL 다운로드

```typescript
import { downloadTemplate } from 'giget'

async function resolveGitHub(source: string): Promise<ResolvedRepo> {
  // 1. URL 정규화 → giget 형식
  //    https://github.com/user/repo → github:user/repo
  //    https://github.com/user/repo/tree/main/packages/web → github:user/repo/packages/web#main
  const gigetSource = normalizeToGigetFormat(source)

  // 2. 임시 디렉토리 생성
  const tmpDir = path.join(os.tmpdir(), `ditto-${Date.now()}`)

  // 3. giget으로 다운로드 (tar 기반, git clone보다 빠름)
  try {
    const { dir } = await downloadTemplate(gigetSource, {
      dir: tmpDir,
      force: true,
    })

    const repoName = extractRepoName(source)

    return {
      localPath: dir,
      source,
      projectName: repoName,
      isTemporary: true,
    }
  } catch (error) {
    throw new UserError(
      `GitHub 레포 다운로드 실패: ${source}`,
      'URL이 올바른지, 공개 레포인지 확인해 주세요.',
    )
  }
}
```

#### Monorepo 감지 및 패키지 선택

```typescript
interface MonorepoDetection {
  isMonorepo: boolean
  workspaceRoot?: string
  packages?: string[]
  selectedPackage?: string
}

async function detectMonorepo(
  repoPath: string,
  packageOption?: string,
): Promise<MonorepoDetection> {
  // 1. --package 옵션이 명시된 경우 → 해당 경로 직접 사용
  if (packageOption) {
    const pkgPath = path.join(repoPath, packageOption)
    if (!await pathExists(path.join(pkgPath, 'package.json'))) {
      throw new UserError(
        `패키지를 찾을 수 없습니다: ${packageOption}`,
        `${repoPath} 내에 해당 경로가 존재하는지 확인해 주세요.`
      )
    }
    return {
      isMonorepo: true,
      workspaceRoot: repoPath,
      selectedPackage: packageOption,
    }
  }

  // 2. 자동 감지: 루트 package.json의 workspaces 필드 확인
  const rootPkgPath = path.join(repoPath, 'package.json')
  if (!await pathExists(rootPkgPath)) return { isMonorepo: false }

  const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf-8'))

  // workspaces 필드 존재 여부 (npm/yarn/pnpm 호환)
  const workspaces = rootPkg.workspaces
    ?? (await detectPnpmWorkspaces(repoPath))

  if (!workspaces) return { isMonorepo: false }

  // 3. workspace 패턴에서 FE 패키지 후보 탐색
  const packages = await resolveWorkspacePackages(repoPath, workspaces)
  const fePackages = await filterFEPackages(packages)

  if (fePackages.length === 0) {
    return { isMonorepo: true, workspaceRoot: repoPath, packages }
  }

  if (fePackages.length === 1) {
    // FE 패키지가 하나뿐이면 자동 선택
    logger.info(`Monorepo 감지 — FE 패키지 자동 선택: ${fePackages[0]}`)
    return {
      isMonorepo: true,
      workspaceRoot: repoPath,
      packages,
      selectedPackage: fePackages[0],
    }
  }

  // 4. FE 패키지가 여러 개 → 사용자에게 선택 요청
  throw new UserError(
    `Monorepo에 FE 패키지가 ${fePackages.length}개 감지되었습니다: ${fePackages.join(', ')}`,
    `--package 옵션으로 분석할 패키지를 지정해 주세요. 예: ditto analyze ./repo --package ${fePackages[0]}`
  )
}

/** FE 패키지 여부 판별 — package.json dependencies에 FE 프레임워크 존재 */
async function filterFEPackages(packagePaths: string[]): Promise<string[]> {
  const FE_INDICATORS = [
    'react', 'react-dom', 'next', 'vue', 'nuxt',
    'svelte', '@sveltejs/kit', 'astro', '@angular/core',
  ]

  const results: string[] = []
  for (const pkgPath of packagePaths) {
    const pkgJson = await readPackageJson(pkgPath)
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
    }
    if (FE_INDICATORS.some(dep => dep in allDeps)) {
      results.push(pkgPath)
    }
  }
  return results
}
```

### 1.2 File Scanner

**책임**: 프로젝트 디렉토리에서 FE 관련 파일을 스캔하고, 분석 불필요한 파일을 제외한다.

#### Ignore 패턴

```typescript
// src/phases/extraction/file-scanner.ts
import { glob } from 'tinyglobby'

/** 분석에서 제외할 디렉토리/파일 패턴 */
const IGNORE_PATTERNS = [
  // 의존성 & 빌드 산출물
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.astro/**',
  '**/.output/**',

  // 버전 관리 & IDE
  '**/.git/**',
  '**/.idea/**',
  '**/.vscode/**',

  // 테스트 & 품질 도구
  '**/coverage/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/.storybook/**',
  '**/cypress/**',
  '**/e2e/**',

  // 기타
  '**/public/assets/**',   // 대형 정적 에셋
  '**/*.map',              // 소스맵
  '**/CHANGELOG*',
  '**/LICENSE*',
  '**/.env*',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
]
```

#### FE 파일 필터링 전략

```typescript
/** 분석 대상으로 포함할 확장자 */
const INCLUDE_EXTENSIONS = [
  // 컴포넌트 & 페이지
  '.tsx', '.jsx', '.vue', '.svelte', '.astro',
  // 스타일
  '.css', '.scss', '.sass', '.less',
  // 설정 & 테마
  '.ts', '.js', '.mjs', '.cjs',
  // 에셋 메타
  '.svg',
  // 설정 파일 (JSON)
  '.json',
]

/** 특별히 포함해야 할 설정 파일 패턴 */
const CONFIG_INCLUDE = [
  'package.json',
  'tailwind.config.*',
  'postcss.config.*',
  'tsconfig.json',
  'tsconfig.*.json',
  'next.config.*',
  'vite.config.*',
  'svelte.config.*',
  'astro.config.*',
  'nuxt.config.*',
]

interface ScanResult {
  /** 전체 파일 트리 (FileTreeNode[]) */
  fileTree: FileTreeNode[]
  /** FE 관련 파일 목록 (필터링 후) */
  relevantFiles: ScannedFile[]
  /** 통계 */
  stats: {
    totalScanned: number
    ignored: number
    relevant: number
  }
}

async function scanFiles(rootPath: string): Promise<ScanResult> {
  // 1. tinyglobby로 전체 파일 스캔 (ignore 패턴 적용)
  const allFiles = await glob('**/*', {
    cwd: rootPath,
    ignore: IGNORE_PATTERNS,
    onlyFiles: true,
    dot: false,
  })

  // 2. 확장자 기반 1차 필터링
  const extensionFiltered = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase()
    return INCLUDE_EXTENSIONS.includes(ext)
  })

  // 3. 설정 파일 별도 수집 (확장자 필터에서 누락될 수 있는 파일)
  const configFiles = await glob(CONFIG_INCLUDE, {
    cwd: rootPath,
    ignore: IGNORE_PATTERNS,
  })

  // 4. 합집합 (중복 제거)
  const relevantPaths = [...new Set([...extensionFiltered, ...configFiles])]

  // 5. 파일 메타데이터 수집
  const relevantFiles = await Promise.all(
    relevantPaths.map(async filePath => {
      const fullPath = path.join(rootPath, filePath)
      const stat = await fs.stat(fullPath)
      return {
        relativePath: filePath,
        absolutePath: fullPath,
        extension: path.extname(filePath).toLowerCase(),
        sizeBytes: stat.size,
        estimatedTokens: Math.ceil(stat.size / 4),
      }
    })
  )

  // 6. 파일 트리 구축
  const fileTree = buildFileTree(allFiles)

  return {
    fileTree,
    relevantFiles,
    stats: {
      totalScanned: allFiles.length,
      ignored: allFiles.length - relevantPaths.length,
      relevant: relevantPaths.length,
    },
  }
}
```

### 1.3 Code Extractor

**책임**: 스캔된 파일의 내용을 읽고, 관련도 기반 우선순위를 부여하여 `CodeChunk[]`를 생성한다.

#### 파일 우선순위 체계

파일 유형별 우선순위를 정의하여, LLM 컨텍스트 구성 시 중요한 파일부터 포함한다.

```typescript
// src/phases/extraction/code-extractor.ts

/**
 * 파일 우선순위 (낮을수록 높은 우선순위).
 * 이 순서대로 LLM 컨텍스트에 포함된다.
 */
const FILE_PRIORITY: Record<CodeFileType, number> = {
  config:    1,  // tailwind.config, theme 설정 — 디자인 토큰의 원천
  style:     2,  // CSS, SCSS, CSS Modules — 스타일링 정보 직접 포함
  layout:    3,  // 레이아웃 컴포넌트 — 구조적 특징
  component: 4,  // UI 컴포넌트 — 디자인 패턴
  page:      5,  // 페이지 파일 — 구성 정보
  hook:      6,  // 커스텀 훅 (애니메이션 관련)
  asset:     7,  // SVG, 폰트 선언
  utility:   8,  // 유틸리티/헬퍼
  other:     9,  // 기타
}
```

#### 파일 유형 분류 규칙

```typescript
function classifyFileType(
  filePath: string,
  content: string,
): CodeFileType {
  const basename = path.basename(filePath).toLowerCase()
  const dir = path.dirname(filePath).toLowerCase()

  // ── 설정 파일 ──
  if (
    basename.startsWith('tailwind.config') ||
    basename.startsWith('postcss.config') ||
    basename.startsWith('next.config') ||
    basename.startsWith('vite.config') ||
    basename === 'tsconfig.json' ||
    basename === 'package.json'
  ) return 'config'

  // 테마/토큰 정의 파일
  if (
    basename.includes('theme') ||
    basename.includes('token') ||
    basename.includes('design-token')
  ) return 'config'

  // CSS Variables 정의가 주된 내용인 파일
  if (
    (filePath.endsWith('.css') || filePath.endsWith('.scss')) &&
    content.includes(':root') &&
    (content.match(/--[\w-]+/g)?.length ?? 0) > 5
  ) return 'config'

  // ── 스타일 파일 ──
  if (/\.(css|scss|sass|less)$/.test(filePath)) return 'style'
  if (basename.endsWith('.module.css') || basename.endsWith('.module.scss')) return 'style'
  if (basename.includes('.styled.') || basename.includes('.styles.')) return 'style'

  // ── 레이아웃 ──
  if (
    basename.startsWith('layout') ||
    basename.startsWith('header') ||
    basename.startsWith('footer') ||
    basename.startsWith('sidebar') ||
    basename.startsWith('nav') ||
    dir.includes('/layout')
  ) return 'layout'

  // ── 페이지 ──
  if (
    dir.includes('/pages') ||
    dir.includes('/app') && basename === 'page.tsx' ||
    dir.includes('/app') && basename === 'page.jsx' ||
    dir.includes('/routes')
  ) return 'page'

  // ── 컴포넌트 ──
  if (
    /\.(tsx|jsx)$/.test(filePath) ||
    filePath.endsWith('.vue') ||
    filePath.endsWith('.svelte')
  ) return 'component'

  // ── 훅 ──
  if (basename.startsWith('use') && /\.(ts|js)$/.test(filePath)) return 'hook'

  // ── 에셋 ──
  if (filePath.endsWith('.svg')) return 'asset'

  // ── 유틸리티 ──
  if (dir.includes('/util') || dir.includes('/helper') || dir.includes('/lib')) return 'utility'

  return 'other'
}
```

#### 파일 크기 제한 및 청크 생성

```typescript
/** 단일 파일의 최대 읽기 크기 (200KB) */
const MAX_FILE_SIZE_BYTES = 200 * 1024

/** CodeChunk 생성 — 파일 내용 읽기 + 메타데이터 부여 */
async function extractCodeChunks(
  files: ScannedFile[],
  rootPath: string,
): Promise<CodeChunk[]> {
  const chunks: CodeChunk[] = []

  for (const file of files) {
    // 크기 초과 파일은 건너뜀 (minified 파일 등)
    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
      logger.debug(`파일 크기 초과로 건너뜀: ${file.relativePath} (${(file.sizeBytes / 1024).toFixed(0)}KB)`)
      continue
    }

    const content = await fs.readFile(file.absolutePath, 'utf-8')

    // 빈 파일, 바이너리 파일 건너뜀
    if (!content.trim() || isBinaryContent(content)) continue

    const fileType = classifyFileType(file.relativePath, content)

    chunks.push({
      filePath: file.relativePath,
      fileType,
      content,
      startLine: 1,
      endLine: content.split('\n').length,
    })
  }

  // 우선순위 순 정렬
  chunks.sort((a, b) => FILE_PRIORITY[a.fileType] - FILE_PRIORITY[b.fileType])

  return chunks
}
```

### 1.4 Config Extractor

**책임**: 프로젝트 설정 파일을 파싱하여 디자인 분석에 필요한 정보를 구조화한다.

#### 설정 파일별 추출 항목

```typescript
// src/phases/extraction/config-extractor.ts

interface ExtractedConfigs {
  packageJson: PackageJsonExtract
  tailwindConfig: string | null       // 파일 전문 (직접 LLM에 전달)
  tsconfigJson: TsconfigExtract | null
  nextConfig: string | null
  viteConfig: string | null
  postcssConfig: string | null
  otherConfigs: ConfigFile[]          // 기타 설정 파일 원문
}
```

**package.json에서 추출하는 항목:**

```typescript
interface PackageJsonExtract {
  name: string
  /** dependencies + devDependencies 전체 (기술 스택 감지에 사용) */
  allDependencies: Record<string, string>
  /** scripts 중 dev, build, start만 (프레임워크 힌트) */
  relevantScripts: Record<string, string>
  /** browserslist (반응형 전략 힌트) */
  browserslist?: string[]
}

function extractPackageJson(content: string): PackageJsonExtract {
  const pkg = JSON.parse(content)
  return {
    name: pkg.name ?? 'unknown',
    allDependencies: {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    },
    relevantScripts: {
      ...(pkg.scripts?.dev && { dev: pkg.scripts.dev }),
      ...(pkg.scripts?.build && { build: pkg.scripts.build }),
      ...(pkg.scripts?.start && { start: pkg.scripts.start }),
    },
    browserslist: pkg.browserslist,
  }
}
```

**tailwind.config에서 추출하는 항목** (파일 전문을 전달하되, 핵심 영역 안내):

| 섹션 | 추출 목적 |
|------|----------|
| `theme.extend.colors` | 커스텀 컬러 팔레트 |
| `theme.extend.spacing` | 커스텀 간격 스케일 |
| `theme.extend.fontSize` | 커스텀 타이포그래피 스케일 |
| `theme.extend.borderRadius` | 커스텀 라운딩 |
| `theme.extend.boxShadow` | 커스텀 그림자 |
| `theme.extend.fontFamily` | 사용 폰트 |
| `theme.screens` | breakpoint 정의 |
| `plugins` | 사용 플러그인 (typography, forms 등) |
| `content` | 파일 범위 (프로젝트 구조 힌트) |
| `darkMode` | 다크모드 전략 (`class` / `media`) |

**tsconfig.json에서 추출하는 항목:**

```typescript
interface TsconfigExtract {
  /** path alias 매핑 (import 경로 해석에 사용) */
  paths: Record<string, string[]> | null
  /** baseUrl */
  baseUrl: string | null
}
```

**next.config / vite.config**: 원문 전체를 전달한다. 플러그인 목록, 이미지 설정, 폰트 설정 등이 디자인 분석에 유용하다.

### 1.5 Tech Stack Detector

**책임**: 프레임워크, 스타일링, UI 라이브러리 등 기술 스택을 감지한다. **두 가지 감지 전략**을 조합한다.

#### 전략 1: 의존성 기반 감지 (package.json)

```typescript
// src/phases/extraction/tech-stack-detector.ts

/** 의존성 이름 → 기술 스택 매핑 테이블 */
const DEPENDENCY_MAP = {
  // 프레임워크
  framework: [
    { deps: ['next'],                       name: 'Next.js' },
    { deps: ['react', 'react-dom'],         name: 'React' },
    { deps: ['vue'],                        name: 'Vue' },
    { deps: ['nuxt'],                       name: 'Nuxt' },
    { deps: ['svelte'],                     name: 'Svelte' },
    { deps: ['@sveltejs/kit'],              name: 'SvelteKit' },
    { deps: ['astro'],                      name: 'Astro' },
    { deps: ['@angular/core'],              name: 'Angular' },
  ],

  // 스타일링
  styling: [
    { deps: ['tailwindcss'],                name: 'Tailwind CSS',       tier: 'tier1' as const },
    { deps: ['@tailwindcss/vite', 'tailwindcss'], name: 'Tailwind CSS', tier: 'tier1' as const },
    { deps: ['sass', 'node-sass'],          name: 'SCSS',              tier: 'tier2' as const },
    { deps: ['styled-components'],          name: 'Styled Components', tier: 'tier2' as const },
    { deps: ['@emotion/react', '@emotion/styled'], name: 'Emotion',    tier: 'tier2' as const },
    { deps: ['@vanilla-extract/css'],       name: 'Vanilla Extract',   tier: 'tier2' as const },
    { deps: ['@stitches/react'],            name: 'Stitches',          tier: 'tier3' as const },
  ],

  // UI 라이브러리
  uiLibrary: [
    { deps: ['@radix-ui/react-dialog', '@radix-ui/react-popover'], name: 'Radix UI' },
    { deps: ['@mui/material'],              name: 'MUI' },
    { deps: ['antd'],                       name: 'Ant Design' },
    { deps: ['@headlessui/react'],          name: 'Headless UI' },
    { deps: ['@chakra-ui/react'],           name: 'Chakra UI' },
    { deps: ['@mantine/core'],              name: 'Mantine' },
  ],

  // 애니메이션
  animation: [
    { deps: ['framer-motion', 'motion'],    name: 'Framer Motion' },
    { deps: ['gsap'],                       name: 'GSAP' },
    { deps: ['@react-spring/web'],          name: 'React Spring' },
    { deps: ['animejs'],                    name: 'Anime.js' },
    { deps: ['lottie-react', 'lottie-web'], name: 'Lottie' },
  ],

  // 아이콘
  icon: [
    { deps: ['lucide-react'],               name: 'Lucide' },
    { deps: ['@heroicons/react'],           name: 'Heroicons' },
    { deps: ['react-icons'],                name: 'React Icons' },
    { deps: ['@phosphor-icons/react'],      name: 'Phosphor' },
    { deps: ['@tabler/icons-react'],        name: 'Tabler Icons' },
  ],
}

function detectFromDependencies(
  allDeps: Record<string, string>,
): Partial<TechStack> {
  const detect = (
    category: keyof typeof DEPENDENCY_MAP,
  ) => {
    const matches = DEPENDENCY_MAP[category].filter(
      entry => entry.deps.some(dep => dep in allDeps)
    )
    return matches.map(m => m.name)
  }

  // 프레임워크는 우선순위로 단일 선택 (Next.js > React > Vue > ...)
  const frameworks = detect('framework')
  const framework = frameworks[0] ?? 'Unknown'

  // 프레임워크 버전 추출
  const frameworkVersion = extractVersion(allDeps, framework)

  return {
    framework: { value: framework, confidenceLevel: 'high' },
    frameworkVersion,
    styling: {
      value: detect('styling').map(name => ({
        name,
        tier: DEPENDENCY_MAP.styling.find(s => s.name === name)!.tier,
      })),
      confidenceLevel: 'high',
    },
    uiLibraries: { value: detect('uiLibrary'), confidenceLevel: 'high' },
    animationLibraries: { value: detect('animation'), confidenceLevel: 'high' },
    iconSystem: { value: detect('icon'), confidenceLevel: 'medium' },
  }
}
```

#### 전략 2: 파일 패턴 기반 감지

의존성만으로 감지할 수 없는 항목을 파일 존재 여부/내용 패턴으로 보완한다.

```typescript
function detectFromFilePatterns(
  files: ScannedFile[],
  codeChunks: CodeChunk[],
): Partial<TechStack> {
  const result: Partial<TechStack> = {}
  const filePaths = files.map(f => f.relativePath)

  // ── shadcn/ui 감지 ──
  // shadcn은 npm 의존성이 아닌 로컬 복사 방식이므로 파일 패턴으로 감지
  const hasShadcnIndicators =
    filePaths.some(f => f.includes('components/ui/button')) &&
    filePaths.some(f => f.includes('components/ui/')) &&
    filePaths.some(f =>
      f.includes('lib/utils') || f.includes('cn(')
    )

  if (hasShadcnIndicators) {
    // uiLibraries에 shadcn/ui 추가
    result.uiLibraries = {
      value: ['shadcn/ui'],
      confidenceLevel: 'medium',
      note: '파일 구조 패턴으로 감지 (components/ui/ + cn 유틸리티)',
    }
  }

  // ── CSS Modules 감지 ──
  const cssModuleFiles = filePaths.filter(
    f => f.endsWith('.module.css') || f.endsWith('.module.scss')
  )
  if (cssModuleFiles.length > 0) {
    result.styling = {
      value: [{ name: 'CSS Modules', tier: 'tier2' }],
      confidenceLevel: 'high',
    }
  }

  // ── 폰트 로딩 방식 감지 ──
  const fontPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /next\/font/, name: 'next/font' },
    { pattern: /fonts\.googleapis\.com/, name: 'Google Fonts' },
    { pattern: /@font-face/, name: 'Local Font (@font-face)' },
  ]

  const detectedFonts: string[] = []
  for (const chunk of codeChunks) {
    for (const { pattern, name } of fontPatterns) {
      if (pattern.test(chunk.content) && !detectedFonts.includes(name)) {
        detectedFonts.push(name)
      }
    }
  }
  if (detectedFonts.length > 0) {
    result.fontLoading = {
      value: detectedFonts,
      confidenceLevel: 'medium',
    }
  }

  // ── SVG 직접 사용 감지 ──
  const svgFiles = filePaths.filter(f => f.endsWith('.svg'))
  if (svgFiles.length > 5 && (!result.iconSystem || result.iconSystem.value.length === 0)) {
    result.iconSystem = {
      value: ['SVG 직접 사용'],
      confidenceLevel: 'medium',
      note: `${svgFiles.length}개 SVG 파일 감지`,
    }
  }

  // ── TypeScript 감지 ──
  result.typescript = filePaths.some(f => f.endsWith('.tsx') || f.endsWith('.ts'))

  // ── 패키지 매니저 감지 ──
  if (filePaths.includes('pnpm-lock.yaml')) result.packageManager = 'pnpm'
  else if (filePaths.includes('yarn.lock')) result.packageManager = 'yarn'
  else if (filePaths.includes('package-lock.json')) result.packageManager = 'npm'

  return result
}
```

#### 스타일링 Tier 분류 로직

```typescript
/**
 * 스타일링 방식의 Tier를 최종 결정한다.
 * 여러 스타일링이 혼용되면 가장 높은 Tier를 채택한다.
 *
 * - Tier 1: Tailwind CSS, CSS Variables → 직접 토큰 추출 + LLM 분석
 * - Tier 2: CSS Modules, SCSS, Styled Components → LLM 기반 패턴 분석
 * - Tier 3: CSS-in-JS 런타임, 기타 → 최선 노력, 한계 명시
 */
function determineStylingTier(stylingMethods: StylingInfo[]): StylingTier {
  if (stylingMethods.length === 0) return 'tier3'

  const tiers = stylingMethods.map(s => s.tier)
  if (tiers.includes('tier1')) return 'tier1'
  if (tiers.includes('tier2')) return 'tier2'
  return 'tier3'
}
```

### 1.6 Health Check

**책임**: Phase 2 진입 전, 레포의 분석 가능성을 사전 점검한다. 불가능한 레포에 대해 LLM 비용 소모를 방지한다.

#### 체크 항목별 판정 기준

```typescript
// src/pipeline/health-check.ts

interface HealthCheckInput {
  configs: ExtractedConfigs
  codeChunks: CodeChunk[]
  techStack: TechStack
  stats: ExtractionStats
}

function runHealthCheck(input: HealthCheckInput): HealthCheckResult {
  const checks: HealthCheckItem[] = []

  // ── Check 1: FE 프로젝트 여부 ──
  const hasFEFramework =
    input.techStack.framework.value !== 'Unknown'
  const hasFEDeps = ['react', 'react-dom', 'vue', 'svelte', 'astro']
    .some(dep => dep in (input.configs.packageJson?.allDependencies ?? {}))

  if (hasFEFramework || hasFEDeps) {
    checks.push({
      name: 'FE 프로젝트 여부',
      status: 'pass',
      message: `FE 프레임워크 감지: ${input.techStack.framework.value}`,
    })
  } else if (input.configs.packageJson) {
    checks.push({
      name: 'FE 프로젝트 여부',
      status: 'fail',
      message: 'package.json에 FE 프레임워크 의존성이 없습니다.',
    })
  } else {
    checks.push({
      name: 'FE 프로젝트 여부',
      status: 'fail',
      message: 'package.json을 찾을 수 없습니다.',
    })
  }

  // ── Check 2: 스타일링 파일 존재 ──
  const styleChunks = input.codeChunks.filter(
    c => c.fileType === 'style' || c.fileType === 'config'
  )
  const hasTailwindConfig = input.configs.tailwindConfig !== null
  const hasStyleFiles = styleChunks.length > 0

  if (hasTailwindConfig || hasStyleFiles) {
    checks.push({
      name: '스타일링 코드 존재',
      status: 'pass',
      message: hasTailwindConfig
        ? 'Tailwind CSS 설정 감지'
        : `스타일 파일 ${styleChunks.length}개 감지`,
    })
  } else {
    // 인라인 스타일만 있는 경우 → warn
    const hasInlineStyles = input.codeChunks.some(
      c => c.content.includes('style={{') || c.content.includes('style={')
    )
    if (hasInlineStyles) {
      checks.push({
        name: '스타일링 코드 존재',
        status: 'warn',
        message: '인라인 스타일만 감지됨. 토큰 추출 정확도가 낮을 수 있습니다.',
      })
    } else {
      checks.push({
        name: '스타일링 코드 존재',
        status: 'fail',
        message: '스타일링 관련 코드를 찾을 수 없습니다.',
      })
    }
  }

  // ── Check 3: 컴포넌트 파일 존재 ──
  const componentChunks = input.codeChunks.filter(
    c => c.fileType === 'component' || c.fileType === 'layout'
  )
  if (componentChunks.length >= 1) {
    checks.push({
      name: '컴포넌트 파일 존재',
      status: 'pass',
      message: `컴포넌트 파일 ${componentChunks.length}개 감지`,
    })
  } else {
    checks.push({
      name: '컴포넌트 파일 존재',
      status: 'warn',
      message: '컴포넌트 파일이 감지되지 않았습니다. 분석 범위가 제한될 수 있습니다.',
    })
  }

  // ── 최종 판정 ──
  const hasAnyFail = checks.some(c => c.status === 'fail')
  const hasAnyWarn = checks.some(c => c.status === 'warn')

  return {
    status: hasAnyFail ? 'fail' : hasAnyWarn ? 'warn' : 'pass',
    checks,
    summary: hasAnyFail
      ? `분석 불가: ${checks.filter(c => c.status === 'fail').map(c => c.message).join('; ')}`
      : hasAnyWarn
        ? `경고: ${checks.filter(c => c.status === 'warn').map(c => c.message).join('; ')}`
        : '모든 사전 점검 통과',
  }
}
```

#### Health Check 결과에 따른 파이프라인 동작

| 결과 | 동작 |
|------|------|
| **pass** | Phase 2로 정상 진행 |
| **warn** | 경고 메시지 출력 후 Phase 2 진행. `AnalysisResult.metadata`에 경고 기록 |
| **fail** | `UserError` throw → 파이프라인 즉시 중단. 실패 사유와 해결 힌트 표시 |

---

## Phase 2: Analysis (LLM Core)

디자인 분석의 핵심 단계. 모든 분석기는 `generateObject()` + Zod structured output을 사용한다.

### 2.1 분석기 구조

Phase 2는 **7개 개별 분석기** + **1개 종합기**로 구성된다.

```
ExtractedData (Phase 1 출력)
      │
      ├─► Tech Stack (이미 Phase 1에서 감지 완료, Phase 2에서는 전달만)
      │
      ├─► Token Analyzer ─────────────┐
      ├─► Component Analyzer ─────────┤
      ├─► Layout Analyzer ────────────┤
      ├─► Page Structure Analyzer ────┤──► Essence Synthesizer ──► DesignEssence
      ├─► Responsive Analyzer ────────┤
      └─► Interaction Analyzer ───────┘
                                              │
                                              ▼
                                       AnalysisResult
```

각 분석기의 공통 인터페이스:

```typescript
// src/phases/analysis/analyzers/base.ts

interface AnalyzerInput {
  /** Phase 1에서 추출한 코드 청크 (분석기별로 컨텍스트 빌더가 선별) */
  codeChunks: CodeChunk[]
  /** 설정 파일 */
  configs: ExtractedConfigs
  /** 감지된 기술 스택 */
  techStack: TechStack
  /** 파일 트리 */
  fileTree: FileTreeNode[]
}

interface AnalyzerOutput<T> {
  /** 분석 결과 */
  result: T
  /** 사용된 토큰 수 */
  usage: { inputTokens: number; outputTokens: number }
  /** 소요 시간 (ms) */
  durationMs: number
}

type Analyzer<T> = (
  input: AnalyzerInput,
  modelConfig: ModelConfig,
) => Promise<AnalyzerOutput<T>>
```

### 2.2 분석 순서 및 의존 관계

```
                    ┌─────────────────────┐
                    │   Tech Stack        │  (Phase 1에서 이미 완료)
                    │   (선행 완료)         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
           ┌───────┤   Wave 1 (병렬)      ├───────┐
           │       └─────────────────────┘        │
           │                                       │
    ┌──────▼──────┐  ┌──────────────┐  ┌──────────▼─────────┐
    │   Token     │  │  Component   │  │    Layout           │
    │  Analyzer   │  │  Analyzer    │  │    Analyzer         │
    └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘
           │                │                      │
           └────────────────┼──────────────────────┘
                            │
                    ┌───────▼─────────────┐
           ┌───────┤   Wave 2 (병렬)      ├───────┐
           │       └─────────────────────┘        │
           │                                       │
    ┌──────▼──────────┐  ┌──────────────┐  ┌──────▼──────────────┐
    │  Page Structure  │  │  Responsive  │  │    Interaction      │
    │  Analyzer        │  │  Analyzer    │  │    Analyzer         │
    └──────┬───────────┘  └──────┬───────┘  └──────┬──────────────┘
           │                     │                  │
           └─────────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Essence Synthesizer   │  (순차 — 모든 분석 결과 필요)
                    └────────────┬────────────┘
                                 │
                                 ▼
                          AnalysisResult
```

**Wave 1 (병렬 실행)**: Token, Component, Layout — 서로 독립적. 입력은 모두 `ExtractedData`에서 직접 가져온다.

**Wave 2 (병렬 실행)**: Page, Responsive, Interaction — 서로 독립적. Wave 1 결과를 **선택적으로 참조**한다:
- Page Analyzer: Component/Layout 결과를 참조하여 섹션-컴포넌트 매핑 정확도 향상
- Responsive Analyzer: Token 결과(breakpoint)를 참조
- Interaction Analyzer: Component 결과(hover 패턴 구분)를 참조

**Essence Synthesizer (순차)**: 6개 분석기의 모든 결과를 입력으로 받아 최종 디자인 에센스를 종합한다.

#### 실행 코드

```typescript
// src/phases/analysis/index.ts

async function runAnalysisPhase(
  extraction: ExtractionResult,
  modelConfig: ModelConfig,
): Promise<AnalysisResult> {

  // ── Wave 1: 병렬 ──
  const [tokenResult, componentResult, layoutResult] = await Promise.allSettled([
    analyzeTokens(extraction, modelConfig),
    analyzeComponents(extraction, modelConfig),
    analyzeLayout(extraction, modelConfig),
  ])

  const wave1 = {
    tokens: settledValue(tokenResult),
    components: settledValue(componentResult),
    layout: settledValue(layoutResult),
  }

  logPartialFailures('Wave 1', { tokenResult, componentResult, layoutResult })

  // ── Wave 2: 병렬 (Wave 1 결과를 참조 입력으로 전달) ──
  const [pageResult, responsiveResult, interactionResult] = await Promise.allSettled([
    analyzePageStructure(extraction, modelConfig, {
      components: wave1.components,
      layout: wave1.layout,
    }),
    analyzeResponsive(extraction, modelConfig, {
      tokens: wave1.tokens,
    }),
    analyzeInteractions(extraction, modelConfig, {
      components: wave1.components,
    }),
  ])

  const wave2 = {
    pages: settledValue(pageResult),
    responsive: settledValue(responsiveResult),
    interactions: settledValue(interactionResult),
  }

  logPartialFailures('Wave 2', { pageResult, responsiveResult, interactionResult })

  // ── 핵심 분석기 실패 시 파이프라인 중단 ──
  if (!wave1.tokens && !wave1.components) {
    throw new SystemError(
      '핵심 분석기(Token, Component)가 모두 실패했습니다. 분석을 계속할 수 없습니다.',
    )
  }

  // ── Essence Synthesizer: 순차 ──
  const allAnalysis = { ...wave1, ...wave2 }
  const essenceResult = await synthesizeEssence(allAnalysis, modelConfig)

  // ── 최종 조립 ──
  return assembleAnalysisResult(extraction, allAnalysis, essenceResult)
}
```

### 2.3 각 분석기 상세

#### 2.3.1 Token Analyzer

**목적**: 디자인 토큰 체계(Color, Spacing, Border Radius, Shadow, Border, Opacity, Z-Index)를 추출하고, 각 카테고리의 시각적 성격을 서술한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 예시 |
|---------|-------------|------|
| 1 (필수) | config-styling | `tailwind.config.ts` |
| 2 (필수) | styling-theme | `theme.ts`, `design-tokens.ts`, CSS Variables 정의 |
| 3 (필수) | styling-global | `globals.css`, `base.css` |
| 4 (보조) | config-package | `package.json` (UI 라이브러리 확인) |
| 5 (보조) | styling-component | `*.module.css` (값 패턴 추출) |
| 6 (보조) | component-ui | 하드코딩된 값 패턴 파악 |

**추출 로직 — 명시적 토큰 vs 암묵적 토큰:**

```typescript
/**
 * Token Analyzer의 LLM 프롬프트 내 핵심 지시:
 *
 * 1. 명시적 토큰 (confidence: high)
 *    - tailwind.config의 theme.extend에 정의된 값
 *    - CSS Variables (:root { --primary: #xxx })
 *    - theme 객체에 정의된 값
 *    → 정확하게 추출. 토큰 이름과 값을 그대로 사용.
 *
 * 2. 암묵적 토큰 (confidence: medium)
 *    - 하드코딩되었지만 반복적으로 사용되는 값
 *    - 예: 여러 컴포넌트에서 `rounded-lg`, `shadow-md`가 반복
 *    → Tailwind 기본값 또는 반복 패턴에서 토큰 체계를 추론.
 *
 * 3. 추론 토큰 (confidence: low)
 *    - 코드에서 직접 확인할 수 없지만, 프로젝트 성격에서 유추
 *    - 예: 랜딩 페이지인데 spacing 정보가 부족 → spacious로 추정
 *    → 추론 근거를 note에 기록.
 */
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | tailwind.config / CSS Variables / theme 객체에 명시적으로 정의됨 |
| **medium** | 코드에서 3회 이상 반복 사용되는 값. 또는 Tailwind 유틸리티 클래스에서 유추 |
| **low** | 1~2회만 등장하거나, 코드 패턴이 아닌 프로젝트 맥락에서 추론 |

#### 2.3.2 Component Analyzer

**목적**: 레퍼런스에 존재하는 UI 컴포넌트를 식별하고, 카테고리 분류, 디자인 특징, variants/states, 사용 맥락을 분석한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 목적 |
|---------|-------------|------|
| 1 | component-ui | Primitive 컴포넌트 코드 |
| 2 | component-composite | 복합 컴포넌트 코드 |
| 3 | component-layout | 레이아웃 컴포넌트 코드 |
| 4 | styling-component | 컴포넌트별 스타일 |
| 5 | component-page | 페이지 섹션 컴포넌트 |

**컴포넌트 식별 방법:**

```
1. 파일명/디렉토리 패턴:
   - components/ 디렉토리 하위 파일 → 컴포넌트로 판정
   - PascalCase 네이밍의 .tsx/.jsx 파일 → 컴포넌트 후보

2. 코드 패턴:
   - export default function ComponentName() / export const ComponentName = () =>
   - React.FC<Props>, Vue defineComponent, Svelte <script>

3. 카테고리 분류:
   - 파일 경로 힌트: ui/ → primitive, layout/ → layout, sections/ → page-section
   - 코드 내용 힌트: <button> → primitive, 다수의 하위 컴포넌트 조합 → composite
   - Props 힌트: variant, size → primitive, children 위주 → layout
```

**디자인 속성 추출 지시:**

```
각 컴포넌트에 대해 다음을 분석하라:

- designDescription: 이 컴포넌트의 시각적 인상과 디자인적 특징을 2~3문장으로 서술
- visualWeight: 시각적 무게감 (light/medium/heavy)
  - light: 텍스트 링크, 배지, 작은 아이콘 버튼
  - medium: 일반 카드, 입력 필드, 일반 버튼
  - heavy: CTA 버튼, 히어로 배너, 풀사이즈 모달
- variants: 크기(sm/md/lg), 색상(primary/secondary/ghost), 스타일 변형
- states: default, hover, active, disabled, loading, error 등 — 각 상태의 시각적 변화 서술
- stateTransitionFlow: 주요 상태 전이 순서 (예: default → hover → active → loading → success)
- usageContext: 사용 맥락 (예: '히어로 섹션의 주요 CTA', '카드 내부 보조 액션')
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | 명확한 컴포넌트 파일이 존재하고, Props/variants가 코드에 명시됨 |
| **medium** | 컴포넌트 존재는 확실하나, variants/states가 일부 추론됨 |
| **low** | 페이지 코드에서 인라인으로 사용되어 별도 컴포넌트 파일이 없는 경우 |

#### 2.3.3 Layout Analyzer

**목적**: 그리드 시스템, 컨테이너 전략, 간격 리듬, 반복 레이아웃 패턴, 시각적 계층 구조를 분석한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 목적 |
|---------|-------------|------|
| 1 | component-layout | 레이아웃 컴포넌트 (Header, Footer, Container 등) |
| 2 | page-route | 페이지 최상위 구조 |
| 3 | styling-global | 글로벌 레이아웃 스타일 |
| 4 | component-page | 섹션별 레이아웃 패턴 |

**분석 지시 핵심:**

```
1. Grid System 파악:
   - CSS Grid 사용: grid-template-columns, grid-template-rows 패턴
   - Flexbox 사용: flex, flex-wrap 패턴
   - Tailwind: grid, grid-cols-*, flex, gap-* 클래스
   - 혼합 사용 시 어디에 Grid를 쓰고 어디에 Flex를 쓰는지 패턴 분석

2. Container Strategy 파악:
   - max-width 값 (max-w-7xl = 1280px 등)
   - 좌우 패딩 (px-4, px-6 등)
   - 센터링 방식 (mx-auto)
   - 섹션별 Container 사용 여부 (전체 래핑 vs 섹션별 독립)

3. Spacing Rhythm 파악:
   - 섹션 간 간격: py-16, py-24, space-y-* 등
   - 컴포넌트 간 간격: gap-*, space-* 등
   - 내부 패딩: p-*, px-*, py-* 등
   - 일관된 리듬이 있는지 (예: 항상 8의 배수)

4. Layout Pattern 식별:
   - 반복되는 레이아웃 구조를 패턴화
   - 예: "2-column hero (텍스트 좌 + 이미지 우)",
        "3-column card grid", "centered CTA section"
   - 각 패턴에 ASCII 다이어그램 제공

5. Visual Hierarchy:
   - 시선 흐름 패턴 (Z-pattern, F-pattern 등)
   - 정보 우선순위 배치 (무엇이 가장 먼저 눈에 들어오는가)
   - 강조 요소의 배치 패턴 (좌상단? 중앙? 스크롤 후?)
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | 레이아웃 컴포넌트가 별도로 존재하고, 일관된 그리드/컨테이너 패턴 |
| **medium** | 페이지 코드에서 레이아웃 패턴을 추론, 대체로 일관됨 |
| **low** | 레이아웃 구조가 불명확하거나, 페이지마다 완전히 다른 패턴 |

#### 2.3.4 Page Structure Analyzer

**목적**: 각 페이지의 라우트, 목적, 섹션 구성, 섹션 간 시각적 구분 방법을 분석한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 목적 |
|---------|-------------|------|
| 1 | page-route | 페이지/라우트 파일 전문 |
| 2 | component-layout | 공유 레이아웃 구조 |
| 3 | component-page | 섹션 컴포넌트 |

**Wave 1 결과 활용:**

```typescript
// Page Analyzer는 Component/Layout 결과를 참조한다
interface PageAnalyzerContext {
  /** Component Analyzer 결과 (null이면 참조 없이 분석) */
  components: ComponentCatalog | null
  /** Layout Analyzer 결과 (null이면 참조 없이 분석) */
  layout: LayoutSystem | null
}
```

Component 결과가 있으면 프롬프트에 "감지된 컴포넌트 목록"을 추가하여, 섹션-컴포넌트 매핑 정확도를 높인다.

**라우트 감지 로직 (코드 기반, LLM 전 사전 처리):**

```typescript
function detectRoutes(
  fileTree: FileTreeNode[],
  techStack: TechStack,
): DetectedRoute[] {
  const framework = techStack.framework.value

  if (framework === 'Next.js') {
    // App Router: app/**/page.tsx → /path
    // Pages Router: pages/**/*.tsx → /path
    return detectNextjsRoutes(fileTree)
  }
  if (framework === 'React') {
    // react-router 기반: createBrowserRouter, <Route> 패턴
    return detectReactRouterRoutes(fileTree)
  }
  // SvelteKit, Astro 등 각 프레임워크별 라우팅 규칙
  return detectGenericRoutes(fileTree)
}

function detectNextjsRoutes(fileTree: FileTreeNode[]): DetectedRoute[] {
  const routes: DetectedRoute[] = []

  // App Router
  const appPages = findFiles(fileTree, '**/app/**/page.{tsx,jsx,ts,js}')
  for (const page of appPages) {
    const routePath = page.path
      .replace(/^.*\/app/, '')        // app/ 제거
      .replace(/\/page\.(tsx|jsx|ts|js)$/, '') // page.tsx 제거
      .replace(/\[([^\]]+)\]/g, ':$1') // [id] → :id
      || '/'

    routes.push({
      filePath: page.path,
      route: routePath,
      routingType: 'app-router',
    })
  }

  // Pages Router
  const pagesFiles = findFiles(fileTree, '**/pages/**/*.{tsx,jsx,ts,js}')
  for (const page of pagesFiles) {
    if (page.path.includes('_app') || page.path.includes('_document')) continue
    const routePath = page.path
      .replace(/^.*\/pages/, '')
      .replace(/\.(tsx|jsx|ts|js)$/, '')
      .replace(/\/index$/, '/')
      .replace(/\[([^\]]+)\]/g, ':$1')

    routes.push({
      filePath: page.path,
      route: routePath,
      routingType: 'pages-router',
    })
  }

  return routes
}
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | 파일 기반 라우팅(Next.js App/Pages Router)으로 라우트가 명확하고, 섹션 구성이 코드에 명시적 |
| **medium** | 라우트는 명확하나 섹션 구성이 일부 추론됨 |
| **low** | SPA에서 라우팅 코드를 찾을 수 없거나, 단일 페이지로 섹션 구분이 불명확 |

#### 2.3.5 Responsive Analyzer

**목적**: 반응형 접근 방식, breakpoint 정의, 각 breakpoint에서의 주요 변화 패턴을 분석한다. 레퍼런스가 반응형을 미지원하면 `null`을 반환한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 목적 |
|---------|-------------|------|
| 1 | config-styling | breakpoint 정의 (tailwind.config.screens) |
| 2 | styling-global | 미디어 쿼리 패턴 |
| 3 | component-layout | 반응형 레이아웃 변화 |
| 4 | styling-component | 컴포넌트별 반응형 스타일 |

**반응형 지원 여부 판별:**

```typescript
function hasResponsiveSupport(
  codeChunks: CodeChunk[],
  configs: ExtractedConfigs,
): boolean {
  // 1. tailwind.config에 screens 커스터마이징이 있으면 → 지원
  // 2. Tailwind 반응형 프리픽스 사용 횟수 체크
  const responsivePrefixCount = countPatterns(
    codeChunks,
    /\b(sm:|md:|lg:|xl:|2xl:)/g,
  )

  // 3. @media 쿼리 사용 횟수 체크
  const mediaQueryCount = countPatterns(
    codeChunks,
    /@media\s*\(/g,
  )

  // 반응형 관련 패턴이 5회 미만이면 미지원으로 판정
  return (responsivePrefixCount + mediaQueryCount) >= 5
}
```

**Breakpoint 감지 전략:**

```
1. 명시적 정의 (confidence: high):
   - tailwind.config의 theme.screens
   - CSS Variables에 breakpoint 정의
   - 글로벌 CSS의 @custom-media

2. 사용 패턴 기반 (confidence: medium):
   - @media (min-width: 768px) 패턴에서 값 추출
   - Tailwind sm:/md:/lg: 프리픽스 → 기본 breakpoint 매핑
     sm: → 640px, md: → 768px, lg: → 1024px, xl: → 1280px, 2xl: → 1536px

3. mobile-first vs desktop-first 판별:
   - min-width 미디어 쿼리가 대다수 → mobile-first
   - max-width 미디어 쿼리가 대다수 → desktop-first
   - Tailwind 사용 시 기본 mobile-first
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | breakpoint가 설정 파일에 명시적으로 정의되고, 반응형 패턴이 일관적 |
| **medium** | Tailwind 기본 breakpoint 사용, 반응형 패턴이 존재하나 일부 불일치 |
| **low** | 미디어 쿼리가 산발적이고, 체계적인 반응형 전략을 파악하기 어려움 |

#### 2.3.6 Interaction Analyzer

**목적**: 전체 모션 스타일, 기본 트랜지션 패턴, hover 효과, 진입 애니메이션, 스크롤 기반 동작, 마이크로인터랙션을 분석한다.

**LLM에 전송하는 코드:**

| 우선순위 | 파일 카테고리 | 목적 |
|---------|-------------|------|
| 1 | animation | 애니메이션 전용 코드, motion 설정 |
| 2 | component-ui | hover/transition 패턴 |
| 3 | component-composite | 복합 인터랙션 |
| 4 | styling-global | @keyframes, CSS transitions |
| 5 | config-package | 애니메이션 라이브러리 확인 |

**분석 지시 핵심:**

```
1. Overall Motion Style 판별:
   - restrained (절제된): 필수적인 곳에만 최소한의 모션. duration 짧음 (100~200ms)
   - moderate (적절한): 의미 있는 곳에 모션. 중간 duration (200~400ms)
   - expressive (표현적): 적극적 모션 활용. 긴 duration (300~600ms+), 다양한 easing

2. Default Transition 추출:
   - 가장 많이 사용되는 transition duration/easing 조합
   - Tailwind: transition-*, duration-*, ease-*
   - CSS: transition: all 200ms ease-out

3. Hover Effect 패턴 분류:
   - 대상별 (Button, Card, Link, Nav item) 효과 정리
   - 예: "카드: shadow 증가 + translateY(-2px)", "버튼: 배경색 밝아짐"

4. Entrance Animation 분류:
   - page-load 시 진입 애니메이션
   - scroll-into-view 트리거 애니메이션
   - framer-motion: initial/animate/whileInView 패턴
   - CSS: @keyframes + animation 속성

5. Scroll Behavior:
   - scroll-triggered animation
   - parallax
   - sticky elements
   - progress indicator

6. Micro-interaction:
   - toggle, accordion, tooltip, menu 등의 세부 모션
```

**Confidence 산출 기준:**

| Confidence | 조건 |
|-----------|------|
| **high** | 애니메이션 라이브러리(Framer Motion, GSAP)를 사용하고, 패턴이 명확 |
| **medium** | CSS transition/animation을 사용, 패턴이 대체로 일관적 |
| **low** | 인터랙션 코드가 매우 적거나, 인라인 스타일로 산발적 |

#### 2.3.7 Essence Synthesizer

**목적**: 6개 분석기의 모든 결과를 종합하여 디자인의 핵심 정체성(`DesignEssence`)을 도출한다. 이 분석기의 출력이 **전체 분석의 최종이자 가장 핵심적인 결과**이다.

**입력**: 코드가 아닌 **분석 결과 데이터**를 입력으로 받는다.

```typescript
// src/phases/analysis/essence-synthesizer.ts

interface EssenceSynthesizerInput {
  tokens: DesignTokens | null
  components: ComponentCatalog | null
  layout: LayoutSystem | null
  pages: PageStructures | null
  responsive: ResponsiveStrategy | null
  interactions: InteractionPatterns | null
  techStack: TechStack
}
```

**LLM 프롬프트 구성:**

```typescript
function buildEssencePrompt(input: EssenceSynthesizerInput): string {
  const sections: string[] = []

  sections.push('# 분석 결과 종합')
  sections.push('아래 개별 분석 결과를 종합하여 디자인의 핵심 정체성을 도출하라.')

  // 각 분석 결과를 요약 형태로 포함
  if (input.tokens) {
    sections.push('## 디자인 토큰')
    sections.push(summarizeTokens(input.tokens))
  }

  if (input.components) {
    sections.push('## 컴포넌트')
    sections.push(summarizeComponents(input.components))
  }

  if (input.layout) {
    sections.push('## 레이아웃')
    sections.push(summarizeLayout(input.layout))
  }

  // ... (pages, responsive, interactions 동일 패턴)

  sections.push(`
## 종합 지시

위 분석 결과를 바탕으로:

1. **디자인 정체성 한 줄 요약**: 이 디자인을 한 문장으로 표현하라.
   예: "절제된 여백과 네이비 컬러의 신뢰감 있는 SaaS 대시보드"

2. **디자인 원칙**: 이 디자인이 따르는 핵심 규칙 3~5개를 도출하라.
   각 원칙은 이름(영어) + 설명(한국어) 형태.

3. **무드 키워드**: 이 디자인의 느낌을 표현하는 키워드 4~6개.

4. **스타일 카테고리**: 이 디자인이 속하는 카테고리 (복수 가능).

5. **시각적 특징 요약**: 6가지 축(Color, Typography, Spacing, Shape, Depth, Motion)별 성격을 각각 1~2문장으로.

6. **Do's & Don'ts**: 이 스타일을 양산할 때 지켜야 할 규칙.
   카테고리별(Color, Typography, Spacing, Component, Motion) 각 2~4개씩.
   각 규칙은 "규칙 + 이유" 형태. "적절하게", "자연스럽게" 같은 모호한 표현 금지.
   예: "Do: 버튼 호버 시 배경색만 변경, translateY 사용 금지 — 절제된 모션 원칙"

7. **비슷한 스타일의 레퍼런스**: 유사한 디자인 느낌의 웹사이트/서비스 2~3개.
`)

  return sections.join('\n\n')
}
```

**Do's & Don'ts 생성 품질 기준:**

```
금지 표현:
  - "적절하게 사용한다" → 대신: "spacing-scale의 md(16px) 이상만 사용한다"
  - "자연스럽게 배치한다" → 대신: "시선 흐름은 좌→우 방향을 유지하고, CTA는 섹션 하단 중앙에 배치한다"
  - "필요에 따라" → 대신: "CTA 버튼에만 적용하고, 보조 버튼에는 적용하지 않는다"

필수 포함:
  - 각 규칙에 반드시 '이유'를 포함 (디자인 에센스와의 연결)
  - 구체적 토큰 이름이나 수치 참조 (가능한 경우)
```

**Confidence 산출:**
Essence의 confidence는 **입력 분석기들의 confidence 가중 평균**으로 결정한다:

```typescript
function calculateEssenceConfidence(
  input: EssenceSynthesizerInput,
): ConfidenceLevel {
  const weights: Record<string, number> = {
    tokens: 3,       // 토큰은 가장 중요
    components: 2,
    layout: 2,
    pages: 1,
    responsive: 1,
    interactions: 1,
  }

  let weightedScore = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(weights)) {
    const result = input[key as keyof EssenceSynthesizerInput]
    if (result && 'confidenceLevel' in (result as any)) {
      const score = { high: 3, medium: 2, low: 1 }[(result as any).confidenceLevel]
      weightedScore += score * weight
      totalWeight += weight
    }
  }

  const average = totalWeight > 0 ? weightedScore / totalWeight : 1
  if (average >= 2.5) return 'high'
  if (average >= 1.5) return 'medium'
  return 'low'
}
```

### 2.4 Confidence Level 산출 종합

| 분석기 | high | medium | low |
|-------|------|--------|-----|
| Token | 명시적 정의(config, CSS Vars) | 반복 패턴 3회+ | 1~2회 또는 맥락 추론 |
| Component | 별도 파일 + 명시적 Props/variants | 파일 존재, 일부 추론 | 인라인, 파일 없음 |
| Layout | 레이아웃 컴포넌트 존재 + 일관된 패턴 | 페이지 코드에서 추론 | 불명확, 비일관 |
| Page | 파일 기반 라우팅 + 명시적 섹션 | 라우트 명확, 섹션 일부 추론 | SPA 단일 페이지 |
| Responsive | 설정에 breakpoint 정의 + 일관 패턴 | Tailwind 기본값 + 존재 | 산발적 미디어 쿼리 |
| Interaction | 애니메이션 라이브러리 + 명확 패턴 | CSS transition + 대체로 일관 | 코드 매우 적음 |
| Essence | 입력 분석기 가중 평균 >= 2.5 | >= 1.5 | < 1.5 |

### 2.5 병렬 vs 순차 실행 — 에러 처리

```typescript
// 부분 실패 처리 유틸리티

function settledValue<T>(result: PromiseSettledResult<AnalyzerOutput<T>>): T | null {
  if (result.status === 'fulfilled') return result.value.result
  return null
}

function logPartialFailures(
  waveName: string,
  results: Record<string, PromiseSettledResult<any>>,
): void {
  for (const [name, result] of Object.entries(results)) {
    if (result.status === 'rejected') {
      logger.warn(`[${waveName}] ${name} 실패: ${result.reason?.message ?? '알 수 없는 오류'}`)
      logger.debug(`[${waveName}] ${name} 상세:`, result.reason)
    }
  }
}
```

**부분 실패 시 후속 처리:**

| 실패한 분석기 | 영향 | 처리 |
|-------------|------|------|
| Token | 디자인 토큰 문서 생성 불가 | Phase 3에서 01-design-tokens.md 건너뜀 |
| Component | 컴포넌트 카탈로그 누락 | Phase 3에서 03-component-catalog.md 건너뜀 |
| Layout | 레이아웃 문서 누락 | Phase 3에서 04-layout-system.md 건너뜀 |
| Page | 페이지 구조 문서 누락 | Phase 3에서 05-page-structures.md 건너뜀 |
| Responsive | 반응형 문서 누락 | Phase 3에서 06-responsive-strategy.md 건너뜀, Phase 4에서 responsive step 생략 |
| Interaction | 인터랙션 문서 누락 | Phase 3에서 07-interactions.md 건너뜀, Phase 4에서 interactions step 생략 |
| Token AND Component 동시 실패 | **치명적** | 파이프라인 중단 (핵심 분석기 모두 실패) |
| Essence | **치명적** | 파이프라인 중단 (최종 종합 불가) |

---

## Phase 3: Documentation

분석 결과(`AnalysisResult`)를 사람이 읽을 수 있는 마크다운 디자인 스펙 문서로 변환한다.

### 3.1 문서 생성기 프레임워크

#### Doc Planner — 동적 문서 구성 결정

```typescript
// src/phases/documentation/doc-planner.ts

interface DocumentPlan {
  /** 생성할 코어 문서 목록 */
  coreDocs: CoreDocPlan[]
  /** 동적 추가 문서 목록 */
  dynamicDocs: DynamicDocPlan[]
  /** 제외된 문서 목록 (사유 포함) */
  excluded: ExcludedDocPlan[]
}

interface CoreDocPlan {
  id: CoreDocumentId
  fileName: string
  title: string
  /** 이 문서에 매핑되는 analysis.json 데이터 키 */
  dataSource: string[]
}

function planDocuments(analysis: AnalysisResult): DocumentPlan {
  const coreDocs: CoreDocPlan[] = []
  const excluded: ExcludedDocPlan[] = []

  // 00-overview.md — 항상 생성 (Essence가 있으면)
  if (analysis.designEssence) {
    coreDocs.push({
      id: 'overview',
      fileName: '00-overview.md',
      title: '프로젝트 개요 & 디자인 에센스',
      dataSource: ['designEssence', 'meta', 'techStack'],
    })
  }

  // 01-design-tokens.md — Token 분석 결과가 있으면
  if (analysis.designTokens) {
    coreDocs.push({
      id: 'design-tokens',
      fileName: '01-design-tokens.md',
      title: '디자인 토큰 체계',
      dataSource: ['designTokens'],
    })
  } else {
    excluded.push({
      id: 'design-tokens',
      reason: 'Token 분석 결과 없음 (분석기 실패 또는 스타일링 코드 부족)',
    })
  }

  // 02-typography.md — Typography 토큰이 있으면
  if (analysis.designTokens?.typography) {
    coreDocs.push({
      id: 'typography',
      fileName: '02-typography.md',
      title: '타이포그래피 상세',
      dataSource: ['designTokens.typography'],
    })
  }

  // 03-component-catalog.md
  if (analysis.componentCatalog) {
    coreDocs.push({
      id: 'component-catalog',
      fileName: '03-component-catalog.md',
      title: '컴포넌트 카탈로그',
      dataSource: ['componentCatalog'],
    })
  }

  // 04-layout-system.md
  if (analysis.layoutSystem) {
    coreDocs.push({
      id: 'layout-system',
      fileName: '04-layout-system.md',
      title: '레이아웃 시스템',
      dataSource: ['layoutSystem'],
    })
  }

  // 05-page-structures.md
  if (analysis.pageStructures) {
    coreDocs.push({
      id: 'page-structures',
      fileName: '05-page-structures.md',
      title: '페이지별 구성',
      dataSource: ['pageStructures'],
    })
  }

  // 06-responsive-strategy.md — 반응형 전략이 있으면
  if (analysis.responsiveStrategy) {
    coreDocs.push({
      id: 'responsive-strategy',
      fileName: '06-responsive-strategy.md',
      title: '반응형 전략',
      dataSource: ['responsiveStrategy'],
    })
  } else {
    excluded.push({
      id: 'responsive-strategy',
      reason: '레퍼런스가 반응형을 지원하지 않음',
    })
  }

  // 07-interactions.md — 인터랙션 패턴이 있으면
  if (analysis.interactionPatterns) {
    coreDocs.push({
      id: 'interactions',
      fileName: '07-interactions.md',
      title: '인터랙션 & 애니메이션',
      dataSource: ['interactionPatterns'],
    })
  }

  // 동적 문서 결정
  const dynamicDocs = planDynamicDocuments(analysis)

  return { coreDocs, dynamicDocs, excluded }
}
```

### 3.2 각 문서 생성기 — 분석 데이터와 문서 섹션 매핑

각 문서는 독립적으로 LLM 호출하여 생성한다. 입력은 `AnalysisResult`에서 해당 문서에 필요한 섹션만 추출한다.

| 문서 | 입력 데이터 | 문서 섹션 |
|------|-----------|----------|
| **00-overview** | `designEssence`, `meta`, `techStack` | 소스 정보, 에센스 요약, 무드 & 스타일, 시각적 특징, 디자인 원칙, Do's & Don'ts, 유사 레퍼런스, 문서 목록 |
| **01-design-tokens** | `designTokens` (color, spacing, borderRadius, shadow, border, opacity, zIndex), `designEssence.dosAndDonts.color` | Color Palette, Dark Mode, Spacing Scale, Border Radius, Shadow Scale, Border Patterns |
| **02-typography** | `designTokens.typography`, `designEssence.visualCharacteristics.typographyCharacter` | Font Families, Heading Scale, Body Scale, Typography Principles |
| **03-component-catalog** | `componentCatalog`, `designEssence.dosAndDonts.component` | Overview, 카테고리별 컴포넌트 상세 (디자인 특징, variants, states, 사용 맥락) |
| **04-layout-system** | `layoutSystem`, `designTokens.spacing` | Grid System, Container Strategy, Spacing Rhythm, Common Layout Patterns (ASCII 다이어그램), Visual Hierarchy |
| **05-page-structures** | `pageStructures`, `layoutSystem.commonPatterns` | 페이지 목록, 각 페이지별 섹션 구성, 디자인 노트 |
| **06-responsive-strategy** | `responsiveStrategy` | Approach, Breakpoints, Responsive Patterns, Responsive Typography, Responsive Spacing |
| **07-interactions** | `interactionPatterns`, `designEssence.dosAndDonts.motion` | Overall Motion Style, Default Transition, Hover Effects, Entrance Animations, Scroll Behaviors, Micro-interactions, Library Usage, Motion Principles |

#### 문서 생성 LLM 호출 패턴

```typescript
// src/phases/documentation/generators/tokens-gen.ts

async function generateTokensDoc(
  analysis: AnalysisResult,
  modelConfig: ModelConfig,
): Promise<DocumentEntry> {
  // Structured Output: 섹션별로 분리하여 생성
  const result = await callLLM({
    ...modelConfig,
    temperature: 0.3,
    maxTokens: 16_384,
    system: buildDocSystemPrompt(),
    prompt: buildTokensDocPrompt(analysis),
    schema: z.object({
      colorPaletteSection: z.string(),
      darkModeSection: z.string().optional(),
      spacingSection: z.string(),
      borderRadiusSection: z.string(),
      shadowSection: z.string(),
      borderSection: z.string(),
    }),
    schemaName: 'DesignTokensDocument',
  })

  // 섹션 조립
  const content = assembleDocument('01-design-tokens', result)

  return {
    fileName: '01-design-tokens.md',
    title: '디자인 토큰 체계',
    purpose: '색상, 간격, 그림자 등 디자인 시스템의 기본 값 체계를 정의',
    type: 'core',
    content,
  }
}
```

### 3.3 추가 문서 동적 생성

기본 7개 문서 외에, 레퍼런스의 특성에 따라 추가 문서를 생성한다.

```typescript
// src/phases/documentation/doc-planner.ts

function planDynamicDocuments(analysis: AnalysisResult): DynamicDocPlan[] {
  const dynamicDocs: DynamicDocPlan[] = []
  let nextNumber = 8  // 07 다음부터

  // ── dark-mode-strategy.md ──
  // 조건: 다크모드가 지원되고, 토큰 매핑이 복잡한 경우
  if (
    analysis.designTokens?.color.darkMode?.supported &&
    analysis.designTokens.color.darkMode.approach
  ) {
    dynamicDocs.push({
      fileName: `${String(nextNumber).padStart(2, '0')}-dark-mode-strategy.md`,
      title: '다크모드 전략',
      reason: '다크모드 전환이 디자인의 핵심 특징',
      dataSource: ['designTokens.color.darkMode', 'designTokens.color.palette'],
    })
    nextNumber++
  }

  // ── form-patterns.md ──
  // 조건: form 카테고리 컴포넌트가 5개 이상
  const formComponents = analysis.componentCatalog?.categories
    .find(c => c.category === 'form')
  if (formComponents && formComponents.components.length >= 5) {
    dynamicDocs.push({
      fileName: `${String(nextNumber).padStart(2, '0')}-form-patterns.md`,
      title: '폼 패턴',
      reason: `복잡한 폼 패턴 ${formComponents.components.length}개 감지`,
      dataSource: ['componentCatalog.form'],
    })
    nextNumber++
  }

  // ── icon-system.md ──
  // 조건: 아이콘 시스템이 감지되고, 커스텀 SVG가 10개 이상
  if (
    analysis.techStack.iconSystem.value.includes('SVG 직접 사용') ||
    analysis.techStack.iconSystem.value.length >= 2
  ) {
    dynamicDocs.push({
      fileName: `${String(nextNumber).padStart(2, '0')}-icon-system.md`,
      title: '아이콘 시스템',
      reason: '독자적인 아이콘 시스템이 디자인 에센스의 일부',
      dataSource: ['techStack.iconSystem', 'componentCatalog'],
    })
    nextNumber++
  }

  // ── data-visualization.md ──
  // 조건: data-display 카테고리에 차트/그래프 컴포넌트가 존재
  const dataComponents = analysis.componentCatalog?.categories
    .find(c => c.category === 'data-display')
  const hasCharts = dataComponents?.components.some(
    c => c.name.toLowerCase().includes('chart') || c.name.toLowerCase().includes('graph')
  )
  if (hasCharts) {
    dynamicDocs.push({
      fileName: `${String(nextNumber).padStart(2, '0')}-data-visualization.md`,
      title: '데이터 시각화',
      reason: '차트/그래프 패턴이 디자인의 핵심 요소',
      dataSource: ['componentCatalog.data-display'],
    })
    nextNumber++
  }

  return dynamicDocs
}
```

### 3.4 Confidence 반영

문서 내에서 confidence level에 따라 표시를 달리한다.

```typescript
function formatWithConfidence(
  content: string,
  confidence: ConfidenceLevel,
): string {
  switch (confidence) {
    case 'high':
      return content  // 추가 표시 없음
    case 'medium':
      return content  // 추가 표시 없음 (대체로 신뢰 가능)
    case 'low':
      return `${content}\n\n> ⚠️ **추론 기반** — 코드에서 충분한 정보를 확보하지 못해 추론한 내용입니다. 수동 검증을 권장합니다.`
  }
}
```

**문서 생성 LLM 프롬프트에 포함하는 confidence 지시:**

```
분석 데이터에 confidenceLevel이 포함되어 있다.
- high/medium: 일반 텍스트로 서술
- low: 해당 섹션 끝에 "⚠️ 추론 기반 — 수동 검증 권장" 주석을 반드시 추가
- null (분석 실패): 해당 섹션을 "분석 불가 — [사유]"로 간략히 표시하고, 수동으로 보완할 수 있는 가이드 제공
```

### 3.5 마크다운 렌더링

#### 문서 템플릿 구조

모든 문서는 공통 헤더와 일관된 포맷을 따른다:

```typescript
function assembleDocument(
  docId: string,
  sections: Record<string, string>,
): string {
  const header = `# ${getDocTitle(docId)}\n`
  const metadata = `> 생성일: ${new Date().toISOString().split('T')[0]} | 분석 대상: ${projectName}\n`

  const body = Object.entries(sections)
    .filter(([_, content]) => content && content.trim())
    .map(([_, content]) => content)
    .join('\n\n---\n\n')

  return `${header}\n${metadata}\n---\n\n${body}\n`
}
```

**포맷 규칙:**

| 요소 | 규칙 |
|------|------|
| Heading | `#` ~ `####` (최대 4단계) |
| 토큰 값 테이블 | GitHub Flavored Markdown 테이블 |
| 레이아웃 구조 | ASCII 다이어그램 (`\`\`\`` 블록) |
| 코드 예시 | 언어 명시 (```css, ```tsx) |
| Do's & Don'ts | `✅ Do:` / `❌ Don't:` 접두사 |
| Confidence 표시 | `> ⚠️ 추론 기반` 인용 블록 |

---

## Phase 4: Prompt Generation

분석 결과와 디자인 스펙 문서를 기반으로 AI Coding Agent용 단계별 구현 Prompt를 생성한다.

### 4.1 Step Planner

**책임**: 분석 결과의 복잡도를 평가하여 단계 수를 결정하고, 분할 규칙을 적용한다.

#### 단계 수 결정 알고리즘

```typescript
// src/phases/prompt-gen/step-planner.ts

interface StepPlan {
  totalSteps: number
  steps: StepSpec[]
  splitReason?: string
}

interface StepSpec {
  stepNumber: number
  id: PromptStepId
  title: string
  scope: string[]            // 이 단계에서 다루는 항목
  prerequisites: number[]
  estimatedFileCount: number
  estimatedComponentCount?: number
}

function planSteps(analysis: AnalysisResult): StepPlan {
  const steps: StepSpec[] = []
  let stepNumber = 1

  // ── Step 1: Project Setup (항상) ──
  steps.push({
    stepNumber: stepNumber++,
    id: 'project-setup',
    title: 'Project Setup',
    scope: ['프로젝트 생성', '의존성 설치', '디렉토리 구조'],
    prerequisites: [],
    estimatedFileCount: 8,
  })

  // ── Step 2: Design System (항상) ──
  steps.push({
    stepNumber: stepNumber++,
    id: 'design-system',
    title: 'Design System',
    scope: ['디자인 토큰 정의', '글로벌 스타일', '타이포그래피 설정'],
    prerequisites: [1],
    estimatedFileCount: 6,
  })

  // ── Step 3+: Base Components ──
  const primitiveComponents = analysis.componentCatalog?.categories
    .filter(c => c.category === 'primitive' || c.category === 'form')
    .flatMap(c => c.components) ?? []

  if (primitiveComponents.length > 0) {
    const primitiveSteps = splitByCount(
      primitiveComponents,
      10,  // 컴포넌트 10개 이내/단계
      'base-components',
      'Base Components',
      [2],
    )
    for (const step of primitiveSteps) {
      step.stepNumber = stepNumber++
      steps.push(step)
    }
  }

  // ── Layout Components ──
  const layoutComponents = analysis.componentCatalog?.categories
    .filter(c => c.category === 'layout' || c.category === 'navigation')
    .flatMap(c => c.components) ?? []

  if (layoutComponents.length > 0) {
    steps.push({
      stepNumber: stepNumber++,
      id: 'layout-components',
      title: 'Layout Components',
      scope: layoutComponents.map(c => c.name),
      prerequisites: [2, steps.find(s => s.id.startsWith('base'))?.stepNumber ?? 2],
      estimatedFileCount: Math.min(layoutComponents.length * 2, 15),
      estimatedComponentCount: layoutComponents.length,
    })
  }

  // ── Composite Components ──
  const compositeComponents = analysis.componentCatalog?.categories
    .filter(c => c.category === 'composite' || c.category === 'feedback' || c.category === 'data-display')
    .flatMap(c => c.components) ?? []

  if (compositeComponents.length > 0) {
    const compositeSteps = splitByCount(
      compositeComponents,
      10,
      'composite-components',
      'Composite Components',
      [steps.find(s => s.id.startsWith('base'))?.stepNumber ?? 2],
    )
    for (const step of compositeSteps) {
      step.stepNumber = stepNumber++
      steps.push(step)
    }
  }

  // ── Page Implementation ──
  const pages = analysis.pageStructures?.pages ?? []
  if (pages.length > 0) {
    const pageSteps = splitByCount(
      pages,
      3,  // 3페이지/단계
      'page-implementation',
      'Page Implementation',
      [stepNumber - 1],  // 마지막 컴포넌트 단계 의존
    )
    for (const step of pageSteps) {
      step.stepNumber = stepNumber++
      steps.push(step)
    }
  }

  // ── Responsive (조건부) ──
  if (analysis.responsiveStrategy) {
    steps.push({
      stepNumber: stepNumber++,
      id: 'responsive',
      title: 'Responsive',
      scope: ['반응형 대응', 'breakpoint별 레이아웃 조정'],
      prerequisites: [steps.find(s => s.id.startsWith('page'))?.stepNumber ?? stepNumber - 2],
      estimatedFileCount: 10,
    })
  }

  // ── Interactions (조건부) ──
  if (analysis.interactionPatterns && hasSignificantInteractions(analysis.interactionPatterns)) {
    steps.push({
      stepNumber: stepNumber++,
      id: 'interactions',
      title: 'Interactions & Animations',
      scope: ['페이지 진입 애니메이션', '스크롤 애니메이션', '마이크로인터랙션'],
      prerequisites: [steps.find(s => s.id.startsWith('page'))?.stepNumber ?? stepNumber - 2],
      estimatedFileCount: 12,
    })
  }

  return {
    totalSteps: steps.length,
    steps,
  }
}
```

#### 분할 규칙

```typescript
/**
 * 항목 수가 threshold를 초과하면 여러 단계로 분할한다.
 *
 * 분할 기준:
 * - 컴포넌트: 10개 초과 시 분할
 * - 페이지: 3개 초과 시 분할
 * - 각 단계의 예상 파일 수: 5~15개
 * - 각 Prompt 길이: 2,000~8,000 단어
 */
function splitByCount<T extends { name: string }>(
  items: T[],
  maxPerStep: number,
  baseId: string,
  baseTitle: string,
  prerequisites: number[],
): StepSpec[] {
  if (items.length <= maxPerStep) {
    return [{
      stepNumber: 0,  // 호출측에서 재할당
      id: baseId as PromptStepId,
      title: baseTitle,
      scope: items.map(i => i.name),
      prerequisites,
      estimatedFileCount: Math.min(items.length * 2, 15),
      estimatedComponentCount: items.length,
    }]
  }

  // maxPerStep씩 나누기
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += maxPerStep) {
    chunks.push(items.slice(i, i + maxPerStep))
  }

  return chunks.map((chunk, idx) => ({
    stepNumber: 0,
    id: `${baseId}-${idx + 1}` as PromptStepId,
    title: `${baseTitle} (${idx + 1}/${chunks.length})`,
    scope: chunk.map(i => i.name),
    prerequisites,
    estimatedFileCount: Math.min(chunk.length * 2, 15),
    estimatedComponentCount: chunk.length,
  }))
}
```

### 4.2 Context Injection

**책임**: 각 Step Prompt에 필요한 디자인 정보를 선별하여 인라인으로 삽입한다.

```typescript
// src/phases/prompt-gen/context-injector.ts

interface InjectedContext {
  /** 디자인 에센스 요약 (톤/무드, 관련 Do's & Don'ts) */
  essenceSummary: string
  /** 해당 단계에서 사용할 디자인 토큰 (인라인) */
  relevantTokens: string
  /** 해당 단계의 컴포넌트 스펙 (인라인) */
  relevantComponents: string
  /** 참조 문서 안내 (선택) */
  documentReferences: string
}

/**
 * 단계별 필요 정보 매핑:
 *
 * Step 1 (Setup):
 *   - techStack 전체
 *   - 라이브러리 목록 + 버전
 *   - 디렉토리 구조 가이드
 *
 * Step 2 (Design System):
 *   - designTokens 전체 (인라인)
 *   - typography 전체 (인라인)
 *   - designEssence (톤/무드, 전체 Do's & Don'ts)
 *
 * Step 3~5 (Components):
 *   - 해당 단계 컴포넌트의 상세 스펙 (인라인)
 *   - 관련 토큰 (해당 컴포넌트에서 사용하는 색상, 간격 등)
 *   - designEssence 중 component/motion Do's & Don'ts
 *
 * Step 6 (Pages):
 *   - pageStructures에서 해당 페이지들 (인라인)
 *   - layoutSystem.commonPatterns (인라인)
 *   - 섹션별 사용 컴포넌트 매핑
 *
 * Step 7 (Responsive):
 *   - responsiveStrategy 전체 (인라인)
 *
 * Step 8 (Interactions):
 *   - interactionPatterns 전체 (인라인)
 *   - designEssence.dosAndDonts.motion (인라인)
 */
function injectContext(
  stepSpec: StepSpec,
  analysis: AnalysisResult,
  documents: DocumentSet,
): InjectedContext {
  const essence = analysis.designEssence

  // 모든 단계에 공통으로 포함되는 에센스 요약
  const essenceSummary = [
    `## 디자인 에센스`,
    `**정체성**: ${essence.identity}`,
    `**무드**: ${essence.moodKeywords.join(', ')}`,
    '',
    formatRelevantDosAndDonts(essence.dosAndDonts, stepSpec.id),
  ].join('\n')

  // 단계별 토큰/컴포넌트 선별
  const relevantTokens = selectTokensForStep(stepSpec, analysis)
  const relevantComponents = selectComponentsForStep(stepSpec, analysis)

  // 전체 문서 참조 (선택)
  const documentReferences = [
    `> 전체 디자인 스펙은 design-spec/ 디렉토리를 참고하세요.`,
  ].join('\n')

  return { essenceSummary, relevantTokens, relevantComponents, documentReferences }
}

/** Step ID에 따라 관련된 Do's & Don'ts 카테고리만 선별 */
function formatRelevantDosAndDonts(
  dosAndDonts: DosAndDonts,
  stepId: PromptStepId,
): string {
  const relevant: Array<keyof DosAndDonts> = []

  if (stepId === 'design-system') {
    relevant.push('color', 'typography', 'spacing')
  } else if (stepId.startsWith('base') || stepId.startsWith('composite') || stepId === 'layout-components') {
    relevant.push('component', 'color', 'spacing')
  } else if (stepId.startsWith('page')) {
    relevant.push('spacing', 'component')
  } else if (stepId === 'responsive') {
    relevant.push('spacing')
  } else if (stepId === 'interactions') {
    relevant.push('motion')
  }

  return relevant.map(cat => {
    const category = dosAndDonts[cat]
    const dos = category.dos.map(d => `✅ Do: ${d.rule} — ${d.reason}`).join('\n')
    const donts = category.donts.map(d => `❌ Don't: ${d.rule} — ${d.reason}`).join('\n')
    return `### ${cat.charAt(0).toUpperCase() + cat.slice(1)} 규칙\n${dos}\n${donts}`
  }).join('\n\n')
}
```

### 4.3 인터랙션 통합/분리 기준 적용

`03-output-prompts.md`에서 정의한 통합/분리 기준을 구현한다.

```typescript
// src/phases/prompt-gen/interaction-splitter.ts

interface InteractionSplit {
  /** 컴포넌트 단계(Step 3~5)에서 함께 구현할 인터랙션 */
  integratedInComponents: ComponentInteraction[]
  /** Step 8에서 별도 구현할 인터랙션 */
  separateStep: SeparateInteraction[]
}

function splitInteractions(
  interactions: InteractionPatterns,
): InteractionSplit {
  const integrated: ComponentInteraction[] = []
  const separate: SeparateInteraction[] = []

  // ── 컴포넌트에 통합 (hover/focus/active/disabled 상태 스타일) ──
  for (const hover of interactions.hoverEffects) {
    integrated.push({
      target: hover.target,
      type: 'hover-state',
      description: hover.effect,
    })
  }
  // focus-visible, disabled 상태도 integrated에 포함

  // ── 별도 단계로 분리 ──
  // 진입 애니메이션
  for (const entrance of interactions.entranceAnimations) {
    separate.push({
      type: 'entrance-animation',
      target: entrance.target,
      description: entrance.animation,
      trigger: entrance.trigger,
    })
  }

  // 스크롤 기반 동작
  for (const scroll of interactions.scrollBehaviors) {
    separate.push({
      type: 'scroll-behavior',
      target: scroll.type,
      description: scroll.description,
    })
  }

  // 마이크로인터랙션 (toggle, accordion 등의 복잡한 모션)
  for (const micro of interactions.microInteractions) {
    separate.push({
      type: 'micro-interaction',
      target: micro.target,
      description: micro.description,
    })
  }

  // 로딩 상태 애니메이션
  for (const loading of interactions.loadingPatterns) {
    separate.push({
      type: 'loading-pattern',
      target: loading.type,
      description: loading.description,
    })
  }

  return { integratedInComponents: integrated, separateStep: separate }
}

/** 별도 인터랙션 단계가 필요할 만큼 충분한 인터랙션이 있는지 판단 */
function hasSignificantInteractions(
  interactions: InteractionPatterns,
): boolean {
  const { separateStep } = splitInteractions(interactions)
  return separateStep.length >= 3
}
```

**적용 흐름:**

1. Component Prompt 생성 시: `integratedInComponents`의 hover/focus/disabled 스타일을 각 컴포넌트 스펙에 포함
2. Interactions Prompt (Step 8) 생성 시: `separateStep`의 진입 애니메이션, 스크롤 동작, 마이크로인터랙션만 포함
3. `hasSignificantInteractions()`가 `false`이면 Step 8 자체를 생략하고, 통합 인터랙션만 컴포넌트 단계에 포함

### 4.4 Prompt 템플릿 렌더링

각 Step Prompt는 표준 구조를 따른다.

```typescript
// src/phases/prompt-gen/generators/base.ts

interface PromptSections {
  goal: string
  prerequisites: string
  context: string
  instructions: string
  designReference: string
  expectedOutcome: string
  validation: string
}

function renderPrompt(
  stepNumber: number,
  title: string,
  sections: PromptSections,
): string {
  return `# Step ${stepNumber}: ${title}

## Goal
${sections.goal}

## Prerequisites
${sections.prerequisites}

## Context
${sections.context}

## Instructions
${sections.instructions}

## Design Reference
${sections.designReference}

## Expected Outcome
${sections.expectedOutcome}

## Validation
${sections.validation}
`
}
```

**Prompt 생성 LLM 호출 — 2단계 생성 전략:**

```typescript
// src/phases/prompt-gen/index.ts

async function generatePrompts(
  analysis: AnalysisResult,
  documents: DocumentSet,
  modelConfig: ModelConfig,
): Promise<PromptSet> {
  // ── 1단계: Step Plan 결정 (코드 로직, LLM 불필요) ──
  const plan = planSteps(analysis)

  // ── 2단계: 각 Step Prompt를 개별 생성 (LLM 호출) ──
  const steps: PromptStep[] = []

  for (const stepSpec of plan.steps) {
    const injected = injectContext(stepSpec, analysis, documents)
    const interactionSplit = splitInteractions(analysis.interactionPatterns)

    const promptContent = await callLLM({
      ...modelConfig,
      temperature: 0.2,
      maxTokens: 16_384,
      system: buildPromptGenSystemPrompt(),
      prompt: buildStepPrompt(stepSpec, injected, interactionSplit, analysis),
      schema: promptStepSchema,
      schemaName: 'PromptStep',
    })

    steps.push({
      stepNumber: stepSpec.stepNumber,
      id: stepSpec.id,
      title: stepSpec.title,
      fileName: `step-${String(stepSpec.stepNumber).padStart(2, '0')}-${stepSpec.id}.md`,
      prerequisites: stepSpec.prerequisites,
      goal: promptContent.goal,
      content: renderPrompt(
        stepSpec.stepNumber,
        stepSpec.title,
        promptContent,
      ),
      estimatedFileCount: stepSpec.estimatedFileCount,
      estimatedComponentCount: stepSpec.estimatedComponentCount,
    })
  }

  // ── README 생성 ──
  const readmeContent = generateReadme(analysis, plan, steps)

  return {
    projectName: analysis.meta.projectName,
    outputDir: `prompts/`,
    targetStack: resolveTargetStack(analysis),
    steps,
    readmeContent,
  }
}
```

### 4.5 README.md 생성

```typescript
// src/phases/prompt-gen/generators/readme-gen.ts

function generateReadme(
  analysis: AnalysisResult,
  plan: StepPlan,
  steps: PromptStep[],
): string {
  const targetStack = resolveTargetStack(analysis)

  return `# ${analysis.meta.projectName} — AI Coding Agent 구현 가이드

## 레퍼런스 정보
- **원본**: ${analysis.meta.source}
- **분석일**: ${analysis.meta.analyzedAt}
- **디자인 에센스**: ${analysis.designEssence.identity}

## 타겟 스택
- **프레임워크**: ${targetStack.framework}
- **스타일링**: ${targetStack.styling}
- **라이브러리**: ${targetStack.libraries.join(', ')}
- **결정 근거**: ${targetStack.reasoning}

## 사용 방법

### 기본 사용
1. 아래 Steps를 **순서대로** AI Coding Agent에게 전달하세요.
2. 각 Step은 자기 완결적이며, 필요한 디자인 정보가 Prompt에 포함되어 있습니다.
3. 각 Step 완료 후 Validation 섹션으로 결과를 확인하세요.

### Agent별 실행 예시

**Claude Code:**
\`\`\`
cat prompts/step-01-project-setup.md | claude
\`\`\`

**Cursor / Windsurf:**
Step 내용을 채팅 창에 붙여넣기

### 필요 시 조정
- Prompt가 한 세션에 너무 크면 나누어 전달
- Prompt가 너무 작으면 다음 단계와 합쳐 전달

## Steps Overview

| Step | 제목 | 의존성 | 설명 |
|------|------|--------|------|
${steps.map(s => `| ${s.stepNumber} | ${s.title} | ${s.prerequisites.length ? s.prerequisites.map(p => `Step ${p}`).join(', ') : 'None'} | ${s.goal} |`).join('\n')}

## Design Spec 참조
전체 디자인 스펙 문서는 \`../design-spec/\` 디렉토리에 있습니다.
각 Prompt에 핵심 정보가 인라인 포함되어 있으므로 별도 참조 없이 사용 가능하지만,
더 상세한 정보가 필요하면 해당 문서를 참고하세요.
`
}
```

#### 타겟 스택 결정 로직

```typescript
function resolveTargetStack(analysis: AnalysisResult): ResolvedTargetStack {
  const ref = analysis.techStack.framework.value

  // Next.js → Next.js
  if (ref.includes('Next')) {
    return {
      framework: `Next.js ${analysis.techStack.frameworkVersion ?? 'latest'}`,
      styling: resolveStyling(analysis.techStack),
      libraries: resolveLibraries(analysis.techStack),
      reasoning: `레퍼런스가 ${ref}를 사용하므로 동일 프레임워크 채택`,
    }
  }

  // Vite, CRA, 일반 React → React + Vite
  if (ref.includes('React') || ref === 'Unknown') {
    return {
      framework: 'React + Vite',
      styling: resolveStyling(analysis.techStack),
      libraries: resolveLibraries(analysis.techStack),
      reasoning: ref === 'Unknown'
        ? '프레임워크 판별 불가 — 기본값 React + Vite 사용'
        : `레퍼런스가 ${ref}를 사용, Vite로 모던화`,
    }
  }

  // 특수 프레임워크
  return {
    framework: ref,
    styling: resolveStyling(analysis.techStack),
    libraries: resolveLibraries(analysis.techStack),
    reasoning: `레퍼런스가 ${ref}를 사용하므로 동일 프레임워크 채택`,
  }
}
```
