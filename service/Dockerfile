# Linkfail Website API — Made By Zer01
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY service ./service
ENV PORT=8787
ENV POLAR_ORGANIZATION_ID=b6303f05-be1c-4b45-b847-5979667a3d12
EXPOSE 8787
CMD ["node", "service/server.js"]
