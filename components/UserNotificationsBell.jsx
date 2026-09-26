import { useEffect, useMemo, useRef, useState } from 'react'
import './UserNotificationsBell.css'
import { listMyNotifications, markAllNotificationsRead } from '../services/notificationsApi'

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return String(iso)
  }
}

export default function UserNotificationsBell() {
  const wrapperRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [meta, setMeta] = useState({ total: 0, unread: 0 })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await listMyNotifications({ limit: 20, offset: 0 })
        if (cancelled) return
        setNotifications(res?.notifications || [])
        setMeta(res?.meta || { total: 0, unread: 0 })
      } catch {
        if (cancelled) return
        setNotifications([])
        setMeta({ total: 0, unread: 0 })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (e) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  const unreadCount = useMemo(() => meta.unread || 0, [meta])

  return (
    <div className="user-notifs-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-button"
        aria-label="Notifications"
        onClick={() => {
          setIsOpen((v) => !v)
          if (unreadCount > 0) {
            markAllNotificationsRead().catch(() => {})
            setMeta((m) => ({ ...m, unread: 0 }))
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
          }
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && <span className="user-notifs-badge" aria-hidden="true" />}
      </button>

      {isOpen && (
        <div className="user-notifs-dropdown" role="dialog" aria-label="Notifications">
          <div className="user-notifs-header">
            <div className="user-notifs-title">Notifications</div>
          </div>

          {notifications.length === 0 ? (
            <div className="user-notifs-empty">No notifications</div>
          ) : (
            <div className="user-notifs-list">
              {notifications.map((n) => (
                <div key={n.id} className="user-notifs-item">
                  <div className="user-notifs-item-title">{n.title}</div>
                  <div className="user-notifs-item-message">{n.message}</div>
                  <div className="user-notifs-item-time">{formatTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}




