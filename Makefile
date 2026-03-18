.PHONY: repro-build smoke-launch smoke-etapi security-scan license-check help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

repro-build: ## Run two-pass reproducible build and checksum comparison
	pnpm run repro-build

smoke-launch: ## Smoke-test server + desktop launch from clean state
	pnpm run smoke-launch

smoke-etapi: ## Run ETAPI CRUD smoke test (requires ETAPI_TOKEN env var)
	pnpm run smoke-etapi

security-scan: ## Run full security scan suite (Semgrep, Gitleaks, Trivy, pnpm audit, OSV)
	pnpm run security-scan

license-check: ## Check all dependency licenses against AGPL policy
	pnpm run license-check
