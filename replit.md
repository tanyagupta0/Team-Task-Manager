# TaskFlow — Team Task Manager

## Overview

A full-stack team task manager web app with role-based access control, project management, task tracking, and a real-time dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Tailwind v4, shadcn/ui, wouter, TanStack Query)
- **Backend**: Express 5 (API server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (Replit-managed)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- Clerk authentication (signup/login) with branded sign-in pages
- Project & team management with member roles (Admin/Member)
- Task creation, assignment, status tracking (todo/in_progress/in_review/done) and priority (low/medium/high/urgent)
- Dashboard with stats, my tasks, recent activity, overdue tasks
- Role-based access control

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema

- `users` — stores Clerk user profiles (clerkId, email, name, role)
- `projects` — projects with owner, status, color
- `project_members` — many-to-many users<>projects with roles
- `tasks` — tasks with status, priority, assignee, due dates
- `activity` — audit log of task/project events

## Artifacts

- `artifacts/task-manager` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express API server (preview path: `/api`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
