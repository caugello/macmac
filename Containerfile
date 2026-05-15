FROM registry.access.redhat.com/ubi9/python-312

EXPOSE 8000

USER root
RUN dnf install -y libpq-devel gcc gcc-c++ cmake make ninja-build && \
    dnf clean all && rm -rf /var/cache/dnf

WORKDIR /opt/app-root/src
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

USER 1001
