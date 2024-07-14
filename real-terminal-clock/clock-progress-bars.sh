#!/bin/bash

generate_progress_bar() {
  local current=$1
  local total=$2
  local width=$3
  local filled=$(( (current * width) / total ))
  local empty=$(( width - filled ))
  
  local bar="["
  for ((i=0; i<filled; i++)); do
    bar+="#"
  done
  for ((i=0; i<empty; i++)); do
    bar+="-"
  done
  bar+="]"
  
  echo "$bar"
}

display_time() {
  local hours=$(date +"%H")
  local minutes=$(date +"%M")
  local seconds=$(date +"%S")
  
  local hours_bar=$(generate_progress_bar $hours 24 50)
  local minutes_bar=$(generate_progress_bar $minutes 60 50)
  local seconds_bar=$(generate_progress_bar $seconds 60 50)
  
  tput clear
  echo "$hours_bar $hours/24"
  echo "$minutes_bar $minutes/60"
  echo "$seconds_bar $seconds/60"
}

calculate_needed_size() {
  local needed_cols=60
  local needed_rows=4
  
  printf "\e[8;${needed_rows};${needed_cols}t"
}

while true; do
  calculate_needed_size
  display_time
  sleep 0.1
done
