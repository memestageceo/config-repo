#!/bin/sh

MY_POD_NAME="pod-1"
NODE_NAME=$MY_POD_NAME
NAMESPACE="RACEMACE"
NODE_CONF="./node.conf"


index="${MY_POD_NAME:(-1):1}"
echo "NODE_ID=$index" > $NODE_CONF
echo "NODE_NAME=$MY_POD_NAME" >> $NODE_CONF
echo "NAMESPACE=$MY_POD_NAMESPACE" >> $NODE_CONF
echo "TOKEN=$(cat './01.yaml')" >> $NODE_CONF
