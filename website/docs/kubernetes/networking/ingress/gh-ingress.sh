#!/usr/bin/env bash
set -euo pipefail

REPO="memestageceo/config-repo"
PROJECT="devops"
LABELS="devops,ingress"
ASSIGNEE="@me"

echo "==> Creating labels (may fail if they already exist, that's OK)..."
gh label create devops -R "$REPO" --color 0E8A16 --description "DevOps project" || true
gh label create ingress -R "$REPO" --color 1D76DB --description "Kubernetes Ingress" || true

create_issue() {
	local title="$1"
	local body="$2"

	echo "==> Creating issue: $title"
	gh issue create -R "$REPO" \
		--title "$title" \
		--body "$body" \
		--assignee "$ASSIGNEE" \
		--label "$LABELS" \
		--project "$PROJECT"
}

# create_issue "Story 0.1: Install an Ingress Controller" \
# 	"- Deploy an Ingress Controller (example: ingress-nginx)
# - Verify controller pods are running
# - Verify controller service exists"
#
# create_issue "Story 1.1: Deploy webapp (Deployment + Service)" \
# 	"- Create webapp Deployment (2 replicas)
# - Create ClusterIP Service
# - Verify service is reachable inside the cluster"
#
# create_issue "Story 1.2: Deploy api (Deployment + Service)" \
# 	"- Create api Deployment
# - Create ClusterIP Service
# - Verify service is reachable inside the cluster"
#
# create_issue "Story 2.1: Ingress route / -> webapp" \
# 	"- Create an Ingress
# - Route / to the webapp service
# - Confirm the route works from outside the cluster"
#
# create_issue "Story 2.2: Ingress route /api -> api" \
# 	"- Update the Ingress
# - Route /api to the api service
# - Confirm the route works from outside the cluster"

create_issue "Story 2.3: Fix Ingress pathType usage" \
	"- Ensure correct pathType is used for each path
- Confirm routing behavior is stable and predictable"

create_issue "Story 3.1: Host-based routing for web.kubegate.local" \
	"- Add Ingress rule for host web.kubegate.local
- Route requests to the webapp service
- Confirm host routing works"

create_issue "Story 3.2: Host-based routing for api.kubegate.local" \
	"- Add Ingress rule for host api.kubegate.local
- Route requests to the api service
- Confirm host routing works"

create_issue "Story 4.1: Configure ingressClassName properly" \
	"- Identify available IngressClass
- Apply correct ingressClassName in Ingress spec
- Confirm controller picks up the Ingress rules"

create_issue "Story 5.1: Add TLS Secret + enable HTTPS on Ingress" \
	"- Create a TLS secret
- Reference secret in Ingress TLS config
- Confirm HTTPS is enabled"

create_issue "Story 5.2: Redirect HTTP to HTTPS (controller annotation)" \
	"- Add controller-specific redirect annotation
- Confirm HTTP traffic redirects to HTTPS"

create_issue "Story 6.1: Debug scenario - Ingress returns 404" \
	"- Intentionally break ingress routing (wrong host or path)
- Observe the failure
- Debug using Ingress spec + controller logs
- Fix and confirm routing works again"

create_issue "Story 6.2: Debug scenario - Service has no endpoints" \
	"- Intentionally break service selectors
- Confirm endpoints are empty
- Fix selectors
- Confirm endpoints restored and routing works again"

create_issue "Story 6.3: Debug scenario - Wrong service port in ingress backend" \
	"- Intentionally configure wrong backend port in Ingress
- Observe routing failure
- Fix the backend port mapping
- Confirm traffic routes correctly again"

create_issue "Story 7.1: Add readiness probes to prevent routing to dead pods" \
	"- Add readinessProbe to webapp
- Add readinessProbe to api
- Confirm traffic only routes to Ready pods"

create_issue "Story 7.2: Scale services and verify ingress stability" \
	"- Scale webapp replicas
- Scale api replicas
- Confirm routing remains stable after scaling"

echo "==> Done! Listing created issues assigned to $ASSIGNEE:"
gh issue list -R "$REPO" --assignee "$ASSIGNEE"
