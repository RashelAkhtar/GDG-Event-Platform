'use client'

import React from 'react'

export function VoxelWorldBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-6 xs:-inset-x-12 sm:-inset-x-20 -inset-y-4 sm:-inset-y-8 -z-10 select-none overflow-hidden"
    >
      {/* ======================================================== */}
      {/* 1. STEPPED MINECRAFT-STYLE BLOCKY CLOUDS                */}
      {/* ======================================================== */}
      {/* High-Altitude Stepped Cloud */}
      <div className="absolute top-2 left-0 anim-voxel-cloud-slow opacity-85">
        <div className="flex flex-col items-center">
          <div className="h-2 w-12 rounded-t-xs border-t border-x border-[#E5E7EB] bg-white/70 shadow-2xs" />
          <div className="h-3 w-22 rounded-xs border border-[#E5E7EB] bg-white/85 shadow-xs" />
          <div className="h-2 w-16 rounded-b-xs border-b border-x border-[#E5E7EB] bg-white/75" />
        </div>
      </div>

      {/* Mid-Altitude Trailing Cloud */}
      <div className="absolute top-16 left-0 anim-voxel-cloud-med opacity-70">
        <div className="flex flex-col items-center">
          <div className="h-1.5 w-10 rounded-t-xs border-t border-x border-[#E5E7EB] bg-white/60" />
          <div className="h-2.5 w-18 rounded-xs border border-[#E5E7EB] bg-white/80 shadow-2xs" />
          <div className="h-1.5 w-12 rounded-b-xs border-b border-x border-[#E5E7EB] bg-white/65" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VOXEL BIRDS WITH FLAPPING WINGS (FLYING ACROSS SKY)   */}
      {/* ======================================================== */}
      {/* Bird 1: Lead High-Altitude Voxel Swift */}
      <div className="absolute top-6 left-0 anim-voxel-fly-1">
        <div className="relative flex items-center">
          {/* Left Wing */}
          <div className="h-1.5 w-3.5 rounded-[0.5px] border border-[#1A73E8]/50 bg-[#38BDF8] anim-voxel-wing-l" />
          {/* Blocky Body & Tail */}
          <div className="relative flex items-center">
            <div className="h-1 w-2 rounded-[0.5px] bg-[#EA4335]" /> {/* Tail */}
            <div className="h-2.5 w-4 rounded-[0.5px] border border-[#0F172A] bg-[#1E293B]" /> {/* Body */}
            <div className="relative h-2.5 w-2 rounded-[0.5px] border border-[#0F172A] bg-[#0F172A]"> {/* Head */}
              <span className="absolute top-0.5 right-0.5 h-0.5 w-0.5 rounded-[0.2px] bg-white" /> {/* Eye */}
            </div>
            <div className="h-1.5 w-1.5 rounded-[0.5px] bg-[#FBBC04]" /> {/* Beak */}
          </div>
          {/* Right Wing */}
          <div className="h-1.5 w-3.5 rounded-[0.5px] border border-[#1A73E8]/50 bg-[#38BDF8] anim-voxel-wing-r" />
        </div>
      </div>

      {/* Bird 2: Companion Mid-Altitude Voxel Parrot */}
      <div className="absolute top-14 left-0 anim-voxel-fly-2">
        <div className="relative flex items-center">
          {/* Left Wing */}
          <div className="h-1.5 w-3 rounded-[0.5px] border border-[#15803D]/50 bg-[#34A853] anim-voxel-wing-l" />
          {/* Body */}
          <div className="relative flex items-center">
            <div className="h-1 w-1.5 rounded-[0.5px] bg-[#FBBC04]" /> {/* Tail */}
            <div className="h-2 w-3.5 rounded-[0.5px] border border-[#0F172A] bg-[#1E293B]" />
            <div className="relative h-2 w-2 rounded-[0.5px] border border-[#0F172A] bg-[#0F172A]">
              <span className="absolute top-0.5 right-0.5 h-0.5 w-0.5 bg-white" />
            </div>
            <div className="h-1 w-1 rounded-[0.5px] bg-[#EA4335]" /> {/* Beak */}
          </div>
          {/* Right Wing */}
          <div className="h-1.5 w-3 rounded-[0.5px] border border-[#15803D]/50 bg-[#34A853] anim-voxel-wing-r" />
        </div>
      </div>

      {/* Bird 3: Distant Playful Voxel Dove */}
      <div className="absolute top-24 left-0 anim-voxel-fly-3">
        <div className="relative flex items-center">
          <div className="h-1 w-2.5 rounded-[0.5px] border border-[#E5E7EB] bg-white anim-voxel-wing-l" />
          <div className="relative flex items-center">
            <div className="h-1.5 w-3 rounded-[0.5px] border border-[#CBD5E1] bg-[#F1F5F9]" />
            <div className="h-1.5 w-1.5 rounded-[0.5px] border border-[#94A3B8] bg-[#64748B]" />
            <div className="h-1 w-1 rounded-[0.5px] bg-[#FBBC04]" />
          </div>
          <div className="h-1 w-2.5 rounded-[0.5px] border border-[#E5E7EB] bg-white anim-voxel-wing-r" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. STEPPED VOXEL TERRAIN SILHOUETTE (BEHIND BUCKET BASE) */}
      {/* ======================================================== */}
      <div className="absolute bottom-2 inset-x-4 sm:inset-x-8 flex items-end justify-between opacity-60">
        {/* Left Miniature Voxel Grove: Stepped Hill + Tiny Tree */}
        <div className="flex items-end gap-1">
          {/* Miniature 3D-Style Voxel Tree */}
          <div className="flex flex-col items-center mb-1">
            {/* Foliage Cube */}
            <div className="h-5 w-6 rounded-xs border border-[#34A853]/40 bg-[#34A853]/25 shadow-2xs" />
            {/* Wood Trunk */}
            <div className="h-4 w-2 rounded-[0.5px] border border-[#854D0E]/40 bg-[#854D0E]/30" />
          </div>

          {/* Stepped Grass Contours */}
          <div className="flex items-end">
            <div className="h-3 w-5 border-t border-x border-[#34A853]/30 bg-[#34A853]/15 rounded-t-xs" />
            <div className="h-5 w-7 border-t border-x border-[#34A853]/30 bg-[#34A853]/20 rounded-t-xs" />
            <div className="h-2 w-6 border-t border-x border-[#34A853]/30 bg-[#34A853]/15 rounded-t-xs" />
          </div>
        </div>

        {/* Right Miniature Voxel Meadow: Stepped Terraces + Tiny Poppy */}
        <div className="flex items-end gap-1">
          <div className="flex items-end">
            <div className="h-2 w-6 border-t border-x border-[#34A853]/30 bg-[#34A853]/15 rounded-t-xs" />
            <div className="h-4 w-7 border-t border-x border-[#34A853]/30 bg-[#34A853]/20 rounded-t-xs" />
          </div>

          {/* Miniature Voxel Poppy Flower */}
          <div className="flex flex-col items-center mb-1 anim-badge-sway">
            <div className="h-2 w-2 rounded-[0.5px] border border-[#B91C1C]/50 bg-[#EA4335] shadow-2xs" />
            <div className="h-3 w-0.5 bg-[#15803D]" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. FLOATING PIXEL DUST MOTES (RISING GENTLY)             */}
      {/* ======================================================== */}
      <span className="absolute bottom-16 left-12 h-1.5 w-1.5 rounded-[0.5px] bg-[#1A73E8]/40 anim-voxel-pixel-1" />
      <span className="absolute bottom-12 right-16 h-1.5 w-1.5 rounded-[0.5px] bg-[#FBBC04]/50 anim-voxel-pixel-2" />
      <span className="absolute bottom-20 left-1/3 h-1 w-1 rounded-[0.5px] bg-[#34A853]/45 anim-voxel-pixel-3" />
      <span className="absolute bottom-14 right-1/4 h-1 w-1 rounded-[0.5px] bg-[#EA4335]/35 anim-voxel-pixel-1" />
    </div>
  )
}
