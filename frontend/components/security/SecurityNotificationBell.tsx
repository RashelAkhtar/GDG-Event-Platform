'use client'

import React, { useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { Bell, ShieldAlert, Camera, Trash2, Clock, CheckCircle2, User as UserIcon } from 'lucide-react'

function formatAlertTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return 'Just now'
  }
}

export function SecurityNotificationBell() {
  const { securityAlerts, unreadSecurityAlertsCount, clearSecurityAlerts, markSecurityAlertsRead } =
    useWebSocket()
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    if (!isOpen) {
      markSecurityAlertsRead()
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        title="Live Security & Screenshot Alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-all active:scale-95 shadow-2xs"
      >
        <Bell className="h-4 w-4" />

        {/* Pulsating Red Badge if unread alerts exist */}
        {unreadSecurityAlertsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#EA4335] text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadSecurityAlertsCount > 9 ? '9+' : unreadSecurityAlertsCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[24px] border border-[#DADCE0] bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F3F4] px-4 py-3 bg-gradient-to-r from-white to-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCE8E6] text-[#EA4335]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </span>
                <h4 className="text-xs font-bold text-[#202124]">
                  Security Alerts ({securityAlerts.length})
                </h4>
              </div>

              {securityAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={clearSecurityAlerts}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#EA4335] transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Alerts List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F3F4] p-1">
              {securityAlerts.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4EA] text-[#34A853] mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#202124]">No Security Violations</p>
                  <p className="text-[11px] text-[#5F6368] mt-0.5">
                    Realtime anti-screenshot monitoring active across all participant screens.
                  </p>
                </div>
              ) : (
                securityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-2xl transition-all ${
                      alert.isDisqualified ? 'bg-[#FCE8E6]/40' : 'hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {alert.avatar ? (
                          <img
                            src={alert.avatar}
                            alt={alert.userName}
                            className="h-8 w-8 rounded-full border border-[#DADCE0] object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F0FE] text-[#1A73E8]">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EA4335] text-white">
                          <Camera className="h-2.5 w-2.5" />
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-[#202124] truncate">
                            {alert.userName}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              alert.isDisqualified
                                ? 'bg-[#EA4335] text-white'
                                : alert.warningCount === 2
                                ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FBBC04]/40'
                                : 'bg-[#FCE8E6] text-[#C5221F] border border-[#EA4335]/30'
                            }`}
                          >
                            {alert.isDisqualified ? 'DISQUALIFIED' : `Warning ${alert.warningCount}/3`}
                          </span>
                        </div>

                        {alert.userEmail && (
                          <p className="text-[11px] text-[#5F6368] truncate">{alert.userEmail}</p>
                        )}

                        <div className="mt-1 flex items-center justify-between text-[10px] text-[#5F6368]">
                          <span className="font-medium text-[#1A73E8]">
                            {alert.gameTitle || alert.gameSlug}
                            {alert.questionIndex !== undefined
                              ? ` • Question #${alert.questionIndex + 1}`
                              : ''}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-2.5 w-2.5" />
                            {formatAlertTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
