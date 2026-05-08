export interface IElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => void
}

declare global {
  interface Window {
    electron: IElectronAPI
  }
}
