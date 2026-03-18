# Nuklius Sprint Board v2 (Detailed, Sequence-Ready)

Date: March 18, 2026

## Required Planning Inputs

Canonical merged plan:
- implementation-plan-trillium-master-lossless.md (local — not committed)

Source plans:
- implementation-plan-trillium1.md (local — not committed)
- implementation-plan-trillium2.md (local — not committed)

---

## Locked Decisions

1. `/mdd` and `/handoff` are mandatory Claude commands at the end of every sprint.
2. V1 personal mode vector stack is SQLite-vector extension (local-first default).
3. Qdrant is optional for later server/multi-user scaling, not required for personal V1.
4. Security tooling specifics (SAST/DAST/dependency/container/secrets) are mandatory in every sprint.
5. Product positioning is medicine-first, with architecture designed for expansion to other professional fields via Domain Packs.
6. Preserve ownership boundaries:
- apps/client
- apps/desktop
- apps/server
- packages/ckeditor5
- packages/nuklius-mcp
7. Keep all phase gates from the master-lossless plan intact.
8. Do not drop milestones, dependencies, or acceptance criteria from source plans 1 and 2.

---

## Security Stack (Mandatory)

### SAST
- Semgrep:
  - p/owasp-top-ten
  - p/nodejs
  - p/typescript
- CodeQL (JavaScript/TypeScript)
- eslint + eslint-plugin-security

### Dependency and Supply Chain
- pnpm audit
- OSV-Scanner
- License policy checks (AGPL-compatible dependency policy)

### Secrets and Artifact Security
- Gitleaks
- Trivy (filesystem and image scans)

### DAST
- OWASP ZAP baseline scans against:
  - Trilium server routes
  - ETAPI routes
  - custom `nuklius` routes

### Security Thresholds
PR merge blocked if:
- any Critical vulnerability
- any High vulnerability in changed code path

Release blocked if:
- any Critical or High vulnerability in product scope
- more than 2 Medium vulnerabilities without approved mitigation owner/date

Secrets policy:
- zero unapproved secret findings

---

## Phase Gates (Do Not Bypass)

1. Gate A (end Sprint 7): no-AI baseline usable
- notes + linking + graph shell + PDF read shell
2. Gate B (end Sprint 12): AI runtime stable for PDF intelligence
- CLI manager + MCP + section intelligence pipeline
3. Gate C (end Sprint 14): learning loop complete
- sections -> concepts -> mastery -> adaptive quiz
4. Gate D (end Sprint 20): release readiness
- compliance + reliability + performance + security

---

## Tag Dictionary

Dependency tags:
- DEP-CORE
- DEP-EDITOR
- DEP-BLOCK
- DEP-LINK
- DEP-GRAPH
- DEP-CLI
- DEP-MCP
- DEP-VECTOR
- DEP-PDF
- DEP-QUIZ
- DEP-RAG
- DEP-DOMAIN-PACKS
- DEP-SECURITY
- DEP-RELEASE

Risk flags:
- R-FORK-DRIFT
- R-LICENSING
- R-CLI-BRITTLE
- R-PERF
- R-DATA-INTEGRITY
- R-SECURITY
- R-UX-COMPLEXITY
- R-PDF-QUALITY
- R-RETRIEVAL-NOISE
- R-DOMAIN-GENERALIZATION

Estimate scale:
- Story points (SP), 2-week sprint cadence

---

## Sprint 1

1) Sprint objective
- Establish reproducible fork baseline, CI baseline, and security pipeline.

2) Epics
- Fork and environment bootstrap
- Security CI baseline
- Architecture and decision records

3) Stories
- As a developer, I can run desktop/server from clean clone.
- As a maintainer, CI security scans run on every PR.

4) Engineering tasks
- apps/server: startup and ETAPI smoke tests.
- apps/desktop: launch/build validation.
- apps/client: baseline tree/editor/search sanity.
- docs: ARCHITECTURE.md, DECISIONS.md, SECURITY_BASELINE.md.
- CI: Semgrep, CodeQL, Gitleaks, pnpm audit, OSV.

5) Acceptance tests
- Clean clone runbook succeeds.
- ETAPI CRUD smoke passes.
- Security jobs run and publish artifacts.

6) Dependency tags
- DEP-CORE, DEP-SECURITY

7) Risk flags
- R-FORK-DRIFT, R-SECURITY

8) Estimates
- 44 SP

9) Deliverables
- Baseline fork + security CI + core docs.

10) Test plan
- Smoke startup tests + CI validation + security scan verification.

11) Rollback plan
- Revert CI wiring changes only if blocking.

12) Release impact
- None (foundation only).

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/DECISIONS.md
  - docs/SECURITY_BASELINE.md
  - docs/SPRINT-01.md
- Run code review and security review; auto-fix High/Critical.
- /handoff with Sprint 2 prompt.

---

## Sprint 2

1) Sprint objective
- Implement medicine-first callouts via profession-extensible domain-pack model.

2) Epics
- CKEditor callout plugin
- Domain-pack schema v1

3) Stories
- As a medicine user, I can insert Pearl/Warning/Mnemonic/Tip blocks.
- As a platform owner, domain-specific callouts are data-driven.

4) Engineering tasks
- packages/ckeditor5: medical/professional callout plugin.
- apps/client: styles and rendering.
- apps/server: domain-pack config loader.
- docs: DOMAIN_PACKS.md and MEDICAL_CALLOUTS.md.

5) Acceptance tests
- Callouts roundtrip correctly.
- Web read-only rendering passes.
- Domain pack loads medicine defaults without code edits.

6) Dependency tags
- DEP-EDITOR, DEP-DOMAIN-PACKS

7) Risk flags
- R-DOMAIN-GENERALIZATION

8) Estimates
- 42 SP

9) Deliverables
- Callout system + pack schema.

10) Test plan
- Plugin unit tests + rendering snapshots + config schema tests.

11) Rollback plan
- Feature-flag callouts.

12) Release impact
- First domain feature lands.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/DOMAIN_PACKS.md
  - docs/MEDICAL_CALLOUTS.md
  - docs/SPRINT-02.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 3 prompt.

---

## Sprint 3

1) Sprint objective
- Ship block addressing (^N) and block index.

2) Epics
- Block ID engine
- Block persistence/indexing

3) Stories
- As a user, every block can be deep-linked.
- As a system, IDs remain stable across edits/restarts.

4) Engineering tasks
- packages/ckeditor5: block_id.ts.
- apps/server: Nuklius_blocks table + rebuild utility.
- apps/client: block marker UX.
- import/export support for block metadata footer.

5) Acceptance tests
- ID stability across save/reload.
- Rebuild consistency.
- Import/export preserves addressability.

6) Dependency tags
- DEP-BLOCK, DEP-EDITOR

7) Risk flags
- R-PERF, R-DATA-INTEGRITY

8) Estimates
- 46 SP

9) Deliverables
- Stable block ID subsystem.

10) Test plan
- Unit ID tests + integration sync tests.

11) Rollback plan
- Hide visible markers while retaining internal IDs.

12) Release impact
- Enables block linking and block graphing.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/MERGE_RULES.md
  - docs/SPRINT-03.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 4 prompt.

---

## Sprint 4

1) Sprint objective
- Implement three link types and enhanced backlinks.

2) Epics
- Block links and transclusion
- Jump-link relations and backlinks UX

3) Stories
- As a user, I can link page-to-page and block-to-block.
- As a user, backlinks include contextual snippets.

4) Engineering tasks
- packages/ckeditor5: transclusion plugin.
- apps/server: Nuklius_block_links schema and APIs.
- apps/client: block-aware autocomplete and backlinks panel.

5) Acceptance tests
- Block links resolve exact targets.
- Transclusions render/update correctly.
- Backlinks show note + block + jump link classes.

6) Dependency tags
- DEP-LINK, DEP-BLOCK

7) Risk flags
- R-DATA-INTEGRITY, R-UX-COMPLEXITY

8) Estimates
- 44 SP

9) Deliverables
- Three-link model and contextual backlinks.

10) Test plan
- E2E link traversal and backlink integrity.

11) Rollback plan
- Disable transclusion rendering but keep references.

12) Release impact
- Significant navigation improvement.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-04.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 5 prompt.

---

## Sprint 5

1) Sprint objective
- Domain hierarchy, workspace scope, zoom, and block promotion.

2) Epics
- Hierarchy/templates
- Focused editing workflows

3) Stories
- As a medicine user, I boot into structured hierarchy.
- As future users, hierarchy is pack-driven for other professions.

4) Engineering tasks
- apps/client: hierarchy templates and workspace setup.
- packages/ckeditor5: zoom plugin.
- apps/client: block-to-note promotion flow.
- apps/server: domain-pack template bindings.

5) Acceptance tests
- Hierarchy bootstrap works.
- Zoom breadcrumbs are stable.
- Promotion preserves provenance via transclusion.

6) Dependency tags
- DEP-DOMAIN-PACKS, DEP-EDITOR, DEP-LINK

7) Risk flags
- R-DOMAIN-GENERALIZATION

8) Estimates
- 42 SP

9) Deliverables
- Structured no-AI authoring workflow.

10) Test plan
- E2E hierarchy -> zoom -> promotion.

11) Rollback plan
- Keep promotion feature-flagged.

12) Release impact
- Strong no-AI daily usability.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/DOMAIN_PACKS.md
  - docs/SPRINT-05.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 6 prompt.

---

## Sprint 6

1) Sprint objective
- Right-panel architecture and mini-graph shell.

2) Epics
- Panel mode switching
- Mini-graph infrastructure

3) Stories
- As a user, tabs switch by note/PDF context.
- As a user, mini-graph remains persistent.

4) Engineering tasks
- apps/client: panel mode orchestrator.
- apps/client/widgets/nuklius: mini_graph shell.
- apps/client/services/nuklius: graph_store bootstrap.

5) Acceptance tests
- Context switching deterministic.
- Mini-graph lifecycle stable.

6) Dependency tags
- DEP-GRAPH, DEP-CORE

7) Risk flags
- R-UX-COMPLEXITY

8) Estimates
- 38 SP

9) Deliverables
- Right-panel framework for graph/PDF/AI tabs.

10) Test plan
- UI state regression tests.

11) Rollback plan
- Fallback to legacy panel.

12) Release impact
- Foundation for graph and learning tabs.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-06.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 7 prompt.

---

## Sprint 7

1) Sprint objective
- Deterministic ego-centric graph with drill interactions.

2) Epics
- Graph layout engine
- Interaction layer

3) Stories
- As a user, I see parent/child/sibling/jump topology.
- As a user, drill and expansion behavior feels coherent.

4) Engineering tasks
- apps/client/widgets/nuklius: brain_graph.ts.
- apps/client/services/nuklius: graph state transitions.
- apps/server: graph query optimization.

5) Acceptance tests
- Layout determinism.
- single-click drill + double-click open semantics.
- block-level subgraph works.

6) Dependency tags
- DEP-GRAPH, DEP-BLOCK, DEP-LINK

7) Risk flags
- R-PERF

8) Estimates
- 50 SP

9) Deliverables
- Graph v1.

10) Test plan
- Layout unit tests + interaction E2E + perf baseline.

11) Rollback plan
- Disable center expansion, keep mini-graph only.

12) Release impact
- Gate A check: no-AI baseline maturity.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-07.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 8 prompt.

---

## Sprint 8

1) Sprint objective
- Claude CLI manager with resilient fallback behavior.

2) Epics
- CLI runtime manager
- Setup/diagnostics UX

3) Stories
- As a user, I get streamed AI output.
- As a user lacking CLI, I can use fallback mode.

4) Engineering tasks
- apps/desktop/src/nuklius/claude: cli_manager.ts.
- apps/client: setup/availability UI.
- error classification for binary/auth/timeout failures.

5) Acceptance tests
- Streaming works.
- Failure states are actionable.
- Fallback mode passes integration checks.

6) Dependency tags
- DEP-CLI

7) Risk flags
- R-CLI-BRITTLE

8) Estimates
- 42 SP

9) Deliverables
- CLI runtime layer.

10) Test plan
- Subprocess mock and fault injection suite.

11) Rollback plan
- AI controls off by feature flag.

12) Release impact
- Unlocks MCP and AI pipelines.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-08.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 9 prompt.

---

## Sprint 9

1) Sprint objective
- MCP bootstrap + first-party MCP package scaffold.

2) Epics
- Existing MCP integration
- Custom MCP foundation

3) Stories
- As Claude, I can read/write via MCP.
- As team, we own extensible tool definitions.

4) Engineering tasks
- apps/desktop/src/nuklius/claude: mcp_bridge.ts.
- packages/nuklius-mcp: base stdio server and registry.
- apps/server: ETAPI auth and routing integration.

5) Acceptance tests
- MCP CRUD flow works end-to-end.
- Custom tool outputs are schema-valid.

6) Dependency tags
- DEP-MCP, DEP-CLI

7) Risk flags
- R-SECURITY

8) Estimates
- 44 SP

9) Deliverables
- MCP bridge + first-party scaffold.

10) Test plan
- Integration tests for tool-call contracts.

11) Rollback plan
- Use existing MCP server only.

12) Release impact
- AI tool-use backbone established.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/MCP_TOOLS.md
  - docs/SPRINT-09.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 10 prompt.

---

## Sprint 10

1) Sprint objective
- SQLite-vector embedding pipeline + hybrid retrieval.

2) Epics
- Embedding generation and tracking
- Hybrid search UX

3) Stories
- As a personal user, I get semantic search locally.
- As a writer, I get related-block suggestions.

4) Engineering tasks
- apps/desktop/src/nuklius/embeddings: worker + catch_up.
- apps/server: SQLite-vector integration layer.
- apps/client: hybrid search and auto_link_sidebar.
- schema: Nuklius_embeddings.

5) Acceptance tests
- Incremental catch-up correctness.
- Hybrid retrieval quality threshold met.
- No Qdrant dependency in local mode.

6) Dependency tags
- DEP-VECTOR, DEP-CLI, DEP-MCP

7) Risk flags
- R-PERF, R-RETRIEVAL-NOISE

8) Estimates
- 46 SP

9) Deliverables
- Local semantic retrieval stack.

10) Test plan
- Relevance benchmark + startup profile.

11) Rollback plan
- FTS-only fallback.

12) Release impact
- Retrieval foundation complete.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-10.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 11 prompt.

---

## Sprint 11

1) Sprint objective
- PDF section detection with algorithm/online/manual fallback.

2) Epics
- Sectioning engine
- Manual correction UX

3) Stories
- As a user, my PDF always ends up sectioned via one of three paths.

4) Engineering tasks
- apps/desktop/src/nuklius/pdf: section_detector.ts and toc_lookup.ts.
- apps/client/widgets/nuklius: manual section editor.
- apps/server/services/nuklius: pdf_section_service.

5) Acceptance tests
- Algorithmic detection benchmark pass.
- Online fallback mapping pass.
- Manual edits persist and override.

6) Dependency tags
- DEP-PDF

7) Risk flags
- R-PDF-QUALITY

8) Estimates
- 42 SP

9) Deliverables
- Resilient section pipeline.

10) Test plan
- Corpus benchmark + manual override E2E.

11) Rollback plan
- Manual-first forced mode.

12) Release impact
- Unlocks section intelligence processing.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-11.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 12 prompt.

---

## Sprint 12

1) Sprint objective
- Vision extraction + mega-prompt structured section outputs.

2) Epics
- Media extraction/cache
- Structured intelligence pipeline

3) Stories
- As a learner, summaries include visual context.
- As a system, outputs are schema-valid and resumable.

4) Engineering tasks
- apps/desktop/src/nuklius/pdf: vision_extractor.ts and mega_prompt.ts.
- apps/server: media cache and section JSON persistence.
- retry/resume state machine.

5) Acceptance tests
- Media dedup by page.
- JSON schema pass rate target met.
- Resume idempotency verified.

6) Dependency tags
- DEP-PDF, DEP-CLI

7) Risk flags
- R-CLI-BRITTLE, R-PDF-QUALITY

8) Estimates
- 44 SP

9) Deliverables
- Section intelligence pipeline.

10) Test plan
- Failure simulation + schema validation + idempotency tests.

11) Rollback plan
- Text-only processing mode.

12) Release impact
- Gate B complete.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-12.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 13 prompt.

---

## Sprint 13

1) Sprint objective
- Learn PDF tab and mastery tracking.

2) Epics
- Learn mode UX
- Concept/mastery model

3) Stories
- As a learner, I switch read/summary/quiz modes per section.
- As a learner, mastery updates are transparent.

4) Engineering tasks
- apps/client/widgets/nuklius: pdf_learn_tab.ts and mastery_tracker.ts.
- apps/server/services/nuklius: concept_service and mastery_service.
- concept unification prompt flow.

5) Acceptance tests
- Mode transitions preserve context.
- Mastery persistence and rendering pass.
- Unification prompts fire correctly.

6) Dependency tags
- DEP-PDF, DEP-QUIZ, DEP-VECTOR

7) Risk flags
- R-RETRIEVAL-NOISE

8) Estimates
- 40 SP

9) Deliverables
- Learn tab + mastery system.

10) Test plan
- Integration scoring tests + section mode E2E.

11) Rollback plan
- disable auto-unification; manual link only.

12) Release impact
- Educational workflow becomes practical.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-13.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 14 prompt.

---

## Sprint 14

1) Sprint objective
- Adaptive quiz engine with session history and mastery feedback.

2) Epics
- Quiz runtime
- Adaptive logic and persistence

3) Stories
- As a learner, quiz difficulty/format adapts to performance.

4) Engineering tasks
- apps/client/widgets/nuklius: quiz_panel.ts.
- apps/server/services/nuklius: quiz_service.
- session summary compression for long histories.

5) Acceptance tests
- MCQ grading correctness.
- Free-text partial credit path stable.
- Adaptive transitions verify concept targeting.

6) Dependency tags
- DEP-QUIZ, DEP-CLI, DEP-PDF

7) Risk flags
- R-UX-COMPLEXITY

8) Estimates
- 42 SP

9) Deliverables
- Adaptive quiz v1.

10) Test plan
- Scenario-based adaptive simulations.

11) Rollback plan
- static sequencing fallback.

12) Release impact
- Gate C complete.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-14.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 15 prompt.

---

## Sprint 15

1) Sprint objective
- Side chat and auto-RAG.

2) Epics
- Persistent side chat
- Retrieval orchestration

3) Stories
- As a user, each note has persistent thread context.
- As a user, broad questions auto-load relevant context.

4) Engineering tasks
- apps/client/widgets/nuklius: side_chat.ts.
- apps/server/services/nuklius: chat sessions and retrieval APIs.
- packages/nuklius-mcp: retrieval tools for chat.

5) Acceptance tests
- per-note persistence works.
- @mention entity resolution passes.
- auto-RAG provenance is attached.

6) Dependency tags
- DEP-RAG, DEP-MCP, DEP-VECTOR

7) Risk flags
- R-RETRIEVAL-NOISE, R-SECURITY

8) Estimates
- 40 SP

9) Deliverables
- Side chat with retrieval.

10) Test plan
- relevance and persistence E2E.

11) Rollback plan
- mention-only mode.

12) Release impact
- Large AI usability increase.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/MCP_TOOLS.md
  - docs/SPRINT-15.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 16 prompt.

---

## Sprint 16

1) Sprint objective
- Inline AI toolbar, open slash commands, and attribution.

2) Epics
- Inline editing actions
- Distribution-safe command stack
- Attribution enforcement

3) Stories
- As a user, selected text can be transformed inline.
- As an operator, distribution build avoids premium lock-in.

4) Engineering tasks
- packages/ckeditor5: ai_toolbar.ts.
- apps/client: open slash command UX/router.
- apps/client: source attribution component.
- docs: licensing enforcement policy checks.

5) Acceptance tests
- toolbar actions pass functional tests.
- open slash commands pass without premium features.
- references are clickable and valid.

6) Dependency tags
- DEP-EDITOR, DEP-CLI, DEP-SECURITY

7) Risk flags
- R-LICENSING, R-SECURITY

8) Estimates
- 42 SP

9) Deliverables
- Compliance-safe inline AI stack.

10) Test plan
- plugin tests + attribution integrity checks.

11) Rollback plan
- disable high-risk actions selectively.

12) Release impact
- safer and distributable AI command model.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/CKEDITOR_LICENSING.md
  - docs/SPRINT-16.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 17 prompt.

---

## Sprint 17

1) Sprint objective
- Setup wizard and generated workspace scaffolding.

2) Epics
- Conversational onboarding
- Generated hierarchy/templates/MOCs

3) Stories
- As a new user, onboarding sets me up quickly.
- As platform, generation is domain-pack aware.

4) Engineering tasks
- apps/client/widgets/nuklius: setup wizard flow.
- apps/desktop/src/nuklius/claude: setup prompts.
- apps/server: generation writer APIs.
- domain-pack mappings for generation outputs.

5) Acceptance tests
- wizard completes in bounded turns.
- generated artifacts validate and link correctly.
- rerun is idempotent.

6) Dependency tags
- DEP-DOMAIN-PACKS, DEP-CLI, DEP-MCP

7) Risk flags
- R-DOMAIN-GENERALIZATION

8) Estimates
- 40 SP

9) Deliverables
- Onboarding wizard.

10) Test plan
- Golden path + rerun tests.

11) Rollback plan
- preview-only generation mode.

12) Release impact
- Onboarding acceleration.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/DOMAIN_PACKS.md
  - docs/SPRINT-17.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 18 prompt.

---

## Sprint 18

1) Sprint objective
- 6R pipeline orchestration and hook system.

2) Epics
- 6R automation
- Reliability hooks

3) Stories
- As a user, queued items move through all 6 stages.
- As a system, hooks preserve context and integrity.

4) Engineering tasks
- apps/desktop/src/nuklius/claude: 6R orchestration.
- apps/server/services/nuklius: queue + retry tracking.
- apps/client: pipeline status UX.
- hooks: orient, validate, capture scripts.

5) Acceptance tests
- full 6R path with logs.
- retry handling for transient failures.
- hook stability checks.

6) Dependency tags
- DEP-CLI, DEP-MCP, DEP-CORE

7) Risk flags
- R-CLI-BRITTLE, R-DATA-INTEGRITY

8) Estimates
- 44 SP

9) Deliverables
- 6R + hook automation.

10) Test plan
- stage integration + retry simulation tests.

11) Rollback plan
- manual stage execution fallback.

12) Release impact
- strong operational automation.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/MERGE_RULES.md
  - docs/SPRINT-18.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 19 prompt.

---

## Sprint 19

1) Sprint objective
- FSRS, tutor chat, and source-to-knowledge pipeline.

2) Epics
- FSRS review engine
- Tutor and content transformation

3) Stories
- As a learner, due-card review is scheduled and adaptive.
- As a learner, tutor uses contextual knowledge.

4) Engineering tasks
- apps/client/widgets/nuklius: flashcard_review.ts and tutor_chat.ts.
- apps/server/services/nuklius: FSRS scheduling service.
- pipeline: source -> atomic notes -> cards -> links.

5) Acceptance tests
- FSRS interval/ease correctness.
- tutor relevance bounded by context.
- generated cards preserve source linkage.

6) Dependency tags
- DEP-QUIZ, DEP-RAG, DEP-DOMAIN-PACKS

7) Risk flags
- R-UX-COMPLEXITY

8) Estimates
- 42 SP

9) Deliverables
- Learning engine completion.

10) Test plan
- algorithm tests + end-to-end review workflows.

11) Rollback plan
- manual card authoring fallback.

12) Release impact
- learning feature set complete.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/ARCHITECTURE.md
  - docs/SPRINT-19.md
- Code/security review + auto-fix High/Critical.
- /handoff with Sprint 20 prompt.

---

## Sprint 20

1) Sprint objective
- Productization hardening and release gate validation.

2) Epics
- Export/diff/digest differentiators
- Security/performance hardening
- Compliance and release readiness

3) Stories
- As a user, exports are clean and metadata-safe.
- As maintainer, release candidate passes all gates.
- As owner, domain-pack roadmap supports non-medical verticals.

4) Engineering tasks
- apps/client/widgets/nuklius: daily_digest and diff UX.
- apps/server: export sanitization and merge hardening.
- full security run: SAST/DAST/dependency/container/secrets.
- docs: RELEASE_CHECKLIST.md, SECURITY_REPORT.md, DOMAIN_PACKS_ROADMAP.md.

5) Acceptance tests
- clean export strips internal metadata.
- performance budgets pass on large vault benchmark.
- security threshold checks pass.

6) Dependency tags
- DEP-RELEASE, DEP-SECURITY, DEP-DOMAIN-PACKS

7) Risk flags
- R-LICENSING, R-PERF, R-SECURITY

8) Estimates
- 46 SP

9) Deliverables
- Release candidate + gate reports.

10) Test plan
- Full regression, performance/load tests, ZAP baseline, compliance audit.

11) Rollback plan
- hold external release and ship internal RC only.

12) Release impact
- Gate D complete and V1 ready.

Mandatory end-of-sprint actions
- /mdd updates:
  - docs/RELEASE_CHECKLIST.md
  - docs/SECURITY_REPORT.md
  - docs/DOMAIN_PACKS_ROADMAP.md
  - docs/SPRINT-20.md
- Code/security review + auto-fix High/Critical.
- /handoff with go/no-go release recommendation.

---

## Execution Sequencing Rule

- Execute one sprint at a time.
- No sprint N+1 tasks before sprint N completes, including mandatory `/mdd`, review/security fixes, and `/handoff` output.

