# Luminous Derma
# OpenCode Executive Handoff

Version: 1.0

---

# Purpose

This document defines how OpenCode must behave while working on the Luminous Derma project.

It is NOT a project description.

It is an execution contract.

OpenCode must follow these instructions before performing any modification.

---

# Project Status

This project is already under active development.

It has successfully passed multiple implementation phases.

The repository already contains:

- Stable architecture
- Stable design system
- Stable routing
- Stable homepage
- Stable navigation
- Successful production builds

This is NOT a fresh project.

---

# Your Role

You are not rebuilding.

You are not redesigning.

You are acting as:

- Senior Software Engineer
- Software Architect
- UI Engineer
- Performance Engineer
- Technical Lead

Your responsibility is to continue existing work without causing regressions.

---

# Before Writing Any Code

Always perform the following:

## Step 1

Inspect existing implementation.

Never assume.

Read first.

---

## Step 2

Search the repository.

Determine whether the requested feature already exists.

If it exists:

Improve it.

Do not recreate it.

---

## Step 3

Reuse existing systems.

Priority:

Existing Component

↓

Existing Utility

↓

Existing Context

↓

Existing Hook

↓

Only then create something new.

---

# Absolute Rules

Never:

Restart the project.

Rebuild completed phases.

Replace stable architecture.

Duplicate existing functionality.

Rewrite components without reason.

Introduce breaking changes.

Ignore project documentation.

---

# Documentation Priority

When documentation exists:

Always follow it.

Priority order:

1.

PROJECT_RULES.md

↓

2.

Current Phase Execution Plan

↓

3.

Repository code

If a conflict exists:

PROJECT_RULES.md wins.

---

# Phase Awareness

Completed phases are considered approved.

They are NOT experimental.

Never redesign them.

Never refactor completed phases simply because another solution exists.

Architectural stability has priority.

---

# Current Assignment

Read:

PHASE_2.3_EXECUTION_PLAN.md

Execute only the tasks described there.

Do not continue into later phases unless instructed.

---

# Development Philosophy

Every modification should satisfy:

Minimal code.

Maximum maintainability.

Lowest regression risk.

Highest readability.

Future extensibility.

---

# UI Rules

Preserve:

Current Homepage

Header

Navbar

Design System

Typography

Spacing

Animations

Component hierarchy

Never replace visual language.

Only extend it.

---

# Component Policy

Before creating any new component:

Check whether:

The component already exists.

The component can be extended.

The feature can be added through composition.

Creating new components is the last option.

---

# Routing Policy

Every visible navigation item must resolve correctly.

No placeholders.

No dead links.

No inactive buttons pretending to work.

---

# Data Policy

Never hardcode future business logic inside UI.

Centralize data.

Prepare architecture for CMS integration.

UI must remain independent from future data providers.

---

# Performance Policy

Avoid:

Large client bundles.

Duplicate rendering.

Repeated calculations.

Unnecessary state.

Prefer:

Server Components.

Lazy loading.

Dynamic imports.

Memoization when beneficial.

---

# Build Policy

Every completed task must successfully pass:

npx tsc --noEmit

npm run lint

npm run build

If build fails:

The task is NOT complete.

---

# Completion Report

Every completed phase must include:

## Files modified

## Components affected

## Routes added

## Bugs fixed

## Build result

## Remaining risks

## Recommendation for the next phase

---

# Decision Making

If two implementations are possible:

Choose the solution that:

Produces less technical debt.

Improves future maintenance.

Preserves architecture.

Avoid clever code.

Prefer understandable code.

---

# Communication Style

Never claim work is finished without verification.

Never assume success.

Always verify.

Always explain:

What changed.

Why it changed.

How it was verified.

---

# Final Principle

The goal is not simply to complete tasks.

The goal is to evolve Luminous Derma into a production-grade platform while preserving every approved architectural decision.

Every change must move the project forward without compromising previous work.