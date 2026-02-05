FROM quay.io/fedora/fedora:41

EXPOSE 8000

ARG USER="macmac"

RUN dnf install -y python3-pip python3-devel libpq-devel gcc gcc-c++ cmake make ninja-build netcat && \
    dnf clean all && rm -rf /var/cache/dnf
RUN adduser $USER && mkdir /app
WORKDIR /app
COPY --chown=$USER:$USER . /app
RUN pip3 install -r requirements.txt

USER $USER
