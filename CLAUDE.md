# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeadOS is a fully autonomous, multi-agent AI platform — a **Service Acquisition Machine** that automates the entire go-to-market lifecycle for service-based businesses. It handles everything from identifying service opportunities and packaging offers to generating, qualifying, and routing leads with minimal human intervention.

Requirements document: `../Flow/LeadOS_Requirements_Document.md`

## Architecture

The system is built around **13 specialized AI agents**, each owning a distinct domain of the lead generation and sales pipeline. Agents operate both in sequence and in parallel.

### Agent Pipeline

**Discovery & Offer Phase:**
1. **Service Research Agent** — identifies profitable service niches (demand scoring, competition analysis)
2. **Offer Engineering Agent** — packages offers (ICP definition, pricing tiers, guarantees, positioning)
3. **Validation Agent** — scores and validates opportunities before resource commitment

**Funnel & Content Phase:**
4. **Funnel Builder Agent** — generates landing pages, forms, tracking setup (deploys to Webflow/Framer)
5. **Content & Creative Agent** — produces ad copy, email sequences, UGC scripts per channel/ICP
6. **Paid Traffic Agent** — manages Google/Meta ad campaigns, budgets, bidding, A/B tests

**Lead Generation Phase:**
7. **Outbound Outreach Agent** — orchestrates email (Instantly/Smartlead) and LinkedIn sequences
8. **Inbound Lead Capture Agent** — captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit

**Qualification & Routing Phase:**
9. **AI Qualification Agent** — conducts AI voice calls (Bland AI/Vapi/ElevenLabs), scores leads on BANT
10. **Sales Routing Agent** — routes qualified leads to reps based on rules, round-robin, or scoring

**Optimization Phase:**
11. **Tracking & Attribution Agent** — multi-touch attribution, UTM tracking, GA4/CAPI integration
12. **Performance Optimization Agent** — automated budget reallocation, creative rotation, CPL/ROAS optimization
13. **CRM & Data Hygiene Agent** — deduplication (>99%), lifecycle management, data enrichment sync

### Data Flow

```
Research → Offer Engineering → Validation
                                    ↓
                            Funnel Builder → Content & Creative
                                    ↓
                    Paid Traffic + Outbound Outreach
                                    ↓
                        Inbound Lead Capture
                                    ↓
                    AI Qualification → Sales Routing
                                    ↓
                            CRM & Data Hygiene
                                    ↓
            Tracking & Attribution ↔ Performance Optimization
```

### Core Data Entities

- **ServiceOpportunity** — niche, demand/competition/monetization scores
- **Offer** — ICP, pain points, pricing tiers, guarantee, positioning
- **Lead** — contact info, source, UTM params, lead score, segment, stage
- **Campaign** — channel, budget, status, metrics
- **CreativeAsset** — type, channel, content, performance tag
- **QualificationCall** — recording, transcript, score, outcome
- **CRMRecord** — pipeline stage, owner, journey timeline

## Infrastructure Requirements

- **Containerized**: Docker + Kubernetes (EKS/GKE/AKS)
- **Inter-agent communication**: Message queue (Kafka or SQS) for loose coupling
- **Infrastructure as code**: Terraform or Pulumi
- **Observability**: OpenTelemetry distributed tracing, centralized logging (ELK)
- **Deployment**: CI/CD with zero-downtime (blue/green or canary)
- **Cloud**: AWS, GCP, or Azure with multi-AZ redundancy

## Key Integrations

| Category | Systems |
|----------|---------|
| Ads | Google Ads API, Meta Marketing API |
| CRM | HubSpot, GoHighLevel, Salesforce |
| Email Outreach | Instantly, Smartlead |
| Landing Pages | Webflow, Framer |
| AI Voice | Bland AI, Vapi, ElevenLabs |
| Enrichment | Apollo.io, Clay, Clearbit |
| Analytics | GA4, Google Tag Manager |
| Scheduling | Calendly, Cal.com |
| Payments | Stripe |

## Design Constraints

- All agents must be modular and independently deployable
- AI prompts and qualification scripts must be configurable without code deployment
- LLM providers must be swappable without changing agent business logic (model abstraction layer)
- All AI scoring must provide explainability outputs
- External integrations use OAuth 2.0 or API keys stored in a secrets manager with exponential backoff retry
- Must support scaling from 100 to 100,000 contacts/day without architectural changes
- Multi-tenant support architected from v1.0 (enabled in v2.0)

## Compliance

GDPR, CAN-SPAM, TCPA, CASL compliance is required. The system must enforce:
- Consent verification before AI voice calls
- Unsubscribe processing within 24 hours
- DNC list checking
- Right to erasure / data portability
- Configurable data retention with automated enforcement
- Complete audit trail of all data access and modifications
