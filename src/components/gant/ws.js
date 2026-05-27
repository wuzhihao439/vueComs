// composables/useWebSocket.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket(url) {
  const ws = ref(null)
  const isConnected = ref(false)
  const lastMessage = ref(null)
  const error = ref(null)

  const connect = () => {
    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      isConnected.value = true
      error.value = null
    }

    ws.value.onmessage = (event) => {
      lastMessage.value = event.data
    }

    ws.value.onerror = (err) => {
      error.value = err
    }

    ws.value.onclose = () => {
      isConnected.value = false
      // 可选：自动重连
      setTimeout(connect, 3000)
    }
  }

  const send = (data) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }

  const close = () => {
    ws.value?.close()
  }

  onMounted(connect)
  onUnmounted(close)

  return { isConnected, lastMessage, error, send, close }
}
