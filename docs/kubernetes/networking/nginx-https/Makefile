all:

TAG = 1.0
PREFIX = nginx-https
KEY = /tmp/nginx.key
CERT = /tmp/nginx.crt
SECRET = /tmp/secret.json

create-cluster:
	kind create cluster --config=kind-config.yaml

keys:
	# The CName used here is specific to the service specified in nginx-app.yaml.
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $(KEY) -out $(CERT) -subj "/CN=nginxsvc/O=nginxsvc"

create-secret:
	kubectl create secret tls nginxsecret --key /tmp/nginx.key --cert /tmp/nginx.crt

create-cm:
	kubectl create configmap nginxconfigmap --from-file=default.conf

create-configs: create-secret create-cm

container:
	# --pull the latest base image specified in ./Dockerfile
	docker build --pull -t $(PREFIX):$(TAG) .

load: container
	# the image must be loaded into kind
	kind load docker-image $(PREFIX):$(TAG)

push: container
	docker push $(PREFIX):$(TAG)

update-cm:
	# The `-` means read from standard input 
	# Update ConfigMap to replace the file being served.
	# ConfigMap volume mounted -> changes are automatically updated in the pod
	kubectl create configmap nginxconfigmap --from-file=default.conf -o yaml --dry-run=client \
		| sed 's/index.html/index2.html/g' | kubectl apply -f -

clean:
	rm $(KEY)
	rm $(CERT)
