# opencode-plugin-logger

可配置的 OpenCode 插件文件日志工具库，支持按天滚动、自动清理过期日志。

## 安装

```bash
npm install @xiaoqiong0v0/opencode-plugin-logger
```

## 使用

```typescript
import createLogger from "@xiaoqiong0v0/opencode-plugin-logger"

const log = createLogger("my-plugin", { enabled: true })

log.loaded()                    // [2026-07-23 08:52:00] [INFO] my-plugin loaded
log.info("处理完成")            // [2026-07-23 08:52:01] [INFO] my-plugin 处理完成
log.error("出错了", err)        // [2026-07-23 08:52:02] [ERROR] my-plugin 出错了 — xxx
log.hook("hookName", "描述")    // [2026-07-23 08:52:03] [HOOK] my-plugin hookName → 描述
log.tool("toolName", { arg: 1 }) // [2026-07-23 08:52:04] [TOOL] my-plugin toolName({"arg":1})
```

## 配置

首次使用自动生成 `~/.config/opencode/plugin-logger.jsonc`：

```jsonc
{
  // 是否启用日志输出（默认 false）
  "enabled": false,
  // 日志文件输出目录
  "dir": "~/.opencode/plugins-log",
  // 时间格式，SSS 为毫秒
  "timeFormat": "yyyy-MM-dd HH:mm:ss.SSS",
  // 日志保留天数，0 为永不过期
  "retentionDays": 7
}
```

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `enabled` | `false` | 总开关 |
| `dir` | `~/.opencode/plugins-log` | 日志输出目录 |
| `timeFormat` | `yyyy-MM-dd HH:mm:ss` | 时间格式 |
| `retentionDays` | `7` | 保留天数，`0` 表示永不过期 |

### 编程式配置

`createLogger` 的第二个参数可覆盖配置文件中的值：

```typescript
const log = createLogger("my-plugin", {
  enabled: true,
  dir: "/custom/log/path",
  retentionDays: 30,
})
```

## API

### `createLogger(name, opts?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 日志标识，每条日志会附带此名称 |
| `opts` | `LoggerOptions` | 可选，覆盖配置文件中的字段 |

**返回值 `Logger`**

| 方法 | 说明 |
|------|------|
| `loaded()` | 记录插件加载事件 |
| `info(msg)` | 普通信息日志 |
| `error(msg, err?)` | 错误日志，可附带 Error 对象或消息 |
| `hook(name, desc?)` | 钩子触发日志 |
| `tool(t, args)` | 工具调用日志 |

## 日志文件

按天滚动，文件名格式 `YYYYMMDD.log`，存放在配置的 `dir` 目录下。

## 依赖

无外部依赖，仅使用 Node.js 内置模块（`fs` / `path` / `os`）。

## GitHub

https://github.com/xiaoqiong0v0/opencode-plugin-logger
