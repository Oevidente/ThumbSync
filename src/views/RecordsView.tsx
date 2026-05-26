import { GlassCard } from "../components/GlassCard.tsx";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpWideNarrow,
  Clock,
  Database,
  Download,
  Edit2,
  FileText,
  Layers,
  List,
  Package,
  Search,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type ViewMode = "gallery" | "list";
type SortOrder = "newest" | "oldest";

type RecordGame = {
  providerName: string;
  providerKey: string;
  displayName: string;
  fileName: string;
  relativePath: string;
  destPath: string;
  modifiedAtMs: number;
  createdAtMs: number;
  sizeBytes: number;
  extension: string;
};

type ProviderRecord = {
  providerName: string;
  providerKey: string;
  gameCount: number;
  totalSizeBytes: number;
  coverPath: string;
  latestModifiedAtMs: number;
  oldestModifiedAtMs: number;
  games: RecordGame[];
};

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='480' viewBox='0 0 320 480'%3E%3Crect width='320' height='480' fill='%23242424'/%3E%3Cpath d='M96 180h128v120H96z' fill='%23333333'/%3E%3Ccircle cx='136' cy='220' r='18' fill='%23555555'/%3E%3Cpath d='m96 300 52-58 34 36 20-22 22 44z' fill='%23444444'/%3E%3C/svg%3E";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatDate(value?: number) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`;
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function sanitizeFileName(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "provedor";
}

function downloadCsv(provider: ProviderRecord, games: RecordGame[]) {
  const rows = [
    ["Jogo", "Provedor", "Data de modificacao", "Data de criacao", "Tamanho", "Arquivo", "Caminho relativo", "Caminho destino"],
    ...games.map((game) => [
      game.displayName,
      provider.providerName,
      formatDate(game.modifiedAtMs),
      formatDate(game.createdAtMs),
      formatSize(game.sizeBytes),
      game.fileName,
      game.relativePath,
      game.destPath,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `registros-${sanitizeFileName(provider.providerName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getImageUrl(path?: string) {
  return path ? `/api/image?path=${encodeURIComponent(path)}` : fallbackImage;
}

type ProviderBrand = {
  name: string;
  bgGradient: string;
  glowColor: string;
  badgeBg: string;
  icon: React.ReactNode;
  brandText: string;
  tagline: string;
};

function getProviderBrand(providerName: string): ProviderBrand {
  const normalized = normalizeText(providerName)
    .replace(/[:.]/g, "")
    .replace(/\s+/g, "")
    .trim();

  switch (normalized) {
    case "1x2":
    case "1x2gaming":
    case "1x2network":
      return {
        name: "1x2gaming",
        bgGradient: "from-amber-600 via-stone-900 to-amber-950",
        glowColor: "rgba(245,158,11,0.25)",
        badgeBg: "bg-amber-500/10 border-amber-500/20",
        brandText: "1X2 GAMING",
        tagline: "SPORTS & CASINO",
        icon: (
          <svg className="w-12 h-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        )
      };
    case "amatic":
    case "amaticindustries":
      return {
        name: "Amatic",
        bgGradient: "from-blue-700 via-slate-900 to-blue-950",
        glowColor: "rgba(29,78,216,0.3)",
        badgeBg: "bg-blue-500/10 border-blue-500/20",
        brandText: "AMATIC",
        tagline: "INDUSTRIES",
        icon: (
          <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        )
      };
    case "amigogaming":
    case "amigo":
      return {
        name: "Amigo Gaming",
        bgGradient: "from-purple-700 via-fuchsia-950 to-neutral-900",
        glowColor: "rgba(168,85,247,0.3)",
        badgeBg: "bg-purple-500/10 border-purple-500/20",
        brandText: "AMIGO GAMING",
        tagline: "PURE JOY PLAY",
        icon: (
          <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
          </svg>
        )
      };
    case "bgaming":
      return {
        name: "BGaming",
        bgGradient: "from-red-650 via-neutral-950 to-neutral-900",
        glowColor: "rgba(239,68,68,0.25)",
        badgeBg: "bg-red-500/10 border-red-500/20",
        brandText: "BGAMING",
        tagline: "BE CREATIVE",
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
          </svg>
        )
      };
    case "btg":
    case "bigtimegaming":
      return {
        name: "Big Time Gaming",
        bgGradient: "from-yellow-600 via-stone-900 to-amber-950",
        glowColor: "rgba(234,179,8,0.3)",
        badgeBg: "bg-yellow-500/10 border-yellow-500/20",
        brandText: "B T G",
        tagline: "BIG TIME GAMING",
        icon: (
          <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )
      };
    case "endorphina":
      return {
        name: "Endorphina",
        bgGradient: "from-fuchsia-600 via-purple-950 to-neutral-950",
        glowColor: "rgba(217,70,239,0.3)",
        badgeBg: "bg-fuchsia-500/10 border-fuchsia-500/20",
        brandText: "ENDORPHINA",
        tagline: "CHEMISTRY OF SLOTS",
        icon: (
          <svg className="w-12 h-12 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zM12 17c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75" />
          </svg>
        )
      };
    case "evolution":
    case "evolutiongaming":
      return {
        name: "Evolution",
        bgGradient: "from-neutral-800 via-stone-950 to-slate-950",
        glowColor: "rgba(255,255,255,0.08)",
        badgeBg: "bg-orange-500/10 border-orange-500/20",
        brandText: "EVOLUTION",
        tagline: "LIVE CASINO WORLD",
        icon: (
          <svg className="w-12 h-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21V9.75M3.284 14.253A8.966 8.966 0 0112 9.75M3.284 14.253a9.003 9.003 0 0017.432 0M20.716 14.253A8.966 8.966 0 0012 9.75" />
          </svg>
        )
      };
    case "evoplay":
      return {
        name: "Evoplay",
        bgGradient: "from-sky-700 via-indigo-950 to-neutral-900",
        glowColor: "rgba(14,165,233,0.3)",
        badgeBg: "bg-sky-500/10 border-sky-500/20",
        brandText: "EVOPLAY",
        tagline: "GAMING REVOLUTION",
        icon: (
          <svg className="w-12 h-12 text-sky-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-8.22-8.22m11.96 0A9 9 0 115.37 15.59m11.96-11.96L3.75 20.25" />
          </svg>
        )
      };
    case "fatpanda":
      return {
        name: "Fat Panda",
        bgGradient: "from-emerald-700 via-stone-950 to-amber-950",
        glowColor: "rgba(16,185,129,0.3)",
        badgeBg: "bg-emerald-500/10 border-emerald-500/20",
        brandText: "FAT PANDA",
        tagline: "SPECIAL CHARACTERS",
        icon: (
          <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0ZM9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
          </svg>
        )
      };
    case "fazi":
      return {
        name: "Fazi",
        bgGradient: "from-rose-650 via-red-955 to-neutral-950",
        glowColor: "rgba(225,29,72,0.3)",
        badgeBg: "bg-rose-500/10 border-rose-500/20",
        brandText: "FAZI",
        tagline: "CLASSIC SLOTS",
        icon: (
          <svg className="w-12 h-12 text-rose-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74 4.77m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        )
      };
    case "galaxsys":
      return {
        name: "Galaxsys",
        bgGradient: "from-indigo-700 via-slate-950 to-fuchsia-955",
        glowColor: "rgba(124,58,237,0.3)",
        badgeBg: "bg-indigo-500/10 border-indigo-500/20",
        brandText: "GALAXSYS",
        tagline: "FASTEST CASINO COVERS",
        icon: (
          <svg className="w-12 h-12 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M3.75 12h1.5m13.5 0h1.5m-2.25-6.364l-1.06 1.06m-9.192 9.192l-1.06 1.06m13.06 0l-1.06-1.06M6.364 6.364l-1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
          </svg>
        )
      };
    case "gamingcorps":
    case "gamingcorp":
      return {
        name: "Gaming Corps",
        bgGradient: "from-lime-600 via-stone-900 to-neutral-950",
        glowColor: "rgba(163,230,53,0.25)",
        badgeBg: "bg-lime-500/10 border-lime-500/20",
        brandText: "GAMING CORPS",
        tagline: "GAME INNOVATORS",
        icon: (
          <svg className="w-12 h-12 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l6-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    case "habanero":
      return {
        name: "Habanero",
        bgGradient: "from-orange-600 via-red-950 to-neutral-900",
        glowColor: "rgba(234,88,12,0.3)",
        badgeBg: "bg-orange-500/10 border-orange-500/20",
        brandText: "HABANERO",
        tagline: "HOT PREMIUM PLAYS",
        icon: (
          <svg className="w-12 h-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
        )
      };
    case "hacksaw":
    case "hacksawgaming":
      return {
        name: "Hacksaw Gaming",
        bgGradient: "from-stone-700 via-zinc-950 to-black",
        glowColor: "rgba(255,255,255,0.08)",
        badgeBg: "bg-slate-400/10 border-slate-400/20",
        brandText: "HACKSAW",
        tagline: "DISRUPTIVE CASINO ART",
        icon: (
          <svg className="w-12 h-12 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.011 12.5h2.235m-2.235 3h2.235M5.011 9.5h2.235m-2.235 3h2.235m3-6H5.011v12h13.978V6.5H8.011z" />
          </svg>
        )
      };
    case "imaginelive":
      return {
        name: "Imagine Live",
        bgGradient: "from-indigo-805 via-purple-950 to-stone-950",
        glowColor: "rgba(168,85,247,0.25)",
        badgeBg: "bg-purple-500/10 border-purple-500/20",
        brandText: "IMAGINE LIVE",
        tagline: "LUXURY DEALER SUITE",
        icon: (
          <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        )
      };
    case "irondog":
    case "irondogstudio":
      return {
        name: "Iron Dog Studio",
        bgGradient: "from-stone-605 via-neutral-900 to-amber-955",
        glowColor: "rgba(120,113,108,0.25)",
        badgeBg: "bg-stone-500/10 border-stone-500/20",
        brandText: "IRON DOG",
        tagline: "CLASSIC SHIELDS",
        icon: (
          <svg className="w-12 h-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        )
      };
    case "nolimit":
    case "nolimitcity":
    case "nolimitcitygaming":
      return {
        name: "Nolimit City",
        bgGradient: "from-yellow-600 via-neutral-950 to-neutral-900",
        glowColor: "rgba(234,179,8,0.35)",
        badgeBg: "bg-yellow-500/15 border-yellow-500/30",
        brandText: "NOLIMIT_CITY",
        tagline: "NO BOUNDARIES SLOTS",
        icon: (
          <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.0">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        )
      };
    case "pgsoft":
    case "pocketgamessoft":
      return {
        name: "PG SOFT",
        bgGradient: "from-orange-500 via-stone-900 to-neutral-950",
        glowColor: "rgba(249,115,22,0.3)",
        badgeBg: "bg-orange-500/10 border-orange-500/20",
        brandText: "PG SOFT",
        tagline: "DIFFERENCE MAKES VALUE",
        icon: (
          <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l8.25-11.25 8.25 11.25M12 2.25V21" />
          </svg>
        )
      };
    case "platipus":
      return {
        name: "Platipus",
        bgGradient: "from-teal-600 via-teal-950 to-neutral-950",
        glowColor: "rgba(13,148,136,0.3)",
        badgeBg: "bg-teal-500/10 border-teal-500/20",
        brandText: "PLATIPUS",
        tagline: "INNOVATIVE INTERACTION",
        icon: (
          <svg className="w-12 h-12 text-teal-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
          </svg>
        )
      };
    case "playngo":
    case "playandgo":
      return {
        name: "Play'n GO",
        bgGradient: "from-emerald-600 via-slate-950 to-teal-900",
        glowColor: "rgba(16,185,129,0.25)",
        badgeBg: "bg-emerald-500/10 border-emerald-500/20",
        brandText: "PLAY`N GO",
        tagline: "EMBOLDEN CASINO SUITES",
        icon: (
          <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
          </svg>
        )
      };
    case "playson":
      return {
        name: "Playson",
        bgGradient: "from-purple-700 via-indigo-950 to-stone-900",
        glowColor: "rgba(168,85,247,0.25)",
        badgeBg: "bg-purple-500/10 border-purple-500/20",
        brandText: "PLAYSON",
        tagline: "CLASS ACTION SHIELDS",
        icon: (
          <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.184-.377.724-.377.908 0l1.502 3.043 3.358.489c.417.061.583.57.281.867l-2.43 2.367.574 3.344c.071.416-.363.73-.733.535L12 14.542l-3.006 1.58c-.37.195-.804-.118-.733-.535l.574-3.344-2.43-2.367c-.302-.297-.136-.806.28-.867l3.359-.489 1.502-3.043z" />
          </svg>
        )
      };
    case "playtech":
      return {
        name: "Playtech",
        bgGradient: "from-blue-600 via-cyan-950 to-neutral-900",
        glowColor: "rgba(37,99,235,0.3)",
        badgeBg: "bg-blue-500/10 border-blue-500/20",
        brandText: "PLAYTECH",
        tagline: "SUCCESS SOURCE CODE",
        icon: (
          <svg className="w-12 h-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
        )
      };
    case "popok":
    case "popokgaming":
      return {
        name: "PopOK Gaming",
        bgGradient: "from-pink-600 via-rose-950 to-neutral-900",
        glowColor: "rgba(219,39,119,0.3)",
        badgeBg: "bg-pink-500/10 border-pink-500/20",
        brandText: "POPOK GAMING",
        tagline: "POP YOUR FEELINGS",
        icon: (
          <svg className="w-12 h-12 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
          </svg>
        )
      };
    case "pragmaticplay":
      return {
        name: "Pragmatic Play",
        bgGradient: "from-amber-600 via-neutral-900 to-amber-950",
        glowColor: "rgba(245,158,11,0.35)",
        badgeBg: "bg-amber-500/10 border-amber-500/20",
        brandText: "PRAGMATIC PLAY",
        tagline: "PREMIUM SLOTS SYSTEM",
        icon: (
          <svg className="w-12 h-12 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 22h20V10l-4 4-4-6-4 6-4-4V22zm10-14.5c1.38 0 2.5-1.12 2.5-2.5S13.38 2.5 12 2.5 9.5 3.62 9.5 5 10.62 7.5 12 7.5z" />
          </svg>
        )
      };
    case "prospectgaming":
    case "prospect":
      return {
        name: "Prospect Gaming",
        bgGradient: "from-teal-605 via-emerald-950 to-neutral-900",
        glowColor: "rgba(13,148,136,0.25)",
        badgeBg: "bg-teal-500/10 border-teal-500/20",
        brandText: "PROSPECT GAMING",
        tagline: "GLORY MINER GEAR",
        icon: (
          <svg className="w-12 h-12 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 3l9 9-9 9-9-9 9-9Z" />
          </svg>
        )
      };
    case "redtiger":
    case "redtigergaming":
      return {
        name: "Red Tiger",
        bgGradient: "from-red-700 via-rose-950 to-stone-950",
        glowColor: "rgba(220,38,38,0.3)",
        badgeBg: "bg-red-500/10 border-red-500/20",
        brandText: "RED TIGER",
        tagline: "SCIENCE OF GAMES",
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      };
    case "rubyplay":
    case "ruby":
      return {
        name: "Rubyplay",
        bgGradient: "from-rose-650 via-pink-950 to-zinc-950",
        glowColor: "rgba(225,29,72,0.3)",
        badgeBg: "bg-rose-500/10 border-rose-500/20",
        brandText: "RUBYPLAY",
        tagline: "PRECIOUS SPARK",
        icon: (
          <svg className="w-12 h-12 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l6-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    case "smartsoft":
    case "smartsoftgaming":
      return {
        name: "Smartsoft",
        bgGradient: "from-cyan-600 via-blue-950 to-neutral-900",
        glowColor: "rgba(8,145,178,0.25)",
        badgeBg: "bg-cyan-500/10 border-cyan-500/20",
        brandText: "SMARTSOFT",
        tagline: "CRASH AIR JET",
        icon: (
          <svg className="w-12 h-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        )
      };
    case "spinomenal":
      return {
        name: "Spinomenal",
        bgGradient: "from-emerald-600 via-teal-950 to-neutral-950",
        glowColor: "rgba(16,185,129,0.3)",
        badgeBg: "bg-emerald-500/10 border-emerald-500/20",
        brandText: "SPINOMENAL",
        tagline: "EXTRAORDINARY COVERS",
        icon: (
          <svg className="w-12 h-12 text-emerald-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12c0-1.232.046-2.453.138-3.662a4.006 4.006 0 013.7-3.7 48.656 48.656 0 017.324 0 4.006 4.006 0 013.7 3.7c.017.22.032.441.046.662M3 12l-3-3m3 3L.75 9" />
          </svg>
        )
      };
    case "spribe":
      return {
        name: "SPRIBE",
        bgGradient: "from-red-600 via-neutral-950 to-neutral-900",
        glowColor: "rgba(220,38,38,0.3)",
        badgeBg: "bg-red-500/10 border-red-500/20",
        brandText: "SPRIBE",
        tagline: "AVIATION TURBO ENG",
        icon: (
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        )
      };
    case "tadagaming":
    case "tada":
      return {
        name: "TaDa Gaming",
        bgGradient: "from-pink-550 via-purple-950 to-neutral-950",
        glowColor: "rgba(236,72,153,0.3)",
        badgeBg: "bg-pink-500/15 border-pink-500/20",
        brandText: "TADA GAMING",
        tagline: "MAGIC WAND GLITTER",
        icon: (
          <svg className="w-12 h-12 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.184-.377.724-.377.908 0l1.502 3.043 3.358.489c.417.061.583.57.281.867l-2.43 2.367" />
          </svg>
        )
      };
    case "wazdan":
      return {
        name: "Wazdan",
        bgGradient: "from-orange-600 via-stone-900 to-amber-950",
        glowColor: "rgba(249,115,22,0.3)",
        badgeBg: "bg-orange-500/10 border-orange-500/20",
        brandText: "WAZDAN",
        tagline: "PASSION FOR SLOTS",
        icon: (
          <svg className="w-12 h-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l8.25-11.25 8.25 11.25M12 2.25V21" />
          </svg>
        )
      };
    default:
      return {
        name: providerName,
        bgGradient: "from-slate-700 via-neutral-900 to-slate-950",
        glowColor: "rgba(100,116,139,0.15)",
        badgeBg: "bg-white/5 border-white/10",
        brandText: providerName.toUpperCase(),
        tagline: "CASINO PARTNER COVERS",
        icon: (
          <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21V9.75M3.284 14.253A8.966 8.966 0 0112 9.75M3.284 14.253a9.003 9.003 0 0017.432 0M20.716 14.253A8.966 8.966 0 0012 9.75" />
          </svg>
        )
      };
  }
}

const COLOR_THEMES = [
  { id: "default", name: "Original", previewBg: "bg-slate-800" },
  { id: "red", name: "Vermelho", previewBg: "bg-red-650", bgGradient: "from-red-650 via-neutral-955 to-neutral-950", glowColor: "rgba(225,29,72,0.3)" },
  { id: "orange", name: "Laranja", previewBg: "bg-orange-600", bgGradient: "from-orange-600 via-stone-900 to-amber-950", glowColor: "rgba(249,115,22,0.3)" },
  { id: "amber", name: "Âmbar", previewBg: "bg-amber-600", bgGradient: "from-amber-600 via-stone-900 to-amber-950", glowColor: "rgba(245,158,11,0.3)" },
  { id: "emerald", name: "Esmeralda", previewBg: "bg-emerald-600", bgGradient: "from-emerald-600 via-slate-950 to-teal-900", glowColor: "rgba(16,185,129,0.3)" },
  { id: "teal", name: "Ciano Escuro", previewBg: "bg-teal-600", bgGradient: "from-teal-600 via-teal-950 to-neutral-950", glowColor: "rgba(13,148,136,0.3)" },
  { id: "blue", name: "Azul", previewBg: "bg-blue-700", bgGradient: "from-blue-700 via-slate-900 to-blue-950", glowColor: "rgba(29,78,216,0.3)" },
  { id: "purple", name: "Roxo", previewBg: "bg-purple-700", bgGradient: "from-purple-700 via-fuchsia-950 to-neutral-900", glowColor: "rgba(168,85,247,0.3)" },
  { id: "fuchsia", name: "Fúcsia", previewBg: "bg-fuchsia-600", bgGradient: "from-fuchsia-600 via-purple-950 to-neutral-950", glowColor: "rgba(217,70,239,0.3)" },
  { id: "gray", name: "Cinza", previewBg: "bg-slate-700", bgGradient: "from-slate-700 via-neutral-900 to-slate-950", glowColor: "rgba(100,116,139,0.15)" },
];

function ProviderCoverImage({ 
  providerName, 
  custom 
}: { 
  providerName: string; 
  custom?: {
    customCover: string;
    customBgGradient?: string;
    customGlowColor?: string;
    brandText?: string;
    tagline?: string;
  };
}) {
  const brand = getProviderBrand(providerName);

  const bgGradient = custom?.customBgGradient || brand.bgGradient;
  const glowColor = custom?.customGlowColor || brand.glowColor;
  const brandText = custom?.brandText || brand.brandText;
  const tagline = custom?.tagline || brand.tagline;

  const hasCustomBg = !!custom?.customBgGradient;

  return (
    <div className={`w-full h-full bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center p-6 relative select-none overflow-hidden transition-all duration-550 group-hover:brightness-[1.15]`}>
      <div 
        className="absolute w-44 h-44 rounded-full blur-[44px] opacity-40 pointer-events-none" 
        style={{ backgroundColor: glowColor, left: "calc(50% - 88px)", top: "calc(50% - 88px)" }}
      />
      
      <div className="absolute top-4 left-6 w-1 h-1 bg-white/20 rounded-full" />
      <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-white/10 rounded-full" />
      <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white/15 rounded-full" />
      <div className="absolute bottom-10 right-8 w-1 h-1 bg-white/30 rounded-full" />

      <div className={`w-20 h-20 rounded-2xl backdrop-blur-md shadow-lg flex items-center justify-center mb-3 border ${hasCustomBg ? "bg-white/10 border-white/20" : brand.badgeBg} transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 overflow-hidden p-2`}>
        {custom?.customCover ? (
          <img src={custom.customCover} alt={providerName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          brand.icon
        )}
      </div>

      <h3 className="text-xl font-black text-white tracking-widest text-center uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-sans truncate max-w-full px-2">
        {brandText}
      </h3>

      <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase mt-1.5 text-center bg-black/40 px-2.5 py-0.5 rounded border border-white/5 opacity-85 backdrop-blur-sm truncate max-w-full">
        {tagline}
      </span>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}


export function RecordsView({ recordsData }: { recordsData: any }) {
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Custom Logos Client-Side persistence state
  const [customLogos, setCustomLogos] = useState<Record<string, any>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProviderKey, setEditingProviderKey] = useState("");
  const [editingProviderName, setEditingProviderName] = useState("");
  const [inputType, setInputType] = useState<"url" | "file">("file");
  const [customUrl, setCustomUrl] = useState("");
  const [customFileBase64, setCustomFileBase64] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("default");
  const [customBrandText, setCustomBrandText] = useState("");
  const [customTagline, setCustomTagline] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchCustomLogos = async () => {
    try {
      const res = await fetch("/api/custom-logos");
      if (res.ok) {
        const data = await res.json();
        setCustomLogos(data);
      }
    } catch (err) {
      console.error("Error loading custom logos", err);
    }
  };

  useEffect(() => {
    fetchCustomLogos();
  }, []);

  useEffect(() => {
    if (isEditModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditModalOpen]);

  const openEditModal = (provider: any) => {
    setEditingProviderKey(provider.providerKey);
    setEditingProviderName(provider.providerName);
    
    const existing = customLogos[provider.providerKey];
    if (existing) {
      setCustomBrandText(existing.brandText || "");
      setCustomTagline(existing.tagline || "");
      
      if (existing.customCover?.startsWith("data:")) {
        setInputType("file");
        setCustomFileBase64(existing.customCover);
        setCustomUrl("");
      } else {
        setInputType("url");
        setCustomUrl(existing.customCover || "");
        setCustomFileBase64("");
      }

      const matchedTheme = COLOR_THEMES.find(
        (t) => t.bgGradient === existing.customBgGradient && t.glowColor === existing.customGlowColor
      );
      setSelectedThemeId(matchedTheme ? matchedTheme.id : "default");
    } else {
      const defaultBrand = getProviderBrand(provider.providerName);
      setCustomBrandText(defaultBrand.brandText || provider.providerName.toUpperCase());
      setCustomTagline(defaultBrand.tagline || "CASINO PARTNER COVERS");
      setInputType("file");
      setCustomUrl("");
      setCustomFileBase64("");
      setSelectedThemeId("default");
    }
    
    setIsEditModalOpen(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".avif")) {
      alert("Por favor, selecione uma imagem PNG, WebP ou AVIF.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".avif")) {
      alert("Por favor, selecione uma imagem PNG, WebP ou AVIF.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomLogo = async () => {
    setIsSaving(true);
    try {
      const coverValue = inputType === "url" ? customUrl : customFileBase64;
      const theme = COLOR_THEMES.find((t) => t.id === selectedThemeId);
      
      const payload = {
        providerKey: editingProviderKey,
        customCover: coverValue || null,
        customBgGradient: theme?.bgGradient || null,
        customGlowColor: theme?.glowColor || null,
        brandText: customBrandText || null,
        tagline: customTagline || null,
      };

      const res = await fetch("/api/custom-logos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomLogos(data.logos);
        setIsEditModalOpen(false);
      } else {
        alert("Erro ao salvar personalização.");
      }
    } catch (err) {
      console.error("Error saving custom logo", err);
      alert("Erro ao salvar personalização.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCustomLogo = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/custom-logos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerKey: editingProviderKey, customCover: "" }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomLogos(data.logos);
        setIsEditModalOpen(false);
      } else {
        alert("Erro ao resetar personalização.");
      }
    } catch (err) {
      console.error("Error resetting custom logo", err);
      alert("Erro ao resetar personalização.");
    } finally {
      setIsSaving(false);
    }
  };

  const providers: ProviderRecord[] = recordsData?.providers || [];
  const totalGames = recordsData?.totalGames ?? providers.reduce((total, provider) => total + provider.gameCount, 0);
  const selectedProvider = providers.find((provider) => provider.providerKey === selectedProviderKey);
  const latestUpdateMs = providers.reduce((latest, provider) => Math.max(latest, provider.latestModifiedAtMs || 0), 0);

  useEffect(() => {
    if (selectedProviderKey && providers.length && !selectedProvider) {
      setSelectedProviderKey(null);
    }
  }, [providers, selectedProvider, selectedProviderKey]);

  const filteredProviders = useMemo(() => {
    const query = normalizeText(providerFilter.trim());
    if (!query) return providers;
    return providers.filter((provider) => normalizeText(provider.providerName).includes(query));
  }, [providerFilter, providers]);

  const visibleGames = useMemo(() => {
    if (!selectedProvider) return [];

    const query = normalizeText(gameFilter.trim());
    const filtered = query
      ? selectedProvider.games.filter((game) =>
          normalizeText(`${game.displayName} ${game.fileName} ${game.relativePath}`).includes(query)
        )
      : selectedProvider.games;

    return [...filtered].sort((a, b) => {
      const diff = (a.modifiedAtMs || 0) - (b.modifiedAtMs || 0);
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [gameFilter, selectedProvider, sortOrder]);

  if (!recordsData) {
    return <div className="p-10 text-center opacity-50">Carregando registros...</div>;
  }

  if (selectedProvider) {
    return (
      <div className="space-y-8 relative">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedProviderKey(null);
                setGameFilter("");
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white active:scale-95"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Provedores
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 flex flex-wrap items-center gap-3">
                <Database className="w-8 h-8 text-fluent-accent" />
                {customLogos[selectedProvider.providerKey]?.brandText || selectedProvider.providerName}
                
                <button
                  onClick={() => openEditModal(selectedProvider)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-fluent-accent text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-95"
                  title="Editar capa deste provedor"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Capa
                </button>
              </h1>
              <p className="text-gray-400">Jogos encontrados no destino para este provedor.</p>
            </div>
          </div>

          <div className="min-w-[220px] rounded-xl border border-fluent-accent/25 bg-fluent-accent/10 p-5 shadow-[0_0_25px_rgba(0,120,212,0.15)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-fluent-accent mb-1">Total do provedor</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{selectedProvider.gameCount}</span>
              <span className="pb-2 text-sm text-gray-400">jogos</span>
            </div>
          </div>
        </div>

        <GlassCard className="!p-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Filtrar jogos deste provedor..."
                value={gameFilter}
                onChange={(event) => setGameFilter(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-fluent-accent transition-colors text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("gallery")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${viewMode === "gallery" ? "bg-fluent-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <Layers className="w-4 h-4" />
                Galeria
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${viewMode === "list" ? "bg-fluent-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setSortOrder("newest")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${sortOrder === "newest" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <ArrowDownWideNarrow className="w-4 h-4" />
                Recente
              </button>
              <button
                onClick={() => setSortOrder("oldest")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${sortOrder === "oldest" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <ArrowUpWideNarrow className="w-4 h-4" />
                Antigo
              </button>
            </div>

            <button
              onClick={() => downloadCsv(selectedProvider, visibleGames)}
              disabled={visibleGames.length === 0}
              className="min-h-11 px-4 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors text-sm font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </GlassCard>

        {viewMode === "gallery" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visibleGames.map((game) => (
              <div key={game.destPath} className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] group">
                <div className="aspect-[2/3] bg-white/[0.03] overflow-hidden">
                  <img
                    src={getImageUrl(game.destPath)}
                    alt={game.displayName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{game.displayName}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatDate(game.modifiedAtMs)}</span>
                  </div>
                </div>
              </div>
            ))}
            {visibleGames.length === 0 && (
              <div className="col-span-full p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
                Nenhum jogo encontrado para o filtro atual.
              </div>
            )}
          </div>
        ) : (
          <GlassCard className="overflow-hidden !p-0">
            <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-fluent-accent" />
                <h3 className="font-semibold">Lista de jogos ({visibleGames.length})</h3>
              </div>
              <p className="text-xs text-gray-500">
                {sortOrder === "newest" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-white/[0.03] text-gray-400 uppercase text-[10px] tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-bold">Jogo</th>
                    <th className="px-6 py-4 font-bold">Data</th>
                    <th className="px-6 py-4 font-bold">Tamanho</th>
                    <th className="px-6 py-4 font-bold">Arquivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleGames.map((game) => (
                    <tr key={game.destPath} className="hover:bg-white/[0.05] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">{game.displayName}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{formatDate(game.modifiedAtMs)}</td>
                      <td className="px-6 py-4 text-gray-300">{formatSize(game.sizeBytes)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-300">{game.fileName}</span>
                          <span className="text-xs text-gray-600">{game.relativePath}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleGames.length === 0 && (
                <div className="p-16 text-center text-gray-500">Nenhum jogo encontrado para o filtro atual.</div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-fluent-accent" />
            Registros
          </h1>
          <p className="text-gray-400">Galeria dos provedores com jogos já presentes no destino.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <div className="relative w-full lg:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filtrar provedores..."
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-fluent-accent transition-colors text-sm"
            />
          </div>
          
          <button
            onClick={() => {
              if (providers.length > 0) {
                openEditModal(providers[0]);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent/80 hover:shadow-[0_0_15px_rgba(0,120,212,0.4)] transition-all text-sm font-semibold text-white active:scale-95 shrink-0"
          >
            <Edit2 className="w-4 h-4" />
            Editar Capas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-fluent-accent/10 text-fluent-accent">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Provedores</p>
              <p className="text-2xl font-bold">{providers.length}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Jogos no destino</p>
              <p className="text-2xl font-bold">{totalGames}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/5 text-gray-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Última alteração</p>
              <p className="text-base font-bold">{formatDate(latestUpdateMs)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {recordsData.status === "missing" ? (
        <div className="p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
          A pasta de destino não foi encontrada.
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
          Nenhum provedor encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProviders.map((provider) => {
            const isCustomized = !!customLogos[provider.providerKey];
            const customTitle = customLogos[provider.providerKey]?.brandText || provider.providerName;
            return (
              <div
                key={provider.providerKey}
                className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-fluent-accent/40 transition-all self-stretch"
              >
                {/* Floating Edit Button */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(provider);
                    }}
                    className={`p-1.5 rounded-lg border text-gray-300 hover:text-white transition-all backdrop-blur active:scale-95 flex items-center justify-center ${
                      isCustomized
                        ? "bg-fluent-accent/40 border-fluent-accent/50 hover:bg-fluent-accent/60"
                        : "bg-black/60 border-white/10 hover:bg-black/85 hover:border-white/30"
                    }`}
                    title="Editar capa deste provedor"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedProviderKey(provider.providerKey)}
                  className="w-full h-full text-left active:scale-[0.99] transition-transform duration-250"
                >
                  <div className="aspect-[16/9] bg-white/[0.03] overflow-hidden relative">
                    <ProviderCoverImage 
                      providerName={provider.providerName} 
                      custom={customLogos[provider.providerKey]} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3 pointer-events-none">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-white truncate">{customTitle}</h2>
                        <p className="text-xs text-gray-300 mt-1 truncate">Atualizado em {formatDate(provider.latestModifiedAtMs)}</p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-black/45 border border-white/10 px-3 py-2 text-center backdrop-blur">
                        <p className="text-lg font-black leading-none">{provider.gameCount}</p>
                        <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">jogos</p>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual Customization Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl acrylic border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-fluent-accent" />
                  Personalizar Capa do Provedor
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Customize o visual da marca, logotipo, título e efeitos de cor.</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Form Controls */}
              <div className="space-y-5">
                
                {/* Provider Selector dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Escolha o Provedor</label>
                  <select
                    value={editingProviderKey}
                    onChange={(e) => {
                      const selected = providers.find(p => p.providerKey === e.target.value);
                      if (selected) openEditModal(selected);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fluent-accent transition-colors"
                  >
                    {providers.map(p => (
                      <option key={p.providerKey} value={p.providerKey} className="bg-zinc-900 text-white">
                        {p.providerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Edit brandTitle & Tagline */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Nome da Marca</label>
                    <input
                      type="text"
                      value={customBrandText}
                      onChange={(e) => setCustomBrandText(e.target.value)}
                      placeholder="Ex: PRAGMATIC PLAY"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fluent-accent placeholder-gray-650 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Slogan / Tagline</label>
                    <input
                      type="text"
                      value={customTagline}
                      onChange={(e) => setCustomTagline(e.target.value)}
                      placeholder="Ex: PREMIUM SPINS"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fluent-accent placeholder-gray-650 transition-colors"
                    />
                  </div>
                </div>

                {/* Cover Resource Input Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 block">Origem do Logotipo</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setInputType("file")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                        inputType === "file" 
                          ? "bg-fluent-accent text-white shadow-sm" 
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Carregar Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputType("url")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                        inputType === "url" 
                          ? "bg-fluent-accent text-white shadow-sm" 
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Link Web (URL)
                    </button>
                  </div>
                </div>

                {/* Source rendering */}
                {inputType === "url" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400">URL da Imagem (.png, .webp, .avif)</label>
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.png"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fluent-accent placeholder-gray-650 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300 block">Upload de Arquivo</label>
                    
                    {/* Drag and Drop Container */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                        dragActive 
                          ? "border-fluent-accent bg-fluent-accent/5" 
                          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      }`}
                    >
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/png, image/webp, image/avif"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 text-center w-full">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-white" />
                        <span className="text-xs font-semibold text-gray-300">
                          Clique para selecionar ou arraste o arquivo
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Formatos aceitos: PNG, WebP e AVIF
                        </span>
                      </label>
                    </div>

                    {customFileBase64 && (
                      <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg justify-between">
                        <span className="text-xs text-green-400 flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                          Imagem carregada com sucesso!
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomFileBase64("")}
                          className="text-xs text-rose-500 hover:text-rose-400 font-semibold px-2 py-1 hover:bg-white/5 rounded"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Accent Color picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-gray-300 block">Tema de Cor dos Efeitos</label>
                  <p className="text-[10px] text-gray-500">Muda a cor do gradiente de fundo e do brilho neon.</p>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`flex flex-col items-center gap-1 p-1 py-1.5 rounded-lg border text-center transition-all active:scale-95 ${
                          selectedThemeId === theme.id 
                            ? "bg-white/10 border-fluent-accent text-white" 
                            : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border border-white/10 ${theme.previewBg}`} />
                        <span className="text-[9px] truncate max-w-full font-medium">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Live Preview & Actions */}
              <div className="space-y-4 flex flex-col items-center justify-center h-full border-l border-white/5 pl-6 md:mt-2">
                <span className="text-xs font-semibold text-gray-400 text-center">Pré-visualização em Tempo Real</span>
                
                <div className="w-[305px] h-[172px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl relative bg-zinc-950/80 p-0">
                  <ProviderCoverImage 
                    providerName={editingProviderName}
                    custom={{
                      customCover: inputType === "url" ? customUrl : customFileBase64,
                      customBgGradient: COLOR_THEMES.find(t => t.id === selectedThemeId)?.bgGradient,
                      customGlowColor: COLOR_THEMES.find(t => t.id === selectedThemeId)?.glowColor,
                      brandText: customBrandText,
                      tagline: customTagline
                    }}
                  />
                </div>
                
                <p className="text-[10px] text-gray-500 text-center max-w-[260px] leading-relaxed">
                  Note como as cores do efeito e o logotipo serão integrados na galeria com o efeito glow.
                </p>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetCustomLogo}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-rose-500/25 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg active:scale-95 transition-all disabled:opacity-50"
              >
                Restaurar Padrão
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomLogo}
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold bg-fluent-accent hover:bg-fluent-accent/80 text-white rounded-lg active:scale-95 hover:shadow-[0_0_12px_rgba(0,120,212,0.35)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
