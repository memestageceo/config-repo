#!/bin/bash

case "$1" in
  --cpu)
    ENDPOINT="http://fastapi-hpa/"
    ;;
  --mem)
    ENDPOINT="http://fastapi-hpa/mem"
    ;;
  *)
    echo "Usage: $0 --cpu | --mem"
    exit 1
    ;;
esac

kubectl run load -it --rm --restart=Never --image=curlimages/curl \
	-- sh -c \
	"while true; do curl -s \"$ENDPOINT\" > /dev/null; sleep 0.1; done"
