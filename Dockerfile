FROM eclipse-temurin:21.0.12.1_1-jre-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends zstd \
  && rm -rf /var/lib/apt/lists/*

ARG PHOTON_VERSION=1.3.0
ADD --chmod=644 --checksum=sha256:a89707c0045e4807b2a1180e132e68e108d998709f48b6c94b98a6e281f571a5 \
  https://github.com/komoot/photon/releases/download/${PHOTON_VERSION}/photon-${PHOTON_VERSION}.jar \
  /opt/photon/photon.jar
