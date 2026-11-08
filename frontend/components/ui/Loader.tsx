'use client'

import React from 'react'
import styles from './Loader.module.css'

export interface LoaderProps {
  text?: string
  className?: string
}

export const Loader = ({ text = 'Loading . . . ', className = '' }: LoaderProps) => {
  return (
    <div className={`${styles.styledWrapper} ${className}`}>
      <div className={styles.circ}>
        <div className={styles.load}>{text}</div>
        <div className={styles.hands} />
        <div className={styles.body} />
        <div className={styles.head}>
          <div className={styles.eye} />
        </div>
      </div>
    </div>
  )
}

export default Loader
