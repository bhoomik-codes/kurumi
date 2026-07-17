import os from 'os'
import path from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import dotenv from 'dotenv'

dotenv.config()

function getConfigDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'kurumi')
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'kurumi')
  } else {
    return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'kurumi')
  }
}

export const USER_DATA_PATH = getConfigDir()

// Use environment variables or fallback to defaults
const defaultLogsDir = path.join(USER_DATA_PATH, 'logs')
const defaultDbPath = path.join(USER_DATA_PATH, 'kurumi.db')

function resolvePath(envVar: string | undefined, defaultPath: string) {
  if (!envVar) return defaultPath
  if (envVar.startsWith('~/')) {
    return path.join(os.homedir(), envVar.slice(2))
  }
  return path.resolve(envVar)
}

export const LOGS_DIR = resolvePath(process.env.KURUMI_LOG_DIR, defaultLogsDir)
export const DB_PATH = resolvePath(process.env.KURUMI_DB_PATH, defaultDbPath)
export const DAEMON_PID_FILE = path.join(USER_DATA_PATH, 'kurumid.pid')

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`
  })
)

export const logger = winston.createLogger({
  level: process.env.KURUMI_LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(LOGS_DIR, 'daemon-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

export function getChildLogger(processName: string) {
  return winston.createLogger({
    level: process.env.KURUMI_LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
      new DailyRotateFile({
        filename: path.join(LOGS_DIR, `${processName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '7d',
      })
    ]
  })
}
