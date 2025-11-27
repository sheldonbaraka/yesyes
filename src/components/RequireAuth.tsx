import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../store'
import Layout from './Layout'

export default function RequireAuth() {
  const { currentMemberId, signIn } = useStore()

  useEffect(() => {
    if (currentMemberId) return
    try {
      const remembered = localStorage.getItem('ufp-remembered-member')
      if (remembered) {
        try { signIn(remembered) } catch {}
      }
    } catch {}
  }, [currentMemberId, signIn])

  if (!currentMemberId) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}