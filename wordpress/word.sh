#!/bin/bash

kind create cluster --config ./kind-config.yaml

kubectl apply -f ./k8s/wp-deploy.yaml

kubectl config set-context --current --namespace=wordpress
