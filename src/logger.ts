import { appendFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0")
}

interface Config {
  dir: string
  timeFormat: string
  retentionDays: number
  enabled: boolean
}

interface LoggerOptions {
  dir?: string
  timeFormat?: string
  retentionDays?: number
  enabled?: boolean
}

export interface Logger {
  loaded(): void
  info(msg: string): void
  error(msg: string, err?: Error | string): void
  hook(name: string, desc?: string): void
  tool(t: string, a: unknown): void
}

const GLOBAL_DIR = join(homedir(), ".config", "opencode")
const CONFIG_NAME = "plugin-logger.jsonc"
const CONFIG_PATH = join(GLOBAL_DIR, CONFIG_NAME)

const defaults: Config = {
  dir: join(homedir(), ".opencode", "plugins-log"),
  timeFormat: "yyyy-MM-dd HH:mm:ss",
  retentionDays: 7,
  enabled: false,
}

const SAMPLE_CFG = `{
  // 是否启用日志输出（默认 false）
  "enabled": false,
  // 日志文件输出目录
  "dir": "${defaults.dir.replace(/\\/g, "/")}",
  // 时间格式，SSS 为毫秒
  "timeFormat": "${defaults.timeFormat}.SSS",
  // 日志保留天数，0 为永不过期
  "retentionDays": ${defaults.retentionDays}
}
`

function readJsonc(path: string): Partial<Config> {
  try {
    const raw = readFileSync(path, "utf-8")
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function resolveCfg(opts?: LoggerOptions): Config {
  if (!existsSync(CONFIG_PATH)) {
    try {
      writeFileSync(CONFIG_PATH, SAMPLE_CFG, "utf-8")
    } catch {
      // ignore
    }
  }
  const cfg = existsSync(CONFIG_PATH) ? readJsonc(CONFIG_PATH) : {}
  return { ...defaults, ...cfg, ...(opts || {}) }
}

export default function createLogger(name: string, opts?: LoggerOptions): Logger {
  const cfg = resolveCfg(opts)
  if (!cfg.enabled) return { loaded() {}, info() {}, error() {}, hook() {}, tool() {} }

  const logDir = cfg.dir
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })

  const formatTime = (ts: number): string => {
    const d = new Date(ts)
    let s = cfg.timeFormat
    s = s.replace("yyyy", String(d.getFullYear()))
    s = s.replace("MM", pad(d.getMonth() + 1))
    s = s.replace("dd", pad(d.getDate()))
    s = s.replace("HH", pad(d.getHours()))
    s = s.replace("mm", pad(d.getMinutes()))
    s = s.replace("ss", pad(d.getSeconds()))
    s = s.replace("SSS", pad(d.getMilliseconds(), 3))
    return s
  }

  const cleanOld = (): void => {
    if (!cfg.retentionDays) return
    const maxAge = cfg.retentionDays * 86400000
    const now = Date.now()
    try {
      for (const f of readdirSync(logDir)) {
        if (!f.match(/^\d{4}-\d{2}-\d{2}\.log$/)) continue
        try {
          if (now - statSync(join(logDir, f)).mtimeMs > maxAge) {
            unlinkSync(join(logDir, f))
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  let currentDay = formatTime(Date.now()).slice(0, 10)
  let logFile = join(logDir, currentDay.replace(/-/g, "") + ".log")

  const write = (level: string, msg: string): void => {
    const now = Date.now()
    const day = formatTime(now).slice(0, 10)
    if (day !== currentDay) {
      currentDay = day
      logFile = join(logDir, day.replace(/-/g, "") + ".log")
      cleanOld()
    }
    try {
      appendFileSync(logFile, `[${formatTime(now)}] [${level}] ${name} ${msg}\n`)
    } catch {
      // ignore
    }
  }

  cleanOld()

  return {
    loaded: () => write("INFO", "loaded"),
    info: (msg: string) => write("INFO", msg),
    error: (msg: string, err?: Error | string) => write("ERROR", err ? `${msg} — ${err instanceof Error ? err.message : err}` : msg),
    hook: (name: string, desc?: string) => write("HOOK", `${name}${desc ? " → " + desc : ""}`),
    tool: (t: string, a: unknown) => write("TOOL", `${t}(${JSON.stringify(a).slice(0, 200)})`),
  }
}
