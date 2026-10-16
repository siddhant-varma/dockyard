#!/bin/sh
# Lists the NEXT_PUBLIC_* names and inlined values baked into a Next.js build.
# Used to diff a CI-built image against the production baseline
# (docs/ops/ci-baseline.md). A bare name means the variable was not inlined.
#
# Usage: sh scripts/bundle-flags.sh [.next dir]   (default: .next)
grep -rhoE 'NEXT_PUBLIC_[A-Z_]+(\\?"?:\\?"[^"\\]*)?' "${1:-.next}" | tr -d '\\"' | sort -u
