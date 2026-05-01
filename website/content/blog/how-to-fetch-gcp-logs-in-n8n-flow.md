+++
title = "How to Fetch GCP Logs in n8n Flow"
date = 2026-02-15T10:00:00-07:00
draft = true
description = "A practical guide to enriching GCP alert webhooks with actual error logs using n8n and the Cloud Logging API."
tags = ["n8n", "gcp", "devops", "automation"]
+++

GCP alert webhooks include incident metadata — resource type, timestamp, severity — but not the actual error message or stack trace. This makes debugging harder because you have to open the console and search manually.

Here's how I fetch the relevant log entry from Cloud Logging and attach it to the notification. This works for any GCP resource: Compute Engine VMs, Cloud Functions, Cloud Run services, Kubernetes clusters, or custom resources.

## Authentication

Create a dedicated service account for log access. Without Workload Identity, using instance metadata credentials means any process that can access the metadata endpoint can potentially mint tokens with the instance service account's permissions. A dedicated service account key limits the blast radius to "who can read this secret."

### Service Account Setup

Create the service account and grant it log read permissions:

```bash
# Create service account
gcloud iam service-accounts create n8n-logs \
  --display-name="n8n Cloud Logging Reader"

# Grant log read permissions (project-wide)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:n8n-logs@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.viewer"

# Create a JSON key file (store securely)
gcloud iam service-accounts keys create ./n8n-logs.key.json \
  --iam-account="n8n-logs@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

Store the key as an n8n credential or secrets manager (e.g., Kubernetes secrets, AWS Secrets Manager, or HashiCorp Vault), restrict access to it, and rotate it if leaked.

### n8n Credential Configuration

In n8n, create a **Google Service Account API** credential:

- Paste the `client_email` and `private_key` from the JSON key
- Enable "Set up for use in HTTP Request node"
- Set allowed domains to `logging.googleapis.com` and `oauth2.googleapis.com` (token exchange)

Set the OAuth scope explicitly to `https://www.googleapis.com/auth/logging.read`. For HTTP Request nodes, set scopes explicitly, otherwise the minted token may not include the permissions needed for Cloud Logging calls. See [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes).

**Preferred long-term:** Use [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) to avoid managing JSON keys entirely.

## Calling the Cloud Logging API

Use an HTTP Request node to call the [`entries:list`](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/entries/list) endpoint.

**URL:**

```
POST https://logging.googleapis.com/v2/entries:list?fields=entries(timestamp,severity,textPayload,jsonPayload,insertId),nextPageToken
```

The `fields` parameter reduces response size and prevents truncation issues in n8n.

**Body:**

```json
{
  "resourceNames": ["projects/your-project-id"],
  "orderBy": "timestamp desc",
  "pageSize": 50,
  "filter": "your-filter-here"
}
```

## Building the Filter

Here's an example filter for a GKE pod. The webhook payload contains Kubernetes identifiers — cluster, namespace, pod, container — which you use to pinpoint the exact source:

```text
resource.type="k8s_container"
resource.labels.cluster_name="{{cluster}}"
resource.labels.namespace_name="{{namespace}}"
resource.labels.pod_name="{{pod}}"
resource.labels.container_name="{{container}}"
severity>=ERROR
receiveTimestamp >= "{{from-iso}}"
receiveTimestamp <= "{{to-iso}}"
```

Use the alert timestamp or `started_at` field from the webhook to calculate the time window. I use ±2 hours as a starting point.

You can adapt this pattern for other resource types. For example, with Compute Engine VMs you'd use `resource.type="gce_instance"` and filter on `instance_id` and `zone`.

**Why `receiveTimestamp`:** Log timestamps can be skewed or arrive late. `receiveTimestamp` is when Google ingested the log, which is more reliable for incident correlation.

## Selecting the Right Entry

With a tight filter you might still get multiple entries. Pick the most useful one:

- Prefer entries with a stack trace (check `jsonPayload.stack` or `jsonPayload.error`)
- If no stack trace, prefer entries containing "Exception" or "Error" in `textPayload`
- Otherwise, use the most recent entry (already sorted by `timestamp desc`)

Pass the selected entry to your notification node — Slack, email, or ticket.

---

I use [n8n](/blog/ai-tools-i-recommend/) for most of my alerting pipelines. It handles this kind of enrichment well.
