FROM 172.19.208.1:5000/gencatcloud/nginx:1.20

USER root

RUN apk add tzdata \
    && cp /usr/share/zoneinfo/Europe/Madrid /etc/localtime \
    && echo "Europe/Madrid" > /etc/timezone \
    && apk del tzdata

COPY docker/nginx-default.conf.tmpl /etc/nginx/conf.d/nginx-default.conf.tmpl

COPY docker/docker-entrypoint.sh /

# COPY dist/op-dgc-spa /usr/share/nginx/html/dgc

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
