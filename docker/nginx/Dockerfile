FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create HLS directory
RUN mkdir -p /var/hls && chmod 755 /var/hls

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
