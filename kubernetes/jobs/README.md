---
title: Jobs and CronJobs in K8s
tags: k8s, job, cronjob, patterns, job patterns
---

Jobs for one off tasks & cronjobs for scheduled tasks.

Jobs have patterns - patterns for different scenarios.

## queue with pod per work item

for a message queue, pods created by a job take up one task each, complete it, then remove the task from the queue.

### video transcoding pipeline

as media platform:

task: transcode 10 videos into multiple resolions - 360p, 720p, 1080p

requirement: transcode as soon as possible

solution: 1 pod = 1 video

queue with pod per video: if one video gets stuck or OOM killed, at least the others are transcoded.

## queue with variable pod count

> no `completions` count

we've a message queue, but don't know the exact number of items in it. so the job creates pods - each pod picks & completes a task, removes task from queue, and moves to the next task. when the queue is empty, one of the pod exits with 0 - so job controller knows that the job is complete. instead of spec.completions, the controller relies on the signal sent by pod when message queue is empty.

### Bulk image resizing

as CMS platform:

- task: resize 500_000+ images from S3
- requirement: the job should keep running till image left
- solution:
  - we know not the total images
  - only pods will know that all images have been processed ->
  - so we have `parallelism = 50` & `completions = <unknown>`
  - overhead spreads out as each pod handles 1000 conversions.
- non-solution:
  - pod per work item: pod init and delete time will add up
    - assuming 3s to start and 2s to delete
    - total = `500_000 * 5sec`

### nightly log ETL

as platform engineer:

- task: parse and insert 200 Mil+ log lines from Kafka into BigQuery
- constraint: infra supports only 20 pods at once
- solution: queue with variable pod count
  - cuz we know not the number of completions
- challenges:
  - need logic to handle failure: if pod handling 3000 lines failes, then how will job know that these lines are to be retried?
  - pod will have to figure out and signal when queue is empty

## indexed job with static work assignment

docs specify best use case - each pod renders a frame of a video. with index, we'll know the sequence of these frames. The index number of the created pod is available through annotation `batch.kubernetes.io/job-completion-index` or `$JOB_COMPLETION_INDEX` variable. If i wanna pass index value manually, i can use the downward API as a volume.

### monthly payroll calculation for 10_000 employees

> if pod for a shard fails, then only that shard is retired.

- task: calculate salary for 10_000 employees from HR database shareded by `employee_id % 100`
- solution: indexed job with static work assignment
  - assume `parallalism: 20` & `completions: 100` ->
  - `calculate_salary.py --index=$JOB_COMPLETION_INDEX`
  - so `pod-<index>` handles calculation `WHERE employee_id % 100 = index`

## job with pod-to-pod communication

needs a headless service with selector `job-name` and job with `...subdomain=service-name`. pods intercommunicate using `<pod-hostname>.<headless-service-name>`. But I'm confused - statefulsets don't have arbitrary names but pods from jobs do, so how's that arbitrary last part of pod name being addressed??? hmmmm!

### train LLM

- task: train LLM on large dataset - 1 chief pod + 3 worker nodes
- requirement:
  - pods training the LLM on a particular dataset need to pass generated gradient to the other pods training the LLM on a different dataset.
  - chief needs to know when training over so must be reached by the worker pods.
- solution: job with pod-to-pod communication
  - headless service + `completionMode: Indexed` gives each pod a stable hostname.
  - instead of querying the K8s API for pod IP, each pod can simply use `<pod-hostname>.<headless-service-name>` to communicate.

## job template expansion

> create a template - then generate manifests with a script...woohoo!

### ERP data sync for B2B SaaS

as a B2B SaaS with 200 enterprise customers:

task: use `CUSTOMER_ID` & `ERP_API_KEY` to sync data for each customer
problem:

- if multiple customers/job, grepping logs to figure out sync for which customer failed would be a nighmare
- isolation required for security
solution: job template expansion
- create a template & generate job manifest for each customer
- if acme sync fials, then `job/sync-acme-corp` has status `Failed` -> fix issue then retry just that job.

### e2e test matrix

as devops engineer:

task: create pipeline to test a webapp on different `OS` & `BROWSER` combos
requirement: if test for `SAFARI` on `MAC` fails, then I wanna try only that test.
solution:

- create template and generate manifest for jobs each targeting a unique combo.
- if test for a combo fails, then apply the fix and then run job to test only that combo.

---

## still to process

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
