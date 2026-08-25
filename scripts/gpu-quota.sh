#!/usr/bin/env bash

# Return the first positive numeric quota value from AWS CLI text output.
# Service Quotas may return multiple matching entries and `None` placeholders;
# callers must not treat a non-empty multi-line response as usable quota.
extract_positive_quota() {
  awk '
    $1 ~ /^[0-9]+([.][0-9]+)?$/ && ($1 + 0) > 0 {
      print $1
      exit
    }
  ' <<<"${1:-}"
}
