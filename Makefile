# One entry point for a two-package repository.
#
# Without this, a reviewer has to guess which subdirectory to enter before
# anything works. Every target below is runnable from the repository root.
.PHONY: help install test test-backend test-frontend verify start dev build clean

NODE ?= node
NPM  ?= npm

help:
	@echo "spk-saw-wood-selection"
	@echo ""
	@echo "  make install   install backend and frontend dependencies"
	@echo "  make test      run the backend test suite (40 assertions, no database needed)"
	@echo "  make verify    test + a type-checked frontend build"
	@echo "  make start     start the API on :5000 with the in-memory adapter"
	@echo "  make dev       start the API and the Vite dev server together"
	@echo "  make legacy    print the original submission's result next to the corrected one"
	@echo "  make build     production build of the frontend"
	@echo "  make clean     remove node_modules and build output"

install:
	cd backend  && $(NPM) install
	cd frontend && $(NPM) install

test: test-backend

test-backend:
	cd backend && $(NPM) test

test-frontend:
	cd frontend && $(NPM) run build

verify: test-backend test-frontend
	@echo ""
	@echo "backend tests passed and the frontend builds."

start:
	cd backend && STORAGE=memory $(NPM) start

dev:
	@echo "Starting API on :5000 and Vite on :3000 (Ctrl-C to stop both)"
	@( cd backend && STORAGE=memory $(NPM) start ) & \
	 ( cd frontend && $(NPM) run dev ) ; \
	 wait

legacy:
	cd backend && $(NPM) run verify:legacy

build:
	cd frontend && $(NPM) run build

clean:
	rm -rf backend/node_modules frontend/node_modules frontend/dist
	find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
