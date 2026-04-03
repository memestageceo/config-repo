#!/bin/bash


LOG_PATH="/tmp"
LOG_FILE="app.log"
MAX_ENTRIES=10
POD_NAME="xxx"
POD_IP="123.44231.323"

FILE_PATH="$LOG_PATH/$LOG_FILE"

counter=0

echofn() {
	echo "{\"pod\":\"$POD_NAME\",\"ip\":\"$POD_IP\",\"entry\":$counter,\"ts\":\"$(date)\"}"
}

while true; do
	if [[ $counter -eq $MAX_ENTRIES  ]]; then
		counter=0
		echofn | tee "$FILE_PATH"
	else
		echofn | tee -a "$FILE_PATH"
	fi

	counter=$((counter+1))
	sleep 2
done

exit 0
