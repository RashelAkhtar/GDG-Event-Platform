'use client'

import React from 'react'

export function VoxelWorldBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-2 sm:-inset-x-4 -inset-y-3 sm:-inset-y-4 z-0 select-none overflow-hidden rounded-3xl"
    >
      {/* ======================================================== */}
      {/* 0. SOFT MINECRAFT SKY ATMOSPHERIC AURA & VIGNETTE       */}
      {/* ======================================================== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#E0F2FE]/55 via-[#F0FDF4]/20 to-transparent rounded-3xl border border-[#BAE6FD]/40" />

      {/* Iconic Minecraft Pixel Square Sun in Upper Sky */}
      <div className="absolute top-3 right-6 sm:right-10 flex items-center justify-center">
        <div className="h-7 w-7 rounded-[1px] border-2 border-[#FDE047] bg-[#FEF08A] shadow-[0_0_18px_rgba(253,224,71,0.55)] flex items-center justify-center">
          <div className="h-3.5 w-3.5 rounded-[1px] bg-white/95" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. STEPPED MINECRAFT-STYLE BLOCKY CLOUDS                */}
      {/* ======================================================== */}
      {/* Cloud 1: High-Altitude Stepped 3D Voxel Cloud */}
      <div className="absolute top-2 left-0 anim-voxel-cloud-slow">
        <div className="flex flex-col items-center">
          {/* Top Step */}
          <div className="h-2 w-14 rounded-t-[1px] border-t border-x border-[#CBD5E1] bg-white" />
          {/* Main Middle Block */}
          <div className="h-3.5 w-28 border border-[#94A3B8] bg-white shadow-[0_2px_0_0_#CBD5E1]" />
          {/* Shaded Underside Step */}
          <div className="h-2 w-20 rounded-b-[1px] border-b border-x border-[#94A3B8] bg-[#E2E8F0]" />
        </div>
      </div>

      {/* Cloud 2: Mid-Altitude Trailing Stepped Cloud */}
      <div className="absolute top-14 left-0 anim-voxel-cloud-med">
        <div className="flex flex-col items-center">
          <div className="h-1.5 w-10 rounded-t-[1px] border-t border-x border-[#CBD5E1] bg-white" />
          <div className="h-2.5 w-20 border border-[#94A3B8] bg-white shadow-[0_2px_0_0_#CBD5E1]" />
          <div className="h-1.5 w-14 rounded-b-[1px] border-b border-x border-[#94A3B8] bg-[#E2E8F0]" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VOXEL BIRDS WITH FLAPPING WINGS (FLYING ACROSS SKY)   */}
      {/* ======================================================== */}
      {/* Bird 1: Cyan/Blue Voxel Macaw (Swift Flight) */}
      <div className="absolute top-6 left-0 anim-voxel-fly-1">
        <div className="relative flex items-center drop-shadow-xs">
          {/* Left Wing */}
          <div className="h-2 w-4 rounded-[0.5px] border border-[#0284C7] bg-[#38BDF8] anim-voxel-wing-l" />
          {/* Body, Head & Beak */}
          <div className="relative flex items-center">
            <div className="h-1.5 w-2 rounded-[0.5px] bg-[#EA4335]" /> {/* Red Tail */}
            <div className="h-3 w-4.5 rounded-[0.5px] border border-[#0F172A] bg-[#1E293B]" /> {/* Body */}
            <div className="relative h-3 w-2.5 rounded-[0.5px] border border-[#0F172A] bg-[#0F172A]"> {/* Head */}
              <span className="absolute top-0.5 right-0.5 h-0.5 w-0.5 rounded-[0.2px] bg-white" /> {/* Eye */}
            </div>
            <div className="h-1.5 w-1.5 rounded-[0.5px] bg-[#FBBC04]" /> {/* Gold Beak */}
          </div>
          {/* Right Wing */}
          <div className="h-2 w-4 rounded-[0.5px] border border-[#0284C7] bg-[#38BDF8] anim-voxel-wing-r" />
        </div>
      </div>

      {/* Bird 2: Emerald Green Voxel Budgie */}
      <div className="absolute top-16 left-0 anim-voxel-fly-2">
        <div className="relative flex items-center drop-shadow-xs">
          {/* Left Wing */}
          <div className="h-1.5 w-3.5 rounded-[0.5px] border border-[#15803D] bg-[#22C55E] anim-voxel-wing-l" />
          {/* Body */}
          <div className="relative flex items-center">
            <div className="h-1 w-2 rounded-[0.5px] bg-[#FBBC04]" /> {/* Gold Tail */}
            <div className="h-2.5 w-4 rounded-[0.5px] border border-[#0F172A] bg-[#1E293B]" />
            <div className="relative h-2.5 w-2 rounded-[0.5px] border border-[#0F172A] bg-[#0F172A]">
              <span className="absolute top-0.5 right-0.5 h-0.5 w-0.5 bg-white" />
            </div>
            <div className="h-1 w-1.5 rounded-[0.5px] bg-[#EA4335]" /> {/* Red Beak */}
          </div>
          {/* Right Wing */}
          <div className="h-1.5 w-3.5 rounded-[0.5px] border border-[#15803D] bg-[#22C55E] anim-voxel-wing-r" />
        </div>
      </div>

      {/* Bird 3: Distant Red/White Voxel Dove */}
      <div className="absolute top-24 left-0 anim-voxel-fly-3">
        <div className="relative flex items-center drop-shadow-xs">
          <div className="h-1.5 w-3 rounded-[0.5px] border border-[#CBD5E1] bg-white anim-voxel-wing-l" />
          <div className="relative flex items-center">
            <div className="h-2 w-3.5 rounded-[0.5px] border border-[#CBD5E1] bg-[#F8FAFC]" />
            <div className="h-2 w-2 rounded-[0.5px] border border-[#94A3B8] bg-[#64748B]" />
            <div className="h-1 w-1 rounded-[0.5px] bg-[#FBBC04]" />
          </div>
          <div className="h-1.5 w-3 rounded-[0.5px] border border-[#CBD5E1] bg-white anim-voxel-wing-r" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. STEPPED VOXEL TERRAIN SILHOUETTE (BEHIND BUCKET BASE) */}
      {/* ======================================================== */}
      <div className="absolute bottom-2.5 inset-x-3 sm:inset-x-6 flex items-end justify-between">
        {/* Left Miniature Voxel Grove: Stepped Hill + Tiny Tree + Red Poppy */}
        <div className="flex items-end gap-1.5">
          {/* Miniature 3D-Style Voxel Tree */}
          <div className="flex flex-col items-center mb-0.5">
            {/* Foliage Cube */}
            <div className="relative h-6 w-7 rounded-[1px] border border-[#166534] bg-[#16A34A] shadow-[0_2px_0_0_#15803D]">
              <span className="absolute top-0.5 left-0.5 h-2 w-2 rounded-[0.5px] bg-[#4ADE80]" />
              <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-[0.5px] bg-[#14532D]" />
            </div>
            {/* Wood Trunk */}
            <div className="h-4.5 w-2.5 rounded-[0.5px] border border-[#451A03] bg-[#78350F]" />
          </div>

          {/* Stepped Grass & Dirt Blocks */}
          <div className="flex items-end">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-5 border-t border-x border-[#16A34A] bg-[#22C55E] rounded-t-[1px]" />
              <div className="h-3 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-3 w-6 border-t border-x border-[#16A34A] bg-[#22C55E] rounded-t-[1px]" />
              <div className="h-5 w-6 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-2 w-5 border-t border-x border-[#16A34A] bg-[#22C55E] rounded-t-[1px]" />
              <div className="h-2.5 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
          </div>

          {/* Miniature Voxel Poppy Flower */}
          <div className="flex flex-col items-center mb-1 anim-badge-sway origin-bottom">
            <div className="h-2.5 w-2.5 rounded-[0.5px] border border-[#991B1B] bg-[#EA4335] shadow-2xs flex items-center justify-center">
              <span className="h-1 w-1 bg-[#450A0A] rounded-[0.2px]" />
            </div>
            <div className="h-3.5 w-0.5 bg-[#16A34A]" />
          </div>
        </div>

        {/* Right Miniature Voxel Meadow: Stepped Terraces + Tiny Yellow Dandelion */}
        <div className="flex items-end gap-1.5">
          {/* Miniature Voxel Dandelion */}
          <div className="flex flex-col items-center mb-1 anim-badge-sway origin-bottom">
            <div className="h-2 w-2 rounded-[0.5px] border border-[#B45309] bg-[#FBBC04] shadow-2xs" />
            <div className="h-3 w-0.5 bg-[#16A34A]" />
          </div>

          {/* Stepped Grass & Dirt Blocks */}
          <div className="flex items-end">
            <div className="flex flex-col items-center">
              <div className="h-2 w-5 border-t border-x border-[#16A34A] bg-[#22C55E] rounded-t-[1px]" />
              <div className="h-2.5 w-5 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-3 w-6 border-t border-x border-[#16A34A] bg-[#22C55E] rounded-t-[1px]" />
              <div className="h-4.5 w-6 border-b border-x border-[#451A03] bg-[#78350F]" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. FLOATING PIXEL DUST MOTES (RISING GENTLY)             */}
      {/* ======================================================== */}
      <span className="absolute bottom-16 left-12 h-1.5 w-1.5 rounded-[0.5px] bg-[#1A73E8] shadow-[0_0_6px_rgba(26,115,232,0.8)] anim-voxel-pixel-1" />
      <span className="absolute bottom-12 right-16 h-1.5 w-1.5 rounded-[0.5px] bg-[#FBBC04] shadow-[0_0_6px_rgba(251,188,4,0.8)] anim-voxel-pixel-2" />
      <span className="absolute bottom-20 left-1/4 h-1 w-1 rounded-[0.5px] bg-[#34A853] shadow-[0_0_6px_rgba(52,168,83,0.8)] anim-voxel-pixel-3" />
      <span className="absolute bottom-14 right-1/4 h-1 w-1 rounded-[0.5px] bg-[#EA4335] shadow-[0_0_6px_rgba(234,67,53,0.8)] anim-voxel-pixel-1" />
    </div>
  )
}
