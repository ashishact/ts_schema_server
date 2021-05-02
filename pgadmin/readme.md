Whicle Connecting to postgress if it doesn't connect then

1. docker ps
2. docker inspect name_of_container_here


"Networks": {
    "runtime_default": {
        "IPAMConfig": null,
        "Links": null,
        "Aliases": [
            "postgres",
            "10f63fcecb74"
        ],
        "NetworkID": "ef6b35dcad7f20d4adcc903c7121546dd12f69bc963ecd2fe192cf141c686c79",
        "EndpointID": "ee3fe607b95b3d7f5d48cb928e465b21e8e6ccc739fed7e17ae842d8dd4bbb80",
        "Gateway": "172.19.0.1",
        "IPAddress": "172.19.0.2",
        "IPPrefixLen": 16,
        "IPv6Gateway": "",
        "GlobalIPv6Address": "",
        "GlobalIPv6PrefixLen": 0,
        "MacAddress": "02:42:ac:13:00:02",
        "DriverOpts": null
    }
}



Use IP from the `Gateway` in pgadmin as the Host

ref: https://stackoverflow.com/questions/53610385/docker-postgres-and-pgadmin-4-connection-refused