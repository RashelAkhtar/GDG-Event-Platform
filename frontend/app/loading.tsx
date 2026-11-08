import React from 'react'
import Loader from '@/components/ui/Loader'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080D1A] transition-colors duration-500">
      <Loader />
    </div>
  )
}
