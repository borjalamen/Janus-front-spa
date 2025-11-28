#!/usr/bin/env sh
set -eu

envsubst '${base_service_domain}' < /etc/nginx/conf.d/nginx-default.conf.tmpl > /etc/nginx/conf.d/default.conf

exec "$@"
