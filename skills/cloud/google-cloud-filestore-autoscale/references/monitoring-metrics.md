# Filestore Monitoring Metrics

## Essential Filestore Storage Metrics
When determining if a Filestore instance needs scaling, query the Cloud Monitoring API for utilization.

### Used Capacity Metric
- **Metric Type**: `file.googleapis.com/nfs/server/used_bytes`
- **Description**: The amount of storage space currently utilized on the file share.
- **Aggregation**: It is recommended to use a 5-minute rolling average to smooth out transient spikes.

### Provisioned Capacity Metric
- **Metric Type**: `file.googleapis.com/nfs/server/total_bytes`
- **Description**: The total provisioned storage capacity (usually identical to the instance capacity).

### Fetching with Curl
To retrieve the `used_bytes` metric directly via Cloud Monitoring REST API:
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     "https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries?filter=metric.type%3D%22file.googleapis.com%2Fnfs%2Fserver%2Fused_bytes%22"
```

## Calculation Formulas
- **Free Bytes**: `total_bytes - used_bytes`
- **Free Space Percentage**: `((total_bytes - used_bytes) / total_bytes) * 100`

Use these formulas when evaluating instances against the `max_threshold` and `min_threshold` safety factors.
