#!/bin/bash


if [[ $(kubectl get pod echo-pod --namespace default -o jsonpath='{.spec.restartPolicy}') == 'OnFailure' ]]; then
	echo "01 passed"
fi

