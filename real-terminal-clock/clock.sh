#!/bin/bash

display_time() {
  local time=$(date +"%T")

  local time_length=${#time}
  local big_line1=""
  local big_line2=""
  local big_line3=""
  local big_line4=""
  local big_line5=""

  for ((i=0; i<time_length; i++)); do
    case "${time:$i:1}" in
      "0")
        big_line1+=" 0000  "
        big_line2+="0    0 "
        big_line3+="0    0 "
        big_line4+="0    0 "
        big_line5+=" 0000  "
        ;;
      "1")
        big_line1+="  1    "
        big_line2+=" 11    "
        big_line3+="  1    "
        big_line4+="  1    "
        big_line5+=" 1111  "
        ;;
      "2")
        big_line1+=" 2222  "
        big_line2+="    2  "
        big_line3+=" 2222  "
        big_line4+=" 2     "
        big_line5+=" 2222  "
        ;;
      "3")
        big_line1+=" 3333  "
        big_line2+="    3  "
        big_line3+="  333  "
        big_line4+="    3  "
        big_line5+=" 3333  "
        ;;
      "4")
        big_line1+="4   4  "
        big_line2+="4   4  "
        big_line3+=" 4444  "
        big_line4+="    4  "
        big_line5+="    4  "
        ;;
      "5")
        big_line1+=" 5555  "
        big_line2+=" 5     "
        big_line3+=" 5555  "
        big_line4+="    5  "
        big_line5+=" 5555  "
        ;;
      "6")
        big_line1+=" 6666  "
        big_line2+=" 6     "
        big_line3+=" 6666  "
        big_line4+=" 6   6 "
        big_line5+=" 6666  "
        ;;
      "7")
        big_line1+=" 7777  "
        big_line2+="    7  "
        big_line3+="    7  "
        big_line4+="    7  "
        big_line5+="    7  "
        ;;
      "8")
        big_line1+=" 8888  "
        big_line2+=" 8   8 "
        big_line3+="  888  "
        big_line4+=" 8   8 "
        big_line5+=" 8888  "
        ;;
      "9")
        big_line1+=" 9999  "
        big_line2+=" 9   9 "
        big_line3+="  9999 "
        big_line4+="    9  "
        big_line5+=" 9999  "
        ;;
      ":")
        big_line1+="       "
        big_line2+="  ::   "
        big_line3+="       "
        big_line4+="  ::   "
        big_line5+="       "
        ;;
    esac
  done

  local needed_cols=${#big_line1}
  local needed_rows=$((5 + 1))

  printf "\e[8;${needed_rows};${needed_cols}t"

  tput clear
  tput cup 0 0

  echo "$big_line1"
  echo "$big_line2"
  echo "$big_line3"
  echo "$big_line4"
  echo "$big_line5"
}

while true; do
  display_time
  sleep 1
done
