---
title: Jobs and CronJobs in K8s
tags: k8s, job, cronjob, patterns, job patterns
---

Jobs for one off tasks & cronjobs for scheduled tasks.

Jobs have patterns - patterns for different scenarios.

1. queue with pod per work item: for a message queue, pods created by a job take up one task each, complete it, then remove the task from the queue.
2. queue with variable pod count: we've a message queue, but don't know the exact number of items in it. so the job creates pods - each pod picks & completes a task, removes task from queue, and moves to the next task. when the queue is empty, one of the pod exits with 0 - so job controller knows that the job is complete. instead of spec.completions, the controller relies on the signal sent by pod when message queue is empty.
3. indexed job with static work assignment: docs specify best use case - each pod renders a frame of a video. with index, we'll know the sequence of these frames. The index number of the created pod is available through annotation `batch.kubernetes.io/job-completion-index` or `$JOB_COMPLETION_INDEX` variable. If i wanna pass index value manually, i can use the downward API as a volume.
4. job with pod-to-pod communication: needs a headless service with selector `job-name` and job with `...subdomain=service-name`. pods intercommunicate using `<pod-hostname>.<headless-service-name>`. But I'm confused - statefulsets don't have arbitrary names but pods from jobs do, so how's that arbitrary last part of pod name being addressed??? hmmmm!
5. job template expansion

> The value of .spec.parallelism determines how many can run at once whereas .spec.completions determines how many Pods the Job creates in total.

> Jobs in Indexed completion mode automatically set the pods' hostname to be in the format of `${jobName}-${completionIndex}`

```yaml
# completionMode
spec:
  completions: 5
  parallelism: 3
  completionMode: Indexed

# access index from env
command:
- |
  items=(foo bar baz qux xyz)
  echo ${items[$JOB_COMPLETION_INDEX]} > /input/data.txt

---

# access index from downward API volume
volumes:
- name: input
  downwardAPI:
    items:
    - path: "data.txt"
      fieldRef:
        fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']

```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: headless-svc
spec:
  clusterIP: None # clusterIP must be None to create a headless service
  selector:
    job-name: example-job # must match Job name
---
apiVersion: batch/v1
kind: Job
metadata:
  name: example-job
spec:
  completions: 3
  parallelism: 3
  completionMode: Indexed
  template:
    spec:
      subdomain: headless-svc # has to match Service name

```

```bash
for i in 0 1 2
do
  gotStatus="-1"
  wantStatus="0"             
  while [ $gotStatus -ne $wantStatus ]
  do                                       
    ping -c 1 example-job-${i}.headless-svc > /dev/null 2>&1
    gotStatus=$?                
    if [ $gotStatus -ne $wantStatus ]; then
      echo "Failed to ping pod example-job-${i}.headless-svc, retrying in 1 second..."
      sleep 1
    fi
  done                                                         
  echo "Successfully pinged pod: example-job-${i}.headless-svc"
done          

```
