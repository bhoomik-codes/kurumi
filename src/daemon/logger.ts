import os from 'os'
import path from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

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
export const LOGS_DIR = path.join(USER_DATA_PATH, 'logs')
export const DB_PATH = path.join(USER_DATA_PATH, 'kurumi.db')
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
  level: 'info',
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
    level: 'info',
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
