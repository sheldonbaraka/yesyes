type RealtimeMessage = { type: string; payload: any }

class Realtime {
  private bc: BroadcastChannel | null = null
  private ws: WebSocket | null = null
  private wsUrl: string | null = null
  private reconnectAttempts = 0
  private sendQueue: RealtimeMessage[] = []
  private subscribers: Array<(msg: RealtimeMessage) => void> = []

  constructor() {
    // BroadcastChannel for same-origin tabs
    try {
      // @ts-ignore
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel('ufp-realtime')
        this.bc.onmessage = (ev) => {
          const msg = ev.data as RealtimeMessage
          this.emit(msg)
        }
      }
    } catch {}

    // Optional WebSocket for cross-device realtime
    this.wsUrl = (import.meta as any)?.env?.VITE_WS_URL || null
    if (this.wsUrl) {
      this.initWebSocket()
    }

    // Network awareness
    try {
      window.addEventListener('online', () => {
        if (this.wsUrl && (!this.ws || this.ws.readyState !== 1)) {
          this.initWebSocket(true)
        }
      })
      window.addEventListener('offline', () => {
        try { this.ws?.close() } catch {}
      })
    } catch {}
  }

  private initWebSocket(resetAttempts = false) {
    if (!this.wsUrl) return
    if (resetAttempts) this.reconnectAttempts = 0
    try {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => {
        // Flush queued messages
        const q = [...this.sendQueue]
        this.sendQueue.length = 0
        q.forEach((m) => { try { this.ws?.send(JSON.stringify(m)) } catch {} })
        this.reconnectAttempts = 0
      }
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as RealtimeMessage
          this.emit(msg)
        } catch {}
      }
      this.ws.onclose = () => {
        this.scheduleReconnect()
      }
      this.ws.onerror = () => {
        try { this.ws?.close() } catch {}
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (!this.wsUrl) return
    this.reconnectAttempts += 1
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(this.reconnectAttempts, 5)))
    try {
      setTimeout(() => this.initWebSocket(), delay)
    } catch {}
  }

  subscribe(fn: (msg: RealtimeMessage) => void) {
    this.subscribers.push(fn)
  }

  publish(msg: RealtimeMessage) {
    // Intra-tab broadcast
    try { this.bc?.postMessage(msg) } catch {}

    // Cross-device via WebSocket (queue if not open)
    try {
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify(msg))
      } else if (this.wsUrl) {
        this.sendQueue.push(msg)
      }
    } catch {
      if (this.wsUrl) this.sendQueue.push(msg)
    }
  }

  private emit(msg: RealtimeMessage) {
    for (const fn of this.subscribers) fn(msg)
  }
}

export const realtime = new Realtime()